// S109 · Sprachschnitte — abgeschaffte Sprache bleibt abgeschafft.
//
// ANLASS: S107 hat das Empathie-Signal verworfen und den Aufdeckungs-Abschnitt
// des Prompts ersetzt. Drei Stellen blieben stehen und sagten weiter das
// Gegenteil — `mk.prozessKopf`, `mk.prozessNachtrag` und der SICHTBARE
// Untertitel `mein.messSub`. Keine davon hat ein Test bemerkt: Ein veralteter
// Text ist syntaktisch tadellos.
//
// DIE IDEE: Wird eine Entscheidung getroffen ("Genauigkeits-Sprache ist raus"),
// gilt sie für den GESAMTEN Korpus — nicht nur für die Stelle, an der sie
// umgesetzt wurde. Genau das lässt sich prüfen: eine Liste verbotener Wendungen
// mit Begründung, geprüft über alle vier Textquellen.
//
// WARUM MIT AUSNAHMEN: Ein reiner Wortlisten-Test wäre naiv. "Treffer zuerst"
// steht auch im Auflösungs-Prompt — dort geht es um HANDOVER-Vermutungen
// (G-Items gegen S-Items), einen anderen Mechanismus, den es weiterhin gibt.
// Gleiche Worte, verschiedene Sachen. Deshalb trägt jeder Schnitt seinen
// Geltungsbereich, und Ausnahmen sind benannt statt stillschweigend.
//
// Vorbild: der grep-Wächter aus S35d (keine Modell-Literale im Code).

import { describe, it, expect } from "vitest";
import * as promptsDe from "../../core/prompts/prompts.de.js";
import * as promptsEn from "../../core/prompts/prompts.en.js";
import { de } from "../../core/i18n/de.js";
import { en } from "../../core/i18n/en.js";

/**
 * Ein Sprachschnitt: eine Entscheidung, die Wendungen aus dem Korpus verbannt.
 *
 * `wo`   — welche Textquellen betroffen sind
 * `aber` — benannte Ausnahmen: Stellen, an denen dieselben Worte etwas
 *          anderes bedeuten. Jede Ausnahme ist eine Behauptung, die jemand
 *          prüfen kann; eine stillschweigende wäre unsichtbar.
 */
const SCHNITTE = [
  {
    id: "S107 · Empathie-Signal",
    grund: "Die Lese-Genauigkeit ist als Maß verworfen — sie impliziert ein Ziel " +
           "(richtig liegen), das dem Vorgang (Perspektive einnehmen) äußerlich ist. " +
           "Siehe docs/designnotiz-beziehungswesen.md.",
    de: /Lese-Genauigkeit|Lese-Richtung|Empathie-Signal|Nähe-Werte|Erlebens-Differenz|Savoring/i,
    en: /reading accuracy|reading direction|empathy signal|closeness values|savoring/i,
    wo: ["korpus", "i18n", "moment"],
    aber: [],
  },
  {
    id: "S107 · keine Zahlen in der Aufdeckung",
    grund: "Zwei Zahlen nebeneinander sind eine Genauigkeitsaussage, egal wie warm " +
           "der Satz drumherum klingt. Die Begleitung erzählt in Worten.",
    de: /Wertepaar|einzelne Zahlen darfst du/i,
    en: /pair of values|you may speak single numbers/i,
    wo: ["korpus", "i18n", "moment"],
    aber: [],
  },
  {
    id: "S107 · kein Empathie-Auftrag vom System",
    grund: "Der Auftrag ist eine Selbstverpflichtung. Das System bietet ihn nie an — " +
           "es darf ihn aber BENENNEN, um genau das zu verbieten.",
    de: /Brücke zum Empathie-Auftrag|Empathie-Auftrag als Einladung|wertvollste[rn]? Auftrags-Typ/i,
    en: /bridge to the empathy goal|empathy goal as an invitation/i,
    wo: ["korpus", "i18n"],
    aber: [
      // Die Verbotsregel selbst nennt den Begriff — das ist ihr Zweck.
      "KEIN EMPATHIE-AUFTRAG VON DIR",
      "NO EMPATHY GOAL FROM YOU",
    ],
  },
];

/** Die vier Textquellen. `moment` ist der Prompt, in dem die Aufdeckung lebt. */
function quellen(sprache) {
  const P = sprache === "de" ? promptsDe : promptsEn;
  const wb = sprache === "de" ? de : en;
  return {
    korpus: Object.entries(P.korpusTexte).filter(([, v]) => typeof v === "string"),
    i18n: Object.entries(wb).filter(([, v]) => typeof v === "string"),
    moment: [["momentPrompt", P.momentPrompt("Anna", "Bernd")]],
  };
}

/** Trifft das Muster, ohne dass eine benannte Ausnahme greift? */
function verstoesse(eintraege, muster, ausnahmen) {
  return eintraege
    .filter(([, text]) => muster.test(text))
    .filter(([, text]) => !ausnahmen.some(a => text.includes(a)))
    .map(([schluessel]) => schluessel);
}

describe("S109 · Sprachschnitte gelten im ganzen Korpus", () => {
  for (const schnitt of SCHNITTE) {
    for (const sprache of ["de", "en"]) {
      it(`${schnitt.id} — ${sprache}`, () => {
        const q = quellen(sprache);
        const gefunden = [];
        for (const bereich of schnitt.wo)
          for (const s of verstoesse(q[bereich], schnitt[sprache], schnitt.aber))
            gefunden.push(bereich + ":" + s);
        expect(gefunden, schnitt.grund).toEqual([]);
      });
    }
  }
});

describe("S109 · Der Test selbst hat etwas zu tun", () => {
  it("die Muster treffen die alten Formulierungen wirklich", () => {
    /* Ein Verbotstest, dessen Muster nichts mehr findet, ist immer grün — auch
       wenn er ins Leere zielt. Hier die Gegenprobe an den Sätzen, die vor S107
       wörtlich im Korpus standen. */
    const alt = {
      "Nähe-Werte: Anna 4 · Bernd 8 ⇒ Erlebens-Differenz 4": 0,
      "Lese-Genauigkeit (Empathie-Signal): Anna schätzte Bernd auf 7": 0,
      "einzelne Zahlen darfst du häppchenweise aussprechen": 1,
      "höchstens ein Wertepaar je Gesprächsschritt": 1,
      "Brücke zum Empathie-Auftrag als Einladung": 2,
    };
    for (const [satz, nr] of Object.entries(alt))
      expect(SCHNITTE[nr].de.test(satz), satz).toBe(true);
  });

  it("und sie treffen NICHT, was weiterhin gilt", () => {
    /* "Treffer zuerst" steht im Auflösungs-Prompt: dort geht es um
       HANDOVER-Vermutungen, einen Mechanismus, den es weiterhin gibt. Gleiche
       Worte, andere Sache — deshalb ist `aufloesungsPrompt` kein Geltungsbereich
       dieser Schnitte. */
    const p = promptsDe.aufloesungsPrompt("Anna", "Bernd");
    expect(p, "die Auflösung darf ihre eigene Treffer-Phase behalten").toContain("Treffer zuerst");
    // Und der momentPrompt, der sie NICHT haben darf, hat sie auch nicht.
    expect(promptsDe.momentPrompt("Anna", "Bernd")).not.toContain("Treffer zuerst");
  });

  it("jeder Schnitt trägt eine Begründung", () => {
    // Ein Verbot ohne Grund wird beim nächsten Umbau zu Recht entfernt.
    for (const s of SCHNITTE) {
      expect(s.grund.length, s.id).toBeGreaterThan(40);
      expect(s.wo.length, s.id).toBeGreaterThan(0);
    }
  });
});
