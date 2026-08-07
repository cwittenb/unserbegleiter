# Sprint 114g — Der Wegweiser, gemessen statt hergeleitet

**Basis:** `origin/main` @ `487a1a5` (patch-s114f-waechter-nachziehen)
**Kern-Hash nach Build:** `b30929591fe37808`
**Suite:** 257 Dateien, 2488 Tests grün (unit 227/2303, engine+worker+e2e 30/185)
**Ceremony:** Voll

---

## Was der Test ergeben hat

Zwei Befunde am Gerät, und sie widersprechen einander nicht — sie ergänzen sich:

- **Test 0:** `.rz-weg-panel.rz-offen` zeigt in den Computed Styles `position: absolute`. Die S114e-Regel (`position:fixed`) **greift also gar nicht.** Deshalb war der Fix wirkungslos: Er war nie im Spiel.
- **Test 1:** Nimmt man `transform` aus der `transition-property` heraus (nur noch `opacity`), **ist der Fehler weg** — sofort, ohne weitere Änderung.

## Die Ursache

Test 1 zeigt sie direkt: Es lag an der **Animation von transform**, nicht an Breite, Stapel oder Containing Block. Für die Dauer einer transform-Transition hebt der Browser das Band auf eine eigene Ebene, und diese Ebene wird an dem Rollbereich beschnitten, in dem das Band im Baum liegt — die zweite Hälfte mit `overflow:auto`. Am Ende der Transition fällt die Ebene weg, das Band wird normal gemalt. Daher „erst halb, dann ganz", bei jedem Öffnen, und daher auch die Reparatur durch eine Auswahl im Inspektor: Sie erzwingt ein Neuzeichnen.

Die S114e-Diagnose war damit inhaltlich richtig — nur der Fix hat sein Ziel nie erreicht.

## Der Schnitt

`transform` bleibt, aber nur noch **statisch**: `translateY(-50%)` hält das Band mittig auf der Naht und wird nie animiert, also entsteht keine Ebene. Bewegt wird stattdessen der sichtbare Ausschnitt:

```
zu:    clip-path: inset(50% 0 50% 0)   /* die Naht als Linie */
offen: clip-path: inset(0 0 0 0)       /* das volle Band */
transition: clip-path .3s, opacity .3s
```

Optisch dasselbe Aufklappen aus der Naht heraus — und sauberer als vorher: `scaleY` hat den Text mitgestaucht, `clip-path` gibt ihn nur frei.

## Offen: warum greift die fixed-Regel nicht?

Die Selektorkette stimmt (`#scrShared` trägt `rz-screen rz-split`, das Regal war zu, die Regel steht später und ist spezifischer als die Grundregel). Wahrscheinlichste Erklärung: Im Browser lief eine ältere Fassung — Cache oder ein nicht neu gebautes Artefakt.

Die Regel bleibt in diesem Patch **unangetastet**. Nach vier Fehlschlägen an derselben Stelle ändere ich nur das, wofür eine Messung vorliegt. Ist sie tatsächlich tot, gehört sie in einem eigenen Schnitt entfernt — dann greift für den Ruhezustand wieder die Grundregel (`absolute; left:0; right:0` gegen `.rz-split`), was ebenfalls volle Breite ergibt.

## Lehre

Vier Anläufe (T2d, S114.9, S114.10, S114e) haben an Regeln gedreht, die alle geometrisch korrekt waren. Die Ursache stand nicht im CSS, sondern im Rendering — und war mit einer einzigen Messung zu finden: eine Eigenschaft aus der `transition-property` nehmen und schauen, ob der Fehler bleibt. **Wenn eine Regel richtig rechnet und der Fehler trotzdem auftritt, ist die nächste Frage nicht „welche Regel", sondern „was wird animiert".**
