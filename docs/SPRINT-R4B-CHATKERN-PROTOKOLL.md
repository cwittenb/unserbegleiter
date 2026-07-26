# Sprintprotokoll · R4b (Abschluss) — der Chat-Kern

**Basis:** `origin/main` @ `2d0e5d7` (patch-r4b-panels)
**Ausgangslage / Endstand:** **1407 / 155 / 25 / 4 grün**, `npm run build` grün
**Kern-Hash:** `979ae948…` → `c4ad719842097bc4`

---

## `core/ui/chat-kern.js` (317 Zeilen)

`aktualisiereSkala`, `streamAnzeige`, `zeigeStream`, `zeigeAusgelastet`,
`nahAmEingabefeld`, `scrolleZumEingabefeld`, `renderMsgs`,
`aktualisiereComposer`, `setzeWarten`, `zeigeErneutSenden`, `warteAntwort`,
`sende`.

`app.js`: **1840 → 1601 Zeilen.** Seit Beginn des Tracks: 2692 → 1601
(**−1091, −41 %**).

## Der Zyklus — und warum er bleiben darf

Diese Gruppe ist die einzige des Tracks, bei der die Abhängigkeiten im **Kreis**
laufen:

```
chat            ──braucht──▶  baueTafelKarte (panels), zeichneAuswahl (auswahl)
panels, auswahl ──brauchen──▶  renderMsgs (chat)
```

Das ist kein Versehen, sondern die Sache selbst: Der Verlauf **zeichnet**
Panel-Karten und die Auswahlfläche, und beide stoßen ihrerseits ein
Neuzeichnen an.

Im letzten Protokoll hatte ich einen Ereigniskanal vorgeschlagen — „Module
melden Änderungen, der Chat lauscht". Beim Entwerfen zeigte sich, dass das der
schlechtere Weg gewesen wäre: Der Kanal hätte den Kreis nicht aufgelöst,
sondern nur **unsichtbar gemacht**. Dieselbe Kopplung, verteilt über drei
Module, schwerer zu verfolgen — und jeder spätere Leser hätte erst die
Ereignisnamen zusammensuchen müssen, um zu sehen, was wovon abhängt.

Gewählt ist deshalb die **zweistufige Verdrahtung**:

```js
const chatKern = macheChatKern({ … });          // gibt renderMsgs heraus
const { … } = macheAuswahlScreen({ …, renderMsgs, warteAntwort });
const { … } = machePanels({ …, renderMsgs, warteAntwort, kw, kwZu });
chatKern.verbinde({ baueTafelKarte, zeichneAuswahl });   // Gegenrichtung
```

Der Kreis bleibt bestehen — er ist an **einer** Stelle sichtbar, im
Kompositionswurzelpunkt, statt über drei Module verteilt. Bis `verbinde()`
gerufen ist, zeichnen beide Richtungen nichts (`() => null`, `() => false`);
der Kommentar im Modul sagt ausdrücklich, dass der Aufruf vor dem ersten
Rendern stehen muss.

Das ist die ehrlichere Lösung: Ein Zyklus, der aus der Sache folgt, gehört
benannt, nicht kaschiert.

## Fehlende Importe

Sechs Importe fehlten beim ersten Anlauf (`ALLE_BLOECKE`, `findeBlock`,
`findeMarker`, `K`, `bereiteRunde`, `formatiereMessrunde`/`formatiereVerlauf`)
— 152 rote Tests. Der Analysator hat sie alle vorab gelistet; ich hatte beim
Aufsetzen des Modulkopfes zu knapp abgeschrieben. Nach dem Nachtragen grün.

## Keine Teständerung

**Kein Bestandstest wurde angepasst.**

---

## Bilanz des Tracks

| | Zeilen |
|---|---|
| `app.js` vorher | 2692 |
| `app.js` jetzt | **1601** |
| `chat-kern.js` | 317 |
| `auswahl-screen.js` | 269 |
| `ansichten-screen.js` | 261 |
| `panels.js` | 200 |
| `einstellungen-screen.js` | 150 |
| `recovery-screen.js` | 139 |
| `html.js` / `stream-anzeige.js` / `zeit-texte.js` | 57 / 39 / 20 |

`app.js` ist damit von einer 2692-Zeilen-Closure zu einer Kompositions- und
Routing-Schicht geworden.

## Offen

**Was noch in app.js liegt** und liegen bleiben kann: Screen-Gerüst
(`CHAT_HTML`, `baueChatOberflaeche`, `verdrahteChat`), Wegweiser und Kulisse,
`startChat`, die Kernwetten-Abläufe, Boot und Routing. Das ist zusammen die
Kompositionsschicht plus der Sitzungsaufbau — eine weitere Zerlegung würde
Zusammengehöriges trennen.

**Merkposten aus dem Track:**
- `still()` in `ladeLage` unterscheidet nicht zwischen „leer" und „nicht ladbar" (R2.5)
- einmaliges, nicht reproduzierbares e2e-Flattern (Panels-Sprint)
- Fonts self-hosten, Broadcast-Batching, Token-Verdichtung vor Marktstart
