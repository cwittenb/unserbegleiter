// Worker · Provider-Schalter (S47): EIN Wert (LLM_PROVIDER) wählt den Provider.
// Key und Modell liegen pro Provider getrennt vor (<PROVIDER>_API_KEY /
// <PROVIDER>_MODEL). Beide Paare sind hier GLEICHZEITIG provisioniert; allein
// das Umlegen von LLM_PROVIDER schickt korrektes Modell UND korrekten Key an
// den jeweiligen Upstream — ohne die anderen Werte anzufassen. Kein Fallback:
// fehlt zum gewählten Provider Key oder Modell, ist es ein 500 (variablen-genau).
//
// Geprüft wird gegen den ECHTEN, deploy-gleich gebündelten Worker (Miniflare);
// der Mock-Upstream merkt sich, WAS er empfangen hat (Ziel-URL, Auth-Header,
// Modell) und antwortet im Format des jeweiligen Providers.

import { describe, it, expect, afterEach } from "vitest";
import { Miniflare } from "miniflare";
import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ADMIN = "test-admin-geheim";

// Beide Provider-Paare gleichzeitig gesetzt — nur LLM_PROVIDER unterscheidet die Läufe.
const PAARE = {
  ANTHROPIC_API_KEY: "anthropic-key-xyz",
  ANTHROPIC_MODEL: "anthropic-testmodell",
  MISTRAL_API_KEY: "mistral-key-abc",
  MISTRAL_MODEL: "mistral-testmodell",
};

let bundledText;
async function bundle() {
  if (!bundledText) {
    const bundled = await build({
      entryPoints: [path.join(ROOT, "platforms/cloudflare/worker/index.js")],
      bundle: true, format: "esm", external: ["cloudflare:sockets"], write: false, target: "es2022",
    });
    bundledText = bundled.outputFiles[0].text;
  }
  return bundledText;
}

function client(mf) {
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
      try { data = await res.json(); } catch { /* leer/SSE */ }
      return { status: res.status, data };
    },
  };
}

// Kapturierender Upstream: antwortet Anthropic-URL → Anthropic-Format, sonst
// OpenAI-kompatibel (Mistral). So kommt jeder Lauf sauber mit 200 zurück.
function kapturierenderUpstream(gesehen) {
  return async function UPSTREAM(request) {
    const body = await request.json();
    gesehen.url = request.url;
    gesehen.authorization = request.headers.get("authorization");
    gesehen.xApiKey = request.headers.get("x-api-key");
    gesehen.model = body.model;
    if (request.url.includes("api.anthropic.com"))
      return new Response(JSON.stringify({
        content: [{ type: "text", text: "ok" }], stop_reason: "end_turn",
        usage: { input_tokens: 1, output_tokens: 1 },
      }), { headers: { "content-type": "application/json" } });
    return new Response(JSON.stringify({
      choices: [{ message: { content: "ok" }, finish_reason: "stop" }],
      usage: { prompt_tokens: 1, completion_tokens: 1 },
    }), { headers: { "content-type": "application/json" } });
  };
}

async function baueWorker({ bindings, upstream }) {
  const script = await bundle();
  return new Miniflare({
    modules: true, script, kvNamespaces: ["PAARE"], compatibilityDate: "2026-06-01",
    bindings: { ADMIN_TOKEN: ADMIN, ...bindings },
    serviceBindings: { UPSTREAM: upstream },
  });
}

async function angemeldeteAnna(mf) {
  const init = client(mf);
  const res = await init.call("POST", "/api/paar", { nameA: "Anna", nameB: "Bernd" }, { "x-admin-token": ADMIN });
  const anna = client(mf);
  await anna.call("POST", "/api/enroll", { token: res.data.links.A });
  return anna;
}

let offen = [];
afterEach(async () => { for (const mf of offen) { try { await mf.dispose(); } catch { /* egal */ } } offen = []; });

describe("Worker · Provider-Schalter (S47)", () => {
  it("LLM_PROVIDER=anthropic → Anthropic-Upstream, x-api-key=ANTHROPIC_API_KEY, model=ANTHROPIC_MODEL", async () => {
    const gesehen = {};
    const mf = await baueWorker({ bindings: { LLM_PROVIDER: "anthropic", ...PAARE }, upstream: kapturierenderUpstream(gesehen) });
    offen.push(mf);
    const anna = await angemeldeteAnna(mf);
    const r = await anna.call("POST", "/api/llm", { system: "S", messages: [{ role: "user", content: "hi" }] });
    expect(r.status).toBe(200);
    expect(gesehen.url).toContain("api.anthropic.com");
    expect(gesehen.xApiKey).toBe(PAARE.ANTHROPIC_API_KEY);
    expect(gesehen.model).toBe(PAARE.ANTHROPIC_MODEL);
  });

  it("nur LLM_PROVIDER umgelegt → mistral: Mistral-Upstream, Authorization=Bearer MISTRAL_API_KEY, model=MISTRAL_MODEL", async () => {
    const gesehen = {};
    // IDENTISCHE Provider-Paare wie oben — allein LLM_PROVIDER unterscheidet.
    const mf = await baueWorker({ bindings: { LLM_PROVIDER: "mistral", ...PAARE }, upstream: kapturierenderUpstream(gesehen) });
    offen.push(mf);
    const anna = await angemeldeteAnna(mf);
    const r = await anna.call("POST", "/api/llm", { system: "S", messages: [{ role: "user", content: "hi" }] });
    expect(r.status).toBe(200);
    expect(gesehen.url).toContain("api.mistral.ai");
    expect(gesehen.authorization).toBe("Bearer " + PAARE.MISTRAL_API_KEY);
    expect(gesehen.model).toBe(PAARE.MISTRAL_MODEL);
  });

  it("gewählter Provider ohne passenden Key → 500 nennt die fehlende Variable, kein Upstream", async () => {
    // MISTRAL gewählt, aber MISTRAL_API_KEY fehlt (nur Modell da).
    const mf = await baueWorker({
      bindings: { LLM_PROVIDER: "mistral", MISTRAL_MODEL: "m" },
      upstream: async () => { throw new Error("Upstream darf ohne Key NIE kontaktiert werden"); },
    });
    offen.push(mf);
    const anna = await angemeldeteAnna(mf);
    const r = await anna.call("POST", "/api/llm", { system: "S", messages: [{ role: "user", content: "hi" }] });
    expect(r.status).toBe(500);
    expect(r.data.error).toContain("MISTRAL_API_KEY");
  });

  it("gewählter Provider ohne passendes Modell → 500 nennt die fehlende Variable, kein Upstream", async () => {
    const mf = await baueWorker({
      bindings: { LLM_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "k" },
      upstream: async () => { throw new Error("Upstream darf ohne Modell NIE kontaktiert werden"); },
    });
    offen.push(mf);
    const anna = await angemeldeteAnna(mf);
    const r = await anna.call("POST", "/api/llm", { system: "S", messages: [{ role: "user", content: "hi" }] });
    expect(r.status).toBe(500);
    expect(r.data.error).toContain("ANTHROPIC_MODEL");
  });

  it("unbekannter LLM_PROVIDER → 500 mit klarer Meldung, kein Upstream", async () => {
    const mf = await baueWorker({
      bindings: { LLM_PROVIDER: "gibtsnicht", ...PAARE },
      upstream: async () => { throw new Error("Upstream darf bei unbekanntem Provider NIE kontaktiert werden"); },
    });
    offen.push(mf);
    const anna = await angemeldeteAnna(mf);
    const r = await anna.call("POST", "/api/llm", { system: "S", messages: [{ role: "user", content: "hi" }] });
    expect(r.status).toBe(500);
    expect(r.data.error).toContain("LLM_PROVIDER");
  });
});
