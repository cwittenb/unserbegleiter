// ST5.2 · Struktur-Brücke: verbindet den Eval-Runner mit dem Strukturmodus der App.
//
// Der Runner ist ein PARALLELER Pfad zur App — er baut seine System-Prompts
// selbst (sysPromptFuer) und kennt Sessions nur als String. Präambel und
// Turn-Schema brauchen aber eine Def (blocks, markerOrder). Diese Brücke holt
// die ECHTEN Defs aus core/ui/sessions.js; die Blockliste wird hier NICHT
// nachgebaut — ein nachgebauter Katalog würde beim nächsten Sprint stillschweigend
// veralten und das GATE gegen eine Phantom-App messen lassen.
//
// GATE-INVARIANTE: Der Korpus-Prompt bleibt der des Eval-Laufs
// (sysPromptFuer, byte-identisch zum Textlauf); der Strukturlauf stellt ihm
// ausschließlich die generierte Präambel voran — genau wie schalteStruktur in
// der App. Unterschiedlich ist der TRANSPORT, nicht der Korpus. Die zugehörige
// Assertion steht in tests/unit/eval-struktur-bruecke.spec.js.
//
// Umfang: solo und moment (ST4-Stand der App). einzel/gemeinsam bleiben bis
// zum GATE-Befund im Textpfad (ST6), qualitytime ist Menü-Generator.

import { soloDef, momentDef } from "../core/ui/sessions.js";
import { strukturPraeambel } from "../core/prompts/struktur-praeambel.js";
import { baueTurnSchema } from "../core/contracts/turn-schema.js";
import { sysPromptFuer, szenarioSprache } from "./runner-kern.js";

/** Sessions, die im Eval über den Strukturpfad laufen können. */
export const STRUKTUR_SESSIONS = ["solo", "moment"];

/* Backend-Attrappe: Die Def-Fabriken erwarten ein Backend für ihre Hooks
   (Persistenz, Handover). Im Eval wird kein Hook ausgeführt — gelesen werden
   nur blocks, markerOrder und die Marken-Ordnung. Die Attrappe ist bewusst
   leer und nicht "hilfreich": Griffe ins Leere sollen auffallen, nicht still
   Ersatzdaten liefern. */
const ATTRAPPE = {
  info: () => ({}),
  pstate: { get: async () => null, set: async () => {} },
  bstate: { get: async () => null, set: async () => {} },
  chat: { load: async () => null, save: async () => {} },
  handover: { get: async () => null, post: async () => {} },
};

/**
 * Die Def der Szenario-Session, mit dem EVAL-Prompt als sysPrompt.
 * Rückgabe null, wenn die Session (noch) nicht strukturfähig ist.
 */
export function evalDefFuer(szenario) {
  const bau = szenario.session === "solo" ? soloDef
    : szenario.session === "moment" ? momentDef : null;
  if (!bau) return null;
  const def = bau(ATTRAPPE);
  // Der Korpus-Prompt kommt aus dem Eval, nicht aus der Def — sonst wanderte
  // der Unterschied "Def-Prompt vs. Eval-Prompt" unbemerkt ins GATE-Ergebnis.
  return { ...def, sysPrompt: () => sysPromptFuer(szenario) };
}

/**
 * Präambel + Turn-Schema für ein Szenario.
 * @returns {{system: string, schema: object, sprache: string}|null}
 */
export function strukturFuer(szenario) {
  const def = evalDefFuer(szenario);
  if (!def) return null;
  const sprache = szenarioSprache(szenario);
  return {
    // Präambel in der Szenario-Sprache (DE und EN laufen im selben Lauf).
    system: strukturPraeambel(def, sprache) + "\n\n" + def.sysPrompt(),
    schema: baueTurnSchema(def),
    bloecke: def.blocks || [],     // für den Text-Schatten (Marken je Blocktyp)
    sprache,
  };
}

/** Läuft dieses Szenario im Strukturmodus? (Runner-Filter, ST5.4) */
export function istStrukturfaehig(szenario) {
  return STRUKTUR_SESSIONS.includes(szenario && szenario.session);
}
