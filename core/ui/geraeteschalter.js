// S119.7 · Geraeteschalter — der Einhaengepunkt fuer plattformgebundene
// Ein/Aus-Zeilen in den Einstellungen.
//
// Anlass: Die Push-Glocke wurde zur Laufzeit von platforms/cloudflare/pages/
// client.js in die Bedien-Ecke (.pb-theme) gehaengt. Sie war damit das einzige
// Emoji der ganzen Oberflaeche, kannte kein --rz-Token, und sie sass an einem
// Ort, der sonst nur einen Weg traegt: das Zeichen, das in die Einstellungen
// fuehrt. Push ist aber eine Geraete-Einstellung — sie gehoert in die Gruppe
// "Dieses Geraet", neben Zugang wiederfinden und das Loeschen.
//
// Warum eine Registry und kein direkter Aufruf: Der Einstellungs-Screen liegt
// in core/, die Benachrichtigungs-Mechanik in platforms/. Wuerde core/ sie
// direkt aufrufen, wanderte Plattform-Wissen in den Kern — im Artefakt und in
// den Tests gibt es die noetige Browser-Umgebung gar nicht. Die Plattform
// meldet also an, der Kern zeichnet nur. Ein Waechter haelt das fest; er
// greift ueber den Quelltext, Kommentare eingeschlossen — deshalb steht hier
// bewusst kein Bezeichner der Plattformschicht im Fliesstext.
//
// Bewusst KEIN Zustand im Kern: Der Schalter wird bei jedem Zeichnen gefragt
// (`an()`), statt seinen letzten Wert zu merken. Die Wahrheit liegt beim
// Browser (Erlaubnis, Abo) und kann sich ausserhalb der App aendern — ein
// gemerkter Wert waere irgendwann eine Behauptung.

/** @typedef {object} GeraeteSchalter
 *  @property {string} id           Kennung fuer das Element (z. B. "push")
 *  @property {()=>string} label    Beschriftung, bei jedem Zeichnen gefragt
 *                                  (die Oberflaeche kann die Sprache wechseln)
 *  @property {()=>Promise<boolean>|boolean} an          aktueller Zustand
 *  @property {()=>Promise<boolean>|boolean} umschalten  schaltet und liefert
 *                                  den NEUEN Zustand
 */

const schalter = [];

/** Meldet einen Geraeteschalter an. Mehrfaches Anmelden derselben Kennung
 *  ersetzt den alten Eintrag — ein Neuaufbau der Oberflaeche (relaunch nach
 *  Sprachwechsel) soll die Liste nicht verdoppeln. */
export function meldeGeraeteSchalter(def) {
  if (!def || !def.id || typeof def.label !== "function") return;
  const i = schalter.findIndex(s => s.id === def.id);
  if (i >= 0) schalter[i] = def;
  else schalter.push(def);
}

/** Die angemeldeten Schalter in Anmeldereihenfolge. */
export function geraeteSchalter() {
  return schalter.slice();
}

/** Nur fuer Tests und den Neuaufbau: leert die Liste. */
export function leereGeraeteSchalter() {
  schalter.length = 0;
}
