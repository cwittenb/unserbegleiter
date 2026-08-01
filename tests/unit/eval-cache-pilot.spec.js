// ST6a · Cache-Pilot: Turn 1 in zwei Wellen, damit der ~12,7k-Token-System-
// Prompt EINMAL geschrieben und danach gelesen wird (0,20 statt 2,00 je Mio).

import { describe, it, expect } from "vitest";
import { laufeAlleBatch } from "../../evals/runner-batch.js";

const sz = (id, n, me = "Anna") => ({
  id, familie: "T", session: "solo", n, eingaben: ["eins", "zwei"],
  kontext: { me, partner: "Bernd" },
  checks: [{ id: "C1", frage: "ok?", verletztWenn: "nein" }],
});
const urteil = () => ({ content: [{ type: "tool_use", name: "judge_bewertung", input: { checks: [{ id: "C1", verdict: "yes", evidence: "«x»" }] } }], stop_reason: "tool_use", usage: { input_tokens: 1, output_tokens: 1 } });
const text = t => ({ content: [{ type: "text", text: t }], stop_reason: "end_turn", usage: { input_tokens: 100, output_tokens: 20 } });

/** Sammelt die Wellen: je fuehreBatch-Aufruf ein Eintrag. */
function harness() {
  const wellen = [];
  const fuehreBatch = async requests => {
    wellen.push(requests.map(r => r.custom_id));
    const m = new Map();
    for (const r of requests)
      m.set(r.custom_id, { message: r.custom_id.startsWith("j_") ? urteil() : text("Antwort.") });
    return m;
  };
  return { wellen, fuehreBatch };
}
const deps = extra => ({ pipelineModell: "claude-sonnet-5", judgeModell: "claude-opus-4-8", stand: { coreHash: "x" }, batch: {}, ...extra });

describe("Cache-Pilot", () => {
  it("Turn 1 läuft als Pilot + Rest; der Pilot trägt EINE Konversation je Prompt-Variante", async () => {
    const { wellen, fuehreBatch } = harness();
    // Zwei VERSCHIEDENE System-Prompts (unterschiedlicher Kontext) → zwei Piloten.
    await laufeAlleBatch([sz("A-1", 3), sz("A-2", 2, "Bea")], deps({ fuehreBatch }));
    // Welle 0 = Pilot: 2 Prompt-Varianten (A-1, A-2) → 2 Anfragen
    expect(wellen[0]).toHaveLength(2);
    expect(wellen[0].every(c => c.endsWith("_t0"))).toBe(true);
    // Welle 1 = Rest von Turn 1: 5 Konversationen − 2 Piloten = 3
    expect(wellen[1]).toHaveLength(3);
    // Keine Konversation wird doppelt gefahren
    expect(new Set([...wellen[0], ...wellen[1]]).size).toBe(5);
  });

  it("Turn 2 läuft wieder in EINER Welle (Cache steht bereits)", async () => {
    const { wellen, fuehreBatch } = harness();
    await laufeAlleBatch([sz("A-1", 3)], deps({ fuehreBatch }));
    expect(wellen[0]).toHaveLength(1);                       // Pilot
    expect(wellen[1]).toHaveLength(2);                       // Rest Turn 1
    expect(wellen[2].every(c => c.endsWith("_t1"))).toBe(true);
    expect(wellen[2]).toHaveLength(3);                       // Turn 2 komplett
  });

  it("--ohne-cache-pilot: Turn 1 in EINER Welle wie zuvor", async () => {
    const { wellen, fuehreBatch } = harness();
    await laufeAlleBatch([sz("A-1", 3)], deps({ fuehreBatch, ohneCachePilot: true }));
    expect(wellen[0]).toHaveLength(3);
  });

  it("Szenarien mit IDENTISCHEM System-Prompt teilen EINEN Piloten", async () => {
    const { wellen, fuehreBatch } = harness();
    await laufeAlleBatch([sz("A-1", 3), sz("A-2", 3)], deps({ fuehreBatch }));   // gleicher Kontext
    expect(wellen[0]).toHaveLength(1);
    expect(wellen[1]).toHaveLength(5);
  });

  it("nur EINE Prompt-Variante: kein Pilot (er wäre die ganze Welle)", async () => {
    const { wellen, fuehreBatch } = harness();
    await laufeAlleBatch([{ ...sz("A-1", 1) }], deps({ fuehreBatch }));
    expect(wellen[0]).toHaveLength(1);
    expect(wellen[1].every(c => c.endsWith("_t1"))).toBe(true);   // direkt Turn 2
  });

  it("Pilot-Antworten landen im Transkript — keine Konversation verliert ihren Zug", async () => {
    const { fuehreBatch } = harness();
    const b = await laufeAlleBatch([sz("A-1", 3)], deps({ fuehreBatch }));
    for (const s of b.szenarien[0].samples) {
      expect(s.transkript.filter(m => m.role === "assistant")).toHaveLength(2);
      expect(s.unbewertet).toBe(false);
    }
  });
});
