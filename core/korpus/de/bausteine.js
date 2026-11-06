// Korpus DE · BAUSTEINE (MOD-3) — das zusammengesetzte Objekt fuer die Sessions.
// Seit S33a leben wiederverwendete Passagen genau einmal; seit MOD-3 in drei
// Schichten (wissen, policies, format), hier wieder EIN Objekt mit denselben
// Schluesseln wie zuvor (Paritaet: tests/unit/bausteine.spec.js). Die Schichten
// sind disjunkt — ein Schluessel gehoert genau einer.

/* ---------------------------------------------------------------
 * BAUSTEINE (S33a): wörtlich mehrfach genutzte Prompt-Passagen leben
 * genau einmal. Extraktion ist byte-identisch zum Stand davor —
 * Wortlaut-Angleichungen weiterer Kandidaten folgen erst in S33b.
 * Schlüsselparität de↔en sichert tests/unit/bausteine.spec.js.
 * --------------------------------------------------------------- */

import { wissen } from "./wissen.js";
import { policies } from "./policies.js";
import { format } from "./format.js";

/* Die Reihenfolge ist die historische (S33a ff.): sie aendert keinen Text,
   aber Werkzeuge und Tests, die ueber die Schluessel laufen, sehen weiter
   dasselbe Bild. Jeder Schluessel kommt aus genau einer Schicht. */
const ORDNUNG = [
  "sprecherKlarheit",
  "urteilsGrammatik",
  "kiBegleiter",
  "kiTransparenz",
  "steuerTextRegel",
  "spiegelIch",
  "loesungsversuchRahmung",
  "haltungsKern",
  "sprecherKonvention",
  "zustimmungsGrammatik",
  "notbremseGemeinsam",
  "versehensKorrektur",
  "krisenVorrang",
  "krisenVorrangGemeinsam",
  "querungsGrammatik",
  "vorschlagIch",
  "sorgenWeiche",
  "jsonKern",
  "sprache",
  "spiegelMittel",
  "anteileSprache",
  "ehrlichesMitteilen",
  "bedeutsameMomente",
  "reaktionsTypen",
  "entwicklungsRaum",
  "regieUebergabe",
  "widerspruchsForm",
  "notFrage",
  "gewaltNichtEinfuehren",
  "endSignal",
  "abschlussPflichten",
];

const schichten = { format, policies, wissen };
export const bausteine = Object.fromEntries(ORDNUNG.map(k => {
  const s = Object.keys(schichten).filter(n => k in schichten[n]);
  if (s.length !== 1) throw new Error("Baustein '" + k + "' gehoert zu " + s.length + " Schichten (erwartet genau eine).");
  return [k, schichten[s[0]][k]];
}));
