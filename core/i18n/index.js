// i18n-Kern: ein flaches Wörterbuch je Sprache, eine Funktion t(key, params).
// Deutsch ist Referenz und Fallback. Die Locale ist ein Singleton mit Default "de";
// Stufe B verdrahtet setLocale mit der Paarsprache (couple) bzw. UI-Wahl (pstate).
// Platzhalter: {name} — via fuelle() auch für Korpus-Steuertexte nutzbar.

import { de } from "./de.js";
import { en } from "./en.js";

const woerterbuecher = { de, en };
let aktuell = "de";

export function setLocale(l) { if (woerterbuecher[l]) aktuell = l; }

/** Vor-Session-Sprache (Stufe D): Vor Anmeldung existiert kein pstate.
 *  Auflösung: gespeicherte Wahl → Browser-Sprache → "de". Reine Funktion,
 *  die Plattform liefert die Quellen (z. B. localStorage, navigator.language). */
export function vorSessionSprache(gespeichert, navLang) {
  if (gespeichert && woerterbuecher[gespeichert]) return gespeichert;
  const nav = String(navLang || "").toLowerCase();
  for (const l of Object.keys(woerterbuecher)) if (nav.startsWith(l)) return l;
  return "de";
}
export function getLocale() { return aktuell; }
export function registerDict(l, dict) { woerterbuecher[l] = dict; }

export function fuelle(text, params) {
  if (!params) return text;
  let s = text;
  for (const [k, v] of Object.entries(params)) s = s.split("{" + k + "}").join(v);
  return s;
}

export function hatKey(key) {
  const dict = woerterbuecher[aktuell] || de;
  return dict[key] !== undefined || de[key] !== undefined;
}

/* CR-2.4 · Fehlerklassen fuer Rohfehler ohne Code.
   Bis CR-2 fiel alles ohne Code auf e.message zurueck — und das ist bei den
   haeufigsten Stoerungen Browser-Englisch oder Parser-Text: "Failed to fetch",
   "Load failed", "Unexpected token '<', \"<!DOCTYPE \"... is not valid JSON".
   Vier Klassen genuegen, und jede nennt im Woerterbuch eine Handlung:
     netz     — die Anfrage hat das Geraet nie verlassen oder kam nicht zurueck
     server   — der Server hat geantwortet, aber nicht verwertbar (5xx, kein JSON)
     sitzung  — 401 trotz Neuanmeldung: hier hilft nur Neuladen
   (llm_stille, llm_abbruch, llm_leer tragen ihren Code schon an der Quelle.)
   Bewusst eng: Fehler MIT eigener Meldung vom Server (4xx mit Text) bleiben,
   was sie sind. */
export function fehlerKlasse(e) {
  if (!e) return null;
  const status = typeof e.status === "number" ? e.status : null;
  if (status === 401) return "sitzung";
  if (status !== null && status >= 500) return "server";
  const name = e.name || "", msg = String(e.message || "");
  if (name === "SyntaxError" && /JSON|Unexpected token|Unexpected end/i.test(msg)) return "server";
  if (name === "TypeError" && /fetch|network|load failed|networkerror/i.test(msg)) return "netz";
  if (name === "AbortError" || name === "NetworkError") return "netz";
  return null;
}

/** CR-2.4 · Laesst sich derselbe Zug einfach noch einmal schicken? */
const WIEDERHOLBAR = new Set(["llm_overloaded", "netz", "server", "llm_stille", "llm_abbruch", "llm_leer"]);
export function istWiederholbar(e) {
  if (!e) return false;
  const status = typeof e.status === "number" ? e.status : null;
  const code = e.code || ((status === 503 || status === 529) ? "llm_overloaded" : null) || fehlerKlasse(e);
  return WIEDERHOLBAR.has(code);
}

// Fehlertexte: Worker liefert stabile Codes (e.code) — falls das Wörterbuch
// den Code kennt, kommt die lokalisierte Meldung; sonst die Server-Meldung.
// S70: Auslastung wird auch OHNE Code am nackten HTTP-Status erkannt
// (429/503/529) — Fehler aus Altpfaden oder direktem Transport tragen nur
// .status, sollen aber dieselbe freundliche Meldung bekommen.
export function fehlerText(e) {
  /* R0/F5: Frueher galt JEDER 429/503/529 blind als Auslastung. Der
     Kontingent-Waechter antwortet aber ebenfalls mit 429 — seine drei warmen
     Meldungen verschwanden dadurch hinter der Auslastungs-Meldung. Seit R0
     traegt jede Waechter-Ablehnung ihren eigenen Code; die Statuszuordnung
     bleibt nur fuer 503/529, wo es keinen anderen Absender gibt. */
  const status = e && typeof e.status === "number" ? e.status : null;
  const code = (e && e.code) ||
    ((status === 503 || status === 529) ? "llm_overloaded" : null) ||
    fehlerKlasse(e);
  const k = code ? "fehler.code." + code : null;
  if (k && hatKey(k)) return t(k);
  return (e && e.message) || String(e);
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
