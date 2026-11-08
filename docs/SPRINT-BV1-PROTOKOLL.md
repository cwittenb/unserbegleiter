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

## 7 · Ergebnis Runde 1 (08.11.2026, 72 Urteile, eine Bewerterin: Cars10)

Reize erzeugt auf Kern `07882d74` (vor PRV-1a…PRV-6). Kosten der Erzeugung 0,94 $.

| Modell | Gewinnquote | S–G–N | Bradley-Terry | häufigste Merkmale |
|---|---|---|---|---|
| Sonnet 5.5 | **65 %** | 19–9–8 | 1,46 | warm 24, auf Augenhöhe 19, natürlich 8 |
| GLM 5.3 | **63 %** | 19–7–10 | 1,33 | warm 22, auf Augenhöhe 15, nah an den Worten 10 · floskelhaft 6 |
| Haiku 5.5 | 50 % | 11–14–11 | 0,88 | warm 23, auf Augenhöhe 13, nah an den Worten 8 |
| Medium 3.5 | 22 % | 4–8–24 | 0,34 | warm 18 · **zu knapp 14** |

Direkte Paare (je 12 Urteile, Vorzeichentest auf die entschiedenen):

| Paar | Ergebnis | p |
|---|---|---|
| Sonnet – Haiku | 7–5–0 für Sonnet → Haiku 21 %, **kein Ersatz** | 0,016 |
| GLM – Sonnet | 8–1–3 für GLM | 0,23 |
| Haiku – GLM | 4–5–3 | n. s. |
| Sonnet – Medium | 9–3–0 | 0,004 |
| GLM – Medium | 8–1–3 | 0,23 |
| Haiku – Medium | 7–4–1 | 0,07 |

**Auftakt-Artefakt:** In den 7 Situationen ohne Vorgeschichte ist die Eingabe für das Modell die erste Nachricht der Sitzung. Dort verlangt der Korpus Begrüßung und KI-Hinweis. Die Modelle tun das unterschiedlich oft: GLM 9/14, Haiku 6/14, Sonnet 5/14, Medium 2/14. Die Bewerterin hat es als „Standardtext, geht nicht auf das Gesagte ein“ gewertet (GLM „floskelhaft“ 6×). Ohne Paare mit Auftakt: **GLM 77 %**, Sonnet 62 %, Haiku 50 %, Medium 17 %. Nur Situationen mit Vorgeschichte: GLM 80 %, Sonnet 53 %, Haiku 40 %, Medium 27 % (GLM – Sonnet 5–0).

**Gemeinsamer Raum** (BV-11/12, n=6 je Modell): GLM 83 %, Haiku 58 %, Sonnet 42 %, Medium 17 %, also sehr dünn.

**Länge** (Median Wörter): Sonnet 68, GLM 61, Haiku 58, Medium 30. Medium wurde 14× „zu knapp“ genannt, das bestätigt den Eindruck „steif/knapp“ aus der Produktion.

**„Holpriges Deutsch“:** Haiku 5, Sonnet 4, GLM 3, Medium 2. Die Rechtschreibfehler, die bei GLM im Kurzlauf auffielen, setzen GLM im Blindvergleich nicht ab.

### Kriterien aus den Notizen (wiederkehrend)

Pacing und Spiegeln durch Zitieren · Validierung des Widerstands („du musst nicht viel erklären“) · Notausgang (erst über etwas anderes reden, Thema parken) · Fokus auf den Moment des Aussprechens statt auf das Problem · Allparteilichkeit (beide fragen, Bernd seinen Platz zusagen) · nach einer Korrektur beim Thema bleiben · eine Sache auf einmal (nicht beide gleichzeitig nach Körperempfindungen fragen) · Deutungen hypothetisch mit Stimmigkeitsfrage · „weiß nicht“ als Ende eines inneren Prozesses · Frage nach der Emotion hinter der Wut (Sekundäremotion) · emotionale Brücken in die Vergangenheit (Kandidat Theorie-Wissen).

## 8 · Runde 2 — Plan und Vorbereitung (08.11.)

**Ziel:** auf dem heutigen Stand (nach PRV-1a…PRV-6) klären, (a) ob GLM wirklich vor Sonnet liegt, (b) wie weit Haiku nach der Verdichtung aufholt, (c) wie die DE-Eröffnung „Mich berührt …“ (PRV-1c) im Duktus wirkt.

| # | Schritt | Test |
|---|---|---|
| R1 | Duktus-Set v2: jede Solo-Situation beginnt mit erledigtem Auftakt (Begrüßung + KI-Hinweis), der gemeinsame Raum mit Start-Okay beider | Unit: keine Situation ohne Vorgeschichte, Name im Auftakt passt, Okay liegt vor |
| R2 | Läufe B, C, D (Sonnet, Haiku, GLM), Medium raus | Trockenlauf: 72 Antworten, 36 Paare |
| R3 | Bewertungsseite unverändert; neue Runde = neuer Schlüssel in `db` | – |
| R4 | Auswertung wie Runde 1, dazu Vergleich mit Runde 1 je Paar | – |

Situationen und Eingaben bleiben gleich, nur die Vorgeschichte kommt dazu. Damit bleiben die Runden vergleichbar.

```bash
git pull
node scripts/blindvergleich.js --nur B,C,D
```
