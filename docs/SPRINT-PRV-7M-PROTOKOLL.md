# Sprintprotokoll · PRV-7m — Qualitätszeit in Modulen (Plan + Umsetzung)

**Datum:** 09.11.2026 · **Branch:** `prv7m-phasen-moment` (von `main` nach PRV-7) · Entscheidung Cars10: der weitere Schnitt (−26 %), Aufdeckung als Modul.

## 1 · Schnitt

`sessions/moment.md` → `sessions/moment/{00-kern-a, 01-ankommen, 02-aufdeckung, 03-kern-b, 04-abschluss}.md` (DE/EN). Eine Umstellung: Die Zeile mit den Ankommens-Regeln endete mitten im Satzfluss mit „Dann die Aufdeckung der Prozessreflexion …“ — dieser Teil beginnt jetzt eine eigene Zeile (Golden moment DE/EN neu).

| Modul | aktiv, wenn | Zeichen (DE) |
|---|---|---|
| Kern (Rolle, Leitprinzipien, Dramaturgie-Kopf, Akt 2/3, Moderation, Eskalation, Sicherheit, Auftrags-Pflege mit GOAL-BLOCK, Themenrahmen) | immer | ≈ 24 000 |
| Ankommen (Akt 1, CHOICE connect, offene Tür) | bis zur Ankommens-Wahl und in der Nachricht direkt danach | 1 746 |
| Aufdeckung (Prozessreflexion, zwei Schritte, Passung/Wirksamkeit, Nachholen, Trajektorie) | solange `[[META-REVEALED]]` fehlt (inkl. Nachholen) und bis 3 Nachrichten der Person nach der Marke | 4 427 |
| Abschluss (Weiche, zwei Schritte, MOMENT-BLOCK) | ab `[CLOSE MOMENT …]` oder End-Signal; klebt | 2 201 |

End-Signal erweitert (DE = EN, auch fürs Reflexionsgespräch): `[close moment`, „Punkt machen“, „danke dir/euch“, „das war schön/gut“, „thank you“, „that was nice/lovely/good“.

## 2 · Größe je Zug (DE, Token; vorher 10 217)

| Start / vor der Marke | kurz nach der Marke | Mitte | Abschluss |
|---|---|---|---|
| 8 785 (−14 %) | 8 299 (−19 %) | 7 056 (−31 %) | 8 489 (−17 %) |

## 3 · Mechanik und Tests

`PHASEN.moment` (`phaseMoment`, `bloeckeMoment`, `NACH_AUFDECKUNG = 3`), Katalog `moment.phasen`, Def `sysTeile` (Themenrahmen im Kern). Damit haben **alle vier Arten** Phasen-Komposition. Neu `prv7m-phasen-moment.spec.js` (8), Szenario **QZ-05** (+EN): mitten in der Qualitätszeit (Ankommen und Aufdeckung im Verlauf zurück) — Schiedsrichter-Verweigerung aus dem Kern und Abschluss nach „Danke euch, das war schön“. Drei Tests verglichen Systemtexte mit `toBe` (String) — jetzt String oder Blöcke. Suite 3 290 grün, Kern `3f79edb1`.

Hinweis: Die übrigen Qualitätszeit-Szenarien spielen am Anfang (Ankommen und Aufdeckung aktiv); den mittleren Zustand ohne diese Module prüft nur QZ-05.

## 4 · Eval (bei dir)

Paket `prv7m` (DE): PROT-01/02, SPR-05, QZ-01, QZ-05, MRV-01/02/03 — beide Modelle n=5, Phasen vs. aus.

## 5 · Eval-Ergebnis und Merge (10.11.2026)

`evals/ergebnisse/prv7m/prv7m_alle.json`, Kern 3f79edb1, beide Modelle n=5. Summe Verstöße: Haiku Module 2 / ganzer Text 1, Sonnet 1 / 0. PROT-01/02, SPR-05, MRV-01/02, QZ-05 in allen Armen 0; QZ-01 C2 Haiku Module 2/5 (Einzelzelle), MRV-03 C1 je einmal verstreut. Kein App-Hinweis-/Karten-Echo.

„Roher Block-Kopf“ (CHOICE-BLOCK des Ankommens im sichtbaren Text) in fast allen Samples beider Arme (Module 70/70, ganzer Text 61/70) — bekannt seit PRV-3/PRV-6, unabhängig von PRV; eigener Strang (Runner bzw. Block-Ausgabe im ersten Zug). QZ-05 (Mitte, ohne Ankommen) ohne Echo.

**Gemergt.** Damit laufen alle vier Arten mit Phasen-Komposition.
