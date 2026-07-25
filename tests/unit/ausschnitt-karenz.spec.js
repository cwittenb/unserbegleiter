// S95.3 · Regal-Kern: Karenz (D5) und rollenbewusste Redaktion.
//
// Reine Funktionen — dieselben, die der Worker beim GET und beim Schreiben
// benutzt. Was hier grün ist, gilt auf beiden Seiten.

import { describe, it, expect } from "vitest";
import {
  KARENZ_MS, karenzBis, inKarenz, regalItemVerborgen, redigiereRegalFuerRolle,
  redigiereAgendaFuerRolle, legeRegalItemAb, legeAgendaItemAb, setzeRegalGelesen,
  nimmRegalZurueck, nimmFreigabeZurueck, hebeRegalItem, WEGE_FUER,
} from "../../core/engine/regal.js";

const T0 = Date.parse("2026-07-25T10:00:00.000Z");
const SPAETER = T0 + KARENZ_MS + 1000;

const leer = () => ({ items: [] });
const ablegen = (regal, over = {}, jetzt = T0) =>
  legeRegalItemAb(regal, { kind: "excerpt", freigabe: "FG1", pairs: [{ question: "f", answer: "a", gapBefore: false }], by: "Anna", role: "A", ...over }, jetzt);

describe("Regal · Ablage und Karenz", () => {
  it("ein Ausschnitt bekommt eine Karenz von 30 Minuten", () => {
    const { item } = ablegen(leer());
    expect(item.kind).toBe("excerpt");
    expect(Date.parse(item.visibleFrom) - T0).toBe(KARENZ_MS);
    expect(inKarenz(item, T0)).toBe(true);
    expect(inKarenz(item, SPAETER)).toBe(false);
  });

  it("S95.3b · eine Selbstmitteilung bekommt DIESELBE Karenz", () => {
    // Umkehr gegenüber S95.3: Die Regel „gegebenes Ja zählt sofort" verbietet,
    // noch einmal zu FRAGEN — die Karenz fragt nichts. Und asymmetrische
    // Rücknehmbarkeit wäre eine Falle: Wer sie beim Ausschnitt gelernt hat,
    // nimmt sie bei der Nachricht an.
    const { item } = ablegen(leer(), { kind: "message", text: "Ich fühle mich allein." });
    expect(Date.parse(item.visibleFrom) - T0).toBe(KARENZ_MS);
    expect(inKarenz(item, T0)).toBe(true);
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

  it("auch Selbstmitteilungen sind in der Karenz für den Partner nicht da", () => {
    const { regal } = ablegen(leer(), { kind: "message", text: "x" });
    expect(redigiereRegalFuerRolle(regal, "B", T0).items).toHaveLength(0);
    expect(redigiereRegalFuerRolle(regal, "B", SPAETER).items).toHaveLength(1);
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

  it("auch eine Selbstmitteilung ist in der Karenz zurückziehbar", () => {
    const { regal } = ablegen(leer(), { kind: "message", text: "x" });
    expect(nimmRegalZurueck(regal, "RG1", "A", T0)).toBe(true);
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
    const r = hebeRegalItem(regal, { items: [] }, "RG1", "B", {}, SPAETER);
    expect(r.eintrag.herkunft).toBe("shelf");
    expect(r.eintrag.vormerkung).toBe(true);
    expect(regal.items[0].gehoben).toBe(true);
  });

  it("als Ziel markiert den Kandidaten", () => {
    const { regal } = ablegen(leer(), { kind: "message", text: "x" });
    const r = hebeRegalItem(regal, { items: [] }, "RG1", "B", { alsZiel: true }, SPAETER);
    expect(r.eintrag.zielKandidat).toBe(true);
    expect(r.eintrag.vormerkung).toBeUndefined();
    expect(regal.items[0].alsZiel).toBe(true);
  });

  it("zweimal heben ist folgenlos", () => {
    const { regal } = ablegen(leer(), { kind: "message", text: "x" });
    const agenda = { items: [] };
    hebeRegalItem(regal, agenda, "RG1", "B", {}, SPAETER);
    expect(hebeRegalItem(regal, agenda, "RG1", "B", {}, SPAETER)).toBe(null);
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

describe("S95.3b · Agenda-Fach und ganze Freigabe", () => {
  const querung = (jetzt = T0) => {
    const regal = leer(), agenda = leer();
    legeRegalItemAb(regal, { kind: "message", freigabe: "FG9", text: "t", by: "Anna", role: "A" }, jetzt);
    legeAgendaItemAb(agenda, { freigabe: "FG9", text: "t", by: "Anna", role: "A" }, jetzt);
    return { regal, agenda };
  };

  it("der Agenda-Eintrag trägt dieselbe Karenz — es ist derselbe Klick", () => {
    const { agenda } = querung();
    expect(Date.parse(agenda.items[0].visibleFrom) - T0).toBe(KARENZ_MS);
    expect(redigiereAgendaFuerRolle(agenda, "B", T0).items).toHaveLength(0);
    expect(redigiereAgendaFuerRolle(agenda, "B", SPAETER).items).toHaveLength(1);
    expect(redigiereAgendaFuerRolle(agenda, "A", T0).items).toHaveLength(1);
  });

  it("Rücknahme wirkt auf BEIDE Fächer — nicht auf die Hälfte", () => {
    const { regal, agenda } = querung();
    expect(nimmFreigabeZurueck(regal, agenda, "FG9", "A", T0)).toBe(2);
    expect(regal.items).toHaveLength(0);
    expect(agenda.items).toHaveLength(0);
  });

  it("fremde Freigaben bleiben unberührt", () => {
    const { regal, agenda } = querung();
    legeRegalItemAb(regal, { kind: "message", freigabe: "FG-fremd", text: "u", by: "Bernd", role: "B" }, T0);
    expect(nimmFreigabeZurueck(regal, agenda, "FG9", "A", T0)).toBe(2);
    expect(regal.items).toHaveLength(1);
    expect(regal.items[0].freigabe).toBe("FG-fremd");
  });

  it("nach Ablauf ist nichts mehr zurückziehbar", () => {
    const { regal, agenda } = querung();
    expect(nimmFreigabeZurueck(regal, agenda, "FG9", "A", SPAETER)).toBe(0);
    expect(regal.items).toHaveLength(1);
  });

  it("der Empfänger kann keine fremde Freigabe zurückziehen", () => {
    const { regal, agenda } = querung();
    expect(nimmFreigabeZurueck(regal, agenda, "FG9", "B", T0)).toBe(0);
  });

  it("ohne Freigabe-Kennung passiert nichts", () => {
    const { regal, agenda } = querung();
    expect(nimmFreigabeZurueck(regal, agenda, null, "A", T0)).toBe(0);
    expect(nimmFreigabeZurueck(regal, agenda, undefined, "A", T0)).toBe(0);
  });

  it("die Hebung erbt KEINE Karenz — sie ist keine Querung", () => {
    const { regal } = querung();
    const r = hebeRegalItem(regal, { items: [] }, "RG1", "B", {}, SPAETER);
    expect(r.eintrag.visibleFrom).toBeUndefined();
    expect(redigiereAgendaFuerRolle({ items: [r.eintrag] }, "A", SPAETER).items).toHaveLength(1);
  });
});

describe("S95.3b · konstantes Wege-Menü", () => {
  it("die Nachricht kennt drei Wege, der Ausschnitt zwei", () => {
    expect(WEGE_FUER("message")).toEqual(["selbst", "shelf", "moment"]);
    expect(WEGE_FUER("excerpt")).toEqual(["shelf", "moment"]);
  });

  it('"selbst" entfällt beim Ausschnitt — man probt keinen geführten Dialog', () => {
    expect(WEGE_FUER("excerpt")).not.toContain("selbst");
  });

  it("unbekannte Art fällt auf das Nachrichten-Menü zurück", () => {
    expect(WEGE_FUER(undefined)).toEqual(["selbst", "shelf", "moment"]);
  });
});
