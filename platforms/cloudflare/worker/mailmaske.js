// S143 · Maskierte Anzeige der hinterlegten Adresse.
//
// Bis hierher erfuhr die App nur, DASS eine Adresse liegt (ein Boolean aus
// /api/me). Das reichte nicht: "bestaetigt" heisst nur, dass die Adresse
// DAMALS erreichbar war — es kann ein altes Postfach sein oder versehentlich
// das der anderen Person. Ohne Anzeige faellt das erst auf, wenn es zaehlt.
//
// Warum maskiert und nicht vollstaendig: Der Klartext ist heute in keiner
// Antwort an die App enthalten, und jede Anzeige traegt ihn in Caches, Logs
// und Verlaufsspeicher, die bisher keine personenbezogenen Adressen fuehren.
// Zum Wiedererkennen des eigenen Postfachs braucht es ihn nicht.
//
// Warum die Maskierung HIER liegt und nicht in der Oberflaeche: Sonst reiste
// der Klartext trotzdem und die Oberflaeche versteckte ihn nur — das waere
// eine Anzeige-Entscheidung, wo eine Uebertragungs-Entscheidung noetig ist.
//
// Warum IMMER drei Punkte: Eine laengenproportionale Maske verriete die Laenge
// der Adresse. Die ist zwar schwach, aber sie ist kostenlos zu verschenken und
// ebenso kostenlos zu behalten.

const PUNKTE = "\u2022\u2022\u2022";

/** Ein Stueck maskieren: erstes und letztes Zeichen bleiben, der Rest wird
 *  zu drei Punkten. Zu kurz fuer zwei Anker → nur der Anfang bleibt.
 *  Codepoint-weise, damit zusammengesetzte Zeichen nicht zerfallen. */
function stueck(s) {
  const z = Array.from(s);
  if (z.length === 0) return "";
  if (z.length === 1) return PUNKTE;
  if (z.length === 2) return z[0] + PUNKTE;
  return z[0] + PUNKTE + z[z.length - 1];
}

/**
 * Adresse → maskierte Fassung, z. B. "anna@post.de" → "a•••a@p•••t.de".
 *
 * Die Endung (alles ab dem LETZTEN Punkt der Domain) bleibt stehen: Sie hilft
 * beim Wiedererkennen und ist fuer sich genommen nicht identifizierend. Alles
 * davor wird maskiert — auch Zwischen-Labels, damit aus "mail.gmx.net" nicht
 * doch wieder ein ganzer Anbietername sichtbar wird.
 *
 * Nicht-Adressen (kein @, leer, kaputt) ergeben null. Der Aufrufer zeigt dann
 * nichts an, statt Unsinn.
 *
 * @param {string} adresse
 * @returns {string|null}
 */
export function maskiereMail(adresse) {
  const s = String(adresse || "").trim();
  const at = s.lastIndexOf("@");
  if (at <= 0 || at === s.length - 1) return null;
  const lokal = s.slice(0, at);
  const domain = s.slice(at + 1);
  const punkt = domain.lastIndexOf(".");
  const maskierteDomain = punkt <= 0
    ? stueck(domain)                                   // keine Endung: alles maskieren
    : stueck(domain.slice(0, punkt)) + domain.slice(punkt);
  return stueck(lokal) + "@" + maskierteDomain;
}
