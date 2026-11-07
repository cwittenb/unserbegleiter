// PRV-1b · Redaktion A′: Negativ → positiv mit Grund.
//
// Befund hinter dem Schritt (docs/REVIEW-PRV-prompt-verdichtung.md): "Do not
// X" primt X — je konkreter das verbotene Beispiel im Prompt steht, desto
// eher taucht es im Output auf (S133: Beispiel wird Schablone; S144c/S146:
// Haikus Praedikats-Eroeffnung ist genau der Satz, den die Urteils-Grammatik
// als Verbot nennt). PRV-1b formuliert Regeln, die ein verbotenes Verhalten
// zitierten, als das gewuenschte Verhalten mit Grund; das Zitat bleibt als
// <!-- Kommentar --> in der Quelle, wo es Lesern dient und das Modell nicht
// erreicht.
//
// Dieser Test haelt zwei Kennzahlen als Sperrklinke (Wachsen = rot):
//   1. "Verstoß"/"violation" als Regel-Rhetorik im Prompt — die Judge-
//      Vokabel gehoert in den Eval, nicht in die Anweisung.
//   2. Negierte Zitate: eine Verneinung, der innerhalb weniger Zeichen ein
//      Zitat folgt ("nie 'ich hole ihn gleich'") — das ist die Bauart, die
//      das Verbotene nennt. Was bleibt, sind kategorien-definierende Beispiele
//      (Urteils-/Spiegel-Grammatik, Generalisierungs-Woerter) — ob auch die
//      gehen, entscheidet F8 (Sprintplan).
//
// Vorher (c1f2adc + PRV-1a) / nachher (PRV-1b), DE: solo 11/36 → 1/21,
// moment 11/23 → 1/13, einzel 1/21 → 1/16, gemeinsam 8/25 → 1/15.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { ZIELE, zielPfad } from "../../scripts/build-korpus.js";
import { FEST_KONTEXT, SESSION_ARTEN } from "../../scripts/prompt-masse.js";

const VERSTOSS = /Verstoß|Verstöße|violation/gi;
const NEGIERTES_ZITAT = /\b(?:nie|niemals|kein|keine|keinen|nicht|never|no|not)\b [^".\n]{0,25}"[^"]{3,}"/g;
const zaehle = (t, re) => (t.match(re) || []).length;

const DECKE = {
  de: { solo: [1, 21], moment: [1, 13], einzel: [1, 16], gemeinsam: [1, 15], qualitytime: [0, 2] },
  en: { solo: [4, 25], moment: [1, 16], einzel: [1, 13], gemeinsam: [1, 14], qualitytime: [0, 3] },
};

for (const sprache of ["de", "en"]) {
  describe("PRV-1b · Verbots-Rhetorik unter der Decke · " + sprache, async () => {
    const prompts = await import("../../core/prompts/prompts.js");
    if (sprache === "en" && !prompts.istKorpusDa("en")) prompts.registerKorpus("en", await import("../../core/prompts/prompts.en.js"));
    const { baueSystemText } = await import("../../core/komposition.js");
    for (const art of SESSION_ARTEN) {
      it(art + " · Verstoß-Vokabel und negierte Zitate", () => {
        const t = baueSystemText(art, FEST_KONTEXT, { sprache });
        const [v, q] = DECKE[sprache][art];
        expect(zaehle(t, VERSTOSS), "Verstoß/violation").toBeLessThanOrEqual(v);
        expect(zaehle(t, NEGIERTES_ZITAT), "negierte Zitate").toBeLessThanOrEqual(q);
      });
    }
  });
}

describe("PRV-1b · die Fehlerbeispiele leben in den Quellen weiter", () => {
  /* Die Beispiele sind nicht verloren: Sie stehen als Kommentar an ihrer
     Regel, fuer die naechste Person, die den Korpus liest — und fuer den
     Eval, dessen Checks sie weiter benennen. Das Generat traegt sie nicht. */
  const faelle = [
    ["de", "sessions", "ich hole ihn gleich"],
    ["de", "sessions", "soll ich das dann so vorbereiten?"],
    ["de", "sessions", "Gibt es körperliche Gewalt?"],
    ["de", "policies", "dein Eintrag wurde gespeichert"],
    ["en", "sessions", "I will fetch it"],
    ["en", "policies", "your entry has been saved"],
  ];
  for (const [sprache, ziel, satz] of faelle) {
    it(sprache + "/" + ziel + ": '" + satz + "' steht in der Quelle, nicht im Generat", () => {
      const generat = readFileSync(zielPfad(sprache, ziel), "utf8");
      expect(generat.includes(satz)).toBe(false);
    });
  }
  it("die Generate tragen keinen Kommentar-Rest", () => {
    for (const sprache of ["de", "en"]) for (const ziel of ZIELE) {
      expect(readFileSync(zielPfad(sprache, ziel), "utf8").includes("<!--"), sprache + "/" + ziel).toBe(false);
    }
  });
});
