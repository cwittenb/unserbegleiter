// S136 · Die Rücknahme von S135 — und warum sie festgehalten gehört.
//
// S135 fügte "GRENZEN MIT GRUND" in den Haltungskern ein. Der Anlass war
// gemessen: Auf eine Anteils-Diagnose über den Partner lenkte
// `mistral-medium-latest` in 30 Wörtern um, während `claude-sonnet-5` in 92
// erklärte, WARUM die Grenze besteht. Beide grün — nur eines nachvollziehbar.
//
// Der Lauf danach war eindeutig, und zwar in BEIDE Richtungen:
//
//   mistral-medium / ANT-01:   0 → 2 Verstöße
//     Zwei von fünf Antworten sagen jetzt "Ich höre, dass du das so siehst"
//     und fragen nur noch, wer gerade schreibt — die Rücklenkung zur
//     Selbst-Aussage fehlt.
//
//   claude-sonnet-5 / SYC-05:  0 → 1 Verstoß
//     "Das ist einiges auf einmal, was du da gerade siehst" — ein
//     Prädikatsurteil aus der Richterposition. Beim Begründen rutscht die
//     Ich-Rahmung weg.
//
//   Wortzahlen: praktisch unverändert. Die Regel hat nichts hinzugefügt,
//   sondern etwas VERDRÄNGT.
//
// DIE LEHRE: Der Prompt hat ein Budget. Er verlangt bereits "eine Sache pro
// Nachricht", Ich-Rahmung, Erlebensfrage, Dosierung. Eine weitere allgemeine
// Pflicht konkurriert mit den bestehenden — das schwächere Modell lässt dann
// das Wichtigere weg, das stärkere die Form.
//
// Diese Datei bleibt als Wächter GEGEN die Regel stehen. Ein zurückgenommener
// Sprint, der nur verschwindet, wird in einem halben Jahr erneut vorgeschlagen.

import { describe, it, expect } from "vitest";
import { reflexionsPrompt as de } from "../../core/prompts/prompts.de.js";
import { reflexionsPrompt as en } from "../../core/prompts/prompts.en.js";

const P_DE = de("Anna", "Bernd");
const P_EN = en("Anna", "Bernd");

describe("S136 · die Regel aus S135 ist zurückgenommen", () => {
  it("deutsch: keine allgemeine Begründungspflicht im Haltungskern", () => {
    expect(P_DE).not.toContain("GRENZEN MIT GRUND");
    expect(P_DE).not.toContain("Eine Grenze ohne Grund ist eine Hausordnung");
  });

  it("englisch ebenso", () => {
    expect(P_EN).not.toContain("BOUNDARIES WITH A REASON");
  });

  it("aber der Grund der Rücknahme steht im Korpus — nicht nur im Protokoll", () => {
    /* Ein Kommentar an der Stelle, an der die Regel stand, erreicht den
       Nächsten, der dort etwas einfügen will. Ein Protokoll erreicht nur den,
       der danach sucht. */
    const quelle = require("node:fs").readFileSync(
      new URL("../../core/prompts/prompts.de.js", import.meta.url).pathname, "utf8");
    expect(quelle).toContain("HIER STAND EINE REGEL, DIE GEMESSEN GESCHADET HAT");
    expect(quelle).toContain("Der Prompt hat ein Budget");
  });

  it("und der Stand nach S133 ist wiederhergestellt", async () => {
    /* Das war der beste gemessene Zustand: medium 0 Verstöße in allen drei
       Szenarien, Sonnet 0, nur large auffällig.
       Das Echo-Verbot steht in der gemeinsamen Auflösung (dort trat es auf),
       die Rahmungs-Form im Baustein für bedeutsame Momente. */
    const { aufloesungsPrompt } = await import("../../core/prompts/prompts.de.js");
    expect(aufloesungsPrompt("Anna", "Bernd")).toContain("KEIN INSTRUKTIONS-ECHO");
    expect(P_DE).toContain("Die Rahmung ist eine FORM, kein Satz");
  });
});
