// CR-6 (C26) · Block-Platzhalter in der Sprache der Oberflaeche.
//
// Die Registry (core/contracts) traegt je Block einen sichtbaren Platzhalter —
// "Dein Zeitleisten-Eintrag wurde gespeichert." — fest auf Deutsch. Eine
// englische Sitzung zeigte ihn so. Die Vertragsschicht kennt keine Sprache
// (MOD-0), also uebersetzt die Oberflaeche: Dieselbe Blockliste, die
// Platzhalter aus dem Woerterbuch (block.<dataset>). Bloecke ohne sichtbaren
// Platzhalter bleiben unsichtbar; fehlt ein Schluessel, bleibt der Text der
// Registry stehen (lieber Deutsch als ein nackter Schluessel).

import { ALLE_BLOECKE } from "../contracts/registry.js";
import { t } from "../i18n/index.js";

/* Als Literale (die Kanarie S113 sucht Schluessel woertlich).
   BEWUSST OHNE "zeit": Der Platzhalter des TIMELINE-BLOCK ("Dein
   Zeitleisten-Eintrag wurde gespeichert.") steht seit S99.4 unter Vorbehalt —
   das Woerterbuch soll keinen Eintrag-gespeichert-Text kennen
   (tests/unit/s99-4-…). Ob er ganz entfaellt oder uebersetzt wird, ist eine
   offene Entscheidung; bis dahin bleibt er, wie er war. */
const SCHLUESSEL = {
  gate: "block.gate", gateart: "block.gateart", moment: "block.moment",
  qz: "block.qz", auftrag: "block.auftrag",
};

export function bloeckeLokal() {
  return ALLE_BLOECKE.map(b => {
    const schluessel = b.placeholder && SCHLUESSEL[b.dataset];
    if (!schluessel) return b;
    const text = t(schluessel);
    return { ...b, placeholder: text && text !== schluessel ? text : b.placeholder };
  });
}
