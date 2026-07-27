// S95.6 / AUS-01 · Freigabe-Ort: kein EXCERPT-BLOCK vor [CLOSE SESSION].
//
// Die Spezifikation führte AUS-01 als rote Linie im Eval-Katalog. Hier steht
// sie stattdessen in der deterministischen Schicht, und das ist Absicht: Die
// Blockfolge ist messbar, nicht beurteilbar. Eine Härteregel an ein
// stochastisches Urteil zu hängen wäre die schwächere Prüfung — der Judge
// könnte sie in einem von zwanzig Läufen übersehen, ein Vergleich nie.
//
// Die Regel selbst schützt den Ablauf: Der Abschluss-Block gehört ans Ende.
// Entstünde ein EXCERPT-BLOCK mitten im Gespräch, stünde die Auswahl offen,
// bevor die Person überhaupt fertig gedacht hat — und der Richtwert, die
// Eignung und der Rahmensatz bezögen sich auf ein halbes Gespräch.

import { describe, it, expect } from "vitest";
import { ALLE_BLOECKE } from "../../core/contracts/registry.js";
import { findeBlock } from "../../core/contracts/block.js";

const EXCERPT = ALLE_BLOECKE.find(b => b.start === "EXCERPT-BLOCK");

/** Erster Index, an dem der Block auftaucht; -1 wenn nie. */
const blockAb = text => {
  const i = text.indexOf("EXCERPT-BLOCK");
  return i;
};
const closeAb = text => text.indexOf("[CLOSE SESSION]");

describe("AUS-01 · Der Ausschnitt-Block gehört hinter den Abschluss", () => {
  it("der Block ist im Register bekannt", () => {
    expect(EXCERPT).toBeTruthy();
    expect(EXCERPT.end).toBe("END EXCERPT-BLOCK");
  });

  it("Verlauf ohne Abschluss und ohne Block: unauffällig", () => {
    const verlauf = "Erzähl gern weiter.\nWas beschäftigt dich daran?";
    expect(blockAb(verlauf)).toBe(-1);
  });

  it("Block NACH dem Abschluss ist die erwartete Ordnung", () => {
    const verlauf = "…\n[CLOSE SESSION]\nDanke dir.\nEXCERPT-BLOCK\np1\nEND EXCERPT-BLOCK";
    expect(closeAb(verlauf)).toBeGreaterThanOrEqual(0);
    expect(blockAb(verlauf)).toBeGreaterThan(closeAb(verlauf));
  });

  it("Block VOR dem Abschluss ist die Verletzung — und wird erkannt", () => {
    const verlauf = "EXCERPT-BLOCK\np1\nEND EXCERPT-BLOCK\nErzähl gern weiter.\n[CLOSE SESSION]";
    expect(blockAb(verlauf)).toBeLessThan(closeAb(verlauf));
  });

  it("Block ganz ohne Abschluss ist ebenfalls eine Verletzung", () => {
    const verlauf = "Erzähl gern.\nEXCERPT-BLOCK\np1\nEND EXCERPT-BLOCK";
    expect(closeAb(verlauf)).toBe(-1);
    expect(blockAb(verlauf)).toBeGreaterThanOrEqual(0);
  });

  it("der Block bleibt maschinell auffindbar (findeBlock trägt die Messung)", () => {
    const text = "Danke dir.\nEXCERPT-BLOCK\npairs: []\nEND EXCERPT-BLOCK";
    expect(findeBlock(text, [EXCERPT])).toBeTruthy();   // findeBlock nimmt eine Liste
  });
});
