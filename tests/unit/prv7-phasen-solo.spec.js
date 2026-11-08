// PRV-7 · Reflexionsgespräch: Kern + Module (Einstieg, Teilen, Abruf) nur bei Anlass.
import { describe, it, expect } from "vitest";
import { phaseSolo, bloeckeSolo } from "../../core/policies/phasen.js";
import { baueSessionDef } from "../../core/komposition.js";
import { Engine } from "../../core/engine/engine.js";
import * as D from "../../core/prompts/prompts.de.js";
import * as E from "../../core/prompts/prompts.en.js";
import { SIGNALE as SD } from "../../core/korpus/de/signale.js";
import { SIGNALE as SE } from "../../core/korpus/en/signale.js";

const u = c => ({ role: "user", content: c });
const a = c => ({ role: "assistant", content: c });
const S = D.waechter.phasen;

describe("PRV-7 · Signale", () => {
  it("DE = EN", () => { for (const k of ["teilen", "abruf", "ende"]) expect(String(SE[k])).toBe(String(SD[k])); });
  const fall = {
    teilen: ["Das soll er wissen.", "Ich glaube, ich möchte ihm etwas davon zeigen.", "Ich wünschte, sie könnte das lesen.", "Das möchte ich teilen.", "I want to share this with him.", "He should know this.",
      "Bernd kümmert sich abends nie um die Kinder. Ich will ihm das endlich sagen, ohne dass es wieder Streit gibt.",
      "Ich hätte Angst, dass ihn das verletzt, wenn er das liest.",
      "Ehrlich gesagt traue ich mich gerade überhaupt nicht, irgendetwas davon anzusprechen. Ich habe Angst, wie Bernd reagiert."],
    abruf: ["Wir hatten doch vor ein paar Wochen dieses Gespräch über meine Schwester.", "Was hatte ich denn damals dazu gesagt?", "Wir hatten letzte Woche über die Abende gesprochen.", "We talked about this last week.", "What did I say back then?"],
    ende: ["[CLOSE SESSION]", "[CLOSE SESSION · KEEP]", "Lass uns für heute aufhören.", "Danke für heute, ich muss los.", "Let's stop here for today.", "[CHECKPOINT]"],
  };
  for (const [k, liste] of Object.entries(fall)) for (const t of liste) it(k + ": " + t, () => expect(SD[k].test(t)).toBe(true));
  it("Alltag trifft keins", () => {
    for (const t of ["Mich beschäftigt, dass Bernd am Wochenende nur am Rechner sitzt.", "Ich fühle mich abends oft allein.", "Ja, das trifft es."])
      for (const k of ["teilen", "abruf", "ende"]) expect(SD[k].test(t), k + ": " + t).toBe(false);
  });
});

describe("PRV-7 · Phase und Blöcke", () => {
  it("Einstieg nur vor der ersten Antwort", () => {
    expect(phaseSolo([u("hi")], S).einstieg).toBe(true);
    expect(phaseSolo([u("hi"), a("x"), u("weiter")], S).einstieg).toBe(false);
  });
  it("Teilen klebt für die Sitzung; Abschluss-Token und End-Signal öffnen es", () => {
    expect(phaseSolo([u("Das soll er wissen."), a("x"), u("a"), a("y"), u("b"), a("z"), u("c")], S).teilen).toBe(true);
    expect(phaseSolo([u("hi"), a("x"), u("[CLOSE SESSION]")], S).teilen).toBe(true);
    expect(phaseSolo([u("hi"), a("x"), u("weiter")], S).teilen).toBe(false);
  });
  it("Abruf: Fenster 3, RECALL-RESULT, eigener RECALL-BLOCK", () => {
    expect(phaseSolo([u("Wir hatten letzte Woche darüber gesprochen."), a("x"), u("ja"), a("y"), u("ok")], S).abruf).toBe(true);
    expect(phaseSolo([u("Wir hatten letzte Woche darüber gesprochen."), a("x"), u("1"), a("y"), u("2"), a("z"), u("3")], S).abruf).toBe(false);
    expect(phaseSolo([u("hi"), a("x"), u("RECALL-RESULT\n…")], S).abruf).toBe(true);
    expect(phaseSolo([u("hi"), a("RECALL-BLOCK\n{}\nEND RECALL-BLOCK"), u("ok")], S).abruf).toBe(true);
  });
  for (const [sp, M] of [["de", D], ["en", E]]) {
    const T = { ...M.reflexionsTeile("Anna", "Bernd"), rahmen: M.THEMEN_RAHMEN };
    it(sp + ": Teile verkettet = Gesamttext", () => expect(Object.entries(M.reflexionsTeile("Anna", "Bernd")).map(([, v]) => v).join("")).toBe(M.reflexionsPrompt("Anna", "Bernd")));
    it(sp + ": Mitte ohne Anlass = nur Kern (ein Block), mit allem = alle Teile", () => {
      expect(bloeckeSolo(T, { einstieg: false, teilen: false, abruf: false })).toHaveLength(1);
      const alles = bloeckeSolo(T, { einstieg: true, teilen: true, abruf: true }).join("");
      expect(alles.length).toBe((M.reflexionsPrompt("Anna", "Bernd") + M.THEMEN_RAHMEN).length);
    });
    it(sp + ": Sperrklinke — Mitte ≤ 7 000 Token und ≥ 40 % kleiner als der Gesamttext", () => {
      const ganz = (M.reflexionsPrompt("Anna", "Bernd") + M.THEMEN_RAHMEN).length;
      const mitte = bloeckeSolo(T, { einstieg: false, teilen: false, abruf: false }).join("").length;
      expect(mitte / 3.4).toBeLessThanOrEqual(7000);
      expect(mitte).toBeLessThan(ganz * 0.6);
    });
    it(sp + ": Formate in ihrem Modul — GATE/EXCERPT nur mit Teilen, TIMELINE immer", () => {
      const mitte = bloeckeSolo(T, { einstieg: false, teilen: false, abruf: false }).join("");
      expect(mitte).not.toContain("GATE-BLOCK\n");
      expect(mitte).not.toContain("EXCERPT-BLOCK\n");
      expect(mitte).toContain("TIMELINE-BLOCK\n");
      expect(bloeckeSolo(T, { teilen: true }).join("")).toContain("GATE-BLOCK\n");
    });
  }
});

describe("PRV-7 · Engine", () => {
  it("solo: Kern bleibt, Einstieg nur im ersten Zug, Teilen ab dem Wunsch", async () => {
    const def = baueSessionDef("solo");
    const gesehen = [];
    const llm = async (system) => { gesehen.push(system); return { text: "Ich höre dich.", stop: "end_turn" }; };
    const e = new Engine({ def, chat: { messages: [], status: "running" }, llm, ctx: { me: "Anna", partner: "Bernd" } });
    await e.sendUser("Hallo");
    await e.sendUser("Mir geht es heute besser.");
    await e.sendUser("Das soll Bernd wissen.");
    const T = D.reflexionsTeile("Anna", "Bernd");
    expect(gesehen[0][0]).toBe(gesehen[1][0]);
    expect(gesehen[0][1]).toBe(T.einstieg);
    expect(gesehen[1]).toHaveLength(1);
    expect(gesehen[2][1]).toBe(T.teilen);
  });
});
