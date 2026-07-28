# Sprint U0 · Inline-Stile außerhalb der Turn-41-Screens

Basis: `origin/main` @ `8692bac` · Kern-Hash nach Patch: `69708ba49c791462`
Suite: 1848 grün (Basis 1846 + 2)

Erster Schritt des U-Tracks (Turn 41). Er berührt **nichts**, was Turn 41 neu gestaltet — genau
deshalb kann er vorlaufen, während K8–K15 geklärt werden.

---

## 1 · Warum es diesen Schritt gibt

Beim Suchen nach „gibt es die Inline-Stile noch woanders?" kamen drei Fundstellen heraus. Zwei
davon liegen außerhalb dessen, was Turn 41 anfasst; die dritte (`recovery-screen.js`) wird von
U6 ohnehin neu geschrieben und bleibt deshalb, wo sie ist.

> **Zurückgenommen:** Ein bereits gebauter mechanischer Umbau von `recovery-screen.js` ist
> **nicht** in diesem Patch. Er hätte die rohen Werte wertgleich ins Stylesheet gehoben — Turn 41
> §2 sagt, dass alle vier **ersatzlos entfallen** (der Schleier mit dem Vollbild, der Radius weil
> „im System gibt es keine Radien", der Feldrahmen weil die Kante eine Haarlinie unten wird). Ein
> dabei angelegtes Token `--rz-schleier` wäre nie benutzt worden. Die Datei wandert in einem Zug
> mit U6, nicht in zweien.

---

## 2 · Die zwei Fundstellen

### 2.1 · `chat-kern.js` · der „Erneut senden"-Knopf

```js
k.style.marginLeft = "8px";
```

Der Knopf, der nach einem Netzfehler neben der Fehlermeldung erscheint. Fester Wert, nichts
gemessen. Neu: `#btnErneutSenden{margin-left:var(--rz-r-2)}` — 8 px **ist** `--rz-r-2`, also
wertgleich.

### 2.2 · `client.js` · der Update-Hinweis

Die Pille, die unten auftaucht, wenn eine neue Fassung bereitliegt. Zwei `cssText`-Blöcke mit
rohen Farben (`#fff`, `#d8dee5`, `rgba(0,0,0,.12)`), `14px` Schrift und `999px` Radius.

**Das war der eigentliche Fund:** sichtbare Oberfläche, die **außerhalb von `core/ui`** liegt und
deshalb von keinem Wächter gelesen wurde. Die Fallback-Werte (`var(--rz-karte,#fff)`) verraten die
Herkunft — geschrieben, bevor sicher war, dass die Token da sind. Heute sind sie es.

Neu als `#swUpdate` in `design.js`, mit `--rz-fs-fein`, `--rz-rund-pille` und Rasterpolstern.

**Schatten und Weichzeichner sind ersatzlos entfallen.** `box-shadow:0 6px 24px rgba(0,0,0,.12)`
und `backdrop-filter:blur(8px)` kommen in der Turn-40-Sprache nirgends vor — die Pille war
gestalterisch aus einer anderen App. Sie grenzt sich jetzt über Haarlinie und Kartenfläche ab und
schwebt flacher. **Das ist die einzige sichtbare Änderung dieses Patches.**

---

## 3 · Der Wächter liest jetzt zwei Dinge mehr

### 3.1 · Feste Werte an einzelnen Eigenschaften

Der Wächter prüfte `setAttribute("style")` und `style.cssText` — aber **keine Einzelzuweisung**.
Genau durch diese Lücke ist der `marginLeft` gefallen und dort jahrelang gestanden.

```js
const FESTER_WERT = /\.style\.([a-zA-Z]+)\s*=\s*("[^"]*"|'[^']*'|`[^`]*`)\s*;/g;
```

Die Regel trifft nur Zuweisungen, deren **ganze** rechte Seite ein String ist — also feste Werte.
Gemessenes bleibt draußen:

| Zeile | trifft? | warum |
| --- | --- | --- |
| `el.style.marginLeft = "8px"` | ja | fester Wert |
| `el.style.transform = "translateY(" + delta + "px)"` | nein | zusammengesetzt, also gemessen |
| `i.style.width = Math.round(…) + "%"` | nein | gerechnet |
| `screen.style.setProperty("--rz-oben-h", …)` | nein | gemessene Höhe |

**Zwei Ausnahmen, beide benannt:**

- **`transition`** steht in `TECHNIK`. Ein Übergang, der für genau einen Bildaufbau aus sein muss,
  lässt sich in keinem Stylesheet ausdrücken — das ist Technik, keine Gestaltung.
- **Die leere Zuweisung** (`= ""`) wird übersprungen: sie **nimmt** einen Inline-Wert weg, sie
  setzt keinen. Beides zusammen deckt `zone.style.transition = "none"` und
  `zone.style.transform = ""` in der Regal-Animation ab, ohne `app.js` pauschal auszunehmen.

### 3.2 · Dateien außerhalb von `core/ui`

Der Wächter lief über das Verzeichnis `core/ui`. Neu ist eine benannte Liste dazu:

```js
const AUSSERHALB = ["platforms/cloudflare/pages/client.js"];
```

Dass eine Datei nicht in `core/ui` liegt, heißt nicht, dass sie keine Gestaltung trägt. Die
Ausnahmelisten sind auf Pfade umgestellt (`core/ui/recovery-screen.js`), damit beides in derselben
Liste stehen kann.

*Nicht aufgenommen:* `platforms/cloudflare/pages/admin.html` (drei `cssText`-Blöcke) — die
Admin-Seite hat ihr eigenes Stylesheet und ein anderes Gestaltungssystem, sie ist kein
Turn-40-Gegenstand. Und `platforms/artifact/selbstfahrt.js` schiebt die Wurzel der Messvorrichtung
aus dem Bild; das ist Vorrichtung, keine Oberfläche.

### 3.3 · Die Sperrklinke zieht mit

Der Listentest prüft jetzt auch auf feste Einzelwerte. Wird `recovery-screen.js` in U6
aufgeräumt, verlangt er, dass die Ausnahme verschwindet — **und danach ist die Liste leer.**

---

## 4 · Prüfliste für die Sichtprüfung (Stufe B)

| # | Was | Wo |
| --- | --- | --- |
| 1 | Nach einem Netzfehler steht „Erneut senden" mit demselben Abstand neben der Meldung | Chat, Netz kurz trennen |
| 2 | Update-Hinweis: lesbar, sitzt unten mittig, **ohne Schatten und ohne Weichzeichner** | neue Fassung ausliefern, hell + dunkel |
| 3 | Der Knopf darin trägt weiterhin die Akzentfläche | dieselbe Stelle |

Punkt 2 ist die einzige sichtbare Änderung — bitte beurteilen, ob die Pille ohne Schatten genug
Halt hat. Falls nicht, wäre eine kräftigere Haarlinie der nächste Griff, nicht der Schatten zurück.

---

## 5 · Stand des U-Tracks

| | | |
| --- | --- | --- |
| **U0** | Inline-Stile außerhalb der Turn-41-Screens | **dieser Patch** |
| U1 | Feldkante (§2) | K8, K15 beantwortet — startbar |
| U2 | Aufgeklappter Wegweiser wird die Zone (§3) | K9 beantwortet — startbar |
| U3 | Freigabe-Auswahl (41a, 41b) | braucht U1, U2 |
| U4 | Freigabe-Vorschau (41c) | braucht U1 |
| U5 | Zugang in den Einstellungen (41d) | K13 beantwortet: wird ein Screen |
| U6 | Pflicht-Vollbild (41e, 41f) | K14: bleibt für die Testphase, wie es ist |

**Entschieden und für die Umsetzung festgehalten:**

- **K8** · die Feldkante zieht `--rz-hairline`, auf Grün `--rz-hairline-gruen`.
- **K9** · die aufgeklappte Wegweiser-Fläche bekommt ein Token; dunkel `#2c3428`, hell einen Ton
  unter Papier.
- **K11** · das gewählte Paar blutet bis zur **Zonenkante**, nicht bis zur Fensterkante.
- **K13** · aus dem Einstellungs-Blatt wird ein Screen.
- **K14** · kein Ausweg aus dem Pflicht-Vollbild — für die Testphase bewusst so.
- **K15** · §2 eng gelesen: Radius 0 auf 41a–41f, die Radien-Token der übrigen App bleiben.

**Weiter gelten** (Turn 41 nennt an diesen Stellen etwas anderes, unsere Entscheidung bleibt):
`.rz-weg-fuss` auf `--rz-sek` statt `--rz-sek2` (T3-3); der T2c-Rollmechanismus für die obere Zone
statt eines inneren Rollbereichs (K1); 44 px aus `--rz-tapziel-finger` statt als Literal (T2f).
