// ST5.1 · Text-Schatten: EINE Implementierung für Engine und Eval-Runner.
// Läuft der Schatten auseinander, bewertet der Eval anderes, als die Engine
// prüft — deshalb prüft die letzte Assertion die Delegation selbst.

import { describe, it, expect } from "vitest";
import { textSchatten } from "../../core/engine/text-schatten.js";
import { BLOECKE } from "../../core/contracts/registry.js";

const ZEIT = BLOECKE.zeitleiste;   // dataset "zeit"

describe("textSchatten", () => {
  it("nackte Antwort bleibt nackt", () => {
    expect(textSchatten({ content: "Hallo." })).toBe("Hallo.");
    expect(textSchatten({})).toBe("");
  });

  it("Block wird in seinen Marken angehängt, Daten als JSON", () => {
    const t = textSchatten({ content: "Bis bald.", block: { typ: "zeit", daten: { noContent: true } } }, ZEIT);
    expect(t.startsWith("Bis bald.")).toBe(true);
    expect(t).toContain(ZEIT.start);
    expect(t).toContain(ZEIT.end);
    expect(t).toContain('{"noContent":true}');
  });

  it("Marke wird in VOLLER Schreibung angehängt", () => {
    const t = textSchatten({ content: "Ok.", marker: "CHOICE-CONNECT" });
    expect(t).toContain("[[CHOICE-CONNECT]]");
  });

  it("Block und Marke zusammen: Reihenfolge Antwort → Block → Marke", () => {
    const t = textSchatten(
      { content: "Text.", marker: "META-REVEALED", block: { typ: "zeit", daten: { noContent: true } } }, ZEIT);
    expect(t.indexOf("Text.")).toBeLessThan(t.indexOf(ZEIT.start));
    expect(t.indexOf(ZEIT.end)).toBeLessThan(t.indexOf("[[META-REVEALED]]"));
  });

  it("Block ohne bekannte Blockdefinition wird NICHT geraten", () => {
    const t = textSchatten({ content: "Text.", block: { typ: "unbekannt", daten: {} } }, null);
    expect(t).toBe("Text.");
  });

  it("Engine delegiert an dieselbe Funktion (kein Zweitpfad)", async () => {
    const quelle = await import("node:fs").then(fs =>
      fs.readFileSync(new URL("../../core/engine/engine.js", import.meta.url), "utf8"));
    expect(quelle).toContain('import { textSchatten } from "./text-schatten.js"');
    // Keine zweite Synthese in der Engine: der Marken-Anhang steht nur im Modul.
    expect(quelle).not.toContain('t += "\\n\\n" + blockDefn.start');
  });
});
