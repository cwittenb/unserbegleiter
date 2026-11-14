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
      expect(txt, sp).toContain(sp === "de" ? "Eine Aussage über deinen Zugriff gilt vom ersten bis zum letzten Zug" : "A statement about your access holds from the first turn to the last");
      expect(txt, sp).not.toContain(sp === "de" ? "ich habe keine Zusammenfassungen" : "I have no summaries");   // PRV-1b: der schlimmste Fall steht nur noch in der Quelle
    });
  });

  it("die Absage ist ein Satz, kein Gedankengang", () => {
    beide(sp => {
      const txt = raum();
      expect(txt, sp).toContain(sp === "de" ? "Ein Satz, dann weiter" : "One sentence, then on");
      expect(txt, sp).not.toContain(sp === "de" ? "der Kontext fehlt mir schlicht" : "the context is simply missing for me");   // PRV-1b
    });
  });

  it("Anknüpfen braucht keinen Inhalt — der Faden wird nicht fallen gelassen", () => {
    beide(sp => {
      const txt = raum();
      expect(txt, sp).toContain(sp === "de" ? "Anknüpfen braucht keinen Inhalt" : "Connecting needs no content");
      expect(txt, sp).toContain(sp === "de"
        ? "der Faden bleibt, auch ohne Wortlaut"
        : "the thread stays, even without wording");
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
        ? "entfällt die Prozess-Schau-Frage ersatzlos"
        : "the process-look question is then dropped without replacement");
    });
  });
});

// PRV-11.1: Der "Vorrang der Erlebensfrage" ist gestrichen — er traf auch Skepsis,
// benannte Wut und frische Einsicht (rev-int: F3, F5, F6a je 3/3). Geblieben ist,
// was S98 schützen wollte: Eine Prozess- oder Okay-Frage ersetzt die Vertiefung nicht.
describe("S98 · Die Vertiefung wird nicht von einer Prozessfrage verdrängt (MOM-01)", () => {
  it("eine Prozess- oder Okay-Frage ersetzt die Vertiefung nicht", () => {
    beide(sp => {
      const txt = moment();
      expect(txt, sp).toContain(sp === "de" ? "Eine Prozess- oder Okay-Frage ersetzt die Vertiefung nicht" : "A process or okay question does not replace the deepening");
      expect(txt, sp).not.toContain(sp === "de" ? "VORRANG DER ERLEBENSFRAGE" : "PRECEDENCE OF THE EXPERIENCE QUESTION");
    });
  });

  it("die Sicherheitslogik bleibt ausgenommen", () => {
    beide(sp => {
      expect(moment(), sp).toContain(sp === "de" ? "geht Sicherheit vor" : "safety comes first");
    });
  });
});
