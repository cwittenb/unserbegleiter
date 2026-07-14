// Auth-Schicht des Workers — Spez §5.
//
// Entitäten (System-Namensraum, getrennt von Repo-Daten):
//   sys/couple/<code>    { code, nameA, nameB, createdAt }
//   sys/magic/<token>    { code, role, expiresAt, used }        — Einmal-Token
//   sys/cred/<credHash>  { code, role }                          — langlebig, httpOnly-Cookie
//   sys/session/<sid>    { code, role, expiresAt }               — 15 min, touch-to-extend
//
// Kernregeln:
//   · Rolle und Paar-Code stammen IMMER aus der Session — nie aus dem Request.
//   · Magic-Token: einmaliger Konsum; zweiter Versuch scheitert hart.
//   · Session: jede authentifizierte Anfrage verlängert (Banking-Muster).
//   · Nur Hashes von Credentials im Speicher; Session-IDs sind zufällig (128 bit).

import { randomToken, sha256Hex } from "./util.js";
import { verschluessele, emailAad } from "./krypto.js";

export const SESSION_MS = 15 * 60 * 1000;
export const MAGIC_MS = 14 * 24 * 60 * 60 * 1000;
export const RECOVER_MS = 15 * 60 * 1000;   // Wiedereinstiegs-Link: kurzlebig, on demand

const J = (kv, k) => kv.get(k).then(v => (v === null ? null : JSON.parse(v)));
const W = (kv, k, v) => kv.put(k, JSON.stringify(v));

/**
 * Admin-Gate für Betreiber-Endpunkte (Paar anlegen).
 * FAIL-CLOSED: Ohne konfiguriertes ADMIN_TOKEN ist der Endpunkt gesperrt —
 * ein Deploy, der das Secret vergisst, lässt niemanden herein statt alle.
 * Vergleich über gleich lange SHA-256-Digests (kein früh abbrechender
 * Zeichenketten-Vergleich, keine Leckage der Token-Länge).
 */
export async function requireAdmin(env, request) {
  const erwartet = env && env.ADMIN_TOKEN;
  if (!erwartet) return false;
  const geliefert = request.headers.get("x-admin-token") || "";
  const [a, b] = await Promise.all([sha256Hex(geliefert), sha256Hex(erwartet)]);
  return a === b;
}

/** Erzeugt einen frischen Einmal-Token (Magic-Link). ttlMs steuert die Gültigkeit
 *  (Erstausgabe: 14 Tage; Wiedereinstieg on demand: 15 Minuten). */
export async function mintMagic(kv, code, role, now = Date.now, ttlMs = MAGIC_MS) {
  const token = randomToken(16);
  await W(kv, "sys/magic/" + token, { code, role, expiresAt: now() + ttlMs, used: false });
  return token;
}

export async function createCouple(kv, { nameA, nameB, locale }, now = Date.now) {
  if (!nameA || !nameB) throw Object.assign(new Error("nameA und nameB sind Pflicht"), { status: 400, code: "names_required" });
  const code = randomToken(6);
  await W(kv, "sys/couple/" + code, { code, nameA, nameB, locale: locale === "en" ? "en" : "de", createdAt: now() });
  const links = {};
  for (const role of ["A", "B"]) links[role] = await mintMagic(kv, code, role, now);
  return { code, links };   // Übergabe-Variante: Initiator erhält beide Links
}

/* ---- Wiedereinstieg per E-Mail (nur E-Mail, kein Passwort — bewusste Entscheidung).
 *  Modell: sys/email/<sha256(mail)> → {code, role}   (Lookup, eine Adresse ⇒ ein Konto)
 *          sys/emailfor/<code>/<role> → {hash, at, verified}  (Status + Ersetzen/Aufräumen)
 *          sys/verify/<code>/<role>  → {hash, pinHash, expiresAt, versuche}  (offene Bestätigung)
 *  Es wird NUR der Hash gespeichert, nie die Klartext-Adresse. Beim Wiedereinstieg
 *  tippt die Person ihre Adresse selbst; passt der Hash, geht der Link an genau diese.
 *
 *  Verifikation (S45): Adresse zählt erst nach PIN-Bestätigung. Die 6-stellige
 *  PIN wird per Mail an die genannte Adresse geschickt (Klartext nur transient
 *  im Request), gespeichert wird ausschließlich ihr Hash. Der Lookup-Eintrag
 *  sys/email/<hash> entsteht ERST bei erfolgreicher Bestätigung — damit gehen
 *  Wiedereinstiegs-Links strukturell nur an verifizierte Adressen (D4). Ein
 *  Tippfehler in der Adresse fällt sofort auf (kein Code kommt an), statt das
 *  Sicherheitsnetz still zu zerstören. */
export const VERIFY_MS = 15 * 60 * 1000;
export const VERIFY_MAX_VERSUCHE = 5;

const emailLookupKey = h => "sys/email/" + h;
const emailForKey = (code, role) => "sys/emailfor/" + code + "/" + role;
const verifyKey = (code, role) => "sys/verify/" + code + "/" + role;
const normMail = e => String(e || "").trim().toLowerCase();
const istMail = e => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);

function pinErzeugen() {
  // 6 Ziffern, kryptografisch zufällig. Uint32 % 10^6 hat eine minimale, hier
  // irrelevante Verzerrung (2^32 ist kein Vielfaches von 10^6) — der Schutz
  // liegt im Versuchszähler, nicht in perfekter Gleichverteilung.
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return String(a[0] % 1000000).padStart(6, "0");
}

const pinDigest = (code, role, pin) => sha256Hex("pin:" + code + ":" + role + ":" + String(pin || "").trim());

/** Schritt 1: Adresse prüfen, PIN erzeugen, offene Bestätigung speichern.
 *  Gibt die PIN an den Aufrufer zurück (der Worker verschickt sie) — sie wird
 *  selbst nie gespeichert, nur ihr Hash. */
export async function beginRecoveryEmail(kv, { code, role }, email, now = Date.now) {
  const clean = normMail(email);
  if (!istMail(clean)) throw Object.assign(new Error("Bitte eine gültige E-Mail-Adresse angeben."), { status: 400, code: "email_invalid" });
  const hash = await sha256Hex(clean);
  const belegt = await J(kv, emailLookupKey(hash));
  if (belegt && (belegt.code !== code || belegt.role !== role))
    throw Object.assign(new Error("Diese Adresse ist bereits hinterlegt."), { status: 409, code: "email_taken" });
  const pin = pinErzeugen();
  await W(kv, verifyKey(code, role), {
    hash,
    pinHash: await pinDigest(code, role, pin),
    expiresAt: now() + VERIFY_MS,
    versuche: 0,
  });
  return { pin, email: clean };
}

/** Schritt 2: PIN prüfen. Erfolg verankert die Adresse als verifiziert und
 *  räumt eine ggf. vorher verifizierte Adresse auf. Fehlversuche zählen;
 *  nach VERIFY_MAX_VERSUCHE oder Ablauf muss ein neuer Code angefordert werden.
 *
 *  S46 (D6.1a): Der Client reicht die Adresse im Klartext mit; ihr Hash muss
 *  exakt zur offenen Bestätigung passen (verhindert Unterschieben einer anderen
 *  Adresse als der, an die der Code ging). Bei Erfolg wird der Klartext
 *  kontogebunden verschlüsselt (AES-GCM, AAD code:role) im emailfor-Eintrag
 *  abgelegt — der einzige Moment, in dem er serverseitig legitim vorliegt.
 *  `emailKey` ist der importierte EMAIL_KEY (Konfigurationspflicht im Worker). */
export async function confirmRecoveryEmail(kv, { code, role }, { pin, email, emailKey }, now = Date.now) {
  const v = await J(kv, verifyKey(code, role));
  if (!v) throw Object.assign(new Error("Es liegt keine offene Bestätigung vor."), { status: 400, code: "pin_none" });
  if (now() > v.expiresAt) {
    await kv.delete(verifyKey(code, role));
    throw Object.assign(new Error("Der Code ist abgelaufen."), { status: 410, code: "pin_expired" });
  }
  const clean = normMail(email);
  if ((await sha256Hex(clean)) !== v.hash)
    throw Object.assign(new Error("Die Adresse passt nicht zur offenen Bestätigung."), { status: 400, code: "email_mismatch" });
  if (v.pinHash !== (await pinDigest(code, role, pin))) {
    v.versuche = (v.versuche || 0) + 1;
    if (v.versuche >= VERIFY_MAX_VERSUCHE) {
      await kv.delete(verifyKey(code, role));
      throw Object.assign(new Error("Zu viele Fehlversuche."), { status: 429, code: "pin_tries" });
    }
    await W(kv, verifyKey(code, role), v);
    throw Object.assign(new Error("Der Code stimmt nicht."), { status: 400, code: "pin_wrong" });
  }
  const enc = await verschluessele(emailKey, clean, emailAad(code, role));
  const vorher = await J(kv, emailForKey(code, role));
  if (vorher && vorher.hash && vorher.hash !== v.hash) await kv.delete(emailLookupKey(vorher.hash));
  await W(kv, emailLookupKey(v.hash), { code, role });
  await W(kv, emailForKey(code, role), { hash: v.hash, at: now(), verified: true, enc });
  await kv.delete(verifyKey(code, role));
  return { ok: true };
}

/** Nur eine BESTÄTIGTE Adresse zählt als hinterlegt (S45). */
export async function hasRecoveryEmail(kv, code, role) {
  const e = await J(kv, emailForKey(code, role));
  return !!(e && e.verified);
}

/** Adresse → {code, role} | null. Kein Fund heißt: still verwerfen (keine Enumeration). */
export async function lookupRecovery(kv, email) {
  const clean = normMail(email);
  if (!clean) return null;
  return J(kv, emailLookupKey(await sha256Hex(clean)));
}

export async function enroll(kv, token, now = Date.now) {
  const m = await J(kv, "sys/magic/" + token);
  if (!m) throw Object.assign(new Error("Dieser Zugangslink ist unbekannt."), { status: 404, code: "link_unknown" });
  if (m.used) throw Object.assign(new Error("Dieser Zugangslink wurde bereits verwendet."), { status: 410, code: "link_used" });
  if (now() > m.expiresAt) throw Object.assign(new Error("Dieser Zugangslink ist abgelaufen."), { status: 410, code: "link_expired" });
  m.used = true;
  await W(kv, "sys/magic/" + token, m);                 // Konsum VOR Ausgabe
  const cred = randomToken(24);
  await W(kv, "sys/cred/" + (await sha256Hex(cred)), { code: m.code, role: m.role });
  const session = await createSession(kv, m.code, m.role, now);
  const couple = await J(kv, "sys/couple/" + m.code);
  return { cred, session, role: m.role, code: m.code, name: m.role === "A" ? couple.nameA : couple.nameB };
}

export async function loginWithCred(kv, cred, now = Date.now) {
  const c = cred ? await J(kv, "sys/cred/" + (await sha256Hex(cred))) : null;
  if (!c) throw Object.assign(new Error("Kein gültiger Zugang."), { status: 401, code: "no_session" });
  return createSession(kv, c.code, c.role, now);
}

export async function createSession(kv, code, role, now = Date.now) {
  const sid = randomToken(16);
  await W(kv, "sys/session/" + sid, { code, role, expiresAt: now() + SESSION_MS });
  return sid;
}

/** Prüft die Session und verlängert sie (touch-to-extend). null = ungültig. */
export async function requireSession(kv, sid, now = Date.now) {
  if (!sid) return null;
  const s = await J(kv, "sys/session/" + sid);
  if (!s || now() > s.expiresAt) return null;
  s.expiresAt = now() + SESSION_MS;                     // touch
  await W(kv, "sys/session/" + sid, s);
  return { code: s.code, role: s.role };
}
