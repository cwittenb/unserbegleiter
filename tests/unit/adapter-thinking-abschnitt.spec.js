// S77 · Denkmodus und Abschneide-Erkennung.
//
// Befund, der dazu führte: claude-sonnet-5 denkt adaptiv von sich aus, und
// max_tokens deckelt die GESAMTE Ausgabe (Thinking + Text). Gemessen mit dem
// 1024er Budget: 4 von 11 Turns lieferten NUR thinking-Blöcke und leeren Text
// (stop=max_tokens), ein weiterer einen mitten im Satz abgeschnittenen Halbsatz,
// der unbemerkt ins Transkript wanderte und bewertet wurde.
//
// Regeln seither: Denkmodus explizit; abgeschnitten + leer ⇒ harter Wurf;
// abgeschnitten + Text ⇒ Fassade trägt abgeschnitten:true.

import { describe, it, expect } from "vitest";
import { makeAdapter, LLM_DEFAULTS, istAbgeschnitten, markiereAbschnitt } from "../../core/llm/adapter.js";

const A = { provider: "anthropic", mode: "keyless", models: { anthropic: "test-modell" } };
const M = { provider: "mistral", mode: "direct", apiKey: "mk", models: { mistral: "test-modell" }, versuche: 1 };

function mockFetch(antwort) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    return { status: 200, json: async () => antwort, text: async () => JSON.stringify(antwort) };
  };
  fn.calls = calls;
  return fn;
}
const anthropicAntwort = (text, stop) => ({
  content: text === null ? [{ type: "thinking", thinking: "", signature: "x" }]
                         : [{ type: "thinking", thinking: "", signature: "x" }, { type: "text", text }],
  stop_reason: stop,
  usage: { input_tokens: 3, output_tokens: 1024 },
});

describe("Denkmodus (S77)", () => {
  it("Vorgabe ist disabled und wird als thinking:{type:disabled} mitgesendet", async () => {
    expect(LLM_DEFAULTS.thinking).toBe("disabled");
    const f = mockFetch(anthropicAntwort("ok", "end_turn"));
    await makeAdapter({ ...A }, f)("SYS", [{ role: "user", content: "u" }]);
    expect(f.calls[0].body.thinking).toEqual({ type: "disabled" });
  });

  it("adaptiv lässt das Feld weg (Modell entscheidet selbst)", async () => {
    const f = mockFetch(anthropicAntwort("ok", "end_turn"));
    await makeAdapter({ ...A, thinking: "adaptiv" }, f)("SYS", []);
    expect(f.calls[0].body.thinking).toBeUndefined();
  });

  it("Denkmodus ist ein Anthropic-Begriff — der OpenAI-kompatible Körper bleibt frei davon", async () => {
    const f = mockFetch({ choices: [{ message: { content: "ok" }, finish_reason: "stop" }], usage: {} });
    await makeAdapter({ ...M }, f)("SYS", []);
    expect(f.calls[0].body.thinking).toBeUndefined();
  });

  it("maxTokens-Vorgabe ist auf 4096 angehoben (neuer Tokenizer + Denkbudget)", () => {
    expect(LLM_DEFAULTS.maxTokens).toBe(4096);
  });
});

describe("Abschneide-Erkennung (S77)", () => {
  it("erkennt beide Provider-Schreibweisen", () => {
    expect(istAbgeschnitten("max_tokens")).toBe(true);
    expect(istAbgeschnitten("length")).toBe(true);
    expect(istAbgeschnitten("end_turn")).toBe(false);
  });

  it("abgeschnitten OHNE Text ⇒ harter Wurf mit Handlungshinweis", async () => {
    const f = mockFetch(anthropicAntwort(null, "max_tokens"));
    await expect(makeAdapter({ ...A }, f)("SYS", [])).rejects.toThrow(/abgeschnitten, bevor Text begann/);
    await expect(makeAdapter({ ...A }, f)("SYS", [])).rejects.toThrow(/maxTokens|Denkmodus/);
  });

  it("abgeschnitten MIT Text ⇒ Text bleibt erhalten, Fassade trägt abgeschnitten:true", async () => {
    const f = mockFetch(anthropicAntwort("Ich höre, dass dich das", "max_tokens"));
    const r = await makeAdapter({ ...A }, f)("SYS", []);
    expect(r.text).toBe("Ich höre, dass dich das");
    expect(r.abgeschnitten).toBe(true);
  });

  it("vollständige Antwort trägt KEIN abgeschnitten-Merkmal", async () => {
    const f = mockFetch(anthropicAntwort("Vollständig.", "end_turn"));
    const r = await makeAdapter({ ...A }, f)("SYS", []);
    expect(r.abgeschnitten).toBeUndefined();
  });

  it("gilt gleichermaßen für den OpenAI-kompatiblen Pfad (finish_reason length)", async () => {
    const leer = mockFetch({ choices: [{ message: { content: "" }, finish_reason: "length" }], usage: {} });
    await expect(makeAdapter({ ...M }, leer)("SYS", [])).rejects.toThrow(/abgeschnitten/);
    const teil = mockFetch({ choices: [{ message: { content: "halb" }, finish_reason: "length" }], usage: {} });
    expect((await makeAdapter({ ...M }, teil)("SYS", [])).abgeschnitten).toBe(true);
  });

  it("markiereAbschnitt ist rein: unveränderte Ergebnisse bleiben identisch", () => {
    const e = { text: "a", stop: "end_turn", usage: {} };
    expect(markiereAbschnitt(e)).toBe(e);
  });
});
