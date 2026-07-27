# Sprint T2-1 · Layout-Grundlagen (Turn-40-Findings §3.1, §3.2, §3.6, §3.8)

Basis: `origin/main` @ `18fe462` (aktuell) · Kern-Hash nach Patch: `a095d0ec930e2f7e`
Suite: 1759 grün (Basis 1748 + 11 neue)

> **Hinweis: `main` ist während des Sprints weitergelaufen.** Begonnen wurde auf `88450e3`,
> zwischenzeitlich kam `18fe462` (`patch-s96-recall-gabelung-reveal`) dazu. Der neue Commit
> berührt `core/prompts/prompts.de.js` / `prompts.en.js` und bringt
> `tests/unit/s96-eval-haertung.spec.js` mit — **`core/ui/theme.js` und `core/ui/design.js` sind
> in beiden Commits byte-identisch**, die Anker dieses Patches gelten also für beide Stände.
> Verifiziert wurde auf `18fe462`.

Umgesetzt: **T2a · Screenrand als Token**, **T2b · Freiraum an der Naht**,
**T2c · Höhenbudget der oberen Zone**.
**Nicht umgesetzt: T2d · Desktop-Anker** — siehe §4, der Plan trug dort einen Denkfehler.

---

## 1 · T2a · Der Screenrand hängt an einem Token

**Finding §3.8** — die negativen Ränder der Schreibkante müssen exakt dem Screenpolster
entsprechen; ändert jemand eines von beidem, entsteht ein heller Streifen.

**Vorgefunden:** `--rz-rand:22px` war in `theme.js` angelegt, aber **nirgends benutzt**.
Das Ist-Layout trug `24px` als Literal an vier Stellen.

**Geändert**

| Stelle | vorher | nachher |
| --- | --- | --- |
| `theme.js` | `--rz-rand:22px` | `--rz-rand:24px` |
| `.rz-half` | `padding:30px 24px` | `padding:30px var(--rz-rand)` |
| `.rz-weg-panel` | `padding:30px 24px` | `padding:30px var(--rz-rand)` |
| `.rz-app #scrChat` | `… 24px calc(24px + env(…))` | `… var(--rz-rand) calc(var(--rz-rand) + env(…))` |
| `#scrChat .rz-chat-unten` | `margin:24px -24px calc(-24px - env(…))` | `margin:var(--rz-r-5) calc(-1 * var(--rz-rand)) calc(-1 * var(--rz-rand) - env(…))` |
| `#scrChat .rz-chat-unten` | `padding:40px 24px …` | `padding:40px var(--rz-rand) …` |

**Kleinentscheidung:** Der Token bekommt **24 px**, nicht 22 — der Ist-Wert des Layouts gewinnt
gegen den ungenutzten Token-Wert. So ändert sich optisch nichts.

**Zweite Kleinentscheidung:** Der **obere** Rand der Schreibkante (`24px`) ist kein Screenrand,
sondern ein Abstand. Er wurde auf `--rz-r-5` gelegt, nicht auf `--rz-rand`. Beide sind heute 24 px,
aber sie bedeuten Verschiedenes und dürfen sich künftig unabhängig bewegen.

---

## 2 · T2b · Freiraum an der Naht

**Findings §3.2 + §3.6** — ≥ 32 px zwischen letzter Hairline-Zeile und Badge-Oberkante; zusätzlich
steht die Naht-Kulisse per `translateY(-100%)` in der oberen Zone.

**Neu:** Token `--rz-nahtfrei:32px` in `theme.js`.
**Neue Regel:** `.rz-split>.rz-half:first-child .rz-fuss{padding-bottom:var(--rz-nahtfrei)}`

Nur die **erste** Hälfte einer Zweiteilung. Der Zonenfuß der zweiten Hälfte steht am Screenrand,
nicht an der Naht, und braucht das Polster nicht. `.rz-eine-zone` (Prozessreflexion) bleibt
unberührt, weil die Regel am `.rz-split`-Kontext hängt.

Die Bestandsregel `.rz-regal-offen>.rz-half:last-child .rz-fuss{display:none}` bleibt gültig
und wird vom Wächter mitgeprüft.

---

## 3 · T2c · Die obere Zone rollt

**Finding §3.1** — der Inhalt der oberen Vorraum-Zone braucht bei 390 px Breite 397 px; auf
667–740 px hohen Geräten stehen ihr ~333 px zur Verfügung.
**Entscheidung K1: scrollen** — keine Texte werden ausgeblendet.

```css
.rz-split:not(.rz-regal-offen)>.rz-half:first-child{
  min-height:0;overflow:auto;overscroll-behavior:contain}
```

**Drei Dinge, die dabei zählen:**

1. **`min-height:0` steht nie allein.** Allein schrumpft die Zone still unter ihren Inhalt,
   `margin-top:auto` verliert seinen Spielraum, und die letzte Zeile wandert erst recht über die
   Naht — genau der Fehler, den der Handover benennt. Ein Negativ-Wächter hält das fest.
2. **`:not(.rz-regal-offen)`** lässt die Regal-Mechanik (D9/D12-2b) unberührt. Dort bleibt
   `.rz-screen .rz-half:first-child{overflow:hidden}` richtig, weil die Zone beim Aufklappen auf
   ihr gemessenes Maß (`--rz-oben-h`) festgesetzt wird. Spezifität: die neue Regel wiegt (0,4,0)
   gegen (0,3,0) der Bestandsregel und gewinnt im zugeklappten Zustand.
3. **T2b und T2c greifen ineinander.** Der Zonenfuß liegt *innerhalb* des Rollbereichs; sein
   Polster hält den Badge-Abstand deshalb auch am Rollende. T2c ohne T2b würde die letzte Zeile
   beim Runterrollen unter das Badge setzen.

**Verifiziert (Voraussetzung der Entscheidung):** Badge, Wegweiser-Panel und Naht-Kulisse liegen
alle in der **zweiten** Hälfte (`app.js` Z. 124–128, `rz-naht-anker`). Der Rollbereich der ersten
Hälfte klippt sie also nicht weg. Hätten sie in der ersten Hälfte gestanden, wäre „scrollen" die
falsche Entscheidung gewesen. Ein Strukturtest hält das jetzt fest.

---

## 4 · T2d ist nicht umgesetzt — der Plan trug einen Denkfehler

Der Sprintplan schlug vor (und der Handover §3.3 empfahl), Badge und Flanken an ein gemeinsames
Raster zu hängen: `grid-template-rows:1fr auto 1fr` auf beiden Hälften.

**Das funktioniert so nicht.** Die Hälften haben je fünf bis sieben direkte Kinder (Kopfzeile, H1,
zwei bis drei Subtexte, Zonenfuß …). Grid platziert sie automatisch in *aufeinanderfolgende*
Reihen — bei sechs Kindern entstehen drei implizite Reihen zusätzlich, und das Raster bedeutet
nichts mehr. Damit `1fr auto 1fr` trägt, müsste der obere Block in einem **Wrapper-Element**
liegen. Das ist eine HTML-Änderung an allen drei Screens.

Beim Nachrechnen kam ein zweiter Punkt dazu, den weder Plan noch Handover benennen:

> Das Badge ist `position:absolute` **innerhalb der zweiten Hälfte** (`.rz-naht-anker`).
> `top:50%` meint also 50 % der *Spaltenhöhe*, während die Flanken mit `50dvh` gegen die
> *Viewporthöhe* rechnen. Sobald die Spalte überläuft, sind das zwei verschiedene Linien.
> Jede Lösung, die die Spalte stattdessen rollen lässt, verschiebt das Problem nur: in einem
> Rollbereich scrollt ein absolut positioniertes Kind mit — das Badge würde die Naht verlassen.

Sauber wird das erst, wenn Badge **und** Panel auf dem Desktop nicht mehr an der Hälfte, sondern
am `.rz-split` ankern (`.rz-naht-anker{position:static}` im ≥900px-Block, `.rz-auf-naht{left:50%}`).
Das berührt Q2 und Q3 und die aufgeklappte Regal-Zone.

**Konsequenz:** T2d braucht eine eigene Runde mit einer Strukturentscheidung — Wrapper-Element
oder Anker-Wechsel. Der Fehler blieb bis dahin, wie er ist: kosmetisch, nur auf breiten Fenstern,
nur bei überlaufender Spalte.

---

## 5 · Wächter (`tests/unit/t2-layout-grundlagen.spec.js`, 11 Tests)

Stufe A der zweistufigen Absicherung. Happy-dom hat keine Layout-Engine — gemessene Höhen sind
dort nicht prüfbar. Die Tests halten deshalb den **Mechanismus** fest:

- `--rz-rand:24px` existiert; die vier Regeln polstern über den Token.
- `.rz-chat-unten` enthält **kein** negatives px-Literal mehr.
- `--rz-nahtfrei` liegt auf dem 4er-Raster und ist ≥ 32 px (Badge-Höhe).
- Das Polster greift auf `:first-child`, nicht auf `:last-child`.
- `min-height:0` steht auf keiner `.rz-half`-Regel ohne begleitendes `overflow`.
- Die Regal-Bestandsregel `overflow:hidden` steht weiterhin da.
- Strukturtest über alle drei Screens: Badge und Panel liegen in der zweiten Hälfte, nicht in der ersten.

---

## 6 · Prüfliste für die Sichtprüfung (Stufe B)

| # | Was | Wo |
| --- | --- | --- |
| 1 | Startseite, Raum für mich, Raum für uns — läuft keine Zeile mehr in die Naht oder unter das Badge | 390 × 667, hell + dunkel |
| 2 | Die obere Zone lässt sich rollen; am Rollende bleibt Abstand zum Badge | 390 × 667, Raum für mich mit 3 Sessions |
| 3 | Auf hohen Geräten erscheint **keine** Bildlaufleiste | 390 × 844 |
| 4 | Regal auf- und zuklappen, **während die obere Zone gerollt ist** | 390 × 667 |
| 5 | Chat: die Schreibkante blutet weiterhin sauber aus, kein heller Streifen an den Rändern | 390 × 844, hell + dunkel |
| 6 | Prozessreflexion (`rz-eine-zone`) unverändert | 390 × 667 |

Punkt 4 ist der interessante Fall — Rollposition beim Aufklappen.

---

## 7 · Offen

- **T2d** · Desktop-Anker, siehe §4. Braucht eine Strukturentscheidung.
- Patch 2 (Kontrast), Patch 3 (Chat klein), Patch 4 (Chat-Wegweiser) folgen wie geplant.
