// S122 · box-sizing global.
//
// Bis hierher stand die Regel punktuell an einzelnen Flächen — und wo sie
// fehlte, wurde ein Kasten stillschweigend größer als gedacht: Höhe UND
// Polster ergaben zusammen mehr als das Maß, das in der Regel steht.
//
// Der gemessene Fall: `#scrChat` war 54px höher als das Fenster (100dvh
// Inhaltshöhe plus 30px Kopf- und 24px Fußpolster), das Dokument lief über,
// und neben der gewollten Bildlaufleiste stand eine zweite am Body (S119.3).
//
// Die Kanarie aus S119.3 bleibt daneben bestehen. Sie prüft die ABSICHT (wer
// Höhe und Polster zugleich setzt, muss border-box mitbringen), diese Datei
// die UMSETZUNG. Fiele die globale Regel je wieder heraus, schlägt die
// Kanarie an — und umgekehrt hält die globale Regel auch die Flächen, an die
// beim Schreiben niemand gedacht hat.

import { describe, it, expect } from "vitest";
import { DESIGN_CSS } from "../../core/ui/design.js";

const CSS = DESIGN_CSS.replace(/\/\*[\s\S]*?\*\//g, "");

describe("S122 · die Regel gilt allgemein", () => {
  it("jedes Element rechnet sein Polster nach innen", () => {
    expect(CSS).toContain("*,*::before,*::after{box-sizing:border-box}");
  });

  it("sie steht ganz vorn — vor allem, was sie überschreiben könnte", () => {
    const global = CSS.indexOf("*,*::before,*::after{box-sizing:border-box}");
    const ersteKomponente = CSS.indexOf(".rz-half{");
    expect(global).toBeGreaterThan(-1);
    expect(global).toBeLessThan(ersteKomponente);
  });

  it("niemand setzt content-box zurück", () => {
    // Eine einzelne Rücknahme wäre schlimmer als gar keine globale Regel:
    // Sie würde genau die Fläche treffen, die niemand mehr prüft.
    expect(CSS).not.toMatch(/box-sizing:\s*content-box/);
  });

  it("die punktuellen Setzungen bleiben — sie dokumentieren die Absicht", () => {
    // Redundant, aber nicht überflüssig: Sie stehen dort, wo mit Höhe und
    // Polster zugleich gerechnet wird, und sagen es an Ort und Stelle.
    // Sie zu entfernen wäre ein zweiter Eingriff mit eigenem Risiko.
    expect(CSS).toMatch(/\.rz-half\{[^}]*box-sizing:border-box/);
    expect(CSS).toMatch(/\.rz-app #scrChat\{[^}]*box-sizing:border-box/);
  });

  it("die Kanarie aus S119.3 bleibt gültig und findet nichts mehr", () => {
    const regeln = [];
    for (const t of CSS.matchAll(/([^{}@]+)\{([^{}]*)\}/g))
      regeln.push({ selektor: t[1].trim().replace(/\s+/g, " "), koerper: t[2] });
    const suender = regeln
      .filter(r => /(^|;)\s*height:\s*100dvh/.test(r.koerper) && /(^|;)\s*padding:/.test(r.koerper))
      .filter(r => !r.koerper.includes("box-sizing:border-box"))
      .map(r => r.selektor);
    expect(suender).toEqual([]);
  });
});
