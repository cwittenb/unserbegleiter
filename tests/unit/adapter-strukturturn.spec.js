// ST1.4 / ST3 · Adapter im Struktur-Modus: output_config-Mechanik (ST3),
// keyless-Rettungs-Ereignis und die eine Korrektur-Runde ohne Formgarantie —
// direct bleibt hart. Der R3-Wächter (ST1.5) ist mit dem Mechanikwechsel
// GEFALLEN: output_config ist thinking-kompatibel.

import { describe, it, expect, vi } from "vitest";
import { makeAdapter, STRUKTUR_KORREKTUR } from "../../core/llm/adapter.js";

const STRUCT = { name: "turn", schema: { type: "object", properties: { antwort: { type: "string" } }, required: ["antwort"] } };
const antwortJson = (content, stop = "tool_use") => ({
  ok: true, status: 200,
  json: async () => ({ content, stop_reason: stop, usage: {} }),
});
const cfgKeyless = { mode: "keyless", provider: "anthropic", models: { anthropic: "test-modell" }, thinking: "disabled", stream: false };

describe("Adapter · Struktur-Härtung (ST1)", () => {
  it("ST3 · structuredBody: output_config statt tools/tool_choice, Schema dialekt-gewandelt", async () => {
    const fetchMock = vi.fn(async () => antwortJson([{ type: "text", text: '{"antwort":"Hallo."}' }], "end_turn"));
    const call = makeAdapter({ mode: "direct", provider: "anthropic", apiKey: "k", models: { anthropic: "m" }, thinking: "disabled", stream: false }, fetchMock);
    const schema = { name: "turn", schema: { type: "object", properties: { antwort: { type: "string" } }, required: ["antwort"], anyOf: [{ required: ["antwort"] }] } };
    const r = await call("sys", [{ role: "user", content: "hi" }], { structured: schema });
    expect(r.data).toEqual({ antwort: "Hallo." });
    expect(r.strukturQuelle).toBe("schema");
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.tools).toBeUndefined();
    expect(body.tool_choice).toBeUndefined();
    expect(body.output_config.format.type).toBe("json_schema");
    // Dialekt: anyOf-Geschwister aufgelöst → reines anyOf am Wurzelknoten
    expect(body.output_config.format.schema.anyOf).toBeTruthy();
    expect(body.output_config.format.schema.properties).toBeUndefined();
  });

  it("ST3 · R3 ist gefallen: structured + thinking adaptiv wirft NICHT mehr", async () => {
    const fetchMock = vi.fn(async () => antwortJson([{ type: "text", text: '{"antwort":"ok"}' }], "end_turn"));
    const call = makeAdapter({ mode: "direct", provider: "anthropic", apiKey: "k", models: { anthropic: "m" }, thinking: "adaptiv", stream: false }, fetchMock);
    const r = await call("sys", [{ role: "user", content: "hi" }], { structured: STRUCT });
    expect(r.data).toEqual({ antwort: "ok" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("ST3 · Alt-Kompatibilität: eine tool_use-Antwort wird weiter gedeutet (Quelle tool)", async () => {
    const fetchMock = vi.fn(async () => antwortJson([{ type: "tool_use", name: "turn", input: { antwort: "alt" } }]));
    const call = makeAdapter({ mode: "direct", provider: "anthropic", apiKey: "k", models: { anthropic: "m" }, thinking: "disabled", stream: false }, fetchMock);
    const r = await call("sys", [{ role: "user", content: "hi" }], { structured: STRUCT });
    expect(r.data).toEqual({ antwort: "alt" });
    expect(r.strukturQuelle).toBe("tool");
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
    expect(zweitBody.output_config.format.type).toBe("json_schema");       // Nachfassen bleibt erzwungen angefragt (ST3-Mechanik)
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
