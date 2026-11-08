# Sprintprotokoll · PRV-6 — Gemeinsame Auflösung in Phasen (Plan + Umsetzung)

**Datum:** 08.11.2026 · **Branch:** `prv6-phasen-gemeinsam` (von `main` nach PRV-5; PRV-7 zurückgestellt) · Fokus DE · Lehren aus 5b/7b/7c: Was nach einer Grenze noch gilt, nicht abschneiden; Läufe streuen, deshalb beide Modelle n=5.

## 1 · Schnitt

`sessions/gemeinsam.md` → `sessions/gemeinsam/{00-kern-a, 01-auftakt, 02-ablauf, 03-befund, 04-wiedereinstieg, 05-kern-b, 06-start}.md` (DE/EN), verkettet byte-gleich zum Gesamttext (Golden unverändert).

| Teil | im Systemtext, wenn | Zeichen (DE) |
|---|---|---|
| Kern (Protokoll, Rolle, Haltung, Regeln, Abschieds-Einladung, Krisen-Vorrang) | immer | ≈ 18 900 |
| Ablauf Phase 0–6 | immer (zwischen 0 und 6 keine sicher erkennbaren Grenzen) | ≈ 7 300 |
| Auftakt / Aufdeckung | „AUFDECKUNG STEHT AUS“ liegt vor und noch kein REVEAL-BLOCK | ≈ 3 800 |
| Befund (Phase 7, CLARIFICATION-BLOCK) | nach `[[SCALE-CLOSING]]` — der Ablauf bleibt dabei, weil Phase 6 regelt, wie mit dem Ergebnis umzugehen ist | ≈ 1 600 |
| Wiedereinstieg | letzte Nachricht ist der Rückkehr-Steuertext | ≈ 2 500 |
| Start („Beginne mit …“) | vor der ersten Antwort | 81 |

## 2 · Größe je Zug (DE, Token)

| gesamt vorher | Mitte | erster Zug | Auftakt | Wiedereinstieg |
|---|---|---|---|---|
| 9 812 | 7 522 (−23 %) | 7 545 (−23 %) | 8 706 (−11 %) | 8 152 (−17 %) |

Kern ≈ 5 570 Token (über der Cache-Mindestlänge).

## 3 · Mechanik und Tests

`PHASEN.gemeinsam` (`phaseGemeinsam`, `bloeckeGemeinsam`), Katalog `gemeinsam.phasen`, Def `sysTeile`. Die Phasen-Funktionen bekommen den Korpus der aktiven Sprache (`k`). Neu `prv6-phasen-gemeinsam.spec.js` (19), Szenario GEM-07 (+EN, Befund nach SCALE-RESULT). Test-Fakes lesen Systemtext als String oder Blöcke; Fassade +`aufloesungsTeile`. Suite 3 245 grün, Kern `a6ad86c8`.

## 4 · Eval (bei dir)

Paket `prv6` (DE): AUFD-01, AUF-01, MOM-01, NOT-01, KRIS-02, WDR-01, ANT-01, GEM-07 — Haiku und Sonnet je n=5, Phasen vs. aus. Merge, wenn Phasen nicht schlechter, und zwar als wiederholtes Muster, nicht als Einzelzelle.
