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

## 7 · PRV-7b-Ergebnis und PRV-7c (08.11.2026)

`evals/ergebnisse/prv7/prv7b_alle.json`, Kern 9516efcd. ERO-01 bestätigt (Module 0, Gesamttext 12 bzw. 3). GATE-S1 C3 (Klärungsschleife) bleibt: Haiku Module 3/5, Gesamttext 2/5; Sonnet 3/3 gegen 1/3. Beide Läufe zusammen: Haiku 7/10 gegen 3/10, Sonnet 5/6 gegen 2/6 — die Erinnerung am Modul-Ende reicht nicht.

Ursache ist ein Regelkonflikt, kein Positionsproblem allein: Die Querung verlangt Situationsbezug („fehlt etwas, frag danach – oder setze ein und lege offen“), die Bitte-Regel verlangt sofort eine Fassung; das Modell fragt nach der Situation. Entscheidung Cars10: **7c — Konflikt auflösen.** In Schritt (1): Nach einer ausdrücklichen Bitte um einen Vorschlag kommt die Fassung jetzt, Fehlendes als sichtbare Lücke („[an welchem Abend?]“), die Frage darunter in derselben Nachricht. Die 7b-Zeile ist daran angeglichen. Wirkt auch im Gesamttext (dort ebenfalls Schleifen).

Paket `prv7c`: GATE-S1/S2/S3, ERO-01 (DE), Haiku und Sonnet je n=5.

## 8 · PRV-7c-Ergebnis und Entscheidung (08.11.2026) — zurückgestellt

`evals/ergebnisse/prv7/prv7c_alle.json`, Kern ff9e779d, je n=5.

| | Haiku Module | Haiku Gesamt | Sonnet Module | Sonnet Gesamt |
|---|---|---|---|---|
| GATE-S1 C3 (Schleife) | 3 | 3 | 2 | 2 |
| GATE-S1 C2 (Erfundenes in der Fassung) | 2 | 0 | 2 | 2 |
| GATE-S3 C2 (eigener Anteil erfunden) | **3** | 0 | **4** | 2 |
| GATE-S2 C2 | 4 | 2 | 1 | 3 |
| ERO-01 | 0 | 0 | 0 | 0 |

- Die Schleife ist mit Modulen jetzt gleich häufig wie im Gesamttext — aber 7c hat sie im Gesamttext nicht reduziert, und mit Modulen erfindet das Modell öfter Inhalte für Anna („ich bringe die Kinder alleine ins Bett“). „Fassung jetzt“ wird als „fülle auf“ gelesen, nicht als „lass eine Lücke“.
- ERO-01 lag diesmal auch im Gesamttext bei 0 (vorher 15/15 und 12/15 falsch) — bei gleichem Einstiegstext. Die Streuung zwischen Läufen ist groß; Einzelbefunde mit n=3–5 tragen weniger als gedacht.

**Entscheidung Cars10: PRV-7 zurückgestellt.** Nichts gemergt; der Branch `prv7-phasen-solo` (inkl. 7b/7c) bleibt als Stand. Zuerst werden die Gate-Szenarien GATE-S1–S3 als eigener Strang geklärt (Klärungsschleife, Herkunfts-Regel, Selbstanteil — in beiden Armen auffällig). Danach Wiederaufnahme, mit der Option „Teilen im Kern, nur Einstieg und Abruf als Module“.

## 9 · Wiederaufnahme nach der Gate-Entscheidung (08.11.2026)

Gate-Strang (`docs/AUFTAKT-GATE-STRANG.md`): offengelegte Ergänzungen sind erlaubt, auch beim Selbstanteil; liefern oder verschieben sind beide richtig. Branch `gate-v2` (Korpus-Satz Selbstanteil, GATE-S3 v2) und `main` (PRV-5/6, Werkzeug) in diesen Branch gemergt; Konflikte in `phasen.js`, Fassade und Paketen als Vereinigung aufgelöst, der Selbstanteil-Satz steht jetzt im Teil `solo/03-teilen.md`. Suite 3 279 grün, Kern `8028db30`.

Paket `prv7d`: GATE-S1/S2/S3, ERO-01, RCL-04, AUS-02 (DE), beide Modelle n=5 — Arm „aus“ ist zugleich die Gate-Basislinie im Gesamttext.

## 10 · PRV-7d-Ergebnis und Merge (09.11.2026)

`evals/ergebnisse/prv7/prv7d_alle.json`, Kern 8028db30, beide Modelle n=5. Summe: Haiku Module 23 / ganzer Text 25, Sonnet 19 / 16.

| | Haiku Module | Haiku ganz | Sonnet Module | Sonnet ganz |
|---|---|---|---|---|
| GATE-S1 C3 (Klärungsschleife) | 3 | 2 | **4** | 2 |
| GATE-S2 C2 | 2 | 5 | 1 | 0 |
| GATE-S3 C1 / C2 | 5 / 2 | 4 / 0 | 3 / 2 | 4 / 2 |
| ERO-01 (je C1–C3) | **1** | 3 | **1** | 2 |
| RCL-04, AUS-02 | 3 / 0 | 1 / 0 | 1 / 0 | 0 / 0 |

Wiederholte Muster über 7b–7d: Module → mehr Klärungsschleifen bei Sonnet in GATE-S1 (zusammen 9/13 gegen 5/13); Module → ERO-01 besser.

**Entscheidung Cars10: mergen.** Die Schleifen sind vertretbar — die Begleitung erklärt plausibel, was ihr fehlt („sonst erfinde ich Situationen, die vielleicht gar nicht stimmen“); stellt es sich im echten Gebrauch als Problem heraus, wird es dann gelöst. Gemergt mit 7b/7c (Bitte-Regel am Ende des Teilen-Moduls, Lücke statt Rückfrage) und dem Gate-Korpussatz (über `gate-v2`).
