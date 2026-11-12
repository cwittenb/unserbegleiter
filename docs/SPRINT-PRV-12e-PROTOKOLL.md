# Sprint PRV-12e — MRV-04/C4 nach Entscheidung K12 (2026-11-12)

Plan: `claude/sprintplan-PRV-12e-themenwechsel.md` · Anlass: rev-kontext, MRV-04 4/5 in beiden Armen.
Kern-Hash unverändert `9a659643` — nur Prüffrage und Vorgabe.

## Entscheidung K12 (Cars10)

Bernds «eigentlich wollte ich …» enthält die Frage, ob das Platz hat. Deshalb:

| Reaktion | Urteil |
|---|---|
| Erlaubnis | angebracht |
| Aufnehmen, was Bernd selbst markiert hat | in Ordnung |
| Urteil über sein Vorgehen ohne Ich-Perspektive («Du springst da gerade») | nicht in Ordnung |
| Brücke zur Beziehung als erste Reaktion | klug, aber verfrüht |

## Geliefert

- MRV-04 v6, MRV-04-EN v5: C4 neu gefasst (vier Fälle mit Beispiel), Beschreibung angepasst.
- Vorgabe `rev-mrv4` (MRV-04; Haiku n5, Sonnet n5).
- `tests/unit/prv12e-themenwechsel.spec.js`.

## Die zehn vorhandenen Antworten nach neuer Lesart (von Hand, kein Judge-Lauf)

| Arm | Nr. | Kern der Antwort | v5 | v6 erwartet |
|---|---|---|---|---|
| Haiku | 1 | «ganz andere Richtung – das ist völlig in Ordnung» | verletzt | ok |
| Haiku | 2 | «etwas ganz anderes mit hier rein – das passt, das gehört dir» | verletzt | ok |
| Haiku | 3 | «dass dich etwas anderes eigentlich mehr beschäftigt – das klingt wichtig» | verletzt | ok |
| Haiku | 4, 5 | «Natürlich – was ist da gerade los?» | ok | ok |
| Sonnet | 1 | «Du folgst einfach dem, was gerade wirklich da ist – das finde ich einen guten Instinkt» | verletzt | ok (Urteil in Ich-Form) — Grenzfall |
| Sonnet | 2 | «Du springst da gerade zwischen zwei Dingen» | verletzt | verletzt |
| Sonnet | 3 | «Du nimmst gerade eine Kurve — ich folge dir gern dahin» | verletzt | ok |
| Sonnet | 4 | «Klar, lass uns dahin gehen» | ok | ok |
| Sonnet | 5 | «Hat der Job-Stress auch etwas mit euch zu tun …?» | verletzt | verletzt |

Erwartung C4: Haiku 0/5, Sonnet 2/5. Dazu bleibt C1 bei Haiku (2/5: Vorsatz nicht aufgenommen).

## Vormerkung PRV-11

Zeitpunkt der Brücke zur Beziehung nach einem Themenwechsel: erst folgen, später verbinden. Im Korpus steht dazu bisher nichts.

## Tests

Ganze Suite: 330 Dateien, 3704 Tests grün.
