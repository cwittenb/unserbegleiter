// S92 · T0-Regression — gegen den ECHTEN Worker: Die Pstate-Whitelist muss
// alle von der App genutzten Felder tragen. merkposten (S44) und language
// fehlten und liefen auf Pages ins 404 — Lesen war still null-maskiert:
// Merkposten und persönliche UI-Sprache funktionierten nur im Artefakt.
// Dazu leseMarker (S92) und die Rollen-Isolation aller Pstate-Felder.

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
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

beforeAll(async () => {
  const bundled = await build({
    entryPoints: [path.join(ROOT, "platforms/cloudflare/worker/index.js")],
    bundle: true, format: "esm", external: ["cloudflare:sockets"], write: false, target: "es2022",
  });
  mf = new Miniflare({
    modules: true, script: bundled.outputFiles[0].text,
    kvNamespaces: ["PAARE"], bindings: { ADMIN_TOKEN: ADMIN },
  });
});
afterAll(async () => { if (mf) await mf.dispose(); });

let anna, bernd;
beforeEach(async () => {
  const init = client();
  const { data } = await init.call("POST", "/api/paar", { nameA: "Anna", nameB: "Bernd" }, { "x-admin-token": ADMIN });
  anna = client(); bernd = client();
  await anna.call("POST", "/api/enroll", { token: data.links.A });
  await bernd.call("POST", "/api/enroll", { token: data.links.B });
});

// Alle Felder, die die App tatsächlich über backend.pstate nutzt:
const FELDER = {
  timeline: { entries: [{ at: "2026-07-01T10:00:00Z", topics: ["x"], summary: "s" }] },
  selfDisclosures: { items: [{ id: "SD1", text: "privat" }] },
  merkposten: { items: [{ id: "N1", text: "Bedeutsames Thema", status: "open" }] },   // S44 — der 404-Fall
  language: { ui: "en" },
  leseMarker: { schluessel: "ueberschaetzt:MR1+MR2+MR3", at: "2026-07-01T10:00:00Z" },   // S92
};

describe("S92 · Pstate-Whitelist (T0-Fix)", () => {
  it("Round-Trip für JEDES von der App genutzte Feld — kein 404 mehr", async () => {
    for (const [feld, wert] of Object.entries(FELDER)) {
      const put = await anna.call("PUT", "/api/pstate/" + feld, { value: wert });
      expect(put.status, feld).toBe(200);
      const get = await anna.call("GET", "/api/pstate/" + feld);
      expect(get.status, feld).toBe(200);
      expect(get.data.value, feld).toEqual(wert);
    }
  });

  it("Rollen-Isolation: Annas Merkposten und Lese-Marker erreichen Bernd nicht", async () => {
    await anna.call("PUT", "/api/pstate/merkposten", { value: FELDER.merkposten });
    await anna.call("PUT", "/api/pstate/leseMarker", { value: FELDER.leseMarker });
    for (const feld of ["merkposten", "leseMarker"]) {
      const r = await bernd.call("GET", "/api/pstate/" + feld);
      expect(r.status).toBe(200);
      expect(JSON.stringify(r.data.value || null)).not.toContain("Bedeutsames");
      expect(JSON.stringify(r.data.value || null)).not.toContain("ueberschaetzt");
    }
  });

  it("unbekannte Felder bleiben 404 (Whitelist bleibt Whitelist)", async () => {
    expect((await anna.call("GET", "/api/pstate/geheimfeld")).status).toBe(404);
    expect((await anna.call("PUT", "/api/pstate/geheimfeld", { value: 1 })).status).toBe(404);
  });
});
