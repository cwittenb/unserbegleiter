# Sprintplan S60 — Mockdaten-Auffrischung Dev-Panel (Wire-Angleichung)

**Basis:** `origin/main` @ `f13aa84` (patch-s59-linearer-pfad-auftragsklaerung)
**Betroffene Datei (Produktcode):** ausschließlich `platforms/artifact/dev-panel.js`
**Betroffene Tests:** `tests/unit/dev-panel.spec.js` (Erweiterung), ggf. `tests/unit/s59-linearer-pfad.spec.js` (nur falls Assertions auf Alt-Felder zeigen — Prüfung in P0)

## Anlass

Die Mockdaten (`baueMockdaten`, Szenen) sind hinter der Wire-Anglisierung (S31a)
und den Sprints S42/S43 (Aufdeckung/Auflösung) zurückgeblieben. Folge: Aufträge
sind in allen Ansichten unsichtbar (Filter auf `status:"active"` greifen bei
`"aktiv"` nicht), Momente/Zeitleiste rendern leer bzw. `undefined`, und die
Szenen „freigaben-da"/„betrieb" bilden im echten Fluss unmögliche Zustände ab
(freigegebener Chat ohne `minigate`, Auflösung ohne `reveal`).

## Schritte (in sich abgeschlossen, je Schritt testbar)

### P0 · Bestandsaufnahme absichern (nur Tests, kein Produktcode)
Kanarienvogel-Test: `baueMockdaten()` wird gegen die heutigen Verträge geprüft —
`uebergabeSchema` auf beide Handover, `befundSchema` auf `findings`,
Feld-Existenz-Checks (`status:"active"`, `summary`, `topics`, `wish`,
`reveal.A.guess3`). Erwartung: rot vor P1, grün nach P1–P4. Damit ist die
Drift künftig strukturell bewacht statt nur einmalig repariert.

### P1 · goals & findings auf Wire-Schema heben
- goals-Items: `art:"shared"/"individual"`, `status:"active"`, `baseline`
  statt `startwerte`, `createdAt`; `vonBeidenBestaetigt` entfällt (lebt im
  Änderungs-Block, nicht im gespeicherten Item).
- `findings` nach `befundSchema`: `findings[]`, `triangulation{proposed,
  confirmed,adjusted,declined}`, `sharedGoal{text,confirmedByBoth,baseline}`,
  `individualGoals[]`, `misalignedAssumptions{present}`, `closingCheck[{person,value}]`.
  Inhaltlich 1:1 die bisherige Demo-Geschichte (Anna/Bernd, fester Abend).
**Test:** Schema-Validierungen aus P0 grün; Filter `status==="active"` findet AG1/AI2.

### P2 · momentLog / timeline / shelf / agenda Feldnamen
- momentLog-Eintrag: `summary`, `topics`, `gentleInvitation`.
- pstate-timeline-Einträge: `{at, topics, summary}` (Demo-Inhalt erhalten,
  auf das Format der App-Writer gebracht).
- shelf-/agenda-Items: `wunsch` → `wish`.
**Test:** Kontextbauer (`baueSoloKontext`, `baueMomentKontext`) enthalten mit
Mockdaten keinen `undefined`-Text und nennen die Demo-Summaries.

### P3 · Aufdeck-Zustand vervollständigen (reveal, minigate, revealLog)
- `bstate.reveal`: je Rolle `{name, top5, guess3, releasedAt}` — fünf bzw.
  drei plausible Demo-Werte, konsistent zur Handover-Geschichte.
- `einzelFertigChats`: `minigate:"ja"` ergänzen (freigegebener Chat ohne
  Gate-Entscheidung ist im linearen Pfad S59 unmöglich).
- Szene „betrieb": zusätzlich `revealLog {at, summary, touchingPoints,
  forClarification}` (Aufdeckung ist der Auflösung vorausgegangen);
  Szene „freigaben-da": `reveal` beide gesetzt, `revealLog` bewusst leer
  (Aufdecken steht bevor → Wegweiser-Variante „…MitAufdeck" wird erlebbar).
**Test:** `ladeLage`-äquivalente Ableitungen: „freigaben-da" → aufdeckBereit
true / aufloesungGelaufen false; „betrieb" → aufdeckGelaufen true und der
Aufdeck-Eintrag erscheint in der Momente-Ableitung.

### P4 · Handover-Stempel korrigieren
`uebergabe()` im Dev-Panel nicht mehr durch `stempel()` schicken (das
überschreibt `module:"kernwetten"` mit `"betrieb"`), sondern das Objekt direkt
bauen — identisch zu `baueUebergabe`-Ausgabe.
**Test:** `uebergabeSchema` grün UND `module === "kernwetten"`.

### P5 · Neue Szene „einseitig-frei" (meine Klärung fertig, Partner nicht)
Szene „Auftragsklärung · nur eine Freigabe liegt vor": `handover:A` +
freigegebener Einzel-Chat A (`minigate:"ja"`, `reveal.A` gesetzt), für B
weder Chat noch Handover noch `reveal.B`. Beschreibungstext nennt beide
Perspektiven (als Anna: warten auf Bernds Freigabe; als Bernd: eigene
Klärung steht an).
**Test:** Lage-Ableitungen je Rolle — als A: `handMeins` true, `handPartner`
false, `einzelFertig` true, `aufdeckBereit` false; als B: `handMeins` false,
`handPartner` true, `einzelFertig`/`einzelBegonnen` false.

### P6 · Szenen-Bestätigung reboot-fest
Befund: `createDevPanel` zeigt nach dem Setzen einer Szene bereits eine
Meldung, der direkt folgende `reboot()` baut aber die gesamte Oberfläche
(inkl. Panel) neu — die Meldung verschwindet, bevor sie sichtbar wird.
Fix im Dev-Panel: gesetzte Szene wird als „letzte Meldung" gemerkt
(modulweite Variable, kein Storage nötig) und beim nächsten Panel-Aufbau
einmalig angezeigt („Szene ‚…' eingespielt · HH:MM:SS"), danach verworfen.
Gleiches Muster für „Zustand geladen" und „Alles zurückgesetzt".
**Test:** headless — Szene anwenden, `reboot`-Callback baut Panel neu,
Meldung ist im neuen Panel-DOM enthalten; ein weiterer Neuaufbau ohne
Aktion zeigt sie nicht mehr.

### P7 · Verifikation & Lieferung
Voller Lauf `npx vitest run` (Erwartung: 637+ grün), `npm run build`,
Kern-Hash notieren (Erwartung: unverändert `3fab2f755437eabf`, da kein
`core/`-Eingriff). Patch `patch-s60-mockdaten-wire-angleichung.mjs`
(Ganzdatei-Ersetzung, SHA-256-Anker, idempotent, `--dry-run`), schreibt
`docs/SPRINT-60-PROTOKOLL.md`.

## Offene Frage (vor Umsetzung)

**F1 · Beifang-Bug außerhalb der Mockdaten:** `app.js zeigeAgenda` filtert das
Backlog mit `a.status === "rest"`, der Writer (`sessions.js`) setzt aber
`"resting"` → „ruhende Aufträge" rendern nie, auch mit korrekten Daten.
  a) in S60 mitfixen (eine Zeile in `core/ui/app.js`, Kern-Hash ändert sich,
     ein Test dazu)
  b) als eigener Merkposten in einen Folgesprint

## Selbst getroffene kleine Entscheidungen

- `minigate:"ja"` als Demo-Standard (reichhaltigere Szenen; „nein"-Pfad bleibt
  über Zustand-laden testbar).
- `findings`-Demo-Inhalt wird übersetzt/übertragen, nicht neu erfunden.
- Kein Umbau der bestehenden Szenen — nur Datenkorrektheit plus die EINE
  neue Szene aus P5.
- Szene „einseitig-frei": Partner B hat noch GAR NICHT begonnen (sauberste
  Lesart von „nicht abgeschlossen"). Eine Variante mit pausiertem B-Chat
  (Kapitel 2) wäre auf Zuruf leicht ergänzbar.
