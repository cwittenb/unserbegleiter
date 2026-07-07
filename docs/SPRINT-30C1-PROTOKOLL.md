# Sprint 30 · Stufe C1 — Protokoll: Korpus-Mechanik

**Datum:** 7. Juli 2026 · **Basis:** `origin/main` mit committeten Stufen A+B (Kern `df8a9a41e18f8b5e`, 318 Tests) · **Ergebnis:** 321 Tests grün, Kern `70f2517d5fdafb5a` · Direkt gegen den aktuellen Hauptstand verifiziert (Trockenlauf, Idempotenz, Byte-Abgleich, Tests, Build).

## Was C1 liefert

Stufe C ist zweigeteilt: **C1 = Mechanik** (dieser Patch), **C2 = englische Autorschaft** (eigenes Review-Paket). Nach C1 ist der englische Korpus reine Textarbeit — jede Leitung liegt.

1. **Korpus-Sprach-Singleton** in der Weiche (`prompts.js`): `setKorpusSprache()`, `getKorpusSprache()`, `K()`. Alle Korpus-Verbraucher lesen zur **Laufzeit** über `K()` — nie zur Importzeit; unbekannte Sprache fällt auf Deutsch.
2. **Sprach-Schnappschuss pro Session:** Neue Sessions starten in der Paarsprache (`info.locale`), gespeicherte behalten ihre Sprache (`chat.sprache`) — ein Resume bricht nie mitten im Gespräch um. Qualitätszeit (geteilt, ohne Chat-Objekt) folgt der Paarsprache.
3. **Session-Defs über `K()`:** solo/einzel/gemeinsam/aufdeck/moment/qz holen ihre Systemprompts zur Laufzeit; der Chat-Titel kommt aus `K().korpusTexte["titel.*"]`.
4. **Inhalte-Umzug:** `KAPITEL_TITEL` und `QZ_STUFEN_TEXT` leben jetzt in `prompts.de.js` (kernwetten/prozess re-exportieren kompatibel); neues `korpusTexte`-Bündel.
5. **Invarianten-Linie geschärft:** Die Struktur-Header der Kontexte/Ergebnisse (`AUFDECK-KONTEXT`, `ÜBERGABE-BLOCK`, `REGLER-/RANKING-/STARTWERTE-ERGEBNIS`, `AGENDA:` …) sind **Protokoll-Invarianten** wie die `[[…]]`-Marker — in allen Sprachen identisch, weil die Prompts sie wörtlich referenzieren. Nur erläuternde Texte sind Sprachfassung.
6. **Neuer Test `korpus-invarianten.spec.js`:** prüft für **jede registrierte** Sprachfassung Marker-/Block-Deckung mit der deutschen Referenz plus Struktur der Zusatz-Inhalte. `prompts.en.js` läuft ab Registrierung automatisch mit — das ist das Sicherheitsnetz für C2.

## Bewusste C1-Grenzen (→ C2)

Die erläuternden Texte der Ergebnis-/Kontext-Bauer (RANK-Titel/Beschreibungen, Klammer-Erläuterungen in `reglerErgebnis` & Co., Kontext-Beschriftungen in sessions/prozess) bleiben deutsch und werden **mit** der englischen Autorschaft parametrisiert — vor C2 existiert keine EN-Session, die sie bräuchte. Ebenso C2/C3: englischer Korpus (`prompts.en.js` inkl. `steuerTexte`, Sprachdisziplin-Invariante in beiden Fassungen) und der beidseitige Bestätigungs-Fluss für den Paarsprachen-Wechsel.

## Anwendung

`node patch-s30c1-korpus-mechanik.mjs [--dry-run]` im Repo-Wurzelverzeichnis (setzt die committeten Stufen A+B voraus; Guards prüfen das). Erwartung: `npm test` → 321 grün.
