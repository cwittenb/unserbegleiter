# Sprint S121 — Favicons in Build und Deployment

**Basis:** `origin/main` @ `cde3e13` (`patch-s119-6-fremde-marken`)
**Kern-Hash nach dem Sprint:** `d6d7c0e84dcdffd7`
**Testlauf:** 268 Dateien, 2609 Tests grün
**Quelle der Assets:** `Raumzuzweit_Design-favicons.zip` (Design-Handoff), **nicht** der
Altbestand im Repo — auf ausdrückliche Ansage. Der Handoff-Ordner
`design_handoff_raumzuzweit/favicon/` ist mit dem ZIP-Stand überschrieben;
seine README war eine Version alt (5×2 px statt 6×2 px, ohne den 16×16-Hinweis).

---

## 1 · Ausgangslage

Die App trug **kein Favicon**. Nicht ein veraltetes, nicht ein falsches — gar keins.
Weder App-Shell noch Landing hatten je eine Icon-Zeile im Head. Unter
`platforms/cloudflare/pages/icons/` lagen drei PNGs aus M1, die ausschließlich
das Manifest bediente (Homescreen-Kachel); der Browser-Tab blieb leer.

Zweiter Befund, beim Nachsehen aufgefallen: `THEME_COLOR`/`BACKGROUND_COLOR` standen
auf `#0f766e` / `#f5f7f9` — türkis und kaltgrau, aus derselben M1-Zeit. Die
Oberfläche kennt diese Töne seit D1 nicht mehr. Sichtbar wurde das genau dort, wo
das Manifest hinreicht und `app.js` nicht: Android-Taskleiste, PWA-Splash und die
Vor-Boot-Fläche der Shell, die beim Start eine Sekunde lang türkis aufblitzte,
bevor Papier übernahm.

---

## 2 · Entscheidungen

| Frage | Entscheidung |
|---|---|
| **F1** Ablageort | **a — Web-Root.** `/icons/` entfällt ersatzlos; Manifest, `SHELL_PFADE`, Push-Icon und `m4` ziehen mit. Ein Ort für beide Deploy-Ziele. |
| **F2** Theme-Farben | **a — Tiefgrün/Papier, inkl. Vor-Boot-CSS.** |
| **F3** Landing-Wächter | **a — benannte Ausnahme + Zusicherung.** |
| **F4** Native Store-Icons | eigener Sprint vor der Store-Einreichung, nicht hier. |
| **F5** `.ico` | keine erzeugt. |
| **K1** Handoff-Ordner | bleibt Design-Ablage, Build-Quelle ist eine Kopie unter `platforms/`. |

Selbst entschieden und hiermit offengelegt:

* **Nur sechs der neun Dateien werden ausgeliefert.** `favicon-16.svg` und
  `icon-maskable.svg` sind laut Handoff-Tabelle Zeichen*quellen* der PNGs, kein
  Auslieferungsgegenstand — sie bleiben im Handoff-Ordner. Ein Test hält das fest
  (NEGATIV: sie tauchen im Output nicht auf).
* **Die beiden kleinen Tab-Zeichen kommen nicht in den Precache.** `SHELL_PFADE`
  ist eine `addAll`-Liste; jeder Eintrag kostet jeden Installierenden einen Abruf.
  Ein Tab-Icon braucht niemand offline.
* **Die drei Landing-Seiten bekommen einen verankerten Einschub**, keine
  Ganzdatei-Ersetzung. 46 kB HTML im Patch, um fünf Zeilen zu setzen, wäre ein
  schlechtes Verhältnis; der Anker (`preconnect`-Zeile) kommt in jeder Datei
  genau einmal vor, und der Patch prüft das.
* **`ton()` als neuer Export in `theme.js`** statt weiterer abgeschriebener
  Literale (siehe §3.2).

---

## 3 · Was geändert wurde

### 3.1 Zeichensatz als Build-Quelle

Sechs Dateien nach `platforms/cloudflare/pages/icons/` (die drei alten PNGs sind
**ersetzt**, nicht ergänzt — sie unterschieden sich byteweise vom Handoff-Stand).
`build-pages.js` führt sie jetzt in `ICON_DATEIEN` und legt sie über
`verteileIcons()` in die **Wurzel** beider Ziele. Fehlt eine Datei, bricht der
Build mit Namen ab, statt still ein Ziel unvollständig zu lassen.

### 3.2 Farbe hat einen Weg statt einer Abschrift

Neu in `core/ui/theme.js`:

```js
export function ton(name)   // liest EINEN Ton aus dem :root-Block
```

Bewusst nur `:root`: der Dark-Block belegt dieselben Namen erneut, ein naiver
letzter Treffer hätte die dunkle Fassung geliefert.

Damit kommen `THEME_COLOR`, `BACKGROUND_COLOR` und die vier Vor-Boot-Variablen
der Shell aus `theme.js`, statt dort als Literal zu stehen. Das ist die
eigentliche Reparatur hinter F2 — die alten Werte waren nicht falsch gepflegt,
sie waren **nicht angebunden**, und darum unbemerkt zurückgeblieben.

### 3.3 Head-Schnipsel

Ein Schnipsel (`ICON_HEAD`) für App-Shell und Landing. Die `16x16`-Zeile ist
Pflicht: ohne sie skaliert der Browser die SVG herunter, und die eigens
gezeichnete 16er-Fassung (Wegweiser auf 6 × 2 px hochgesetzt) wird nie geladen.

### 3.4 Landing

Die Landing liegt auf einem eigenen Host und kann sich nichts von der App
borgen — der Build legt ihr denselben Satz ein zweites Mal in die eigene Wurzel.
Alle drei Seiten (`/`, `/impressum`, `/datenschutz`) tragen den Schnipsel.

Der Wächter in `l1-1` verbietet jedes Farbliteral außerhalb `:root`.
`<meta name="theme-color">` kann keine Variable tragen. Statt den Wächter
aufzuweichen, hat er eine **benannte** Ausnahme bekommen — und einen neuen Test
daneben, der prüft, dass dort genau `--rz-tiefgrün` aus `theme.js` steht und das
Meta genau einmal vorkommt. Die Bindung wandert vom Wortlaut in eine Zusicherung;
sie verschwindet nicht.

### 3.5 Service Worker

`SHELL_PFADE` und das Push-Icon auf Wurzelpfade. Dazu ein Test, der bisher
gefehlt hat: **jeder Precache-Eintrag muss im Build-Output existieren.** Das ist
kein Schönheitsthema — `addAll` ist atomar, ein toter Eintrag lässt die
Installation des Service Workers scheitern, nicht nur ein Bild.

### 3.6 Capacitor

Kein Code. `build-capacitor.js` kopiert `public/` rekursiv und erbt den Satz.
Der `m4`-Test führt die neuen Pfade mit.

---

## 4 · Tests

Neu: `tests/unit/s121-favicons.spec.js` (14 Zusicherungen) — Quelle vollständig,
PNG-Kantenlängen aus dem IHDR-Chunk, SVG trägt genau die drei Palettentöne und
keinen vierten, beide Ziele bytegleich beliefert, `/icons/` entsteht nicht mehr,
Vektorquellen bleiben draußen, jeder `href` und jeder Precache-Eintrag löst auf
eine vorhandene Datei auf, Farben stammen aus `theme.js`.

Mitgeführt: `m1-pwa-manifest`, `m2-service-worker`, `m4-capacitor-geruest`,
`l1-1-landing-grundgeruest`.

---

## 5 · Deployment

```
PAARE_KV_ID=1590b0377c4a47588ec27f3039edf4d5 npm run build
cd dist/cloudflare && wrangler deploy          # App · de.roomfortwo.app
# dist/cloudflare/landing/ → Hetzner · raumzuzweit.de
```

**Beide Ziele müssen neu.** Wer nur den Worker ausrollt, lässt die Landing ohne
Zeichen — sie holt sich nichts von der App.

Nach dem Deploy zieht der Service Worker unter neuem Cache-Namen (Kern-Hash
`d6d7c0e84dcdffd7`) und räumt den alten Stand samt `/icons/`-Einträgen weg. Auf
schon installierten Homescreen-Kacheln kann das alte Bild bleiben, bis das
Betriebssystem das Manifest neu liest; das ist Sache von iOS/Android und in
manchen Fällen erst nach Neuinstallation sichtbar.

---

## 6 · Offen

* Native Store-Icons (F4): `native/ios/…/AppIcon.appiconset` und
  `native/android/…/mipmap-*` tragen weiter Capacitor-Standards. Eigene Formate
  (1024er, adaptives Foreground/Background), nicht im ZIP enthalten — vor der
  Store-Einreichung fällig.
* Open-Graph-/Social-Bild: anderes Format, andere Maße, hier nicht berührt.
