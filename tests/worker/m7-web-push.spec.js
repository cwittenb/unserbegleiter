// Sprint M7a (Worker) — gegen den echten Worker (Miniflare): fail-closed ohne
// VAPID, Abo-Verwaltung (Session-pflichtig, je Rolle), und der Kern: eine
// Freigabe von A löst GENAU EINEN inhaltsfreien Push an B aus — die Tests
// entschlüsseln die abgefangene Nachricht und beweisen, dass der
// Freigabe-Inhalt NICHT darin vorkommt. Erloschene Abos (410) werden entfernt.

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Miniflare } from "miniflare";
import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bytesZuB64u, b64uZuBytes } from "../../platforms/cloudflare/worker/web-push.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ADMIN = "test-admin-geheim";
const enc = new TextEncoder();
const dec = new TextDecoder();

let script, mfOhne, mf, vapid;
let gesendet = [];            // abgefangene Push-Zustellungen
let antwortStatus = 201;      // programmierbarer Status des Fake-Push-Dienstes

function client(mfInstanz) {
  const jar = {};
  return {
    async call(method, pfad, body, extraHeaders) {
      const headers = { "content-type": "application/json", ...(extraHeaders || {}) };
      const cookies = Object.entries(jar).map(([k, v]) => k + "=" + v).join("; ");
      if (cookies) headers["Cookie"] = cookies;
      const res = await mfInstanz.dispatchFetch("http://pb.test" + pfad, {
        method, headers,
        body: body === undefined || method === "GET" ? undefined : JSON.stringify(body),
      });
      for (const sc of res.headers.getSetCookie?.() || []) {
        const m = /^([^=]+)=([^;]+)/.exec(sc);
        if (m) jar[m[1]] = m[2];
      }
      let data = null;
      try { data = await res.json(); } catch { /* leer */ }
      return { status: res.status, data };
    },
  };
}

async function frischesPaar() {
  const init = client(mf);
  const { data } = await init.call("POST", "/api/paar", { nameA: "Anna", nameB: "Bernd" }, { "x-admin-token": ADMIN });
  const anna = client(mf), bernd = client(mf);
  await anna.call("POST", "/api/enroll", { token: data.links.A });
  await bernd.call("POST", "/api/enroll", { token: data.links.B });
  return { anna, bernd };
}

/** Browser-Seite eines Abos nachbilden: ECDH-Paar + Auth-Secret. */
async function neuesAbo(endpoint) {
  const paar = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const auth = crypto.getRandomValues(new Uint8Array(16));
  return {
    paar, auth,
    subscription: {
      endpoint,
      keys: { p256dh: bytesZuB64u(new Uint8Array(await crypto.subtle.exportKey("raw", paar.publicKey))), auth: bytesZuB64u(auth) },
    },
  };
}

function verkette(...teile) {
  const out = new Uint8Array(teile.reduce((n, t) => n + t.length, 0));
  let o = 0; for (const t of teile) { out.set(t, o); o += t.length; }
  return out;
}
async function hkdf(ikm, salt, info, laenge) {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, key, laenge * 8));
}
async function entschluessele(abo, body) {
  const salt = body.slice(0, 16), asPub = body.slice(21, 86), chiffre = body.slice(86);
  const asKey = await crypto.subtle.importKey("raw", asPub, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: asKey }, abo.paar.privateKey, 256));
  const keyInfo = verkette(enc.encode("WebPush: info"), new Uint8Array([0]), b64uZuBytes(abo.subscription.keys.p256dh), asPub);
  const ikm = await hkdf(ecdh, abo.auth, keyInfo, 32);
  const cek = await hkdf(ikm, salt, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(ikm, salt, enc.encode("Content-Encoding: nonce\0"), 12);
  const aes = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["decrypt"]);
  const roh = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce }, aes, chiffre));
  return JSON.parse(dec.decode(roh.slice(0, -1)));
}

beforeAll(async () => {
  const bundled = await build({
    entryPoints: [path.join(ROOT, "platforms/cloudflare/worker/index.js")],
    bundle: true, format: "esm", external: ["cloudflare:sockets"], write: false, target: "es2022",
  });
  script = bundled.outputFiles[0].text;
  const schluessel = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  vapid = {
    VAPID_PUBLIC_KEY: bytesZuB64u(new Uint8Array(await crypto.subtle.exportKey("raw", schluessel.publicKey))),
    VAPID_PRIVATE_KEY: (await crypto.subtle.exportKey("jwk", schluessel.privateKey)).d,
    VAPID_SUBJECT: "mailto:kontakt@raumzuzweit.de",
  };
  const basis = { modules: true, kvNamespaces: ["PAARE"], compatibilityDate: "2026-06-01", script };
  mfOhne = new Miniflare({ ...basis, bindings: { ADMIN_TOKEN: ADMIN } });
  mf = new Miniflare({
    ...basis,
    bindings: { ADMIN_TOKEN: ADMIN, ...vapid },
    outboundService: async (request) => {
      gesendet.push({
        url: request.url,
        headers: Object.fromEntries(request.headers.entries()),
        body: new Uint8Array(await request.arrayBuffer()),
      });
      return new Response(null, { status: antwortStatus });
    },
  });
}, 60000);

afterAll(async () => { for (const m of [mfOhne, mf]) if (m) await m.dispose(); });
beforeEach(() => { gesendet = []; antwortStatus = 201; });

describe("M7 · fail-closed ohne VAPID-Konfiguration", () => {
  it("/api/push/key antwortet 503 mit klarer Ansage", async () => {
    const r = await mfOhne.dispatchFetch("http://pb.test/api/push/key");
    expect(r.status).toBe(503);
    expect((await r.json()).code).toBe("config_missing");
  });
});

describe("M7 · Abo-Verwaltung", () => {
  it("Key-Endpunkt liefert den öffentlichen Schlüssel; Abonnieren ist Session-pflichtig", async () => {
    const r = await mf.dispatchFetch("http://pb.test/api/push/key");
    expect((await r.json()).key).toBe(vapid.VAPID_PUBLIC_KEY);
    const ohneSession = await mf.dispatchFetch("http://pb.test/api/push/subscribe", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ subscription: (await neuesAbo("https://push.test/x")).subscription }),
    });
    expect(ohneSession.status).toBe(401);
  });

  it("NEGATIV: unbrauchbare Subscriptions werden abgewiesen", async () => {
    const { anna } = await frischesPaar();
    for (const kaputt of [
      null,
      { endpoint: "http://unsicher.test/x", keys: { p256dh: "a", auth: "b" } },
      { endpoint: "https://push.test/x", keys: { p256dh: "a" } },
    ]) {
      const r = await anna.call("POST", "/api/push/subscribe", { subscription: kaputt });
      expect(r.status, JSON.stringify(kaputt)).toBe(400);
    }
  });
});

describe("M7 · Freigabe-Hinweis", () => {
  it("A gibt frei → GENAU EIN inhaltsfreier, entschlüsselbarer Push an Bs Abo", async () => {
    const { anna, bernd } = await frischesPaar();
    const abo = await neuesAbo("https://push.test/bernd-geraet");
    await bernd.call("POST", "/api/push/subscribe", { subscription: abo.subscription });

    const GEHEIM = "sehr privater Freigabe-Text";
    const r = await anna.call("POST", "/api/handover", {
      module: "kernwetten", name: "Anna", items: [{ id: "CS1", text: GEHEIM }],
    });
    expect(r.status).toBe(200);

    expect(gesendet).toHaveLength(1);
    const p = gesendet[0];
    expect(p.url).toBe("https://push.test/bernd-geraet");
    expect(p.headers["authorization"]).toMatch(/^vapid t=.+, k=/);
    expect(p.headers["content-encoding"]).toBe("aes128gcm");
    expect(p.headers["ttl"]).toBe("86400");

    const nutzlast = await entschluessele(abo, p.body);
    expect(nutzlast).toEqual({ titel: "raumzuzweit", text: "Es gibt Neues in eurem gemeinsamen Raum.", url: "/" });
    expect(JSON.stringify(nutzlast)).not.toContain(GEHEIM);   // Inhaltsfreiheit, wörtlich
  });

  it("kein Abo → kein Versand; Abmelden wirkt", async () => {
    const { anna, bernd } = await frischesPaar();
    const abo = await neuesAbo("https://push.test/kurz");
    await bernd.call("POST", "/api/push/subscribe", { subscription: abo.subscription });
    await bernd.call("DELETE", "/api/push/subscribe", { endpoint: abo.subscription.endpoint });
    await anna.call("POST", "/api/handover", { module: "kernwetten", name: "Anna", items: [{ id: "CS1", text: "x" }] });
    expect(gesendet).toHaveLength(0);
  });

  it("erloschene Abos (410) werden nach dem ersten Versuch entfernt", async () => {
    const { anna, bernd } = await frischesPaar();
    const abo = await neuesAbo("https://push.test/erloschen");
    await bernd.call("POST", "/api/push/subscribe", { subscription: abo.subscription });
    antwortStatus = 410;
    await anna.call("POST", "/api/handover", { module: "kernwetten", name: "Anna", items: [{ id: "CS1", text: "a" }] });
    expect(gesendet).toHaveLength(1);
    gesendet = []; antwortStatus = 201;
    await anna.call("POST", "/api/handover", { module: "kernwetten", name: "Anna", items: [{ id: "CS1", text: "b" }] });
    expect(gesendet).toHaveLength(0);   // Abo wurde aufgeräumt
  });
});
