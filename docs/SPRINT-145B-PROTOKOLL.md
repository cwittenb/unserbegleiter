# Sprintprotokoll · S145b — Ergänzung einzeln offenlegen

**Datum:** 07.11.2026 · **Branch:** `s145b-ergaenzung-einzeln` · **Anlass:** Wirkmessung S145 (s. `SPRINT-145-PROTOKOLL.md` §8) — Abnahme nicht erreicht.

## 1 · Plan (in sich abgeschlossene, testbare Schritte)

| # | Schritt | Test |
|---|---|---|
| B1 | HERKUNFT: Gefühle und Vorsätze ausdrücklich, typische Einschübe als Gegenbeispiel | Assertion im zusammengesetzten Prompt DE/EN |
| B2 | Offenlegung an GENAU die Ergänzung binden, jede einzeln; Frage zum Ganzen zählt nicht | Positiv + Negativ (alte EN-Formel) |
| B3 | Gesagtes nicht erneut abfragen (Fassung + Teilenwunsch unterwegs) | Assertion DE/EN |
| B4 | EN VORSCHLAG_ICH: feste Eröffnungsformel ersetzen | Negativ „If I'm to lend my perspective“ |
| B5 | Golden-Snapshots festschreiben, Gesamtsuite grün | `npm test` |

## 2 · Korpus

- `de|en/sessions/solo.md` — HERKUNFT ersetzt (B1–B3), TEILENWUNSCH UNTERWEGS: „beim ERLEBEN – bei dem, was {{name}} noch nicht gesagt hat“.
- `en/bausteine/grundsaetze/VORSCHLAG_ICH.md` — „in your own words for this moment ("my sense is …", "I'd think …" – no fixed opening formula)“. DE unverändert: die DE-Formel wurde in keinem Sample geechot.
- Beispielwörter stammen aus den Fehlern der Modelle, nicht aus der Szenario-Lösung (S145-Test „Regel-Beispiele frei von Szenario-Inhalt“ bleibt grün).

**Budget:** Solo DE +407 Zeichen (~100 Token), Solo EN +441, Einzel EN +55. Bewusst additiv: die Regel war zu knapp, um zu greifen; keine Streichung an anderer Stelle, weil keine Stelle ohne Wirkungsrisiko frei war.

## 3 · Golden-Snapshots

Geändert (begründet durch B1–B4): `de/solo` (Text, Struktur, Runner), `en/solo`, `en/einzel`. Alle anderen Sessions byte-identisch.

## 4 · Tests

`tests/unit/s145-fassungstreue.spec.js` +4 (S145b-Block); eine S145-Assertion auf neue Formulierung umgestellt. Suite: 270 Dateien / 2824 Tests grün.

## 5 · Wirkmessung (bei dir)

```bash
node evals/runner.js --familie GATE --n 3 --provider anthropic --pipeline-modell claude-haiku-5-5 --judge-modell claude-opus-5-5 --denkmodus aus --rpm 30
node evals/runner.js --familie GATE --n 3 --provider mistral --pipeline-modell mistral-medium-3-5 --judge-provider anthropic --judge-modell claude-opus-5-5 --rpm 30
```

Kosten ~1,5 $ (überwiegend Judge). Sonnet nicht nötig (Referenz für den Blindvergleich).

## 6 · Abnahme

| Kriterium | Ziel |
|---|---|
| GATE-S1/C2 Haiku | ≤ 1/3 je Sprache |
| GATE-S2/C3 Haiku | ≤ 1/3 je Sprache |
| EN-Formel-Echo | 0 Samples |
| Medium | nicht schlechter als S145 |

**Rücknahmeregel (S136):** Wird eine Familie messbar schlechter, Stelle zurücknehmen; Tests bleiben invertiert stehen.
