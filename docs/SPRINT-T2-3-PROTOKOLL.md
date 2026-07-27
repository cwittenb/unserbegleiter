# Sprint T2-3 · Desktop-Anker (Turn-40-Finding §3.3)

Basis: `origin/main` @ `714d0b4` (T2-2 gemergt) · Kern-Hash nach Patch: `54c6e0968f33beb9`
Suite: 1802 grün (Basis 1791 + 11 neue)

> Ursprünglich als Kette hinter T2-2 gebaut. Da T2-2 inzwischen als `714d0b4` auf `main` liegt,
> ist die Kette hinfällig — der Patch setzt direkt auf `main` auf.

Umgesetzt: **T2d · ein Anker statt zweier Rechnungen** (Entscheidung: Anker-Wechsel).

---

## 1 · Das Problem

Auf dem Desktop liegt die Naht senkrecht in der Mitte. Drei Dinge sollen dort auf gleicher Höhe
sitzen: das Badge, das Ende der linken Linkgruppe, der Anfang der rechten. Sie rechneten gegen
**zwei verschiedene Bezugsrahmen**:

| Element | rechnete gegen | Regel |
| --- | --- | --- |
| Badge | Höhe der **zweiten Spalte** | `top:50%` in `.rz-naht-anker` |
| linke Gruppe | Höhe des **Fensters** | `margin-bottom:50dvh` |
| rechte Gruppe | Höhe des **Fensters** | `margin-top:calc(50dvh - 30px)` |

Gleich sind die nur, solange die Spalte exakt 100 dvh hoch ist. Der Codekommentar sagte das selbst
(„solange der Inhalt nicht überläuft"). Sobald eine Spalte wächst — lange Regalliste, zweizeiliger
Zustandstext, niedriges Browserfenster — driften Badge und Gruppen auseinander.

---

## 2 · Der Anker-Wechsel

Vier Regeln, alle auf den zugeklappten Zustand beschränkt:

```css
@media(min-width:900px){
  .rz-split:not(.rz-regal-offen){height:100dvh}
  .rz-split:not(.rz-regal-offen)>.rz-half{min-height:0;overflow:auto}
  .rz-split:not(.rz-regal-offen)>.rz-naht-anker{position:static}
  .rz-split:not(.rz-regal-offen) .rz-auf-naht{left:50%}
}
```

1. **Höhenfest.** Die Zweiteilung ist auf dem Desktop immer genau fensterhoch. Damit ist `50dvh`
   per Definition ihre Mitte — die beiden Flanken-Regeln bleiben unverändert und stimmen jetzt.
2. **Spalten rollen.** Überlaufender Inhalt rollt innerhalb seiner Hälfte, statt die Seite wachsen
   zu lassen. Das ist dieselbe Entscheidung wie K1 auf dem Handy, nur eine Ebene höher.
3. **Anker abgeben.** `.rz-naht-anker` wird `static`. Der absolut positionierte Aufbau löst sein
   Containing Block damit am `.rz-split` auf.
4. **Badge auf die Mitte.** `left:0` (linke Kante der zweiten Spalte) wird zu `left:50%`
   (Mitte des Splits) — dieselbe Linie, anderer Bezug.

**Warum das Badge nicht mitrollt.** Es liegt im DOM weiterhin in der zweiten Hälfte, die jetzt ein
Rollbereich ist. Sein Containing Block ist aber der `.rz-split` — ein **Vorfahre** des Rollbereichs.
Absolut positionierte Kinder, deren Containing Block außerhalb des Rollbereichs liegt, werden von
ihm weder beschnitten noch verschoben. Das Badge bleibt auf der Naht stehen, während die Spalte
darunter rollt.

**Panel.** Die Desktop-Regel des Wegweiser-Panels trug `width:200%;margin-left:-100%` — eine Krücke,
die genau darauf beruhte, dass der Anker die **halbe** Breite ist. Mit dem Split als Anker ist das
Panel über `left:0;right:0` ohnehin volle Breite; die Krücke würde es auf die doppelte Fensterbreite
ziehen und ist deshalb im zugeklappten Zustand aufgehoben.

**Q2/Q3 bleiben unberührt.** Im aufgeklappten Regal ist die Hälfte wieder `position:absolute`,
das Badge ankert an ihr, `left:0` ist dort die Naht, und `top:50dvh` gilt wie bisher. Jede neue
Regel trägt `:not(.rz-regal-offen)`; ein Test hält genau das fest.

---

## 3 · Ein Rest bleibt — Merkposten **T2d-2**

`margin-top:auto` verteilt nur **freien** Raum. Ist der obere Block zusammen mit dem Zonenfuß höher
als 50 dvh, gibt es keinen freien Raum mehr: die linke Gruppe landet früher als die Naht, und die
Spalte rollt.

Gerechnet: der obere Block einer Vorraum-Spalte braucht auf dem Desktop grob 330–360 px.
50 dvh sind bei 800 px Fensterhöhe 400 px (passt), bei 700 px 350 px (auf Kante), bei 620 px
310 px (**passt nicht**). Auf sehr niedrigen Fenstern kann die Gruppe die Naht also erreichen —
und weil das Badge dort feststeht, während die Spalte rollt, kann es über den rollenden Text
geraten.

**Warum nicht mitbehoben:** Fluss-Inhalt lässt sich ohne ein **Hüllelement** nicht an eine
Fensterposition heften. Genau das war die Wrapper-Variante: ein `<div>` um den Inhalt jeder Hälfte,
das per Raster exakt die halbe Hälfte hoch ist; der Zonenfuß landet dann konstruktiv auf 50 %.
Ihr Preis stand in `design.js` — die Regeln

```css
.rz-split:not(.rz-regal-offen)>.rz-half:last-child>.rz-zeile,
.rz-split:not(.rz-regal-offen)>.rz-half:last-child>.rz-regal-reihen{…}
```

adressieren **direkte** Kinder der Hälfte. Ein Wrapper schiebt eine Ebene dazwischen; jede dieser
Regeln müsste neu geschrieben werden, dazu die Regal-Mechanik.

Der Rest ist im Q3a-Kommentar vermerkt und wird vom Wächter geprüft (der Kommentar **muss**
den Merkposten tragen) — wer die Stelle anfasst, stolpert über ihn.

Der behobene Fall (lange Regalliste, wachsende Spalte) ist der häufige. Der offene Fall
(sehr niedriges Fenster) ist der seltene. Vorher waren beide offen.

---

## 4 · Der Wächter (`tests/unit/t2d-desktop-anker.spec.js`, 11 Tests)

Die eigentliche Aussage des Schritts ist eine **negative**: es gibt keine zweite Rechnung mehr,
die getrennt gegen die Fensterhöhe misst. Geprüft wird der Mechanismus:

- Der Split ist höhenfest, die Spalten rollen.
- `.rz-naht-anker` gibt seine Ankerrolle ab; das Badge misst von der Mitte des Splits.
- Das Panel gibt die 200 %/−100 %-Krücke auf.
- **Jede** neue Regel trägt `:not(.rz-regal-offen)` — der Kern, damit Q2/Q3 nicht mitwandern.
- Q2, Q3 und die absolute Positionierung im aufgeklappten Regal stehen unverändert.
- Der Q3a-Kommentar trägt den Merkposten `T2d-2`.

---

## 5 · Prüfliste für die Sichtprüfung (Stufe B)

| # | Was | Wo |
| --- | --- | --- |
| 1 | Badge, linke Gruppe und rechte Gruppe stehen auf einer Linie | 1280 × 800, alle drei Screens, hell + dunkel |
| 2 | **Dasselbe mit voller Regalliste** (mehrere Sessions, Agenda-Einträge) — die Spalte rollt, das Badge bleibt auf der Naht stehen | 1280 × 800 |
| 3 | Niedriges Fenster: die linke Gruppe erreicht die Naht, die Spalte rollt. Erwartet, siehe §3 — hier bitte beurteilen, ob es stört | 1280 × 620 |
| 4 | **Regal auf- und zuklappen**, jeweils in beiden Spalten | 1280 × 800, hell + dunkel |
| 5 | Regal aufklappen, **während die Spalte gerollt ist** | 1280 × 800 mit langer Liste |
| 6 | Wegweiser öffnen: das Panel ist ein Band voller Breite durch die Mitte, nicht doppelt so breit | 1280 × 800 |
| 7 | Mobil unverändert — keine der Regeln greift unter 900 px | 390 × 844 |

Punkt 3 ist der offene Rest, Punkt 5 der riskanteste Zusammenprall zweier Mechaniken.

---

## 6 · Offen

- **T2d-2** · das Hüllelement, falls Punkt 3 der Prüfliste stört.
- Vier Kontraststellen aus `SPRINT-T2-2-PROTOKOLL.md` §4.
- Patch 4 (Chat klein: Tapziele, Sprechgruppe, Echo-Pille) und Patch 5 (Chat-Wegweiser) folgen.
