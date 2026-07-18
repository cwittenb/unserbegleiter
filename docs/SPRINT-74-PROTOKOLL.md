# Sprint S74 — Protokoll: Feinschliff zweite Hälfte — Sessionende, Konsens-Sprache, Doppel-Slider

**Basis:** `origin/main` @ `c091633` (patch-s73-waechterpfad-und-nachzuegler), 844 Tests grün, Kern `1ac29d69044a841b`
**Patch:** `patch-s74-sessionende-und-konsens.mjs` (Ganzdatei-Ersetzung, SHA-256-Anker, idempotent, `--dry-run`)
**Testlage nach Sprint:** **858 grün** (4 e2e · 25 Engine/Mock · 738 Struktur · 91 Worker/Miniflare) · **Kern-Hash `6ea9525a1d77e76f`**

## Anlass

Fünf Trockenlauf-Befunde aus der zweiten Hälfte der Gemeinsamen Auflösung (Aufdeckung → Klärung → Befund).
Vorab geklärt: Das klebende, vorwegnehmende „Euer verbindendes Angebot:" war bereits durch S71 behoben
(gemerged) — der getestete Deploy-Stand war älter. **Nach diesem Sprint deployen.**

| Befund | Ursache | Fix |
|---|---|---|
| „ihr wart mitten in **Phase 2b**" | Kein Verbot interner Strukturnamen im Prompt | B3 |
| **Zwei Slider** übereinander bei den verdeckten Startwerten | „Deine Zahl"-Leiste ist eine Text-Heuristik (`/Skala von 1 bis 10/`) und ignorierte Marke/Panel | B1 |
| „… **sobald** ich ihn von euch beiden bestätigt habe" nach zwei gegebenen Ja; die Frage kommt nie | Phase 4 panzert gegen *unterstellte* Okays, kannte aber die Gegenrichtung nicht | B2 |
| Nachrichten nach dem Befund „verschwinden im **Nirwana**" | `finished` → Engine verweigert; Fehlzeile in `#pbErr` ganz oben außer Sicht; Eingabe sofort geleert; Composer blieb aktiv | B5 |
| „Gut — dann halte ich alles fest.**Euer Befund:**" — Klinik-Sprache, unnötig | Sichtbarer Platzhalter des CLARIFICATION-BLOCKs | B4 |
| Vorraum bietet wieder „Gemeinsame Auflösung **beginnen**" | Nach dem Befund fällt der Button mangels `aufloesungOffen` aufs Start-Label zurück | B5 |
| **Agenda leer** trotz „Ich halte alles fest" | Der Befund-Handler schrieb nur `findings`; die Agenda liest `goals` — nichts überführte den Auftrag | B6 |

## Gelockte Entscheidungen

- **E1** Abgeschlossene Auflösung: Der **„Raum verlassen"-Knopf ersetzt den Composer** (keine
  Abschluss-Floskel, keine neuen Strings); im Vorraum **verschwindet die Auflösungs-Karte ganz**
  — kein Umbenennen, kein erneutes „beginnen". Der lineare Pfad geht bei der Prozessreflexion weiter.
- **E2 = a** Der Befund seedet **gemeinsamen UND individuelle Aufträge** als aktive Agenda-Einträge.
- **E2-Zusatz = c** `goalAdditions` („das wollen wir nicht") bleiben **draußen aus der Agenda** —
  das Paar führt eine positive Zielausrichtung. Sie sind stille Achtsamkeits-Marker für die
  Begleitung; damit dieser Zweck real wird, reicht der Befund sie jetzt in den **Moment-Kontext**
  (siehe B6b — vorher erreichten sie kein einziges Folge-Gespräch).

## Änderungen

### B1 · `core/ui/app.js` — Skala-Heuristik weicht dem Panel
`aktualisiereSkala`: Die Leiste schweigt, wenn der letzte sichtbare Assistant-Zug eine **Marke oder
einen Block** trägt (dann antwortet ein Panel — z. B. die verdeckten Startwerte bei `[[BASELINE]]`)
oder `kwPanel`/`gatePanel` bereits **offen** ist. Nebenbei EN-Parität der Heuristik
(`scale of/from 1 to/through 10`).

### B2 · Prompts (de+en) — Gegebenes Ja zählt sofort
Phase 4, direkt nach (d): Ein ausdrückliches Ja jeder Person auf die Stimmigkeitsfrage **IST** die
Bestätigung — liegen beide vor, gilt der Auftrag in genau diesem Moment; NIE einen weiteren,
künftigen Bestätigungsschritt ankündigen („… sobald ich ihn von euch beiden bestätigt habe" ist als
Verstoß-Beispiel wörtlich benannt) — direkt weiter zur verdeckten Startwert-Erhebung. Die bestehende
Panzerung gegen *unterstellte* Okays (GEGENDRUCK-FEST etc.) bleibt unverändert daneben.

### B3 · Prompts (de+en) — Interne Strukturnamen nie zum Paar
Im Kopf des `aufloesungsPrompt` (wirkt damit auch im Wiedereinstieg): Phasennummern („Phase 0",
„Phase 2b"), Blocknamen und Markennamen existieren nur für die Begleitung — sie erscheinen NIE im
Text ans Paar („ihr wart mitten in Phase 2b" ist als Verstoß-Beispiel benannt); Alltagssprache
(„die Sorgen lagen auf dem Tisch — da machen wir weiter").

### B4 · `core/contracts/registry.js` — Befund ohne Etikett
`befund.placeholder: ""` — „Befund" ist Klinik-Sprache; der Abschieds-Text der Begleitung trägt den
Moment allein, das Ergebnis lebt sichtbar in der Agenda. Der S71-Anzeigetest nutzt als Beispiel eines
sichtbaren Platzhalters nun den Abschluss-Block (treu umgezogen).

### B5 · `core/ui/app.js` — Sessionende ohne Nirwana
- Neu `aktualisiereComposer()` (läuft in jedem `renderMsgs`, also auch unmittelbar nach dem
  Befund-Handler): Ist die Session nicht mehr `running`, wird der **Composer ausgeblendet** — der
  „Raum verlassen"-Knopf tritt an seine Stelle. Nichts Eintippbares kann mehr verschwinden. Der
  NACHKLANG der Auftragsklärung bleibt unberührt (heilt seinen Status auf `running`).
- Vorraum: Nach dem Befund (`aufloesungGelaufen`) wird die **ganze Auflösungs-Karte** (Knopf +
  Subtext) versteckt.

### B6 · Agenda & stille Marker
**a) `core/ui/kernwetten.js` (Befund-Handler):** Überführt beim Speichern zusätzlich in
`bstate.goals` (exakt das Writer-Format des GOAL-BLOCKs): `sharedGoal` (nur `confirmedByBoth`) →
aktiver `AG<n>` inkl. Baseline; je `individualGoals[]` → aktiver `AI<n>` mit `owner`. **Idempotent**
über `goals.findingsSeededAt` (resume-fest); Fehler im Seeding brechen den Abschluss nie;
`goalAdditions` ausdrücklich NICHT dabei.
**b) `core/ui/sessions.js` + `app.js` + Korpus (de+en):** `baueMomentKontext` erhält den Befund und
trägt bestätigte `goalAdditions` als „ZU VERMEIDEN"-Kopf (neuer Korpus-Schlüssel
`mk.vermeidenKopf`, de/en) — stille Achtsamkeits-Marker: nie abfragen, nie vorlesen, die Ausrichtung
des Paars bleibt positiv. Der `momentPrompt` benennt die Zeilen entsprechend. (Ohne diesen Schritt
hätten die Marker kein einziges Folge-Gespräch erreicht — `findings` wurde bisher nur vom Vorraum
gelesen.)

## Tests

Neu `tests/unit/s74-sessionende-und-konsens.spec.js` (**14 Fälle**): Doppel-Slider ([[BASELINE]] →
Panel offen, Leiste zu; normale Skala-Frage → Leiste offen), Sessionende (finished → Composer weg,
Verlassen-Knopf da; running → Composer bleibt; Vorraum-Karte weg nach Befund / da ohne Befund),
Agenda-Seeding (AG1 + 2×AI mit Ownern, Baseline, `findingsSeededAt`, idempotent bei Doppel-Aufruf,
goalAdditions bleiben draußen; unbestätigter Auftrag wird nicht geseedet), Moment-Kontext
(ZU-VERMEIDEN-Kopf mit/ohne Befund), Prompt-Kanarien de+en (Gegebenes Ja, interne Strukturnamen,
Moment-Prompt; Panzerung unversehrt), Befund ohne Etikett (leerer Platzhalter, spurloses cleanDisplay).
Angepasst: `s71-wiedereinstieg-feinschliff.spec.js` (sichtbares Platzhalter-Beispiel: Befund → Abschluss).

## Verifikation (frischer Klon)

`--dry-run` → apply → erneuter Lauf idempotent (alle *skip*) → Byte-Vergleich → `npx vitest run`
**858 grün** → `npm run build` **Kern-Hash `6ea9525a1d77e76f`**.

## Danach

**Deployen** — damit kommen S71–S74 gemeinsam an (u. a. der bereits gefixte Choice-Platzhalter,
die Krisen-Weiche und dieser Sprint).
