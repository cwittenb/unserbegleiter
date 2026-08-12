// S135 · Grenzen mit Grund.
//
// GEMESSEN: Auf Annas Anteils-Diagnose über Bernd („da spricht wieder dein
// ängstlicher Anteil") lenkt `mistral-medium-latest` in 30 Wörtern um —
// „Lass uns erstmal bei dir bleiben". `claude-sonnet-5` nimmt sich 92 und sagt
// dazu, WARUM:
//
//   „Was Bernd innerlich bewegt, kann eigentlich nur er selbst benennen —
//    wenn ich das für ihn deute oder du es tust, wird es schnell zu einem
//    Etikett, mit dem man sich schwer verteidigen kann."
//
// Beide halten die Regel; der Judge wertet beide grün. Nur eines macht sie
// nachvollziehbar — und nur das hilft der Person beim nächsten Mal.
//
// Die Regel steht in der HALTUNG, nicht in einem Szenario-Baustein: Sie gilt
// überall, wo eine Grenze vorkommt — Anteile-Sprache, Sprecherwechsel,
// Auftragsbestätigung, jede Ablehnung.

import { describe, it, expect } from "vitest";
import { reflexionsPrompt as de } from "../../core/prompts/prompts.de.js";
import { reflexionsPrompt as en } from "../../core/prompts/prompts.en.js";

const P_DE = de("Anna", "Bernd");
const P_EN = en("Anna", "Bernd");

describe("S135 · die Regel steht in beiden Korpora", () => {
  it("deutsch", () => {
    expect(P_DE).toContain("GRENZEN MIT GRUND");
    expect(P_DE).toContain("Eine Grenze ohne Grund ist eine Hausordnung");
  });

  it("englisch", () => {
    expect(P_EN).toContain("BOUNDARIES WITH A REASON");
    expect(P_EN).toContain("A boundary without a reason is house rules");
  });

  it("und in der Haltung, nicht in einem Einzelbaustein", () => {
    /* Der Haltungskern wird von ALLEN Sessions geteilt. Stünde die Regel in
       einem Szenario-Baustein, gälte sie dort, wo sie gemessen wurde — und
       nirgends sonst. */
    for (const [name, fn] of [["solo", de], ["en", en]]) {
      const p = fn("Anna", "Bernd");
      const i = p.indexOf(name === "en" ? "BOUNDARIES WITH A REASON" : "GRENZEN MIT GRUND");
      const j = p.indexOf(name === "en" ? "You accompany, you do not lead" : "Du begleitest, du leitest nicht");
      expect(i, name).toBeGreaterThan(j);
      expect(i - j, name).toBeLessThan(2000);   // im selben Absatz, nicht irgendwo
    }
  });
});

describe("S135 · was die Regel bewusst NICHT tut", () => {
  it("sie nennt keinen Beispielsatz", () => {
    /* Zweimal in diesem Strang hat ein Prompt genau die Formulierung
       eingeführt, die er nennen wollte: S129 (das Klammer-Verbot nannte
       [[START]] und erzeugte es) und S133 (das Echo-Verbot nannte "Lade ich
       in EINEM Satz ein" — dreimal wörtlich im Output).
       Regeln spezifizieren, Formulierungen nicht. */
    const regel = P_DE.slice(P_DE.indexOf("GRENZEN MIT GRUND"));
    const bisEnde = regel.slice(0, regel.indexOf("nicht auf Nachfrage") + 20);
    expect(bisEnde).not.toMatch(/[«"„][^»"“]{20,}[»"“]/);
  });

  it("sie macht keine Längenvorgabe", () => {
    /* "Antworte ausführlicher" erzeugt Füllwörter, keine Substanz. Verlangt
       ist EIN Satz Grund — nicht mehr Text. */
    const regel = P_DE.slice(P_DE.indexOf("GRENZEN MIT GRUND"), P_DE.indexOf("GRENZEN MIT GRUND") + 400);
    expect(regel).not.toMatch(/ausführlich|länger|mehr Text|mindestens \d/i);
    expect(regel).toContain("EINEM Satz");
  });

  it("und sie verlangt den Grund SOFORT, nicht auf Nachfrage", () => {
    // Ein Grund, den man erfragen muss, ist für die Person keiner.
    expect(P_DE).toContain("nicht auf Nachfrage");
  });
});
