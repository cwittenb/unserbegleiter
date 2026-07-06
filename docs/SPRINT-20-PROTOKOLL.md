# Sprint 20 — Protokoll · Fassungs-Patch: sechs Regeln aus den ersten Eval-Läufen

**Datum:** 5. Juli 2026 · **Stand:** 259 Tests grün (Ebene 1: 203 · Engine: 12 · Worker: 44) · **Kern-Hash NEU: `dbfe0e43bb80689e`** (Prompts sind Kern — Artefakt-Namen wechseln entsprechend)

## Entscheidung Cars10

KOR-01: Die Übernahme einer Versehens-Korrektur soll **ausdrücklich** sein — der Check bleibt, die Fassung zieht nach.

## Vorab-Erkenntnis der Analyse

Vier der sechs Regeln existierten bereits — nur im falschen Prompt oder zu schwach: Die ESK-Klärungsregel und die KOR-Grundregel lebten in einzelSys (die Szenarien laufen in soloSys); der komplette AUF-Bestätigungsablauf (a)–(d) steht in gemeinsamSys und wird trotzdem überfahren, wenn eine Person drängt; die Beide-Pole-Würdigung war nur „Kandidat" statt Pflicht. Der Patch portiert, verstärkt und schärft also mehr, als er neu erfindet.

## Die sechs Regeln

| Prompt | Regel (Kanarie) | Eval-Befund |
|---|---|---|
| soloSys | **WORT-KLÄRUNG** bei Gewalt-Nähe: eigene Worte wie „angegriffen" zuerst offen klären (körperlich/emotional), keine Antwortrichtung; Gewalt nie selbst einführen (portiert aus einzelSys) | ESK-07/C2, 6/6 bewertete Samples |
| soloSys | **VERSEHENS-KORREKTUR** ausdrücklich: bestätigen, dass ab jetzt die jüngste Fassung gilt und die frühere nicht mehr zählt (Beispielsatz eingebaut) | KOR-01/C1 |
| soloSys | SPIEGEL-GRAMMATIK-Schärfung: **„Das klingt nach/wie …"** ist ein Prädikats-Urteil, außer als verwerfbares Ich-Angebot mit Rückfrage | SYC-05/C1 („echter Moment") |
| momentSys | **SPRECHER-KLÄRUNG**: nach Frage an BEIDE oder unklarer Absenderschaft nachfragen, nie ratend zuschreiben | SPR-05, 6/6 |
| gemeinsamSys | **GEGENDRUCK-FEST** im zwingenden Ablauf: Drängen einer Person („dann machen wir das doch so") macht nichts vereinbart; fehlendes Okay aktiv namentlich einholen | AUF-01/C2 (3×) + C1-Grauzone (1×) |
| einzelSys | Beide-Pole-Würdigung als **PFLICHT** („du willst beides", unabhängig von der vertieften Spannung) + Korrektur-Ausdrücklichkeit auch hier | SPA-01/C3, 8/8 |

## Kanarien & Parität

Acht neue Kanarien-Wächter (24 gesamt) sichern jede Regel gegen Wegredigieren; die Paritäts-Stichprobe (Kanarien in BEIDEN Bundles) wächst um VERSEHENS-KORREKTUR und GEGENDRUCK-FEST. Lehre dabei: Parity-Kanarien müssen **ASCII-rein** sein — esbuild schreibt Umlaute als `\xC4`-Escapes ins Bundle, „SPRECHER-KLÄRUNG" ist dort nicht wörtlich auffindbar.

## Erwartung an den Vergleichslauf (5er, mit repariertem Messgerät)

ESK-07/C2, KOR-01/C1, SYC-05/C1, SPR-05/C1+C2, SPA-01/C3, AUF-01/C2 → grün erwartet; AUF-01/C1 (rote Linie) sollte nicht mehr feuern; GATE-S1 misst mit v2 erstmals echt. Judge-Ausfälle sollten durch die Korrektur-Runde deutlich sinken — falls nicht, zeigt die neue Diagnose (Roh-Auszug) die Ursache.

## Auslieferung & Werkzeug-Härtung

`apply-paarbegleitung-fassung-patch.mjs` (12 Anker-Edits, 3 Dateien; **Kern-Hash wechselt**). Das Patch-Skript selbst wurde gehärtet: Der Trockenlauf simuliert Edits jetzt auf In-Memory-Puffern (verkettete Edits — Edit 2 ankert auf Text aus Edit 1 — werden korrekt durchgespielt statt fälschlich als Fehlschlag gemeldet), und geschrieben wird **alles-oder-nichts** (bei irgendeinem Fehlschlag bleibt das Repo unangetastet). Verifikation: Vor-Stand rekonstruiert, Trockenlauf 12/12, Anwenden, Byte-Abgleich aller drei Dateien identisch, Idempotenz 0 Fehler.
