// Corpus EN · BAUSTEINE (MOD-3) — composed object, same keys as de/bausteine.js.

/* ---------------------------------------------------------------
 * BAUSTEINE (S33a) — see prompts.de.js. Key parity is enforced by
 * tests/unit/bausteine.spec.js. One byte-level normalisation here:
 * a stray em-dash in one LANGUAGE line was unified to the en-dash.
 * --------------------------------------------------------------- */

import { wissen } from "./wissen.js";
import { policies } from "./policies.js";
import { format } from "./format.js";

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
