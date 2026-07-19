// S79 · Streaming der Strukturausgabe: die onDelta-Häppchen sind der
// EXTRAHIERTE Begleitertext (antwort-Feld), nie rohes JSON; data kommt aus
// dem End-Parse des vollständigen Stroms (D1/O3). Getestet je Provider mit
// Mock-SSE inklusive zerrissener Fragmente.

import { describe, it, expect } from "vitest";
import { makeAdapter } from "../../core/llm/adapter.js";

const TURNJSON = '{"antwort":"Hallo du.\\n\\nMagst du erzählen?","marker":null,"block":null}';
const SCHEMA = { name: "turn", schema: { type: "object", properties: {}, additionalProperties: true } };

function sseResp(bloecke) {
  const enc = new TextEncoder();
  const roh = bloecke.map(b => "data: " + JSON.stringify(b) + "\n\n").join("");
  let gelesen = false;
  return {
    status: 200,
    headers: { get: h => (h === "content-type" ? "text/event-stream" : null) },
    body: { getReader: () => ({ read: async () => (gelesen ? { done: true } : (gelesen = true, { done: false, value: enc.encode(roh) })) }) },
  };
}
const mock = resp => { const fn = async (url, init) => { fn.body = JSON.parse(init.body); return resp; }; return fn; };
const inTeile = (s, n) => { const a = []; for (let i = 0; i < s.length; i += n) a.push(s.slice(i, i + n)); return a; };

describe("Anthropic · structured + stream (S79)", () => {
  it("input_json_delta-Fragmente → extrahierte Text-Deltas; data aus dem End-Parse", async () => {
    const events = [
      { type: "message_start", message: { usage: { input_tokens: 9, cache_read_input_tokens: 100 } } },
      ...inTeile(TURNJSON, 5).map(t => ({ type: "content_block_delta", delta: { partial_json: t } })),
      { type: "message_delta", delta: { stop_reason: "tool_use" }, usage: { output_tokens: 40 } },
    ];
    const f = mock(sseResp(events));
    const call = makeAdapter({ provider: "anthropic", mode: "keyless", models: { anthropic: "m" } }, f);
    const deltas = [];
    const r = await call("SYS", [{ role: "user", content: "u" }], { structured: SCHEMA, onDelta: d => deltas.push(d) });
    expect(f.body.stream).toBe(true);
    expect(f.body.tool_choice).toEqual({ type: "tool", name: "turn" });
    expect(deltas.join("")).toBe("Hallo du.\n\nMagst du erzählen?");
    expect(deltas.join("")).not.toContain("{");           // nie rohes JSON an die UI
    expect(r.data).toEqual({ antwort: "Hallo du.\n\nMagst du erzählen?", marker: null, block: null });
    expect(r.text).toBe("Hallo du.\n\nMagst du erzählen?");
    expect(r.usage.out).toBe(40);
  });

  it("Abschneidung im Strom (stop=max_tokens, kein Text) ⇒ Wurf statt stiller Leere", async () => {
    const events = [
      { type: "content_block_delta", delta: { partial_json: '{"antwo' } },
      { type: "message_delta", delta: { stop_reason: "max_tokens" } },
    ];
    const call = makeAdapter({ provider: "anthropic", mode: "keyless", models: { anthropic: "m" } }, mock(sseResp(events)));
    await expect(call("S", [], { structured: SCHEMA, onDelta: () => {} })).rejects.toThrow(/abgeschnitten/);
  });
});

describe("Mistral/OpenAI-kompatibel · structured + stream (S79)", () => {
  it("delta.content-Fragmente → extrahierte Text-Deltas; response_format bleibt strict", async () => {
    const events = [
      ...inTeile(TURNJSON, 4).map(t => ({ choices: [{ delta: { content: t } }] })),
      { choices: [{ delta: {}, finish_reason: "stop" }], usage: { prompt_tokens: 5, completion_tokens: 30 } },
    ];
    const f = mock(sseResp(events));
    const call = makeAdapter({ provider: "mistral", mode: "direct", apiKey: "mk", models: { mistral: "m" } }, f);
    const deltas = [];
    const r = await call("SYS", [], { structured: SCHEMA, onDelta: d => deltas.push(d) });
    expect(f.body.response_format.json_schema.strict).toBe(true);
    expect(f.body.stream).toBe(true);
    expect(deltas.join("")).toBe("Hallo du.\n\nMagst du erzählen?");
    expect(r.data.marker).toBeNull();
  });
});

describe("Proxy · structured + stream (S79)", () => {
  it("Client schickt beides; {delta}-Events sind bereits extrahierter Text, done trägt data", async () => {
    const enc = new TextEncoder();
    const roh = 'data: {"delta":"Hallo "}\n\ndata: {"delta":"du."}\n\n' +
      'data: {"done":{"text":"Hallo du.","data":{"antwort":"Hallo du.","marker":null},"stop":"tool_use","usage":null}}\n\n';
    let gelesen = false;
    const resp = {
      status: 200,
      headers: { get: h => (h === "content-type" ? "text/event-stream" : null) },
      body: { getReader: () => ({ read: async () => (gelesen ? { done: true } : (gelesen = true, { done: false, value: enc.encode(roh) })) }) },
    };
    const f = async (url, init) => { f.body = JSON.parse(init.body); return resp; };
    const call = makeAdapter({ mode: "proxy" }, f);
    const deltas = [];
    const r = await call("SYS", [{ role: "user", content: "u" }], { structured: SCHEMA, onDelta: d => deltas.push(d) });
    expect(f.body.structured.name).toBe("turn");
    expect(f.body.stream).toBe(true);
    expect(deltas.join("")).toBe("Hallo du.");
    expect(r.data.antwort).toBe("Hallo du.");
  });
});
