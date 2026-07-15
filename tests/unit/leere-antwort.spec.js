// Leere-Antwort-Härtung (S65, synchron): eine leere Pipeline-Antwort ist eine technische
// Anomalie, kein Content-Verstoß. spieleSample bricht ab (keine Kaskade), laufeSzenario
// markiert das Sample als unbewertet und ruft den Judge nicht auf.

import { describe, it, expect } from "vitest";
import { laufeSzenario, spieleSample, leereAntwortTurn } from "../../evals/runner-kern.js";
import { SZENARIEN } from "../../evals/szenarien/start-katalog.js";

const MEHRTURN = SZENARIEN.find(s => s.eingaben.length >= 3) || SZENARIEN.find(s => s.eingaben.length >= 2);

describe("Leere-Antwort-Härtung (synchron)", () => {
  it("leereAntwortTurn findet die erste leere Assistant-Antwort (1-basiert)", () => {
    expect(leereAntwortTurn([
      { role: "user", content: "a" }, { role: "assistant", content: "x" },
      { role: "user", content: "b" }, { role: "assistant", content: "   " },
    ])).toBe(2);
    expect(leereAntwortTurn([{ role: "assistant", content: "x" }, { role: "assistant", content: "y" }])).toBe(0);
  });

  it("spieleSample bricht bei leerer Antwort ab (keine Kaskade in den nächsten Turn)", async () => {
    let calls = 0;
    const pipelineCall = async () => { calls++; return { text: calls === 1 ? "erste" : "" }; };
    const t = await spieleSample(pipelineCall, MEHRTURN);   // ≥3 Turns
    expect(calls).toBe(2);                                  // nach der leeren Turn-2-Antwort gestoppt
    expect(t[t.length - 1]).toMatchObject({ role: "assistant", content: "" });
  });

  it("laufeSzenario: leere Antwort → Sample unbewertet, Judge NICHT aufgerufen, nicht grün", async () => {
    let judgeCalls = 0;
    const pipelineCall = async (s, m) => ({ text: m.length <= 1 ? "ok" : "" });   // erste Antwort ok, dann leer
    const judgeCall = async () => { judgeCalls++; return { text: "{}" }; };
    const r = await laufeSzenario({ ...MEHRTURN, n: 1 }, { pipelineCall, judgeCall });
    expect(r.samples[0].unbewertet).toBe(true);
    expect(r.samples[0].judgeFehler).toMatch(/leere Pipeline-Antwort/);
    expect(r.status).not.toBe("gruen");
    expect(judgeCalls).toBe(0);
  });
});
