// PRV-7m · Qualitätszeit: Kern + Module (Ankommen, Aufdeckung, Abschluss) nur bei Anlass.
import { describe, it, expect } from "vitest";
import { phaseMoment, bloeckeMoment, NACH_AUFDECKUNG } from "../../core/policies/phasen.js";
import { baueSessionDef } from "../../core/komposition.js";
import { Engine } from "../../core/engine/engine.js";
import * as D from "../../core/prompts/prompts.de.js";
import * as E from "../../core/prompts/prompts.en.js";

const u = c => ({ role: "user", content: c });
const a = c => ({ role: "assistant", content: c });
const S = D.waechter.phasen;
const vor = [u("MOMENT-CONTEXT"), a("CHOICE-BLOCK"), u("CHOICE-RESULT: connect=Stille"), a("Übung"), u("Anna: schön")];

describe("PRV-7m · Phase", () => {
  it("Ankommen bis zur Wahl und eine Nachricht danach", () => {
    expect(phaseMoment([u("MOMENT-CONTEXT")], S).ankommen).toBe(true);
    expect(phaseMoment(vor.slice(0, 3), S).ankommen).toBe(true);
    expect(phaseMoment(vor, S).ankommen).toBe(true);
    expect(phaseMoment([...vor, a("x"), u("weiter")], S).ankommen).toBe(false);
  });
  it("Aufdeckung: fehlt die Marke → aktiv; danach noch NACH_AUFDECKUNG Nachrichten", () => {
    expect(phaseMoment(vor, S).aufdeckung).toBe(true);
    const nach = [...vor, a("…\n[[META-REVEALED]]")];
    for (let i = 1; i <= NACH_AUFDECKUNG; i++) { nach.push(u("" + i)); expect(phaseMoment(nach, S).aufdeckung).toBe(true); nach.push(a("x")); }
    nach.push(u("später"));
    expect(phaseMoment(nach, S).aufdeckung).toBe(false);
  });
  it("Abschluss: [CLOSE MOMENT] oder dankendes Abrunden, klebt", () => {
    expect(phaseMoment([...vor, u("[CLOSE MOMENT]")], S).abschluss).toBe(true);
    expect(phaseMoment([...vor, u("Anna: Danke dir, das war schön.")], S).abschluss).toBe(true);
    expect(phaseMoment([...vor, u("Lass uns hier einen Punkt machen."), a("Was nehmt ihr mit?"), u("Anna: Ruhe.")], S).abschluss).toBe(true);
    expect(phaseMoment(vor, S).abschluss).toBe(false);
  });
});

describe("PRV-7m · Teile und Blöcke", () => {
  for (const [sp, M] of [["de", D], ["en", E]]) {
    const T = { ...M.momentTeile("Anna", "Bernd"), rahmen: M.THEMEN_RAHMEN };
    it(sp + ": Teile verkettet = Gesamttext", () => expect(Object.values(M.momentTeile("Anna", "Bernd")).join("")).toBe(M.momentPrompt("Anna", "Bernd")));
    it(sp + ": Mitte = ein Block, ≥ 25 % kleiner; MOMENT-BLOCK nur mit Abschluss, GOAL-BLOCK immer", () => {
      const ganz = (M.momentPrompt("Anna", "Bernd") + M.THEMEN_RAHMEN).length;
      const mitte = bloeckeMoment(T, {});
      expect(mitte).toHaveLength(1);
      expect(mitte[0].length).toBeLessThan(ganz * 0.75);
      expect(mitte[0]).not.toContain("MOMENT-BLOCK\n");
      expect(mitte[0]).toContain("GOAL-BLOCK\n");
      expect(bloeckeMoment(T, { abschluss: true }).join("")).toContain("MOMENT-BLOCK\n");
    });
  }
});

describe("PRV-7m · Engine", () => {
  it("moment: Kern bleibt, Module wechseln", async () => {
    const def = baueSessionDef("moment");
    const gesehen = [];
    const llm = async (system) => { gesehen.push(system); return { text: "Schön, dass ihr da seid.", stop: "end_turn" }; };
    const e = new Engine({ def, chat: { messages: [], status: "running" }, llm, ctx: { nameA: "Anna", nameB: "Bernd" } });
    await e.sendUser("Anna: Hallo");
    await e.sendUser("[CLOSE MOMENT]");
    const T = D.momentTeile("Anna", "Bernd");
    expect(gesehen[0][0]).toBe(gesehen[1][0]);
    expect(gesehen[0][1]).toBe(T.ankommen + T.aufdeckung);
    expect(gesehen[1][1]).toBe(T.ankommen + T.aufdeckung + T.abschluss);
  });
});
