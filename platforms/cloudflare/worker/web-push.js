// Web Push (M7a) — Verschlüsselung nach RFC 8291 (aes128gcm, RFC 8188) und
// VAPID nach RFC 8292, ausschließlich mit WebCrypto — keine neue Abhängigkeit.
//
// Datenschutz-Grundsatz: Die Nutzlast ist IMMER inhaltsfrei — ein generischer,
// lokalisierter Hinweis ("Es gibt Neues …"), niemals Gesprächs- oder
// Freigabe-Inhalte. Push-Nachrichten laufen über Apple-/Google-/Mozilla-Server;
// was dort nicht ankommt, kann dort nicht liegen bleiben.
//
// Testbarkeit: Ephemer-Schlüssel und Salt sind injizierbar; die Tests
// entschlüsseln unabhängig nach den RFC-Formeln (Kreuzprobe).

const enc = new TextEncoder();

/* ---------- base64url ---------- */
export function b64uZuBytes(s) {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4);
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}
export function bytesZuB64u(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function verkette(...teile) {
  const laenge = teile.reduce((n, t) => n + t.length, 0);
  const out = new Uint8Array(laenge);
  let o = 0;
  for (const t of teile) { out.set(t, o); o += t.length; }
  return out;
}

/* ---------- HKDF (WebCrypto) ---------- */
async function hkdf(ikm, salt, info, laenge) {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, key, laenge * 8);
  return new Uint8Array(bits);
}

/* ---------- RFC 8291: Nutzlast verschlüsseln ---------- */
/** subscription: { endpoint, keys: { p256dh, auth } } (Browser-Format).
 *  klartext: Uint8Array. optionen.asKeyPair / optionen.salt nur für Tests. */
export async function verschluesselePush(subscription, klartext, optionen = {}) {
  const uaPub = b64uZuBytes(subscription.keys.p256dh);        // 65 Byte, unkomprimiert
  const authSecret = b64uZuBytes(subscription.keys.auth);     // 16 Byte
  if (uaPub.length !== 65 || uaPub[0] !== 4) throw new Error("p256dh: kein unkomprimierter P-256-Punkt");
  if (authSecret.length !== 16) throw new Error("auth: erwartet 16 Byte");

  const asKeyPair = optionen.asKeyPair ||
    await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPub = new Uint8Array(await crypto.subtle.exportKey("raw", asKeyPair.publicKey));
  const salt = optionen.salt || crypto.getRandomValues(new Uint8Array(16));

  const uaKey = await crypto.subtle.importKey("raw", uaPub, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, asKeyPair.privateKey, 256));

  // IKM = HKDF(salt=auth, ecdh, "WebPush: info" || 0x00 || ua_pub || as_pub, 32)
  const keyInfo = verkette(enc.encode("WebPush: info"), new Uint8Array([0]), uaPub, asPub);
  const ikm = await hkdf(ecdh, authSecret, keyInfo, 32);
  const cek = await hkdf(ikm, salt, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(ikm, salt, enc.encode("Content-Encoding: nonce\0"), 12);

  // Ein einziger, letzter Record: Klartext || 0x02 (RFC 8188 §2, letzter Record)
  const aesKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const chiffre = new Uint8Array(await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce }, aesKey, verkette(klartext, new Uint8Array([2]))));

  // Header: salt(16) || rs(4, BE) || idlen(1) || keyid(as_pub, 65)
  const kopf = new Uint8Array(16 + 4 + 1 + 65);
  kopf.set(salt, 0);
  new DataView(kopf.buffer).setUint32(16, 4096);
  kopf[20] = 65;
  kopf.set(asPub, 21);
  return { body: verkette(kopf, chiffre), asPub, salt };
}

/* ---------- RFC 8292: VAPID ---------- */
/** JWK des VAPID-Schlüsselpaars aus den Secret-Formaten (b64url):
 *  öffentlich = 65-Byte-Punkt, privat = 32-Byte-Skalar d. */
function vapidJwk(pubB64u, privB64u) {
  const pub = b64uZuBytes(pubB64u);
  if (pub.length !== 65 || pub[0] !== 4) throw new Error("VAPID_PUBLIC_KEY: kein unkomprimierter P-256-Punkt");
  return {
    kty: "EC", crv: "P-256",
    x: bytesZuB64u(pub.slice(1, 33)),
    y: bytesZuB64u(pub.slice(33, 65)),
    d: privB64u,
  };
}

export async function vapidAuthorization(endpunkt, { subject, publicKey, privateKey }) {
  const aud = new URL(endpunkt).origin;
  const kopf = bytesZuB64u(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = bytesZuB64u(enc.encode(JSON.stringify({
    aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject,
  })));
  const key = await crypto.subtle.importKey("jwk", vapidJwk(publicKey, privateKey),
    { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const signatur = new Uint8Array(await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" }, key, enc.encode(kopf + "." + claims)));
  return `vapid t=${kopf}.${claims}.${bytesZuB64u(signatur)}, k=${publicKey}`;
}

/* ---------- Konfiguration & Versand ---------- */
/** VAPID-Konfiguration aus env — oder null (Feature aus; Endpunkte antworten
 *  dann fail-closed, der Freigabe-Trigger tut nichts). */
export function vapidKonfig(env) {
  const { VAPID_PUBLIC_KEY: publicKey, VAPID_PRIVATE_KEY: privateKey, VAPID_SUBJECT: subject } = env;
  if (!publicKey || !privateKey || !subject) return null;
  return { publicKey: String(publicKey).trim(), privateKey: String(privateKey).trim(), subject: String(subject).trim() };
}

/** Eine Push-Nachricht senden. Liefert den HTTP-Status des Push-Dienstes;
 *  Netzfehler werden als 0 gemeldet (Aufrufer entscheidet über Aufräumen). */
export async function sendePush(subscription, nutzlastObjekt, vapid, fetchFn = fetch) {
  const { body } = await verschluesselePush(subscription, enc.encode(JSON.stringify(nutzlastObjekt)));
  try {
    const r = await fetchFn(subscription.endpoint, {
      method: "POST",
      headers: {
        "Authorization": await vapidAuthorization(subscription.endpoint, vapid),
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        "TTL": "86400",
        "Urgency": "normal",
      },
      body,
    });
    return r.status;
  } catch {
    return 0;
  }
}
