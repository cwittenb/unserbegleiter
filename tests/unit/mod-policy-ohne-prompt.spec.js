// MOD-2b · Policies greifen ohne Prompt.
//
// Die Review-Leitfrage "Werden Policies unabhaengig vom Modell durchgesetzt
// oder nur per Instruktion?" bekommt hier ihren Test: Eine Engine mit LEEREM
// Systemtext und einer Def aus dem Policy-Katalog
//   (a) schaerft bei Krisensignal den Zug — der Zusatz reist als Regie an der
//       letzten Nachricht (PRV-3; bis dahin im Systemtext),
//       obwohl der Korpus-Prompt fehlt;
//   (b) verweigert die Uebergabe "Frage + Abschluss-Block" — die Sitzung
//       endet nicht, der Text bleibt, die Kennung steht am Chat.
// Beides kommt aus core/policies, nicht aus dem Prompt und nicht aus dem
// Modell (Mock-LLM).
//
// Dazu die Katalog-Invarianten: jede Session-Art hat einen Eintrag, jeder
// Korpus-Schluessel existiert in DE und EN, unbekannte Namen sind laut, und
// die rohen Def-Fabriken tragen keine Waechter mehr — der Katalog ist die
// einzige Quelle.

import { describe, it, expect } from "vitest";
import { Engine } from "../../core/engine/engine.js";
import { baueSessionDef, SESSION_ARTEN } from "../../core/komposition.js";
import { POLICY_KATALOG } from "../../core/policies/katalog.js";
import { baueSchaerfe, baueUebergabe, korpusSchluessel, SCHAERFUNGEN, PRUEFUNGEN } from "../../core/policies/waechter.js";
import { soloDef, momentDef } from "../../core/ui/sessions.js";
import { einzelDef, gemeinsamDef } from "../../core/ui/kernwetten.js";
import * as de from "../../core/prompts/prompts.de.js";
import * as en from "../../core/prompts/prompts.en.js";

const hole = (obj, pfad) => pfad.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);

describe("MOD-2b · Policies greifen ohne Prompt (Engine + Mock-LLM)", () => {
  it("(a) Schaerfung: Krisensignal → Zusatz als Regie (PRV-3), obwohl der Prompt leer ist", async () => {
    const def = baueSessionDef("moment");
    def.sysPrompt = () => "";
    const systeme = [];
    const llm = async (system, msgs) => { systeme.push(msgs.at(-1).regie || ""); return { text: "Ich bin da.", stop: "end_turn" }; };
    const chat = { messages: [], status: "running" };
    const e = new Engine({ def, chat, llm, ctx: { nameA: "Anna", nameB: "Bernd" } });
    await e.sendUser("Anna: Ich will nicht mehr leben.");
    expect(systeme).toHaveLength(1);
    expect(systeme[0]).toContain(de.waechter.krise.text);
    // CR-4.1 · Fenster von drei Nachrichten: erst der vierte Zug ist wieder frei.
    await e.sendUser("Bernd: Wie war dein Tag?");
    await e.sendUser("Anna: Ganz gut.");
    await e.sendUser("Bernd: Schön.");
    systeme.splice(1, 2);
    expect(systeme[1]).not.toContain(de.waechter.krise.text);   // je Zug neu entschieden
  });

  it("(b) Uebergabe: Frage + TIMELINE-BLOCK nach [CLOSE SESSION] → verweigert, Sitzung laeuft weiter", async () => {
    const def = baueSessionDef("solo");
    def.sysPrompt = () => "";
    let zeitleiste = 0;
    def.blocks = def.blocks.map(b => b.dataset === "TIMELINE-BLOCK" ? { ...b, handle: () => { zeitleiste++; } } : b);
    const antwort = "Magst du das fuer dich behalten, oder soll etwas Bernd erreichen?\n" +
      "TIMELINE-BLOCK\n{\"summary\":\"x\",\"topics\":[],\"recurrenceNote\":null,\"goals\":[]}\nEND TIMELINE-BLOCK";
    const llm = async () => ({ text: antwort, stop: "end_turn" });
    const chat = { messages: [], status: "running" };
    const e = new Engine({ def, chat, llm, ctx: { me: "Anna", partner: "Bernd" } });
    await e.submitToolResult(de.steuerTexte.soloAbschluss, { hidden: true });
    expect(chat.letzteVerweigerung).toBe("abschluss-mit-frage");
    expect(zeitleiste).toBe(0);                     // Block NICHT ausgefuehrt
    expect(chat.status).toBe("running");            // Sitzung NICHT beendet
    expect(chat.messages[chat.messages.length - 1].content).toBe(antwort);   // Text bleibt
  });
});

describe("MOD-2b · Katalog-Invarianten", () => {
  it("jede Session-Art hat einen Eintrag — und nur die", () => {
    expect(Object.keys(POLICY_KATALOG).sort()).toEqual([...SESSION_ARTEN].sort());
  });
  it("jeder Korpus-Schluessel existiert in DE und EN", () => {
    for (const [art, eintrag] of Object.entries(POLICY_KATALOG)) {
      for (const pfad of korpusSchluessel(eintrag)) {
        expect(hole(de, pfad), art + " de " + pfad).toBeDefined();
        expect(hole(en, pfad), art + " en " + pfad).toBeDefined();
      }
    }
  });
  it("jeder Name im Katalog ist registriert", () => {
    for (const eintrag of Object.values(POLICY_KATALOG)) {
      for (const n of eintrag.schaerfungen) expect(SCHAERFUNGEN[n], n).toBeTypeOf("function");
      for (const p of eintrag.pruefungen) expect(PRUEFUNGEN[p.art], p.art).toBeTypeOf("function");
    }
  });
  it("unbekannte Namen sind laut", () => {
    expect(() => baueSchaerfe({ schaerfungen: ["gibtsnicht"] }, () => de)).toThrow(/Unbekannte Schaerfung/);
    expect(() => baueUebergabe({ pruefungen: [{ art: "gibtsnicht" }] }, () => de)).toThrow(/Unbekannte Uebergabe/);
    expect(baueSchaerfe({ schaerfungen: [] }, () => de)).toBeNull();
    expect(baueUebergabe({ pruefungen: [] }, () => de)).toBeNull();
  });
  it("K2 · der Urteils-Erkenner ist registriert, aber keiner Session zugeordnet", () => {
    expect(PRUEFUNGEN.urteil).toBeTypeOf("function");
    for (const eintrag of Object.values(POLICY_KATALOG))
      expect(eintrag.pruefungen.some(p => p.art === "urteil")).toBe(false);
    expect(PRUEFUNGEN.urteil({})("Das ist ein großer Satz.")).toBe("urteil");
  });
  it("die Zuordnung ist die bisherige (S105.3 / MRV.3 / S103)", () => {
    // PRV-4: die Theorie-Karten hängen in jeder Art hinten an.
    expect(POLICY_KATALOG.moment.schaerfungen).toEqual(["krise", "zweiseitigkeit", "anteile", "entwicklung"]);
    expect(POLICY_KATALOG.gemeinsam.schaerfungen).toEqual(["aufdeck", "krise", "zweiseitigkeit", "anteile", "entwicklung"]);
    expect(POLICY_KATALOG.solo.schaerfungen).toEqual(["anteile", "entwicklung"]);
    expect(POLICY_KATALOG.einzel).toEqual({ schaerfungen: ["anteile", "entwicklung"], pruefungen: [], phasen: "einzel" });   // PRV-5
    expect(POLICY_KATALOG.moment.pruefungen.map(p => p.art)).toEqual(["abschluss", "meta"]);
    expect(POLICY_KATALOG.gemeinsam.pruefungen.map(p => p.art)).toEqual(["marken"]);
  });
});

describe("MOD-2b · Die rohen Def-Fabriken tragen keine Waechter mehr", () => {
  const stumm = { pstate: { get: async () => null, set: async () => true }, bstate: { get: async () => null, set: async () => true } };
  it("schaerfe/pruefeUebergabe kommen nur aus der Komposition", () => {
    for (const [art, bau] of Object.entries({ solo: soloDef, moment: momentDef, einzel: einzelDef, gemeinsam: gemeinsamDef })) {
      const roh = bau(stumm, {});
      expect(roh.schaerfe, art).toBeUndefined();
      expect(roh.pruefeUebergabe, art).toBeUndefined();
      const komponiert = baueSessionDef(art, { backend: stumm });
      const soll = POLICY_KATALOG[art];
      expect(typeof komponiert.schaerfe, art).toBe(soll.schaerfungen.length ? "function" : "undefined");
      expect(typeof komponiert.pruefeUebergabe, art).toBe(soll.pruefungen.length ? "function" : "undefined");
    }
  });
});
