// S69 · Sektions-Überschriften (i18n-Chrome): der Gemeinsame Raum trägt jetzt
// „Euer gemeinsamer Boden“ / „Your common ground“, der private Raum „Mein Weg“
// / „My path“. Der Test sperrt den neuen Wortlaut und schützt gegen Rückfall auf
// die alte, über eine Abwesenheit gerahmte Fassung. Schlüsselmenge + Platzhalter
// deckt der globale i18n-woerterbuecher.spec.js ab.

import { describe, it, expect } from "vitest";
import { de } from "../../core/i18n/de.js";
import { en } from "../../core/i18n/en.js";

describe("S69 · Überschriften Boden & Weg", () => {
  it("Gemeinsamer Raum: DE/EN neuer Wortlaut", () => {
    expect(de["teil.gruppeRegale"]).toBe("Euer gemeinsamer Boden");
    expect(en["teil.gruppeRegale"]).toBe("Your common ground");
  });

  it("Privater Raum: DE/EN neuer Wortlaut", () => {
    expect(de["mein.gruppeRegale"]).toBe("Mein Weg");
    expect(en["mein.gruppeRegale"]).toBe("My path");
  });

  it("alte „Regale“/„Shelves“-Fassung ist überall weg", () => {
    for (const k of ["teil.gruppeRegale", "mein.gruppeRegale"]) {
      expect(de[k]).not.toMatch(/Regale/);
      expect(en[k]).not.toMatch(/Shelves/);
    }
    expect(de["teil.gruppeRegale"]).not.toMatch(/ansehen, ohne etwas zu beginnen/i);
    expect(en["teil.gruppeRegale"]).not.toMatch(/browse without starting/i);
  });

  it("Schlüssel bleiben in beiden Wörterbüchern vorhanden", () => {
    for (const k of ["teil.gruppeRegale", "mein.gruppeRegale"]) {
      expect(k in de).toBe(true);
      expect(k in en).toBe(true);
    }
  });
});
