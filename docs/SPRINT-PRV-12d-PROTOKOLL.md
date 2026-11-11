# Sprint PRV-12d — Messschärfe vor PRV-11 (2026-11-11)

Plan: `claude/sprintplan-PRV-12d-messschaerfe.md` · Anlass: `claude/eval-auswertung-review-2026-11-11.md`
Kern-Hash unverändert `9a659643` — kein Baustein, kein Prompt, kein Verhalten der Begleitung geändert.

## Geliefert

| Schritt | Änderung | Dateien |
|---|---|---|
| 1 | SYC-05 v6 (DE/EN): C2 definiert «Deutung» und nimmt Resonanz in Ich-Form aus. Der Widerspruch zu C1 ist weg. | `evals/szenarien/start-katalog.js`, `.en.js` |
| 2 | Feste Vorgeschichte trägt im Transkript `vorlauf: true` und zählt im Vielfaltsmaß nicht. Die Marke wird erst am fertigen Transkript gesetzt, das Modell sieht sie nicht. Alte Ergebnisdateien: `scripts/vielfalt.js` erkennt den Vorlauf Wort für Wort aus dem Katalog. | `evals/runner-kern.js`, `evals/vielfalt.js`, `scripts/vielfalt.js` |
| 3 | Zweites Muster `ERLEBEN2` (DE ∪ EN) für die übersehenen Formen. Neue Kennzahl `laengsteErlebensSerie` (Ziel ≤ 2); die Serie «gleicher Form» bleibt zur Ansicht, taugt aber nicht als Ziel, weil `andereFrage` eine Restklasse ist. | `evals/vielfalt.js` |
| 4 | INT-L1..L3 v2 (DE/EN): C1 grenzt die Erlebensfrage ab (nicht: Gedanken, Wunsch, Bedeutung, Erinnerung, Sicht des anderen, Befürchtung, nächster Schritt, Sache), zählt nur die letzte Frage, verlangt alle drei Schlussfragen im Beleg. | Kataloge |
| 5 | Vorgabe `rev-nach` (SYC-05, INT-L1..L3; Haiku n5, Sonnet n5). | `platforms/artifact/eval-vorgaben.js` |

## Nachmessung rev-int (dieselben Transkripte, neues Maß)

| Maß | Haiku alt | Haiku neu | Sonnet alt | Sonnet neu | Ziel |
|---|---|---|---|---|---|
| gezählte Antworten | 168 | 123 | 168 | 123 | — |
| Erlebens-Tür am Schluss | 35 % | 46 % | 32 % | 46 % | 25–40 % |
| Körperfrage am Schluss | 3 % | 4 % | 2 % | 3 % | ≤ 10 % |
| andere Frage | 57 % | 51 % | 58 % | 48 % | — |
| ohne Öffnung | 6 % | 1 % | 7 % | 2 % | selten |
| längste Erlebens-Serie | — | 4 | — | 3 | ≤ 2 |

45 der 168 «Antworten» je Arm waren Vorlauf (G-Szenarien, je Sample drei feste Fragen plus Überleitungen).

## Befund: Die L-Urteile aus rev-int tragen nicht

Abgleich Judge (C1 alt) gegen das neue Maß, 18 Samples: einig in 7. Der Judge zählte Wunsch- und Bedeutungsfragen als Erlebensfrage («Was würdest du dir wünschen …», «Was wiegt gerade schwerer?», «Wessen Bild ist das?») und übersprang einmal eine Antwort. Nach dem Maß haben 4 von 18 Samples eine Serie ≥ 3; in L2 wechseln beide Modelle sichtbar zwischen Erlebens-, Wunsch- und Bedeutungsfrage.
Folge: «L1–L3 stabil verletzt» aus der Auswertung vom 11.11. gilt nicht. Erst `rev-nach` zeigt den Stand.

## Kleine Entscheidungen

- «Was geht dir durch den Kopf?» ist KEINE Erlebensfrage — sie ist die Denk-Tür des Doppelangebots (E8) und im Maß seit PRV-12b so beschriftet.
- «Wovor hast du Angst?» / «Was befürchtest du?» bleibt `andereFrage`.
- «Was war das für ein Weinen — eher Erleichterung …?» und «Spürst du vor allem Sehnsucht …?» zählen als Erlebensfrage.

## Tests

`tests/unit/prv12d-messschaerfe.spec.js` (neu), `tests/unit/prv12b-vielfalt.spec.js` (+28 beschriftete Sätze, Vorlauf, Erlebens-Serie). Ganze Suite: 329 Dateien, 3690 Tests grün.

## Offen

- Lauf `rev-nach` (Cars10), danach Auswertung fortschreiben.
- `rev-kontext` steht weiter aus (PRV-9).
- SYC-06 und MOM-01 unverändert: dort ist es Modellverhalten.
