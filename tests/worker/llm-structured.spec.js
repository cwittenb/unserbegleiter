// S76 · Worker · /api/llm mit structured: der Client schickt Name + JSON-Schema,
// der Worker übersetzt providerspezifisch (hier anthropic ⇒ Tool-Use) und gibt
// data in der Fassade zurück. Grenzen: vollständige Angabe erzwingen, Größe
// deckeln, stream+structured (noch) abweisen — ein öffentlicher Endpunkt darf
// nichts Unvollständiges oder Unbegrenztes in den Upstream tragen.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Miniflare } from "miniflare";
import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ADMIN = "test-admin-geheim";
let mf;
let gesehenerUpstreamBody = null;
let upstreamStreamen = false;

const TURN_SSE = [
  '{"type":"message_start","message":{"usage":{"input_tokens":3}}}',
  '{"type":"content_block_delta","delta":{"partial_json":"{\\"antwort\\":\\"Hal"}}',
  '{"type":"content_block_delta","delta":{"partial_json":"lo du.\\",\\"marker\\":null,\\"block\\":null}"}}',
  '{"type":"message_delta","delta":{"stop_reason":"tool_use"},"usage":{"output_tokens":9}}',
].map(d => "data: " + d + "\n\n").join("");

const SCHEMA = {
  name: "bewertung",
  schema: {
    type: "object",
    properties: { checks: { type: "array", items: { type: "string" } } },
    required: ["checks"],
    additionalProperties: false,
  },
};

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
    bindings: { ADMIN_TOKEN: ADMIN, LLM_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "test-key", ANTHROPIC_MODEL: "test-modell" },
    serviceBindings: {
      async UPSTREAM(request) {
        gesehenerUpstreamBody = await request.json();
        if (upstreamStreamen)
          return new Response(TURN_SSE, { headers: { "content-type": "text/event-stream" } });
        return new Response(JSON.stringify({
          content: [{ type: "tool_use", name: "bewertung", input: { checks: ["a", "b"] } }],
          stop_reason: "tool_use",
          usage: { input_tokens: 5, output_tokens: 3 },
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

describe("Worker · /api/llm mit structured", () => {
  it("übersetzt in Tool-Use und liefert data in der Fassade zurück", async () => {
    gesehenerUpstreamBody = null;
    const anna = await angemeldeteAnna();
    const res = await anna.call("POST", "/api/llm", {
      system: "S", messages: [{ role: "user", content: "hi" }], structured: SCHEMA,
    });
    expect(res.status).toBe(200);
    const daten = await res.json();
    expect(daten.data).toEqual({ checks: ["a", "b"] });
    expect(gesehenerUpstreamBody.tool_choice).toEqual({ type: "tool", name: "bewertung" });
    expect(gesehenerUpstreamBody.tools[0].input_schema).toEqual(SCHEMA.schema);
  });

  it("ohne structured bleibt der Altpfad unberührt (kein tools im Upstream)", async () => {
    gesehenerUpstreamBody = null;
    const anna = await angemeldeteAnna();
    await anna.call("POST", "/api/llm", { system: "S", messages: [{ role: "user", content: "hi" }] });
    expect(gesehenerUpstreamBody.tools).toBeUndefined();
    expect(gesehenerUpstreamBody.tool_choice).toBeUndefined();
  });

  it("unvollständiges structured ⇒ 400, ohne Upstream-Kontakt", async () => {
    gesehenerUpstreamBody = null;
    const anna = await angemeldeteAnna();
    const ohneSchema = await anna.call("POST", "/api/llm", { system: "S", messages: [], structured: { name: "x" } });
    expect(ohneSchema.status).toBe(400);
    const ohneName = await anna.call("POST", "/api/llm", { system: "S", messages: [], structured: { schema: {} } });
    expect(ohneName.status).toBe(400);
    expect((await ohneName.json()).error).toContain("structured unvollständig");
    expect(gesehenerUpstreamBody).toBeNull();
  });

  it("zu großes Schema ⇒ 400 (Schema-Bombe erreicht den Upstream nie)", async () => {
    gesehenerUpstreamBody = null;
    const anna = await angemeldeteAnna();
    const riesig = { name: "gross", schema: { type: "object", properties: {} } };
    for (let i = 0; i < 900; i++) riesig.schema.properties["feld_" + i] = { type: "string", description: "x".repeat(30) };
    const res = await anna.call("POST", "/api/llm", { system: "S", messages: [], structured: riesig });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("zu groß");
    expect(gesehenerUpstreamBody).toBeNull();
  });

  it("structured + stream: {delta}-Events sind extrahierter antwort-Text, done trägt data (S79)", async () => {
    upstreamStreamen = true;
    const anna = await angemeldeteAnna();
    const res = await anna.call("POST", "/api/llm", {
      system: "S", messages: [{ role: "user", content: "hi" }], structured: SCHEMA, stream: true,
    });
    upstreamStreamen = false;
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    const roh = await res.text();
    const events = roh.split("\n\n").filter(Boolean)
      .map(b => b.split("\n").filter(z => z.startsWith("data:")).map(z => z.slice(5).trim()).join(""))
      .filter(Boolean).map(d => JSON.parse(d));
    const deltas = events.filter(e => typeof e.delta === "string").map(e => e.delta);
    const done = events.find(e => e.done);
    expect(deltas.join("")).toBe("Hallo du.");
    expect(deltas.join("")).not.toContain("{");
    expect(done.done.data).toEqual({ antwort: "Hallo du.", marker: null, block: null });
  });

  it("unangemeldet bleibt es beim 401 — auch mit structured", async () => {
    const fremd = client();
    const res = await fremd.call("POST", "/api/llm", { system: "S", messages: [], structured: SCHEMA });
    expect(res.status).toBe(401);
  });
});
