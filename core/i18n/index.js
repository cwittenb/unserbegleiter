// i18n-Kern: ein flaches Wörterbuch je Sprache, eine Funktion t(key, params).
// Deutsch ist Referenz und Fallback. Die Locale ist ein Singleton mit Default "de";
// Stufe B verdrahtet setLocale mit der Paarsprache (couple) bzw. UI-Wahl (pstate).
// Platzhalter: {name} — via fuelle() auch für Korpus-Steuertexte nutzbar.

import { de } from "./de.js";

const woerterbuecher = { de };
let aktuell = "de";

export function setLocale(l) { if (woerterbuecher[l]) aktuell = l; }
export function getLocale() { return aktuell; }
export function registerDict(l, dict) { woerterbuecher[l] = dict; }

export function fuelle(text, params) {
  if (!params) return text;
  let s = text;
  for (const [k, v] of Object.entries(params)) s = s.split("{" + k + "}").join(v);
  return s;
}

export function t(key, params) {
  const dict = woerterbuecher[aktuell] || de;
  let s = dict[key];
  if (s === undefined) s = de[key];
  if (s === undefined) {
    if (typeof console !== "undefined") console.warn("[i18n] fehlender Schlüssel: " + key);
    return key;
  }
  return fuelle(s, params);
}
