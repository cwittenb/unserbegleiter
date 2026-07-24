# Sprint D11 — Kulisse ab Stufe 1, Untergrund immer, Regler im Entwickler-Panel

**Design-Track D11** (Basis: D10) · Kette: … → patch-d10 → **patch-d11**

## Ausgangslage

Die Silhouetten aus D6 waren vorhanden, verdrahtet und getestet — aber unsichtbar. Nachgerechnet: ein frisches Paar hatte 0 Meilensteine und war keine Woche alt, also `kulisseAnzahl() = 0`, und `baueKulisse(0)` lieferte einen **leeren String**. Der Halter blieb buchstäblich leer. Bäume und Seerosen tauchten erst mit dem ersten Meilenstein oder nach der ersten Woche auf.

## Umsetzung

**1 · Der Raum startet nicht kahl.** Neue Konstante `KULISSE_BASIS = 1`. Sie wird **addiert**, nicht nur als Untergrenze gesetzt — sonst wäre der erste Meilenstein unsichtbar geblieben (frisch = 1, Knospe = 1) und der sichtbare erste Schritt der Dramaturgie verloren gegangen. *Das war eine kleine Eigenentscheidung; wenn du die Basis lieber als reine Untergrenze willst, ist es eine Zeile.*

Die Reihe jetzt: frisch **1** · Auftragsklärung begonnen **2** · alle drei Meilensteine **4** · plus Zeit (Woche 1, 2, 4, 8, 16 …) bis zum unveränderten Deckel **7**.

**2 · Der geschwungene Untergrund gehört nicht zum Wachstum.** Hügellinie (hell) und Wasserlinie (dunkel) werden jetzt immer gezeichnet, auch bei 0 Elementen — nur Bäume und Seerosen zählen. `baueKulisse()` biegt außerdem absurde Vorgaben gerade (negativ → 0, zu groß → Deckel), statt zu brechen.

**3 · Regler im Entwickler-Panel.** Ein Schieber 0 … 7 mit Anzeige und einem Knopf „Zurück zu echt":

- Er setzt `window.__rzKulisseVorschau` und **malt die vorhandenen Halter sofort neu** — man sieht die Stufe, ohne durch die Räume navigieren zu müssen.
- In `aktualisiereKulisse()` steht dafür genau eine Zeile: ist der Haken eine Zahl, gilt sie statt der gewachsenen. Ein reiner **Lese**-Haken — die App setzt ihn nirgends, im Betrieb ist er schlicht nicht vorhanden. Ein Test hält das fest.
- „Zurück zu echt" entfernt den Haken; der nächste Raumwechsel zeichnet wieder die gewachsene Zahl.

## Korrektur (in dieser Fassung enthalten)

**a · Der geschwungene Untergrund lief nicht durch.** Ursache: `preserveAspectRatio="xMaxYMax meet"` skaliert das SVG auf sein Seitenverhältnis (390 × 84) und heftet es rechts an — auf jedem Schirm breiter als 390 px endete die Linie mitten im Bild, links blieb es leer. Jetzt trägt jede Theme-Fassung **zwei Lagen**: der Untergrund als eigene Lage mit `preserveAspectRatio="none"` (er darf sich in die Breite ziehen, eine flache Kurve bleibt dabei eine flache Kurve), die Silhouetten weiter mit `xMaxYMax meet`, damit Bäume und Blüten ihr Seitenverhältnis behalten. Beide Lagen teilen dieselbe Höhe, also treffen sich Linie und Figuren auf derselben Höhe.

**b · Der Teich hing zu tief.** Die Dunkel-Fassung saß per CSS-Ausnahme **unter** der Naht (`html[data-theme=dark] .rz-kulisse-naht{transform:none}`), während die Bäume darüber standen — D6 hatte das als „Teich liegt, Bäume ragen" gemeint. Die Ausnahme ist raus: beide Fassungen sitzen jetzt an derselben Stelle über der Naht.

## Tests

Neu: `tests/unit/d11-kulisse-regler.spec.js` (7) — Basis und Deckel, Robustheit gegen absurde Vorgaben, Untergrund ohne Elemente in beiden Theme-Fassungen, der Regler im Panel (Bereich, Rückweg, Sofort-Neuzeichnen) und der Nachweis, dass der Haken nur gelesen und nie gesetzt wird.

Angepasst: `d6-kulisse.spec.js` — Wachstumsreihe auf die neue Basis, und die Zusicherung „leer bei 0" wird zu ihrem Gegenteil: der Untergrund ist immer da, aber ohne Bäume und ohne Blüte.

Dazu die Korrektur-Verträge: der Untergrund als eigene, dehnbare Lage (je Fassung genau zwei Lagen), und — in `d6-kulisse.spec.js` — dass die Ausnahme, die den Teich unter die Naht hängte, verschwunden ist.

Volle Suite grün (**1257**), Build Kern `91e9dadb74532d4b`.
