# Sprint 10–12 — Protokoll · UI-Tiefe: Auftragsklärung, Regal/Agenda, Prozessreflexion & Qualitätszeit

**Datum:** 2. Juli 2026 · **Endstand:** 208 Tests grün (Ebene 1: 167 · Ebene 1.5: 12 · Worker: 29)

## Sprint 10 — Auftragsklärungs-Panels (9 Tests)

- `core/ui/kernwetten.js`: einzelDef/gemeinsamDef; RANK_ITEMS (Gegensatzpaare als getrennte Pole), RANK_MODES (self 5 / pwichtig 3 / punzufrieden 1); **Ergebnisformate 1:1 aus v0.29** (REGLER-ERGEBNIS mit Spektrum-Zeilen bei Gegensatzpaaren und „hat keine Zahlen gesehen – qualitativ spiegeln", RANKING-ERGEBNIS, PARTNER-VERMUTUNG, STARTWERTE-ERGEBNIS) — sie sind Modell-Kontrakt, die Prompts referenzieren sie wörtlich.
- Vier Panels in app.js: **Regler** (13 Bereiche einzeln, Weiter erst nach Anfassen beider Regler — v0.29-untouched-Semantik), **Ranking** (Tipp-Stapeln statt Drag&Drop; „Antippen funktioniert auch" war schon v0.29-Zusage), **Startwerte** (verdeckt nacheinander, gleichzeitig aufgedeckt — Ein-Gerät-Annahme wie v0.29), **Freigabe** (Häkchen je Item → handover; Abwahl wirkt; tag-Fremdfelder queren nie — Vertrag 3 bis in die UI bewiesen; Session → released).
- Bstate um Feld `befund` erweitert (CLARIFICATION persistiert; Worker-Whitelist folgt automatisch aus Bstate.FIELDS).
- Marker-Vertrag komplett: [[REGLER]] · [[PARTNER-RANKING]] · [[PARTNER-UNZUFRIEDEN]] · [[RANKING]] (spezifisch vor generisch) · [[STARTWERTE]].

## Sprint 11 — Regal-Heben, Agenda, MOMENT-KONTEXT (6 Tests)

- `baueMomentKontext()`: die von momentSys erwartete app-interne erste Nachricht — Aufträge (ohne abgeschlossene), offene Agenda, letzte 3 frühere Momente (steuert die „offene Tür ab Termin 2"), Prozessreflexion, Zwischenzeit-Material aus Freigaben. Geht als **versteckte** User-Nachricht ans Modell, erscheint nie im Chat.
- Regal: **Gelesen ✓** und **In die Agenda heben** nur bei fremden Einträgen (die Absenderin sieht keine Knöpfe an den eigenen); Heben ist idempotent, Herkunft bleibt sichtbar. Agenda-Ansicht mit **„Haben wir selbst geklärt ✓"** (wird gewürdigt, nicht gewertet — momentSys-Linie).

## Sprint 12 — Prozessreflexion & Qualitätszeit-Leiter (8 Tests)

- `core/ui/prozess.js` — **Mess-Runden:** Beitrag je Person (Nähe, Zweitschätzung, Passung je aktivem gemeinsamen Auftrag), Runde offen → bereit (beide da) → aufgedeckt (nach MOMENT-BLOCK). `formatiereMessrunde` berechnet und TRENNT sauber: Erlebens-Differenz = Beziehungs-Befund, Lese-Genauigkeit = Empathie-Signal („kein Fehler, kein Mittelwert" steht im Kontext-Text selbst).
- **QZ-Leiter:** Stufen 1 sanft → 2 Gründe-Frage (≥4 Wochen) → 3 Terminhilfe → 4 Pausen-Angebot → Pause mit Wiedereinstiegs-Datum; Wahl setzt die Leiter zurück; **zweimal nicht aufgegriffen ⇒ Domäne ruhend** (bewusstes Nicht-Leben ist legitim). Fächer-Erzeugung als ephemere Engine-Session über qzSys — die Korrektur-Runde gibt es gratis (Test: kaputter 1er-Fächer → SYSTEM-KORREKTUR → gültiger Fächer). QUALITYTIME-BLOCK als 7. Blocktyp in der Registry.

## Ehrliche Grenze (neu notiert)

Die verdeckten Mess-Werte liegen im **geteilten** Bstate (die Aufdeckung braucht beide Beiträge in einem Kontext); „verdeckt" ist eine UI-Zusicherung, keine Speicher-Zusicherung — eine technisch versierte Person könnte die Werte des Partners über die API vor der Aufdeckung lesen. Serverseitiges Aufdeckungs-Gating (Worker liefert fremde Beiträge erst, wenn die Runde bereit UND ein gemeinsamer Moment aktiv ist) wäre die härtere Form → offener Punkt §10.
