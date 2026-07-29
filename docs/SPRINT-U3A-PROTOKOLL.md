# Sprint U3a · Die Paar-Blöcke der Freigabe (Turn 41 §4.1–4.3, §4.6)

Basis: `origin/main` @ `e9ed89e` **+ Patch U2** · Kern-Hash nach Patch: `9cd0251ec8abfde6`
Suite: 1877 grün (U2-Stand 1871 + 6)

> **Kette:** `U2 → U3a`. Beide berühren `theme.js` und `design.js`; die Nutzlast ist auf
> `main + U2` gebaut, nicht nur dagegen geankert.

Der Sprintplan sah U3 als einen großen Schritt (§1.1 + §4.1–4.7). Er ist geteilt:
**U3a** ist die Bildsprache der Paar-Blöcke — reine Gestaltung, sofort zu beurteilen.
**U3b** wird die Zweiteilung (§1.1) und das Verhalten (§4.4, §4.5, §4.7); beides berührt Struktur
und Chat-Mechanik. So landet das Aussehen, bevor der Aufbau sich bewegt.

---

## 1 · Kein Rahmen mehr (§4.1)

`.rz-paar` war der **einzige Rahmen im System**: ein Kasten mit 14 px Radius um jeden Block,
während überall sonst eine Haarlinie trennt und der Rhythmus trägt.

```css
.rz-paar{border:0;border-top:1px solid var(--rz-hairline);border-radius:0;
         background:none;padding:15px 0;margin:0}
```

Statt Außenabstand zwischen Kästen jetzt Innenpolster zwischen Linien — dieselbe Bauart wie die
Regal-Zeilen.

---

## 2 · Die Fläche wählt (§4.1, §4.2, K11)

```css
.rz-paar.rz-an{background:var(--rz-flaeche-hoch);
               margin:0 calc(var(--rz-rand) * -1);padding:15px var(--rz-rand)}
```

Das gewählte Paar blutet bis zur **Zonenkante** aus (Entscheidung K11) — dieselbe Geste wie die
Schreibkante seit K3: eine Fläche, die den Rand erreicht, heißt „das hier ist jetzt gemeint".

**§4.2 ist der eigentliche Grund, warum der Rahmen weg musste.** Gewählt hieß bisher
`border-color:var(--rz-tiefgruen)`. Im dunklen Theme ist Tiefgrün **dunkler** als Papier — der
gewählte Rand hätte sich dort nicht abgehoben, sondern aufgelöst. Es war also nicht nur ein Kasten
zu viel, es war ein Zustand, der im dunklen Theme unsichtbar gewesen wäre.

Ohne Rand trägt die Füllung allein, und die dreht die Richtung von selbst: hell einen Ton dunkler,
dunkel einen Ton heller. Ein Test rechnet das nach, statt es zu behaupten — er vergleicht die
Kanalsummen von `--rz-flaeche-hoch` und `--rz-papier` je Theme und verlangt, dass die Richtung in
beiden entgegengesetzt ist.

---

## 3 · Ein Token, zwei Rollen — und deshalb ein neuer Name

U2 hat `--rz-weg-flaeche` angelegt: eine Stufe vom Boden abgehoben, für den aufgeklappten
Wegweiser. §4.2 verlangt für das gewählte Paar **exakt dieselbe Stufe** — dunkel `#2c3428`, hell
einen Ton unter Papier.

Zwei Token mit identischen Werten wären der Anfang vom Zerfall. Der Token heißt deshalb jetzt
**`--rz-flaeche-hoch`**: er benennt die Stufe, nicht den ersten Ort, an dem sie gebraucht wurde.

> **Für dich heißt das:** erst `patch-u2-wegweiser-flaeche.mjs` anwenden, dann diesen. U2 legt den
> Token unter dem alten Namen an, U3a benennt ihn um und nimmt die zweite Rolle dazu. U2 ist noch
> nicht auf `main`, deshalb ist die Umbenennung folgenlos — sie kostet nur diese Erklärung.

**Ein Widerspruch im Handover, den ich dabei aufgelöst habe.** §4.1 nennt `--rz-karte` als Füllung,
§4.2 beschreibt sie als „ein Ton **dunkler**". Beides zusammen geht nicht: `--rz-karte` ist im
hellen Theme `rgba(255,255,255,.60)` und wird über Papier gerechnet **heller**, nicht dunkler —
die Füllung hätte in die falsche Richtung gezeigt. Umgesetzt ist die Beschreibung aus §4.2, nicht
der Tokenname aus §4.1; die Stufe stimmt dann in beiden Themes.

---

## 4 · Gesperrt ist ohne Farbe erkennbar (§4.3)

```css
.rz-paar.rz-zu{cursor:default;border-top-style:dashed;opacity:.5}
```

Bisher unterschied sich ein gesperrtes Paar nur durch `opacity:.45` — auf Papier sind 45 % von
`#e3dfd0` praktisch nicht zu sehen. Die gestrichelte Oberkante erkennt man auch dann, wenn Farbe
und Helligkeit nicht helfen. Der Grund („Generalisierung") bleibt kursiv und fällt weiterhin erst
beim ersten Antippen.

---

## 5 · Der zweite Weg zeigt jetzt hinaus (§4.6)

„Ansehen, wie es ankommt" und „Noch für mich behalten" trugen beide `→`. Der zweite verlässt die
Fläche und verwirft die Auswahl — bewusst lautlos, ohne Rückfrage. Er trägt jetzt `←`.

Das ist die einzige Stelle in U3a, an der eine Geste ihre Bedeutung ändert statt nur ihr Aussehen.

---

## 6 · Der Wächter (`tests/unit/u3a-paar-bloecke.spec.js`, 6 Tests)

Drei der sechs sind **Negativ-Aussagen** — das ist die Form, in der die Findings formuliert sind:

- Kein `border`, kein `border-radius`, kein Außenabstand mehr.
- Gewählt trägt **keine** `border-color` — der Zustand hängt an der Fläche.
- `--rz-flaeche-hoch` liegt in beiden Themes auf der jeweils entgegengesetzten Seite von
  `--rz-papier` (gerechnet, nicht behauptet).
- Das Ausbluten hängt an `--rz-rand`, nicht an einer Zahl.
- Gesperrt trägt die gestrichelte Kante.

---

## 7 · Prüfliste für die Sichtprüfung (Stufe B)

| # | Was | Wo |
| --- | --- | --- |
| 1 | Die Liste liest sich als Folge von Zeilen, nicht als Kartenstapel | Ausschnitt teilen, hell + dunkel |
| 2 | **Gewähltes Paar: die Fläche reicht bis zum Rand und hebt sich ab** | hell **und** dunkel — die Richtung dreht |
| 3 | Mehrere Paare hintereinander gewählt: sehen die als Block zusammen aus, oder ist das zu viel Fläche? | mit 4–5 Auswahlen |
| 4 | Gesperrtes Paar: die gestrichelte Kante ist zu sehen, auch ohne die Deckkraft zu bemerken | Paar mit Kriterien-Verstoß |
| 5 | „Noch für mich behalten" trägt den Pfeil nach links | Fußleiste |

Punkt 3 ist die offene Frage der Gestaltung: benachbarte gewählte Paare bilden zusammen eine
durchgehende Fläche, weil zwischen ihnen nur die Haarlinie liegt. Das kann als Zusammenhang
richtig wirken — oder als zu großer Farbblock. Das entscheidet das Auge, nicht die Rechnung.

---

## 8 · Was in U3b folgt

- **§1.1 · Die Zweiteilung.** Auswahlfläche in `.rz-half.rz-papier`, Leiste als
  `.rz-half.rz-tiefgruen` statt `position:sticky`. Berührt die Chat-Mechanik: die Auswahl rendert
  heute in `#pbMsgs`, und die untere Zone des Chats ist die Schreibkante — während der Auswahl
  müsste dort die Leiste stehen.
- **§4.4 · Die Anleitung zieht in den Wegweiser** (neuer Schlüssel `weg.auswahlHalten`).
- **§4.5 · Gedrückthalten sichtbar machen** (~150 ms, leise Zustandsänderung).
- **§4.7 · Zugänglichkeit**: `aria-label` „Antwort auf: {frage}", Antworttext als Beschreibung.

---

## 9 · Nebenbefund: ein flüchtiger Test

`tests/e2e/pages-vollstack.spec.js` ist in einem von zwei vollen Läufen fehlgeschlagen und lief
allein sowie im zweiten vollen Lauf durch. Kein Zusammenhang mit diesem Patch (der Test startet
einen Worker und einen Client-Build). Notiert, weil ein Test, der manchmal rot wird, mit der Zeit
sein Gewicht verliert — falls das öfter auftritt, wäre eine eigene Runde fällig.
