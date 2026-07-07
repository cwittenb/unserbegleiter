// Sprachweiche für den Begleitungs-Korpus. Deutsch ist Referenz und Fallback;
// weitere Sprachen registrieren sich via registerKorpus (Stufe C: prompts.en.js).
// Alle bisherigen Importe bleiben gültig — die de-Exporte laufen unverändert durch.
export * from "./prompts.de.js";
import * as de from "./prompts.de.js";
const korpora = { de };
export function getPrompts(locale) { return korpora[locale] || korpora.de; }
export function registerKorpus(locale, korpus) { korpora[locale] = korpus; }
