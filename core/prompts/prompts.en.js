// System prompts — English corpus (Sprint 30 · C2), authored from the four
// review packages accepted by Cars10 on 7 July 2026 (wording binding).
// PROTOCOL INVARIANTS stay identical across languages: [[…]]-markers,
// *-BLOCK marks, context/result header tokens (COMPANION-CONTEXT,
// REVEAL-CONTEXT, HANDOVER-BLOCK, REGLER-/RANKING-/BASELINE-RESULT,
// PARTNER-GUESS, MOMENT-CONTEXT, GOALS:, AGENDA, PREVIOUS MOMENTS,
// META-REFLECTION, IN-BETWEEN MATERIAL, MATERIAL, CATALOG, RESTING,
// REVEAL-PROTOCOL, [CLOSE SESSION], [CHECKPOINT],
// [CLOSE MOMENT], SHARING-RESULT:, REVEAL-SHOWN:) and all
// wire values (JSON field names, tag/op/art/source/path tokens, RESTING,
// "(confirmed by both)"). Only ONE marker is per-bundle by design:
// [Continue with chapter {n}.] — sent from THIS bundle's steuerTexte and
// described only by THIS bundle's prompts. The C1 invariance test
// (korpus-invarianten.spec.js) guards all of this automatically.

/* ---------------------------------------------------------------
 * MOD-3 · FACADE. The corpus lives in core/korpus/en/ (wissen, policies,
 * format, sessions, steuer, bausteine) — mirror of the DE layout. This file
 * re-exports everything unchanged; every existing import stays valid.
 * --------------------------------------------------------------- */
export { DOMAINS, DOMAENEN } from "../korpus/en/wissen.js";
export { waechter } from "../korpus/en/policies.js";
export { bausteine } from "../korpus/en/bausteine.js";
export { klaerungsPrompt, klaerungsTeile, aufloesungsPrompt, aufloesungsTeile, momentPrompt, reflexionsPrompt, reflexionsTeile, qzMenuePrompt, THEMEN_RAHMEN } from "../korpus/en/sessions.js";
export { steuerTexte, KAPITEL_TITEL, korpusTexte, strukturTexte } from "../korpus/en/steuer.js";
