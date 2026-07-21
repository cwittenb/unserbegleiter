# Sprint S87 — Raumtrennung der Chat-Oberfläche (harte Variante)

**Basis:** `origin/main` @ `b1aa856` (patch-ap-domain-app-subdomain) · **Kern-Hash nach Build:** `4ff6419a9123ffec`
**Quelle/Anlass:** Finding F3 aus dem Trockenlauf Prozessreflexion (Ankommens-Menü der Qualitätszeit erschien in der Soloreflexion) und die Audit-Frage: *„Es muss sichergestellt sein, dass niemals etwas aus dem Einzelraum im gemeinsamen Raum angezeigt wird und umgekehrt."* Das Audit fand sechs Rückstände (R1–R6), darunter den ungesendeten Entwurf im Composer, das weiterlaufende Diktat und Nachzügler-Antworten alter Sessions.
**Patch:** `patch-s87-raumtrennung-chatoberflaeche.mjs`

## Zielinvariante

> Außerhalb ihres Raums ist eine Session nirgends erreichbar — nicht sichtbar, nicht im DOM, nicht als laufender Nebeneffekt, und nicht über einen Nachzügler, der später zurückkommt.

## Entscheidungen (Klärungsfragen)

| # | Entscheidung |
|---|---|
| K-Variante | **Harte Variante**: Abbau + Neubau der Chat-Oberfläche statt Feld-Liste — Betreten darf Zeit kosten, nirgends dürfen Überbleibsel hängen. |
| K3 | **b)** Ungesendete Entwürfe leben je Session im **Arbeitsspeicher** (`state.entwuerfe`), werden nie persistiert, sterben mit der App-Instanz (relaunch/Paarwechsel ⇒ neue Closure). |
| G1–G4 | Härtungen aus dem Plan-Review: Abbau auch im Aufbau verankert (G1), Diktat-Handler genullt statt nur gestoppt + Selbst-Guard (G2), Entwurfs-Guard gegen `entwuerfe[null]` (G3), Pausen-Semantik (S71) in den Abbau übernommen (G4). |

## Änderungen

**Vorlage statt stehendes DOM (`core/ui/app.js`).** `scrChat` ist im Grundgerüst eine **leere Hülle**; die Oberfläche entsteht beim Betreten aus `CHAT_HTML()` (Funktion, nicht Konstante — `t()` liest erst beim Bauen, ein Sprachwechsel greift auch auf einer bereits gebauten Oberfläche). `baueChatOberflaeche()` beginnt konstruktiv mit dem Abbau (G1) und ruft `verdrahteChat()`, das die sieben Bedienelemente (`btnChatZurueck`, `btnChatEnde`, `btnSend`, `pbInput`-Keydown, `pbSkalaRange`, `pbSkalaSend`, `btnMic`) bei jedem Aufbau neu bindet — alte Listener hängen an Knoten, die nicht mehr existieren.

**Abbau (`raeumeChatOberflaeche`).** Läuft in `show(id)` für jedes `id !== "scrChat"` — `show()` hat exakt zwei Aufrufer (`betrete`, `startChat`), es gibt keinen Umweg. Reihenfolge: Diktat stoppen (Handler nullen, G2) → Pausenstempel + Fire-and-forget-Save bei laufender Engine (G4) → Entwurf sichern (nur bei gesetzter `chatId`, G3) → `scrChat.innerHTML = ""` → `err("")`/`hint(null)` (löschen jetzt auch den **Text**, nicht nur die Sichtbarkeit — R3/R4) → Sessionfelder nullen → `chatGen++`.

**Nachzügler-Zaun (Generationsmarke).** `startChat` zieht nach dem Aufbau `gen = ++state.chatGen`; die Engine-Hooks `onPersonError`/`onRender`/`onDelta`/`onStatus` **und** die Panel-öffnenden Def-Hooks (`onGate`, `onRegler`, `onRanking`, `onStartwerte`, `onFreigabe`, `onKapitel`, `onScale`, `onChoice`, `onAufdecken`) kehren am Zaun wortlos um — eine spät eintreffende Antwort der alten Session hätte sonst Panels in der Oberfläche des **neuen** Raums geöffnet (kwPanel existiert nach dem Neubau wieder) und über die alten Handler in die falsche Session geschrieben. `onSave` bleibt bewusst **ungezäunt** (die alte Sitzung wird zu Ende gespeichert und ist beim Wiederbetreten vollständig); `onMomentEnde`/`onZeitleiste` ebenfalls (Datenbuchung + Anzeige-Aufrufe, die ohnehin aus dem aktuellen `state.engine` rechnen). Auch `warteAntwort` prüft die Marke in `catch`/`finally`: ein Nachzügler kippt die neue Session nicht aus dem Warten und trägt keinen Fehler in den neuen Raum. Ein legitim wartendes Panel geht nicht verloren — `resume()` dispatcht den letzten Zug beim Wiederbetreten erneut (Test belegt das).

**Entwürfe (K3 b).** Sichern beim Abbau unter der Session-Id, Zurücklegen beim Aufbau; reiner Closure-Zustand.

**Diktat (R5/G2).** `diktatStopp()` nullt `onresult`/`onend`/`onerror` **vor** `stop()` (Web Speech liefert gequeute Events nach); zusätzlich Selbst-Guard im Handler (`rec !== r ⇒ return`) und `pbInput`-Nullprüfung — `pbInput` existiert nach einem Neubau wieder, als Feld des neuen Raums.

**Selbstfahrt (`platforms/artifact/selbstfahrt.js`).** Neue Journey `raumwechsel` (privat → gemeinsam → privat mit offenem Entwurf): Hülle leer, Sentinel-Abwesenheit im Baum, Entwurf kehrt zurück — läuft in CI gegen das gebaute Bundle mit.

## Tests

**Neu:** `tests/unit/s87-raumtrennung.spec.js` — 9 Tests: leere Hülle + vollständiger Neubau; Verdrahtung wirkt in der zweiten Session (Senden, Enter, Verlassen); `pbErr` leer **und** verborgen; G4 (Abbau ohne `pausiereChat()` stempelt `pausedAt`); G1 (direkter `startChat`→`startChat` sichert den Entwurf); Entwurf quert nicht/kehrt zurück; Entwurf nirgends persistiert (Prüfung am `MemoryStore`-Inhalt); relaunch-Isolation; Diktat gestoppt + genullt, spätes `onresult` schreibt nicht ins neue Feld.
**Neu:** `tests/unit/s87-panel-hygiene.spec.js` — 6 Tests: Nachzügler-Antwort erreicht den neuen Raum nicht, wird aber gespeichert und steht beim Wiederbetreten; Panel-Öffner im Nachzügler (CHOICE-BLOCK) öffnen kein Panel, `resume()` holt das Menü verlustfrei nach; **Hüllenkanarie** (`childElementCount === 0` ohne Ausnahmeliste); **Spurenkanarie** in beide Richtungen (Sentinel in Nachricht, Entwurf, Panel, Fehlerzeile → der gesamte `#app`-Baum wird auf Abwesenheit geprüft: Textknoten, `value`, `title`, `placeholder`, `aria-label`); Schnellantwort-Regler wird nicht mehr von einem Fremdpanel unterdrückt.
**Semantisch treu angepasst:** `s36-ui.spec.js` (Icon-Test betritt zuerst die Soloreflexion — Composer lebt jetzt auf der Chat-Oberfläche), `tests/e2e/selbstfahrt.spec.js` (Journey-Liste um `raumwechsel` ergänzt).

## Verifikation

- Voller Testlauf **grün**: 990 Struktur + 25 Engine/Mock + 112 Worker + 4 e2e = **1131 Tests / 135 Dateien** (Basis 1116 + 15 neue)
- Build: `npm run build` · Kern-Hash `4ff6419a9123ffec`
- Selbstfahrt: **3/3 Journeys grün** (solo-smoke, aufdeckung, raumwechsel) gegen das gebaute Bundle
- Patch auf frischem Klon: dry-run → apply → Idempotenz → Byte-Vergleich → Tests → Build

## Eval-Kadenz (S66)

- [x] **UI-Verhalten / Session-Wiring berührt** → Selbstfahrt gefahren (3/3), `tests/e2e/` laufen mit
- [ ] `core/prompts/*` berührt → nein (kein Eval-Lauf nötig)
- [ ] Szenarien-Katalog berührt → nein
- [ ] Judge berührt → nein
- [ ] Release-Gate → nicht Teil dieses Sprints

## Notizen

- `err()`/`hint()` löschen beim Verbergen jetzt auch den Textinhalt — der eigene R3-Test hat den halben Fix (nur verstecken) sofort gefangen; genau dafür sind die Kanarien da.
- Die Vorraum-Regale (`boxRegal`/`boxAgenda` vs. `boxZeitleiste`/`boxMess`) liegen in verschiedenen Screens und können sich nicht überkreuzen; die Spurenkanarie deckt sie dennoch mit ab, weil sie den ganzen Baum läuft.
- Nicht im Scope (bewusst): serverseitiges Gating der verdeckten Messwerte je Rolle — eigener Sprint (siehe Designfragen).
