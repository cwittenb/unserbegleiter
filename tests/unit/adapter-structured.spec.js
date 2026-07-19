// S76 · Strukturausgabe im Adapter: der Provider ERZWINGT die Form
// (anthropic Tool-Use, mistral/openai response_format json_schema strict).
// Geprüft wird die Übersetzung in den Request-Körper, die Rückgabe von .data,
// die Fehlerdiagnose (kein Raten, kein stiller Downgrade) und dass Aufrufe
// OHNE structured byte-identisch bleiben.

import { describe, it, expect } from "vitest";
import { makeAdapter, leseAufrufOptionen } from "../../core/llm/adapter.js";

const KEYLESS = { provider: "anthropic", mode: "keyless", models: { anthropic: "test-modell" } };
const DIRECT_A = { provider: "anthropic", mode: "direct", apiKey: "sk-test", models: { anthropic: "test-modell" } };
const DIRECT_M = { provider: "mistral", mode: "direct", apiKey: "mk", models: { mistral: "test-modell" } };
const DIRECT_O = { provider: "openai", mode: "direct", apiKey: "ok", models: { openai: "test-modell" } };

const SCHEMA = {
  name: "bewertung",
  schema: {
    type: "object",
    properties: { checks: { type: "array", items: { type: "string" } } },
    required: ["checks"],
    additionalProperties: false,
  },
};

function mockFetch(antwort, status = 200) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    return {
      status,
      json: async () => (typeof antwort === "function" ? antwort(calls.length) : antwort),
      text: async () => JSON.stringify(typeof antwort === "function" ? antwort(calls.length) : antwort),
    };
  };
  fn.calls = calls;
  return fn;
}

const A_TOOLUSE = {
  content: [{ type: "tool_use", name: "bewertung", input: { checks: ["a", "b"] } }],
  stop_reason: "tool_use",
  usage: { input_tokens: 10, output_tokens: 5, cache_creation_input_tokens: 8, cache_read_input_tokens: 2 },
};
const M_JSON = {
  choices: [{ message: { content: '{"checks":["a","b"]}' }, finish_reason: "stop" }],
  usage: { prompt_tokens: 10, completion_tokens: 5 },
};

describe("Adapter · structured (anthropic Tool-Use)", () => {
  it("Request trägt tools + erzwungenes tool_choice; data kommt aus dem tool_use-Block", async () => {
    const f = mockFetch(A_TOOLUSE);
    const call = makeAdapter({ ...KEYLESS }, f);
    const r = await call("SYS", [{ role: "user", content: "u" }], { structured: SCHEMA });
    const { body } = f.calls[0];
    expect(body.tools).toHaveLength(1);
    expect(body.tools[0].name).toBe("bewertung");
    expect(body.tools[0].input_schema).toEqual(SCHEMA.schema);   // unverändert durchgereicht
    expect(body.tool_choice).toEqual({ type: "tool", name: "bewertung" });
    expect(body.stream).toBeUndefined();
    expect(r.data).toEqual({ checks: ["a", "b"] });
    expect(r.usage.in).toBe(10);
  });

  it("Prompt-Caching bleibt aktiv und die Tool-Definition ist je Aufruf identisch (Cache-Treffer)", async () => {
    const f = mockFetch(A_TOOLUSE);
    const call = makeAdapter({ ...DIRECT_A }, f);
    await call("SYS", [{ role: "user", content: "u" }], { structured: SCHEMA });
    await call("SYS", [{ role: "user", content: "u" }], { structured: SCHEMA });
    expect(f.calls[0].body.system[0].cache_control).toEqual({ type: "ephemeral" });
    expect(JSON.stringify(f.calls[0].body.tools)).toBe(JSON.stringify(f.calls[1].body.tools));
    expect(f.calls[0].init.headers["x-api-key"]).toBe("sk-test");
  });

  it("kein tool_use-Block ⇒ Wurf mit Diagnose statt Raten", async () => {
    const f = mockFetch({ content: [{ type: "text", text: "Ich erkläre lieber, warum ich das nicht tue." }], stop_reason: "end_turn" });
    const call = makeAdapter({ ...KEYLESS }, f);
    await expect(call("SYS", [], { structured: SCHEMA })).rejects.toThrow(/kein tool_use-Block/);
    await expect(call("SYS", [], { structured: SCHEMA })).rejects.toThrow(/Ich erkläre lieber/);
  });

  it("abgeschnitten (stop_reason max_tokens) ⇒ harter Fehler, keine halbe Struktur", async () => {
    const f = mockFetch({ content: [{ type: "text", text: "…" }], stop_reason: "max_tokens" });
    const call = makeAdapter({ ...KEYLESS }, f);
    await expect(call("SYS", [], { structured: SCHEMA })).rejects.toThrow(/abgeschnitten/);
  });
});

describe("Adapter · structured (mistral / openai-kompatibel)", () => {
  it("mistral: response_format json_schema mit strict:true; data aus dem Inhalt geparst", async () => {
    const f = mockFetch(M_JSON);
    const call = makeAdapter({ ...DIRECT_M }, f);
    const r = await call("SYS", [{ role: "user", content: "u" }], { structured: SCHEMA });
    expect(f.calls[0].body.response_format).toEqual({
      type: "json_schema",
      json_schema: { name: "bewertung", schema: SCHEMA.schema, strict: true },
    });
    expect(r.data).toEqual({ checks: ["a", "b"] });
  });

  it("openai-kompatibel nutzt dasselbe response_format", async () => {
    const f = mockFetch(M_JSON);
    const call = makeAdapter({ ...DIRECT_O }, f);
    await call("SYS", [], { structured: SCHEMA });
    expect(f.calls[0].body.response_format.json_schema.strict).toBe(true);
  });

  it("Umlaute und Anführungszeichen im Inhalt überstehen den Parse unversehrt", async () => {
    const inhalt = { checks: ['Sie sagte »das schaffst du nicht« und "wirklich?"', "Übergänge, Größe, straße"] };
    const f = mockFetch({ choices: [{ message: { content: JSON.stringify(inhalt) }, finish_reason: "stop" }], usage: {} });
    const call = makeAdapter({ ...DIRECT_M }, f);
    const r = await call("SYS", [], { structured: SCHEMA });
    expect(r.data).toEqual(inhalt);
  });

  it("kaputtes JSON trotz Erzwingung ⇒ Wurf mit Auszug; finish_reason length ⇒ Abschneide-Wurf", async () => {
    const kaputt = mockFetch({ choices: [{ message: { content: '{"checks":[' }, finish_reason: "stop" }], usage: {} });
    await expect(makeAdapter({ ...DIRECT_M }, kaputt)("S", [], { structured: SCHEMA })).rejects.toThrow(/kein JSON/);
    const lang = mockFetch({ choices: [{ message: { content: '{"checks":[' }, finish_reason: "length" }], usage: {} });
    await expect(makeAdapter({ ...DIRECT_M }, lang)("S", [], { structured: SCHEMA })).rejects.toThrow(/abgeschnitten/);
  });

  it("HTTP 422 (Dritt-Deployment ohne json_schema) trägt den Roh-Körper in die Meldung", async () => {
    const f = mockFetch({ message: "response_format must be either 'text' or 'json_object'" }, 422);
    const call = makeAdapter({ ...DIRECT_M, versuche: 1 }, f);
    await expect(call("SYS", [], { structured: SCHEMA })).rejects.toThrow(/json_object/);
  });
});

describe("Adapter · structured über den Proxy", () => {
  it("Client schickt structured mit; die Fassade liefert data zurück", async () => {
    const f = mockFetch({ text: "", data: { checks: ["a"] }, stop: "tool_use", usage: null });
    const call = makeAdapter({ mode: "proxy" }, f);
    const r = await call("SYS", [{ role: "user", content: "u" }], { structured: SCHEMA });
    expect(f.calls[0].body.structured.name).toBe("bewertung");
    expect(f.calls[0].body.structured.schema).toEqual(SCHEMA.schema);
    expect(f.calls[0].init.credentials).toBe("include");
    expect(r.data).toEqual({ checks: ["a"] });
  });
});

describe("Adapter · Optionen-Fassade", () => {
  it("Funktion bleibt onDelta (Altpfad), Objekt sind Optionen", () => {
    const fn = () => {};
    expect(leseAufrufOptionen(fn, undefined).onDelta).toBe(fn);
    expect(leseAufrufOptionen({ structured: SCHEMA }).structured).toBe(SCHEMA);
    expect(leseAufrufOptionen(undefined, undefined).structured).toBeNull();
  });

  it("structured + Streaming wirft bewusst (Worker-Extraktor folgt mit S77)", () => {
    expect(() => leseAufrufOptionen({ structured: SCHEMA, onDelta: () => {} })).toThrow(/S77/);
  });

  it("unvollständiges structured wird abgewiesen (kein Raten)", () => {
    expect(() => leseAufrufOptionen({ structured: {} })).toThrow(/name/);
    expect(() => leseAufrufOptionen({ structured: { name: "x" } })).toThrow(/schema/);
  });

  it("ohne structured bleibt der Request-Körper unverändert (Rückwärtskompatibilität)", async () => {
    const f = mockFetch({ content: [{ type: "text", text: "ok" }], stop_reason: "end_turn", usage: {} });
    const call = makeAdapter({ ...KEYLESS }, f);
    await call("SYS", [{ role: "user", content: "u" }]);
    const body = f.calls[0].body;
    expect(body.tools).toBeUndefined();
    expect(body.tool_choice).toBeUndefined();
    expect(body.response_format).toBeUndefined();
    // S77: thinking gehört seit dem Denkmodus zum normalen Körper — sonst nichts Neues.
    expect(Object.keys(body).sort()).toEqual(["max_tokens", "messages", "model", "system", "thinking"]);
  });
});
