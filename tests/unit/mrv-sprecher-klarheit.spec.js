// MRV.2 · Sprecher-Klarheit im geteilten Raum.
//
// BEFUND (SPR-05, 3/3): Auf eine präfixlose Nachricht rät die Begleitung die
// Absenderschaft und redet die Person namentlich an. Sie lag im Lauf sogar
// richtig — das ändert nichts: Eine falsche Zuschreibung korrumpiert Gespräch
// UND Befund. Im Korpus stand dazu nichts.
//
// Der Ort ist bewusst der Sitzungsanfang und nicht S97 (F2): Die Absenderschaft
// ist keine Frage der Allparteilichkeit, sondern eine Grundbedingung des
// geteilten Raums — ohne sie steht jede weitere Zuschreibung auf Sand.

import { describe, it, expect } from "vitest";
import { bausteine, momentPrompt, aufloesungsPrompt, reflexionsPrompt, klaerungsPrompt } from "../../core/prompts/prompts.de.js";
import {
  bausteine as bausteineEn, momentPrompt as momentPromptEn,
  aufloesungsPrompt as aufloesungsPromptEn, reflexionsPrompt as reflexionsPromptEn,
  klaerungsPrompt as klaerungsPromptEn,
} from "../../core/prompts/prompts.en.js";

describe("MRV.2 · Die Regel steht in beiden geteilten Räumen — und nur dort", () => {
  it("DE: Qualitätszeit und Auflösung ja, die Einzelräume nein", () => {
    expect(momentPrompt("Anna", "Bernd")).toContain("SPRECHER-KLARHEIT");
    expect(aufloesungsPrompt("Anna", "Bernd")).toContain("SPRECHER-KLARHEIT");
    // Im eigenen Raum tippt nur eine Person — die Frage stellt sich nicht.
    expect(reflexionsPrompt("Anna", "Bernd")).not.toContain("SPRECHER-KLARHEIT");
    expect(klaerungsPrompt("Anna", "Bernd")).not.toContain("SPRECHER-KLARHEIT");
  });

  it("EN: dieselbe Verteilung", () => {
    expect(momentPromptEn("Anna", "Bernd")).toContain("SPEAKER CLARITY");
    expect(aufloesungsPromptEn("Anna", "Bernd")).toContain("SPEAKER CLARITY");
    expect(reflexionsPromptEn("Anna", "Bernd")).not.toContain("SPEAKER CLARITY");
    expect(klaerungsPromptEn("Anna", "Bernd")).not.toContain("SPEAKER CLARITY");
  });

  it("sie steht am ANFANG, vor den Leitprinzipien", () => {
    // Primacy ist hier kein Zufall, sondern die Begründung für den Ort (F2).
    const p = momentPrompt("Anna", "Bernd");
    expect(p.indexOf("SPRECHER-KLARHEIT")).toBeLessThan(p.indexOf("LEITPRINZIPIEN"));
  });
});

describe("MRV.2 · Was die Regel verlangt", () => {
  const b = bausteine.sprecherKlarheit;

  it("Raten ist verboten — nicht nur falsches Raten", () => {
    expect(b).toMatch(/RATE nie/);
    expect(b).toMatch(/sprich sie nicht namentlich an/);
  });

  it("die beiden Fälle stehen ausdrücklich da (F1a)", () => {
    // (1) Antwort auf direkte Einzelansprache → gehört der Person, nicht fragen.
    expect(b).toMatch(/direkte Einzelansprache/);
    expect(b).toMatch(/fragst NICHT/);
    // (2) kein Bezug UND personengebunden → einmal klären.
    expect(b).toMatch(/personengebunden/);
    expect(b).toMatch(/EINMAL/);
  });

  it("sonst: neutral weiterführen statt fragen", () => {
    // Bei JEDER präfixlosen Nachricht zu fragen wäre zermürbend.
    expect(b).toMatch(/neutral weiter, ohne Namen/);
  });

  it("die Klärung ist keine Zurechtweisung", () => {
    expect(b).toMatch(/keine Zurechtweisung/);
    expect(b).toMatch(/keine Bitte um Präfixe/);
  });

  it("EN trägt dieselben vier Punkte", () => {
    const e = bausteineEn.sprecherKlarheit;
    expect(e).toMatch(/NEVER guess/);
    expect(e).toMatch(/direct address/);
    expect(e).toMatch(/person-bound/);
    expect(e).toMatch(/not a reprimand/);
  });
});
