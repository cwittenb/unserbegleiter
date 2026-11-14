# Sprint EVAL-R1 — Fortsetzen innerhalb eines Laufs (2026-11-14)

Plan: `claude/sprintplan-EVAL-R1-fortsetzen-im-lauf.md`. Kern-Hash unverändert `cfb9e844` — nur Eval-Werkzeug.
Anlass: Die Familie INT braucht so viele Aufrufe, dass ein Lauf oft mittendrin abbricht; weiter ging es nur auf Klick und nur ab dem nächsten ganzen Szenario.

## Geliefert

| Was | Vorher | Jetzt | Dateien |
|---|---|---|---|
| Fortsetzen ab dem Sample | Ein Abbruch verwarf alle Samples der gerade laufenden Szenarien (Langszenario: bis zu 44 Aufrufe, mal «gleichzeitig») | Jedes fertige Sample bleibt liegen; verloren geht höchstens das eine angefangene je laufendem Szenario | `evals/runner-kern.js` (`sampleSpeicher`), `platforms/artifact/eval-app.js` |
| Selbst fortsetzen | Klick nötig | Haken «von selbst fortsetzen» (vorgewählt): wartet beim Nutzungslimit bis zur gemeldeten Rücksetzzeit plus 30 s, sonst 30 s, 30 s, 60 s, 2 min, 5 min; Countdown mit Uhrzeit; Knopf «Anhalten» | `eval-app.js` |
| Schluss ohne Fortschritt | — | nach acht Versuchen ohne ein einziges neues Sample hört es auf und nennt den letzten Grund | `eval-app.js` |
| Unbewertete Samples | blieben als «unbewertet» im Bericht | beim Fortsetzen neu gespielt; im Paket-Modus einmal nachgespielt, bevor ein Szenario als fertig gilt | beide |
| Status | «n Szenarien schon fertig» | «n Szenarien, m Samples fertig» und die Zahl der geretteten Samples | `eval-app.js` |

Ohne `sampleSpeicher` verhält sich `laufeSzenario` wie bisher (CLI und Batch unberührt). Eingabefehler (kein Szenario, Judge gleich Pipeline) lösen kein Warten aus.

## Abweichung vom Plan

Nicht geplant, beim Testen gefunden: Fällt der Judge aus, bricht der Lauf nicht ab — das Sample wird «unbewertet». Kurz vor einem Limit entstehen so unbewertete Samples, die das Fortsetzen nicht geheilt hätte. Deshalb das Nachspielen (Zeile «Unbewertete Samples»).

## Grenzen

- Der Tab muss offen bleiben. Ein Neuladen der Seite verwirft den Zwischenstand (nicht in diesem Sprint).
- Ein angefangenes Sample (Gespräch mitten im Zug) wird verworfen und neu gespielt.
- Die Wartezeiten sind am echten Artefakt nicht erprobt, nur mit künstlicher Uhr getestet.

## Tests

`tests/unit/eval-r1-fortsetzen.spec.js` (neu, 12 Tests); `prv-eval-vorgaben.spec.js` nachgezogen (der Test zum Fortsetzen von Hand schaltet den Haken ab). Ganze Suite: 333 Dateien, 3753 Tests grün.

## Nachtrag EVAL-R2 (2026-11-14, auf Zuruf)

Rückmeldung aus dem ersten Lauf: Der Abbruch «Internal server error while processing action» verschwand nach Neuladen; die Umgebung zeigt außerdem eine Bestätigung «Ich bin noch da».

| Was | Jetzt |
|---|---|
| Von selbst fortsetzen | nur, wenn im abgebrochenen Versuch mindestens ein Aufruf durchkam, oder wenn das Nutzungslimit eine Rücksetzzeit nennt. Kam gar nichts durch, wartet das Paket auf einen Klick und sagt, warum (offene Bestätigung oder Neuladen). |
| Szenarioliste | zugeklappt; die Zeile nennt die gewählten Kürzel (ab 40 gekürzt) und folgt dem An- und Abwählen. Ein Klick klappt auf. |

Grenze: Die Fehlermeldung der Bestätigung «Ich bin noch da» ist nicht bekannt. Erkannt wird sie mittelbar daran, dass kein Aufruf durchkommt. Kommt sie mitten im Lauf, kostet das einen vergeblichen Versuch nach 30 Sekunden.

Tests: `tests/unit/eval-r1-fortsetzen.spec.js` (+7).
