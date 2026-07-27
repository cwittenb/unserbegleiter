// S95.6 · Der AUS-Katalog als Vertrag.
//
// Eval-Szenarien laufen nur lokal gegen echte Modelle. Diese Tests prüfen
// deshalb nicht das Modellverhalten, sondern dass der Katalog selbst intakt
// ist — Tippfehler in einer ID oder eine verrutschte Härtemarke fallen sonst
// erst beim teuren Lauf auf.

import { describe, it, expect } from "vitest";
import { SZENARIEN } from "../../evals/szenarien/start-katalog.js";

const AUS = SZENARIEN.filter(s => s.familie === "AUS");
const finde = id => AUS.find(s => s.id === id);

describe("S95.6 · Der Katalog trägt die fünf Judge-Dimensionen", () => {
  it("AUS-02 bis AUS-06 sind da (AUS-01 ist Messung, nicht Urteil)", () => {
    expect(AUS.map(s => s.id).sort()).toEqual(["AUS-02", "AUS-03", "AUS-04", "AUS-05", "AUS-06"]);
    expect(finde("AUS-01")).toBeUndefined();
  });

  it("jedes Szenario ist vollständig und läuft im Einzelraum", () => {
    for (const s of AUS) {
      expect(s.session, s.id).toBe("solo");
      expect(s.beschreibung, s.id).toBeTruthy();
      expect(s.eingaben.length, s.id).toBeGreaterThan(0);
      expect(s.checks.length, s.id).toBeGreaterThan(0);
      expect(s.kontext, s.id).toMatchObject({ me: "Anna", partner: "Bernd" });
    }
  });

  it("jeder Check hat Frage und Verletzungsrichtung", () => {
    for (const s of AUS) for (const c of s.checks) {
      expect(c.frage, s.id + "/" + c.id).toBeTruthy();
      expect(["ja", "nein"], s.id + "/" + c.id).toContain(c.verletztWenn);
    }
  });
});

describe("S95.6 · Die roten Linien sitzen dort, wo sie sitzen sollen", () => {
  it("AUS-02: kein Übergabe-Angebot bei offener Erregung (M1-Bremse)", () => {
    const rot = finde("AUS-02").checks.filter(c => c.roteLinie);
    expect(rot).toHaveLength(1);
    expect(rot[0].verletztWenn).toBe("ja");
  });

  it("AUS-05: der Begleiter spricht nicht für den Abwesenden", () => {
    const rot = finde("AUS-05").checks.filter(c => c.roteLinie);
    expect(rot).toHaveLength(1);
    expect(rot[0].frage).toMatch(/abwesenden Partner/i);
  });

  it("rote Linien erzwingen den größeren Stichprobenumfang", () => {
    for (const s of AUS) {
      if (s.checks.some(c => c.roteLinie)) expect(s.n, s.id).toBeGreaterThanOrEqual(5);
    }
  });

  it("AUS-06 ist Beobachtung — es trägt bewusst keine rote Linie", () => {
    expect(finde("AUS-06").checks.some(c => c.roteLinie)).toBe(false);
  });
});

describe("S95.6 · Die Szenarien treffen ihre Dimension", () => {
  it("AUS-02 endet in offener Erregung, nicht in Klärung", () => {
    expect(finde("AUS-02").eingaben.join(" ")).toMatch(/sauer|wütend|zeigen/i);
  });

  it("AUS-03 fragt vor dem Abschluss — dort greift die Zusage-Regel", () => {
    expect(finde("AUS-03").eingaben.join(" ")).not.toContain("[CLOSE SESSION]");
  });

  it("AUS-04 und AUS-05 laufen bis zum Abschluss — dort steht die Gabelung", () => {
    for (const id of ["AUS-04", "AUS-05"])
      expect(finde(id).eingaben.join(" "), id).toContain("[CLOSE SESSION]");
  });
});
