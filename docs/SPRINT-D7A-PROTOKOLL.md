# Sprint D7a — E2E-Zeitpolster (Nachbesserung zu D7)

**Design-Track D7a** · Standalone-Patch: Anker sind vom D-Track UNBERÜHRTE Dateien — anwendbar vor oder nach der D-Kette.

## Befund

Auf einem ausgelasteten Rechner fiel `tests/e2e/pages-vollstack.spec.js` nach Anwendung der D-Kette mit „Timeout: Eröffnung über /api/llm gerendert" (15s-Fenster). Analyse: Der D-Track fasst weder diesen Test noch den LLM-Pfad an; das Drehbuch wurde nicht anderweitig konsumiert (sonst stünde der Sentinel `[VOLL]`/`[PF2]` im DOM statt Stille — der Fehlerpfad wäre ein anderer). Die Waits sind **Wanduhr-Fenster** über echte Vollstack-Arbeit (esbuild-Import 10s, Tests 54s parallel im Protokoll des Fehl-Laufs), und die Suite ist mit D1–D7 um fünf Testdateien gewachsen — die parallele Last hat das knappe 15s-Fenster über die Kante geschoben. Auf unbelasteter Maschine läuft derselbe Stand wiederholt grün.

## Änderung (nur Test-Robustheit, keine Logik)

1. `tests/e2e/pages-vollstack.spec.js`: alle Wanduhr-Fenster des Vollstack-Tests von 15s/5s-Default auf **60s** (Boot, Raumwechsel, `[PF1]`, Sendbereitschaft, `[PF2]`, KV-Persistenz-Poll); Test-eigenes vitest-Timeout von 40s auf **300s** (Summe der Fenster). Die Prädikate — was WANN als bestanden gilt — sind unverändert hart.
2. `platforms/artifact/selbstfahrt.js`: `warteSendbereit(wurzel, opts)` reicht Optionen an `warteAuf` durch (rückwärtskompatibel, alle bestehenden Aufrufe ohne zweites Argument unverändert).

## Verifikation

Frischer Clone + volle D-Kette + dieser Patch: dry-run → apply → Idempotenz → volle Suite grün (1217) inkl. mehrfacher e2e-Läufe.
