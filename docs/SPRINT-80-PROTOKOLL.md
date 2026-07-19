# Sprint 80 · Protokoll — Agenda-Workflow v3, Lesezeichen, ein Gefäß „Qualitätszeit", Abschluss-Fixes

Basis: `origin/main @ 03744c8` (patch-s79-stream-extraktor).
Auslieferung: `patch-s80-agenda-lesezeichen-abschluss.mjs` (Ganzdatei-Ersetzung,
SHA-256-Ankerprüfung, `--dry-run`, idempotent).

## Entscheidungen (mit Cars10 abgestimmt)

1. **Ein Begriff nutzerseitig: „Qualitätszeit".** Die wiederkehrende gemeinsame
   Session (intern `art: "moment"`, unangetastet bis Wire-Anglisierung S31) heißt
   überall Qualitätszeit; „Gemeinsame Session" verschwindet aus UI und Wegweiser
   (`titel.moment`, `weg.messBereit`). Damit ist die seit S31-Zeiten zurückgestellte
   Umbenennungsfrage entschieden. Begriffslandkarte: Gemeinsamer Raum (Ort) ·
   Qualitätszeit (Session) · Gemeinsame Auflösung (einmalig) · Gemeinsame Momente
   (Rückblick).
2. **Ein Gefäß, zwei Modi.** Themenarbeit und gestaltete gemeinsame Zeit sind
   Modi DERSELBEN Session — keine Kategorie-Wahl vorab; die Begleitung klärt die
   Richtung beiläufig (neuer Prompt-Abschnitt „ZWEI MODI, EIN GEFÄSS", de/en).
3. **Aus dem Regal wird nie direkt ein Ziel.** Zwei Übernahme-Wege: „In der
   Qualitätszeit besprechen" (Punkt mit Vormerkung) und „Als Ziel vorschlagen"
   (Punkt mit Kandidat-Marke). Ziele entstehen und wechseln ihren Zustand
   ausschließlich per gemeinsamem Beschluss in Sessions (AUFTRAG-BLOCK).
4. **Eine Vormerkung.** Offene Gesprächspunkte: „In der Qualitätszeit besprechen"
   (setzt `vormerkung: true`, Punkt bleibt offen) neben „Haben wir selbst
   geklärt ✓". Ein Kontext-Marker statt eines gemeinsam/qz-Splits.
5. **„Session abschließen" vs. „Raum verlassen" als Paar-Semantik:** „Raum
   verlassen" überall (pausiert); „Session abschließen" in den Sessions MIT
   eigenem Abschluss-Akt — Qualitätszeit (MOMENT-BLOCK) und NEU Reflexionsgespräch
   ([CLOSE SESSION] → TIMELINE-BLOCK, bislang unverdrahtet). Auftragsklärung und
   Gemeinsame Auflösung schließen weiterhin über ihre eigenen Rituale (Freigabe
   bzw. Befund) — ein zweiter Abschlussweg wäre dort widersprüchlich.

## Umsetzung

**Wegweiser (i18n de/en + app.js):** `weg.startSolo` („auch erstmal …") gilt vor
der Aufdeckung; ab `aufdeckGelaufen` greift `weg.startSoloJederzeit`
(„jederzeit …"). `weg.agendaOffen` nennt jetzt die Handlungsrichtung (vormerken
oder selbst abräumen).

**Lesezeichen statt Badges:** Begriff im Code ersetzt (`lesezeichenLabels`,
`.pb-lz`, `#lzRegal`; `badge*` restlos entfernt). Kein Lesezeichen mehr am
Knopf „Gemeinsamer Raum". Optik: Bändchen mit Kerbe (CSS `clip-path`), oben
rechts aus dem Regal-Knopf ragend (`.pb-mit-lz` + absolute Leiste), NUR der
unterscheidende Anfangsbuchstabe, kein Zähler; je Partner mit Ungelesenem ein
Lesezeichen. `ev-badge` im Eval-Runner ist ein anderes Konzept („rote Linie")
und bleibt unberührt.

**Regal:** `regal.btnHeben` entfällt; zwei Buttons (`data-heben`/`data-ziel`).
`hebeInAgenda(backend, id, { alsZiel })`: „besprechen" erzeugt den Punkt gleich
MIT Vormerkung, „als Ziel" mit `zielKandidat: true`; Regal-Status unterscheidet
beide („in der Agenda" / „als Ziel vorgeschlagen"). Idempotenz über `gehoben`.

**Agenda:** Neue Gruppenblöcke `.pb-ag-ziele` („Entwicklungsthemen / Ziele",
Akzentleiste, Backlog als ruhende Untergruppe darin) und `.pb-ag-punkte`
(„Gesprächspunkte"). Offene Punkte tragen Etiketten (`Ziel-Kandidat`,
`vorgemerkt für die Qualitätszeit`) und die zwei Handlungs-Buttons; neue
Funktion `merkeVor` (nur offene Punkte).

**Kontext-Verdrahtung:** `baueMomentKontext` hängt `mk.agendaKandidat` /
`mk.agendaVorgemerkt` an offene Punkte (Kandidat-Marker instruiert die
Ratifizierung zu zweit). `baueQzMaterial` erhält `agenda` und führt vorgemerkte
offene Punkte auf (`qm.vorgemerkt`) — bewusst explizit verdrahtet, da die
Qualitätszeit-Menümechanik eigene Leitprinzipien hat (kein stilles Erben).

## Bugfixes (Abschluss-Kette der Qualitätszeit)

Symptomatik (Testphase): Abschlussfrage wurde nicht abgewartet; Protokoll sofort
„gespeichert"; Composer blieb, Tippen erzeugte Fehler; nach Verlassen blieb
„Qualitätszeit fortsetzen", Raum unverändert, kein Neustart möglich.

- **Wurzel (Engine):** `_afterAssistant` speicherte VOR dem Block-Handler und
  wartete ihn nicht ab — der vom MOMENT-Handler gesetzte Status `finished` wurde
  nie persistiert; `resume()` dispatchte den Block beim Wiederbetreten erneut
  (Doppel-Protokoll). Fix: Handler `await`en, danach zweites `_save()` (beide
  Pfade, mit/ohne Schema); das Save vor dem Handler bleibt (blockFix-Semantik).
- **Prompt (de/en):** ABSCHLUSS jetzt ZWEISTUFIG — Schritt 1: nur die
  Prozess-Schau-Frage, WARTEN, KEIN Block; Schritt 2: erst nach der Antwort
  Landung + MOMENT-BLOCK (bzw. direkt, wenn die Abschieds-Nachricht die Antwort
  schon enthält).
- **UI:** `onMomentEnde`/`onZeitleiste` und der Abschluss-Knopf ziehen Composer
  und Knopf sichtbar nach (`aktualisiereComposer`). Frischstart-Regel gilt jetzt
  für `moment` UND `solo`.
- **Heilung:** Eine als „running" hängende Qualitätszeit, deren letzte
  Assistant-Nachricht einen MOMENT-BLOCK enthält (Altbestand aus der Testphase),
  wird beim Betreten auf `finished` geheilt und startet frisch — ohne erneuten
  Block-Dispatch.
- **Solo-Abschluss:** Knopf „Session abschließen" auch im Reflexionsgespräch;
  sendet den bereits im Prompt verankerten Steuertext `[CLOSE SESSION]`
  (neu als `steuerTexte.soloAbschluss`, de/en) → TIMELINE-BLOCK → finished.

## Tests

Voller Lauf grün: **976 Tests / 63 Dateien** (e2e 4 · Engine-Mock 25 ·
Struktur 850 · Worker 97). Neu: `tests/unit/s80-agenda-workflow.spec.js`
(16 Tests: Regal-Wege, Vormerkung, Etiketten, Kontext-Marker, QZ-Material,
Wegweiser, Engine-Persistenz, Heilung, Solo-Abschluss, Korpus-Kanarien,
Begriffs-Kanarien). Semantisch angepasst: `s41-vorraum` (Lesezeichen statt
Badges, kein `badgeTeil`), `s44-feinschliff` (dito), `s43-aufloesung`
(Gruppenblöcke/-namen). i18n-Parität de/en verifiziert.

## Build

`npm run build` grün — **Kern-Hash `36bc3c9ab8368fea`** (Artefakt, Cloudflare-Build
und Eval-Artefakt identisch).

## Offen / bewusst nicht enthalten

- Einladungs-Generator `qzDef`/`qzMenuePrompt` bleibt unverdrahtet (künftig ein
  Werkzeug INNERHALB des Gefäßes Qualitätszeit); `baueQzMaterial` ist vorbereitet.
- Wire-Namen (`moment`, `hebeInAgenda`, Feldnamen) unverändert bis S31
  (Wire-Anglisierung).
