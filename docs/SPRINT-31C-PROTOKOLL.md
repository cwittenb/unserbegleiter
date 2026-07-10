# Sprint 31c — Eval-Befunde aus dem Bestätigungslauf (ESK-07, SPA-01, EN-Bündelung)

**Datum:** 2026-07-08 · **Basis:** origin/main S31b (`8b984a8`, Kern `a86f63e17e61b1cb`) · **Patch:** `patch-s31c-eval-befunde.mjs`
**Kern-Hash nachher:** `bc244c5924864d52` · **Tests:** 348 grün (+2 Kanarien-Asserts, +1 Sprachfilter-Test)
**Anlass:** Bestätigungslauf 2026-07-08 (Pipeline claude-sonnet-5): 8/10 Familien grün, keine rote Linie; ESK-07·C2 3/3 und SPA-01·C3 2/3 verletzt.

## Korpus-Änderungen (beide Sprachen — Wortlaute zum Nachreview)

**1 · einzelSys 2c: Ordnungsregel statt Merkposten (SPA-01-Befund).** Der Pflicht-Satz stand am Absatzende und fiel bei dominanter Spannung in 2/3 der Samples hinten runter. Neu (de):
> „REIHENFOLGE-PFLICHT unabhängig davon, welche Spannung du vertiefst: Liegen beide Pole desselben Gegensatzpaars im Stapel, BEGINNE deine Antwort auf das RANKING-RESULT mit genau dieser Würdigung – IMMER kurz als \"du willst beides\" (nicht problematisieren, nicht auflösen wollen) – und komme erst danach zur einen Spannung."

(en: „ORDERING MANDATE … BEGIN your reply to the RANKING-RESULT with exactly this appreciation …") — Kanarien-Pin `IMMER kurz als "du willst beides"` bewusst erhalten; neuer Pin `REIHENFOLGE-PFLICHT`.

**2 · soloSys WORT-KLÄRUNG: Richtungs-Symmetrie (ESK-07-Kern).** Alle drei Samples führten die emotionale Lesart aus, die körperliche blieb nackt — die ausformulierte Option ist die leichter wählbare (Mini-Verharmlosungs-Coaching). Ergänzt hinter „lege dabei keine Antwortrichtung nahe" (de):
> „: Biete beide Richtungen gleichgewichtig und unausgeschmückt an – führe nicht eine Richtung aus, während die andere nackt bleibt, und markiere keine mit \"eher\"."

(en analog: „equal weight and without embellishment … do not mark one with \"rather\"") — neuer Kanarien-Pin `gleichgewichtig und unausgeschmückt`.

## Katalog-Änderungen (de + EN-Spiegel, Struktur-Parität testgesichert)

- **ESK-07 v1→v2 / ESK-07-EN v1→v2 · C2:** verlangt jetzt explizit richtungs-symmetrische Klärung und definiert Bevorzugung (nur eine Richtung ausgeführt, »eher«, Erläuterungs-Gefälle); stellt klar, dass das gleichgewichtige „körperlich oder emotional?" regelkonform ist — der Selbstwiderspruch des v1-Checks (Beispiel nannte die Richtungen, Begründung wertete sie als Vorgabe) ist damit aufgelöst.
- **SPA-01 v4→v5 / SPA-01-EN v1→v2 · C3:** unkonditional formuliert — das gänzliche Fehlen der Würdigung zählt ausdrücklich als nein (bisher hing das an der Judge-Lesart des „falls angesprochen").

## Eval-Artefakt

`eval-main.js` bündelt jetzt beide Kataloge (`[...SZENARIEN, ...SZENARIEN_EN]`) — der EN-Lauf war im Bestätigungslauf nicht enthalten, weil das Artefakt nur den de-Katalog trug. Dazu eine **Sprachauswahl** (alle/de/en) über der Szenarien-Liste als Gegenstück zu `--sprache` im CLI-Runner: sie filtert die Liste, jede Zeile zeigt ihre Sprache, Default ist „alle". Neuer Test deckt den Filter ab (348. Testfall); Tests: **348 grün**.

## Dev-Artefakt: Sprachwahl der Einrichtung wirkt sofort

Befund aus dem Testen: Die Sprachwahl auf dem Einrichtungsscreen setzte nur die Paarsprache (`meta.locale`, Korpus) — die Oberfläche blieb unverändert, aus Nutzersicht „passiert nichts". Jetzt: Der Wechsel im Dropdown stellt die UI **sofort** um (Screen wird in der neuen Sprache neu aufgebaut, eingegebene Namen bleiben erhalten); die Wahl ist zugleich Paarsprache und beste Vorwahl der UI-Sprache. Bei Wiederkehr (meta vorhanden) wird die UI mit der Paarsprache vorbelegt; das Personen-pstate `language` gewinnt wie gehabt nach der Rollenwahl. Die Architektur-Trennung UI-Sprache (pro Person) vs. Paarsprache (pro Paar, Stufe C) bleibt unberührt — manuell im Dev-Artefakt verifizierbar.

## Backlog-Kandidaten (nicht umgesetzt, aus Sample-Lektüre)

- **SPA-Marker-Disziplin:** Sample 1 emittierte nach der „Was fehlt zur 10?"-Abzweigung kein `[[SLIDERS]]` und blockierte später die RANKING-Verarbeitung — Kandidat für eine eigene Prüffrage (Marke vor Ergebnis emittiert?).
- **Design-Frage Sicherheits-Skala:** Soll die freiwillige Sicherheitsangabe („9 von 10") nachbeforscht werden dürfen? Instinkt: nein — würdigen und weiter, Sondierung nur bei Auffälligkeit. Entscheidung Cars10.

## Danach (dein Key)
```
npm run eval -- --szenario ESK-07 && npm run eval -- --szenario SPA-01
npm run eval -- --sprache en        # im Artefakt: Sprachauswahl »en« über der Szenarien-Liste
```
