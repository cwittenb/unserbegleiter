// RPM-Drossel (S51) — Slot-Scheduler mit injizierter Uhr, deterministisch bewiesen.
// Eine Instanz wird im Runner von Pipeline UND Judge geteilt (Workspace-Limit).

import { describe, it, expect } from "vitest";
import { baueDrossel } from "../../core/llm/adapter.js";

/** Fake-Uhr: schlaf(ms) treibt die Zeit deterministisch voran. */
function fakeUhr() {
  let t = 0;
  return {
    jetzt: () => t,
    schlaf: async ms => { t += ms; },
    verstrichen: () => t,
  };
}

describe("baueDrossel · Slot-Scheduler", () => {
  it("2 RPM ⇒ 30 s Abstand: nach 3 Aufrufen sind 60 s vergangen", async () => {
    const uhr = fakeUhr();
    const drossel = baueDrossel({ rpm: 2, uhr });
    expect(drossel.abstandMs).toBe(30000);
    const wartezeiten = [];
    let vorher = uhr.verstrichen();
    for (let i = 0; i < 3; i++) {
      await drossel();
      wartezeiten.push(uhr.verstrichen() - vorher);
      vorher = uhr.verstrichen();
    }
    expect(wartezeiten).toEqual([0, 30000, 30000]);   // erster sofort, dann je 30 s
    expect(uhr.verstrichen()).toBe(60000);
  });

  it("unter der Rate (Uhr springt zwischen den Aufrufen weiter) ⇒ keine künstliche Wartezeit", async () => {
    let t = 0;
    const uhr = { jetzt: () => t, schlaf: async ms => { t += ms; } };
    const drossel = baueDrossel({ rpm: 60, uhr });     // 1 s Abstand
    await drossel();                                    // reserviert Slot bei 0
    t += 5000;                                          // 5 s vergehen extern
    const vor = t;
    await drossel();                                    // liegt weit hinter dem Slot → kein Warten
    expect(t).toBe(vor);
  });

  it("unlimited (rpm 0) ist ein No-Op — keine Zeit vergeht, rpm=0 markiert", async () => {
    const uhr = fakeUhr();
    const drossel = baueDrossel({ rpm: 0, uhr });
    expect(drossel.rpm).toBe(0);
    for (let i = 0; i < 10; i++) await drossel();
    expect(uhr.verstrichen()).toBe(0);
  });

  it("ungültige/fehlende Rate ⇒ unlimited (No-Op), kein Absturz", async () => {
    for (const rpm of [undefined, NaN, -5, Infinity]) {
      const uhr = fakeUhr();
      const drossel = baueDrossel({ rpm, uhr });
      await drossel(); await drossel();
      expect(uhr.verstrichen()).toBe(0);
    }
  });

  it("geteiltes Budget: Aufrufe aus zwei Quellen (Pipeline+Judge) teilen sich EINE Instanz", async () => {
    const uhr = fakeUhr();
    const drossel = baueDrossel({ rpm: 4, uhr });        // 15 s Abstand
    // „Pipeline" und „Judge" rufen abwechselnd dieselbe Drossel:
    await drossel();   // Pipeline  (t=0)
    await drossel();   // Judge     (+15 s)
    await drossel();   // Pipeline  (+15 s)
    await drossel();   // Judge     (+15 s)
    expect(uhr.verstrichen()).toBe(45000);               // 3 Abstände über beide Quellen zusammen
  });
});
