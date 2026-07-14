// Adapter-Resilienz (S51) — HTTP-Status wird zum Fehler (nicht still text:""),
// Retry bei 429/5xx mit Retry-After, geteilte Drossel greift. Gegen Mock-fetch.

import { describe, it, expect } from "vitest";
import { makeAdapter, LlmHttpError, parseRetryAfter, baueDrossel } from "../../core/llm/adapter.js";

const MISTRAL = { provider: "mistral", mode: "direct", apiKey: "mk", models: { mistral: "test-modell" } };
const OPENAI_OK = { choices: [{ message: { content: "Antwort" }, finish_reason: "stop" }], usage: { prompt_tokens: 5, completion_tokens: 2 } };

/** Antwort-Attrappe mit Status, optionalen Headern und Body. */
function resp(status, { body = {}, headers = {}, text } = {}) {
  return {
    status,
    headers: { get: n => headers[n.toLowerCase()] ?? null },
    json: async () => body,
    text: async () => (text !== undefined ? text : JSON.stringify(body)),
  };
}

/** fetch, das eine Folge von Antworten abspielt (eine je Aufruf). */
function folgeFetch(antworten) {
  const calls = [];
  const fn = async (url, init) => { calls.push({ url, init }); return antworten[calls.length - 1]; };
  fn.calls = calls;
  return fn;
}

describe("parseRetryAfter", () => {
  it("liest Sekunden und HTTP-Date; fehlend → null", () => {
    expect(parseRetryAfter(resp(429, { headers: { "retry-after": "12" } }))).toBe(12);
    const inZukunft = new Date(Date.now() + 5000).toUTCString();
    const s = parseRetryAfter(resp(429, { headers: { "retry-after": inZukunft } }));
    expect(s).toBeGreaterThan(3);
    expect(s).toBeLessThanOrEqual(6);
    expect(parseRetryAfter(resp(429))).toBeNull();
  });
});

describe("Adapter · HTTP-Fehler statt stillem Leer-Turn", () => {
  it("Mistral-429 OHNE .error-Feld wirft LlmHttpError (früher: still text:\"\")", async () => {
    // Genau das frühere Fehlerbild: 429-Body ohne OpenAI-.error-Struktur.
    const f = folgeFetch([resp(429, { body: { message: "rate limit" } })]);
    const call = makeAdapter({ ...MISTRAL, versuche: 1 }, f);
    await expect(call("SYS", [{ role: "user", content: "u" }])).rejects.toBeInstanceOf(LlmHttpError);
    expect(f.calls).toHaveLength(1);
  });

  it("400 (nicht wiederholbar) wirft sofort, ohne Retry", async () => {
    const f = folgeFetch([resp(400, { body: { message: "bad" } })]);
    const call = makeAdapter({ ...MISTRAL, versuche: 4, schlaf: async () => {} }, f);
    await expect(call("SYS", [])).rejects.toMatchObject({ status: 400 });
    expect(f.calls).toHaveLength(1);   // 4xx≠429 wird nicht wiederholt
  });
});

describe("Adapter · Retry bei 429/5xx", () => {
  it("429 → wartet Retry-After, wiederholt, dann Erfolg", async () => {
    const geschlafen = [];
    const f = folgeFetch([
      resp(429, { headers: { "retry-after": "3" }, body: { message: "slow down" } }),
      resp(200, { body: OPENAI_OK }),
    ]);
    const call = makeAdapter({ ...MISTRAL, versuche: 4, schlaf: async ms => geschlafen.push(ms) }, f);
    const r = await call("SYS", [{ role: "user", content: "u" }]);
    expect(r.text).toBe("Antwort");
    expect(f.calls).toHaveLength(2);
    expect(geschlafen).toEqual([3000]);   // Retry-After respektiert
  });

  it("500 → Exponential-Backoff, dann Erfolg", async () => {
    const geschlafen = [];
    const f = folgeFetch([
      resp(500, { body: { message: "boom" } }),
      resp(200, { body: OPENAI_OK }),
    ]);
    const call = makeAdapter({ ...MISTRAL, versuche: 4, backoffMs: 1000, schlaf: async ms => geschlafen.push(ms) }, f);
    const r = await call("SYS", []);
    expect(r.text).toBe("Antwort");
    expect(geschlafen).toEqual([1000]);   // backoffMs * 2^0
  });

  it("dauerhaft 429 → nach erschöpften Versuchen wirft LlmHttpError", async () => {
    const f = folgeFetch([
      resp(429, { body: {} }), resp(429, { body: {} }), resp(429, { body: {} }),
    ]);
    const call = makeAdapter({ ...MISTRAL, versuche: 3, backoffMs: 1, schlaf: async () => {} }, f);
    await expect(call("SYS", [])).rejects.toMatchObject({ name: "LlmHttpError", status: 429 });
    expect(f.calls).toHaveLength(3);
  });
});

describe("Adapter · geteilte Drossel greift vor jedem Request", () => {
  it("Drossel wird pro Aufruf einmal ausgelöst (Slot-Zeit vergeht)", async () => {
    let t = 0;
    const uhr = { jetzt: () => t, schlaf: async ms => { t += ms; } };
    const drossel = baueDrossel({ rpm: 2, uhr });   // 30 s
    const f = folgeFetch([resp(200, { body: OPENAI_OK }), resp(200, { body: OPENAI_OK })]);
    const call = makeAdapter({ ...MISTRAL, drossel }, f);
    await call("SYS", []);
    await call("SYS", []);
    expect(t).toBe(30000);   // zweiter Aufruf musste einen Slot abwarten
  });
});
