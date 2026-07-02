# Sprint 3 + 4 — Protokoll · Engine, LLM-Adapter, Prompts, Kanarien

**Datum:** 2. Juli 2026 · **Stand nach S4:** 135 Tests grün

## Sprint 3 — Engine (Ebene 1.5), 12 Drehbuch-Tests

`core/engine/engine.js` — Nachrichtenfluss über den drei Verträgen, DOM-frei, LLM injiziert:
- **Vertrag 1:** Marker in letzter Zeile → registriertes Panel; Rückkanal ausschließlich `submitToolResult` = GENAU EINE User-Nachricht (Test zählt nach).
- **Vertrag 2:** Block → Schema → Handler; ungültig → GENAU EINE versteckte SYSTEM-KORREKTUR-Runde, danach Personen-Fehlermeldung, KEIN dritter Versuch (Test zählt LLM-Aufrufe: exakt 2). blockFix-Reset erlaubt anschließend frische Zählung.
- **Vertrag 3:** `core/engine/freigabe.js` — `freigebeUebergabe()` als einziger Schreibpfad privat→geteilt; Test beweist Fremdfeld-Filter („PRIVAT-GEHEIM quert nicht") und dass der private Namensraum unberührt bleibt.
- **Registrierungs-Wächter:** falsch sortierte markerOrder oder Marker ohne Handler → Konstruktion wirft.
- `core/engine/mock-llm.js`: gescriptete Antworten + Aufruf-Protokoll (System + Nachrichten-Schnappschüsse) — Drehbücher laufen headless durch die ECHTE Engine.

## Sprint 4 — LLM-Adapter + Prompts + Kanarien (23 neue Tests)

**Prompts (`core/prompts/prompts.js`):** programmgesteuert 1:1 aus v0.29 extrahiert (einzelSys 16,9 kB, gemeinsamSys, momentSys, soloSys, qzSys, DOMAINS/DOMAENEN verbatim) — kein Abtippen, kein stilles Umformulieren.

**Adapter (`core/llm/adapter.js`):** Fassade `callClaude(system, messages) → {text, stop, usage}` stabil; drei Transportmodi:
- `keyless` — Artefakt-Sandbox (keine Auth-Header, Sandbox injiziert)
- `direct` — eigener Key (Eval-Runner; serverseitig im Worker)
- `proxy` — Browser-Client der Cloudflare-Form → POST /api/llm, Key bleibt serverseitig; 401 → „Sitzung abgelaufen"

Provider: anthropic (mit Rolling-Prompt-Cache: cache_control auf System UND letztem Turn — Test prüft den Request-Körper), mistral/openai (OpenAI-kompatibel, role:system + Bearer). fetch injizierbar; Tests prüfen alle Körper gegen Mock-fetch. Wichtiges Detail mit eigenem Test: **versteckte Korrektur-Nachrichten gehen ANS MODELL mit** (hidden ist reine Anzeige-Semantik), Meta-Felder queren nicht in den Request.

**Kanarien (`tests/unit/kanarien.spec.js`):** SICHERHEITS-WEICHE, SPIEGEL-GRAMMATIK, WIDERSPRUCHS-PFLICHT (soloSys); NOT-FRAGE AN BEIDE, KEINE Sicherheitsdiagnosen, OFFENE TÜR, Zwischenzeit-Impuls-ohne-Nachhalten (momentSys); NIE-eine-Diagnose (qzSys); SORGEN-WEICHE + binäre WEICHEN-DISZIPLIN + [[REGLER]]-Konvention (einzelSys v2, schaltbar); BEFUND-BLOCK + vonBeidenBestaetigt (gemeinsamSys); 13 Domänen inkl. Sexualität und Finanzen nicht wegredigiert.
