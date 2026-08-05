// L2 · Rechtliche Wege — Impressum und Datenschutz.
//
// §5 DDG verlangt "leicht erkennbar, unmittelbar erreichbar und staendig
// verfuegbar". Bis L2 hatte die App keinen einzigen Weg dorthin: eingeladene
// Paare kommen per Magic-Link direkt hinein und sehen die Landing nie.
//
// Die Rechtstexte leben auf der Apex-Domain, nicht bei der Anwendung — so ist
// es in platforms/capacitor/deploy.config.js schon festgehalten ("die
// Apex-Domain raumzuzweit.de bleibt fuer Landing-Page und Rechtstexte frei").
// Sie sind damit unabhaengig davon, unter welcher Adresse die App gerade
// laeuft; in der Testphase ist das de.roomfortwo.app.
//
// DIESE DATEI IST DER EINZIGE ORT, an dem die Adressen stehen. Ein Wechsel der
// Domain ist eine Zeile hier — tests/unit/l2-1-adressen.spec.js wacht darueber,
// dass sich kein zweites Literal einschleicht.
//
// Bewusst OHNE Import aus i18n: die Beschriftungen kommen als Schluessel
// heraus und werden erst von der Oberflaeche uebersetzt. Damit bleibt das
// Modul DOM- und korpusfrei und ist ohne Browser pruefbar.

/** Apex-Domain. Die Rechtstexte liegen dort als eigene Adressen (44c/44d). */
export const RECHT_BASIS = "https://raumzuzweit.de";

/** Die zwei Wege, in Reihenfolge der Anzeige. `schluessel` ist ein i18n-Key. */
export const RECHT_WEGE = Object.freeze([
  Object.freeze({ id: "impressum", schluessel: "recht.impressum", url: RECHT_BASIS + "/impressum" }),
  Object.freeze({ id: "datenschutz", schluessel: "recht.datenschutz", url: RECHT_BASIS + "/datenschutz" }),
]);

/** Gehoert die Adresse zu den bekannten Rechtstexten?
 *  Der Helfer unten oeffnet NUR diese zwei — eine Adresse aus fremder Hand
 *  (Link in einem Gespraechsinhalt, manipuliertes Attribut) faehrt nicht
 *  ueber die Systemschicht der nativen Huelle hinaus. */
export function istRechtsWeg(url) {
  return RECHT_WEGE.some(w => w.url === url);
}

/** In der nativen Huelle heisst extern auch extern.
 *
 *  Im Capacitor-WebView kann ein Link die Seite IN der App oeffnen — ohne
 *  Zuruecktaste ist das Paar dann gefangen. `window.open(url, "_system")`
 *  reicht die Adresse an den Systembrowser weiter; im Web tut der Helfer
 *  nichts und laesst den Link ein normaler Link sein.
 *
 *  @returns {boolean} true, wenn der Weg uebernommen wurde (Aufrufer soll
 *                     dann die Vorgabe des Browsers unterdruecken)
 */
export function oeffneExtern(url, umgebung = globalThis) {
  if (!istRechtsWeg(url)) return false;
  const cap = umgebung && umgebung.Capacitor;
  const nativ = !!(cap && typeof cap.isNativePlatform === "function" && cap.isNativePlatform());
  if (!nativ || typeof umgebung.open !== "function") return false;
  umgebung.open(url, "_system");
  return true;
}
