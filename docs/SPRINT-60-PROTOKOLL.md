# Sprint S60 — Protokoll: Mockdaten-Wire-Angleichung, Szene „einseitig-frei", reboot-feste Quittung

**Basis:** `origin/main` @ `f13aa84` (patch-s59-linearer-pfad-auftragsklaerung)
**Ergebnis:** 651 Tests grün (80 Dateien) · Build-Kern-Hash `04053f84807a3e5c`
**Plan:** `SPRINT-60-PLAN.md` (genehmigt inkl. F1 = Variante a)

## Anlass

Die Dev-Panel-Mockdaten (`platforms/artifact/dev-panel.js`) waren hinter der
Wire-Anglisierung (S31a) und den Sprints S42/S43 zurückgeblieben. Sichtbare
Folgen: Aufträge in allen Ansichten unsichtbar (Filter `status:"active"`
griffen bei `"aktiv"` nicht), Momente/Zeitleiste renderten leer bzw.
`undefined`, und die Szenen „freigaben-da"/„betrieb" bildeten im linearen
Pfad (S59) unmögliche Zustände ab (freigegebener Chat ohne `minigate`,
Auflösung ohne `reveal`). Dazu zwei Nutzerwünsche: eine sichtbare Bestätigung
nach dem Einspielen einer Szene und der Zustand „meine Auftragsklärung ist
abgeschlossen, die des Partners nicht".

## Umsetzung

### P1 · goals & findings auf Wire-Schema
- goals-Items: `art:"shared"/"individual"`, `status:"active"`, `baseline`
  (Namens-Keys), `createdAt`, `owner` als Name; `seq:2` ergänzt, damit
  künftige Neu-Aufträge korrekt AG3/AI3 nummerieren (Writer-Kompatibilität).
- `findings` nach `befundSchema`: `findings[]` (mit `item/owner/source/
  importance/dealbreaker/ownReasoning`), `triangulation{proposed,confirmed,
  adjusted,declined}`, `sharedGoal{text,confirmedByBoth,baseline}`,
  `individualGoals[{person,text,wish}]`, `compatibility`,
  `misalignedAssumptions{present,status}`, `concerns{…}`,
  `closingCheck[{person,value,keySentence}]`. Demo-Geschichte (Anna/Bernd,
  fester Abend) inhaltlich 1:1 übertragen; Namen dynamisch aus `meta`.

### P2 · momentLog / timeline / shelf / agenda
- momentLog-Eintrag: `summary/topics/gentleInvitation` (vorher
  `zusammenfassung/themen/zwischenzeitImpuls`).
- pstate-timeline: `{at, topics, summary}` (vorher `{at, text}`).
- shelf-/agenda-Items: `wunsch` → `wish`.

### P3 · Aufdeck-Zustand vervollständigt
- Neuer Export `baueReveal(meta)`: je Rolle `{name, top5, guess3, releasedAt}`
  mit echten Domänen-Polen (Nähe, Verlässlichkeit & Verbindlichkeit, …),
  konsistent zur Handover-Geschichte.
- `einzelFertigChats`: `minigate:"ja"` — ein freigegebener Chat ohne
  Gate-Entscheidung ist im linearen Pfad unmöglich.
- Szene „betrieb": `reveal` beider Seiten UND `revealLog {at, summary,
  touchingPoints, forClarification}` (Aufdeckung ging der Auflösung voraus)
  → `aufdeckGelaufen` true, der Aufdeck-Eintrag erscheint in den Momenten.
- Szene „freigaben-da": `reveal` beider Seiten gesetzt, `revealLog` bewusst
  leer → `aufdeckBereit` true, Wegweiser-Variante „…MitAufdeck" erlebbar.
  Betriebszustand bleibt leer (`goals` weiterhin null — bestehender Test).

### P4 · Handover-Stempel korrigiert
`uebergabe()` läuft nicht mehr durch `stempel()` (das überschrieb
`module:"kernwetten"` per Spread-Reihenfolge mit `"betrieb"`), sondern baut
das Objekt direkt — identisch zur `baueUebergabe`-Ausgabe (Vertrag 3).

### P5 · Neue Szene „einseitig-frei"
„Auftragsklärung · nur eine Freigabe liegt vor": Handover A + freigegebener
Einzel-Chat A (`minigate:"ja"`) + `reveal.A`; für B bewusst NICHTS (kein
Chat, kein Handover, `reveal.B = null`). Beschreibung nennt beide
Perspektiven (als Anna: warten; als Bernd: eigene Klärung steht an).

### P6 · Szenen-Quittung reboot-fest
Befund bestätigt: `createDevPanel` zeigte nach dem Setzen einer Szene bereits
eine Meldung — der direkt folgende `reboot()` baut aber die gesamte
Oberfläche inkl. Panel neu, die Meldung verschwand ungesehen. Fix: exportierte
`quittung { text }` mit Modul-Lebensdauer (reboot läuft im selben JS-Kontext);
die Klick-Handler für Szenen, „Zustand laden" und „Alles zurücksetzen" setzen
sie vor dem reboot, der nächste Panel-Aufbau zeigt sie einmalig an
(„Szene ‚…' eingespielt · HH:MM:SS") und verwirft sie.

### F1a · Beifang-Bug Backlog-Filter (genehmigt: mitfixen)
`core/ui/app.js zeigeAgenda` filterte das Backlog mit `a.status === "rest"`,
der Writer (`sessions.js`, op `rest`) speichert aber `"resting"` — das
Backlog „ruhende Aufträge" konnte nie rendern. Filter auf `"resting"`
korrigiert; der Seed in `tests/unit/s43-aufloesung.spec.js` wurde semantisch
treu auf den Writer-Wert `"resting"` gehoben (der alte Seed `"rest"` testete
gegen den Bug). Einziger `core/`-Eingriff des Sprints → Kern-Hash-Änderung.

## Tests

Neu: `tests/unit/s60-mockdaten.spec.js` (14 Tests) — Kanarienvogel gegen
künftige Mockdaten-Drift:
- Handover gegen `uebergabeSchema` + `module === "kernwetten"`;
- `findings` gegen `befundSchema`, `revealLog` gegen `aufdeckSchema`;
- goals-Filter (`status === "active"`) findet beide Demo-Aufträge;
- Feldnamen-Checks (summary/topics/gentleInvitation/wish);
- Kontextbauer (`baueSoloKontext`, `baueMomentKontext`, `baueAufdeckKontext`)
  erzeugen mit den Mockdaten keinen `undefined`-Text;
- Szenen-Zustandsraum: freigaben-da (aufdeckBereit), betrieb (aufdeckGelaufen),
  einseitig-frei (Lage-Ableitungen je Rolle);
- Quittung: überlebt den Panel-Neuaufbau, einmalig, danach leer;
- Grep-Wächter: app.js-Filter und sessions.js-Writer nutzen denselben
  Statuswert `"resting"`.

Angepasst: `tests/unit/s43-aufloesung.spec.js` (Seed `"rest"` → `"resting"`).
Unverändert grün: `dev-panel.spec.js`, `s59-linearer-pfad.spec.js` (D4-Tests
decken die erweiterten Chats mit ab).

## Verifikation

- `npx vitest run`: **651 grün / 80 Dateien** (Basis: 637/79).
- `npm run build`: Artefakt + Cloudflare + Eval-Artefakt, Kern-Hash
  `04053f84807a3e5c` (Änderung durch F1a erwartet und im Plan als Bedingung
  der Variante a benannt).

## Bewusst NICHT gebaut

- Variante der Szene „einseitig-frei" mit pausiertem B-Chat (Kapitel 2) —
  auf Zuruf leicht ergänzbar (kleine Entscheidung, dokumentiert im Plan).
- Kein Umbau weiterer Szenen, keine i18n der Dev-Panel-Texte (Panel ist
  bewusst deutschsprachiges Entwickler-Werkzeug außerhalb der Korpus-Regeln).
