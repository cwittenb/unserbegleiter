# Sprintplan S95 — Dialogausschnitt (zweiter Artefakt-Typ am Gate)

**Basis:** `origin/main` @ `7395672` („patch-s94-waechter-im-eval") · frischer Clone
**Designgrundlage:** `designnotiz-dialogausschnitt.md`
**Umfang:** 6 in sich abgeschlossene, einzeln testbare Schnitte
**Auslieferung:** je Schnitt ein eigenständiger Node-ESM-Multipatch (`.mjs`) mit
Whole-File-Replacement, SHA-256-Anker-Check, Idempotenz, `--dry-run`; jeder Patch
schreibt `docs/SPRINT-95-x-PROTOKOLL.md`.

---

## 0 · Stand

**Geliefert und verifiziert:**

| Schnitt | Patch | Status |
|---|---|---|
| S95.1 Auswahlmenge | `patch-s95-1-ausschnitt-auswahlmenge.mjs` | ✓ 19 Tests, Suite grün, Kern `a900473ed74d18b3` |
| S95.2 Schema/Registry | `patch-s95-2-ausschnitt-schema-registry.mjs` | ✓ 18 Tests, Suite grün |

**Entschieden (P1–P3, aufgelöst):**

- **P1 → bestätigt und erweitert.** Die Gabelung setzt auf der bereits
  vorhandenen, unbedingten Abschlussfrage auf; sie braucht keinen Öffner. M1
  wird vom Auslöser zur **Bremse**. Darüber hinaus entfällt der **Sofort-Pfad
  des Owner-Triggers**: Es gibt keinen Freigabe-Vorgang mehr mitten in der
  Session, weil die Fassung aus Minute 10 jemandem gehört, der noch nicht weiß,
  was er in Minute 40 versteht. Verschoben wird das *Wie*, nicht das *Ob*
  (Designnotiz §5).
- **P2 → Speicher-Garantie (Option B).** Die Karenz ist verzögertes Senden, kein
  Rückholen — Karenz-Items verlassen den Worker für den Empfänger gar nicht.
  Rollenbewusste Redaktion beim Lesen, PUT-Riegel, drei Routen im Muster S91/I12.
- **P3 → M2 gestrichen.** Kein Verbraucher mehr nach „Startzustand leer" und
  „öffnet oben". Das Prinzip (Marker nur gültig, wenn ausgesprochen) bleibt in
  der Designnotiz notiert.

## Abhängigkeiten

```
S95.1 (Auswahlmenge) ✓ ──┬─→ S95.3 (Regal/Karenz) ──┐
S95.2 (Schema/Registry) ✓┘                          ├─→ S95.5 (UI) ─┬─→ S95.6 (Evals)
                           S95.4 (Prompt) ──────────┘               │
                                                     S95.7 (Replay) ┘
```

S95.1 und S95.2 sind geliefert. S95.3 und S95.4 sind ab sofort parallel baubar
und voneinander unabhängig (Speicher- bzw. Korpus-Arbeit); S95.5 setzt beide
voraus.

---

## S95.1 · Auswahlmenge (reine Funktion, keine UI)

**Ziel:** Aus einem Soloreflexions-Verlauf die auswählbaren Frage-Antwort-Paare
berechnen — deterministisch, ohne Seiteneffekte, ohne Oberfläche.

**Neu:** `core/engine/ausschnitt.js`

```
paareAusVerlauf(messages)      → [{ id, frage: {i, text}, antwort: {i, text} }]
```

- Paar = Assistant-Zug (Frage) + unmittelbar folgender sichtbarer User-Zug.
- Ausgeschlossen: `hidden`-Nachrichten, Steuertoken-/Block-Nachrichten,
  Revisions-Nachrichten, Marker-Zeilen (`core/contracts/marker.js` nutzen).
- `id` = Index-Paar; Nachrichten sind append-only, damit ist der Index innerhalb
  eines Chats stabil (Befund aus `core/engine/engine.js`).
- Blocktexte werden aus den Zügen entfernt (Registry-Marken aus
  `core/contracts/registry.js`), nie mitgeliefert.

**Tests** — `tests/unit/ausschnitt-auswahlmenge.spec.js`

| # | Fall | Erwartung |
|---|---|---|
| 1 | normaler Verlauf | Paare in Reihenfolge, korrekt zugeordnet |
| 2 | `hidden`-Nachricht zwischen Frage und Antwort | Paar bleibt intakt, hidden fehlt |
| 3 | Assistant-Zug ohne folgende User-Antwort | kein Paar |
| 4 | Zug mit `GATE-BLOCK` / `TIMELINE-BLOCK` | Blocktext entfernt |
| 5 | Marker-Zeile (`[[SCALE-SAFETY]]`) als letzte Zeile | Zeile entfernt, Paar bleibt |
| 6 | leerer / einseitiger Verlauf | `[]` |
| 7 | Determinismus | zweimaliger Aufruf → identisches Ergebnis |

**Abgeschlossen, wenn:** neue Spec grün, volle Suite grün, Kern-Hash neu berechnet.
Keine UI-, Prompt- oder Speicheränderung in diesem Schnitt.

---

## S95.2 · Ausschnitt-Objekt, Schema und zweiter Kriteriensatz

**Ziel:** Der Dialogausschnitt existiert als vertragsgeprüftes Artefakt.

**Ändert:**
- `core/contracts/schemas.js` — neu `ausschnittSchema(d)`:
  - `pairs`: Liste `{question, answer, gapBefore:boolean}`, mindestens 1
  - `frame`: Rahmensatz oder `null` (Länge begrenzt, s. offener Punkt 2 der Notiz —
    Vorschlag: 280 Zeichen, im Protokoll als kleine Entscheidung vermerkt)
  - `criteriaOwner`: bestehende vier Flags, alle bestanden
  - `criteriaCompanion`: `partisan:false, interpretsAbsent:false, diagnoses:false`
  - `paths`: Teilmenge `shelf` / `moment` — **`self` ist ungültig** (eine
    Generalprobe eines fremden Dialogs ergibt keinen Sinn)
  - Fehlertexte englisch, Wire englisch (Konvention S31a)
- `core/contracts/registry.js` — neuer Block `ausschnitt`
  (`EXCERPT-BLOCK` / `END EXCERPT-BLOCK`, `dataset: "ausschnitt"`)

**Tests** — `tests/unit/ausschnitt-schema.spec.js`

| # | Fall | Erwartung |
|---|---|---|
| 1 | gültiger Block | `[]` |
| 2 | `pairs` leer / fehlend | Fehler |
| 3 | ein Owner-Kriterium nicht bestanden | Fehler, nennt das Kriterium |
| 4 | ein Begleiter-Kriterium nicht bestanden | Fehler, nennt das Kriterium |
| 5 | `paths: ["self"]` | Fehler |
| 6 | `frame` über Längenlimit | Fehler |
| 7 | `frame: null` | gültig |
| 8 | Registry-Rundlauf (Block erkannt, Schema greift) | grün |

**Abgeschlossen, wenn:** Specs grün, `tests/unit/block*.spec.js` und
`bausteine.spec.js` weiterhin grün, Kern-Hash aktualisiert.

---

## S95.3 · Servergeführtes Regal und Karenz

**Ziel:** Ein freigegebener Ausschnitt verlässt den Worker 30 Minuten lang nicht
für den Empfänger und ist in dieser Zeit zurückziehbar; danach endgültig.

**Muster:** exakt S91/I12 (servergeführte Messungen), kein neues Konzept.

**Warum servergeführt und nicht clientseitig gefiltert:** Sobald der Empfänger
ein redigiertes Regal liest, darf er nicht mehr darauf schreiben — sein
Read-Modify-Write löschte sonst die Karenz-Items des Owners. Genau dieser
Kommentar steht bereits für `measurements` im Worker. Und der Empfänger
schreibt: `markiereGelesen`.

**Ändert:**
- `platforms/cloudflare/worker/index.js`
  - `GET /api/bstate/shelf` → `redigiereRegalFuerRolle(wert, session.role)`:
    Items mit `visibleFrom > jetzt` und fremdem Owner werden **vollständig
    entfernt** — nicht ausgegraut, nicht gezählt (I11)
  - `PUT /api/bstate/shelf` → 403 (`regal_managed`), analog `mess_managed`
  - `POST /api/regal/freigabe` — Owner legt ein Item ab, Server setzt
    `visibleFrom = jetzt + 30 min`
  - `POST /api/regal/gelesen` — Empfänger markiert gelesen
  - `POST /api/regal/ruecknahme` — Owner zieht zurück; nur solange
    `visibleFrom > jetzt`
- `core/ui/sessions.js` — `quereGate` und `markiereGelesen` auf die Routen
  umgestellt; Regal-Item erhält `kind: "excerpt" | "message"` und `visibleFrom`
- Owner-Sicht: Zustand `zurückziehbar`, **kein Countdown** (ein tickender Timer
  erzeugt die Anspannung, gegen die die Karenz gedacht ist)
- Rücknahme + erneute Freigabe setzen `visibleFrom` neu

**Tests** — `tests/unit/ausschnitt-karenz.spec.js` (Miniflare)

| # | Fall | Erwartung |
|---|---|---|
| 1 | frisch freigegeben, GET als Empfänger | Item fehlt vollständig in der Antwort |
| 2 | frisch freigegeben, GET als Owner | Item da, Zustand `zurückziehbar` |
| 3 | Empfänger-Badge/Zähler in Karenz | unverändert (kein „neu") |
| 4 | nach Ablauf, GET als Empfänger | Item sichtbar |
| 5 | `PUT /api/bstate/shelf` | 403, Fehlercode `regal_managed` |
| 6 | Rücknahme in Karenz | Item weg, auch beim Owner |
| 7 | Rücknahme durch den Empfänger | abgelehnt |
| 8 | Rücknahme nach Ablauf | abgelehnt |
| 9 | Rücknahme + neue Freigabe | `visibleFrom` neu gesetzt |
| 10 | `visibleFrom` im Freigabe-Body mitgeschickt | ignoriert, Server setzt selbst |
| 11 | Owner-Sicht | kein Countdown-Feld in der Antwort |
| 12 | Gelesen-Markierung durch den Empfänger | Owner-Items bleiben unversehrt |

**Abgeschlossen, wenn:** Specs grün, `d9-regal-vollbild.spec.js` und
`d5-teilen-flow.spec.js` weiterhin grün, volle Suite grün.

---

## S95.4 · Prompt: Freigabe-Ort, Gabelung, M1-Bremse

**Ziel:** Der Begleiter gibt nichts mehr mitten in der Session frei, stellt am
Abschluss drei gleichwertige Türen und bremst Teilenwünsche freundlich ab.

**Ändert:** `core/prompts/prompts.de.js`, `core/prompts/prompts.en.js`
(Whole-File-Replacement, base64 — die Dateien enthalten `${…}` und Backticks)

1. **Freigabe-Ort (hart).** Kein `GATE-BLOCK`, keine Redaktion, keine Gabelung
   vor `[CLOSE SESSION]`. Der Sofort-Pfad des Owner-Triggers entfällt.
2. **M1 als Bremse.** Ein Teilenwunsch — beiläufig oder klar — löst kein
   Formangebot aus. Stattdessen: **Zusage, nicht Frage** (*„Das nehme ich mit —
   am Ende schauen wir, in welcher Form es zu ihr finden kann"*), Vormerkung als
   Merkposten, Vertiefung beim **Erleben** (*„Was wäre anders, wenn sie das
   wüsste?"*). Kein „aber", kein „ich frage dich am Ende".
3. **Dreiwertige Gabelung am Abschluss** (Designnotiz §4): Zweckfragen, kein
   Aufwandsvergleich, keine Empfehlung, dritte Tür („noch für mich behalten")
   gleichwertig und ohne Verneinungsformel, lautloses Schließen.
4. **„Offen lassen"** als Gesprächsangebot **vor** der Gabelung, nie als vierte
   Option — samt Hinweis, dass die nächste Reflexion dann dort fortsetzt.
5. **M0** — das Wiederkehr-Angebot erhält ebenfalls beide Türen; die Freigabe
   selbst bleibt am Abschluss.
6. **Auswahl-Rahmung.** Ein kurzer Satz über den **Vorgang** („magst du dir
   Stellen aussuchen, die sie lesen darf?"). **Nie Gesten, nie „App", nie
   „antippen"** — die Mechanik trägt das Panel (S95.5).
7. **D6** — Richtwert-Hinweis einmalig, praktisch statt fürsorglich, **nie** eine
   Aussage über den Empfänger.
8. **D1/D2** — im Ausschnitt-Zweig ausdrücklich: keine Umformulierung,
   Auslassungen nur zwischen Paaren.
9. **Eignungsprüfung beim Abschluss.** Der `EXCERPT-BLOCK` entsteht **immer** am
   Sessionende, sobald wählbare Paare existieren — nicht erst, wenn jemand die
   Ausschnitt-Tür nimmt. Grund: Das Replay (S95.7) muss ohne Modellaufruf
   auskommen; eine abgeschlossene Session ist inert.

**Tests** — `tests/unit/ausschnitt-prompt.spec.js` + i18n-Parität

| # | Prüfung |
|---|---|
| 1 | DE/EN-Parität des TEILEN-Abschnitts |
| 2 | alle drei Türen im Abschluss-Wortlaut vorhanden |
| 3 | dritte Tür ohne Verneinungsformel |
| 4 | Zusage-Formel vorhanden, „ich frage dich" nicht |
| 5 | Sofort-Pfad-Formulierungen entfernt |
| 6 | Richtwert-Hinweis enthält keine Aussage über den Empfänger |
| 7 | Ausschnitt-Zweig nennt Umschreib-Verbot und Paar-Grenze |
| 8 | Auswahl-Rahmung enthält keine Gesten- oder App-Begriffe |

**Abgeschlossen, wenn:** Specs grün, volle Suite grün, Kern-Hash aktualisiert.
*Hinweis:* Modellverhalten prüft S95.6, nicht dieser Schnitt.

---

## S95.5 · UI: Auswahl-Modus, Vorschau, Regal-Darstellung

**Ziel:** Der Owner wählt Paare im Verlauf selbst aus, sieht die Empfängersicht und
gibt frei. Drei Stationen: **Auswählen → Vorschau → Freigeben.**

**Ändert:** `core/ui/app.js`, `core/i18n/de.js`, `core/i18n/en.js`

> **Bauvorschrift (hart, wegen S95.7): das Auswahl-Panel ist engine-frei.**
> Signatur `(daten, { engine } = {})` — die Engine ist optional und wird
> ausschließlich für die Quittung ans Modell benutzt. `quereGate` ist bereits
> session-frei; die einzige Kopplung im bestehenden `gatePanel`
> (`engine.submitToolResult`) wird in diesem Schnitt ebenfalls optional
> gemacht. Ohne diese Vorschrift lässt sich der Replay-Eingang später nicht
> ohne Dopplung anschließen.

### 5a · Auswahl-Modus (auf dem Verlauf, nicht auf einer abgeleiteten Liste)

- Der abgeschlossene Verlauf kippt in den Auswahl-Modus. **Die Auswahleinheit ist
  das Paar**, nicht die Nachricht: Frage und Antwort werden sichtbar zu einem Block
  zusammengefasst. Ohne diesen visuellen Wechsel tippt jeder zuerst auf eine
  einzelne Blase und lernt die Regel durch Scheitern.
- **Startzustand leer.** Keine Vorauswahl — sie wäre ein Nudge Richtung Zuviel, und
  der Normalfall ist, dass nichts quert.
- **Öffnet oben**, kein Sprung, kein Auto-Scroll auf markierte Stellen (Neutralität
  vor Bequemlichkeit).
- **Tap = umschalten** (an/aus). Deckt allein den gesamten Auswahlraum ab.
- **Long-Press auf einem späteren Paar = „bis hierhin"**, füllt die Spanne ab dem
  zuletzt gewählten Paar auf. Reiner Beschleuniger; Löcher werden danach per Tap
  wieder herausgenommen. *Datenlage deckt sich:* Spanne minus Löcher **ist** D2 —
  zwei getrennte Bereiche sind dasselbe wie eine Spanne mit Löchern, einen zweiten
  Fall gibt es nicht.
- **Kein Swipe im Verlauf.** Tap wählt bereits ab; „Löschen" ist die falsche
  Metapher (es wird nichts gelöscht, nur nicht gezeigt); horizontales Wischen auf
  einer lang scrollenden Liste ist mobil die fehleranfälligste Kombination.
- **Lange Begleiter-Züge** im Auswahl-Modus auf wenige Zeilen gekürzt, mit „mehr".
- **Leiste:** schlichter Zähler („4 Paare"). Keine Lesezeit-Schätzung — das wäre
  eine Aussage über den Empfänger. Richtwert-Hinweis ab 6 Paaren, genau einmal.
- **Abbrechen ist lautlos** und mündet in „noch für mich behalten": keine
  Sicherheitsabfrage, keine Bilanz.

**Anleitung — zweischichtig (Konventions-Konflikt, s. P3):**
- *Begleiter (Prompt, gehört zu S95.4):* ein kurzer Rahmensatz über den **Vorgang**
  („magst du dir Stellen aussuchen, die sie lesen darf?"). **Nie Gesten, nie „App",
  nie „antippen"** — bestehende Konvention: die Wahl gehört der App, nicht dem
  Gespräch.
- *Panel (i18n-String, dieser Schnitt):* eine Zeile zur **Mechanik** (Tippen /
  Gedrückthalten), nur beim ersten Mal. Long-Press ist unsichtbar; ohne diesen
  Hinweis existiert der Beschleuniger praktisch nicht.
- *Zugänglichkeit:* Long-Press braucht eine Nicht-Zeige-Entsprechung
  (Tastatur/Screenreader). Kleine Entscheidung, im Protokoll vermerkt.

### 5b · Nicht wählbare Paare

- **Kriterien-Verletzer** bleiben sichtbar, aber **stumm** — kein Badge, kein
  Häkchen, keine Bewertung pro Block (bestandene Kriterien werden nie ausgesprochen).
  Antippen liefert **einmal** den Grund. Innerhalb einer Spanne werden sie
  automatisch zum „…", wie ein selbst abgewähltes Paar.
- **I6-Material** ist serverseitig gar nicht in der Menge. Die dadurch entstehenden
  Lücken werden **einmal oben** neutral benannt („manches aus diesem Gespräch bleibt
  hier") — nie pro Element, ohne zu sagen was oder warum.

### 5c · Vorschau (Pflicht, nicht Komfort)

Folgt zwingend aus D1 (kein Nachbearbeiten) und D5 (nach 30 min endgültig).

- Zeigt die **Empfängersicht**: Dialogform, Rahmung „ein Stück Denkarbeit von
  {name}" (D4), Rahmensatz-Feld.
- **Die „…" existieren nur hier.** Im Verlauf ist ein nicht gewähltes Paar bloß
  nicht gewählt; dass daraus beim Leser eine sichtbare Lücke wird, ist auf der
  Auswahlfläche unsichtbar. Ohne Vorschau wirkt die Markierungspflicht aus D2 nur
  beim Empfänger — sie soll aber beim Absender wirken.
- **Swipe gehört hierher:** kurze Liste, jedes Element bewusst hineingelegt,
  Wegwischen heißt „das doch nicht". Kein Scroll-Konflikt.

### 5d · Regal (Empfänger)

Dialogdarstellung statt Fließtext; Rahmung nach D4; Karenz-Items fehlen vollständig
(S95.3).

**Tests** — `tests/unit/ausschnitt-ui.spec.js` (happy-dom)

| # | Fall | Erwartung |
|---|---|---|
| 1 | Auswahlmenge leer | Ausschnitt-Tür fehlt, andere zwei da |
| 2 | Startzustand | nichts gewählt, Scroll oben |
| 3 | Tap auf gewähltes Paar | abgewählt |
| 4 | Long-Press auf späteres Paar | Spanne gefüllt |
| 5 | Long-Press ohne Vorauswahl | wie einfacher Tap |
| 6 | Kriterien-Verletzer in Spanne | nicht gewählt, wird zu „…" |
| 7 | Kriterien-Verletzer angetippt | Grund genau einmal |
| 8 | kein Badge/Häkchen an bestandenen Paaren | keins im DOM |
| 9 | Vorschau, zwei nicht benachbarte Paare | „…" dazwischen |
| 10 | Vorschau, zwei benachbarte Paare | kein „…" |
| 11 | Swipe in der Vorschau | Element entfernt |
| 12 | Swipe im Verlauf | keine Wirkung |
| 13 | 6 Paare gewählt | Hinweis genau einmal |
| 14 | Paartext editierbar? | nein |
| 15 | Mechanik-Hinweis | nur beim ersten Mal |
| 16 | I6-Lücken vorhanden | Sammelhinweis einmal, nie pro Element |
| 17 | Abbrechen | keine Rückfrage, mündet in „behalten" |
| 18 | Regal-Darstellung eines `excerpt` | Dialogform, Rahmung korrekt |
| 19 | i18n-Parität aller neuen Strings | grün |

**Abgeschlossen, wenn:** Specs grün, Design-Specs (`d1`–`d11`) grün, Build grün.

---

## S95.6 · Evals

**Ziel:** Die sechs Dimensionen aus Designnotiz §10 sind im Harness abgebildet.

**Ändert:** `evals/szenarien/start-katalog.js` (+ `.en.js`), Judge-Regeln

| ID | Dimension | Art |
|---|---|---|
| `AUS-01` | Freigabe-Ort: kein Block vor `[CLOSE SESSION]` | **rote Linie**, strukturell |
| `AUS-02` | M1-Bremse bei Erregung — Wut-Wunsch führt zu keinem Angebot | **rote Linie** |
| `AUS-03` | Zusage statt Frage — die Verschiebung eröffnet nicht neu | Judge |
| `AUS-04` | Kriterien-Präzision auf Begleiter-Zügen | Testset |
| `AUS-05` | Formneutralität der Gabelung | Judge |
| `AUS-06` | D7 — umgekehrte Sicherheitsrichtung, qualitativ | Beobachtung |

`AUS-01` ist durch die Freigabe-Ort-Regel keine Beurteilung mehr, sondern eine
Messung: Der Runner prüft die Blockfolge, kein Judge nötig.

**Abgeschlossen, wenn:** Szenarien im Katalog, Runner grün gegen Mock-LLM.
Eval-Läufe gegen echte Modelle macht Cars10 lokal.

---

## S95.7 · Zeitleisten-Replay und zweiter Freigabe-Eingang

**Ziel:** Ein abgeschlossenes Gespräch bleibt lesbar, und ein Ausschnitt daraus
lässt sich später teilen — über denselben Ablauf, nicht über einen zweiten.

**Ändert:** `core/ui/sessions.js`, `core/ui/app.js`,
`platforms/cloudflare/worker/index.js` (Feldliste), `core/i18n/*`

- **Aufbewahrung:** Beim Abschluss wird der Verlauf zusammen mit dem
  Eignungsbericht am Zeitleisten-Eintrag abgelegt (pstate, privat — das
  gemeinsame Regal bleibt unberührt).
- **Weichen-Kriterium (hart):** Hat die Sicherheits-Weiche in der Session
  gegriffen, wird **nichts** aufbewahrt. Still, ohne Hinweis, ohne Erklärung.
- **Replay:** Zeitleisten-Eintrag trägt „das ganze Gespräch"; die Ansicht zeigt
  den Verlauf wie im Chat (`cleanDisplay`, keine Panels, keine Eingabe).
- **Zweiter Eingang:** am Ende des Replays „Erfahrung aus dieser Session
  teilen" → dieselbe Gabelung.
  - *Ausschnitt* → dasselbe Panel aus S95.5, ohne Engine, ohne Modellaufruf.
  - *Nachricht* → startet eine kurze Reflexion mit dem Verlauf als Kontext.
  - *Bei laufender Soloreflexion* ist die Nachrichten-Tür nicht wählbar,
    mit Hinweis („deine Session läuft gerade …"). Die Ausschnitt-Tür bleibt
    offen.

**Tests** — `tests/unit/ausschnitt-replay.spec.js`

| # | Fall | Erwartung |
|---|---|---|
| 1 | Abschluss ohne Weichen-Treffer | Verlauf + Eignungsbericht am Eintrag |
| 2 | Abschluss mit Angst-VOR-Marker | nichts aufbewahrt, kein Replay-Link |
| 3 | Aufbewahrung ohne Hinweis | kein Text, der die Nicht-Aufbewahrung erklärt |
| 4 | Replay-Ansicht | Verlauf gesäubert, keine Panels, keine Eingabe |
| 5 | Ausschnitt-Tür aus dem Replay | Panel öffnet ohne Engine, kein LLM-Aufruf |
| 6 | Freigabe aus dem Replay | Item im Regal, Karenz gesetzt (wie S95.3) |
| 7 | Nachrichten-Tür, keine laufende Session | Reflexion startet mit Kontext |
| 8 | Nachrichten-Tür, laufende Session | nicht wählbar, Hinweis sichtbar |
| 9 | laufende Session bleibt unberührt | Slot unverändert |
| 10 | Eintrag ohne Verlauf (Altbestand) | kein Link, kein Fehler |

**Abgeschlossen, wenn:** Specs grün, volle Suite grün, Build grün.

---

## Ritual je Schnitt

1. Frischer Clone aus `origin/main` (nie eine ältere Arbeitskopie)
2. Patch als eigenständiges Node-ESM-Skript: Whole-File-Replacement, SHA-256-Anker
   (Mismatch → Abbruch, nie überschreiben), idempotent, `--dry-run`;
   base64 für Dateien mit `${…}` und Backticks
3. Verifikation: dry-run → apply → Idempotenz → Byte-Vergleich → `npx vitest run` →
   `npm run build` (Kern-Hash)
4. Lieferung: Patch + `docs/SPRINT-95-x-PROTOKOLL.md` (deutsch) + Artefakt
5. Patch-Dateiname: `patch-s95-<n>-<inhalt>.mjs`
6. Baut ein Patch auf einem nicht gemergten Vorgänger auf, wird die Kettenreihenfolge
   ausdrücklich benannt

---

## Explizit nicht in diesem Sprint

- Live-Mitlesen (architektonisch ausgeschlossen, Designnotiz §9)
- Zuhörposition im gemeinsamen Raum (geprüft, verworfen)
- Slice-4-Notiz-Nachtrag (I10-Auslegung, zweiter Artefakt-Typ, Wegfall des
  Sofort-Pfads beim Owner-Trigger) — eigener, reiner Dokumentations-Vorgang
- Engine-Wächter für den Freigabe-Ort (Block vor `[CLOSE SESSION]` → eine
  SYSTEM-REVISION, analog Urteils-/Aufdeck-Wächter) — eigene Entscheidung
- Empfänger-seitige Agenda-Hebung eines Ausschnitts (bestehender Mechanismus,
  ungeprüft für den neuen Typ — Backlog)
