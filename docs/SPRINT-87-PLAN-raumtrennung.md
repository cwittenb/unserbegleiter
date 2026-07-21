# Sprintplan S87 — Raumtrennung der Chat-Oberfläche (harte Variante)

**Basis:** `origin/main` @ `b1aa856` (*patch-ap-domain-app-subdomain*) — frischer Klon
**Baseline verifiziert:** **1116 Tests / 133 Dateien grün** · Kern-Hash `7cab2a4ed03e4622`
**Quelle/Anlass:** Finding F3 (Ankommens-Menü aus dem gemeinsamen Raum erscheint im eigenen Raum) und die
daraus folgende Audit-Frage: *„Es muss sichergestellt sein, dass niemals etwas aus dem Einzelraum im
gemeinsamen Raum angezeigt wird und umgekehrt."*
**Patch (geplant):** `patch-s87-raumtrennung-chatoberflaeche.mjs` · schreibt `docs/SPRINT-87-PROTOKOLL.md`

> **Entscheidungen liegen vor:** harte Variante (Oberfläche wird abgebaut und neu gebaut; Betreten darf
> Zeit kosten) · **K3 b)** Entwurf im Arbeitsspeicher je Session, nie im Speicher.
> **S88 (Prozessreflexion) baut auf diesem Sprint auf** — S87 fasst `show()` an, S88 fügt einen Screen hinzu.

---

## 1 · Zielinvariante

> **Außerhalb ihres Raums ist eine Session nirgends erreichbar** — nicht sichtbar, nicht im DOM, nicht als
> laufender Nebeneffekt, und nicht über einen Nachzügler, der später zurückkommt.

Der Zusatz nach „nicht im DOM" ist der Teil, den ein reines Ausblenden nicht leistet; der Zusatz nach
„Nebeneffekt" der, den auch ein reines Leeren nicht leistet. Beides ist unten belegt.

## 2 · Belegte Rückstände (alle im aktuellen Stand reproduziert)

| # | Rückstand | Beleg / Fundstelle |
|---|---|---|
| R1 | **`kwPanel` / `gatePanel`** überleben den Raumwechsel — sichtbar **und** klickbar. Die Handler halten die **alte** `engine`; `kapitelPanel` und `aufdeckTafel` lesen `state.chatShared` erst beim Klick, hätten also den Inhalt der geteilten Sitzung in den privaten Slot geschrieben. | `app.js` Z. 730/1503 · reproduziert (Ankommens-Menü der Qualitätszeit in der Soloreflexion) |
| R2 | **`pbInput` — der ungesendete Entwurf.** Privat getippt, nicht abgeschickt, Raum verlassen → steht im Composer des gemeinsamen Raums, auf den beide gemeinsam schauen. | reproduziert: `pbInput im gemeinsamen Raum: "Ich habe Angst, dass er mich verlässt."` |
| R3 | **`pbErr` / `pbHint` liegen außerhalb aller Screens** (Elternteil `#app`). `err("")` läuft nur im Kopf von `startChat`, nie beim Verlassen. | reproduziert: `pbErr im gemeinsamen Vorraum sichtbar: true` |
| R4 | **`pbMsgs` / `chatTitel`** bleiben nach dem Verlassen bestückt (verborgen, aber im DOM — Accessibility-Baum, Screenreader, jeder künftige Pfad, der `scrChat` vor `renderMsgs` zeigt). | reproduziert: `pbMsgs nach Verlassen: "Vertraulich: dein Solo-Text."` |
| R5 | **Laufendes Diktat.** `rec` ist eine Closure-Variable der App, kein Kind von `scrChat`. Wer beim Diktieren den Raum wechselt, diktiert weiter — und `onresult` schreibt in `$("pbInput")`, also ins Eingabefeld des **neuen** Raums. | `app.js` Z. 1787–1823 |
| R6 | **Nachzügler.** Eine noch laufende Antwort der alten Session ruft `onDelta → zeigeStream` und `onRender → renderMsgs`. `zeigeStream` prüft nur `if (!box) return` — und `pbMsgs` existiert nach dem Betreten des nächsten Raums wieder. Der Strom der privaten Sitzung landet dann in der Nachrichtenliste des gemeinsamen Raums. | `app.js` Z. 564–576, Hook-Verdrahtung Z. 968–978 |

**Was bereits strukturell trägt (zur Kalibrierung):** Die **Speicher**grenze ist echt. Zwei Namensräume
(`_shared` / `_priv`, in Cloudflare serverseitig getrennte KV-Räume), Key-Wissen ausschließlich in
`repo.js`, und ein Grep-Wächter in `repo.spec.js`, der den Lauf rot färbt, sobald irgendwo sonst in `core/`
ein Key-Literal auftaucht. Die **Anzeige**grenze hatte bisher nichts dergleichen: `scrChat` ist *ein*
Screen für alle Sessions, die Trennung ruhte auf der Konvention „jeder Schreiber überschreibt sein eigenes
Feld". Genau diese Konvention wird hier in eine erzwungene Invariante überführt.

---

## 3 · Lösungsform

`scrChat` bleibt im Grundgerüst als **leere Hülle**. Die Chat-Oberfläche entsteht beim Betreten aus einer
Vorlage und wird beim Verlassen restlos abgebaut. Alle Listener hängen an Knoten, die dann nicht mehr
existieren — eine stehengebliebene Closure hat kein Ziel mehr. Dazu eine **Generationsmarke** gegen alles,
was aus der alten Session noch zurückkommt.

Der Engpass ist bereits vorhanden: `show()` wird von genau **zwei** Stellen gerufen (`betrete()` Z. 451,
`startChat()` Z. 980). Jede Navigation läuft dort durch — es gibt keinen Umweg.

```js
function show(id) {
  if (id !== "scrChat") raeumeChatOberflaeche();   // Raumtrennung: die Fläche gehört zur Session
  state.screen = id;
  for (const s of screens) $(s).classList.toggle("pb-hidden", s !== id);
}
```

**Bewusst NICHT gewählt:** ein Zurücksetzen einzelner Felder. Es hätte R1–R4 gefasst, R5/R6 nicht — und die
Zusicherung bliebe eine Liste, die beim nächsten neuen Feld still veraltet.

---

## 4 · Schritte

Jeder Schritt ist in sich abgeschlossen, einzeln testbar und einzeln zurückrollbar. Reihenfolge zwingend:
T1 legt die Form, T2 ist der eigentliche Zaun.

### T1 · Vorlage, Abbau, Aufbau, Verdrahtung

**Änderungen** (`core/ui/app.js`):
- `CHAT_HTML()` als **Funktion** (nicht Konstante): liest `t(...)` erst beim Bauen. Nebeneffekt, den wir
  mitnehmen: ein Sprachwechsel schlägt jetzt auch auf eine bereits einmal gebaute Chat-Oberfläche durch.
- `baueChatOberflaeche()` — `$("scrChat").innerHTML = CHAT_HTML()`, danach `verdrahteChat()`.
- `verdrahteChat()` — bindet die **sieben** Bedienelemente neu: `btnSend`, `pbInput` (keydown),
  `btnMic`, `pbSkalaRange` (input), `pbSkalaSend`, `btnChatEnde`, `btnChatZurueck`.
  Die Verdrahtung wandert aus dem einmaligen Block bei Z. 1353–1389 / 1823 hierher.
- `raeumeChatOberflaeche()` — Reihenfolge ist wesentlich:
  1. `diktatStopp()` **zuerst** (solange `btnMic` noch existiert; die Funktion wird zusätzlich null-fest)
  2. `$("scrChat").innerHTML = ""`
  3. `err("")`, `hint(null)`
  4. `state.engine = state.chatId = state.chatShared = state.streamText = state.herkunft = null;`
     `state.warten = false`
- Null-Festigkeit für die Renderpfade auf leerer Hülle: `renderMsgs`, `zeigeStream`, `zeigeAusgelastet`,
  `aktualisiereSkala`, `aktualisiereComposer`, `aktualisiereChatEnde`, `zeigeErneutSenden`, `diktatStopp`.
- `startChat()` ruft `baueChatOberflaeche()` vor `show("scrChat")`.

**Tests** — `tests/unit/s87-raumtrennung.spec.js`
1. Nach dem Verlassen ist `scrChat` **leer** (`childElementCount === 0`).
2. Betreten baut die Oberfläche neu; alle sieben Bedienelemente sind vorhanden.
3. **Verdrahtung nach Neubau:** Senden, Enter-Taste, Skala-Senden, Abschließen und Raum-Verlassen wirken
   in der *zweiten* Session genauso wie in der ersten (je eine Prüfung — vergessenes Rebinding fällt auf).
4. `boot()` (Abbau auf leerer Hülle) läuft folgenlos durch.
5. R3: `pbErr` ist nach dem Raumwechsel leer und verborgen.

### T2 · Generationsmarke gegen Nachzügler *(R6 — der eigentliche Zaun)*

Das Leeren deckt nur das Fenster, in dem man im Vorraum steht. Betritt man den nächsten Raum, existiert
`pbMsgs` wieder — eine noch laufende Antwort der **alten** Session schriebe hinein.

**Änderung:** `startChat` merkt sich `const gen = ++state.chatGen`; die an diese Session gebundenen Hooks
(`onRender`, `onDelta`, `onStatus`) und der `finally`-Zweig von `warteAntwort` kehren wortlos um,
wenn `gen !== state.chatGen`. `raeumeChatOberflaeche()` erhöht die Marke ebenfalls.
`onSave` bleibt **ungezäunt** — die alte Sitzung soll zu Ende gespeichert werden (s. Test 2).

**Tests**
1. Verzögerte Antwort der privaten Session; Raumwechsel währenddessen → **kein Token** erscheint im
   gemeinsamen Raum, `pbMsgs` bleibt bei den Nachrichten der neuen Session.
2. Der Nachzügler wird trotzdem korrekt **gespeichert** (die Sitzung geht nicht verloren) — beim
   Wiederbetreten steht die Antwort da.
3. `warteAntwort`-`finally` nach dem Wechsel wirft nicht und schaltet die neue Session nicht auf „warten".

### T3 · Entwurf im Arbeitsspeicher *(K3 b)*

**Änderung:** `state.entwuerfe = {}` (reine Closure, nie `pstate`, nie `bstate`).
Abbau: `state.entwuerfe[state.chatId] = pbInput.value` **vor** dem Leeren.
Aufbau: `pbInput.value = state.entwuerfe[art] || ""`.

**Tests**
1. Entwurf in der Soloreflexion → Raum verlassen → gemeinsamer Raum: Feld **leer** (R2).
2. Zurück in die Soloreflexion: der Entwurf steht wieder da.
3. Der Entwurf wird **nirgends persistiert** — weder `chat.save` noch `pstate`/`bstate` sehen ihn
   (Prüfung über den `MemoryStore`-Inhalt, nicht über die Fassade).
4. **Paarwechsel/`relaunch()`:** neue App-Instanz ⇒ neue Closure ⇒ kein Entwurf quert ein Paar.

### T4 · Diktat sauber abbauen *(R5)*

**Änderung:** `diktatStopp()` im Abbau (s. T1), null-fest gegen fehlendes `btnMic`.

**Tests**
1. Diktat läuft, Raum wird gewechselt → `rec.stop()` wurde gerufen.
2. Ein nach dem Wechsel eintreffendes `onresult` schreibt **nicht** in das Eingabefeld des neuen Raums.

### T5 · Kanarien — aus Konvention wird Invariante

Die drei Kanarien sind der Kern dieses Sprints. Sie prüfen nicht sieben bekannte Felder, sondern die
Aussage selbst — damit ein Feld, das in einem späteren Sprint dazukommt, automatisch auffällt.

1. **Spurenkanarie (die eigentliche Zusicherung).** Ein eindeutiger Sentinel-Text wird in die private
   Session gebracht (Nachricht, Entwurf, Panel-Option, Fehlerzeile, Titel). Nach dem Wechsel in den
   gemeinsamen Raum wird **der gesamte `#app`-Baum** durchlaufen — `textContent` jedes Knotens, jedes
   `value`, dazu `title`, `placeholder`, `aria-label` — und auf Abwesenheit geprüft.
   **Gegenrichtung genauso.** Fängt künftige Felder unabhängig davon, wo sie liegen.
2. **Hüllenkanarie.** Außerhalb des Chats gilt `scrChat.childElementCount === 0` — ohne Ausnahmeliste.
3. **Nachzüglerkanarie.** Wie T2/1, aber als stehende Prüfung über beide Richtungen.

Dazu ein **Selbstfahrt-Durchgang „Raumwechsel"** (privat → gemeinsam → privat, mit offenem Panel,
Entwurf und laufender Antwort), damit die Zusicherung auch im gebauten Build läuft und nicht nur in
happy-dom.

---

## 5 · Risiken und Anpassungen

- **Gehaltene Referenzen in Tests.** Wer ein Chat-Element vor einem Raumwechsel in eine Variable legt,
  hält danach einen abgehängten Knoten. Zu prüfen und semantisch treu nachzuziehen: `chat-ux.spec.js`,
  `chat-stream.spec.js`, `diktat.spec.js`, `ui-scale.spec.js`, `s70-overload-ui.spec.js`,
  `s62-aufdeckrunde-feinschliff.spec.js`, `tests/e2e/`. Wird verifiziert, nicht angenommen.
- **`testHooks`** (`renderMsgs`, `zeigeStream`) werden von den Scroll-Disziplin-Tests direkt gerufen —
  müssen auf leerer Hülle folgenlos bleiben.
- **Kosten beim Betreten** sind ausdrücklich in Kauf genommen (Vorgabe): ein Neuaufbau plus sieben
  Bindungen, gegenüber dem bisherigen Anzeigen.
- **Nicht im Scope:** die Vorraum-Regale (`boxRegal`/`boxAgenda`/`boxQz` vs. `boxZeitleiste`/`boxMess`)
  liegen in verschiedenen Screens und können sich nicht überkreuzen — die Spurenkanarie deckt sie
  trotzdem mit ab, weil sie den ganzen Baum läuft.
- **Nicht im Scope:** serverseitiges Gating der verdeckten Messwerte je Rolle (der in `prozess.js`
  notierte offene Punkt — „verdeckt" ist heute eine UI-, keine Speicherzusicherung). Eigener Sprint.

## 6 · Verifikation

1. Frischer Klon von `origin/main`, Basis-Commit protokolliert
2. Voller Testlauf **grün** (Erwartung 1116 + neue)
3. `npm run build` → Kern-Hash ins Protokoll
4. Patch auf frischem Klon: **dry-run → apply → Idempotenz → Byte-Vergleich → Tests → Build**
5. i18n-Kanarie und `parity.spec.js` explizit grün
6. Selbstfahrt lokal gefahren (Bericht `window.__PB_SELBSTFAHRT__`)

## 7 · Eval-Kadenz (S66)

- [x] UI-Verhalten und Session-Wiring berührt → Selbstfahrt + `tests/e2e/`
- [ ] `core/prompts/*` berührt → **nein**
- [ ] Szenarien-Katalog berührt → **nein**
- [ ] Judge berührt → **nein**
