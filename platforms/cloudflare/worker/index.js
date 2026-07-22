// Cloudflare-Worker der Paarbegleitung — API + LLM-Proxy.
//
// Sicherheits-Kern (Spez §5.5): Der Client nennt NIE eine Rolle und NIE einen
// Paar-Code — beides injiziert der Worker aus der Session. Pstate-Zugriffe
// laufen ausschließlich über session.role; Query-/Body-Angaben werden ignoriert.

import { CORE_VERSION, APP_NAME } from "../../../core/index.js";
import { KVStore } from "./kv-store.js";
import { Repo } from "../../../core/store/repo.js";
import { Bstate, Pstate } from "../../../core/store/bundles.js";
import { freigebeUebergabe } from "../../../core/engine/freigabe.js";
import { uebergabeTeilKey } from "../../../core/contracts/uebergabe.js";
import { trageMessbeitragEin, markiereAufgedeckt, redigiereMessungenFuerRolle } from "../../../core/ui/prozess.js";
import { makeAdapter, LLM_PROVIDERS } from "../../../core/llm/adapter.js";
import { parseCookies, cookieHeader } from "./util.js";
import { istAppOrigin, preflightAntwort, mitAppCors, aasaNutzlast, assetlinksNutzlast } from "./app-origins.js";
import { vapidKonfig, sendePush } from "./web-push.js";
import { de as woerterbuchDe } from "../../../core/i18n/de.js";
import { en as woerterbuchEn } from "../../../core/i18n/en.js";
import { pruefeUndZaehle, quotaCfg } from "./quota.js";
import { erfasseUsage, leseTokenStand, leseTokenHistorie, leseTokenExport, monatsTag } from "./tokenstat.js";
import { createCouple, enroll, loginWithCred, requireSession, requireAdmin,
         mintMagic, RECOVER_MS, beginRecoveryEmail, confirmRecoveryEmail,
         hasRecoveryEmail, lookupRecovery } from "./auth.js";
import { randomToken, sha256Hex } from "./util.js";
import { importEmailKey, entschluessele, emailAad } from "./krypto.js";
import { makeMailer } from "./mailer.js";

const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
const fehler = (msg, status, code) => json(code ? { error: msg, code } : { error: msg }, status);

const leseEmailFor = (kv, code, role) =>
  kv.get("sys/emailfor/" + code + "/" + role).then(v => (v ? JSON.parse(v) : null));

const BSTATE_FELDER = new Set(Bstate.FIELDS);
// S91 · I12: Mess-Logik kommt aus dem Kern — Worker und App teilen dieselbe Wahrheit.

// S92 · T0-Fix: merkposten (S44) und language wurden von der App genutzt,
// fehlten aber in der Whitelist — auf Pages liefen sie ins 404 (Lesen still
// null-maskiert: Merkposten und persönliche UI-Sprache funktionierten nur im
// Artefakt). leseMarker ist das neue S92-Feld (Marker-Regel, je Rolle privat).
const PSTATE_FELDER = new Set(["timeline", "selfDisclosures", "merkposten", "language", "leseMarker"]);

/* ---- Web Push (M7a): Abo-Ablage & inhaltsfreier Freigabe-Hinweis ----
 *  KV: push/<code>/<Rolle> → Array von Browser-Subscriptions (max. 5, dedupliziert
 *  über den Endpoint). Nutzlast IMMER inhaltsfrei: generischer, nach Paarsprache
 *  lokalisierter Hinweis — nie Gesprächs- oder Freigabe-Inhalte. Fehlt die
 *  VAPID-Konfiguration, ist das Feature aus: Endpunkte fail-closed, Trigger no-op. */
const pushKey = (code, role) => "push/" + code + "/" + role;

async function lesePushAbos(kv, code, role) {
  return kv.get(pushKey(code, role)).then(v => (v ? JSON.parse(v) : []));
}

function gueltigesAbo(sub) {
  return sub && typeof sub.endpoint === "string" && sub.endpoint.startsWith("https://")
    && sub.keys && typeof sub.keys.p256dh === "string" && typeof sub.keys.auth === "string";
}

async function benachrichtigePartner(kv, env, code, empfaengerRolle) {
  const vapid = vapidKonfig(env);
  if (!vapid) return;                                    // Feature aus — Freigabe läuft normal weiter
  const abos = await lesePushAbos(kv, code, empfaengerRolle);
  if (!abos.length) return;
  const paar = await kv.get("sys/couple/" + code).then(v => (v ? JSON.parse(v) : null));
  const dict = (paar?.locale === "en") ? woerterbuchEn : woerterbuchDe;
  const nutzlast = { titel: dict["pwa.pushTitel"], text: dict["pwa.pushText"], url: "/" };
  const bleiben = [];
  for (const abo of abos) {
    const status = await sendePush(abo, nutzlast, vapid);
    if (status !== 404 && status !== 410) bleiben.push(abo);   // erloschene Abos aufräumen
  }
  if (bleiben.length !== abos.length) await kv.put(pushKey(code, empfaengerRolle), JSON.stringify(bleiben));
}

export default {
  async fetch(request, env, ctx) {
    // App-Anbindung (M5): Preflight der nativen Hülle vorab beantworten; jede
    // Antwort (auch Fehler) trägt für App-Origins die CORS-Köpfe.
    const vorab = preflightAntwort(request);
    if (vorab) return vorab;
    try {
      return mitAppCors(request, await route(request, env));
    } catch (e) {
      return mitAppCors(request, fehler(e.message || "Interner Fehler", e.status || 500, e.code));
    }
  },
};

async function route(request, env) {
  const url = new URL(request.url);
  const p = url.pathname;
  const kv = env.PAARE;
  const now = Date.now;

  if (p === "/api/health") return json({ app: APP_NAME, core: CORE_VERSION, kv: !!kv });

  /* ---- App-Verknüpfung (M5): Universal Links (iOS) / App Links (Android).
   *  Beide Werte sind Deployment-Angaben ([vars] in wrangler.toml), erst nach
   *  Team-Beitritt bzw. Signatur-Schlüssel bekannt — fehlen sie, antwortet die
   *  Route fail-closed mit klarer Ansage (kein stiller Fallback). ---- */
  if (p === "/.well-known/apple-app-site-association" && request.method === "GET") {
    if (!env.APPLE_TEAM_ID) return fehler("APPLE_TEAM_ID fehlt — als [vars] setzen (Apple Developer \u2192 Membership).", 503, "config_missing");
    return json(aasaNutzlast(String(env.APPLE_TEAM_ID).trim()));
  }
  if (p === "/api/push/key" && request.method === "GET") {
    const vapid = vapidKonfig(env);
    if (!vapid) return fehler("Push ist nicht konfiguriert — VAPID_PUBLIC_KEY/-PRIVATE_KEY/-SUBJECT als Secrets setzen (scripts/vapid-schluessel.mjs).", 503, "config_missing");
    return json({ key: vapid.publicKey });
  }
  if (p === "/.well-known/assetlinks.json" && request.method === "GET") {
    if (!env.ANDROID_CERT_SHA256) return fehler("ANDROID_CERT_SHA256 fehlt — als [vars] setzen (keytool -list -v, SHA-256-Fingerprint).", 503, "config_missing");
    return json(assetlinksNutzlast(String(env.ANDROID_CERT_SHA256).trim().toUpperCase()));
  }
  if (!kv) return fehler("KV-Bindung PAARE fehlt", 500);

  /* ---- Öffentliche Auth-Endpunkte ---- */
  if (p === "/api/paar" && request.method === "POST") {
    if (!(await requireAdmin(env, request))) return fehler("Admin-Zugang erforderlich.", 401);
    const { code, links } = await createCouple(kv, await request.json(), now);
    return json({ code, links });
  }
  if (p === "/api/enroll" && request.method === "POST") {
    const { token } = await request.json();
    const r = await enroll(kv, token, now);
    // App-Anfragen (M5) laufen cross-origin — nur dort SameSite=None.
    const sameSite = istAppOrigin(request.headers.get("Origin")) ? "None" : undefined;
    const headers = new Headers({ "content-type": "application/json; charset=utf-8" });
    headers.append("Set-Cookie", cookieHeader("pb_cred", r.cred, { maxAge: 60 * 60 * 24 * 180, sameSite }));
    headers.append("Set-Cookie", cookieHeader("pb_sid", r.session, { sameSite }));
    return new Response(JSON.stringify({ role: r.role, name: r.name }), { status: 200, headers });
  }
  if (p === "/api/session" && request.method === "POST") {
    const sid = await loginWithCred(kv, parseCookies(request).pb_cred, now);
    const ssSession = istAppOrigin(request.headers.get("Origin")) ? "None" : undefined;
    return json({ ok: true }, 200, { "Set-Cookie": cookieHeader("pb_sid", sid, { sameSite: ssSession }) });
  }
  /* ---- Betreiber-Liste: alle Paare mit Adress-Status (admin-gated, S45).
   *  Zweck: Der Paar-Code ist der Unique Key (Namen sind reine Anzeige-Labels);
   *  ohne diese Liste wäre ein verlorener Code unauffindbar — und damit auch
   *  Export und Notfall-Wiederherstellung. ---- */
  if (p === "/api/paare" && request.method === "GET") {
    if (!(await requireAdmin(env, request))) return fehler("Admin-Zugang erforderlich.", 401);
    const paare = [];
    let cursor;
    do {
      const r = await kv.list({ prefix: "sys/couple/", cursor });
      for (const k of r.keys) {
        const c = JSON.parse(await kv.get(k.name));
        paare.push({
          code: c.code, nameA: c.nameA, nameB: c.nameB, createdAt: c.createdAt,
          emailA: await hasRecoveryEmail(kv, c.code, "A"),
          emailB: await hasRecoveryEmail(kv, c.code, "B"),
          // S61: echte usage-Token (Paar-Summe, bewusst kein Rollen-Split).
          tokens: await leseTokenStand(kv, c.code, monatsTag(now())),
        });
      }
      cursor = r.list_complete ? undefined : r.cursor;
    } while (cursor);
    paare.sort((x, y) => (y.createdAt || 0) - (x.createdAt || 0));
    return json({ paare });
  }

  /* ---- Betreiber-Wiederherstellung (Stufe 2, S45): frischer Einmal-Link für
   *  eine bestehende Rolle. Kurzlebig (RECOVER_MS) und einmalig wie der
   *  Selbstbedienungs-Link; jede Ausgabe landet im Audit-Log. Die Identitäts-
   *  prüfung der anfragenden Person ist bewusst PROZESS, nicht Code (Designnotiz
   *  im Sprint-Protokoll) — der Endpunkt selbst ist nur admin-gated. ---- */
  if (p === "/api/relink" && request.method === "POST") {
    if (!(await requireAdmin(env, request))) return fehler("Admin-Zugang erforderlich.", 401);
    const { code, role } = await request.json().catch(() => ({}));
    if (role !== "A" && role !== "B") return fehler("Unbekannte Rolle.", 400, "role_invalid");
    const couple = await kv.get("sys/couple/" + code).then(v => (v ? JSON.parse(v) : null));
    if (!couple) return fehler("Unbekannter Paar-Code.", 404);
    const token = await mintMagic(kv, code, role, now, RECOVER_MS);
    // Missbrauchs-Transparenz (D6): Die betroffene Person erfährt per Mail,
    // dass ein Zugang zu IHREM Konto erzeugt wurde. Scheitert der Versand
    // (oder gibt es keinen versandfähigen Eintrag), wird der Link trotzdem
    // ausgegeben — der Notfallweg darf nicht am Mailversand hängen.
    let benachrichtigt = false;
    try {
      const adresse = await entschluessele(await importEmailKey(env),
        (await leseEmailFor(kv, code, role))?.enc, emailAad(code, role));
      await makeMailer(env).sendMail({
        to: adresse,
        subject: "Neuer Zugangslink für dein Konto erzeugt",
        text: "Für deinen Zugang zu raumzuzweit wurde soeben vom Betreiber ein neuer Zugangslink erzeugt.\n\n" +
              "Warst du das nicht bzw. hast du das nicht angefragt, melde dich bitte umgehend beim Betreiber.",
      });
      benachrichtigt = true;
    } catch (e) { console.error("relink-mail:", code, role, e && e.message); }
    await kv.put("sys/audit/" + now() + "-" + randomToken(4),
      JSON.stringify({ typ: "relink", code, role, benachrichtigt, at: now() }));
    return json({ token, name: role === "A" ? couple.nameA : couple.nameB, benachrichtigt });
  }

  /* ---- Betreiber-Resend (Stufe 1, S46/D6): Einmal-Link an die HINTERLEGTE
   *  Adresse — der Server entschlüsselt transient, mailt und vergisst. Der
   *  bequeme Notfallweg vor dem Direktlink; ohne versandfähigen Eintrag → 409
   *  (dann Selbstbedienung oder Direktlink). Deckel je Konto (D6.4a) gegen
   *  Betreiber-Fehlbedienung. ---- */
  if (p === "/api/resend" && request.method === "POST") {
    if (!(await requireAdmin(env, request))) return fehler("Admin-Zugang erforderlich.", 401);
    const { code, role } = await request.json().catch(() => ({}));
    if (role !== "A" && role !== "B") return fehler("Unbekannte Rolle.", 400, "role_invalid");
    const couple = await kv.get("sys/couple/" + code).then(v => (v ? JSON.parse(v) : null));
    if (!couple) return fehler("Unbekannter Paar-Code.", 404);
    const rlKey = "sys/resendlimit/" + code + "/" + role;
    const cnt = Number((await kv.get(rlKey)) || 0);
    if (cnt >= (Number(env.RESEND_RATE) || 3)) return fehler("Tageslimit für dieses Konto erreicht.", 429, "resend_rate");
    let adresse;
    try {
      adresse = await entschluessele(await importEmailKey(env),
        (await leseEmailFor(kv, code, role))?.enc, emailAad(code, role));
    } catch (e) {
      if (e.code === "no_email_enc") return fehler("Kein versandfähiger Adress-Eintrag für dieses Konto.", 409, "no_email_enc");
      throw e;
    }
    await kv.put(rlKey, String(cnt + 1), { expirationTtl: 86400 });
    const token = await mintMagic(kv, code, role, now, RECOVER_MS);
    const url = new URL(request.url);
    await makeMailer(env).sendMail({
      to: adresse,
      subject: "Dein neuer Zugangslink",
      text: "Hier ist dein neuer Zugangslink zu raumzuzweit:\n\n" +
            url.origin + "/#t=" + token + "\n\n" +
            "Der Link ist etwa 15 Minuten gültig und nur einmal verwendbar.",
    });
    await kv.put("sys/audit/" + now() + "-" + randomToken(4),
      JSON.stringify({ typ: "resend", code, role, at: now() }));
    return json({ ok: true, name: role === "A" ? couple.nameA : couple.nameB });
  }

  /* ---- Betriebsmitteilung an alle (S46/D6): der mächtigste Endpunkt im
   *  System — darum Nonce-Pflicht (D6.3b): Senden geht NUR nach vorherigem
   *  dryRun, dessen Nonce Inhalt (Hash) und Zeitfenster bindet, einmalig.
   *  Direkte POSTs ohne Vorschau sind damit technisch unmöglich; Retries
   *  nach Timeout können nicht doppelt senden. ---- */
  if (p === "/api/broadcast" && request.method === "POST") {
    if (!(await requireAdmin(env, request))) return fehler("Admin-Zugang erforderlich.", 401);
    const { subject, text, dryRun, nonce } = await request.json().catch(() => ({}));
    if (!subject || !text) return fehler("subject und text sind Pflicht.", 400, "broadcast_leer");
    const inhaltHash = await sha256Hex(subject + "\n" + text);
    const empfaenger = [];
    let cursor;
    do {
      const r = await kv.list({ prefix: "sys/emailfor/", cursor });
      for (const k of r.keys) {
        const teile = k.name.split("/");                     // sys emailfor code role
        const e = JSON.parse(await kv.get(k.name));
        if (e && e.verified && e.enc) empfaenger.push({ code: teile[2], role: teile[3], enc: e.enc });
      }
      cursor = r.list_complete ? undefined : r.cursor;
    } while (cursor);
    if (dryRun === true) {
      const frisch = randomToken(16);
      await kv.put("sys/broadcastnonce/" + frisch,
        JSON.stringify({ inhaltHash, at: now() }), { expirationTtl: 600 });
      return json({ empfaenger: empfaenger.length, nonce: frisch });
    }
    const nKey = "sys/broadcastnonce/" + String(nonce || "");
    const nEintrag = nonce ? await kv.get(nKey).then(v => (v ? JSON.parse(v) : null)) : null;
    if (!nEintrag) return fehler("Senden erfordert eine gültige Vorschau (dryRun) — Nonce fehlt, ist abgelaufen oder verbraucht.", 400, "nonce_invalid");
    if (nEintrag.inhaltHash !== inhaltHash) return fehler("Der Inhalt wurde seit der Vorschau geändert — bitte erneut prüfen.", 409, "nonce_mismatch");
    await kv.delete(nKey);                                   // VOR dem Versand verbrauchen: kein Doppel-Versand bei Retry
    const emailKey = await importEmailKey(env);
    const mailer = makeMailer(env);
    let gesendet = 0, fehlgeschlagen = 0;
    for (const e of empfaenger) {
      try {
        const adresse = await entschluessele(emailKey, e.enc, emailAad(e.code, e.role));
        await mailer.sendMail({ to: adresse, subject, text });
        gesendet++;
      } catch (err) {
        fehlgeschlagen++;
        console.error("broadcast-mail:", e.code, e.role, err && err.message);   // nie die Adresse
      }
    }
    await kv.put("sys/audit/" + now() + "-" + randomToken(4),
      JSON.stringify({ typ: "broadcast", subject, empfaenger: empfaenger.length, gesendet, fehlgeschlagen, at: now() }));
    return json({ empfaenger: empfaenger.length, gesendet, fehlgeschlagen });
  }

  /* ---- Token-Statistik (S61, admin-gated): /api/tokens = Voll-Export für das
   *  Post-Eval-Kostenskript (alle Paare × alle Monats-Eimer, ein JSON);
   *  /api/tokens/:code = Historie eines Paars (Monatsansicht der Admin-Liste).
   *  Reihenfolge beachten: der exakte Pfad vor dem Code-Muster. ---- */
  if (p === "/api/tokens" && request.method === "GET") {
    if (!(await requireAdmin(env, request))) return fehler("Admin-Zugang erforderlich.", 401);
    return json({ stand: new Date(now()).toISOString(), paare: await leseTokenExport(kv) });
  }
  const mTok = /^\/api\/tokens\/([A-Za-z0-9]+)$/.exec(p);
  if (mTok && request.method === "GET") {
    if (!(await requireAdmin(env, request))) return fehler("Admin-Zugang erforderlich.", 401);
    return json({ code: mTok[1], ...(await leseTokenHistorie(kv, mTok[1])) });
  }

  /* ---- Betreiber-Export: alle Daten EINES Paars (Auswertung, admin-gated) ---- */
  const mExp = /^\/api\/export\/([A-Za-z0-9]+)$/.exec(p);
  if (mExp && request.method === "GET") {
    if (!(await requireAdmin(env, request))) return fehler("Admin-Zugang erforderlich.", 401);
    const code = mExp[1];
    const couple = await kv.get("sys/couple/" + code).then(v => (v ? JSON.parse(v) : null));
    if (!couple) return fehler("Unbekannter Paar-Code.", 404);
    const store = new KVStore(kv);
    const praefix = "p:" + (env.NS || "PB") + ":" + code + ":";
    const dump = { zeit: new Date().toISOString(), code, nameA: couple.nameA, nameB: couple.nameB, shared: {}, privat: {} };
    for (const shared of [true, false]) {
      const target = shared ? dump.shared : dump.privat;
      for (const k of await store.list(praefix, shared)) target[k] = await store.get(k, shared);
    }
    return json(dump);
  }

  if (p === "/api/recover" && request.method === "POST") {
    // Raten-Limit je IP (grob), gegen Missbrauch — unabhängig davon, ob die Adresse existiert.
    const ip = request.headers.get("cf-connecting-ip") || "unbekannt";
    const rlKey = "sys/reclimit/" + ip;
    const cnt = Number((await kv.get(rlKey)) || 0);
    if (cnt >= (Number(env.RECOVER_RATE) || 5)) return fehler("Zu viele Anfragen. Bitte etwas später erneut.", 429);
    await kv.put(rlKey, String(cnt + 1), { expirationTtl: 3600 });

    const { email } = await request.json().catch(() => ({}));
    const treffer = await lookupRecovery(kv, email);
    if (treffer) {
      const token = await mintMagic(kv, treffer.code, treffer.role, now, RECOVER_MS);
      const link = new URL(request.url).origin + "/#t=" + token;
      try {
        await makeMailer(env).sendMail({
          to: String(email).trim(),
          subject: "Dein Zugang zu raumzuzweit",
          text: "Hier ist dein neuer persönlicher Zugangslink:\n\n" + link +
                "\n\nEr ist etwa 15 Minuten gültig und nur einmal verwendbar. " +
                "Falls du das nicht angefordert hast, kannst du diese Nachricht ignorieren.",
        });
      } catch (e) {
        // Versandfehler nie nach außen offenlegen — aber fürs Betreiber-Log
        // sichtbar machen (wrangler tail), sonst ist z. B. fehlende
        // SMTP-Konfiguration von „Adresse nicht hinterlegt“ ununterscheidbar.
        console.error("recover-mail:", e && e.message);
      }
    }
    return json({ ok: true });   // niemals verraten, ob die Adresse hinterlegt ist
  }

  /* ---- Ab hier: Session-Pflicht (touch-to-extend) ---- */
  const session = await requireSession(kv, parseCookies(request).pb_sid, now);
  if (!session) return fehler("Keine gültige Sitzung.", 401);

  const repo = new Repo({ store: new KVStore(kv), ns: env.NS || "PB", code: session.code, activeModuleId: "betrieb" });
  const bstate = new Bstate(repo);
  const pstate = new Pstate(repo);

  if (p === "/api/me") {
    const couple = JSON.parse(await kv.get("sys/couple/" + session.code));
    return json({
      role: session.role,
      name: session.role === "A" ? couple.nameA : couple.nameB,
      partner: session.role === "A" ? couple.nameB : couple.nameA,
      nameA: couple.nameA, nameB: couple.nameB,
      locale: couple.locale || "de",
      languageRequest: couple.languageRequest || null,
      recoveryEmail: await hasRecoveryEmail(kv, session.code, session.role),
      // Feature-Flag EMAIL_PFLICHT (D2b): Modal-Pflicht erst scharf schalten,
      // wenn der Mailversand produktiv verifiziert ist — sonst sperrt ein
      // SMTP-Ausfall die gesamte App.
      emailRequired: env.EMAIL_PFLICHT === "1" || env.EMAIL_PFLICHT === "true" || env.EMAIL_PFLICHT === true,
    });
  }

  /* ---- Paarsprache: Wechsel nur beidseitig bestätigt (S30·C3).
   *  Zustandsmaschine im Worker — die UI kann die Invariante nicht umgehen:
   *  locale ändert sich AUSSCHLIESSLICH durch zwei gleichlautende Anträge
   *  verschiedener Rollen („von beiden bestätigt" auf Einstellungs-Ebene).
   *  Die Rolle kommt aus der Session, nie aus dem Request. ---- */
  if (p === "/api/language" && (request.method === "POST" || request.method === "DELETE")) {
    const coupleKey = "sys/couple/" + session.code;
    const paar = JSON.parse(await kv.get(coupleKey));
    if (request.method === "DELETE") {
      // Zurückziehen (Vorschlagende) oder Ablehnen (Partner) — beide Rollen dürfen.
      if (paar.languageRequest) { delete paar.languageRequest; await kv.put(coupleKey, JSON.stringify(paar)); }
      return json({ locale: paar.locale || "de", languageRequest: null, status: "discarded" });
    }
    const { target } = await request.json().catch(() => ({}));
    const z = target === "en" ? "en" : target === "de" ? "de" : null;
    if (!z) return fehler("Unbekannte Zielsprache.", 400, "language_invalid");
    const aktuell = paar.locale || "de";
    if (z === aktuell)
      // Antrag auf die aktive Sprache: stiller No-op (Design-Entscheidung C3);
      // ein etwaiger offener Wunsch bleibt unberührt — Rückzug ist DELETE.
      return json({ locale: aktuell, languageRequest: paar.languageRequest || null, status: "aktiv" });
    const w = paar.languageRequest;
    if (w && w.target === z && w.by !== session.role) {
      paar.locale = z;                       // zweiter, gleichlautender Antrag der anderen Rolle
      delete paar.languageRequest;
      await kv.put(coupleKey, JSON.stringify(paar));
      return json({ locale: z, languageRequest: null, status: "confirmed" });
    }
    paar.languageRequest = { target: z, by: session.role, at: now() };   // neu oder idempotent erneuert
    await kv.put(coupleKey, JSON.stringify(paar));
    return json({ locale: aktuell, languageRequest: paar.languageRequest, status: "waiting" });
  }

  /* ---- Wiedereinstiegs-Adresse hinterlegen — zweistufig mit PIN (S45).
   *  Schritt 1 (/api/email): Adresse prüfen, 6-stelligen Code an genau diese
   *  Adresse mailen. Scheitert der Versand, erfährt es die Person (mail_failed) —
   *  hier gibt es kein Enumerations-Risiko, sie nennt ihre eigene Adresse.
   *  Schritt 2 (/api/email/confirm): Code prüfen; erst dann zählt die Adresse. ---- */
  if (p === "/api/email" && request.method === "POST") {
    // Raten-Limit je Konto: verhindert, dass eine Session als Mail-Kanone
    // gegen fremde Postfächer dient.
    const vlKey = "sys/veriflimit/" + session.code + "/" + session.role;
    const cnt = Number((await kv.get(vlKey)) || 0);
    if (cnt >= (Number(env.VERIFY_RATE) || 5)) return fehler("Zu viele Anfragen. Bitte etwas später erneut.", 429, "verify_rate");
    await kv.put(vlKey, String(cnt + 1), { expirationTtl: 3600 });

    const { email } = await request.json().catch(() => ({}));
    try {
      const { pin, email: clean } = await beginRecoveryEmail(kv, session, email, now);
      await makeMailer(env).sendMail({
        to: clean,
        subject: "Dein Bestätigungscode",
        text: "Dein Bestätigungscode für raumzuzweit lautet:\n\n" + pin +
              "\n\nEr ist etwa 15 Minuten gültig. Falls du das nicht angefordert hast, kannst du diese Nachricht ignorieren.",
      });
      return json({ ok: true });
    } catch (e) {
      if (e.code) return fehler(e.message, e.status || 400, e.code);
      console.error("verify-mail:", e && e.message);
      return fehler("Der Versand ist gerade nicht möglich.", 502, "mail_failed");
    }
  }
  if (p === "/api/email/confirm" && request.method === "POST") {
    const { pin, email } = await request.json().catch(() => ({}));
    try {
      // Konfigurationspflicht (S46): ohne EMAIL_KEY keine Bestätigung — klare
      // Deploy-Fehlermeldung statt still fehlendem enc-Feld.
      const emailKey = await importEmailKey(env);
      await confirmRecoveryEmail(kv, session, { pin, email, emailKey }, now);
      return json({ ok: true });
    }
    catch (e) { return fehler(e.message, e.status || 400, e.code); }
  }

  /* ---- Mess-Runden: SERVERGEFÜHRT (I12 „Verdeckte Runde", S91).
   *  Rolle ausschließlich aus der Session; Merge/Aufdeckung laufen über die
   *  KERN-Funktionen (eine Quelle der Wahrheit) mit voller Sicht im Worker. ---- */
  if (p === "/api/mess/beitrag" && request.method === "POST") {
    const b = await request.json().catch(() => ({}));
    const z = n => Number.isFinite(+n) && +n >= 1 && +n <= 10;
    if (!z(b.closeness) || !z(b.guess)) return fehler("Beitrag unvollständig.", 400, "mess_invalid");
    const fit = {};
    for (const [k, v] of Object.entries(b.fit || {})) { if (!z(v)) return fehler("Beitrag unvollständig.", 400, "mess_invalid"); fit[k] = +v; }
    const runde = await trageMessbeitragEin({ bstate }, session.role, { closeness: +b.closeness, guess: +b.guess, fit });
    // Antwort in der SICHT der abgebenden Rolle: offen ⇒ nur eigener Beitrag.
    return json({ runde: redigiereMessungenFuerRolle({ items: [runde] }, session.role).items[0] || null });
  }
  if (p === "/api/mess/aufgedeckt" && request.method === "POST") {
    const { rundeId } = await request.json().catch(() => ({}));
    await markiereAufgedeckt({ bstate }, rundeId);
    return json({ ok: true });
  }

  /* ---- Bstate: geteilt, beide Rollen ---- */
  let m = p.match(/^\/api\/bstate\/([a-zA-Z]+)$/);
  if (m) {
    if (!BSTATE_FELDER.has(m[1])) return fehler("Unbekanntes Bstate-Feld: " + m[1], 404);
    if (request.method === "GET") {
      const wert = await bstate.get(m[1]);
      // I12: Messungen verlassen den Worker nur rollenbewusst redigiert.
      if (m[1] === "measurements") return json({ value: redigiereMessungenFuerRolle(wert, session.role) });
      return json({ value: wert });
    }
    if (request.method === "PUT") {
      // I12: Der Client sieht Messungen redigiert — ein Read-Modify-Write von
      // dort löschte Partner-Beiträge. Schreiben nur über /api/mess/*.
      if (m[1] === "measurements") return fehler("Messungen sind servergeführt (I12) — /api/mess/beitrag verwenden.", 403, "mess_managed");
      const { value } = await request.json();
      const ok = await bstate.set(m[1], value);
      return ok ? json({ ok: true }) : fehler("Speichern fehlgeschlagen", 500);
    }
  }

  /* ---- Pstate: Rolle AUSSCHLIESSLICH aus der Session ---- */
  m = p.match(/^\/api\/pstate\/([a-zA-Z]+)$/);
  if (m) {
    if (!PSTATE_FELDER.has(m[1])) return fehler("Unbekanntes Pstate-Feld: " + m[1], 404);
    // Bewusst: url.searchParams / Request-Body werden für die Rolle NICHT konsultiert.
    if (request.method === "GET") return json({ value: await pstate.get(session.role, m[1]) });
    if (request.method === "PUT") {
      const { value } = await request.json();
      const ok = await pstate.set(session.role, m[1], value);
      return ok ? json({ ok: true }) : fehler("Speichern fehlgeschlagen", 500);
    }
  }

  /* ---- Chats: privat je Rolle (aus Session) oder geteilt ---- */
  m = p.match(/^\/api\/chat\/(shared|mine)\/([a-zA-Z0-9:_-]+)$/);
  if (m) {
    const shared = m[1] === "shared";
    const part = shared ? "chat:" + m[2] : "chat:" + session.role + ":" + m[2];
    if (request.method === "GET") return json({ value: await repo.get(part, shared) });
    if (request.method === "PUT") {
      const { value } = await request.json();
      const ok = await repo.set(part, value, shared);
      return ok ? json({ ok: true }) : fehler("Speichern fehlgeschlagen", 500);
    }
  }

  /* ---- Web Push: Abo an-/abmelden (Session-pflichtig, je Rolle) ---- */
  if (p === "/api/push/subscribe" && request.method === "POST") {
    if (!vapidKonfig(env)) return fehler("Push ist nicht konfiguriert.", 503, "config_missing");
    const { subscription } = await request.json();
    if (!gueltigesAbo(subscription)) return fehler("Ungültige Subscription.", 400, "push_invalid");
    const abos = (await lesePushAbos(kv, session.code, session.role))
      .filter(a => a.endpoint !== subscription.endpoint);
    abos.push({ endpoint: subscription.endpoint, keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth } });
    await kv.put(pushKey(session.code, session.role), JSON.stringify(abos.slice(-5)));
    return json({ ok: true });
  }
  if (p === "/api/push/subscribe" && request.method === "DELETE") {
    const { endpoint } = await request.json();
    const abos = (await lesePushAbos(kv, session.code, session.role)).filter(a => a.endpoint !== endpoint);
    await kv.put(pushKey(session.code, session.role), JSON.stringify(abos));
    return json({ ok: true });
  }

  /* ---- Übergabe: Schreiben nur für die eigene Rolle, Lesen geteilt ---- */
  if (p === "/api/handover" && request.method === "POST") {
    const { module, name, items } = await request.json();
    const u = await freigebeUebergabe(repo, session.role, { module, name, items });
    // Inhaltsfreier Hinweis an die andere Rolle — Fehler dort dürfen die
    // Freigabe selbst nie brechen.
    try { await benachrichtigePartner(kv, env, session.code, session.role === "A" ? "B" : "A"); } catch { /* bewusst still */ }
    return json({ ok: true, releasedAt: u.releasedAt });
  }
  m = p.match(/^\/api\/handover\/(A|B)$/);
  if (m && request.method === "GET") {
    // Geteilte Schicht: beide dürfen beide Freigaben lesen (das ist ihr Zweck).
    return json({ value: await repo.get(uebergabeTeilKey(m[1]), true, "kernwetten") });
  }

  /* ---- LLM-Proxy: Key bleibt serverseitig; Session-Pflicht = Denial-of-Wallet-Schutz.
          Davor der Missbrauchsschutz (§5.4): Duplikat-Wächter → Raten-Limit →
          Kontingent — alles OHNE Upstream-Kontakt abgewiesen. ---- */
  if (p === "/api/llm" && request.method === "POST") {
    const { system, messages, stream, structured } = await request.json();
    if (typeof system !== "string" || !Array.isArray(messages)) return fehler("system und messages sind Pflicht", 400);
    // S76 · Strukturausgabe: der Client schickt Name + JSON-Schema, der Worker
    // übersetzt providerspezifisch (Tool-Use bzw. response_format). Grenzen:
    // vollständige Angabe erzwingen (kein Raten) und Größe deckeln — ein
    // öffentlicher Endpunkt darf keine Schema-Bomben in den Upstream tragen.
    if (structured !== undefined && structured !== null) {
      if (typeof structured !== "object" || typeof structured.name !== "string" || !structured.name
          || !structured.schema || typeof structured.schema !== "object")
        return fehler("structured unvollständig: { name, schema } sind Pflicht", 400);
      if (JSON.stringify(structured).length > 20000)
        return fehler("structured zu groß (max. 20000 Zeichen)", 400);
      // S79: structured + stream ist unterstützt — die {delta}-Events tragen den
      // EXTRAHIERTEN Begleitertext (antwort-Feld), data reist im done-Event.
    }
    const letzte = [...messages].reverse().find(x => x.role === "user");
    const q = await pruefeUndZaehle(kv, session, letzte ? letzte.content : "", quotaCfg(env), now);
    if (!q.ok) return fehler(q.meldung, q.status);
    const fetchFn = env.UPSTREAM ? env.UPSTREAM.fetch.bind(env.UPSTREAM) : globalThis.fetch;
    // Provider-Schalter (S47) unter Konfigurationspflicht (S35d): EIN Wert wählt
    // den Provider — LLM_PROVIDER. Key und Modell liegen pro Provider getrennt
    // vor (<PROVIDER>_API_KEY / <PROVIDER>_MODEL), sodass ein Wechsel nur
    // LLM_PROVIDER umlegt und die vorprovisionierten Paare stehen bleiben.
    // Kein stiller Fallback: fehlt zum gewählten Provider Schalter, Key oder
    // Modell, ist das ein Deploy-Fehler und wird variablen-genau gemeldet.
    const erlaubteProvider = Object.keys(LLM_PROVIDERS).join(" | ");
    if (!env.LLM_PROVIDER)
      return fehler("LLM nicht konfiguriert: LLM_PROVIDER (der Provider-Schalter) muss gesetzt sein — erlaubt: " + erlaubteProvider + ".", 500);
    if (!LLM_PROVIDERS[env.LLM_PROVIDER])
      return fehler("LLM nicht konfiguriert: unbekannter LLM_PROVIDER=\"" + env.LLM_PROVIDER + "\" — erlaubt: " + erlaubteProvider + ".", 500);
    const pOben = env.LLM_PROVIDER.toUpperCase();
    const apiKey = env[pOben + "_API_KEY"];
    const modell = env[pOben + "_MODEL"];
    if (!apiKey)
      return fehler("LLM nicht konfiguriert: LLM_PROVIDER=\"" + env.LLM_PROVIDER + "\", aber " + pOben + "_API_KEY fehlt im Worker-Environment.", 500);
    if (!modell)
      return fehler("LLM nicht konfiguriert: LLM_PROVIDER=\"" + env.LLM_PROVIDER + "\", aber " + pOben + "_MODEL fehlt im Worker-Environment.", 500);
    // S70 · Overload-Härtung: gedeckeltes Retry-Fenster MIT Full-Jitter im
    // Adapter (429/503/529 & 5xx). Bewusst KURZ (Worst-Case ≈ 10–12 s), weil
    // die Retries im bereits geöffneten SSE-Strom laufen — lange Stille auf
    // offener Verbindung riskiert Idle-Timeouts von Zwischenschichten. Die
    // Werte sind Robustheits-Tuning (kein Provider-Wissen) und per env
    // übersteuerbar: LLM_VERSUCHE / LLM_BACKOFF_MS / LLM_MAX_BACKOFF_MS.
    const zahl = (roh, sonst) => { const n = Number(roh); return Number.isFinite(n) && n > 0 ? n : sonst; };
    // S77 · Denkmodus: die Begleitung läuft ohne Thinking (deterministisches
    // Ausgabe-Budget; adaptives Thinking verbrauchte gemessen ganze Antworten,
    // bevor Text begann). Per LLM_THINKING="adaptiv" umstellbar, ohne Deploy-
    // Zwang: Robustheits-Tuning, kein Provider-/Modellwissen.
    const llmCfg = {
      provider: env.LLM_PROVIDER, mode: "direct", apiKey, models: { [env.LLM_PROVIDER]: modell },
      thinking: env.LLM_THINKING === "adaptiv" ? "adaptiv" : "disabled",
      maxTokens: zahl(env.LLM_MAX_TOKENS, 4096),
      versuche: zahl(env.LLM_VERSUCHE, 4),
      backoffMs: zahl(env.LLM_BACKOFF_MS, 1500),
      maxBackoffMs: zahl(env.LLM_MAX_BACKOFF_MS, 6000),
    };
    if (stream === true) {
      // Streaming-Pfad: Upstream-SSE wird vom Adapter geparst und hier als
      // provider-neutrale SSE re-emittiert ({delta}… {done} | {error}).
      // Der Client bleibt so frei von Provider-Wissen; Kontingent-Hinweise
      // reisen im done-Event mit. Fehler NACH Response-Start können keinen
      // HTTP-Status mehr ändern — darum das error-Event im Strom.
      const enc = new TextEncoder();
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const sende = obj => writer.write(enc.encode("data: " + JSON.stringify(obj) + "\n\n"));
      // S70: je Upstream-Wiederholung ein zahlenloses {retry}-Event — der
      // Client zeigt eine ruhige Warteanzeige. Fehler-Events tragen den
      // stabilen Code FLACH ({error, code}), exakt wie fehler() im JSON-Pfad;
      // Alt-Clients lesen error weiter als String (rückwärtskompatibel).
      const call = makeAdapter({ ...llmCfg, onRetry: () => { sende({ retry: true }); } }, fetchFn);
      (async () => {
        try {
          const antwort = await call(system, messages,
            structured ? { structured, onDelta: d => { sende({ delta: d }); } }
                       : d => { sende({ delta: d }); });
          if (q.hinweis) antwort.kontingent = { hinweis: q.hinweis, rest: q.rest };
          await sende({ done: antwort });
          // S61: erst NACH dem done-Event zählen — die Statistik verzögert
          // nie die Antwort und blockiert sie nie (Best-Effort im Modul).
          await erfasseUsage(kv, session.code, antwort.usage, now);
        } catch (e) {
          await sende(e && e.code ? { error: e.message || "LLM-Fehler", code: e.code } : { error: e.message || "LLM-Fehler" });
        } finally {
          try { await writer.close(); } catch { /* Client weg */ }
        }
      })();
      return new Response(readable, {
        headers: {
          "content-type": "text/event-stream; charset=utf-8",
          "cache-control": "no-cache",
          "x-accel-buffering": "no",
        },
      });
    }
    // JSON-Altpfad: Fehler wandern zum äußeren Catch, der e.code bereits als
    // fehler(msg, status, code) serialisiert — hier ist nichts zu tun (S70).
    const call = makeAdapter(llmCfg, fetchFn);
    const antwort = await call(system, messages, structured ? { structured } : undefined);
    if (q.hinweis) antwort.kontingent = { hinweis: q.hinweis, rest: q.rest };
    await erfasseUsage(kv, session.code, antwort.usage, now);   // S61, Best-Effort
    return json(antwort);
  }

  return fehler("Nicht gefunden: " + p, 404);
}
