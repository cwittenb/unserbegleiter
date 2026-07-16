// Judge-Golden-Selbsttest (S66) deterministisch bewiesen: pruefeJudge erkennt
// die S52-Fehlurteilsklassen an eingefrorenen Transkripten — mit Mock-Judge,
// ohne API-Key. Der Live-Pfad (runner.js) ruft exakt dieselbe Funktion vor
// jedem echten Lauf und bricht bei Abweichung mit Exit-Code 3 ab.

import { describe, it, expect } from "vitest";
import { GOLDEN, pruefeJudge } from "../../evals/judge/golden.js";

/** Mock-Judge: beantwortet je Fixture-Aufruf mit dem gegebenen ja/nein je Check. */
function mockJudge(antwortFuer) {
  let aufruf = 0;
  return async (_system, _messages) => {
    const g = GOLDEN[aufruf++];
    const antworten = antwortFuer(g);
    return { text: JSON.stringify({ checks: Object.entries(antworten).map(([id, a]) => ({ id, antwort: a, beleg: "«Beleg»" })) }) };
  };
}

describe("Golden Transcripts · Bestand", () => {
  it("drei Fixtures: beide S52-Fehlurteilsklassen plus eine Verstoß-Gegenprobe; jede trägt ihre Lehre", () => {
    expect(GOLDEN.map(g => g.id)).toEqual(["GOLD-SPA", "GOLD-AUF", "GOLD-LEAK"]);
    for (const g of GOLDEN) {
      expect(g.lehre.length, g.id).toBeGreaterThan(10);
      expect(g.szenario.checks.length, g.id).toBeGreaterThan(0);
      expect(Object.keys(g.erwartet), g.id).toEqual(g.szenario.checks.map(c => c.id));
      expect(g.transkript.some(m => m.role === "assistant"), g.id).toBe(true);
    }
    // Die Gegenprobe erwartet einen ERKANNTEN Verstoß — der Judge darf nicht nur freisprechen.
    expect(GOLDEN.find(g => g.id === "GOLD-LEAK").erwartet.C1).toBe("ja");
  });
});

describe("pruefeJudge · Urteilsvergleich", () => {
  it("kalibrierter Judge (liefert Soll-Urteile) → ok, keine Abweichungen", async () => {
    const r = await pruefeJudge(mockJudge(g => g.erwartet), { versuche: 1, schlaf: async () => {} });
    expect(r).toEqual({ ok: true, abweichungen: [] });
  });

  it("dekalibrierter Judge (S52-Klasse: rechnet PERSON-Zahlen der Begleitung zu) → Abweichung mit Lehre", async () => {
    const r = await pruefeJudge(mockJudge(g => (g.id === "GOLD-SPA" ? { C1: "ja" } : g.erwartet)),
      { versuche: 1, schlaf: async () => {} });
    expect(r.ok).toBe(false);
    expect(r.abweichungen).toHaveLength(1);
    expect(r.abweichungen[0]).toMatchObject({ id: "GOLD-SPA", check: "C1", erwartet: "nein", erhalten: "ja" });
    expect(r.abweichungen[0].lehre).toMatch(/PERSON/);
  });

  it("Judge liefert Unparsebares trotz Retries → Fixture zählt als Abweichung (unbewertet ≠ bestanden)", async () => {
    const kaputt = async () => ({ text: "gar kein json" });
    const r = await pruefeJudge(kaputt, { versuche: 1, schlaf: async () => {} });
    expect(r.ok).toBe(false);
    expect(r.abweichungen.length).toBe(GOLDEN.length);
    expect(r.abweichungen[0].erhalten).toMatch(/unbewertet/);
  });
});
