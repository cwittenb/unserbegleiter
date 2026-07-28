// S98 · Korpus-Zusicherungen aus dem ersten Vollauf (2026-07-27, sonnet-5).
//
// Wie bei S96/S97: geprüft wird der TEXT, nicht das Modellverhalten. Drei
// Lehren des Vollaufs — die Absage braucht eine Grammatik (RCL-04, Nebenwirkung
// der S96-Sperre), die Abschluss-Weiche muss VOR Schritt 1 stehen (QZ-01), und
// die Erlebensfrage darf nicht vom Fragen-Budget verdrängt werden (MOM-01).

import { describe, it, expect } from "vitest";
import { K, setKorpusSprache } from "../../core/prompts/prompts.js";

const raum = () => K().reflexionsPrompt("Anna", "Bernd");
const moment = () => K().momentPrompt("Anna", "Bernd");
const beide = fn => {
  for (const sp of ["de", "en"]) { setKorpusSprache(sp); fn(sp); }
  setKorpusSprache("de");
};

describe("S98 · Grammatik der Absage (RCL-04)", () => {
  it("kein Selbstwiderspruch: nicht erst Zugriff behaupten und ihn später verneinen", () => {
    beide(sp => {
      const txt = raum();
      expect(txt, sp).toContain(sp === "de" ? "KEIN SELBSTWIDERSPRUCH" : "NO SELF-CONTRADICTION");
      expect(txt, sp).toContain(sp === "de" ? "ich habe keine Zusammenfassungen" : "I have no summaries");
    });
  });

  it("die Absage ist ein Satz, kein Gedankengang", () => {
    beide(sp => {
      const txt = raum();
      expect(txt, sp).toContain(sp === "de" ? "EIN SATZ, DANN WEITER" : "ONE SENTENCE, THEN ON");
      expect(txt, sp).toContain(sp === "de" ? "der Kontext fehlt mir schlicht" : "the context is simply missing for me");
    });
  });

  it("Anknüpfen braucht keinen Inhalt — der Faden wird nicht fallen gelassen", () => {
    beide(sp => {
      const txt = raum();
      expect(txt, sp).toContain(sp === "de" ? "ANKNÜPFEN BRAUCHT KEINEN INHALT" : "CONNECTING NEEDS NO CONTENT");
      expect(txt, sp).toContain(sp === "de"
        ? "Fehlender Wortlaut ist kein Grund, den Faden fallen zu lassen"
        : "Missing wording is no reason to drop the thread");
    });
  });
});

describe("S98 · Abschluss-Weiche vor Schritt 1 (QZ-01, K3)", () => {
  it("die Weiche steht vor Schritt 1, nicht dahinter", () => {
    beide(sp => {
      const txt = moment();
      const weiche = txt.indexOf(sp === "de" ? "PRÜFE ZUERST DIE WEICHE" : "CHECK THE SWITCH FIRST");
      const schritt1 = txt.indexOf(sp === "de" ? "SONST SCHRITT 1" : "OTHERWISE STEP 1");
      expect(weiche, sp).toBeGreaterThan(-1);
      expect(schritt1, sp).toBeGreaterThan(weiche);
    });
  });

  it("die Prozess-Schau-Frage nachträglich doch zu stellen ist ausdrücklich ein Verstoß", () => {
    beide(sp => {
      expect(moment(), sp).toContain(sp === "de"
        ? "sie danach doch noch zu stellen ist ein Verstoß"
        : "asking it anyway afterwards is a violation");
    });
  });
});

describe("S98 · Vorrang der Erlebensfrage (MOM-01)", () => {
  it("eine Klärungs- oder Bestätigungsfrage darf das Budget nicht aufbrauchen", () => {
    beide(sp => {
      const txt = moment();
      expect(txt, sp).toContain(sp === "de" ? "VORRANG DER ERLEBENSFRAGE (S98)" : "PRECEDENCE OF THE EXPERIENCE QUESTION (S98)");
      expect(txt, sp).toContain(sp === "de" ? "die andere wartet auf die nächste Nachricht" : "the other waits for the next message");
    });
  });

  it("die Sicherheitslogik bleibt ausgenommen", () => {
    beide(sp => {
      expect(moment(), sp).toContain(sp === "de" ? "geht Sicherheit vor" : "safety comes first");
    });
  });
});
