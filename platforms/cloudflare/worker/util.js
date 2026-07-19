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
