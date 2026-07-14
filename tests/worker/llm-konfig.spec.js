// Worker · Konfigurationspflicht (S35d) + Provider-Schalter (S47): ist gar kein
// LLM_PROVIDER gesetzt, ist das ein Deploy-Fehler — /api/llm antwortet mit 500
// und klarer Meldung. KEIN stiller Fallback auf Provider oder Modell. Die
// providergenauen Fälle (LLM_PROVIDER gesetzt, aber <PROVIDER>_API_KEY oder
// <PROVIDER>_MODEL fehlt) prüft tests/worker/llm-schalter.spec.js.
// Der Missbrauchsschutz bleibt davor: ohne Session weiterhin 401, der
// Konfigurationszustand wird Unangemeldeten nicht verraten.

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
      return res;
    },
  };
}

beforeAll(async () => {
  const bundled = await build({
    entryPoints: [path.join(ROOT, "platforms/cloudflare/worker/index.js")],
    bundle: true, format: "esm", external: ["cloudflare:sockets"], write: false, target: "es2022",
  });
  mf = new Miniflare({
    modules: true,
    script: bundled.outputFiles[0].text,
    kvNamespaces: ["PAARE"],
    compatibilityDate: "2026-06-01",
    // BEWUSST ohne LLM_PROVIDER / LLM_MODEL / LLM_API_KEY —
    // ein Upstream darf in diesem Zustand nie kontaktiert werden.
    bindings: { ADMIN_TOKEN: ADMIN },
    serviceBindings: {
      async UPSTREAM() {
        throw new Error("Upstream darf ohne LLM-Konfiguration NIE kontaktiert werden");
      },
    },
  });
});

afterAll(async () => { if (mf) await mf.dispose(); });

describe("Worker · /api/llm ohne LLM-Environment", () => {
  it("angemeldet → 500 mit klarer Konfigurations-Meldung, kein Upstream-Kontakt", async () => {
    const init = client();
    const res0 = await init.call("POST", "/api/paar", { nameA: "Anna", nameB: "Bernd" }, { "x-admin-token": ADMIN });
    const { links } = await res0.json();
    const anna = client();
    await anna.call("POST", "/api/enroll", { token: links.A });

    const res = await anna.call("POST", "/api/llm", { system: "S", messages: [{ role: "user", content: "hi" }] });
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain("LLM nicht konfiguriert");
    expect(data.error).toContain("LLM_PROVIDER");
  });

  it("unangemeldet bleibt es beim 401 — die Konfigurationslage wird nicht verraten", async () => {
    const fremd = client();
    const res = await fremd.call("POST", "/api/llm", { system: "S", messages: [] });
    expect(res.status).toBe(401);
  });
});
