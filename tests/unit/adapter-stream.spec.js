// LLM-Adapter · Streaming (SSE) — Deltas, Endresultat, Fallbacks.
//
// Kern-Invarianten:
//  1. OHNE onDelta ist der Request-Körper unverändert (kein stream-Feld).
//  2. MIT onDelta wird stream:true gesendet und je Text-Häppchen onDelta gerufen.
//  3. Endresultat hat exakt die Fassadenform {text, stop, usage}.
//  4. Antwortet die Gegenstelle mit JSON statt SSE → Nicht-Stream-Fallback.

import { describe, it, expect } from "vitest";
import { makeAdapter, sseDaten, istEventStream } from "../../core/llm/adapter.js";

// Konfigurationspflicht (S35d): explizite Test-Konfiguration statt Kern-Defaults.
const KEYLESS = { provider: "anthropic", mode: "keyless", models: { anthropic: "test-modell" } };
/** Response-Attrappe mit SSE-Body (ReadableStream aus Einzel-Chunks). */
function sseResponse(zeilen, { chunkweise = true } = {}) {
  const enc = new TextEncoder();
  const chunks = chunkweise ? zeilen.map(z => enc.encode(z)) : [enc.encode(zeilen.join(""))];
  return {
    status: 200,
    headers: { get: n => (n.toLowerCase() === "content-type" ? "text/event-stream; charset=utf-8" : null) },
    body: new ReadableStream({
      start(c) { for (const ch of chunks) c.enqueue(ch); c.close(); },
    }),
    json: async () => { throw new Error("json() darf im Stream-Pfad nicht gerufen werden"); },
  };
}

function jsonResponse(data) {
  return {
    status: 200,
    headers: { get: () => "application/json" },
    json: async () => data,
  };
}

function fangFetch(antwortFn) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    return antwortFn(calls.length);
  };
  fn.calls = calls;
  return fn;
}

const ANTHROPIC_SSE = [
  'event: message_start\n',
  'data: {"type":"message_start","message":{"usage":{"input_tokens":100,"cache_creation_input_tokens":90,"cache_read_input_tokens":0}}}\n\n',
  'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hallo "}}\n\n',
  'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Welt"}}\n\n',
  'data: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":20}}\n\n',
  'data: {"type":"message_stop"}\n\n',
];

describe("Adapter · Streaming Anthropic (keyless)", () => {
  it("stream:true im Body; Deltas in Reihenfolge; Fassaden-Endresultat inkl. Cache-Usage", async () => {
    const f = fangFetch(() => sseResponse(ANTHROPIC_SSE));
    const call = makeAdapter({ ...KEYLESS }, f);
    const deltas = [];
    const r = await call("SYS", [{ role: "user", content: "u" }], d => deltas.push(d));
    expect(f.calls[0].body.stream).toBe(true);
    expect(f.calls[0].body.system[0].cache_control).toEqual({ type: "ephemeral" });   // Caching bleibt an
    expect(deltas).toEqual(["Hallo ", "Welt"]);
    expect(r).toEqual({
      text: "Hallo Welt", stop: "end_turn",
      usage: { in: 100, out: 20, cacheWrite: 90, cacheRead: 0 },
    });
  });

  it("OHNE onDelta bleibt der Body streamfrei (Abwärtskompatibilität)", async () => {
    const f = fangFetch(() => jsonResponse({ content: [{ type: "text", text: "ok" }], stop_reason: "end_turn", usage: {} }));
    const call = makeAdapter({ ...KEYLESS }, f);
    await call("SYS", []);
    expect("stream" in f.calls[0].body).toBe(false);
  });

  it("JSON-Antwort trotz Stream-Wunsch → Fallback auf Nicht-Stream-Parser (Sandbox-Puffer)", async () => {
    const f = fangFetch(() => jsonResponse({ content: [{ type: "text", text: "gepuffert" }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }));
    const call = makeAdapter({ ...KEYLESS }, f);
    const deltas = [];
    const r = await call("SYS", [], d => deltas.push(d));
    expect(r.text).toBe("gepuffert");
    expect(deltas).toEqual([]);   // kein Stream — keine Deltas, aber volles Resultat
  });

  it("error-Event im Strom wird zum Wurf", async () => {
    const f = fangFetch(() => sseResponse(['data: {"type":"error","error":{"message":"overloaded"}}\n\n']));
    const call = makeAdapter({ ...KEYLESS }, f);
    await expect(call("S", [], () => {})).rejects.toThrow("overloaded");
  });

  it("SSE-Zerlegung ist chunk-grenzen-fest (Split mitten in Zeile und CRLF)", async () => {
    const roh = 'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"AB"}}\r\n\r\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":2}}\n\n';
    const haelften = [roh.slice(0, 37), roh.slice(37)];
    const gefunden = [];
    for await (const d of sseDaten(sseResponse(haelften))) gefunden.push(d);
    expect(gefunden).toHaveLength(2);
    expect(JSON.parse(gefunden[0]).delta.text).toBe("AB");
  });
});

describe("Adapter · Streaming OpenAI-kompatibel", () => {
  const MISTRAL_SSE = [
    'data: {"choices":[{"delta":{"content":"Ant"}}]}\n\n',
    'data: {"choices":[{"delta":{"content":"wort"},"finish_reason":"stop"}],"usage":{"prompt_tokens":50,"completion_tokens":10}}\n\n',
    'data: [DONE]\n\n',
  ];

  it("Mistral: Deltas + usage aus dem Schlusshäppchen; KEIN stream_options", async () => {
    const f = fangFetch(() => sseResponse(MISTRAL_SSE));
    const call = makeAdapter({ provider: "mistral", mode: "direct", apiKey: "mk", models: { mistral: "test-modell" } }, f);
    const deltas = [];
    const r = await call("SYS", [{ role: "user", content: "u" }], d => deltas.push(d));
    expect(f.calls[0].body.stream).toBe(true);
    expect(f.calls[0].body.stream_options).toBeUndefined();
    expect(deltas).toEqual(["Ant", "wort"]);
    expect(r).toEqual({ text: "Antwort", stop: "stop", usage: { in: 50, out: 10, cacheWrite: null, cacheRead: null } });
  });

  it("OpenAI: stream_options.include_usage wird gesetzt", async () => {
    const f = fangFetch(() => sseResponse(MISTRAL_SSE));
    const call = makeAdapter({ provider: "openai", mode: "direct", apiKey: "ok", models: { openai: "test-modell" } }, f);
    await call("SYS", [], () => {});
    expect(f.calls[0].body.stream_options).toEqual({ include_usage: true });
  });
});

describe("Adapter · Streaming Proxy (Cloudflare-Client)", () => {
  it("sendet stream:true; parst {delta}…{done}; kontingent landet an der Fassade", async () => {
    const f = fangFetch(() => sseResponse([
      'data: {"delta":"Hal"}\n\n',
      'data: {"delta":"lo"}\n\n',
      'data: {"done":{"text":"Hallo","stop":"end_turn","usage":{"in":1,"out":2},"kontingent":{"hinweis":"H","rest":3}}}\n\n',
    ]));
    const call = makeAdapter({ mode: "proxy" }, f);
    const deltas = [];
    const r = await call("SYS", [{ role: "user", content: "u", hidden: true }], d => deltas.push(d));
    expect(f.calls[0].body).toEqual({ system: "SYS", messages: [{ role: "user", content: "u" }], stream: true });
    expect(f.calls[0].init.credentials).toBe("include");
    expect(deltas).toEqual(["Hal", "lo"]);
    expect(r.text).toBe("Hallo");
    expect(call.kontingent).toEqual({ hinweis: "H", rest: 3 });
  });

  it("OHNE onDelta bleibt der Proxy-Body exakt {system, messages}", async () => {
    const f = fangFetch(() => jsonResponse({ text: "vom Worker", stop: "end_turn", usage: null }));
    const call = makeAdapter({ mode: "proxy" }, f);
    const r = await call("SYS", [{ role: "user", content: "u" }]);
    expect(f.calls[0].body).toEqual({ system: "SYS", messages: [{ role: "user", content: "u" }] });
    expect(r.text).toBe("vom Worker");
  });

  it("error-Event des Workers wird zum Wurf", async () => {
    const f = fangFetch(() => sseResponse(['data: {"delta":"x"}\n\n', 'data: {"error":"Upstream kaputt"}\n\n']));
    const call = makeAdapter({ mode: "proxy" }, f);
    await expect(call("S", [], () => {})).rejects.toThrow("Upstream kaputt");
  });

  it("JSON-Antwort trotz Stream-Wunsch (alter Worker) → bisheriger Pfad", async () => {
    const f = fangFetch(() => jsonResponse({ text: "alt", stop: "end_turn", usage: null }));
    const call = makeAdapter({ mode: "proxy" }, f);
    const r = await call("S", [], () => {});
    expect(r.text).toBe("alt");
  });

  it("Strom-Abriss ohne done → Deltas werden als beste Antwort geliefert", async () => {
    const f = fangFetch(() => sseResponse(['data: {"delta":"halbe "}\n\n', 'data: {"delta":"Antwort"}\n\n']));
    const call = makeAdapter({ mode: "proxy" }, f);
    const r = await call("S", [], () => {});
    expect(r).toEqual({ text: "halbe Antwort", stop: null, usage: null });
  });
});

describe("istEventStream — Wächter", () => {
  it("Mocks ohne headers/body sind KEIN Stream", () => {
    expect(istEventStream({ status: 200, json: async () => ({}) })).toBe(false);
  });
});
