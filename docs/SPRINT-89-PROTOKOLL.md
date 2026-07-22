# Sprint S89 — Prozessreflexion: Aufdeck-Rückkopplung & Nachzügler-Einspeisung

**Basis:** `origin/main` @ `02f90b0` (patch-s88-prozessreflexion-raum-und-themenfrage — S87 und S88 sind gemergt) · **Kern-Hash nach Build:** `0f30aab15091f29a`
**Quelle/Anlass:** Zwei Fehler aus der Aufdeckungs-Analyse: (A) **Stille Verbrennung** — `markiereAufgedeckt` hing am MOMENT-BLOCK, der bei *jedem* Sessionabschluss feuert; ging die Qualitätszeit woandershin, war die Runde trotzdem `revealed` und das Wegweiser-Versprechen verfiel ungehört. (B) **Der unsichtbare Nachzügler** — der Momentkontext wird einmal beim Start gebaut; eine *während* der Session fertig werdende Runde (Handy-Abgabe des Partners) erreichte das Modell nie und wäre am Ende zusätzlich verbrannt worden. Design-Entscheid aus dem Sparring: die verdeckte Einzelabgabe bleibt das Instrument („Formular schützt den Wert, Erzählung schützt die Beziehung"); die Meta-Aufdeckung bleibt erzählend (keine Tafel, keine Zahlen) — angeglichen wird nur der **geschlossene Kreis**, nicht die Darstellung.
**Patch:** `patch-s89-aufdeck-rueckkopplung-nachzuegler.mjs`

## Entscheidungen (Klärungsfragen)

| # | Entscheidung |
|---|---|
| K-Kreis | `markiereAufgedeckt` **nur bei tatsächlicher Aufdeckung** (Vorgabe): Rückmelde-Marker `[[META-REVEALED]]` statt Sessionende; nicht Aufgedecktes bleibt `ready` liegen. |
| K-Nachholen | Auf dem **eigenen Handy** des Partners (voller Verdeckt-Schutz, kein Geräte-Ritual, Ein-Gerät-Annahme der QZ unberührt); die Ein/Beide-Unterscheidung entfällt damit. |
| Kleine Entscheidung (Abweichung vom Planentwurf) | Die Protokollzeile in „Gemeinsame Momente" wird **abgeleitet** aus `measurements` (`revealedAt`) statt in `revealLog` geschrieben — `revealLog` ist ein **Einzelobjekt** der Auftrags-Aufdeckung, kein Verlauf; ein Schreiben dorthin hätte das Auftrags-Protokoll überschrieben. Kein Schema-Zuwachs, keine Kollisionsgefahr. |
| Eval statt nur Backlog | MRV wurde nicht als Backlog-Zeile notiert, sondern als **zwei lauffähige Szenarien** in den Katalog aufgenommen (der Runner unterstützt `zusatzKontext`). |

## Änderungen

**S89a · Rückmelde-Marker.**
- `core/ui/sessions.js` (`momentDef`): `markerOrder` + `markers` um `[[META-REVEALED]]` → Hook `onMetaAufgedeckt`. Gegenrichtung zu `[[REVEAL-A/B]]`: dort übergibt das Modell der App die Regie *vor* der Tafel, hier meldet es *danach* zurück — ohne Tafel, ohne Zahlen.
- `core/ui/prozess.js`: `markiereAufgedeckt(backend, rundeId)` markiert **ID-genau** und nur `ready`-Runden (idempotent). Grund: `resume()` dispatcht Marker erneut — eine inzwischen fertig gewordene *neue* Runde darf dabei nicht fälschlich verbrennen.
- `core/ui/app.js`: Die im Momentkontext verwendete Runden-ID wird als `chat.messrundeId` an der Chat-Struktur persistiert (überlebt Reload wie die Tafel-Meta). Neuer Hook `onMetaAufgedeckt` (Daten-Hook, bewusst **ungezäunt** wie `onSave` — auch ein Nachzügler-Abschluss bucht korrekt); aus `onMomentEnde` fliegt der Aufruf raus. `zeigeMomente` listet aufgedeckte Runden als abgeleitete Zeitstrahl-Einträge (`momente.artProzess`/`momente.prozessStandard`, de+en).
- **Prompt (de+en), AKT 1:** Marker-Disziplin (unmittelbar *nach* der erzählten Aufdeckung, allein auf der letzten Zeile, nie ankündigen; ohne Material nicht setzen) + Nachhol-Einladung (Angebots-Grammatik, höchstens einmal, Nein unkommentiert) + Umgang mit eintreffendem Nachtrag.
- **Copy-Fix** `mess.bereit` (de+en): „im nächsten gemeinsamen Moment" → „in eurer nächsten Qualitätszeit" (die interne `moment`/`qualitytime`-Namensvertauschung bleibt Wire-seitig — S31; der Satz an Menschen zeigt jetzt auf den richtigen Ort).

**S89b · Nachzügler-Einspeisung (Lazy-Check, kein Polling).**
- `core/ui/app.js` · `pruefeMessNachtrag()` vor jedem `sende()`: nur in der Qualitätszeit, nur solange `chat.messrundeId` leer ist — ein KV-Read pro Zug; wird eine Runde `ready`, geht sie **einmal** als versteckter eigener User-Zug *vor* der Nutzernachricht in den Verlauf (`mk.prozessNachtrag` + `formatiereMessrunde`). Das Muster zweier aufeinanderfolgender User-Nachrichten fährt der Sessionstart seit jeher (Kontext + Steuertext) — über alle drei Provider produktionserprobt. `messrundeId` ist zugleich Duplikat-Schutz und Marker-Anker; fehlertolerant (die Session scheitert nie am Nachtrag).
- **Korpus** `mk.prozessNachtrag` (de+en), neben `mk.prozessKopf`.

**Eval-Katalog** (`evals/szenarien/start-katalog.js` + `.en.js`): **MRV-01** „Dosierung der Meta-Aufdeckung" (Savoring vor Differenz; Differenz als Befund, kein Wettstreit/Mittelwert; keine nackten Zahlen im Gesprächstext; `[[META-REVEALED]]` allein auf der letzten Zeile, nie davor) und **MRV-02** „Nachhol-Einladung" (Einladung statt Verordnung, höchstens einmal, Weiter-Wunsch unkommentiert, keine Marke ohne Material) — je n=3, de + en (`MRV-01-EN`/`MRV-02-EN`). Anmerkung: MRV-01/C3 *misst* die „keine nackten Zahlen"-Implikation des Prompts; der **Zahlen-Wächter** (Laufzeit-Durchsetzung) bleibt bewusst die offene S90-Designfrage.

## Tests

**Neu:** `tests/unit/s89-aufdeck-rueckkopplung.spec.js` — 9 Tests: Marker ⇒ `revealed` (ID-genau, `revealedAt`, abgeleiteter Zeitstrahl-Eintrag); **Kernfall A:** MOMENT-BLOCK ohne Marker ⇒ Runde bleibt `ready` und liegt der nächsten QZ erneut im Kontext; Resume-Festigkeit (erneuter Marker verbrennt eine inzwischen neue `ready`-Runde nicht); Marker ohne Kontext-Runde folgenlos; Copy-Fix de; **Kernfall B:** Handy-Abgabe während laufender QZ ⇒ Nachtrag steht versteckt *vor* der nächsten Nutzernachricht, `messrundeId` gesetzt, Marker bucht genau diese Runde; Einmaligkeit; kein Doppel bei Start-Kontext; `chatId`-Gate + halbe Runde wird nicht eingespeist.
**Semantisch treu angepasst:** `prozess-qz.spec.js` (alte Semantik „MOMENT-BLOCK markiert aufgedeckt" → neue: Marker bucht, der Abschluss ändert nichts mehr — der Kernfall dazu liegt im neuen Spec) · `eval-runner.spec.js` (Katalogzähler 23 → 25).

## Verifikation

- Voller Testlauf **grün**: **1149 Tests / 137 Dateien** (Basis 1140 + 9 neue)
- Build: `npm run build` · Kern-Hash `0f30aab15091f29a`
- Korpus-Parität de/en (`korpus-paritaet.spec.js`) + i18n-Parität explizit grün; Katalog-Wohlgeformtheit (`eval-runner.spec.js`, inkl. `zusatzKontext`-Anbindung) grün
- Patch auf frischem Klon (`02f90b0`): dry-run → apply → Idempotenz → Byte-Vergleich → Tests → Build

## Eval-Kadenz (S66)

- [x] **`core/prompts/*` berührt** → Eval-Lauf der Moment-Familien fällig: `npm run eval -- --familie MRV` und Bestands-Moment-Szenarien (SPR/QZ) gegenfahren. **Aus der Sandbox nicht fahrbar (kein API-Zugang)** — bitte lokal vor dem Merge; MRV-01/02 liegen lauffertig im Katalog.
- [x] Szenarien-Katalog berührt → additiv (+MRV, de+en); Abdeckungs-Matrix: Familie MRV deckt `session: "moment"` zusätzlich ab
- [x] UI-Verhalten/Session-Wiring berührt → `tests/e2e/` grün (Selbstfahrt-Journeys 3/3 laufen im Volltest mit)
- [ ] Judge berührt → nein
- [ ] Release-Gate → nicht Teil dieses Sprints

## Notizen

- `onMetaAufgedeckt` ist bewusst **nicht** am S87-Generationszaun: Datenbuchung wie `onSave` — ein Nachzügler-Abschluss der alten Session bucht korrekt, ohne die Oberfläche des neuen Raums zu berühren.
- Offen für S90 (Designnotiz): Zahlen-Wächter ja/nein; Verlaufs-Nutzung von `measurements` (Empathie-Signal längsschnittlich); korrigiertes Datenfluss-Diagramm (entityflow-v2) als Referenz.
