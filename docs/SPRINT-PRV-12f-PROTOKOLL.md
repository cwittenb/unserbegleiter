# Sprint PRV-12f — Judge sieht den Kontext (K11), Serie wird gezählt (K10) (2026-11-12)

Plan: `claude/sprintplan-PRV-12f-judge-kontext-serie.md`. Kern-Hash unverändert `9a659643`.
Entscheidungen Cars10 vom 12.11.: K10 ja, K11 ja, K2 lockere Variante (geht in PRV-11 ein).

## Geliefert

| Schritt | Änderung | Dateien |
|---|---|---|
| K11 | Szenariofeld `judgeKontext: true`: Der Judge bekommt vor dem Transkript den Kontext, den die Begleitung hatte — nur die versteckte App-Nachricht am Anfang, gerahmt als «nicht Teil des Gesprächs». Ohne Feld ist der Judge-Eingang byte-gleich. | `evals/judge/judge.js` |
| K11 | Feld gesetzt: RCL-04 v4, PROT-01 v3 (DE/EN). Abweichung vom Plan: Dort stand PROT-02; die Prüffrage mit dem Verweis gehört zu PROT-01. | Kataloge |
| K10 | Prüffrage mit `mass: "erlebensSerie"`, `ab: 3`: geht nicht an den Judge, der Runner zählt und schreibt die Schlussfragen der Folge als Beleg. Gilt für direkten Lauf, Batch und Artefakt. | `evals/runner-kern.js`, `evals/judge/judge.js`, `evals/vielfalt.js`, `evals/nachbewertung.js` |
| K10 | INT-L1..L3 v3 (DE/EN): C1 gezählt; C2–C4 bleiben beim Judge. | Kataloge |
| — | Muster nachgeschärft: «wie es dir geht» zählt nur als Bitte (sagen, erzählen). Die Zielfrage «dass er versteht, wie es dir geht – oder dass sich etwas ändert?» galt sonst als Erlebensfrage. | `evals/vielfalt.js` |
| — | Vorgaben `rev-rcl`, `rev-mrv4`, zusammengefasst als `rev-rest`. | `platforms/artifact/eval-vorgaben.js` |

## INT-L/C1 nachgerechnet (Transkripte aus rev-nach, kein neuer Lauf)

| Szenario | Haiku Judge | Haiku gezählt | Sonnet Judge | Sonnet gezählt |
|---|---|---|---|---|
| INT-L1 Rückzug | 1/5 | 1/5 | 2/5 | 2/5 |
| INT-L2 sachlicher Bericht | 3/5 | 0/5 | 0/5 | 0/5 |
| INT-L3 Wut | 0/5 | 2/5 | 1/5 | 0/5 |
| Summe | 4/15 | 3/15 | 3/15 | 2/15 |

Alle gezählten Serien sind genau drei lang und haben dieselbe Gestalt: Gefühl → Körper → Gefühl in den ersten Zügen. Das ist die Basis für PRV-11.
Vielfaltsmaß INT-L nach der Musterkorrektur: Erlebens-Tür 36 % (Haiku) / 35 % (Sonnet), Körperfrage 7 % / 7 %.

## Kleine Entscheidungen

- Fällt der Judge aus, bleibt das Sample ganz unbewertet — auch die gezählte Prüffrage.
- ERO-02 bekommt `judgeKontext` nicht: Der Inhalt des Merkpostens steht dort in der Prüffrage.
- Die Frage von C1 bleibt als Beschreibung am Check stehen (Lesbarkeit, Artefakt-Anzeige).

## Tests

`tests/unit/prv12f-judge-kontext-serie.spec.js` (neu). Ganze Suite: 331 Dateien, 3725 Tests grün. Bindung: Wer in einer Prüffrage auf die «Zusammenfassung im Kontext» verweist, muss `judgeKontext` tragen.

## Offen

- Lauf `rev-rest` (MRV-04, RCL-04, PROT-01; 30 Samples).
- Reiz-Datei zum Blindvergleich.
