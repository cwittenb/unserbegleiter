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

## 6 · Eval-Ergebnis (08.11.2026) — nicht gemergt, Nachmessung PRV-7b

`evals/ergebnisse/prv7/prv7_alle.json`, Kern b9f64943. Summe Verstöße: Haiku Phasen 23 / aus 31, Sonnet 12 / 20.

| Auffällig | Haiku Phasen | Haiku aus | Sonnet Phasen | Sonnet aus |
|---|---|---|---|---|
| ERO-01 (kalter Start) | 0 | **15** (5/5 je C1–C3) | 0 | **9** |
| GATE-S1 C3 (Klärungsschleife statt Fassung) + C1 als Folge | **4 + 4** | 1 + 1 | **2 + 2** | 1 + 1 |
| RCL-04 | 2 (C2) | 0 | 1 (C1) | 0 |
| GATE-S2 C2, GATE-S3 C1 | 4 / 5 | 4 / 5 | 3 / 3 | 2 / 3 |

**Befund 1 — ERO-01 ist ein bestehender Fehler im Gesamttext:** Ohne COMPANION-CONTEXT eröffnet das Modell mit der Wiederkehr-Form („Zur Erinnerung …“, „Wollen wir an die letzte Reflexion anknüpfen?“) — in 15/15 bzw. 9/9 Samples. Mit Modulen steht der Einstieg am Ende des Systemtexts (Rezenz) und wird richtig gewählt: 0. Das betrifft heute jede erste Reflexion in der App.

**Befund 2 — Klärungsschleife:** Mit Modulen steht die Querung („fehlt etwas, frag danach“) hinter dem Kern und überwiegt die Regel AUSDRÜCKLICHE BITTE UM VORSCHLAG. Nach S136 nicht gemergt; **PRV-7b**: dieselbe Regel kurz noch einmal am Ende des Teilen-Moduls.

**Befund 3 — unabhängig von PRV:** GATE-S2 C2 und GATE-S3 C1 verletzen in beiden Armen gleich häufig — Korpus- oder Szenariothema, eigener Strang.

Paket `prv7b`: GATE-S1/S2/S3, RCL-04, AUS-02/03, ERO-01, SYC-05 (DE).
