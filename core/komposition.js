// Komposition (MOD-1) — die EINE Stelle, an der aus Art, Korpus, Waechtern und
// Backend eine SessionDef wird.
//
// BEFUND (MOD-0, B1): Bis hierher wurde dieselbe Session an fuenf Orten
// zusammengesetzt — app.js (Wahl der Def), sessions.js/kernwetten.js (Inhalt),
// evals/runner-kern.js (sysPromptFuer, schaerfungFuer, uebergabeFuer,
// markerOrderFuer: alles NACHGEBAUT) und evals/struktur-bruecke.js (Def mit
// Eval-Prompt). Der Nachbau war nicht deckungsgleich: solo und moment bekamen
// in der App den Themenrahmen, im Eval nicht. Der Golden-Snapshot aus MOD-0
// hat das festgehalten; dieses Modul schliesst die Luecke, indem es den
// Nachbau durch einen Aufruf ersetzt (Entscheidung E6 a: der Eval misst ab
// jetzt den App-Text inklusive Themenrahmen).
//
// Was hier NICHT liegt: Inhalt. Die Defs selbst wohnen weiter in
// core/ui/sessions.js und core/ui/kernwetten.js; die Prompts im Korpus; die
// Waechter in core/engine. MOD-2b zieht die Waechter-Zuordnung in einen
// Katalog, MOD-3 den Korpus auseinander — beide haengen sich HIER ein, und
// die Aufrufer (App, Eval) merken davon nichts.
//
// ZWEI AUFRUFER, EINE FORM:
//   App:  baueSessionDef(art, { backend, hooks })        → liest K() wie bisher
//   Eval: baueSessionDef(art, { sprache })               → Korpus der Szenario-
//         Sprache; DE und EN laufen im selben Lauf, also kann sich der Eval
//         nicht auf den globalen Sprach-Schnappschuss verlassen. Jede
//         Korpus-Lesung der Def (sysPrompt, schaerfe, pruefeUebergabe) laeuft
//         unter der Szenario-Sprache und stellt den Schnappschuss danach
//         wieder her — synchron, ohne Seiteneffekt ueber den Aufruf hinaus.

import { soloDef, momentDef } from "./ui/sessions.js";
import { einzelDef, gemeinsamDef } from "./ui/kernwetten.js";
import { K, getKorpusSprache, setKorpusSprache, getPrompts, istKorpusDa } from "./prompts/prompts.js";
import { POLICY_KATALOG } from "./policies/katalog.js";
import { baueSchaerfe, baueUebergabe } from "./policies/waechter.js";

/** Die Session-Arten mit eigener Def, in der Reihenfolge des Nutzerwegs. */
export const SESSION_ARTEN = ["einzel", "gemeinsam", "solo", "moment"];

/** Arten, die einen Systemtext haben, aber keine Def (Menue-Generator). */
export const TEXT_ARTEN = ["qualitytime"];

const BAU = { solo: soloDef, moment: momentDef, einzel: einzelDef, gemeinsam: gemeinsamDef };

/* Backend-Attrappe fuer Aufrufer ohne Persistenz (Eval, Golden-Snapshot).
   Bewusst leer und nicht "hilfreich": Griffe ins Leere sollen auffallen,
   nicht still Ersatzdaten liefern. (Aus evals/struktur-bruecke.js hierher —
   es gibt nur eine Attrappe.) */
export const BACKEND_ATTRAPPE = Object.freeze({
  info: () => ({}),
  pstate: { get: async () => null, set: async () => {} },
  bstate: { get: async () => null, set: async () => {} },
  chat: { load: async () => null, save: async () => {} },
  handover: { get: async () => null, post: async () => {} },
});

/**
 * Fuehrt fn unter einer Korpus-Sprache aus und stellt die vorherige wieder
 * her. Ohne Sprache: unveraendert (K() wie bisher). Laut, wenn der Korpus der
 * Sprache fehlt — ein stiller Rueckfall auf Deutsch ist genau der Fehler, den
 * stelleKorpusBereit() in prompts.js verhindert.
 */
export function mitKorpusSprache(sprache, fn) {
  if (!sprache) return fn();
  if (!istKorpusDa(sprache)) throw new Error("Korpus '" + sprache + "' ist nicht registriert.");
  const vorher = getKorpusSprache();
  setKorpusSprache(sprache);
  try { return fn(); } finally { setKorpusSprache(vorher); }
}

/**
 * Die SessionDef einer Art.
 * @param {string} art  solo | moment | einzel | gemeinsam
 * @param {{backend?:object, hooks?:object, sprache?:"de"|"en"}} [opt]
 */
export function baueSessionDef(art, { backend = BACKEND_ATTRAPPE, hooks = {}, sprache } = {}) {
  const bau = BAU[art];
  if (!bau) throw new Error("Unbekannte Session-Art: " + art + " (bekannt: " + SESSION_ARTEN.join(", ") + ")");
  const def = mitKorpusSprache(sprache, () => bau(backend, hooks));
  /* MOD-2b · Die Waechter kommen aus dem Policy-Katalog, nicht aus der Def.
     Der Korpus-Leser ist immer K(): Im App-Pfad ist das der globale
     Schnappschuss, im sprachgebundenen Pfad laeuft jeder Aufruf der Haken
     unter mitKorpusSprache (unten) — K() liest dann die Szenario-Sprache. */
  const eintrag = POLICY_KATALOG[art];
  if (!eintrag) throw new Error("Kein Policy-Katalog-Eintrag fuer Session-Art: " + art);
  def.schaerfe = baueSchaerfe(eintrag, K) || undefined;
  def.pruefeUebergabe = baueUebergabe(eintrag, K) || undefined;
  if (!sprache) return def;
  const binde = fn => (typeof fn === "function" ? (...a) => mitKorpusSprache(sprache, () => fn(...a)) : fn);
  return {
    ...def,
    sysPrompt: binde(def.sysPrompt),
    schaerfe: binde(def.schaerfe),
    pruefeUebergabe: binde(def.pruefeUebergabe),
  };
}

/**
 * Der Systemtext einer Art — fuer Defs ueber die Def, fuer qualitytime direkt
 * aus dem Korpus (der Menue-Generator hat keine Def, S113).
 * @param {string} art
 * @param {object} ctx  {me, partner, nameA, nameB}
 * @param {{sprache?:string}} [opt]
 */
export function baueSystemText(art, ctx, { sprache } = {}) {
  if (art === "qualitytime") return mitKorpusSprache(sprache, () => getPrompts(getKorpusSprache()).qzMenuePrompt());
  return baueSessionDef(art, { sprache }).sysPrompt(ctx);
}

/** Die markerOrder einer Art; Arten ohne Def kennen keine Marken. */
export function markerOrderFuer(art) {
  return BAU[art] ? (baueSessionDef(art).markerOrder || []) : [];
}
