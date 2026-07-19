// S77 · Der Eval-Kern behandelt abgeschnittene Antworten wie leere: technische
// Anomalie, nicht bestanden, KEIN Content-Verstoß. Ein am Token-Limit
// abgebrochener Halbsatz ist keine bewertbare Begleitung — vorher wanderte er
// unbemerkt ins Transkript und wurde gerichtet, als wäre er vollständig.

import { describe, it, expect } from "vitest";
import { spieleSample, anomalieImTranskript, leereAntwortTurn, laufeSzenario } from "../../evals/runner-kern.js";
import { SZENARIEN } from "../../evals/szenarien/start-katalog.js";

const LEAK = SZENARIEN.find(s => s.id === "LEAK-S1");
const ESK = SZENARIEN.find(s => s.id === "ESK-07");
const judgeOk = async () => ({ data: { checks: [{ id: "C1", verdict: "no", evidence: "«Beleg»" }] } });

describe("Anomalie-Erkennung im Transkript (S77)", () => {
  it("erkennt die leere Antwort weiterhin (S65 unverändert)", () => {
    const t = [{ role: "user", content: "u" }, { role: "assistant", content: "  " }];
    expect(anomalieImTranskript(t)).toEqual({ turn: 1, grund: "leere Pipeline-Antwort" });
    expect(leereAntwortTurn(t)).toBe(1);
  });

  it("erkennt die abgeschnittene Antwort mit eigener Begründung", () => {
    const t = [{ role: "user", content: "u" }, { role: "assistant", content: "Ich höre, dass", abgeschnitten: true }];
    expect(anomalieImTranskript(t)).toEqual({ turn: 1, grund: "abgeschnittene Pipeline-Antwort (Token-Limit)" });
    expect(leereAntwortTurn(t)).toBe(0);          // für den Altdetektor unsichtbar — genau die Lücke
  });

  it("sauberes Transkript ⇒ keine Anomalie", () => {
    expect(anomalieImTranskript([{ role: "assistant", content: "vollständig" }])).toBeNull();
  });
});

describe("spieleSample bricht bei Abschneidung ab (S77)", () => {
  it("markiert den Turn und kaskadiert nicht weiter", async () => {
    let n = 0;
    const pipe = async () => (++n === 1
      ? { text: "Ich höre, dass dich das", stop: "max_tokens", abgeschnitten: true }
      : { text: "weiter", stop: "end_turn" });
    const t = await spieleSample(pipe, ESK);
    expect(n).toBe(1);                                   // zweite Eingabe wird nicht mehr gespielt
    expect(t[1].abgeschnitten).toBe(true);
    expect(t[1].content).toBe("Ich höre, dass dich das");  // Text bleibt erhalten
  });

  it("vollständige Antworten tragen kein Merkmal", async () => {
    const pipe = async () => ({ text: "ok", stop: "end_turn" });
    const t = await spieleSample(pipe, ESK);
    expect(t.every(m => m.abgeschnitten === undefined)).toBe(true);
  });
});

describe("Szenario-Ergebnis bei Abschneidung (S77)", () => {
  it("zählt als unbewertet mit klarer Begründung — nie als bestanden, nie als verletzt", async () => {
    const pipe = async () => ({ text: "Ein halber Sa", stop: "max_tokens", abgeschnitten: true });
    const r = await laufeSzenario({ ...LEAK, n: 1 }, { pipelineCall: pipe, judgeCall: judgeOk, judgeOpts: { schlaf: async () => {} } });
    expect(r.status).toBe("unbewertet — nicht bestanden");
    expect(r.unbewerteteSamples).toBe(1);
    expect(r.verletzteSamples).toBe(0);
    expect(JSON.stringify(r)).toContain("abgeschnittene Pipeline-Antwort");
  });

  it("der Judge wird bei Abschneidung gar nicht erst befragt (kein Urteil über Halbsätze)", async () => {
    let judgeRufe = 0;
    const judge = async (...a) => { judgeRufe++; return judgeOk(...a); };
    const pipe = async () => ({ text: "Ein halber Sa", stop: "max_tokens", abgeschnitten: true });
    await laufeSzenario({ ...LEAK, n: 1 }, { pipelineCall: pipe, judgeCall: judge, judgeOpts: { schlaf: async () => {} } });
    expect(judgeRufe).toBe(0);
  });
});
