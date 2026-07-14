// Worker · /api/llm mit stream:true — Upstream-SSE (Anthropic-Format) wird
// als provider-neutrale SSE re-emittiert: {delta}… {done}. Fehler nach
// Response-Start reisen als {error}-Event. Ohne stream bleibt JSON (Altpfad).

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Miniflare } from "miniflare";
import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ADMIN = "test-admin-geheim";
let mf;
let upstreamModus = "sse";   // "sse" | "kaputt"

const ANTHROPIC_SSE =
  'event: message_start\n' +
  'data: {"type":"message_start","message":{"usage":{"input_tokens":7,"cache_creation_input_tokens":0,"cache_read_input_tokens":0}}}\n\n' +
  'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hallo "}}\n\n' +
  'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Welt"}}\n\n' +
  'data: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":2}}\n\n' +
  'data: {"type":"message_stop"}\n\n';

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

/** SSE-Body vollständig lesen und die data:-JSONs zurückgeben. */
async function leseEvents(res) {
  const roh = await res.text();
  return roh.split("\n\n").filter(Boolean)
    .map(block => block.split("\n").filter(z => z.startsWith("data:")).map(z => z.slice(5).trim()).join(""))
    .filter(Boolean)
    .map(d => JSON.parse(d));
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
    bindings: { ADMIN_TOKEN: ADMIN, LLM_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "test-key", ANTHROPIC_MODEL: "test-modell" },
    serviceBindings: {
      async UPSTREAM(request) {
        if (upstreamModus === "kaputt")
          return new Response(JSON.stringify({ error: { message: "overloaded" } }),
            { headers: { "content-type": "application/json" } });
        const body = await request.json();
        if (body.stream === true)
          return new Response(ANTHROPIC_SSE, { headers: { "content-type": "text/event-stream" } });
        return new Response(JSON.stringify({
          content: [{ type: "text", text: "ok" }], stop_reason: "end_turn",
          usage: { input_tokens: 1, output_tokens: 1 },
        }), { headers: { "content-type": "application/json" } });
      },
    },
  });
});

afterAll(async () => { if (mf) await mf.dispose(); });

async function angemeldeteAnna() {
  const init = client();
  const res = await init.call("POST", "/api/paar", { nameA: "Anna", nameB: "Bernd" }, { "x-admin-token": ADMIN });
  const { links } = await res.json();
  const anna = client();
  await anna.call("POST", "/api/enroll", { token: links.A });
  return anna;
}

describe("Worker · /api/llm Streaming", () => {
  it("stream:true → text/event-stream mit {delta}… und abschließendem {done} in Fassadenform", async () => {
    upstreamModus = "sse";
    const anna = await angemeldeteAnna();
    const res = await anna.call("POST", "/api/llm", { system: "S", messages: [{ role: "user", content: "hi" }], stream: true });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    const events = await leseEvents(res);
    const deltas = events.filter(e => typeof e.delta === "string").map(e => e.delta);
    const done = events.find(e => e.done);
    expect(deltas).toEqual(["Hallo ", "Welt"]);
    expect(done.done).toMatchObject({ text: "Hallo Welt", stop: "end_turn", usage: { in: 7, out: 2 } });
  });

  it("Upstream-Fehler im Stream-Pfad → {error}-Event statt done", async () => {
    upstreamModus = "kaputt";
    const anna = await angemeldeteAnna();
    const res = await anna.call("POST", "/api/llm", { system: "S", messages: [{ role: "user", content: "kaputt" }], stream: true });
    const events = await leseEvents(res);
    expect(events.some(e => /overloaded/.test(e.error || ""))).toBe(true);
    expect(events.some(e => e.done)).toBe(false);
  });

  it("ohne stream bleibt der JSON-Altpfad unverändert", async () => {
    upstreamModus = "sse";   // Upstream streamt — der Adapter fordert aber gar kein SSE an …
    const anna = await angemeldeteAnna();
    const res = await anna.call("POST", "/api/llm", { system: "S", messages: [{ role: "user", content: "plain" }] });
    expect(res.headers.get("content-type")).toContain("application/json");
  });

  it("stream:true ohne Session → 401 als gewöhnliche JSON-Antwort (Denial-of-Wallet-Schutz greift vor dem Strom)", async () => {
    const fremd = client();
    const res = await fremd.call("POST", "/api/llm", { system: "S", messages: [], stream: true });
    expect(res.status).toBe(401);
  });
});
