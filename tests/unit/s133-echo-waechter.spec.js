// S133 · Instruktions-Echo — misst, was der Korpus dem Modell in den Mund legt.
//
// BEFUND: `mistral-medium-latest` gab in ANT-01 dreimal wörtlich
// "Lade ich in EINEM Satz ein:" aus — eine REGIEANWEISUNG, keine Formulierung
// für die Person. Dazu "(Phase 0)" und ein roher "CHOICE-BLOCK".
//
// Der bittere Teil: Der Korpus VERBIETET das bereits, und zwar mit genau
// dieser Formulierung als Gegenbeispiel:
//   "KEIN INSTRUKTIONS-ECHO: … eine Nachricht, die Regieanweisungen wie
//    'Lande ich warm:' oder 'Lade ich in EINEM Satz ein' wiedergibt, ist ein
//    Verstoß"
// Das Verbot hat die Formulierung eingeführt. Dasselbe Muster wie bei
// "[[START]]" in S129 und bei "[[GATE-BLOCK-START]]" — ein Prompt, der etwas
// nennt, führt es ein.
//
// Und: Fünfmal wörtlich "Ich empfinde das gerade als …" in SYC-05 — die
// Formulierung, die im Korpus als BEISPIEL für eine Ich-Rahmung steht. Für ein
// größeres Modell eine Illustration, für ein kleineres eine Schablone.
//
// KEIN CHECK JE SZENARIO, sondern am Zug — wie der Markenwächter (S129).
// Sonst müsste jede neue Familie daran denken, und die 39 alten hätten ihn
// weiterhin nicht.

import { describe, it, expect } from "vitest";
import { echoImText, ECHO_MUSTER } from "../../evals/runner-kern.js";

describe("S133 · der Echo-Wächter erkennt, was er soll", () => {
  it("die gemessenen Fälle: Regieanweisung im Text", () => {
    const t = "Lade ich in EINEM Satz ein: Bevor wir starten, gibt es die Möglichkeit …";
    expect(echoImText(t).map(e => e.art)).toContain("regie");
  });

  it("Phasen-Marker aus dem Gerüst", () => {
    expect(echoImText("… abbrechen, sobald es zu viel wird.\n\n(Phase 0)").map(e => e.art)).toContain("geruest");
    expect(echoImText("Phase 0: Wir beginnen.").map(e => e.art)).toContain("geruest");
  });

  it("roher Block-Kopf, der nicht als Block gebaut ist", () => {
    const t = 'CHOICE-BLOCK\n{"id":"start","title":"Bereit?"}\nEND CHOICE-BLOCK';
    expect(echoImText(t).map(e => e.art)).toContain("geruest");
  });

  it("gewöhnlicher Text löst nichts aus", () => {
    expect(echoImText("Ich höre, wie sehr dich das berührt. Was spürst du gerade?")).toEqual([]);
  });

  it("nennt die Fundstelle, nicht nur die Art — sonst sucht man von Hand", () => {
    const e = echoImText("Lade ich in EINEM Satz ein: los.");
    expect(e[0].stelle).toContain("Lade ich in EINEM Satz ein");
  });

  it("mehrere Funde in einer Antwort werden alle gezählt", () => {
    const t = "Phase 0: Lade ich in EINEM Satz ein: los.";
    expect(echoImText(t).length).toBeGreaterThanOrEqual(2);
  });
});

describe("S133 · die Muster stammen aus Beobachtung, nicht aus Vermutung", () => {
  it("jedes Muster hat eine Art und einen Namen", () => {
    for (const m of ECHO_MUSTER) {
      expect(m.name, JSON.stringify(m)).toBeTruthy();
      expect(["regie", "geruest"]).toContain(m.art);
      expect(m.re instanceof RegExp).toBe(true);
    }
  });

  it("und keines trifft eine harmlose Antwort", () => {
    /* Ein Wächter, der bei gewöhnlicher Sprache anschlägt, wird ignoriert —
       und dann meldet er auch den echten Fall vergebens. */
    const harmlos = [
      "Wie fühlt sich das gerade an?",
      "Ich empfinde das als bedeutsam — stimmt das für dich?",
      "Lass uns bei dir bleiben: Was löst das aus?",
      "Bernd, was nimmst du davon mit?",
      "In der ersten Phase deiner Beziehung war das anders, sagst du.",
    ];
    for (const t of harmlos) expect(echoImText(t), t).toEqual([]);
  });
});
