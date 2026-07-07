// Korpus-Invarianten: Jede registrierte Sprachfassung muss dieselben
// Protokoll-Invarianten tragen wie die deutsche Referenz — Marker ([[…]]),
// Block-Marken (*-BLOCK) und die Schlüsselmengen der Zusatz-Inhalte.
// Heute prüft das de gegen sich selbst (Gerüst); sobald Stufe C2
// prompts.en.js registriert, läuft die englische Fassung automatisch mit.

import { describe, it, expect } from "vitest";
import { alleKorpora } from "../../core/prompts/prompts.js";

const A = "Anna", B = "Bernd";
const marker = s => [...new Set([...String(s).matchAll(/\[\[[A-ZÄÖÜ0-9-]+\]\]/g)].map(m => m[0]))].sort();
const bloecke = s => [...new Set([...String(s).matchAll(/[A-ZÄÖÜ-]+-BLOCK/g)].map(m => m[0]))].sort();
const sysTexte = k => ({
  einzel: k.einzelSys(A, B, true),
  gemeinsam: k.gemeinsamSys(A, B, true),
  moment: k.momentSys(A, B),
  solo: k.soloSys(A, B),
  aufdeck: k.aufdeckSys(A, B),
  qz: k.qzSys(),
});

describe("Korpus-Invarianten (alle Sprachfassungen)", () => {
  const korpora = alleKorpora();
  const ref = sysTexte(korpora.de);

  for (const [sprache, k] of Object.entries(korpora)) {
    it(`${sprache}: Marker und Block-Marken decken sich mit der Referenz`, () => {
      const texte = sysTexte(k);
      for (const art of Object.keys(ref)) {
        expect(marker(texte[art]), `${sprache}/${art}: [[…]]-Marker`).toEqual(marker(ref[art]));
        expect(bloecke(texte[art]), `${sprache}/${art}: Block-Marken`).toEqual(bloecke(ref[art]));
      }
    });

    it(`${sprache}: Zusatz-Inhalte sind deckungsgleich strukturiert`, () => {
      expect(Object.keys(k.steuerTexte).sort()).toEqual(Object.keys(korpora.de.steuerTexte).sort());
      expect(Object.keys(k.steuerTexte.start).sort()).toEqual(Object.keys(korpora.de.steuerTexte.start).sort());
      expect(k.steuerTexte.weiterMitKapitel).toContain("{n}");
      expect(Object.keys(k.korpusTexte).sort()).toEqual(Object.keys(korpora.de.korpusTexte).sort());
      expect(Object.keys(k.QZ_STUFEN_TEXT).sort()).toEqual(Object.keys(korpora.de.QZ_STUFEN_TEXT).sort());
      expect(k.KAPITEL_TITEL).toHaveLength(4);
      expect(k.DOMAINS).toHaveLength(korpora.de.DOMAINS.length);
    });
  }

  it("de: Kernmarker sind vorhanden (Regressionsanker)", () => {
    expect(marker(ref.einzel)).toEqual(expect.arrayContaining(
      ["[[KAPITEL-1]]", "[[KAPITEL-2]]", "[[KAPITEL-3]]", "[[RANKING]]", "[[REGLER]]", "[[PARTNER-RANKING]]", "[[PARTNER-UNZUFRIEDEN]]"]));
    expect(marker(ref.gemeinsam)).toContain("[[STARTWERTE]]");
    expect(marker(ref.aufdeck)).toContain("[[AUFDECKEN]]");
  });
});
