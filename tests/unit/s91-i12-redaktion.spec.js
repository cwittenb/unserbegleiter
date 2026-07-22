// S91 · I12 auf Kern-Ebene: die Redaktionsfunktion pur (der Worker verwendet
// exakt sie beim GET) und die Fassaden-Delegation — trageMessbeitragEin /
// markiereAufgedeckt gehen auf servergeführten Plattformen über backend.mess
// und fassen den Bstate dort NIE direkt an.

import { describe, it, expect } from "vitest";
import { redigiereMessungenFuerRolle, trageMessbeitragEin, markiereAufgedeckt } from "../../core/ui/prozess.js";

const offenNurA = { id: "MR1", status: "open", values: { A: { closeness: 4, guess: 7, fit: {}, at: "t1" }, B: null } };
const ready = { id: "MR2", status: "ready", values: { A: { closeness: 4, guess: 7, fit: {} }, B: { closeness: 8, guess: 5, fit: {} } } };
const revealed = { id: "MR3", status: "revealed", revealedAt: "t3", values: { A: { closeness: 5, guess: 5, fit: {} }, B: { closeness: 6, guess: 6, fit: {} } } };

describe("S91 · redigiereMessungenFuerRolle (I12)", () => {
  it("offene Runde ohne eigenen Beitrag entfällt SAMT Existenz; mit eigenem bleibt sie", () => {
    const mr = { items: [offenNurA, ready, revealed] };
    const sichtB = redigiereMessungenFuerRolle(mr, "B");
    expect(sichtB.items.map(r => r.id)).toEqual(["MR2", "MR3"]);   // MR1 unsichtbar
    const sichtA = redigiereMessungenFuerRolle(mr, "A");
    expect(sichtA.items.map(r => r.id)).toEqual(["MR1", "MR2", "MR3"]);
    expect(sichtA.items[0].values.B).toBeNull();                   // Partner-Slot ohnehin leer
  });

  it("ready/revealed sind für beide Rollen VOLL sichtbar (die Aufdeckung braucht beide Beiträge)", () => {
    for (const rolle of ["A", "B"]) {
      const sicht = redigiereMessungenFuerRolle({ items: [ready, revealed] }, rolle);
      expect(sicht.items[0].values.A.closeness).toBe(4);
      expect(sicht.items[0].values.B.closeness).toBe(8);
    }
  });

  it("null/leer sind folgenlos", () => {
    expect(redigiereMessungenFuerRolle(null, "A").items).toEqual([]);
    expect(redigiereMessungenFuerRolle({ items: [] }, "B").items).toEqual([]);
  });
});

describe("S91 · Fassaden-Delegation (servergeführte Plattform)", () => {
  it("trageMessbeitragEin geht über backend.mess.beitrag — der Bstate wird nie berührt", async () => {
    const rufe = [];
    const backend = {
      mess: { beitrag: async b => { rufe.push(["beitrag", b]); return { id: "MR1", status: "open" }; } },
      bstate: { get: async () => { throw new Error("Bstate darf hier nie angefasst werden"); }, set: async () => { throw new Error("dito"); } },
    };
    const runde = await trageMessbeitragEin(backend, "A", { closeness: 4, guess: 7, fit: {} });
    expect(runde.id).toBe("MR1");
    expect(rufe).toEqual([["beitrag", { closeness: 4, guess: 7, fit: {} }]]);
  });

  it("markiereAufgedeckt geht über backend.mess.aufgedeckt; ohne rundeId bleibt es ein No-op", async () => {
    const rufe = [];
    const backend = {
      mess: { aufgedeckt: async id => rufe.push(id) },
      bstate: { get: async () => { throw new Error("nie"); }, set: async () => { throw new Error("nie"); } },
    };
    await markiereAufgedeckt(backend, "MR1");
    await markiereAufgedeckt(backend, null);                       // Guard VOR der Delegation
    expect(rufe).toEqual(["MR1"]);
  });
});
