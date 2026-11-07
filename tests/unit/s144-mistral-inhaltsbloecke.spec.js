// S144 · Mistral Large 4 liefert `content` als Blockliste (Reasoning + Text).
// Befund 07.11.: D/GATE-S1 brach mit "trim is not a function" ab; im
// Streaming-Pfad wäre die Antwort still verschwunden (nur Strings angenommen).
// Negativfall zuerst: Reasoning darf NIE bei der Person ankommen.

import { describe, it, expect } from "vitest";
import { openaiCompat, textAusInhalt } from "../../core/llm/providers/openai-kompatibel.js";

const BLOECKE = [
  { type: "thinking", thinking: [{ type: "text", text: "GEHEIMES REASONING" }] },
  { type: "text", text: "Hallo " },
  { type: "text", text: "Anna." },
];

function sse(events) {
  const enc = new TextEncoder();
  const roh = events.map(e => "data: " + JSON.stringify(e) + "\n\n").join("") + "data: [DONE]\n\n";
  return { body: new ReadableStream({ start(c) { c.enqueue(enc.encode(roh)); c.close(); } }) };
}

describe("S144 · textAusInhalt", () => {
  it("String bleibt String (Medium, alle bisherigen Modelle)", () => {
    expect(textAusInhalt("Hallo")).toBe("Hallo");
  });
  it("Blockliste: nur text-Blöcke, Reasoning verworfen", () => {
    expect(textAusInhalt(BLOECKE)).toBe("Hallo Anna.");
    expect(textAusInhalt(BLOECKE)).not.toContain("REASONING");
  });
  it("null, undefined, Unbekanntes → leerer String statt Absturz", () => {
    for (const x of [null, undefined, 42, {}, [null, { type: "text" }]]) expect(textAusInhalt(x)).toBe("");
  });
});

describe("S144 · Provider-Pfade mit Blockliste", () => {
  const p = openaiCompat("https://example.invalid", "mistral");

  it("parse: Blockliste → Antworttext", () => {
    const r = p.parse({ choices: [{ message: { content: BLOECKE }, finish_reason: "stop" }], usage: { prompt_tokens: 1, completion_tokens: 2 } });
    expect(r.text).toBe("Hallo Anna.");
  });

  it("parse: String-Inhalt unverändert", () => {
    const r = p.parse({ choices: [{ message: { content: "  Hallo  " }, finish_reason: "stop" }] });
    expect(r.text).toBe("Hallo");
  });

  it("streamParse: Blocklisten-Deltas kommen an, Reasoning-Deltas nicht", async () => {
    const deltas = [];
    const r = await p.streamParse(sse([
      { choices: [{ delta: { content: [{ type: "thinking", thinking: [{ type: "text", text: "GEHEIM" }] }] } }] },
      { choices: [{ delta: { content: [{ type: "text", text: "Hallo " }] } }] },
      { choices: [{ delta: { content: "Anna." }, finish_reason: "stop" }] },
    ]), d => deltas.push(d));
    expect(r.text).toBe("Hallo Anna.");
    expect(deltas.join("")).toBe("Hallo Anna.");
    expect(deltas.join("")).not.toContain("GEHEIM");
  });

  it("streamStructuredParse: JSON aus Text-Blöcken", async () => {
    const r = await p.streamStructuredParse(sse([
      { choices: [{ delta: { content: [{ type: "thinking", thinking: [] }] } }] },
      { choices: [{ delta: { content: [{ type: "text", text: '{"antwort":' }] } }] },
      { choices: [{ delta: { content: '"ok"}' }, finish_reason: "stop" }] },
    ]), () => {});
    expect(r.data).toEqual({ antwort: "ok" });
  });
});
