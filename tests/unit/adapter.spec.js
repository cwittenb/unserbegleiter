// LLM-Adapter — Format-Übersetzungen (Spez §4.4) gegen Mock-fetch.

import { describe, it, expect } from "vitest";
import { makeAdapter } from "../../core/llm/adapter.js";

function mockFetch(antwort) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    return {
      status: 200,
      json: async () => (typeof antwort === "function" ? antwort(calls.length) : antwort),
    };
  };
  fn.calls = calls;
  return fn;
}

const ANTHROPIC_OK = {
  content: [{ type: "text", text: "Hallo " }, { type: "text", text: "Welt" }],
  stop_reason: "end_turn",
  usage: { input_tokens: 100, output_tokens: 20, cache_creation_input_tokens: 90, cache_read_input_tokens: 0 },
};
const OPENAI_OK = {
  choices: [{ message: { content: " Antwort " }, finish_reason: "stop" }],
  usage: { prompt_tokens: 50, completion_tokens: 10 },
};

describe("Adapter · Anthropic keyless (Artefakt)", () => {
  it("Body: cache_control auf System-Prompt UND letztem Turn; keine Auth-Header", async () => {
    const f = mockFetch(ANTHROPIC_OK);
    const call = makeAdapter({ provider: "anthropic", mode: "keyless" }, f);
    const r = await call("SYS", [{ role: "user", content: "u1" }, { role: "assistant", content: "a1" }, { role: "user", content: "u2" }]);
    const { url, init, body } = f.calls[0];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect(init.headers["x-api-key"]).toBeUndefined();
    expect(body.system[0]).toMatchObject({ type: "text", text: "SYS", cache_control: { type: "ephemeral" } });
    expect(body.messages).toHaveLength(3);
    const last = body.messages[2];
    expect(last.content[0].cache_control).toEqual({ type: "ephemeral" });   // Rolling-Cache
    expect(body.messages[0].content).toBe("u1");                            // frühe Turns unmarkiert
    expect(r.text).toBe("Hallo \nWelt");
    expect(r.stop).toBe("end_turn");
    expect(r.usage).toEqual({ in: 100, out: 20, cacheWrite: 90, cacheRead: 0 });
  });

  it("cache:false → schlichter System-String, keine content-Blöcke", async () => {
    const f = mockFetch(ANTHROPIC_OK);
    const call = makeAdapter({ mode: "keyless", cache: false }, f);
    await call("SYS", [{ role: "user", content: "u" }]);
    expect(f.calls[0].body.system).toBe("SYS");
    expect(f.calls[0].body.messages[0].content).toBe("u");
  });

  it("versteckte Nachrichten gehen ANS MODELL mit (hidden ist reine Anzeige-Semantik)", async () => {
    const f = mockFetch(ANTHROPIC_OK);
    const call = makeAdapter({ mode: "keyless" }, f);
    await call("SYS", [{ role: "user", content: "[SYSTEM-REVISION: …]", hidden: true }]);
    expect(f.calls[0].body.messages[0].content[0].text).toContain("SYSTEM-REVISION");
    expect(f.calls[0].body.messages[0].hidden).toBeUndefined();   // Meta-Felder bleiben draußen
  });
});

describe("Adapter · Anthropic direct (Eval-Runner/Worker)", () => {
  it("setzt Key-Header und Version", async () => {
    const f = mockFetch(ANTHROPIC_OK);
    const call = makeAdapter({ mode: "direct", apiKey: "sk-test" }, f);
    await call("SYS", []);
    const h = f.calls[0].init.headers;
    expect(h["x-api-key"]).toBe("sk-test");
    expect(h["anthropic-version"]).toBe("2023-06-01");
  });

  it("direct ohne Key wird bei Konstruktion abgewiesen", () => {
    expect(() => makeAdapter({ mode: "direct" }, mockFetch({}))).toThrow(/API-Key/);
  });
});

describe("Adapter · OpenAI-kompatibel (Mistral)", () => {
  it('Body: role:"system" + Bearer; usage-Parsing ohne Cache-Felder', async () => {
    const f = mockFetch(OPENAI_OK);
    const call = makeAdapter({ provider: "mistral", mode: "direct", apiKey: "mk" }, f);
    const r = await call("SYS", [{ role: "user", content: "u" }]);
    const { url, init, body } = f.calls[0];
    expect(url).toContain("api.mistral.ai");
    expect(init.headers.Authorization).toBe("Bearer mk");
    expect(body.messages[0]).toEqual({ role: "system", content: "SYS" });
    expect(body.messages[1]).toEqual({ role: "user", content: "u" });
    expect(r).toEqual({ text: "Antwort", stop: "stop", usage: { in: 50, out: 10, cacheWrite: null, cacheRead: null } });
  });

  it("Nicht-Anthropic ohne direct-Modus wird abgewiesen", () => {
    expect(() => makeAdapter({ provider: "mistral", mode: "keyless" }, mockFetch({}))).toThrow(/direct/);
  });
});

describe("Adapter · Proxy (Cloudflare-Client)", () => {
  it("POST an /api/llm mit Fassaden-Parametern und Cookie-Mitnahme", async () => {
    const f = mockFetch({ text: "vom Worker", stop: "end_turn", usage: { in: 1, out: 1 } });
    const call = makeAdapter({ mode: "proxy" }, f);
    const r = await call("SYS", [{ role: "user", content: "u", hidden: true }]);
    const { url, init, body } = f.calls[0];
    expect(url).toBe("/api/llm");
    expect(init.credentials).toBe("include");
    expect(body).toEqual({ system: "SYS", messages: [{ role: "user", content: "u" }] });
    expect(r.text).toBe("vom Worker");
  });

  it("401 → verständliche Sitzungs-Meldung", async () => {
    const f = async () => ({ status: 401, json: async () => ({}) });
    const call = makeAdapter({ mode: "proxy" }, f);
    await expect(call("S", [])).rejects.toThrow(/Sitzung abgelaufen/);
  });
});

describe("Adapter · Fehler aus der API", () => {
  it("Anthropic error-Objekt wird zum Wurf", async () => {
    const f = mockFetch({ error: { message: "overloaded" } });
    const call = makeAdapter({ mode: "keyless" }, f);
    await expect(call("S", [])).rejects.toThrow("overloaded");
  });
});
