// PRV-6 · Gemeinsame Auflösung: Kern + Ablauf, Auftakt/Befund/Wiedereinstieg nur bei Anlass.
import { describe, it, expect } from "vitest";
import { phaseGemeinsam, bloeckeGemeinsam } from "../../core/policies/phasen.js";
import { baueSessionDef } from "../../core/komposition.js";
import { Engine } from "../../core/engine/engine.js";
import * as D from "../../core/prompts/prompts.de.js";
import * as E from "../../core/prompts/prompts.en.js";

const u = c => ({ role: "user", content: c });
const a = c => ({ role: "assistant", content: c });

describe("PRV-6 · Phase aus dem Verlauf", () => {
  for (const [sp, K] of [["de", D], ["en", E]]) {
    const aus = K.korpusTexte["klaerung.aufdeckAussteht"];
    it(sp + ": erster Zug ohne Aufdeckung → Start, kein Auftakt", () =>
      expect(phaseGemeinsam([u("HANDOVER")], K)).toEqual({ start: true, auftakt: false, befund: false, wiedereinstieg: false }));
    it(sp + ": Aufdeckung steht aus → Auftakt bis zum REVEAL-BLOCK", () => {
      expect(phaseGemeinsam([u("H " + aus), a("Bereit?"), u("Ja"), a("…"), u("REVEAL-SHOWN: …")], K).auftakt).toBe(true);
      expect(phaseGemeinsam([u("H " + aus), a("REVEAL-BLOCK\n{}\nEND REVEAL-BLOCK"), u("Anna: ok")], K).auftakt).toBe(false);
    });
    it(sp + ": [[SCALE-CLOSING]] → Befund", () => expect(phaseGemeinsam([u("H"), a("…\n[[SCALE-CLOSING]]"), u("SCALE-RESULT: closing …")], K).befund).toBe(true));
    it(sp + ": Wiedereinstieg nur als letzte Nachricht", () => {
      expect(phaseGemeinsam([u("H"), a("x"), u(K.steuerTexte.gemeinsamWeiter)], K).wiedereinstieg).toBe(true);
      expect(phaseGemeinsam([u(K.steuerTexte.gemeinsamWeiter), a("x"), u("Anna: ja")], K).wiedereinstieg).toBe(false);
    });
  }
});

describe("PRV-6 · Teile und Blöcke", () => {
  for (const [sp, K] of [["de", D], ["en", E]]) {
    const T = K.aufloesungsTeile("Anna", "Bernd");
    const ganz = K.aufloesungsPrompt("Anna", "Bernd");
    it(sp + ": Teile verkettet = Gesamttext", () => expect(Object.values(T).join("")).toBe(ganz));
    it(sp + ": Ablauf in jeder Phase, Abschied und Krisen-Vorrang im Kern", () => {
      for (const ph of [{}, { auftakt: true }, { befund: true }, { wiedereinstieg: true }]) {
        const t = bloeckeGemeinsam(T, ph).join("");
        expect(t).toContain(T.ablauf);
        expect(t).toContain(T["kern-b"]);
      }
    });
    it(sp + ": CLARIFICATION-BLOCK nur im Befund, REVEAL-BLOCK nur im Auftakt", () => {
      expect(bloeckeGemeinsam(T, {}).join("")).not.toContain("CLARIFICATION-BLOCK\n");
      expect(bloeckeGemeinsam(T, { befund: true }).join("")).toContain("CLARIFICATION-BLOCK\n");
      expect(bloeckeGemeinsam(T, {}).join("")).not.toContain("REVEAL-BLOCK\n");
      expect(bloeckeGemeinsam(T, { auftakt: true }).join("")).toContain("REVEAL-BLOCK\n");
    });
    it(sp + ": Sperrklinke — Mitte ≥ 20 % kleiner als der Gesamttext", () =>
      expect(bloeckeGemeinsam(T, {}).join("").length).toBeLessThan(ganz.length * 0.8));
  }
});

describe("PRV-6 · Engine", () => {
  it("gemeinsam: Kern gleich, Start nur im ersten Zug", async () => {
    const def = baueSessionDef("gemeinsam");
    const gesehen = [];
    const llm = async (system) => { gesehen.push(system); return { text: "Schön, dass ihr da seid.", stop: "end_turn" }; };
    const e = new Engine({ def, chat: { messages: [], status: "running" }, llm, ctx: { nameA: "Anna", nameB: "Bernd" } });
    await e.sendUser("Anna: Hallo");
    await e.sendUser("Bernd: Hallo");
    const T = D.aufloesungsTeile("Anna", "Bernd");
    expect(gesehen[0][0]).toBe(gesehen[1][0]);
    expect(gesehen[0][1].endsWith(T.start)).toBe(true);
    expect(gesehen[1][1]).toBe(T.ablauf);
  });
});
