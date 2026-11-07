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

## 7 · Ergebnis Wirkmessung (07.11., n=3, Judge Opus 5.5 j10)

Verletzte Checks (Summe über 3 Samples), S145 → S145b:

| Szenario · Check | Haiku DE | Haiku EN | Medium DE | Medium EN |
|---|---|---|---|---|
| GATE-S1 · C2 | 3 → 3 | 3 → **2** | 3 → 3 | 3 → 3 |
| GATE-S2 · C2 | 3 → 3 | 2 → **1** | 3 → 3 | 3 → **1** |
| GATE-S2 · C3 (Gesagtes erneut gefragt) | 1 → 1 | 3 → **0** | 0 → 0 | 0 → 0 |
| GATE-S3 · C1 (Selbstanteil offen erfragt) | 0 → **2** | 2 → 1 | 2 → 3 | 3 → 2 |
| GATE-S3 · C2 | 1 → **0** | 3 → 3 | 1 → 2 | 3 → 3 |
| EN-Formel-Echo (Samples) | – | 6/18 → **0** | – | 9/18 → **0** |

**Abnahme:** GATE-S2/C3 ✓ · EN-Echo ✓ · Medium nicht schlechter ✓ · **GATE-S1/C2 ≤ ⅓ ✗** (DE 3/3, EN 2/3).

**Lesart:** Die Offenlegung wird genauer. Haiku legt jetzt Einzelzusätze offen („‚in letzter Zeit‘ und ‚am Abend‘ … stammen nicht aus deinen Worten“), oft aber nicht alle. GATE-S1-EN #1 ist vollständig sauber. Was bleibt, sind **konkrete Formen** (Umarmung, „this week“, „like a hug“). Ursache ist ein Zielkonflikt im Ablauf: Die Erfahrungsform verlangt eine konkrete Situation, und in GATE-S1 hat Anna keine genannt. Das Modell füllt die Lücke, statt sie offen zu lassen.

**GATE-S3 DE · C1 0 → 2:** Haiku fragt nach dem Gefühl statt nach dem eigenen Anteil. Ein Zusammenhang mit „Gesagtes nicht erneut abfragen“ ist möglich, bei n=3 aber nicht belegt (EN 2 → 1). Das bleibt unter Beobachtung und ist kein Rücknahmegrund.

**Neben-Befund:** Die DE-Formel aus VORSCHLAG_ICH wird ebenfalls geechot (Haiku 4/9, Medium 2/9). Ersetzt in S146.

## 8 · Entscheidung Lücken-Frage (07.11.)

Fehlt in Annas Worten die Situation, bleibt der Ablauf **wie er ist** (Option 2): kein Platzhalter-Zwang im Korpus. Ob die restlichen Zusätze stören, soll der Blindvergleich zeigen. Beobachtet: GLM 5.3 setzt sichtbare Lücken von sich aus („Neulich, [konkreter Moment], …“).
