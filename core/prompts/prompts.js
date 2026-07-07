// Sprachweiche für den Begleitungs-Korpus. Deutsch ist Referenz und Fallback;
// weitere Sprachen registrieren sich via registerKorpus (Stufe C: prompts.en.js).
// Alle bisherigen Importe bleiben gültig — die de-Exporte laufen unverändert durch.
export * from "./prompts.de.js";
import * as de from "./prompts.de.js";
const korpora = { de };
export function getPrompts(locale) { return korpora[locale] || korpora.de; }
export function registerKorpus(locale, korpus) { korpora[locale] = korpus; }
export function alleKorpora() { return { ...korpora }; }

/* Aktive Korpus-Sprache: Sprach-Schnappschuss der laufenden Session.
   app.js setzt sie beim Session-Start (neu: Paarsprache; Resume: chat.sprache).
   Alle Korpus-Verbraucher (Session-Defs, Steuertexte, Inhalte) lesen über K()
   zur LAUFZEIT — nie zur Importzeit. Unbekannte Sprache fällt auf Deutsch. */
let korpusSprache = "de";
export function setKorpusSprache(l) { korpusSprache = korpora[l] ? l : "de"; }
export function getKorpusSprache() { return korpusSprache; }
export function K() { return korpora[korpusSprache] || korpora.de; }
