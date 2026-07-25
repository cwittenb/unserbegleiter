// S95.3 · Regal-Kern: Karenz (D5) und rollenbewusste Redaktion.
//
// Reine Funktionen — dieselben, die der Worker beim GET und beim Schreiben
// benutzt. Was hier grün ist, gilt auf beiden Seiten.

import { describe, it, expect } from "vitest";
import {
  KARENZ_MS, karenzBis, inKarenz, regalItemVerborgen, redigiereRegalFuerRolle,
  legeRegalItemAb, setzeRegalGelesen, nimmRegalZurueck, hebeRegalItem,
} from "../../core/engine/regal.js";

const T0 = Date.parse("2026-07-25T10:00:00.000Z");
const SPAETER = T0 + KARENZ_MS + 1000;

const leer = () => ({ items: [] });
const ablegen = (regal, over = {}, jetzt = T0) =>
  legeRegalItemAb(regal, { kind: "excerpt", pairs: [{ question: "f", answer: "a", gapBefore: false }], by: "Anna", role: "A", ...over }, jetzt);

describe("Regal · Ablage und Karenz", () => {
  it("ein Ausschnitt bekommt eine Karenz von 30 Minuten", () => {
    const { item } = ablegen(leer());
    expect(item.kind).toBe("excerpt");
    expect(Date.parse(item.visibleFrom) - T0).toBe(KARENZ_MS);
    expect(inKarenz(item, T0)).toBe(true);
    expect(inKarenz(item, SPAETER)).toBe(false);
  });

  it("eine Selbstmitteilung bekommt KEINE Karenz", () => {
    // Die Nachricht ist durch die Redaktion samt Bedeutungsrückfrage gegangen;
    // ein Nachlauf widerspräche „gegebenes Ja zählt sofort".
    const { item } = ablegen(leer(), { kind: "message", text: "Ich fühle mich allein." });
    expect(item.visibleFrom).toBeUndefined();
    expect(inKarenz(item, T0)).toBe(false);
  });

  it("Ablage setzt Zeit und Karenz selbst — Client-Angaben zählen nicht", () => {
    const { item } = ablegen(leer(), { visibleFrom: "1999-01-01T00:00:00.000Z", id: "RGX", at: "1999-01-01T00:00:00.000Z" });
    expect(item.visibleFrom).toBe(karenzBis(T0));
    expect(item.id).toBe("RG1");
    expect(item.at).toBe(new Date(T0).toISOString());
  });

  it("neue Items sind ungelesen (Pull, kein Push)", () => {
    expect(ablegen(leer()).item.read).toBe(false);
  });
});

describe("Regal · Redaktion (D5/I11)", () => {
  it("der Partner sieht ein Item in Karenz gar nicht — kein Platzhalter", () => {
    const { regal } = ablegen(leer());
    const sichtB = redigiereRegalFuerRolle(regal, "B", T0);
    expect(sichtB.items).toHaveLength(0);
  });

  it("der Owner sieht sein Item in der Karenz weiterhin", () => {
    const { regal } = ablegen(leer());
    expect(redigiereRegalFuerRolle(regal, "A", T0).items).toHaveLength(1);
  });

  it("nach Ablauf sieht der Partner das Item", () => {
    const { regal } = ablegen(leer());
    expect(redigiereRegalFuerRolle(regal, "B", SPAETER).items).toHaveLength(1);
  });

  it("Selbstmitteilungen sind für beide sofort sichtbar", () => {
    const { regal } = ablegen(leer(), { kind: "message", text: "x" });
    expect(redigiereRegalFuerRolle(regal, "B", T0).items).toHaveLength(1);
  });

  it("Items ohne visibleFrom (Bestand) bleiben sichtbar", () => {
    const regal = { items: [{ id: "RG1", by: "Anna", role: "A", text: "alt" }] };
    expect(redigiereRegalFuerRolle(regal, "B", T0).items).toHaveLength(1);
  });

  it("ist idempotent — zweimal filtern ändert nichts", () => {
    const { regal } = ablegen(leer());
    const a = redigiereRegalFuerRolle(regal, "B", T0);
    expect(redigiereRegalFuerRolle(a, "B", T0)).toEqual(a);
  });

  it("erhält Felder neben items", () => {
    const { regal } = ablegen({ items: [], notiz: "x" });
    expect(redigiereRegalFuerRolle(regal, "B", T0).notiz).toBe("x");
  });
});

describe("Regal · Rücknahme (D5)", () => {
  it("der Owner kann in der Karenz zurückziehen", () => {
    const { regal } = ablegen(leer());
    expect(nimmRegalZurueck(regal, "RG1", "A", T0)).toBe(true);
    expect(regal.items).toHaveLength(0);
  });

  it("nach Sichtbarwerden ist es endgültig", () => {
    const { regal } = ablegen(leer());
    expect(nimmRegalZurueck(regal, "RG1", "A", SPAETER)).toBe(false);
    expect(regal.items).toHaveLength(1);
  });

  it("der Empfänger kann nichts zurückziehen", () => {
    const { regal } = ablegen(leer());
    expect(nimmRegalZurueck(regal, "RG1", "B", T0)).toBe(false);
    expect(regal.items).toHaveLength(1);
  });

  it("eine Selbstmitteilung ist nie zurückziehbar", () => {
    const { regal } = ablegen(leer(), { kind: "message", text: "x" });
    expect(nimmRegalZurueck(regal, "RG1", "A", T0)).toBe(false);
  });

  it("Rücknahme und erneute Ablage starten die Karenz neu", () => {
    const { regal } = ablegen(leer());
    nimmRegalZurueck(regal, "RG1", "A", T0);
    const spaeter = T0 + 60000;
    const { item } = ablegen(regal, {}, spaeter);
    expect(Date.parse(item.visibleFrom) - spaeter).toBe(KARENZ_MS);
  });

  it("unbekannte ID ist folgenlos", () => {
    const { regal } = ablegen(leer());
    expect(nimmRegalZurueck(regal, "RG999", "A", T0)).toBe(false);
  });
});

describe("Regal · Gelesen-Markierung", () => {
  it("der Empfänger markiert gelesen", () => {
    const { regal } = ablegen(leer());
    expect(setzeRegalGelesen(regal, "RG1", "B", SPAETER)).toBe(true);
    expect(regal.items[0].read).toBe(true);
  });

  it("der Absender kann den Lesestand nicht setzen", () => {
    // Sonst wäre „nie gelesen ist legitim" aushebelbar.
    const { regal } = ablegen(leer());
    expect(setzeRegalGelesen(regal, "RG1", "A", SPAETER)).toBe(false);
    expect(regal.items[0].read).toBe(false);
  });

  it("ein Item in Karenz kann der Partner nicht als gelesen markieren", () => {
    const { regal } = ablegen(leer());
    expect(setzeRegalGelesen(regal, "RG1", "B", T0)).toBe(false);
  });
});

describe("Regal · Hebung in die Agenda", () => {
  it("hebt und vermerkt", () => {
    const { regal } = ablegen(leer(), { kind: "message", text: "Ich fühle mich allein." });
    const r = hebeRegalItem(regal, { items: [] }, "RG1", "B", {}, T0);
    expect(r.eintrag.herkunft).toBe("shelf");
    expect(r.eintrag.vormerkung).toBe(true);
    expect(regal.items[0].gehoben).toBe(true);
  });

  it("als Ziel markiert den Kandidaten", () => {
    const { regal } = ablegen(leer(), { kind: "message", text: "x" });
    const r = hebeRegalItem(regal, { items: [] }, "RG1", "B", { alsZiel: true }, T0);
    expect(r.eintrag.zielKandidat).toBe(true);
    expect(r.eintrag.vormerkung).toBeUndefined();
    expect(regal.items[0].alsZiel).toBe(true);
  });

  it("zweimal heben ist folgenlos", () => {
    const { regal } = ablegen(leer(), { kind: "message", text: "x" });
    const agenda = { items: [] };
    hebeRegalItem(regal, agenda, "RG1", "B", {}, T0);
    expect(hebeRegalItem(regal, agenda, "RG1", "B", {}, T0)).toBe(null);
    expect(agenda.items).toHaveLength(1);
  });

  it("ein Item in Karenz ist für den Partner nicht hebbar", () => {
    const { regal } = ablegen(leer());
    expect(hebeRegalItem(regal, { items: [] }, "RG1", "B", {}, T0)).toBe(null);
  });
});

describe("Regal · Sichtbarkeits-Prädikat", () => {
  it("verborgen ist nur die Gegenrolle und nur in der Karenz", () => {
    const { item } = ablegen(leer());
    expect(regalItemVerborgen(item, "B", T0)).toBe(true);
    expect(regalItemVerborgen(item, "A", T0)).toBe(false);
    expect(regalItemVerborgen(item, "B", SPAETER)).toBe(false);
  });
});
