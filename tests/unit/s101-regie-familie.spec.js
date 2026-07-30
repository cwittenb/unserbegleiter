// @vitest-environment happy-dom
// S101 · Die größere Familie: Regie-Übergabe.
//
// S100 hat die Abschluss-Familie zusammengefasst — zwei Sessions, die über
// Knopf und Block schließen. Beim Nachtrag (F1 vollständig) kam die dritte
// Session dazu, und mit ihr zwei Befunde, die das Staffeln verdeckt hatte:
//
//   1. Der Baustein bündelte ZWEI Familien. Landungs-Pflicht und
//      Speicher-Verbot gelten nur, wo eine Sitzung endet und etwas abgelegt
//      wird — für eine Aufdeck-Marke gibt es beides nicht.
//   2. Die Auflösung war NICHT bewacht. Der Aufdeck-Wächter prüft etwas
//      anderes und steigt bei gesetzter Marke ausdrücklich aus; der Fall
//      "Frage UND Marke" fiel durch beide Netze.

import { describe, it, expect } from "vitest";
import { gemeinsamDef } from "../../core/ui/kernwetten.js";
import { reflexionsPrompt, momentPrompt, aufloesungsPrompt, steuerTexte } from "../../core/prompts/prompts.de.js";
import { bausteine } from "../../core/prompts/prompts.de.js";
import { bausteine as bausteineEn } from "../../core/prompts/prompts.en.js";

const backendStumm = () => ({
  pstate: { get: async () => null, set: async () => true },
  bstate: { get: async () => null, set: async () => true },
});

describe("S101 · Der Baustein trägt nur die Invariante", () => {
  it("die FOLGE ist Parameter — sie unterscheidet sich je Übergabe", () => {
    const ende = bausteine.regieUebergabe("einen TIMELINE-BLOCK", "Anna", "sie beendet damit die Sitzung");
    const tafel = bausteine.regieUebergabe("eine Aufdeck-Marke", "die beiden", "sie zeigt dann die Tafel");
    expect(ende).toContain("sie beendet damit die Sitzung");
    expect(tafel).toContain("sie zeigt dann die Tafel");
    // Der Kern ist in beiden derselbe.
    for (const t of [ende, tafel]) {
      expect(t).toContain("REGIE-ÜBERGABE");
      expect(t).toMatch(/fragen UND übergeben in einer Nachricht ist ein Verstoß/);
    }
  });

  it("die Abschluss-Pflichten sind ein EIGENER Baustein (de+en)", () => {
    for (const b of [bausteine, bausteineEn]) {
      expect(typeof b.abschlussPflichten).toBe("string");
      expect(b.regieUebergabe("X", "Y", "Z")).not.toContain(b.abschlussPflichten);
    }
  });
});

/* ═══════════════ 5 · S101 · Die größere Familie: Regie-Übergabe ═══════════════

   Die Abschluss-Familie hat zwei Mitglieder. Die Regel dahinter hat drei: Die
   Auflösung übergibt die Regie nicht mit einem Block, sondern mit einer
   Aufdeck-Marke — die App zeigt dann die Tafel. Die Folge ist eine andere
   (Sitzung endet vs. Tafel erscheint), die Invariante dieselbe: Wer fragt,
   übergibt nicht.
   Bis S101 stand die Regel in der Auflösung nur im Prompt. Der Aufdeck-Wächter
   prüft etwas anderes und steigt bei gesetzter Marke ausdrücklich aus — dieser
   Fall fiel durch beide Netze. */

const REGIE_FAMILIE = [
  { titel: "Reflexionsgespräch", element: "einen TIMELINE-BLOCK", prompt: () => reflexionsPrompt("Anna", "Bernd") },
  { titel: "Qualitätszeit",      element: "einen MOMENT-BLOCK",   prompt: () => momentPrompt("Anna", "Bernd") },
  { titel: "Auflösung",          element: "eine Aufdeck-Marke",   prompt: () => aufloesungsPrompt("Anna", "Bernd") },
];

describe("S101 · Alle drei kennen die Invariante", () => {
  for (const f of REGIE_FAMILIE) {
    it(`${f.titel}: die Regel nennt das eigene Übergabe-Element`, () => {
      const p = f.prompt();
      expect(p).toContain("REGIE-ÜBERGABE");
      expect(p).toContain("NIE " + f.element);
    });
  }

  it("die Abschluss-Pflichten haben eine KLEINERE Familie — die Auflösung landet nicht", () => {
    // Landungs-Pflicht und Speicher-Verbot gelten nur, wo eine Sitzung endet
    // und etwas abgelegt wird. Für die Aufdeck-Marke gibt es beides nicht;
    // sie mitzufordern wäre eine Regel ohne Gegenstand.
    expect(reflexionsPrompt("Anna", "Bernd")).toContain("LANDUNGS-PFLICHT");
    expect(momentPrompt("Anna", "Bernd")).toContain("LANDUNGS-PFLICHT");
    expect(aufloesungsPrompt("Anna", "Bernd")).not.toContain("LANDUNGS-PFLICHT");
  });
});

describe("S101 · Die Auflösung ist jetzt bewacht, nicht nur gewarnt", () => {
  const def = () => gemeinsamDef(backendStumm(), {});
  const eng = { chat: { messages: [] }, ctx: { nameA: "Anna", nameB: "Bernd" } };

  it("Bereitschaftsfrage UND Aufdeck-Marke ⇒ Revision", () => {
    expect(def().validiereAntwort("Seid ihr beide bereit?\n[[REVEAL-A]]", eng))
      .toBe(steuerTexte.markenRevision);
  });

  it("Ankündigung ohne Frage ⇒ frei", () => {
    expect(def().validiereAntwort("Dann zuerst Annas Stapel.\n[[REVEAL-A]]", eng)).toBeNull();
  });

  it("Frage ohne Marke ⇒ frei — nach der Tafel ist Fragen ausdrücklich richtig", () => {
    expect(def().validiereAntwort("Was fällt euch zuerst auf?", eng)).toBeNull();
  });

  it("beide Richtungen zählen gleich", () => {
    expect(def().validiereAntwort("Mögt ihr?\n[[REVEAL-B]]", eng)).toBe(steuerTexte.markenRevision);
  });

  it("Panel-Marken bleiben unberührt — dort steht der Composer weiter", () => {
    // [[BASELINE]] und [[SCALE-CLOSING]] übergeben auch die Regie, aber die
    // Schreibkante bleibt. Ohne Befund kein Wächter (S101).
    expect(def().validiereAntwort("Wie geht es euch damit?\n[[BASELINE]]", eng)).toBeNull();
  });
});
