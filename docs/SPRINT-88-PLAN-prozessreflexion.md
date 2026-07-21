# Sprintplan S88 — Prozessreflexion: eigener Raum, klarere Themenfrage

**Basis:** `origin/main` **nach S87** (Raumtrennung) — S87 fasst `show()` an, S88 erweitert `screens`;
die Reihenfolge ist zwingend, nicht bloß empfohlen.
**Quelle/Anlass:** Findings F1 (*„Panel taucht unter dem Regal auf?"*) und F2 (*„Wie kommt es zu dieser
Frage?"*) aus dem Trockenlauf Prozessreflexion.
**Patch (geplant):** `patch-s88-prozessreflexion-raum-und-themenfrage.mjs` · schreibt `docs/SPRINT-88-PROTOKOLL.md`

> **Entscheidungen liegen vor:** **K1 = eigener Raum** · **K2 a) `(AG1)` raus** · **K2 c)** Wortlaut wird
> geschärft. Offen ist nur die **Freigabe der konkreten Formulierungen** (§ 3) — dort weiche ich in einem
> Punkt begründet von der Vorgabe „entweder … oder" ab.

---

## 1 · Ausgangslage (belegt)

### F1 — die Prozessreflexion hat keinen Ort

Reihenfolge im DOM von `scrMyRoom` (`core/ui/app.js` Z. 130–157):

```
scrMyRoom
├── Karte  Titel + Wegweiser
├── pb-zwei pb-mitte
│   ├── Karte  btnEinzel + Sub  ·  btnMess + Sub      ← AUSLÖSER (Aktionskarte)
│   └── Karte  btnSolo  + Sub
├── pb-card pb-reihe  „Mein Weg" + btnZeitleiste      ← Regal-Reihe
├── boxZeitleiste (hidden)
├── boxMess       (hidden)                            ← PANEL öffnet HIER
└── boxRecovery, Zurück
```

Der Widerspruch ist strukturell. Der S44-Kommentar in `wendeLageAn` sagt ausdrücklich, die Prozessreflexion
trete *„an die **STELLE der Auftragsklärung** (nicht in die Regal-Reihe)"* — `btnMess` ersetzt `btnEinzel`
in der Aktionskarte. Das Panel liegt aber im Regal-Block, sogar mit Verdrängungslogik gegen die Zeitleiste
(`INFO_GRUPPEN.scrMyRoom = ["boxZeitleiste", "boxMess"]`). Jede andere Handlung der App öffnet einen Raum;
die Prozessreflexion war die einzige, die als Regalklappe erschien — auf dem Handy unter der Falz.

### F2 — woher die Frage kam

| Schritt | Ort | Was passiert |
|---|---|---|
| 4 | `zeigeMess()` Z. 1427–1433 | Filter `status === "active" && art === "shared"` → je **gemeinsamem** Ziel ein Regler |
| 3 | `i18n/de.js` · `mess.fit` | `"Wie gut passt „{text}" ({id}) gerade zu euch? (1–10)"` — `{id}` ist die interne Wire-ID |
| 2 | `bstate.goals.items[0]` | `{ id: "AG1", art: "shared", status: "active", text: "Ein fester gemeinsamer Abend pro Woche, nur für uns." }` |
| 1a | **Trockenlauf** — `dev-panel.js` Z. 164–168 | `baueMockdaten()` seedet genau dieses Ziel. **Das war die Quelle im beobachteten Lauf** — niemand hatte es vereinbart. |
| 1b | Echtbetrieb — `kernwetten.js` Z. 163–184 | Der `CLARIFICATION-BLOCK` legt `sharedGoal` (nur bei `confirmedByBoth`) als `AG`+seq an |

Zwei echte Mängel: die **Wire-ID mitten im Satz**, und ein Fragesatz, der nicht sagt, worum es geht.

---

## 2 · B1 · Eigener Raum für die Prozessreflexion *(F1)*

**Änderungen** (`core/ui/app.js`):

```html
<div id="scrProzess" class="pb-hidden">
  <div class="pb-card" style="padding:18px 26px">
    <div style="font-size:16px;font-weight:650;margin-bottom:4px">${t("prozess.titel")}</div>
    <p class="pb-sub" style="margin:0">${t("prozess.intro")}</p>
  </div>
  <div class="pb-card" id="boxMess"></div>
  <div class="pb-reihe" style="padding:10px 0 0">
    <button class="pb-btn" id="btnZurueck3">${t("allg.zurueck")}</button>
  </div>
</div>
```

- `screens` → `[..., "scrProzess"]` (S87-Wechselwirkung: `show()` baut dabei die Chat-Oberfläche ab —
  gewollt und geprüft).
- `INFO_GRUPPEN.scrMyRoom` → nur noch `["boxZeitleiste"]`; `boxMess` verlässt die Verdrängungsgruppe.
- `btnMess` → `betrete("scrProzess")` + `zeigeMess()` statt `infoToggle("boxMess", …)`.
- `btnZurueck3` → `betrete("scrMyRoom")`.
- `zeigeMess()` verliert `zeigeNur(...)` und das `remove("pb-hidden")` — die Karte lebt jetzt in ihrem Raum.
- `aktualisiereWegweiser` hat für `scrProzess` keinen `boxId` und kehrt früh um; `wendeLageAn` ebenso.
  **Bewusst kein Wegweiser im neuen Raum** — er hat genau eine Handlung.

**Unverändert:** Sichtbarkeitsregel (`btnMess` erst nach gelaufener Auflösung), Rhythmus-Sektion bleibt in
der Agenda („Weitere Absprachen", S44), `weg.messOffen` / `weg.messBereit` bleiben wortgleich gültig
(beide verweisen auf „deinen Raum", von dem aus der neue Raum erreicht wird).

**Neue i18n-Schlüssel:** `prozess.titel`, `prozess.intro` (de + en).

---

## 3 · B2 · Themenfrage: ID raus, Sache klar *(F2 — Formulierungen zur Freigabe)*

### Begründete Abweichung von „entweder … oder"

Die Vorgabe lautete: *entweder* ein Einleitungssatz *oder* eine exaktere Frage. Ich schlage **beides** vor,
weil sie zwei verschiedene Fragen beantworten — und weil K1 den Platz dafür überhaupt erst schafft:

- Der **Einleitungssatz** beantwortet *warum werde ich das gefragt* (Ziele verschieben sich). Er steht
  **einmal** in der Kopfkarte des neuen Raums und kostet im Formular nichts.
- Die **geschärfte Frage** beantwortet *was bewerte ich hier eigentlich*. Sie wiederholt sich je Thema.

Im alten Klapp-Panel wären beide zusammen wortreich gewesen. Im eigenen Raum ist die Kopfkarte ohnehin da.
Wenn du bei „entweder/oder" bleiben willst: ich nehme dann die **geschärfte Frage** allein — sie trägt den
Mangel „macht nicht klar worum es geht" direkter.

### Vorschlag (de)

**`prozess.intro`** — Kopfkarte des Raums, deine Formulierung zu Ende geführt:

> In eurer gemeinsamen Entwicklung verschieben sich Ziele und Themen manchmal unterwegs.
> Diese Runde schaut nach, wo ihr gerade steht — verdeckt; aufgedeckt wird gemeinsam.

**`mess.fit`** — deine geschärfte Frage, ohne Wire-ID:

> Wie genau trifft das Thema „{text}" euren aktuellen Entwicklungsfokus? (1–10)

Das Wort **Thema** ist bereits etabliert: die Agenda gruppiert unter `agenda.gruppeAuftraege` =
*„Entwicklungsthemen / Ziele"*. **Entwicklungsfokus** ist neu, liegt aber im vorhandenen Register
(„Wo wünschst du dir Entwicklung …" in `mein.einzelSub`).

**Optional, zur Entscheidung:** eine kleine Gruppenzeile über den Themenreglern — *„Eure gemeinsamen
Themen"*. Kostet eine Zeile und beantwortet stillschweigend, warum individuelle Ziele hier nicht
auftauchen. Ohne sie bleibt das ungesagt.

### Vorschlag (en, Parität)

- `prozess.intro`: *In your shared development, goals and themes sometimes shift along the way. This round
  looks at where you stand right now — concealed; the reveal happens together.*
- `mess.fit`: *How closely does the theme “{text}” match your current development focus? (1–10)*

### Was **nicht** angefasst wird

Der Wire bleibt unberührt: `formatiereMessrunde` liefert weiter `„Auftrags-Passung: AG1: Anna 7 · Bernd 4"`,
das `fit`-Objekt bleibt ID-geschlüsselt (`{ AG1: 7 }`), die Agenda-Unterzeile zeigt die ID weiter als
Referenz. **Die ID verschwindet nur aus dem Satz an Menschen.** (Wire-Anglisierung bleibt S31.)

Meinen früheren Vorschlag einer separaten *Herkunfts*-Zeile („aus eurer Auflösung") lasse ich fallen —
dein Einleitungssatz erledigt das Anliegen besser, und eine dritte Zeile wäre zu viel.

---

## 4 · Schritte

| Schritt | Inhalt | Abgeschlossen prüfbar durch |
|---|---|---|
| **S1** | Raum `scrProzess`: Gerüst, Navigation, `INFO_GRUPPEN`, `zeigeMess` entkoppelt | Navigations- und Rendertests, ohne Textänderung |
| **S2** | Wortlaut: `mess.fit` ohne ID, `prozess.titel`/`prozess.intro`, optionale Gruppenzeile | Textprüfungen + Paritätstest, ohne Navigationsänderung |

S1 und S2 sind unabhängig grün zu bekommen; S2 setzt inhaltlich auf S1 auf (die Kopfkarte entsteht dort).

## 5 · Tests

**Neu** — `tests/unit/s88-prozessreflexion-raum.spec.js`
1. `btnMess` öffnet `scrProzess`; `scrMyRoom` ist verborgen.
2. Zurück führt nach `scrMyRoom` (nicht auf den Startscreen).
3. Zweites Betreten rendert **frisch** — Nachfolger des heutigen Toggle-Tests: keine Reste der letzten Runde.
4. `boxMess` ist kein Geschwister der Regal-Reihe mehr; die Zeitleiste verdrängt es nicht.
5. Sichtbarkeitsregel unverändert: `btnMess` bleibt verborgen, solange keine Auflösung gelaufen ist.
6. Fragetext enthält den Thementext, **nicht** `AG1`.
7. Einleitungssatz steht in der Kopfkarte des Raums.
8. Individuelle Ziele (`art: "individual"`) erzeugen weiterhin **keinen** Regler.
9. Abgabe schreibt `fit` weiterhin unter der ID (`{ AG1: 7 }`) — Wire unberührt.
10. Gesperrtes Fenster (`mess.gesperrt`) und „bereits abgegeben" (`mess.abgegeben`) rendern im neuen Raum.

**Semantisch treu anzupassen:** `prozess-qz.spec.js` (Z. 65–80: Toggle → Betreten/Verlassen),
`s39-kontext-rhythmus.spec.js` (Z. 151–161, dito), `s38-board-nachklang.spec.js` (Z. 156–158: Navigation
vor dem Klick auf `#msOk`). **Voraussichtlich unberührt** (prüfen, nicht annehmen): `s36-ui.spec.js`
Z. 109–110, `s44-feinschliff.spec.js` Z. 217–229, `s53-wiedereinstieg.spec.js` Z. 78 — sie prüfen den
**Knopf**, nicht das Panel.

## 6 · Verifikation

1. Frischer Klon von `origin/main` **mit gemergtem S87**, Basis-Commit protokolliert
2. Voller Testlauf grün · `npm run build` → Kern-Hash ins Protokoll
3. Patch auf frischem Klon: dry-run → apply → Idempotenz → Byte-Vergleich → Tests → Build
4. i18n-Kanarie und `parity.spec.js` explizit grün (keine harten deutschen Literale in `app.js`)
5. **S87-Spurenkanarie** muss mit dem neuen Screen weiter grün sein

## 7 · Eval-Kadenz (S66)

- [x] UI-Verhalten berührt → Selbstfahrt + `tests/e2e/` (fassen `btnMess`/`boxMess` heute nicht an — geprüft)
- [ ] `core/prompts/*` berührt → **nein.** Der Korpus-Schlüssel `mess.fit` („Auftrags-Passung: ") ist der
      **Wire**-Text für den Momentkontext und bleibt unverändert; geändert wird nur der gleichnamige
      **i18n**-Schlüssel. Beim Patchen nicht verwechseln.
- [ ] Szenarien-Katalog / Judge berührt → **nein**

## 8 · Nicht im Scope

- Rhythmus-Sektion bleibt in der Agenda (S44). Eine Nur-Lese-Zeile „Euer Rhythmus: …" im neuen Raum wäre
  denkbar — bewusst zurückgestellt, `mess.gesperrt` nennt ihn bereits im Sperrfall.
- Mockdaten in `dev-panel.js` bleiben unverändert; F2 ist keine Änderung an den Seeds.
- Wire-Anglisierung (S31): `AG1`/`AI2` und die Feldnamen bleiben.
