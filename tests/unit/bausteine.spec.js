// S33a: Die BAUSTEINE beider Korpora müssen strukturgleich sein —
// gleiche Schlüssel, gleicher Typ (Text vs. Funktion), gleiche Stelligkeit.
// Wortlaut wird bewusst NICHT verglichen (je Korpus eigene Sprache);
// Wortlaut-Schutz leisten die Kanarien auf dem gerenderten Ergebnis.
import { describe, it, expect } from "vitest";
import { bausteine as de } from "../../core/prompts/prompts.de.js";
import { bausteine as en } from "../../core/prompts/prompts.en.js";

describe("Prompt-Bausteine (S33a)", () => {
  it("Schlüsselparität de↔en", () => {
    expect(Object.keys(de).sort()).toEqual(Object.keys(en).sort());
  });

  it("Typ- und Stelligkeits-Parität je Baustein", () => {
    for (const k of Object.keys(de)) {
      expect(typeof en[k], k).toBe(typeof de[k]);
      if (typeof de[k] === "function") expect(en[k].length, k).toBe(de[k].length);
    }
  });

  it("Bausteine landen im gerenderten Prompt (Stichprobe sprache, 6 Prompts je Korpus)", async () => {
    const D = await import("../../core/prompts/prompts.de.js");
    const E = await import("../../core/prompts/prompts.en.js");
    for (const [m, b] of [[D, de], [E, en]]) {
      const alle = [
        m.reflexionsPrompt("A", "B"), m.klaerungsPrompt("A", "B"), m.aufloesungsPrompt("A", "B"),
        m.momentPrompt("A", "B"), m.qzMenuePrompt(),
      ];
      for (const p of alle) expect(p).toContain(b.sprache);
    }
  });
});
