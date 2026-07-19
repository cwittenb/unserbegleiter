// Sprint M7a (Unit) — Web-Push-Krypto als Kreuzprobe: die Tests entschlüsseln
// UNABHÄNGIG nach den RFC-8291/8188-Formeln, was das Modul verschlüsselt hat
// (injizierte Ephemer-Schlüssel + Salt). Dazu VAPID-Signaturprüfung mit dem
// öffentlichen Schlüssel und die reine Client-Logik.

import { describe, it, expect, beforeAll } from "vitest";
import { b64uZuBytes, bytesZuB64u, verschluesselePush, vapidAuthorization, vapidKonfig }
  from "../../platforms/cloudflare/worker/web-push.js";
import { schluesselZuBytes, istPushMoeglich } from "../../platforms/cloudflare/pages/push.js";

const enc = new TextEncoder();
const dec = new TextDecoder();

function verkette(...teile) {
  const out = new Uint8Array(teile.reduce((n, t) => n + t.length, 0));
  let o = 0; for (const t of teile) { out.set(t, o); o += t.length; }
  return out;
}
async function hkdf(ikm, salt, info, laenge) {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, key, laenge * 8));
}

describe("M7 · base64url", () => {
  it("Hin- und Rückweg sind verlustfrei (beide Implementierungen)", () => {
    const bytes = Uint8Array.from({ length: 65 }, (_, i) => (i * 7 + 3) % 256);
    expect(b64uZuBytes(bytesZuB64u(bytes))).toEqual(bytes);
    expect(schluesselZuBytes(bytesZuB64u(bytes))).toEqual(bytes);
    expect(bytesZuB64u(new Uint8Array([251, 255]))).not.toContain("+");
  });
});

describe("M7 · RFC-8291-Verschlüsselung (Kreuzprobe durch unabhängige Entschlüsselung)", () => {
  let uaPaar, abo, authSecret;
  beforeAll(async () => {
    uaPaar = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
    authSecret = crypto.getRandomValues(new Uint8Array(16));
    abo = {
      endpoint: "https://push.test/abc",
      keys: {
        p256dh: bytesZuB64u(new Uint8Array(await crypto.subtle.exportKey("raw", uaPaar.publicKey))),
        auth: bytesZuB64u(authSecret),
      },
    };
  });

  it("Header trägt Salt, rs=4096, idlen=65 und den Ephemer-Schlüssel", async () => {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const { body, asPub } = await verschluesselePush(abo, enc.encode("x"), { salt });
    expect(body.slice(0, 16)).toEqual(salt);
    expect(new DataView(body.buffer, body.byteOffset).getUint32(16)).toBe(4096);
    expect(body[20]).toBe(65);
    expect(body.slice(21, 86)).toEqual(asPub);
  });

  it("die unabhängige RFC-Entschlüsselung liefert exakt den Klartext + 0x02-Delimiter", async () => {
    const klartext = enc.encode("Es gibt Neues in eurem gemeinsamen Raum.");
    const { body } = await verschluesselePush(abo, klartext);
    // — ab hier: Empfängerseite streng nach RFC, ohne Modul-Code —
    const salt = body.slice(0, 16);
    const asPub = body.slice(21, 86);
    const chiffre = body.slice(86);
    const asKey = await crypto.subtle.importKey("raw", asPub, { name: "ECDH", namedCurve: "P-256" }, false, []);
    const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: asKey }, uaPaar.privateKey, 256));
    const uaPub = b64uZuBytes(abo.keys.p256dh);
    const keyInfo = verkette(enc.encode("WebPush: info"), new Uint8Array([0]), uaPub, asPub);
    const ikm = await hkdf(ecdh, authSecret, keyInfo, 32);
    const cek = await hkdf(ikm, salt, enc.encode("Content-Encoding: aes128gcm\0"), 16);
    const nonce = await hkdf(ikm, salt, enc.encode("Content-Encoding: nonce\0"), 12);
    const aes = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["decrypt"]);
    const roh = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce }, aes, chiffre));
    expect(roh[roh.length - 1]).toBe(2);
    expect(dec.decode(roh.slice(0, -1))).toBe(dec.decode(klartext));
  });

  it("NEGATIV: kaputte Abo-Schlüssel werden abgewiesen", async () => {
    await expect(verschluesselePush({ endpoint: "https://x", keys: { p256dh: bytesZuB64u(new Uint8Array(10)), auth: abo.keys.auth } }, enc.encode("x")))
      .rejects.toThrow(/p256dh/);
    await expect(verschluesselePush({ endpoint: "https://x", keys: { p256dh: abo.keys.p256dh, auth: bytesZuB64u(new Uint8Array(3)) } }, enc.encode("x")))
      .rejects.toThrow(/auth/);
  });
});

describe("M7 · VAPID", () => {
  it("Authorization ist ein gültig signiertes ES256-JWT mit aud/sub/exp", async () => {
    const paar = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
    const pub = new Uint8Array(await crypto.subtle.exportKey("raw", paar.publicKey));
    const jwkPriv = await crypto.subtle.exportKey("jwk", paar.privateKey);
    const vapid = { subject: "mailto:kontakt@raumzuzweit.de", publicKey: bytesZuB64u(pub), privateKey: jwkPriv.d };
    const auth = await vapidAuthorization("https://push.example/senden/123", vapid);
    const m = /^vapid t=([^,]+), k=(.+)$/.exec(auth);
    expect(m[2]).toBe(vapid.publicKey);
    const [kopf, claims, sig] = m[1].split(".");
    const geprueft = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" }, paar.publicKey, b64uZuBytes(sig), enc.encode(kopf + "." + claims));
    expect(geprueft).toBe(true);
    const nutz = JSON.parse(dec.decode(b64uZuBytes(claims)));
    expect(nutz.aud).toBe("https://push.example");
    expect(nutz.sub).toBe(vapid.subject);
    expect(nutz.exp).toBeGreaterThan(Date.now() / 1000);
  });

  it("vapidKonfig: nur vollständige Konfiguration schaltet das Feature frei", () => {
    expect(vapidKonfig({})).toBeNull();
    expect(vapidKonfig({ VAPID_PUBLIC_KEY: "x", VAPID_PRIVATE_KEY: "y" })).toBeNull();
    const voll = vapidKonfig({ VAPID_PUBLIC_KEY: " x ", VAPID_PRIVATE_KEY: "y", VAPID_SUBJECT: "mailto:a@b" });
    expect(voll).toEqual({ publicKey: "x", privateKey: "y", subject: "mailto:a@b" });
  });
});

describe("M7 · Client-Fähigkeitsprüfung (rein)", () => {
  const faehig = { navigator: { serviceWorker: {} }, PushManager: function () {}, Notification: function () {} };

  it("möglich nur mit SW + PushManager + Notification — und NIE in der nativen Hülle", () => {
    expect(istPushMoeglich(faehig)).toBe(true);
    expect(istPushMoeglich({ navigator: {} })).toBe(false);
    expect(istPushMoeglich({ navigator: { serviceWorker: {} }, PushManager: function () {} })).toBe(false);
    globalThis.RZZ_API_BASIS = "https://raumzuzweit.de";
    try { expect(istPushMoeglich(faehig)).toBe(false); }
    finally { delete globalThis.RZZ_API_BASIS; }
  });
});
