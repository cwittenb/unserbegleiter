// Sprachweiche für den Begleitungs-Korpus. Deutsch ist Referenz und Fallback;
// weitere Sprachen registrieren sich via registerKorpus (Stufe C: prompts.en.js).
// Alle bisherigen Importe bleiben gültig — die de-Exporte laufen unverändert durch.
//
// R5 · Deutsch bleibt statisch, Englisch wird nachgeladen.
//
//   prompts.de.js (118 kB) und prompts.en.js (115 kB) machen zusammen rund 43 %
//   des Pages-Bundles aus — und gebraucht wird immer nur einer. Deutsch bleibt
//   statisch, weil es Referenz UND Fallback ist (Entscheidung F2); Englisch
//   holt die Plattform bei Bedarf nach.
//
//   Der Haken lag in setKorpusSprache: Es fiel bei unbekannter Sprache lautlos
//   auf Deutsch zurück. Statisch war das harmlos — beim Nachladen wäre daraus
//   ein Korrektheitsfehler geworden: Ist Englisch beim Session-Start noch nicht
//   registriert, bekommt ein englischsprachiges Paar deutsche Prompts, ohne
//   Fehler, ohne Anzeichen. Deshalb gibt es stelleKorpusBereit() als Tor VOR
//   dem Session-Start; dort ist der Fehlschlag laut. Der synchrone Rückfall in
//   K() bleibt weich, damit Bestandscode nie ins Leere greift.
//
//   Die Plattform reicht ihren Lader herein (setKorpusLader): das Artefakt
//   einen synchronen „liegt schon vor" (Einzeldatei-Zwang), Pages einen, der
//   die separat gebaute Korpusdatei holt.
export * from "./prompts.de.js";
import * as de from "./prompts.de.js";
const korpora = { de };
export function getPrompts(locale) { return korpora[locale] || korpora.de; }
export function registerKorpus(locale, korpus) { korpora[locale] = korpus; }
export function alleKorpora() { return { ...korpora }; }
export function istKorpusDa(locale) { return !!korpora[locale]; }

/* ---- Nachladen (R5) --------------------------------------------------- */

let lader = null;

/** Plattform-Lader setzen: (locale) => Promise<Korpus-Modul>. */
export function setKorpusLader(fn) { lader = fn; }

/**
 * Stellt sicher, dass der Korpus einer Sprache registriert ist.
 * Laut im Fehlerfall — ein stiller Rückfall auf Deutsch wäre hier genau der
 * Fehler, den das Tor verhindern soll.
 */
export async function stelleKorpusBereit(locale) {
  const l = locale === "en" ? "en" : "de";
  if (korpora[l]) return l;
  if (!lader) throw new Error("Korpus '" + l + "' fehlt und es ist kein Lader gesetzt.");
  const korpus = await lader(l);
  if (!korpus) throw new Error("Korpus '" + l + "' konnte nicht geladen werden.");
  registerKorpus(l, korpus);
  return l;
}

/* Aktive Korpus-Sprache: Sprach-Schnappschuss der laufenden Session.
   app.js setzt sie beim Session-Start (neu: Paarsprache; Resume: chat.language).
   Alle Korpus-Verbraucher (Session-Defs, Steuertexte, Inhalte) lesen über K()
   zur LAUFZEIT — nie zur Importzeit. Unbekannte Sprache fällt auf Deutsch. */
let korpusSprache = "de";
export function setKorpusSprache(l) { korpusSprache = korpora[l] ? l : "de"; }
export function getKorpusSprache() { return korpusSprache; }
export function K() { return korpora[korpusSprache] || korpora.de; }
