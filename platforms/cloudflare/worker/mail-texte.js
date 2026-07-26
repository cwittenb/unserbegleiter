// R7 · Mail-Texte in der Sprache des Paars.
//
// Push war seit je übersetzt (benachrichtigePartner liest paar.locale), die
// Mails nicht: dieselbe Person bekam den Push-Hinweis auf Englisch und ihren
// Bestätigungscode auf Deutsch — bei der PIN-Mail ausgerechnet dort, wo jemand
// ohne Deutschkenntnisse sechs Ziffern aus unverständlichem Text fischen soll.
//
// Eigenes Modul, weil der Mailversand selbst über cloudflare:sockets läuft und
// nur mit Stub prüfbar ist. Die Sprachauswahl ist reine Logik und gehört
// dorthin, wo sie ohne Umweg bewiesen werden kann.

import { de as woerterbuchDe } from "../../../core/i18n/de.js";
import { en as woerterbuchEn } from "../../../core/i18n/en.js";

/**
 * Textfunktion für ein Paar. Unbekannte Sprache und fehlende Schlüssel fallen
 * auf Deutsch zurück (wie t() im Client); Platzhalter {name} werden gefüllt.
 * @param {{locale?: string}|null} paar
 * @returns {(schluessel: string, werte?: object) => string}
 */
export function mailText(paar) {
  const dict = (paar && paar.locale === "en") ? woerterbuchEn : woerterbuchDe;
  return (schluessel, werte = {}) =>
    String(dict[schluessel] ?? woerterbuchDe[schluessel] ?? schluessel)
      .replace(/\{(\w+)\}/g, (_, n) => (n in werte ? String(werte[n]) : "{" + n + "}"));
}
