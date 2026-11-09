// PRV-5 · Phasen-Komposition, Pilot einzel: Kern + Kapitelmodul statt des ganzen Textes.
import { describe, it, expect } from "vitest";
import { phaseEinzel, bloeckeEinzel } from "../../core/policies/phasen.js";
import { baueSessionDef } from "../../core/komposition.js";
import { Engine } from "../../core/engine/engine.js";
import { LLM_PROVIDERS } from "../../core/llm/providers/index.js";
import { istSystemGueltig, systemAlsText } from "../../core/llm/system.js";
import * as D from "../../core/prompts/prompts.de.js";
import * as E from "../../core/prompts/prompts.en.js";

const u = c => ({ role: "user", content: c });
const a = c => ({ role: "assistant", content: c });

describe("PRV-5 · Phase aus dem Verlauf", () => {
  for (const [sp, M] of [["de", D], ["en", E]]) {
    const S = M.steuerTexte;
    const weiter = n => S.weiterMitKapitel.replace("{n}", n);
    it(sp + ": leer → Kapitel 1", () => expect(phaseEinzel([], S)).toEqual({ kapitel: 1, nachklang: false, wiedereinstieg: false }));
    it(sp + ": Marke CHAPTER-1 → Kapitel 2 (schon vor dem Weiter-Klick)", () =>
      expect(phaseEinzel([u("x"), a("…\n[[CHAPTER-1]]")], S).kapitel).toBe(2));
    it(sp + ": Weiter mit Kapitel 3", () => expect(phaseEinzel([u(weiter(3))], S).kapitel).toBe(3));
    it(sp + ": Panel-Untergrenzen (RANKING ⇒ 2, PARTNER-GUESS ⇒ 3)", () => {
      expect(phaseEinzel([u("RANKING-RESULT: …")], S).kapitel).toBe(2);
      expect(phaseEinzel([u("PARTNER-GUESS: …")], S).kapitel).toBe(3);
    });
    it(sp + ": nie über 4; CHAPTER-3 → 4", () => expect(phaseEinzel([a("[[CHAPTER-3]]"), u(weiter(9))], S).kapitel).toBe(4));
    it(sp + ": Wiedereinstieg nur, wenn er die letzte Nachricht der Person ist", () => {
      expect(phaseEinzel([a("[[CHAPTER-1]]"), u(S.einzelWeiter)], S)).toEqual({ kapitel: 2, nachklang: false, wiedereinstieg: true });
      expect(phaseEinzel([u(S.einzelWeiter), a("Willkommen zurück"), u("ja")], S).wiedereinstieg).toBe(false);
    });
    it(sp + ": Rückkehr nach Abschluss → Nachklang", () => expect(phaseEinzel([a("[[CHAPTER-3]]"), u(S.einzelRueckkehr)], S).nachklang).toBe(true));
  }
});

describe("PRV-5 · Teile und Blöcke", () => {
  for (const [sp, M] of [["de", D], ["en", E]]) {
    const T = M.klaerungsTeile("Anna", "Bernd");
    it(sp + ": Teile verkettet = Gesamttext", () => expect(Object.values(T).join("")).toBe(M.klaerungsPrompt("Anna", "Bernd")));
    it(sp + ": Kern trägt Krisen-Vorrang, kein Kapitel; Modul genau ein Kapitel", () => {
      const [kern, modul] = bloeckeEinzel(T, { kapitel: 3, nachklang: false, wiedereinstieg: false });
      expect(kern).toContain(T.krise.trim());
      expect(kern).not.toContain(T["kapitel-1"].trim());
      expect(modul).toBe(T["kapitel-3"]);
    });
    it(sp + ": Kapitel 1 mit Startsatz; Wiedereinstieg hängt an; Nachklang allein", () => {
      expect(bloeckeEinzel(T, { kapitel: 1 })[1]).toBe(T["kapitel-1"] + T.start);
      expect(bloeckeEinzel(T, { kapitel: 2, wiedereinstieg: true })[1]).toBe(T["kapitel-2"] + T.wiedereinstieg);
      expect(bloeckeEinzel(T, { kapitel: 4, nachklang: true })[1]).toBe(T.nachklang);
    });
    it(sp + ": Sperrklinke — jede Phase ≤ 6 500 Token (Zeichen/3,4), deutlich unter dem Gesamttext", () => {
      const ganz = M.klaerungsPrompt("Anna", "Bernd").length;
      for (const ph of [{ kapitel: 1 }, { kapitel: 2 }, { kapitel: 3 }, { kapitel: 4 }, { kapitel: 4, nachklang: true }, { kapitel: 2, wiedereinstieg: true }]) {
        const n = bloeckeEinzel(T, ph).join("").length;
        expect(n / 3.4, JSON.stringify(ph)).toBeLessThanOrEqual(6500);
        expect(n).toBeLessThan(ganz * 0.75);
      }
    });
    it(sp + ": Format-Blöcke nur in ihrem Kapitel — CLOSURE nur in Kapitel 4", () => {
      for (const k of [1, 2, 3]) expect(bloeckeEinzel(T, { kapitel: k }).join("")).not.toContain("CLOSURE-BLOCK\n");
      expect(bloeckeEinzel(T, { kapitel: 4 }).join("")).toContain("CLOSURE-BLOCK\n");
    });
  }
});

describe("PRV-5 · Engine und Provider", () => {
  it("einzel: Systemtext je Zug [Kern, Modul], Kapitelwechsel wechselt das Modul, Kern bleibt", async () => {
    const def = baueSessionDef("einzel");
    const gesehen = [];
    const llm = async (system) => { gesehen.push(system); return { text: gesehen.length === 1 ? "Gut.\n[[CHAPTER-1]]" : "Weiter.", stop: "end_turn" }; };
    const e = new Engine({ def, chat: { messages: [], status: "running" }, llm, ctx: { me: "Anna", partner: "Bernd" }, hooks: {} });
    e.def.markers["[[CHAPTER-1]]"] = () => {};
    await e.sendUser("Hallo");
    await e.sendUser(D.steuerTexte.weiterMitKapitel.replace("{n}", 2));
    expect(Array.isArray(gesehen[0])).toBe(true);
    expect(gesehen[0][0]).toBe(gesehen[1][0]);
    expect(gesehen[0][1]).toContain("KAPITEL 1 ·");
    expect(gesehen[1][1]).toContain("KAPITEL 2 ·");
  });
  it("seit PRV-7m haben alle vier Arten Phasen-Komposition", () => { for (const a of ["einzel", "gemeinsam", "solo", "moment"]) expect(baueSessionDef(a).sysBloecke, a).toBeTypeOf("function"); });
  it("Anthropic mit Cache: zwei Systemblöcke, je ein Breakpoint", () => {
    const b = LLM_PROVIDERS.anthropic.body({ models: { anthropic: "m" }, maxTokens: 9, cache: true }, ["KERN", "MODUL"], [u("x")]);
    expect(b.system.map(x => x.text)).toEqual(["KERN", "MODUL"]);
    expect(b.system.every(x => x.cache_control)).toBe(true);
  });
  it("Anthropic ohne Cache und OpenAI-kompatibel: verbunden", () => {
    expect(LLM_PROVIDERS.anthropic.body({ models: { anthropic: "m" }, maxTokens: 9 }, ["KERN", "MODUL"], [u("x")]).system).toBe("KERNMODUL");
    expect(LLM_PROVIDERS.mistral.body({ models: { mistral: "m" }, maxTokens: 9 }, ["KERN", "MODUL"], [u("x")]).messages[0].content).toBe("KERNMODUL");
  });
  it("Worker-Prüfung: String oder 1–3 Strings", () => {
    expect(istSystemGueltig("x")).toBe(true);
    expect(istSystemGueltig(["a", "b"])).toBe(true);
    expect(istSystemGueltig([])).toBe(false);
    expect(istSystemGueltig(["a", 1])).toBe(false);
    expect(systemAlsText(["a", "b"])).toBe("ab");
  });
});
