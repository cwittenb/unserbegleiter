// System-Prompts — 1:1 aus v0.29 portiert (Charta-tragende Texte).
// Die Prompt-Kanarien in tests/unit/kanarien.spec.js bewachen die Invarianten
// gegen Regressions-Verlust beim Refactoring.

/* ---------------------------------------------------------------
 * MOD-3 · FASSADE. Der Korpus lebt seit MOD-3 in vier Schichten unter
 * core/korpus/de/ — wissen (Haltung, Methoden, Lebensbereiche), policies
 * (Regeln, Waechter-Inhalt), format (technische Vorgaben), sessions (die
 * Dramaturgie je Session) — plus steuer (Wire) und bausteine (das zusammen-
 * gesetzte Objekt). Diese Datei reicht alles unveraendert durch: Jeder
 * bisherige Import bleibt gueltig, jeder Export ist byte-identisch
 * (Golden-Snapshot: tests/unit/mod-golden-prompts.spec.js).
 * Wer Inhalt aendert, aendert ihn in der Schicht, nicht hier.
 * --------------------------------------------------------------- */
export { DOMAINS, DOMAENEN } from "../korpus/de/wissen.js";
export { waechter } from "../korpus/de/policies.js";
export { bausteine } from "../korpus/de/bausteine.js";
export { klaerungsPrompt, klaerungsTeile, aufloesungsPrompt, aufloesungsTeile, momentPrompt, momentTeile, reflexionsPrompt, reflexionsTeile, qzMenuePrompt, THEMEN_RAHMEN } from "../korpus/de/sessions.js";
export { steuerTexte, KAPITEL_TITEL, korpusTexte, strukturTexte } from "../korpus/de/steuer.js";
