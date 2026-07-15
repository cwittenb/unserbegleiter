# Sprint S64 — Generischer Wiedereinstieg & Einladungs-Menüs

**Basis:** `origin/main` @ `8ed1098` **+ ungemergter Vorgänger `patch-s63-aufloesung-fortsetzen.mjs`** — Reihenfolge zwingend: erst s63 anwenden, dann s64. · **Kern-Hash nach Build (s63+s64):** `6544826bddcd060d`
**Quelle:** Finding vom Wiederbetreten der pausierten Gemeinsamen Auflösung: keine Wiederkehr-Begrüßung, der Klient muss selbst „anschieben", das Modell spricht über die letzte Session als „heute". Dazu die Anforderung: Wiedereinstieg **generell** statt je Raum, plus kleine **ablehnbare Einladungs-Menüs** (2–3 Optionen) beim Ankommen und beim Abschied.
**Patch:** `patch-s64-wiedereinstieg-einladungen.mjs`

## Änderungen

**Generischer Wiedereinstieg (`core/ui/kernwetten.js`, `core/ui/app.js`).** Neues SessionDef-Feld `wiedereinstieg` (Name eines steuerTexte-Schlüssels). `startChat` behandelt es einheitlich: laufende Session + Nachrichten + freier letzter Zug (kein offener Marker/Block) → versteckter Steuertext ans Modell. Der bisherige Sonderfall `einzelWiedereinstieg` ist durch den generischen Pfad ersetzt; `einzelDef` deklariert `"einzelWeiter"` (S53-Verhalten byte-gleich erhalten), `gemeinsamDef` neu `"gemeinsamWeiter"`. Der einzel-spezifische Nachklang-Pfad (`einzelRueckkehr`, nach Freigabe) bleibt bewusst eigenständig — er ist ein anderes Konzept (Rückkehr nach Abschluss, nicht in eine laufende Session). Qualitätszeit deklariert (noch) nichts: ihr Ankommen lebt bereits als CHOICE-Dramaturgie in Akt 1; eine Anbindung ist über dasselbe Feld jederzeit möglich.

**Steuertext (`prompts.de.js`/`en.js`).** `steuerTexte.gemeinsamWeiter`: „[Rückkehr in die laufende Gemeinsame Auflösung: Wir betreten den Raum erneut; die Session war pausiert. Eröffne den WIEDEREINSTIEG.]" (EN-Parität; korpus-invarianten decken die Schlüsselgleichheit).

**Prompt Gemeinsame Auflösung — WIEDEREINSTIEG-Sektion (de+en).** Wiederkehr-Begrüßung beider; Zeitregel gegen die „heute"-Verwirrung (über Früheres NIE „heute"/„eben" — „beim letzten Mal", „als wir pausiert haben"); ein Satz Standort; dann **ANKOMMENS-EINLADUNG** als ablehnbarer CHOICE-BLOCK (`id:"arrive"`, 2–3 vom Modell für dieses Paar erfundene Ankommens-Momente, höchstens eine Option mit körperlicher Nähe, abgestuft); danach NAHTLOS an der aktuellen Phase weiter, nichts neu starten, nichts wiederholen; Korrekturen werden aufgenommen.

**Prompt — ABSCHIEDS-EINLADUNG (de+en).** Bei jeder Vertagung (Pausenmarke oder erkennbares Schließen für heute): erst warme Landung, dann ablehnbarer CHOICE-BLOCK (`id:"farewell"`, 2–3 leichte Ideen für etwas Schönes zu zweit heute, gern aus dem Gespräch gespeist — genau das Muster, das im Testrun manuell erfragt wurde); keine Aufgabe, nichts wird beim nächsten Mal geprüft. Die PAUSENMARKE verweist jetzt auf diese Regel statt eigener Landeanweisung.

**Choice-Mechanik in der Auflösung (`kernwetten.js`, Korpustexte).** `gemeinsamDef` registriert den CHOICE-Block (Handler → `hooks.onChoice`, dieselbe Mechanik wie QZ); die App-Invariante „gleichwertige Ohne-Option" greift über neue Korpustexte `choice.arrive.ohne`/`choice.farewell.ohne` (+ Titel-Fallbacks), de+en.

## Tests

**Neu:** `tests/unit/s64-wiedereinstieg-einladungen.spec.js` — 11 Tests: Def-Deklarationen + Steuertext-Parität; versteckter Steuertext beim Wiederbetreten (unsichtbar im Verlauf); kein Steuertext beim Erstbetreten; kein Steuertext bei unfreiem letztem Zug (offener CHOICE-Block wird stattdessen wieder geöffnet); S53-Regression der Auftragsklärung über den generischen Pfad; arrive-Menü mit Ohne-Option und CHOICE-RESULT-Draht; farewell-Menü mit eigener Ohne-Option; Korpustext-Parität; drei Prompt-Kanarien (WIEDEREINSTIEG + Zeitregel, arrive, farewell + Pausenmarken-Verweis).
**Semantisch treu angepasst:** `onboarding-aufdeck.spec.js` — der Aufdeck-Block wird per Marke (`start === "REVEAL-BLOCK"`) statt per Index gefunden (der Choice-Block steht nun davor).

## Verifikation

- Voller Testlauf (s63+s64) **grün**: 592 Strukturtests + 20 Engine/Mock + 87 Worker = **699 Tests**.
- `npm run build` grün, Kern-Hash `6544826bddcd060d`.
- Patch-Kette auf frischem Klon verifiziert: s63 (dry-run → apply) → s64 (dry-run → apply → Idempotenzlauf) → Byte-Vergleich → Tests → Build. Der s64-Patch meldet MISMATCH, wenn s63 fehlt.
