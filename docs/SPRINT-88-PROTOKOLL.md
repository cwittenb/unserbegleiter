# Sprint S88 — Prozessreflexion: eigener Raum, klarere Themenfrage

**Basis:** `origin/main` @ `b1aa856` **plus angewendeter S87-Patch** (`patch-s87-raumtrennung-chatoberflaeche.mjs`) — S87 ist zwingender Vorgänger: S88 erweitert die `screens`-Liste und nutzt das S87-`show()` (der Wechsel in den neuen Raum baut dabei die Chat-Oberfläche ab, gewollt). · **Kern-Hash nach Build:** `153b53a3dde0cb0f`
**Quelle/Anlass:** Findings F1 („Panel taucht unter dem Regal auf?") und F2 („Wie kommt es zu dieser Frage?") aus dem Trockenlauf Prozessreflexion. F1 war strukturell: `btnMess` sitzt seit S44 als Handlung in der Aktionskarte, sein Panel lag aber als Klappe im Regal-Block (inkl. Verdrängungslogik gegen die Zeitleiste) — auf dem Handy unter der Falz. F2: Die Frage trug die interne Wire-ID (`AG1`) im Satz, und im Panel fehlte jeder Rahmen, worauf sich die Regler beziehen.
**Patch:** `patch-s88-prozessreflexion-raum-und-themenfrage.mjs`

## Entscheidungen (Klärungsfragen)

| # | Entscheidung |
|---|---|
| K1 | **Eigener Raum** (`scrProzess`) — kein Modal, keine bloße Umplatzierung. Jede Handlung der App hat einen Raum; die Prozessreflexion war die einzige Regalklappe. |
| K2 a | `(AG1)` verschwindet aus dem Satz an Menschen; **Wire unberührt** (`data-pass`, `fit`-Objekt, `formatiereMessrunde`, Agenda-Referenz behalten die IDs). |
| K2 b/c | **Beides** (begründete Abweichung von „entweder/oder", freigegeben): Einleitungssatz einmal in der Kopfkarte (*warum werde ich das gefragt*), geschärfte Frage je Thema (*was bewerte ich*). Formulierungen als Richtschnur, nicht wörtlich bindend. Gruppenzeile „Eure gemeinsamen Themen" über den Themen-Reglern: **ja** — sagt implizit, warum individuelle Ziele fehlen. |

## Änderungen

**Neuer Screen (`core/ui/app.js`).** `scrProzess` als fünfter Screen: Kopfkarte (`prozess.titel` + `prozess.intro`), darunter `boxMess` als Rauminhalt (nicht mehr `pb-hidden`-Klappe), Zurück-Knopf `btnZurueck3` → `scrMyRoom`. `screens`-Liste erweitert; `INFO_GRUPPEN.scrMyRoom` → nur noch `["boxZeitleiste"]` (die Verdrängungslogik fasst `boxMess` nicht mehr an). `btnMess` → `betrete("scrProzess")` + `zeigeMess()`; `zeigeMess` verliert `zeigeNur`/Toggle und rendert bei jedem Betreten frisch. `aktualisiereWegweiser` kehrt für `scrProzess` strukturell früh um (kein `boxId`-Mapping) — bewusst kein Wegweiser im neuen Raum, er hat genau eine Handlung. Sichtbarkeitsregel unverändert (`btnMess` erst nach gelaufener Auflösung, S44); `weg.messOffen`/`weg.messBereit` bleiben wortgleich gültig.

**Themenfrage (`core/i18n/de.js` / `en.js`, `zeigeMess`).**
- `mess.fit` (de): „Wie genau trifft das Thema „{text}" euren aktuellen Entwicklungsfokus? (1–10)" — ohne `{id}`. (en analog: *How closely does the theme “{text}” match your current development focus?*)
- Neu `prozess.titel`, `prozess.intro` (de: „In eurer gemeinsamen Entwicklung verschieben sich Ziele und Themen manchmal unterwegs. Diese Runde schaut nach, wo ihr gerade steht — verdeckt; aufgedeckt wird gemeinsam."), `mess.gruppeThemen` („Eure gemeinsamen Themen") — Gruppenzeile erscheint nur bei mindestens einem aktiven gemeinsamen Ziel.
- „Thema"/„Entwicklungsfokus" liegen im etablierten Register (Agenda-Gruppe „Entwicklungsthemen / Ziele", `mein.einzelSub`).
- **Nicht angefasst:** der gleichnamige **Korpus**-Schlüssel `mess.fit` („Auftrags-Passung: …") — Wire-Text für den Momentkontext; die i18n/Korpus-Namensdopplung war der benannte Fallstrick.

## Tests

**Neu:** `tests/unit/s88-prozessreflexion-raum.spec.js` — 9 Tests: Öffnen/Zurück-Navigation (`scrProzess` ↔ `scrMyRoom`, nicht Start); frisches Rendern beim Wiederbetreten (verstellter Regler überlebt nicht); `boxMess` kein Geschwister der Regal-Reihe mehr + Zeitleiste verdrängt nicht; Sichtbarkeitsregel ohne Auflösung; Fragetext mit Thementext + „Entwicklungsfokus", ohne `AG1`, mit Gruppenzeile; Einleitungssatz in der Kopfkarte; individuelle Ziele erzeugen keinen Regler und keine Gruppenzeile; Abgabe schreibt `fit` unter der ID (`{ AG1: 7 }`) — Wire unberührt; Sperr-/Abgegeben-Zustand rendert im neuen Raum.
**Semantisch treu angepasst:** `prozess-qz.spec.js` und `s39-kontext-rhythmus.spec.js` (S35-Toggle → Raum verlassen/wiederbetreten; geprüft bleibt dieselbe Semantik: erneutes Öffnen rendert frisch bzw. zeigt „abgegeben"). **Unverändert grün** (verifiziert, nicht angenommen): `s38-board-nachklang.spec.js`, `s36-ui.spec.js`, `s44-feinschliff.spec.js`, `s53-wiedereinstieg.spec.js` — sie prüfen den Knopf, nicht das Panel.

## Verifikation

- Voller Testlauf **grün**: **1140 Tests / 136 Dateien** (Basis nach S87: 1131 + 9 neue)
- Build: `npm run build` · Kern-Hash `153b53a3dde0cb0f`
- i18n-Kanarie + `parity.spec.js` explizit grün (neue Schlüssel de/en paritätisch; keine harten deutschen Literale in `app.js`)
- S87-Kanarien (Spuren/Hülle/Nachzügler) mit dem neuen Screen weiter grün
- Patch auf frischem Klon **mit angewendetem S87**: dry-run → apply → Idempotenz → Byte-Vergleich → Tests → Build

## Eval-Kadenz (S66)

- [x] **UI-Verhalten berührt** → `tests/e2e/` + Selbstfahrt laufen mit (fassen `btnMess`/`boxMess` nicht an — geprüft; Journeys 3/3 grün)
- [ ] `core/prompts/*` berührt → **nein** (nur i18n; der Korpus-`mess.fit` blieb unangetastet)
- [ ] Szenarien-Katalog berührt → nein
- [ ] Judge berührt → nein
- [ ] Release-Gate → nicht Teil dieses Sprints

## Notizen

- Der neue Raum trägt bewusst keinen eigenen Wegweiser und keine Rhythmus-Sektion — der Rhythmus bleibt in der Agenda („Weitere Absprachen", S44); `mess.gesperrt` nennt ihn im Sperrfall.
- Zurückgestellt (S89/S90): Aufdeck-Rückkopplung (`[[META-REVEALED]]`), Nachzügler-Einspeisung, Copy-Fix `mess.bereit`, Designnotiz Datenflüsse.
