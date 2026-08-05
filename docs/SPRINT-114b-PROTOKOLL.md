# Sprint 114b — Nachtrag: der Abstand des Ortsetiketts

**Basis:** S114 **angewendet** (`patch-s114-design-textschnitte.mjs`). Dieser Patch baut darauf auf und bricht ab, wenn S114 fehlt.
**Kern-Hash nach Build:** `eb015ee803f4274a` (S114 war `233a9f38435e876f`)
**Suite:** 251 Dateien, 2377 Tests grün
**Ceremony:** Voll — es ist eine Layoutregel, kein Text.

---

## Befund

Das Ortsetikett „Raum für uns" (`.rz-caps-unter`, S114.11a) klebte auf dem Desktop an der Haarlinie seiner Betreten-Zeile. Auf dem Handy stimmte der Abstand.

## Ursache

Ein Fehler aus S114 selbst. Beim Einbau des beidseitigen Nahtabstands (S114.11) habe ich `.rz-caps` in **beide** Desktop-Flankenregeln aufgenommen:

```
>.rz-half:last-child>.rz-caps          { margin-top:calc(50dvh - 30px + var(--rz-nahtfrei)) }
>.rz-half:last-child>.rz-zeile~.rz-caps{ margin-top:0 }
```

Erst bekam das Etikett die Flankenhöhe, dann nahm die Nullstellung sie ihm wieder ab — und mit ihr die eigenen 11px aus `.rz-caps-unter`. Spezifität 0-3-2 gegen 0-1-0: die Flankenregel gewinnt, und `margin-top:0` überschreibt den Abstand vollständig.

Warum es nur auf dem Desktop auftrat: Beide Regeln stehen in `@media(min-width:900px)`. Darunter greift nur `.rz-caps-unter` selbst, und dort saß der Abstand richtig.

## Schnitt

Beide `.rz-caps`-Zeilen sind aus den Flankenregeln entfernt. Die Flanke misst, was **zuerst** in der Hälfte steht — das ist die Betreten-Zeile, nie das Etikett darunter. Es brauchte weder die eine Regel noch die andere; ich hatte die Nullstellung nur eingebaut, um die erste Regel wieder einzufangen, die es ebenfalls nicht brauchte.

## Lehre

Zwei Regeln, die sich gegenseitig aufheben, sind ein Hinweis darauf, dass beide falsch sind — nicht darauf, dass sie sich ergänzen. Der schnellere Weg wäre gewesen zu prüfen, ob das Etikett überhaupt je das erste Flankenelement ist.

Der neue Test (`s114-design-textschnitte.spec.js`) hält das fest: Die Desktop-Flanke fasst das Etikett nicht an, misst aber weiter die erste Zeile.
