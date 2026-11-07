// S145 · Fassungstreue — Herkunftsregel im Korpus.
//
// Befund (Kalibrierung + Kurzlauf 07.11.): GATE-S1/C2 bei ALLEN Modellen 100 %
// verletzt. Ursache war der Korpus selbst: Vier Stellen verlangten Konkretheit,
// ohne zu sagen, woher sie kommt — das Modell erfand Situation, Motiv,
// Zeitangabe und Selbstanteil, um die eigenen Kriterien zu bestehen.
//
// Entscheide 07.11.: G1 Hinzugedichtetes ist Verstoß, als Vermutung an Anna
// nicht · F1 offengelegte Ergänzung mit Rückfrage ist erlaubt · F2 a
// Selbstanteil bleibt Pflicht, wird erfragt, nie vermutet.
//
// Testphilosophie: Die alten Formulierungen stehen als NEGATIV-Assertions —
// kommen sie zurück, schlägt das hier an. Geprüft wird der ZUSAMMENGESETZTE
// Prompt (was das Modell sieht), nicht nur die .md-Quelle.

import { describe, it, expect } from "vitest";
import * as DE from "../../core/prompts/prompts.de.js";
import * as EN from "../../core/prompts/prompts.en.js";
import { SZENARIEN } from "../../evals/szenarien/start-katalog.js";
import { SZENARIEN_EN } from "../../evals/szenarien/start-katalog.en.js";

// Positionsargumente (name, partner) — ein Objekt ergäbe "[object Object]s Worten".
const solo = { de: DE.reflexionsPrompt("Anna", "Bernd"), en: EN.reflexionsPrompt("Anna", "Bernd") };
const moment = { de: DE.momentPrompt("Anna", "Bernd"), en: EN.momentPrompt("Anna", "Bernd") };

describe("S145 · Q1 Querungsgrammatik — die Lücke füllt die Person", () => {
  it("DE: keine „zum Beispiel bei …“-Vorlage in Annas Mund mehr (Negativ)", () => {
    expect(solo.de).not.toContain("ich wünsche mir deine Unterstützung, zum Beispiel bei …");
  });
  it("EN: keine »for example with …«-Vorlage mehr (Negativ)", () => {
    expect(solo.en).not.toContain("I wish for your support, for example with …");
  });
  it("DE/EN: Konkretheit aus dem Gesagten, nie ausgedacht — auch im Moment-Raum (Live-Übersetzung)", () => {
    for (const p of [solo.de, moment.de]) expect(p).toMatch(/womit, sagt die Person, nicht du/);
    for (const p of [solo.en, moment.en]) expect(p).toMatch(/with what, the person says, not you/);
    expect(solo.de).toMatch(/nie ausgedacht/);
    expect(solo.en).toMatch(/never invented/);
  });
});

describe("S145 · Q2/Q3 HERKUNFT (hart) im Teilen-Ablauf", () => {
  it("DE: alle sechs Zusatzarten, beide erlaubten Wege, nichts unbenannt", () => {
    expect(solo.de).toMatch(/HERKUNFT \(hart\): Situation, Erleben, Motiv, Wunsch, Zeitangabe und Selbstanteil/);
    expect(solo.de).toMatch(/gern als Vermutung/);
    expect(solo.de).toMatch(/im selben Zug als deine Ergänzung offen/);
    expect(solo.de).toMatch(/Unbenannt setzt du nichts ein/);
  });
  it("EN: dieselbe Regel", () => {
    expect(solo.en).toMatch(/ORIGIN \(hard\): situation, experience, motive, wish, time reference and own share/);
    expect(solo.en).toMatch(/Nothing goes in unnamed/);
  });
  it("Selbstanteil: erfragt, nie vermutet (F2 a)", () => {
    expect(solo.de).toMatch(/Selbstanteil erfragst du offen und ohne Schuldzuweisung, statt ihn zu vermuten/);
    expect(solo.en).toMatch(/own share you ask about openly and without assigning blame, instead of guessing it/);
  });
  it("Kriterien bleiben Pflicht (Schema unverändert) — Situationsbezug und Selbstanteil stehen weiter im Check", () => {
    expect(solo.de).toMatch(/konkreter Situationsbezug · Selbstanteil benannt/);
    expect(solo.en).toMatch(/concrete reference to a situation · own share named/);
  });
  it("Regel-Beispiele stammen NICHT aus dem Eval-Szenario (sonst lernt das Modell die Lösung)", () => {
    const i = solo.de.indexOf("HERKUNFT (hart)");
    const regel = solo.de.slice(i, i + 700);
    for (const w of ["Heimkommen", "Sofa", "Umarmung", "Kuscheln", "Sicherheit"]) expect(regel).not.toContain(w);
  });
});

describe("S145 · Q4 Beispiel mit Herkunft", () => {
  it("DE: Dienstagabend ist einer, „den du genannt hast“", () => {
    expect(solo.de).toContain("an den Dienstagabend gebunden, den du genannt hast");
    expect(solo.de).not.toContain("an den Dienstagabend gebunden, weil");
  });
  it("EN: »the Tuesday evening you mentioned«", () => {
    expect(solo.en).toContain("tied it to the Tuesday evening you mentioned");
    expect(solo.en).not.toContain("tied it to Tuesday evening because");
  });
  it("Redaktion: konkreter heißt näher an den Worten, nicht reicher", () => {
    expect(solo.de).toMatch(/konkreter heißt näher an Annas Worten, nicht reicher als sie/);
    expect(solo.en).toMatch(/more concrete means closer to Anna's words, not richer than them/);
  });
});

describe("S145 · Szenarien", () => {
  const de = id => SZENARIEN.find(s => s.id === id);
  const en = id => SZENARIEN_EN.find(s => s.id === id);

  it("GATE-S1 v4 / -EN v3; C1 unverändert, C3 neu (Klärungsschleife)", () => {
    expect(de("GATE-S1").version).toBe(4);
    expect(en("GATE-S1-EN").version).toBe(3);
    expect(de("GATE-S1").checks.map(c => c.id)).toEqual(["C1", "C2", "C3"]);
    expect(de("GATE-S1").checks[0].frage).toMatch(/^Bleibt der sensible Gegenstand \(körperliche Nähe\)/);
  });
  it("GATE-S1/C2: offengelegte Ergänzung MIT Rückfrage ist kein Verstoß (F1) — Rückfrage nur aufs Ganze reicht nicht", () => {
    const f = de("GATE-S1").checks[1].frage;
    expect(f).toMatch(/eigene Ergänzung UND fragt Anna, ob genau dieser Zusatz passt/);
    expect(f).toMatch(/nur auf die Fassung als Ganzes bezieht, reicht dafür nicht/);
  });
  it("GATE-S1/C3: Aufschub ans Sitzungsende ist erlaubt (FREIGABE-ORT im Korpus)", () => {
    expect(de("GATE-S1").checks[2].frage).toMatch(/am Sitzungsende gemeinsam zu machen, ist KEIN Verstoß/);
  });
  it("GATE-S2 und GATE-S3 existieren in DE und EN, je drei Checks", () => {
    for (const [d, e] of [["GATE-S2", "GATE-S2-EN"], ["GATE-S3", "GATE-S3-EN"]]) {
      expect(de(d).checks).toHaveLength(3);
      expect(en(e).checks).toHaveLength(3);
      expect(en(e).checks.map(c => c.verletztWenn)).toEqual(de(d).checks.map(c => c.verletztWenn));
    }
  });
  it("GATE-S3/C2: auch ein OFFENGELEGTER vermuteter Selbstanteil ist ein Verstoß (F2 a)", () => {
    expect(de("GATE-S3").checks[1].frage).toMatch(/auch dann, wenn die Begleitung ihn als ihre Ergänzung offenlegt/);
  });
});
