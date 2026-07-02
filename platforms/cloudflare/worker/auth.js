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

export async function createCouple(kv, { nameA, nameB }, now = Date.now) {
  if (!nameA || !nameB) throw Object.assign(new Error("nameA und nameB sind Pflicht"), { status: 400 });
  const code = randomToken(6);
  await W(kv, "sys/couple/" + code, { code, nameA, nameB, createdAt: now() });
  const links = {};
  for (const role of ["A", "B"]) links[role] = await mintMagic(kv, code, role, now);
  return { code, links };   // Übergabe-Variante: Initiator erhält beide Links
}

/* ---- Wiedereinstieg per E-Mail (nur E-Mail, kein Passwort — bewusste Entscheidung).
 *  Modell: sys/email/<sha256(mail)> → {code, role}   (Lookup, eine Adresse ⇒ ein Konto)
 *          sys/emailfor/<code>/<role> → {hash, at}    (Status + Ersetzen/Aufräumen)
 *  Es wird NUR der Hash gespeichert, nie die Klartext-Adresse. Beim Wiedereinstieg
 *  tippt die Person ihre Adresse selbst; passt der Hash, geht der Link an genau diese. */
const emailKey = h => "sys/email/" + h;
const emailForKey = (code, role) => "sys/emailfor/" + code + "/" + role;
const normMail = e => String(e || "").trim().toLowerCase();
const istMail = e => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);

export async function setRecoveryEmail(kv, { code, role }, email, now = Date.now) {
  const clean = normMail(email);
  if (!istMail(clean)) throw Object.assign(new Error("Bitte eine gültige E-Mail-Adresse angeben."), { status: 400 });
  const hash = await sha256Hex(clean);
  const belegt = await J(kv, emailKey(hash));
  if (belegt && (belegt.code !== code || belegt.role !== role))
    throw Object.assign(new Error("Diese Adresse ist bereits hinterlegt."), { status: 409 });
  const vorher = await J(kv, emailForKey(code, role));
  if (vorher && vorher.hash && vorher.hash !== hash) await kv.delete(emailKey(vorher.hash));
  await W(kv, emailKey(hash), { code, role });
  await W(kv, emailForKey(code, role), { hash, at: now() });
  return { ok: true };
}

export async function hasRecoveryEmail(kv, code, role) {
  return !!(await J(kv, emailForKey(code, role)));
}

/** Adresse → {code, role} | null. Kein Fund heißt: still verwerfen (keine Enumeration). */
export async function lookupRecovery(kv, email) {
  const clean = normMail(email);
  if (!clean) return null;
  return J(kv, emailKey(await sha256Hex(clean)));
}

export async function enroll(kv, token, now = Date.now) {
  const m = await J(kv, "sys/magic/" + token);
  if (!m) throw Object.assign(new Error("Dieser Zugangslink ist unbekannt."), { status: 404 });
  if (m.used) throw Object.assign(new Error("Dieser Zugangslink wurde bereits verwendet."), { status: 410 });
  if (now() > m.expiresAt) throw Object.assign(new Error("Dieser Zugangslink ist abgelaufen."), { status: 410 });
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
  if (!c) throw Object.assign(new Error("Kein gültiger Zugang."), { status: 401 });
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
