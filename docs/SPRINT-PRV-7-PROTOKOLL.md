# Sprintprotokoll · PRV-7 — Reflexionsgespräch in Modulen (Plan + Umsetzung)

**Datum:** 08.11.2026 · **Branch:** `prv7-phasen-solo` (von `main` nach PRV-5) · Entscheidungen Cars10: PRV-7 vor PRV-6; Fenster-Wächter später als eigener Schritt; Fokus DE.

## 1 · Schnitt

`sessions/solo.md` → `sessions/solo/{00-kern-a, 01-einstieg, 02-kern-b, 03-teilen, 04-abruf, 05-kern-c}.md` (DE/EN). Eine Umstellung im Text: Der erste Satz der Zeile „ABRUF GESCHIEHT, OHNE ANKÜNDIGUNG …“ gehört zum Abruf, der Rest derselben Zeile (Regeln des EXCERPT-BLOCKS) zum Teilen; der Abruf-Satz steht jetzt vor „WORTLAUT-ABRUF“ statt davor in der Excerpt-Zeile (Golden solo DE/EN neu).

| Modul | aktiv, wenn | Zeichen (DE) |
|---|---|---|
| Kern (Rolle, Haltung, Widerspruch, Not, Ko-Regulation, Ambivalenz, Zeitleisten-Pflege/Abschluss, Themenrahmen) | immer | ≈ 22 500 |
| Einstieg (kalt / Wiederkehr) | vor der ersten Antwort | 2 716 |
| Teilen (Sicherheits-Weiche, Querung, Kriterien, Wege, Zusage unterwegs, drei Türen, Ausschnitt, EXCERPT/GATE) | Teilen-Signal irgendwann in der Sitzung (klebt), `[CLOSE SESSION …]`/`[CHECKPOINT]` oder End-Signal in der letzten Nachricht | 12 924 |
| Abruf (Wortlaut-Abruf, RECALL) | Abruf-Signal in den letzten 3 Nachrichten, RECALL-RESULT oder eigener RECALL-BLOCK | 3 571 |

Signale (`signale.js`, DE = EN) sind mit Absicht großzügig: Ein Fehltreffer kostet Token, ein verpasster Treffer die Regeln. Das Teilen-Signal erkennt auch „Ich will ihm das endlich sagen“, „wenn er das liest“ und die Angst vor der Reaktion des Partners (die Sicherheits-Weiche liegt im Teilen-Modul).

## 2 · Größe je Zug (DE, Token ≈ Zeichen/3,4)

| gesamt vorher | Mitte ohne Anlass | erster Zug | mit Abruf | mit Teilen/Abschluss |
|---|---|---|---|---|
| 11 888 | 6 630 (−44 %) | 7 348 (−38 %) | 7 480 (−37 %) | 10 319 (−13 %) |

Der Kern liegt über der Cache-Mindestlänge und wird allein gecacht; das Modul bekommt einen eigenen Breakpoint.

## 3 · Mechanik

Wie PRV-5: `PHASEN.solo` in `core/policies/phasen.js` (`phaseSolo`, `bloeckeSolo`), Katalog `solo.phasen`, Def `sysTeile` (inkl. Themenrahmen im Kern). Die Phasen-Funktionen bekommen jetzt den Korpus der aktiven Sprache (`k`) statt nur der Steuertexte. Signale reisen als `waechter.phasen`.

## 4 · Tests

Neu `prv7-phasen-solo.spec.js` (34): Signale (Treffer/Alltag), Phase (Einstieg, klebendes Teilen, Abruf-Fenster), Teile = Gesamttext, Mitte = ein Block, **Sperrklinke Mitte ≤ 7 000 Token und ≥ 40 % kleiner**, GATE/EXCERPT nur mit Teilen, TIMELINE immer, Engine. Angepasst: Test-Fakes lesen den Systemtext als String oder Blöcke; Fassade +`reflexionsTeile`. Suite 3 262 grün, Kern `b9f64943`.

## 5 · Eval (bei dir)

Paket `prv7` (nur DE): RCL-01/02/02b/03/04, AUS-02/03/05/06, GATE-S1/S2/S3, ERO-01/02, MERK-01, DOS-S1, KRIS-01, SYC-05 — Haiku n=5, Sonnet n=3, Phasen vs. aus. Merge, wenn Phasen in DE nicht schlechter.
