# Sprint T1b · T1d · T1c — Die Theme-Schicht

**Theme-Track** (Basis: `origin/main` @ `9341aa8`, *patch-t1a-zonenfarben*) · Einzelpatch
Aus dem Planentwurf T1, Teile B–D. Ein Patch, drei in sich abgeschlossene Abschnitte.

---

## T1b · `core/ui/theme.js`

Neues Modul mit `THEME_CSS` und `SCHRIFT_IMPORT`; `design.js` importiert es und stellt es dem Komponenten-CSS voran. **Ein** `:root`-Block — die Skalen wurden bewusst in den bestehenden hineingezogen statt in einen zweiten daneben, sonst gäbe es wieder zwei Orte.

**Was neu dazukam:**

| Skala | Werte |
| --- | --- |
| Typo | `--rz-fs-caps` 11 · `-fein` 13 · `-text` 15 · `-zeile` 17 · `-sektion` 24 · `-titel` 30 (je mit `--rz-lh-*`) |
| Abstände | `--rz-r-1` 4 … `--rz-r-6` 32, dazu `--rz-rand` 22 |
| Radien | `--rz-rund-mini` 2 · `-fein` 4 · `-knopf` 12 · `-blatt` 14 · `-karte` 18 · `-pille` 999 |
| Bausteine | `--rz-tapziel` 36, `--rz-hairline-staerke`, `--rz-blatt-schatten`, `--rz-kurve`, `--rz-dauer`, `--rz-dauer-kurz` |

**Zuordnung der Streuner** (17 Schriftgrößen auf 6 Stufen, wie in F3 entschieden):

| vorher | jetzt |
| --- | --- |
| 10, 11, 12 px | `--rz-fs-caps` (11) |
| 13, 13.5, 14 px | `--rz-fs-fein` (13) |
| 14.5, 15, 15.5, 16 px | `--rz-fs-text` (15) |
| 16.5, 17, 19 px | `--rz-fs-zeile` (17) |
| 20, 24 px | `--rz-fs-sektion` (24) |
| 26, 30 px | `--rz-fs-titel` (30) |

Radien: 16 px → `--rz-rund-blatt`, 19 px → `--rz-rund-karte`.

**Eine Ausnahme bleibt bewusst stehen:** `input,select,textarea{font-size:max(16px,1em)}`. Das Literal ist die iOS-Zoom-Härtung aus M3 — würde es auf `--rz-fs-text` (15 px) gezogen, zoomt Safari beim Fokus. Der Wächter kennt diese eine Ausnahme namentlich.

**Befund zu den Farbliteralen:** Der Plan schätzte ~30 außerhalb der Token-Blöcke. Nachgemessen waren es **null** — die Schätzung hatte die Token-Definitionen selbst mitgezählt. Betroffen waren nur `kulisse.js` (`#ffffff`, `#8fae74`) und, mit T1c, zwei Werte des Hinweisblatts. Alle vier sind jetzt Token (`--rz-kulisse-*`, `--rz-hinweis-*`), letztere mit eigener Dark-Fassung — vorher stand ein helles Warmpapier auch im Dark-Mode.

**`--pb`-Inventur:** `--bg1`/`--bg2` hatten **keinen** Verbraucher mehr und sind entfallen. Der Rest (`--ink`, `--ink-soft`, `--accent`, `--card*`, `--ai-*`, `--field*`, `--me-*`) hält weiterhin Chat-Blasen, Karten und Felder; er bleibt vorerst und ist im Kopfkommentar von `theme.js` als solcher markiert.

## T1d · Ein Motiv, einmal gezeichnet

Die Kulissen-Bausteine waren **modulprivat** — deshalb trug die Bedien-Ecke einen zweiten, anders gezeichneten Baum und eine zweite Seerose, die mit der 12-Blatt-Rosette des Teichs nichts teilten.

`zeichen(art, { groesse, schlicht, kennung })` gibt sie als eigenständiges SVG heraus: `baum` · `bluete` · `knospe` · `blatt` · `ring`, aus **denselben** Pfadfunktionen wie die Kulisse. Fester `viewBox="0 0 40 40"`, Skalierung über `width`/`height`, Füllung `currentColor` — ein Test prüft ausdrücklich, dass 16 px und 64 px dieselbe Geometrie liefern.

**Größenstufe `schlicht`** (Vorgabe unter 28 px): lässt innere Blattlage und Fruchtstand-Punkte weg, weil deren Radius von ≈ 0.9 Einheiten dort subpixelig wird. Das leistet die vorhandene Knospen-Fassung des Kelchs.

Die Bedien-Ecke konsumiert jetzt `zeichen("baum")` und `zeichen("bluete")`. Die Sonderzeichnungen aus D12-2d/f sind entfallen; die Wechselziel-Logik aus f bleibt unberührt.

*Wie angekündigt ist der Icon-Baum damit die Seitensilhouette vom Kulissen-Horizont, nicht die Von-oben-Krone aus f — „wie in der Kulisse" wörtlich. Die Seerose bleibt von oben.*

## T1c · Die Templates malen nicht mehr selbst

**70** `style="…"`-Attribute in sechs Screen-Modulen sind zu 38 Klassen geworden. Für ein Theme waren sie unerreichbar: kein Selektor findet ein Inline-Attribut.

Die Klassennamen sagen die **Rolle**, nicht den Wert — `rz-fein` heißt „leise Nebenzeile", nicht „13px". Sonst wäre nur der Ort des Literals verschoben. Alle Werte kommen aus den Skalen von T1b.

Zwei Funde nebenbei: `var(--ink-soft,#5a6675)` und `var(--accent,#0f766e)` trugen Fallback-Literale aus einer fremden Palette (Teal!) — sie sind mit den Attributen verschwunden. Und das Hinweisblatt des Wiedereinstiegs hatte gar keine Dark-Fassung.

## Tests

- `t1b-theme.spec.js` (10) — der **Wächter**, dieselbe Rolle wie der i18n-Kanarientest: kein Farbliteral in den Komponentenregeln, keins in den UI-Modulen (Kommentare ausgenommen), jeder Dark-Token im Root angelegt, keine nackte Schriftgröße (außer der benannten M3-Ausnahme), keine rohen Radien, `cubic-bezier` nur einmal im Theme, Skalen vollständig, Theme genau einmal und zuerst eingebettet — und für T1c: kein `style="` in zehn UI-Modulen, Hilfsklassen ohne Zahlen.
- `t1d-zeichensatz.spec.js` (11) — jedes der fünf Symbole eigenständig und `currentColor`-fähig, Größe ändert nur die Kantenlänge, `schlicht` reduziert nachweislich, unbekannte Art liefert leeres SVG statt Fehler, die Bedien-Ecke zeigt **identisches** Markup zu `zeichen()`, die Kulisse zeichnet unverändert.
- Nachgezogen: `d1-design-tokens` (Übergangskurve ist jetzt ein Token).

Volle Suite grün (**1625**), Build Kern `024c6cade2519105`.

## Merkposten

- Der `--pb`-Restbestand (Chat-Blasen, Karten, Felder) ist der nächste sinnvolle Schnitt — er ist jetzt klein und überschaubar genug für einen eigenen kleinen Sprint.
- `--rz-lh-*` ist angelegt, aber noch kaum benutzt; die Zeilenhöhen stehen weiter an den Komponenten. Kein Fehler, nur unfertig.
- Die Meilenstein-Dramaturgie (Knospe → Blüte → Blatt) hat mit `zeichen()` jetzt eine Ausdrucksform außerhalb der Kulisse. Als leise Marker in Zeitleiste oder Prozessreflexion wäre das ein natürlicher zweiter Abnehmer — bewusst nicht vorweggenommen.
