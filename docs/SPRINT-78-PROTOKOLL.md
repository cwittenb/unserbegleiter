# Sprint S78 — Ballast-Abbau Judge (D5-Gate erfüllt) + Batch-Judge-Migration

Basis: S77 · Tests: 949 grün (823 Struktur · 97 Worker · 25 Engine · 4 e2e)
Kern-Hash unverändert: `24af2bd8a23122e2` (nur Eval-Schicht)

## Anlass

Das D5-Gate ist erfüllt: vollständiger Eval-Zyklus über beide Provider mit
0 Transport-Ausfällen im strukturierten Pfad. Damit fällt der in S76
angekündigte Ballast.

## Abgebaut (`evals/judge/judge.js`, 226 → 140 Zeilen)

- `parseJudge` (Zaun-toleranter Text-Parser)
- `retteJudge` (Anführungszeichen-Rettung, Befund Lauf 3)
- `KORREKTUR` (Korrektur-Runden-Prompt de/en) + `auszug` (Diagnose-Helfer)
- der `strukturiert:false`-Fallback-Zweig in `richte()` samt Option
- die JSON-Formatregeln (`formatDe`/`formatEn`) in `baueJudgePrompt` —
  es gibt nur noch die strukturierte Form; Signatur wieder `(sprache)`

Unverändert bleiben: Retry+Backoff, Härteregel (unbewertet ≠ bestanden),
`pruefeJudgeDaten` als fachliche Prüfschicht, `JUDGE_PROMPT_VERSION` j5
(die strukturierte Promptform ist inhaltlich identisch zu S76).

## Aufgedeckte Migrationslücke: Batch-Judge (`evals/runner-batch.js`)

Der Abbau ließ den Batch-Runner rot werden — er richtete noch über den
Textpfad (in S76 übersehen, weil er `parseJudge` direkt importierte statt
über `richte` zu gehen). Jetzt migriert: die Batch-Requests tragen
`tools` + `tool_choice` identisch zur synchronen Form, geparst wird über
`LLM_PROVIDERS.anthropic.parseStructured` + `pruefeJudgeDaten`;
Parse-Würfe führen zum unbewerteten Urteil des betroffenen Samples statt
zum Batch-Abbruch.

## Tests

- Entfernt: die drei Fallback-Describe-Blöcke (Korrektur-Runde,
  Parser-Rettung, Beleg-Trimming) und die parseJudge-Einzeltests — ihre
  Schutzfunktion ist auf die strukturierten Specs übergegangen.
- Angepasst: Batch-Mocks liefern tool_use-Blöcke (`urteilNachricht`);
  Prompt-Erwartungen prüfen die strukturierte Form (verdict) statt des
  JSON-Beispiels; `richte`-Retry-Tests laufen im strukturierten Pfad.
- Der Fehlerpfad-Test „Judge liefert `{}`" prüft jetzt implizit den
  parseStructured-Wurf → unbewertet.
