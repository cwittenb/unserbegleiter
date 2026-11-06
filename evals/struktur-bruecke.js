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

import { baueSessionDef } from "../core/komposition.js";
import { strukturPraeambel, schalteStruktur } from "../core/prompts/struktur-praeambel.js";
import { baueTurnSchema } from "../core/contracts/turn-schema.js";
import { sysPromptFuer, szenarioSprache } from "./runner-kern.js";

/** Sessions, die im Eval über den Strukturpfad laufen können. */
export const STRUKTUR_SESSIONS = ["solo", "moment"];

/* MOD-1 · Die Backend-Attrappe lebt in core/komposition.js (BACKEND_ATTRAPPE)
   und ist dort der Default — es gibt nur eine. */

/**
 * Die Def der Szenario-Session, mit dem EVAL-Prompt als sysPrompt.
 * Rückgabe null, wenn die Session (noch) nicht strukturfähig ist.
 */
export function evalDefFuer(szenario) {
  if (!STRUKTUR_SESSIONS.includes(szenario.session)) return null;
  /* ST8: Die Sessions RUHEN im Textpfad (Entscheidung 2026-08-02). Der Eval
     schaltet den Strukturmodus deshalb SELBST — er ist hier explizites Opt-in
     über --struktur und misst die Infrastruktur, nicht den Produktionsstand.
     MOD-1: Die Def kommt aus der Komposition, in der Szenario-Sprache. */
  const def = schalteStruktur(baueSessionDef(szenario.session, { sprache: szenarioSprache(szenario) }));
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
