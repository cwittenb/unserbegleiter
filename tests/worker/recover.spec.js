// Wiedereinstieg per E-Mail — gegen den echten Worker. Der Versand läuft über
// ein Fake-MAIL_UPSTREAM-Service-Binding (die reale SMTP-Übertragung ist
// deploy-verifiziert, hier nicht nötig). Enthält den Mehrgeräte-Beweis.

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Miniflare } from "miniflare";
import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ADMIN = "test-admin-geheim";
let mf, script, mails = [];

function client() {
  const jar = {};
  return {
    async call(method, pfad, body, extraHeaders) {
      const headers = { "content-type": "application/json", ...(extraHeaders || {}) };
      const cookies = Object.entries(jar).map(([k, v]) => k + "=" + v).join("; ");
      if (cookies) headers["Cookie"] = cookies;
      const res = await mf.dispatchFetch("http://pb.test" + pfad, {
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
  const init = client();
  const { data } = await init.call("POST", "/api/paar", { nameA: "Anna", nameB: "Bernd" }, { "x-admin-token": ADMIN });
  const anna = client(), bernd = client();
  await anna.call("POST", "/api/enroll", { token: data.links.A });
  await bernd.call("POST", "/api/enroll", { token: data.links.B });
  return { anna, bernd, code: data.code };
}

function linkAus(text) {
  const m = /#t=([A-Za-z0-9]+)/.exec(text || "");
  return m ? m[1] : null;
}

beforeAll(async () => {
  const bundled = await build({
    entryPoints: [path.join(ROOT, "platforms/cloudflare/worker/index.js")],
    bundle: true, format: "esm", external: ["cloudflare:sockets"], write: false, target: "es2022",
  });
  script = bundled.outputFiles[0].text;
  mf = new Miniflare({
    modules: true, script, kvNamespaces: ["PAARE"], compatibilityDate: "2026-06-01",
    bindings: { ADMIN_TOKEN: ADMIN, RECOVER_RATE: "100" },
    serviceBindings: {
      async MAIL_UPSTREAM(request) { mails.push(await request.json()); return new Response("ok"); },
    },
  });
});
afterAll(async () => { if (mf) await mf.dispose(); });
beforeEach(() => { mails = []; });

describe("Wiedereinstieg · Adresse hinterlegen", () => {
  it("Adresse setzen spiegelt sich in /api/me; Rohadresse wird nicht ausgegeben", async () => {
    const { anna } = await frischesPaar();
    expect((await anna.call("GET", "/api/me")).data.recoveryEmail).toBe(false);
    expect((await anna.call("POST", "/api/email", { email: "Anna@Beispiel.de" })).status).toBe(200);
    const me = (await anna.call("GET", "/api/me")).data;
    expect(me.recoveryEmail).toBe(true);
    expect(JSON.stringify(me)).not.toContain("beispiel.de");     // nur Status, nie die Adresse
  });

  it("ungültige Adresse → 400", async () => {
    const { anna } = await frischesPaar();
    expect((await anna.call("POST", "/api/email", { email: "kein-at-zeichen" })).status).toBe(400);
  });

  it("Kollision: dieselbe Adresse für das andere Konto → 409", async () => {
    const { anna, bernd } = await frischesPaar();
    await anna.call("POST", "/api/email", { email: "geteilt@example.com" });
    expect((await bernd.call("POST", "/api/email", { email: "geteilt@example.com" })).status).toBe(409);
    // dieselbe Person darf ihre eigene Adresse erneut setzen (idempotent)
    expect((await anna.call("POST", "/api/email", { email: "geteilt@example.com" })).status).toBe(200);
  });
});

describe("Wiedereinstieg · Link anfordern", () => {
  it("registrierte Adresse → Mail mit frischem Einmal-Link; Antwort verrät nichts über Existenz", async () => {
    const { anna } = await frischesPaar();
    await anna.call("POST", "/api/email", { email: "anna@example.com" });
    const r = await client().call("POST", "/api/recover", { email: "anna@example.com" });
    expect(r.status).toBe(200);
    expect(r.data).toEqual({ ok: true });
    expect(mails).toHaveLength(1);
    expect(mails[0].to).toBe("anna@example.com");
    expect(linkAus(mails[0].text)).toBeTruthy();
  });

  it("UNregistrierte Adresse → weiterhin 200 {ok:true}, aber KEINE Mail (keine Enumeration)", async () => {
    await frischesPaar();
    const r = await client().call("POST", "/api/recover", { email: "fremde@example.com" });
    expect(r.status).toBe(200);
    expect(r.data).toEqual({ ok: true });
    expect(mails).toHaveLength(0);
  });

  it("Adresse ersetzen: alte Adresse führt zu keiner Mail mehr, neue schon", async () => {
    const { anna } = await frischesPaar();
    await anna.call("POST", "/api/email", { email: "alt@example.com" });
    await anna.call("POST", "/api/email", { email: "neu@example.com" });
    await client().call("POST", "/api/recover", { email: "alt@example.com" });
    expect(mails).toHaveLength(0);                                // alter Hash entfernt
    await client().call("POST", "/api/recover", { email: "neu@example.com" });
    expect(mails).toHaveLength(1);
    expect(mails[0].to).toBe("neu@example.com");
  });

  it("MEHRGERÄTE: der Wiedereinstiegs-Link meldet ein ZWEITES Gerät an, ohne das erste auszuloggen", async () => {
    const { anna } = await frischesPaar();
    await anna.call("POST", "/api/email", { email: "anna@example.com" });
    await client().call("POST", "/api/recover", { email: "anna@example.com" });
    const token = linkAus(mails[0].text);

    const zweitgeraet = client();
    const e = await zweitgeraet.call("POST", "/api/enroll", { token });
    expect(e.status).toBe(200);
    expect(e.data.role).toBe("A");
    // Zweitgerät hat eigene Session:
    expect((await zweitgeraet.call("GET", "/api/me")).data.role).toBe("A");
    // Erstgerät läuft unverändert weiter (Sessions sind per sid geschlüsselt):
    expect((await anna.call("GET", "/api/me")).status).toBe(200);
    // Der Wiedereinstiegs-Link ist einmalig:
    expect((await client().call("POST", "/api/enroll", { token })).status).toBe(410);
  });
});

describe("Wiedereinstieg · Raten-Limit", () => {
  it("oberhalb RECOVER_RATE ⇒ 429 (unabhängig von Existenz der Adresse)", async () => {
    const bundled = await build({
      entryPoints: [path.join(ROOT, "platforms/cloudflare/worker/index.js")],
      bundle: true, format: "esm", external: ["cloudflare:sockets"], write: false, target: "es2022",
    });
    const mf2 = new Miniflare({
      modules: true, script: bundled.outputFiles[0].text, kvNamespaces: ["PAARE"],
      compatibilityDate: "2026-06-01",
      bindings: { ADMIN_TOKEN: ADMIN, RECOVER_RATE: "2" },
      serviceBindings: { async MAIL_UPSTREAM() { return new Response("ok"); } },
    });
    const alt = mf; mf = mf2;
    try {
      expect((await client().call("POST", "/api/recover", { email: "x@example.com" })).status).toBe(200);
      expect((await client().call("POST", "/api/recover", { email: "x@example.com" })).status).toBe(200);
      expect((await client().call("POST", "/api/recover", { email: "x@example.com" })).status).toBe(429);
    } finally { mf = alt; await mf2.dispose(); }
  });
});
