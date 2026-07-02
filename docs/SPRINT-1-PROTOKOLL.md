# Sprint 1 — Protokoll · Verträge als reine Funktionen

**Datum:** 2. Juli 2026 · **Stand:** 64 Tests grün (57 neu) · Laufzeit gesamt 10,8 s

## Gebaut

| Datei | Inhalt |
|---|---|
| `core/contracts/marker.js` | Vertrag 1: `findeMarker` (Letzte-Zeile-Regel), `letzteZeile`, `pruefeMarkerOrder` (Spezifisch-vor-generisch-Wächter) |
| `core/contracts/block.js` | Vertrag 2: `blockDef`, `parseBlock` (zaun-tolerant), `findeBlock`, `cleanDisplay` (jetzt reine Funktion statt globaler Registry), `korrekturNachricht` |
| `core/contracts/schemas.js` | Alle sieben Schemas treu portiert: zeit, moment, auftragBlock, gateArt, gate (Abschluss), befund, qz — inkl. der Original-Fehlertexte (Vertragsbestandteil: sie gehen in der SYSTEM-KORREKTUR ans Modell) |
| `core/contracts/uebergabe.js` | Vertrag 3: `uebergabeSchema`, `baueUebergabe`, `uebergabeTeilKey` |
| `core/contracts/registry.js` | Kanonische Registry der sechs Blocktypen (deklarativ, Handler folgen in S3/S6) |

## Entscheidungen mit Testfall-Dokumentation

1. **Verschärfung Marker-Erkennung (Spez schlägt v0.29):** v0.29 feuerte Marker per `includes()` irgendwo in der Nachricht — Toleranz-Krücke für ältere Modelle. Der Neubau implementiert die Letzte-Zeile-Regel aus Vertrag 1. Testfall „VERSCHÄRFUNG ggü. v0.29: Marker mitten im Text feuert NICHT" dokumentiert das; Satzzeichen-Toleranz innerhalb der letzten Zeile bleibt, daher bleibt auch Spezifisch-vor-generisch tragend.
2. **Beibehaltene Toleranz (Ballast-Regel §1.4):** Markdown-Zaun-Entfernung um Block-JSON bleibt — billig, schadlos, auch aktuelle Modelle zäunen gelegentlich. Der dokumentierende Test trägt die Begründung im Namen. Bewusste Grenze daneben: KEINE Reparatur kaputten JSONs (einquotierte Keys, trailing commas) — dafür ist die Korrektur-Runde da; auch das hat einen Testfall.
3. **Geheimnis-Architektur im Konstruktor:** `baueUebergabe` übernimmt aus Items ausschließlich `id` und `text` — Fremdfelder (z. B. Rohformen) können nicht als Beifang queren. Testfall: „keine Fremdfelder queren mit".
4. **Neuer Wächter `pruefeMarkerOrder`:** Die Regel „spezifisch vor generisch" war in v0.29 nur ein Kommentar; jetzt ist sie eine prüfbare Funktion, die in S3 beim Registrieren jeder SessionDef läuft.

## Portierte v0.29-Selbsttest-Fälle

AUF-01 (Befund ohne beidseitige Bestätigung), zeitSchema gültig/ungültig, gateArt I10 + gültig, auftragBlock beide-Okays/Owner-Okay/gültig-neu, momentSchema inkl. zwischenzeitImpuls, qz-Resonanz-Pflicht, parseBlock zaun-tolerant + kaputtes JSON, Fünf-Blocktypen-Registry (auf sechs vervollständigt: ABSCHLUSS, BEFUND, ZEITLEISTE, GATE, MOMENT, AUFTRAG).

## Testinventar neu

`marker.spec.js` (10) · `block.spec.js` (13) · `schemas.spec.js` (24) · `uebergabe.spec.js` (10)

## Nächster Schritt

Sprint 2 — Store-Abstraktion (MemoryStore/ArtifactStore/KVStore-Stub), Repo als einzige Key-Instanz, Bstate (single-flight, Migration-ohne-Schreiben), Pstate (single-writer); inkl. Grep-Wächter „Key-Literale nur in repo.js".
