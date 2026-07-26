// Krypto- und Cookie-Helfer des Workers (WebCrypto, kein Node-Import).

export function randomToken(bytes = 16) {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return [...a].map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function sha256Hex(s) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

export function parseCookies(request) {
  const h = request.headers.get("Cookie") || "";
  const out = {};
  for (const part of h.split(/;\s*/)) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i)] = decodeURIComponent(part.slice(i + 1));
  }
  return out;
}

// sameSite: Default Lax (Web, same-origin). Die native Hülle (M5) spricht die
// API cross-origin — NUR dort setzt index.js "None" (Secure ist ohnehin immer an).
export function cookieHeader(name, value, { maxAge, sameSite = "Lax" } = {}) {
  let c = `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=${sameSite}; Secure`;
  if (maxAge !== undefined) c += `; Max-Age=${maxAge}`;
  return c;
}

/* ---- R2 · KV-Helfer -------------------------------------------------------
 *  Drei Muster wiederholten sich quer durch index.js und tokenstat.js:
 *  JSON aus KV lesen, ein Paar nachschlagen, einen Audit-Eintrag schreiben.
 *  Wichtiger als die Entdopplung ist die Fehlertoleranz an einer Stelle:
 *  `JSON.parse(await kv.get(k))` wirft bei fehlendem Schluessel (null) und bei
 *  beschaedigtem Inhalt \u2014 in den Listen-Schleifen riss das die GANZE Antwort
 *  mit (500 statt eines fehlenden Eintrags). ---------------------------------*/

/** JSON aus KV lesen. Fehlender Schluessel ODER unlesbarer Inhalt -> null. */
export async function leseJson(kv, key) {
  const roh = await kv.get(key);
  if (roh === null || roh === undefined) return null;
  try { return JSON.parse(roh); } catch { return null; }
}

/** Paar-Datensatz zum Code; unbekannt -> null. */
export function holePaar(kv, code) {
  return leseJson(kv, "sys/couple/" + code);
}

/** Audit-Eintrag anlegen (Zeitstempel + Zufallssuffix als Schluessel). */
export function schreibeAudit(kv, now, typ, daten = {}) {
  const at = now();
  return kv.put("sys/audit/" + at + "-" + randomToken(4), JSON.stringify({ typ, ...daten, at }));
}
