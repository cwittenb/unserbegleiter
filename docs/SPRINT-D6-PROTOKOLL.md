# Sprint D6 — Kulisse + Wachstumslogik (rein additiv)

**Design-Track D6** (Basis: D5; Design Turn 15/16/17) · Kette: … → patch-d5 → **patch-d6**

## Ziel

Die Kulisse als Zeuge am Rand der Wahrnehmung: ortsgebunden, leise (Opacity .07–.28), wachsend — nie Erfolgsanzeige, nie Zähler.

## Umsetzung

1. **Neues Modul `core/ui/kulisse.js`**: `kulisseAnzahl()` (Meilensteine 0–3 + logarithmische Zeitreihe Woche 1/2/4/8/16…, Deckel 7, deterministisch) und `baueKulisse(n, kennung)` — beide Theme-Fassungen in einem Halter: hell Bäume (`#7d9b62`, Silhouetten lt. 17a), dunkel Seerosenteich (`#8fae74`; Kelch mit zwei Lagen à 12 Blättern, innere 62 % / 15° versetzt; Schwimmblätter mit Kerbe nach Handoff-Pfad; Wasserringe laufen per SVG-Maske UNTER den Blättern durch). `pointer-events:none`, eigener Clipping-Halter, statisch (reduced-motion-fest).
2. **Orte** (Spez): Start → auf der Naht (hell ragt darüber, dunkel liegt darunter — CSS je Theme); Vorräume → unten in der Regal-Zone; Chat → keine.
3. **Wachstum serverseitig (K4)**: Startzeitpunkte liegen im Backend-Zustand — geteilter Zähler im **Bstate** (`kulisse`, Start-Naht + Vorraum uns), persönlicher im **Pstate** (Vorraum mich); beim ersten Betreten einmalig gesetzt, nie überschrieben. Meilensteine aus der ohnehin geladenen Lage: Auftragsklärung begonnen → Knospe · gemeinsam aufgedeckt → erste Blüte · Ziele definiert (`zielKandidat` in der Agenda, neues Lage-Feld `zieleDefiniert`) → erstes Blatt.
4. **Alt-Kulisse entfernt**: die fixe Hintergrund-Kulisse (`KULISSE_HTML`, `pb-kulisse`) weicht ersatzlos — sie widersprach der Ortsbindung.

## Tests

Neu: `tests/unit/d6-kulisse.spec.js` (9): Wachstumsfunktion (Meilensteine, Log-Reihe, Deckel, Determinismus), SVG-Verträge (62 %/15°, Maske, Kerbe), App-Verdrahtung (Halter-Orte, Bstate-/Pstate-Start einmalig). Volle Suite grün (1213).
