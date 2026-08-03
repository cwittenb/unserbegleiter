// S97 · Korpus- und Katalog-Zusicherungen aus dem Re-Run 2026-07-27/2.
//
// Wie bei S96: geprüft wird der TEXT, nicht das Modellverhalten. Diese Kanarien
// halten die drei Lehren des Re-Runs fest — die Gabelung braucht ihre Regel am
// Auslöser (AUS-04/05), das Einholen ist anlassgebunden (MRV-02), und die
// Trajektorie braucht Züge (MRV-03).

import { describe, it, expect } from "vitest";
import { K, setKorpusSprache } from "../../core/prompts/prompts.js";
import { SZENARIEN } from "../../evals/szenarien/start-katalog.js";
import { SZENARIEN_EN } from "../../evals/szenarien/start-katalog.en.js";

const raum = () => K().reflexionsPrompt("Anna", "Bernd");
const moment = () => K().momentPrompt("Anna", "Bernd");
const beide = fn => {
  for (const sp of ["de", "en"]) { setKorpusSprache(sp); fn(sp); }
  setKorpusSprache("de");
};
const byId = id => [...SZENARIEN, ...SZENARIEN_EN].find(s => s.id === id);

describe("S97 · Gabelung am Auslöser (AUS-04/05)", () => {
  it("die Reihenfolge steht am [CLOSE SESSION]-Anlass selbst, nicht nur im TEILEN-Absatz", () => {
    beide(sp => {
      const txt = raum();
      expect(txt, sp).toContain(sp === "de" ? "REIHENFOLGE (S97)" : "ORDER (S97)");
      // Die Regel muss VOR der Block-Anweisung stehen, sonst greift sie nicht am Auslöser.
      const anlass = txt.indexOf(sp === "de" ? "REIHENFOLGE (S97)" : "ORDER (S97)");
      const gabelung = txt.indexOf(sp === "de" ? "ABSCHLUSS – DREI TÜREN" : "CLOSE – THREE DOORS");
      expect(anlass, sp).toBeGreaterThan(gabelung); // Verweis zeigt zurück auf die Türen
      expect(anlass, sp).toBeGreaterThan(-1);
    });
  });

  it("der Block allein löst die Zusage nicht ein", () => {
    beide(sp => {
      expect(raum(), sp).toContain(sp === "de"
        ? "der Block allein löst die Zusage von unterwegs nicht ein"
        : "the block alone does not redeem the commitment made along the way");
    });
  });
});

describe("S97 · Einholen ohne Cues (MRV-02, K1a)", () => {
  it("die Regel steht im Moment-Prompt und ist anlassgebunden", () => {
    beide(sp => {
      const txt = moment();
      expect(txt, sp).toContain(sp === "de" ? "EINHOLEN OHNE CUES (S97)" : "CHECKING IN WITHOUT CUES (S97)");
      expect(txt, sp).toContain(sp === "de" ? "über die Sache der anderen bestimmt" : "determines a matter that is the other's");
    });
  });

  it("der Anlass wird nicht ausgesprochen (Exposition im gemeinsamen Raum)", () => {
    beide(sp => {
      expect(moment(), sp).toContain(sp === "de"
        ? "Den Anlass sprichst du NICHT aus"
        : "You do NOT name the occasion");
    });
  });

  it("einmal, ohne Nachhaken — kein Verhör", () => {
    beide(sp => {
      expect(moment(), sp).toContain(sp === "de" ? "kein Verhör" : "no interrogation");
    });
  });
});

describe("S97 · Katalog", () => {
  it("MRV-02 v3: Einholen anlassgebunden gefordert, Partikel sind keine Wertung (de + en)", () => {
    for (const id of ["MRV-02", "MRV-02-EN"]) {
      const s = byId(id);
      expect(s, id).toBeTruthy();
      expect(s.version, id).toBe(3);
      const c2 = s.checks.find(c => c.id === "C2");
      expect(c2.frage, id).toMatch(id.endsWith("EN") ? /Discourse particles/ : /Gesprächspartikel/);
      expect(c2.frage, id).toMatch(id.endsWith("EN") ? /matter that is Bernd's/ : /über Bernds Sache/);
    }
  });

  it("MRV-03: fünf Eingaben, damit die Trajektorie erreichbar ist (de + en)", () => {
    // S107 · Die Version zählt hoch, sobald sich Checks oder Kontext ändern —
    // hier geprüft wird der Zuschnitt (fünf Eingaben), nicht die Zahl.
    for (const id of ["MRV-03", "MRV-03-EN"]) {
      const s = byId(id);
      expect(s, id).toBeTruthy();
      expect(s.version, id).toBeGreaterThanOrEqual(2);
      expect(s.eingaben.length, id).toBe(5);
    }
  });

  it("die Nachfrage nach dem Verlauf steht am Ende, nicht mitten im Reveal", () => {
    for (const id of ["MRV-03", "MRV-03-EN"]) {
      const s = byId(id);
      expect(s.eingaben.at(-1), id).toMatch(/letzten Malen|last few times/);
    }
  });
});
