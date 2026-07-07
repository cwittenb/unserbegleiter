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
import { makeAdapter } from "../../../core/llm/adapter.js";
import { parseCookies, cookieHeader } from "./util.js";
import { pruefeUndZaehle, quotaCfg } from "./quota.js";
import { createCouple, enroll, loginWithCred, requireSession, requireAdmin,
         mintMagic, RECOVER_MS, setRecoveryEmail, hasRecoveryEmail, lookupRecovery } from "./auth.js";
import { makeMailer } from "./mailer.js";

const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
const fehler = (msg, status, code) => json(code ? { error: msg, code } : { error: msg }, status);

const BSTATE_FELDER = new Set(Bstate.FIELDS);
const PSTATE_FELDER = new Set(["zeitleiste", "selbstoffenbarungen"]);

export default {
  async fetch(request, env, ctx) {
    try {
      return await route(request, env);
    } catch (e) {
      return fehler(e.message || "Interner Fehler", e.status || 500, e.code);
    }
  },
};

async function route(request, env) {
  const url = new URL(request.url);
  const p = url.pathname;
  const kv = env.PAARE;
  const now = Date.now;

  if (p === "/api/health") return json({ app: APP_NAME, core: CORE_VERSION, kv: !!kv });
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
    const headers = new Headers({ "content-type": "application/json; charset=utf-8" });
    headers.append("Set-Cookie", cookieHeader("pb_cred", r.cred, { maxAge: 60 * 60 * 24 * 180 }));
    headers.append("Set-Cookie", cookieHeader("pb_sid", r.session));
    return new Response(JSON.stringify({ role: r.role, name: r.name }), { status: 200, headers });
  }
  if (p === "/api/session" && request.method === "POST") {
    const sid = await loginWithCred(kv, parseCookies(request).pb_cred, now);
    return json({ ok: true }, 200, { "Set-Cookie": cookieHeader("pb_sid", sid) });
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
      const ziel = shared ? dump.shared : dump.privat;
      for (const k of await store.list(praefix, shared)) ziel[k] = await store.get(k, shared);
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
          subject: "Dein Zugang zur Paarbegleitung",
          text: "Hier ist dein neuer persönlicher Zugangslink:\n\n" + link +
                "\n\nEr ist etwa 15 Minuten gültig und nur einmal verwendbar. " +
                "Falls du das nicht angefordert hast, kannst du diese Nachricht ignorieren.",
        });
      } catch (e) { /* Versandfehler nicht nach außen offenlegen */ }
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
      recoveryEmail: await hasRecoveryEmail(kv, session.code, session.role),
    });
  }

  /* ---- Wiedereinstiegs-Adresse hinterlegen (nur eigene Rolle, aus Session) ---- */
  if (p === "/api/email" && request.method === "POST") {
    const { email } = await request.json().catch(() => ({}));
    try { await setRecoveryEmail(kv, session, email, now); return json({ ok: true }); }
    catch (e) { return fehler(e.message, e.status || 400, e.code); }
  }

  /* ---- Bstate: geteilt, beide Rollen ---- */
  let m = p.match(/^\/api\/bstate\/([a-zA-Z]+)$/);
  if (m) {
    if (!BSTATE_FELDER.has(m[1])) return fehler("Unbekanntes Bstate-Feld: " + m[1], 404);
    if (request.method === "GET") return json({ value: await bstate.get(m[1]) });
    if (request.method === "PUT") {
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

  /* ---- Übergabe: Schreiben nur für die eigene Rolle, Lesen geteilt ---- */
  if (p === "/api/handover" && request.method === "POST") {
    const { module, name, items } = await request.json();
    const u = await freigebeUebergabe(repo, session.role, { module, name, items });
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
    const { system, messages } = await request.json();
    if (typeof system !== "string" || !Array.isArray(messages)) return fehler("system und messages sind Pflicht", 400);
    const letzte = [...messages].reverse().find(x => x.role === "user");
    const q = await pruefeUndZaehle(kv, session, letzte ? letzte.content : "", quotaCfg(env), now);
    if (!q.ok) return fehler(q.meldung, q.status);
    const fetchFn = env.UPSTREAM ? env.UPSTREAM.fetch.bind(env.UPSTREAM) : globalThis.fetch;
    const call = makeAdapter(
      { provider: env.LLM_PROVIDER || "anthropic", mode: "direct", apiKey: env.LLM_API_KEY || "test", models: env.LLM_MODEL ? { anthropic: env.LLM_MODEL } : {} },
      fetchFn
    );
    const antwort = await call(system, messages);
    if (q.hinweis) antwort.kontingent = { hinweis: q.hinweis, rest: q.rest };
    return json(antwort);
  }

  return fehler("Nicht gefunden: " + p, 404);
}
