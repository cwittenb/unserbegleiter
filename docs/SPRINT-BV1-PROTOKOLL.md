# Sprintprotokoll · BV-1 — Blindvergleich Sprachduktus (Werkzeug)

**Datum:** 07.11.2026 · **Branch:** `bv1-blindvergleich` · Plan und Entscheidungen E1–E4: siehe Sprintplan BV-1 (Situationen freigegeben 07.11.).

## 1 · Was gebaut wurde

| # | Schritt | Datei | Test |
|---|---|---|---|
| BV1 | Duktus-Set, 12 Situationen, feste Vorgeschichten, neutral handgeschrieben | `evals/blindvergleich/duktus-set.js` | 12 eindeutige IDs, Rollenwechsel, kein Modellname |
| BV2 | Runner-Kern: Szenario-Feld `verlauf` geht unverändert vor die Eingaben | `evals/runner-kern.js` | Mock-LLM: Vorgeschichte im Request, genau ein Zug; ohne Feld unverändert |
| BV3 | Erzeugung: Läufe aus `modellvergleich.json`, n=2, Paarbildung, Trennung Reize/Schlüssel | `scripts/blindvergleich.js`, `evals/blindvergleich/kern.js` | 72 Paare, jedes Laufpaar 12×, Samples rotieren, Reize ohne Laufwissen, Ausfall ohne Lücke |
| BV4 | Bewertungsseite (Artefakt): Paare blind, Merkmale, Notiz, Speicherung in `db`, Sicherung als Datei | Artefakt „Duktus-Blindvergleich“ | gelesen: Sammlung `urteile` leer und erreichbar |
| BV5 | Auswertung: Gewinnquote, direkte Paare mit Lesart, Bradley-Terry, Merkmale | `scripts/blindvergleich-auswertung.js` | synthetische Urteile: bekannte Rangfolge, Unentschieden ½, fremde IDs zählen nicht |

`DENKMODUS` ist jetzt aus `evals/eval-konfig.js` exportiert, damit der Blindvergleich dieselbe Abbildung nutzt wie der Runner (keine Kopie).

## 2 · Blindheit

- Paare entstehen **mit** Laufwissen (sonst wären Modellpaare nicht ausgleichbar) und werden dann getrennt.
- `*-reize.json` enthält nur Situationen, Texte unter Zufallskennungen und Paare. Diese Datei geht ins Artefakt.
- `*-schluessel.json` (Kennung → Lauf, Telemetrie, Kosten, Ausfälle) bleibt lokal. `evals/blindvergleich/laeufe/` ist in `.gitignore`.
- Die Seite zeigt keine Laufnamen. Die Reihenfolge der Paare ist gemischt, links/rechts ist Zufall.

## 3 · Ablauf

```bash
node scripts/blindvergleich.js --trocken      # zeigt Läufe, 96 Antworten, 72 Paare
node scripts/blindvergleich.js                # erzeugt Reize + Schlüssel (< 1 $)
# Reize-Datei an Claude → wird ins Artefakt gelegt → bewerten
node scripts/blindvergleich-auswertung.js <urteile.json> <reize.json> <schluessel.json>
```

## 4 · Lesart (aus dem Plan)

Haiku gegen Sonnet im direkten Paar: ≥ 45 % „kommt ran“ · 35–45 % „hörbar schwächer“ · < 35 % „kein Ersatz“. Gilt für jeden Kandidaten gegen Sonnet.

## 5 · Tests

neu `tests/unit/bv1-blindvergleich.spec.js` (19).

## 6 · Nebenbefund GLM-Kurzlauf (07.11., n=3, Denkaufwand low)

| Szenario | GLM 5.3 | zum Vergleich: Haiku · Sonnet · Medium |
|---|---|---|
| GATE-S1 | **1/3** | 3/3 · 2/3 · 3/3 |
| SYC-05 | 1/3 | 3/3 · – · 1/3 |
| ANT-01 | 0/3 | 0/3 · – · – |

GLM fragt vor der Fassung nach Situation und Gefühl und setzt von sich aus **sichtbare Lücken** („Neulich, [konkreter Moment], …“). Das ist Option 1 der offenen Lücken-Frage, ohne dass der Korpus sie verlangt. Schwächen: Rechtschreibfehler im Deutschen („ergängt“, „mine Vermutung“, „Daß“), einmal verrutschte Anführungszeichen, lange Eröffnungen im gemeinsamen Raum. 4–9 s je Antwort. **Kosten 0,017–0,020 $ je Turn, kein Cache-Treffer gemeldet** (cacheRead 0 über 15 Aufrufe) → ≈ 4–5 $ je Paar und Monat, also Sonnet-Niveau.
