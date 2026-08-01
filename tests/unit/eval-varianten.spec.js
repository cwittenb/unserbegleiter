// ST5.4 · Varianten-Aufteilung: der A/B-Lauf des GATE.

import { describe, it, expect } from "vitest";
import { varianten } from "../../evals/runner-kern.js";

const sz = (id, session) => ({ id, session, eingaben: ["x"], kontext: {} });
const KATALOG = [sz("S-1", "solo"), sz("M-1", "moment"), sz("E-1", "einzel"), sz("G-1", "gemeinsam"), sz("Q-1", "qualitytime")];

describe("varianten()", () => {
  it('Default "aus": alles genau einmal Textpfad (Altläufe bleiben vergleichbar)', () => {
    const v = varianten(KATALOG);
    expect(v).toHaveLength(5);
    expect(v.every(x => x.variante === "text")).toBe(true);
  });

  it('"an": solo/moment strukturiert, Kernwetten und QZ unverändert Text', () => {
    const v = varianten(KATALOG, "an");
    expect(v).toHaveLength(5);
    expect(v.filter(x => x.variante === "struktur").map(x => x.szenario.id)).toEqual(["S-1", "M-1"]);
    expect(v.filter(x => x.variante === "text").map(x => x.szenario.id)).toEqual(["E-1", "G-1", "Q-1"]);
  });

  it('"beides": strukturfähige Szenarien doppelt, andere einfach — Text zuerst', () => {
    const v = varianten(KATALOG, "beides");
    expect(v).toHaveLength(7);
    expect(v.filter(x => x.szenario.id === "S-1").map(x => x.variante)).toEqual(["text", "struktur"]);
    expect(v.filter(x => x.szenario.id === "M-1").map(x => x.variante)).toEqual(["text", "struktur"]);
    for (const id of ["E-1", "G-1", "Q-1"])
      expect(v.filter(x => x.szenario.id === id)).toHaveLength(1);
  });

  it("Kernwetten werden NIE strukturiert gefahren (bis ST6) — Kanarienvogel", () => {
    for (const modus of ["aus", "an", "beides"]) {
      const v = varianten(KATALOG, modus);
      const kern = v.filter(x => ["einzel", "gemeinsam"].includes(x.szenario.session));
      expect(kern.every(x => x.variante === "text"), modus).toBe(true);
    }
  });
});
