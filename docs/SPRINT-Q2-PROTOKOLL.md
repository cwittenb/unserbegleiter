# Quick-Lane Q2 — Zeilenschrift und das Regal auf dem Desktop

**Basis:** `origin/main` @ `f426c78` (*desktop wegweiser*) · Einzelpatch, Quick-Lane
Zwei der drei Punkte aus dem Zuruf; der dritte (Anordnung der Links um den Wegweiser) steht noch als Frage aus.

## 1 · Eine Zeilenschrift, kleiner

Über und unter der Naht standen zwei Grade: die Zeilen auf Papier trugen `--rz-fs-sektion` (24 px), die auf Tiefgrün `--rz-fs-zeile` (17 px). Ein Unterschied ohne Aussage — beide sind dasselbe Element in derselben Rolle, nur in verschiedenen Zonen.

Jetzt tragen beide `--rz-fs-zeile`. Die Sonderregel `.rz-tiefgruen .rz-zeile{font-size:…}` ist ersatzlos entfallen; ein Test verbietet ihre Rückkehr.

**Nicht betroffen:** die aufgeklappte Regal-Zeile. Sie ist im offenen Zustand die Sektionsüberschrift (D12-2b) und trägt weiterhin ausdrücklich `--rz-fs-sektion` — dort ist der große Grad eine Aussage, kein Zufall.

## 2 · Das offene Regal bleibt in seiner Hälfte

Die Grundregel spannt die offene Regal-Zone über die volle Breite:

```
.rz-regal-offen>.rz-half:last-child{position:absolute;left:0;right:0;bottom:0;top:var(--rz-regal-top)}
```

Am Handy ist das richtig — die Naht liegt waagerecht, die Zone soll den Schirm füllen. Auf dem Desktop liegt die Naht senkrecht, und dieselbe Regel legte das Regal über **beide** Spalten.

```
@media(min-width:900px){
  .rz-split{flex-direction:row;position:relative}
  .rz-regal-offen>.rz-half:last-child{left:50%}
}
```

`position:relative` am Split ist der eigentliche Kern: ohne einen positionierten Vorfahren rechnete die offene Zone gegen den Schirm. Jetzt rechnet sie gegen den Split, und `left:50%` hält sie in der rechten Hälfte. **Die Bewegung selbst bleibt unverändert** — dieselbe festgenagelte Höhe, dieselbe Kurve, derselbe mitfahrende Wegweiser wie mobil, nur eben rechts.

## Prüfung

Zwei Zusicherungen in `d8-vollbild-mitte-sprache.spec.js`: gleiche Zeilenschrift ohne Sonderregel; die Desktop-Begrenzung vorhanden **und** die mobile Grundregel unangetastet. `d1-design-tokens` nachgezogen (der Split trägt jetzt `position:relative`).

Volle Suite grün (**1635**).

## Offen

Punkt 3 des Zurufs — „linke Hälfte mittig über dem Wegweiser, rechte mittig darunter" — ist eine Kompositionsentscheidung mit mehreren Lesarten und wartet auf eine Klärung. Heute steht `.rz-fuss{margin-top:auto}`, beide Linkgruppen sitzen also am unteren Rand ihrer Spalte, während das Badge auf halber Höhe schwebt.
