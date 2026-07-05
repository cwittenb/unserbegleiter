// Betreiber-Export /api/export/:code — gegen den echten Worker.
// Beweist: admin-gated, liefert Chats + Zustände BEIDER Welten getrennt,
// und exportiert ausschließlich das angefragte Paar.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Miniflare } from "miniflare";
import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ADMIN = "test-admin-geheim";
let mf;

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

async function paarMitDaten(namen) {
  const init = client();
  const { data } = await init.call("POST", "/api/paar", namen, { "x-admin-token": ADMIN });
  const a = client();
  await a.call("POST", "/api/enroll", { token: data.links.A });
  await a.call("PUT", "/api/bstate/regal", { value: { items: [{ id: "RG1", text: "MARKER-" + data.code, von: namen.nameA }] } });
  await a.call("PUT", "/api/pstate/zeitleiste", { value: { eintraege: [{ text: "PRIVAT-" + data.code }] } });
  await a.call("PUT", "/api/chat/mine/solo1", { value: { status: "running", messages: [{ role: "user", content: "CHAT-" + data.code }] } });
  return data.code;
}

beforeAll(async () => {
  const bundled = await build({
    entryPoints: [path.join(ROOT, "platforms/cloudflare/worker/index.js")],
    bundle: true, format: "esm", external: ["cloudflare:sockets"], write: false, target: "es2022",
  });
  mf = new Miniflare({
    modules: true, script: bundled.outputFiles[0].text, kvNamespaces: ["PAARE"],
    compatibilityDate: "2026-06-01",
    bindings: { ADMIN_TOKEN: ADMIN },
  });
});
afterAll(async () => { if (mf) await mf.dispose(); });

describe("Betreiber-Export · /api/export/:code", () => {
  it("ohne/mit falschem Token → 401; unbekannter Code → 404", async () => {
    const code = await paarMitDaten({ nameA: "Anna", nameB: "Bernd" });
    expect((await client().call("GET", "/api/export/" + code)).status).toBe(401);
    expect((await client().call("GET", "/api/export/" + code, undefined, { "x-admin-token": "falsch" })).status).toBe(401);
    expect((await client().call("GET", "/api/export/gibtsnicht", undefined, { "x-admin-token": ADMIN })).status).toBe(404);
  });

  it("liefert Chats, geteilte und private Zustände — sauber nach Welten getrennt", async () => {
    const code = await paarMitDaten({ nameA: "Anna", nameB: "Bernd" });
    const { status, data } = await client().call("GET", "/api/export/" + code, undefined, { "x-admin-token": ADMIN });
    expect(status).toBe(200);
    expect(data).toMatchObject({ code, nameA: "Anna", nameB: "Bernd" });

    const sharedText = JSON.stringify(data.shared);
    const privatText = JSON.stringify(data.privat);
    expect(sharedText).toContain("MARKER-" + code);          // Regal (geteilt)
    expect(privatText).toContain("PRIVAT-" + code);          // Zeitleiste (privat)
    expect(privatText).toContain("CHAT-" + code);            // Solo-Chat (privat!)
    expect(sharedText).not.toContain("PRIVAT-" + code);      // Welt-Trennung bleibt sichtbar
    expect(sharedText).not.toContain("CHAT-" + code);
  });

  it("Paar-Isolation: der Export enthält ausschließlich das angefragte Paar", async () => {
    const codeX = await paarMitDaten({ nameA: "Xena", nameB: "Xaver" });
    const codeY = await paarMitDaten({ nameA: "Yara", nameB: "Yannik" });
    const { data } = await client().call("GET", "/api/export/" + codeX, undefined, { "x-admin-token": ADMIN });
    const alles = JSON.stringify(data);
    expect(alles).toContain("MARKER-" + codeX);
    expect(alles).not.toContain(codeY);                       // keine Spur des anderen Paars
    for (const k of [...Object.keys(data.shared), ...Object.keys(data.privat)])
      expect(k).toContain(":" + codeX + ":");
  });
});
