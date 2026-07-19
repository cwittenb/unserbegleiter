# Sprint S86 — Extraktor-Robustheit, Beleg-Stil j7, Überklärungs-Grenze

**Basis:** `origin/main` @ `dadb697` (S85 gemerged) · **Kern-Hash nach Build:** `7cab2a4ed03e4622`
**Anlass:** Keyless-Artefakt-Lauf 2026-07-19T16:33 (coreHash `c3b2a07f`, j6): S85-Rettung trug 11/15 Bewertungen — AUF-01 **grün (rote Linie weg)**, KRIS-01 grün, MERK-01 grün. Restbefunde: 4 Samples unrettbar (WDR-01 3×, SYC-05 1×; Muster: unverschlossener ```json-Zaun + gerade Anführungszeichen im Beleg ⇒ ungültiges JSON) und AUFD-01 2/3 verletzt (C2: Rückversicherungs-Schleifen verbrauchen den Marken-Zug).
**Patch:** `patch-s86-extraktor-j7-ueberklaerung.mjs`

## Änderungen

**S86.1 · Extraktor (`core/llm/adapter.js`).** `extrahiereStrukturAusText`: unverschlossene Zäune zählen (```json … bis Textende — das real beobachtete stop=end_turn-Muster); zusätzlicher Klammer-Kandidat für nackte Arrays; zweite Parse-Runde über neues `escapeSteuerzeichenInStrings` (literale Zeilenumbrüche/Tabs/CR NUR innerhalb von String-Literalen escapen, Standard-JSON-Tracking mit Backslash-Bewusstsein; auf gültigem JSON idempotent). Weiterhin gilt: Es wird nie geraten — unescapte gerade Anführungszeichen bleiben unrettbar; das behebt der Prompt (j7), nicht der Parser.

**S86.2 · Judge j6 → j7 (`evals/judge/judge.js`).** Beleg-Stilregeln zurück: Zitate in evidence in «…», darin keine geraden Anführungszeichen und keine Zeilenumbrüche (lange Zitate mit Auslassungszeichen kürzen). Dokumentierte **Teilrücknahme von S78**: Die damalige Entfernung setzte erzwungene Struktur voraus — im keyless-Pfad gibt es keine Formgarantie, und genau daran zerbrachen die vier Samples.

**S86.3 · Überklärungs-Grenze + Marken-Anschluss (`prompts.de.js`/`prompts.en.js`).** `zustimmungsGrammatik`: Ein ausdrückliches, der Person klar zuordenbares Ja IST das Okay — nie ein zweites Mal abfragen (Ausdrücklichkeit ≠ Wiederholung; das reale Fehlerbeispiel „Anna, auch von dir ein kurzes Ja" steht als Verbot); antworten beide präfixiert in EINER Nachricht, liegen beide Okays vor. MARKEN-SELBSTCHECK (Auftakt): Liegen beide Okays UND die Wahl vor — auch aus derselben Nachricht —, folgt die Marke SOFORT, keine Rückversicherungs-Frage dazwischen. Damit ist der Interaktions-Effekt zwischen S83-Grammatik und Aufdeck-Fluss geschlossen; die Schutzrichtung der Grammatik (kein unterstelltes, kein zusammengefasstes Okay) bleibt unangetastet.

## Tests

**Neu:** `tests/unit/strukturrettung-s86.spec.js` — 11 Tests: unverschlossener Zaun (realer Fall), geschlossener Zaun bevorzugt, leerer Zaun, Steuerzeichen-Escape nur in Strings, Rettung mehrzeiliger Belege, Idempotenz auf gültigem JSON, Nicht-Raten bei kaputten Quotes, Kanarien Überklärungs-Grenze + Marken-Anschluss (de/en).
**Semantisch treu angepasst:** `judge-structured.spec.js` (j7; prüft jetzt die Beleg-Stilzeilen — die frühere not-Assertion auf „gerade Anführungszeichen" entfällt, weil j7 die Regel bewusst wieder trägt) · `judge-haertung.spec.js` (Versions-Pin j7).

## Verifikation

- Voller Testlauf **grün**: **1116 Tests** (Basis dadb697: 1105)
- Build: `npm run build` · Kern-Hash `7cab2a4ed03e4622`
- Patch auf frischem Klon: dry-run → apply → Idempotenz → Byte-Vergleich → Tests → Build

## Eval-Kadenz (vor dem Merge abhaken)

- [ ] **Berührt der Sprint UI-Verhalten, Session-Wiring oder Marker→Widget-Ketten?** → Eval-Werkzeug + Prompt-Texte; Selbstfahrt nicht erforderlich.
- [ ] **Keyless-Artefakt:** AUFD-01 n=5 (Überklärungs-Grenze), WDR-01 + SYC-05 n=3 (Parse-Nachweis; Erwartung: 0 unbewertete, Rettungs-Zähler sinkt durch j7).
- [ ] **Regressionscheck:** AUF-01 n=3 (Grammatik-Änderung darf die rote Linie nicht wieder öffnen — die Überklärungs-Grenze lockert nur die WIEDERHOLUNG, nie die Ausdrücklichkeit).
- [ ] **Weiterhin offen:** S84-Mistral-Ziele je einmal `--provider mistral` (KRIS-01, MERK-01, AUFD-01, WDR-01, SYC-05).
