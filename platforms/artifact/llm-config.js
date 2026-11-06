// Artefakt-Umgebung — die EINZIGE sanktionierte Stelle mit Provider-/Modell-
// Wissen im Quellcode (S35d). Begründung: die Artefakt-Sandbox ist keyless und
// hat kein Environment; irgendwo muss das Entwicklungs-Modell stehen — hier,
// explizit und lokal. Überall sonst ist Provider/Modus/Modell Konfigurations-
// pflicht (Worker: env-Variablen, Eval-Runner: CLI-Flags) und fehlende
// Konfiguration führt zur Fehlermeldung, nie zu einem stillen Fallback.
// Der Grep-Wächter-Test (tests/unit/llm-konfig-waechter.spec.js) erzwingt das.

import { STRUKTUR_KORREKTUR } from "../../core/contracts/struktur-korrektur.js";

export const ARTEFAKT_LLM = {
  provider: "anthropic",
  mode: "keyless",
  models: { anthropic: "claude-sonnet-5" },
  thinking: "disabled",   // S77: Begleitung ohne Thinking (deterministisches Budget)
  // MOD-5 · Wire-Text der keyless-Korrektur-Runde (ST1.4) — nur hier noetig,
  // weil nur keyless ohne Formgarantie laeuft.
  strukturKorrektur: STRUKTUR_KORREKTUR,
};
