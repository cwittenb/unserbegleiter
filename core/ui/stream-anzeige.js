// R4a · Was waehrend des Streams NICHT aufblitzen darf.
//
// Herausgeloest aus app.js. Die Logik ist subtil und sicherheitsrelevant fuer
// die Darstellung: Waehrend das Modell schreibt, entstehen Marker, Bloecke und
// Steuer-Token Zeichen fuer Zeichen. Wuerde man den Rohtext einfach anzeigen,
// blitzten "[[META-" oder "[CLOSE SESS…" kurz auf, bevor sie vollstaendig sind
// — die Person saehe die Mechanik statt des Gespraechs.
//
// Eingeschlossen in app.js war das nur ueber eine laufende Session pruefbar.
// Als reine Funktion mit der Markerliste als Parameter ist es direkt pruefbar.

import { cleanDisplay } from "../contracts/block.js";
import { offeneKlammerAbIndex } from "../contracts/steuertoken.js";
import { ALLE_BLOECKE } from "../contracts/registry.js";

/**
 * Schneidet den Stream-Rohtext an der ersten angerissenen Struktur ab.
 * @param {string} roh       Rohtext, wie er bisher eingetroffen ist
 * @param {string[]} mkListe Markerreihenfolge der laufenden Session
 */
export function schneideStreamText(roh, mkListe = []) {
  let txt = cleanDisplay(roh, mkListe, ALLE_BLOECKE);
  let schnitt = txt.length;
  for (const b of ALLE_BLOECKE) {
    const i = txt.indexOf(b.start);
    if (i >= 0 && i < schnitt) schnitt = i;        // Block begonnen, Ende fehlt noch
  }
  const iM = txt.indexOf("[[");
  if (iM >= 0 && iM < schnitt) schnitt = iM;        // Marker im Entstehen
  // S93: ein Steuer-Token im Entstehen ("[CLOSE SESS…") darf nie aufblitzen.
  const iS = offeneKlammerAbIndex(txt);
  if (iS >= 0 && iS < schnitt) schnitt = iS;
  txt = txt.slice(0, schnitt);
  if (txt.endsWith("[")) txt = txt.slice(0, -1);    // halbe Marker-Klammer
  for (const tok of ALLE_BLOECKE.map(b => b.start)) // angerissenes Start-Token
    for (let l = tok.length - 1; l >= 4; l--)
      if (txt.endsWith(tok.slice(0, l))) { txt = txt.slice(0, -l); l = 0; }
  return txt.replace(/\s+$/, "");
}
