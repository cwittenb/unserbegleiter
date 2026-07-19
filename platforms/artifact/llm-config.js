// Artefakt-Umgebung — die EINZIGE sanktionierte Stelle mit Provider-/Modell-
// Wissen im Quellcode (S35d). Begründung: die Artefakt-Sandbox ist keyless und
// hat kein Environment; irgendwo muss das Entwicklungs-Modell stehen — hier,
// explizit und lokal. Überall sonst ist Provider/Modus/Modell Konfigurations-
// pflicht (Worker: env-Variablen, Eval-Runner: CLI-Flags) und fehlende
// Konfiguration führt zur Fehlermeldung, nie zu einem stillen Fallback.
// Der Grep-Wächter-Test (tests/unit/llm-konfig-waechter.spec.js) erzwingt das.

export const ARTEFAKT_LLM = {
  provider: "anthropic",
  mode: "keyless",
  models: { anthropic: "claude-sonnet-4-6" },
  thinking: "disabled",   // S77: Begleitung ohne Thinking (deterministisches Budget)
};
