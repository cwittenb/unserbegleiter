// S96.1 · Auswahl-Logik des Dialogausschnitts — reine Funktionen.
//
// Geprüft wird, was ENTSCHIEDEN wird: was wählbar ist, was Tippen und
// Gedrückthalten tun, wann Hinweise fallen. Die Oberfläche hält nur DOM.

import { describe, it, expect } from "vitest";
import {
  paareAusVerlauf, baueAusschnitt, paarWaehlbar, paarGrund, waehleUm,
  fuelleSpanne, ueberRichtwert, hatStilleLuecken, RICHTWERT_PAARE,
} from "../../core/engine/ausschnitt.js";

const a = c => ({ role: "assistant", content: c });
const u = c => ({ role: "user", content: c });

const VERLAUF = [];
for (let i = 1; i <= 6; i++) { VERLAUF.push(a("F" + i), u("A" + i)); }
const P = paareAusVerlauf(VERLAUF);
const id = k => P[k].id;

const sauber = ids => ids.map(i => ({ id: i, ownerOk: true, companionOk: true, reason: null }));
const ALLE = sauber(P.map(p => p.id));

describe("Ausschnitt · Wählbarkeit", () => {
  it("ein Paar ist nur wählbar, wenn BEIDE Kriteriensätze bestanden sind", () => {
    const e = [
      { id: id(0), ownerOk: true, companionOk: true, reason: null },
      { id: id(1), ownerOk: false, companionOk: true, reason: "Generalisierung" },
      { id: id(2), ownerOk: true, companionOk: false, reason: "Deutung über den Abwesenden" },
    ];
    expect(paarWaehlbar(e, id(0))).toBe(true);
    expect(paarWaehlbar(e, id(1))).toBe(false);
    expect(paarWaehlbar(e, id(2))).toBe(false);
  });

  it("ohne Eignungsbericht ist nichts wählbar — lieber keine Tür als eine verschlossene", () => {
    expect(paarWaehlbar([], id(0))).toBe(false);
    expect(paarWaehlbar(null, id(0))).toBe(false);
  });

  it("der Grund erscheint nur bei einer Verletzung, nie beim Bestehen", () => {
    const e = [
      { id: id(0), ownerOk: true, companionOk: true, reason: null },
      { id: id(1), ownerOk: false, companionOk: true, reason: "Generalisierung" },
    ];
    expect(paarGrund(e, id(0))).toBe(null);   // Schweigen bei Bestehen
    expect(paarGrund(e, id(1))).toBe("Generalisierung");
  });
});

describe("Ausschnitt · Tippen", () => {
  it("schaltet an und wieder aus", () => {
    let g = new Set();
    g = waehleUm(g, ALLE, id(0));
    expect([...g]).toEqual([id(0)]);
    g = waehleUm(g, ALLE, id(0));
    expect([...g]).toEqual([]);
  });

  it("ein nicht wählbares Paar ändert nichts", () => {
    const e = [{ id: id(0), ownerOk: false, companionOk: true, reason: "x" }];
    expect([...waehleUm(new Set(), e, id(0))]).toEqual([]);
  });

  it("verändert die übergebene Menge nicht", () => {
    const g = new Set([id(0)]);
    waehleUm(g, ALLE, id(1));
    expect([...g]).toEqual([id(0)]);
  });
});

describe("Ausschnitt · Gedrückthalten (Spanne)", () => {
  it("füllt vom Anker bis hierhin auf", () => {
    const g = fuelleSpanne(P, new Set([id(0)]), ALLE, id(0), id(3));
    expect([...g].sort()).toEqual([id(0), id(1), id(2), id(3)].sort());
  });

  it("funktioniert auch rückwärts", () => {
    const g = fuelleSpanne(P, new Set([id(3)]), ALLE, id(3), id(1));
    expect([...g].sort()).toEqual([id(1), id(2), id(3)].sort());
  });

  it("überspringt nicht wählbare Paare — daraus wird später „…“", () => {
    const e = ALLE.map(x => x.id === id(2) ? { ...x, ownerOk: false, reason: "Generalisierung" } : x);
    const g = fuelleSpanne(P, new Set([id(0)]), e, id(0), id(3));
    expect(g.has(id(2))).toBe(false);
    expect([...g].sort()).toEqual([id(0), id(1), id(3)].sort());
    // und im Ergebnis entsteht genau eine Auslassung:
    expect(baueAusschnitt(P, [...g]).map(x => x.gapBefore)).toEqual([false, false, true]);
  });

  it("ohne Anker verhält es sich wie ein Tippen", () => {
    const g = fuelleSpanne(P, new Set(), ALLE, null, id(2));
    expect([...g]).toEqual([id(2)]);
  });

  it("unbekanntes Ziel ist folgenlos", () => {
    const g = fuelleSpanne(P, new Set([id(0)]), ALLE, id(0), "P999-1000");
    expect([...g]).toEqual([id(0)]);
  });

  it("bereits Gewähltes bleibt erhalten", () => {
    const g = fuelleSpanne(P, new Set([id(5)]), ALLE, id(0), id(1));
    expect(g.has(id(5))).toBe(true);
  });
});

describe("Ausschnitt · Hinweise", () => {
  it("der Richtwert greift ab dem sechsten Paar", () => {
    expect(RICHTWERT_PAARE).toBe(5);
    expect(ueberRichtwert(5)).toBe(false);
    expect(ueberRichtwert(6)).toBe(true);
  });

  it("stille Lücken werden erkannt, wenn der Bericht ein Paar gar nicht kennt", () => {
    // I6-Material kommt serverseitig nicht in die Menge — die Lücke im Verlauf
    // wird EINMAL oben benannt, nie pro Element.
    expect(hatStilleLuecken(P, ALLE)).toBe(false);
    expect(hatStilleLuecken(P, ALLE.filter(x => x.id !== id(2)))).toBe(true);
  });
});
