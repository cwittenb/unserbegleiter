# Sprint PRV-12 · Eval näher am Betrieb

**Datum:** 11.11.2026 · **Basis:** `main` @ `2c21e48` (nach UX-1) · **Branch:** `prv12-eval-betrieb`
**Bezug:** Code-Review 10.11.2026 (C12, C23, P13) · Heuristik v0.2, Abschnitt 6.9 und Entscheidungen E1–E8 · Plan `claude/sprintplan-PRV-11-interventionswahl.md` (PRV-12a–c)
**Ohne Modellaufrufe.** Alle Läufe fährt Cars10 lokal; Kommandos unten.

## Ergebnis

| Schritt | Vorher | Nachher |
|---|---|---|
| 12a · Messbasis (C12, C23) | Phasen und Karten lasen alle Nachrichten der Rolle `user` — auch den versteckten Kontext. „(shared, active)“ löste das Teilen-Modul aus: jedes Paar mit einem gemeinsamen Auftrag bekam im Reflexionsgespräch ab dem ersten Zug 13k Zeichen mehr. Freigegebene Sätze des Partners konnten Karten und das Abschluss-Modul auslösen | `trenneNutzer` (Vertragsschicht) trennt Person von Steuerung (versteckt, Panel-Ergebnis, Klammer-Steuertext). `phaseSolo`, `phaseMoment` und die Karten lesen Signalwörter nur aus Worten der Person; Steuertexte (`[CLOSE SESSION]`, `RECALL-RESULT`) wirken weiter |
| 12a · Eval-Kontext (P13) | Kontext als Handtext am Systemtext („ZIELE: AG1 … (gemeinsam, bestätigt)“). Die App baut ihn anders und spielt ihn als versteckte erste Nachricht ein | Szenarien tragen Daten unter `app`; `evals/app-kontext.js` baut daraus den Text mit `baueSoloKontext` / `baueMomentKontext` und stellt ihn versteckt vor den Verlauf (sync und Batch). 10 Szenarien je Sprache umgestellt |
| 12b · Vielfaltsmaß | keine Zählung | `evals/vielfalt.js`: Schlussform je Antwort (Erlebensfrage, Körperfrage, Doppelangebot, Einladung, andere Frage, keine Öffnung), Anteile, längste Serie. Im Ergebnis-JSON (`vielfalt.gesamt`, `vielfalt.jeFamilie`), in der Konsole, und über `scripts/vielfalt.js` auf jede vorhandene Ergebnisdatei |
| 12c · Familie INT | kein Szenario prüft die Wahl der Antwortart; MOM-01 C2 und SYC-05 C2 werteten die Erlebensfrage als Erfüllung | 19 Szenarien je Sprache (9 Lagen F1–F7, 3 für den gemeinsamen Raum, 4 für das Doppelangebot, 3 Langszenarien mit acht Zügen). MOM-01 v4, SYC-05 v5, SYC-06 v2. Zwei Judge-Fixtures (Doppelangebot ≠ Batterie; Ebenenwechsel) |

## Nebenbefunde aus der Umstellung

| Befund | Bedeutung |
|---|---|
| RCL-04: Der Handtext sagte dem Modell „CHRONIK (Zusammenfassungen — KEIN Wortlaut)“. Die App schreibt „EIGENE ZEITLEISTE (jüngste Einträge)“ und kennzeichnet nur Einträge MIT Wortlaut (`{vid:…}`) | Der Eval war hier freundlicher als der Betrieb. RCL-04 kann nach der Umstellung schlechter ausfallen — das wäre dann ein echter Befund am Kontext-Kopf, kein Rückschritt des Sprints |
| MRV-01-EN, MRV-03-EN: Der englische Handkontext trug noch „Reading accuracy (empathy signal)“ — seit S107 entfallen | Die englischen MRV-Läufe maßen bis heute einen Kontext, den es nicht mehr gibt |
| QZ-05: handgeschriebener „MOMENT-CONTEXT“ im festen Verlauf | nicht umgestellt (der Verlauf ist dort der Prüfgegenstand); vorgemerkt |
| Altläufe (PRV-7m, 4 Arme × 145 Antworten): Erlebensfrage am Schluss 8–10 %, Körperfrage 0–1 % | Der bisherige Katalog besteht aus Prüfsituationen (Wächter, Marken, Regeln), nicht aus Gesprächszügen. Die 62 % / 29 % stammen aus dem Blindvergleich. Die Basislinie für PRV-11 muss an INT und am Duktus-Set gemessen werden, nicht am Gesamtkatalog |

## Offen — braucht eine Entscheidung oder Material

| # | Punkt |
|---|---|
| 1 | **Nachrechnung 62 % / 29 %:** Die 72 Antworten des Blindvergleichs liegen nicht im Repo. Der Test baut die Lage nach (45 von 72, davon 21 Körper), kann die echten Antworten aber nicht zählen. Bitte `node scripts/vielfalt.js <reize.json>` auf die Reizdatei laufen lassen; weicht das Ergebnis deutlich ab, eiche ich die Muster nach |
| 2 | **Körperfrage nach „zum ersten Mal ausgesprochen“:** Lage F3 (Schutz) schließt sie aus; E3 (b) nennt „bedeutsame Momente, die vertieft werden wollen“ als Indikation. SYC-06 C4 prüft deshalb vorerst nur das Fragen**paar**, nicht die Körperfrage allein |
| 3 | **SYC-05 C2** hebt den Entscheid G2 vom 07.11. auf („Wie fühlt sich das für dich an?“ ist eine Passungsfrage). Das folgt aus Abschnitt 6.9 der Heuristik; bitte beim Lesen der Belege gegenprüfen, ob der Judge die neue Fassung trägt |

## Kommandos (lokal, mit `.env`)

```bash
# 0 · Judge-Selbsttest läuft vor jedem Lauf mit (jetzt 9 Fixtures, davon 2 neu)

# 1 · Neue Basislinie Familie INT, je Modell (mit Wächtern = ausgeliefertes System)
npm run eval -- --familie INT --sprache de --waechter --n 3
#    … je Pipeline-Modell wiederholen (Haiku, Sonnet, GLM) über --provider/--pipeline-modell

# 2 · Umgebaute Bestandsszenarien gegen ihren alten Stand
npm run eval -- --szenario MOM-01 --waechter --n 5
npm run eval -- --szenario SYC-05 --waechter --n 5
npm run eval -- --szenario SYC-06 --waechter --n 5

# 3 · Szenarien mit App-Kontext (neue Version) — Vergleich gegen den letzten Lauf
npm run eval -- --familie MRV --waechter
npm run eval -- --familie ERO --waechter
npm run eval -- --szenario RCL-04 --waechter
npm run eval -- --familie PROT --waechter
npm run eval -- --szenario MERK-01 --waechter

# 4 · Vielfaltsmaß auf vorhandene Dateien (kostenlos, ohne Schlüssel)
node scripts/vielfalt.js evals/ergebnisse/<lauf>.json --familie INT
node scripts/vielfalt.js <reize.json>              # Blindvergleich, siehe Offen 1
```

## Dateien

| Bereich | Dateien |
|---|---|
| Kern | `core/contracts/steuertoken.js` (`trenneNutzer`), `core/policies/phasen.js`, `core/engine/karten-waechter.js` |
| Eval | `evals/app-kontext.js` (neu), `evals/vielfalt.js` (neu), `evals/runner-kern.js`, `evals/runner-batch.js`, `evals/runner.js`, `evals/judge/golden.js`, `scripts/vielfalt.js` (neu) |
| Katalog | `evals/szenarien/start-katalog.js`, `.en.js` (71 Szenarien je Sprache) |

## Tests

| Datei | Inhalt | Zahl |
|---|---|---|
| `tests/unit/prv12a-messbasis.spec.js` (neu) | versteckter Kontext lädt kein Modul und keine Karte; Steuertexte wirken weiter; Prompt-Masse; App-Kontext in beiden Sprachen, als versteckte erste Nachricht, nicht beim Judge | 18 |
| `tests/unit/prv12b-vielfalt.spec.js` (neu) | 31 beschriftete Antworten DE/EN, Schluss-Regeln, Kennzahlen, Nachbau der Basislage | 42 |
| Bestand | `s110`, `s112`, `s129`, `s144a2`, `s146`, `s97`, `eval-ziel-kontext`, `eval-runner`, `judge-golden` auf den neuen Stand gezogen (je mit Begründung im Test) | — |

Suite: 323 Dateien, 3429 Tests grün. Build grün.

## Kleine Entscheidungen

| Frage | Entscheidung | Grund |
|---|---|---|
| EN-Zwillinge der Familie INT | mitgeschrieben | Die Paritätsprüfung (`stufe-d`) verlangt zu jedem DE-Szenario ein Gegenstück; geeicht wird an DE |
| Klammer-Steuertexte ohne `hidden` | zählen als Steuerung | Im Eval kommen Steuertexte als gewöhnliche Eingaben; so rechnen App und Eval gleich |
| Körperfrage im Vielfaltsmaß | zählt als Erlebensfrage mit | wie in der Basiszählung (45 ⊇ 21) |
| Zielwert „≥ 20 % ohne Frage“ | entfällt (E2) | stattdessen: Anteil Einladung und Anteil ohne jede Öffnung |
