// ST1.4/ST1.5 · Adapter: Thinking-Wächter (R3), keyless-Rettungs-Ereignis und
// die eine Korrektur-Runde ohne Formgarantie — direct bleibt hart.

import { describe, it, expect, vi } from "vitest";
import { makeAdapter, STRUKTUR_KORREKTUR } from "../../core/llm/adapter.js";

const STRUCT = { name: "turn", schema: { type: "object", properties: { antwort: { type: "string" } }, required: ["antwort"] } };
const antwortJson = (content, stop = "tool_use") => ({
  ok: true, status: 200,
  json: async () => ({ content, stop_reason: stop, usage: {} }),
});
const cfgKeyless = { mode: "keyless", provider: "anthropic", models: { anthropic: "test-modell" }, thinking: "disabled", stream: false };

describe("Adapter · Struktur-Härtung (ST1)", () => {
  it("R3-Wächter: structured + thinking≠disabled bei anthropic → SYNCHRONER Klartext-Wurf, kein Request", () => {
    const fetchMock = vi.fn();
    const call = makeAdapter({ mode: "direct", provider: "anthropic", apiKey: "k", models: { anthropic: "m" }, thinking: "adaptiv" }, fetchMock);
    expect(() => call("sys", [{ role: "user", content: "hi" }], { structured: STRUCT }))
      .toThrow(/thinking "disabled"/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keyless-Rettung (S85): strukturQuelle text → onStatus(struktur_rettung)", async () => {
    const fetchMock = vi.fn(async () => antwortJson(
      [{ type: "text", text: '```json\n{"antwort":"Hallo."}\n```' }], "end_turn"));
    const call = makeAdapter(cfgKeyless, fetchMock);
    const stati = [];
    const r = await call("sys", [{ role: "user", content: "hi" }], { structured: STRUCT, onStatus: s => stati.push(s) });
    expect(r.data).toEqual({ antwort: "Hallo." });
    expect(r.strukturQuelle).toBe("text");
    expect(stati).toEqual(["struktur_rettung"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);                 // Rettung braucht keine zweite Runde
  });

  it("keyless-Korrektur-Runde: reine Prosa → GENAU EIN Nachfassen mit eigener Antwort + Formforderung", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(antwortJson([{ type: "text", text: "Ich antworte einfach als Fließtext." }], "end_turn"))
      .mockResolvedValueOnce(antwortJson([{ type: "tool_use", name: "turn", input: { antwort: "Jetzt strukturiert." } }]));
    const call = makeAdapter(cfgKeyless, fetchMock);
    const stati = [];
    const r = await call("sys", [{ role: "user", content: "hi" }], { structured: STRUCT, onStatus: s => stati.push(s) });
    expect(r.data).toEqual({ antwort: "Jetzt strukturiert." });
    expect(r.strukturQuelle).toBe("tool");
    expect(stati).toEqual(["struktur_korrektur"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const zweitBody = JSON.parse(fetchMock.mock.calls[1][1].body);
    const rollen = zweitBody.messages.map(m => m.role);
    expect(rollen.at(-2)).toBe("assistant");                    // die eigene Prosa-Antwort
    expect(JSON.stringify(zweitBody.messages.at(-2))).toContain("Fließtext");
    const letzte = zweitBody.messages.at(-1);
    expect(letzte.role).toBe("user");
    expect(JSON.stringify(letzte.content)).toContain("SYSTEM-REVISION");
    expect(STRUKTUR_KORREKTUR).toContain("no Markdown fences");
    expect(zweitBody.tool_choice).toEqual({ type: "tool", name: "turn" });  // Nachfassen bleibt erzwungen angefragt
  });

  it("keyless: scheitert auch das Nachfassen, kommt der harte Ursprungs-Fehler (kein drittes Mal)", async () => {
    const prosa = antwortJson([{ type: "text", text: "Wieder nur Text." }], "end_turn");
    const fetchMock = vi.fn(async () => prosa);
    const call = makeAdapter({ ...cfgKeyless, versuche: 1 }, fetchMock);
    await expect(call("sys", [{ role: "user", content: "hi" }], { structured: STRUCT }))
      .rejects.toThrow(/Strukturausgabe fehlt/);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("direct: KEINE Korrektur-Runde — ein Formfehler dort ist ein echter Defekt", async () => {
    const fetchMock = vi.fn(async () => antwortJson([{ type: "text", text: "Nur Prosa." }], "end_turn"));
    const call = makeAdapter({ mode: "direct", provider: "anthropic", apiKey: "k", models: { anthropic: "m" }, thinking: "disabled", stream: false, versuche: 1 }, fetchMock);
    await expect(call("sys", [{ role: "user", content: "hi" }], { structured: STRUCT }))
      .rejects.toThrow(/Strukturausgabe fehlt/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
