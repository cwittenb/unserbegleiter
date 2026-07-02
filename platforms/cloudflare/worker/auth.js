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

const J = (kv, k) => kv.get(k).then(v => (v === null ? null : JSON.parse(v)));
const W = (kv, k, v) => kv.put(k, JSON.stringify(v));

export async function createCouple(kv, { nameA, nameB }, now = Date.now) {
  if (!nameA || !nameB) throw Object.assign(new Error("nameA und nameB sind Pflicht"), { status: 400 });
  const code = randomToken(6);
  await W(kv, "sys/couple/" + code, { code, nameA, nameB, createdAt: now() });
  const links = {};
  for (const role of ["A", "B"]) {
    const token = randomToken(16);
    await W(kv, "sys/magic/" + token, { code, role, expiresAt: now() + MAGIC_MS, used: false });
    links[role] = token;
  }
  return { code, links };   // Übergabe-Variante: Initiator erhält beide Links
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
