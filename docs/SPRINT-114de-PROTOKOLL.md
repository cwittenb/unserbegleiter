# Sprint 114d/e — Flanke, Spaltenüberschrift, Regal-Spalte und der Wegweiser

**Basis:** `origin/main` @ `2bfff7f` (patch-l4-landing-drei-bildschirme). S114, S114b und S114c sind dort enthalten — keine Ketten-Voraussetzung.
**Kern-Hash nach Build:** `d43c74ae482b1e0b`
**Suite:** 257 Dateien, 2491 Tests grün (in drei Chargen gefahren: unit, engine+worker, e2e)
**Ceremony:** Voll für §1/§2/§4, Light-Lane-Anhang für §3

---

## 1. Der Flankenabstand war um das Zonenpolster daneben

**Befund:** Der Abstand der rechten Linkgruppe zum Wegweiser ist kleiner als der der linken.

**Ursache:** In S114.11 hatte ich das Nahtfrei-Token ergänzt, aber die `- 30px` aus der ursprünglichen Q3a-Regel stehen lassen. Nachgemessen (Hälfte 100dvh, `padding:30px`, `.rz-fuss` mit `margin-top:auto` und `margin-bottom:50dvh`):

```
links:  letzte Zeile endet bei   50dvh - 30px - nahtfrei
        Abstand zur Naht      =  30px + nahtfrei
rechts: Gruppe beginnt bei       30px + margin-top
        mit margin-top = 50dvh - 30px + nahtfrei
        Abstand zur Naht      =  nahtfrei
```

Es fehlten genau die 30px des Zonenpolsters. Die `- 30px` stammen aus Q3a, wo die Gruppe **exakt** an der Naht beginnen sollte (Abstand 0) — dort rechneten sie das Polster weg. Mit dem Nahtfrei-Token daneben muss es mitgezählt werden.

**Schnitt:** `margin-top:calc(50dvh + var(--rz-nahtfrei))`. Jetzt beidseitig `30px + nahtfrei`.

## 2. Die Spaltenüberschrift klebte an der letzten Regalzeile

**Befund:** „Euer gemeinsamer Boden." stand direkt unter den Regalreihen statt am unteren Rand der Spalte.

**Ursache:** Die Nullstellung `>.rz-regal-reihen~*{margin-top:0}` galt für **jedes** Geschwister nach den Regalreihen — und traf damit auch den Zonenfuß. Der lebt aber von `.rz-fuss{margin-top:auto}`: Nur so fällt die Überschrift an den unteren Rand, spiegelbildlich zur Überschrift oben in der ersten Hälfte.

**Schnitt:** `:not(.rz-fuss)` in der Nullstellung.

Beide Fehler haben dieselbe Handschrift wie S114b: mit dem Kescher gefasst (`~*`, `>.rz-caps`) statt benannt, was getroffen werden soll.

## 3. Das Regal fuhr über den ganzen Schirm (Light-Lane-Anhang)

**Befund:** Auf dem Desktop füllte die Regal-Animation den ganzen Bildschirm statt nur die Spalte, in der das Regal liegt — und schob sich dabei über den Wegweiser, der auf der Naht sitzt und nur noch zur Hälfte herausschaute.

**Ursache:** Die Regel dagegen gab es längst. Q2 (`.rz-regal-offen>.rz-half:last-child{left:50%}`) stand im ersten 900px-Block bei Zeile 248 — die Grundregel mit `left:0;right:0` steht bei Zeile 1180. Gleiche Spezifität, und **eine `@media`-Klammer erhöht die Spezifität nicht**: Bei Gleichstand entscheidet die Reihenfolge, und die spätere Regel gewinnt. Q2 war wirkungslos, seit sie geschrieben wurde.

**Schnitt:** Die Spaltenbegrenzung wandert hinter die Grundregel, dorthin, wo sie gewinnt. Die obere Hälfte bekommt `right:50%` — sie spannte ebenfalls über beide Spalten und deckte beim Aufklappen die linke Seite samt Wegweiser zu. Mobil bleibt alles: Dort liegt die Naht waagerecht, volle Breite ist richtig.

**Warum die Tests das nicht fanden:** Zwei Tests prüften Q2 — beide nur, dass die Regel *dasteht*. Dass sie *gewinnt*, prüfte keiner. Sie prüfen jetzt die Reihenfolge gegen die Grundregel. Ein dritter Test (aus S114c) war zu grob geschnitten und schlug auf den neuen Block an; er prüft jetzt gezielt statt pauschal.

## 4. Der Wegweiser auf dem Desktop (S114e)

**Befund:** Das Band erschien beim Aufklappen nur über der rechten Spalte und reichte erst am Ende der Bewegung über die ganze Seite — sofort und bei jedem Öffnen.

**Was die Diagnose entschieden hat:** Nicht CSS-Lesen, sondern eine Beobachtung am Gerät. Der Fehler verschwindet, sobald im Inspektor **irgendein Element innerhalb** der zweiten Hälfte (`.rz-half.rz-tiefgruen.rz-naht-anker`) ausgewählt wird, und kehrt zurück, wenn ein anderes oder keines ausgewählt ist. `opacity` und `z-index` zu ändern bewirkt nichts.

Ein Zustand, den eine Auswahl im Inspektor repariert, ist kein CSS-Zustand: Die Auswahl erzwingt ein Neuzeichnen des Teilbaums. Der Fehler ist ein **veraltetes Klipprechteck**. Damit sind beide vorher verfolgten Erklärungen widerlegt — Stapelung wäre konstant, nicht an die Bewegung gebunden, und die Deckkraft ändert nichts. Das Ende der Transition ist bloß der nächste Moment, in dem ohnehin neu gezeichnet wird; deshalb *sah* es aus, als sei die Animation die Ursache.

**Ursache:** Das Band liegt im DOM in der zweiten Hälfte, und die ist auf dem Desktop ein Rollbereich (T2d, `overflow:auto`). Sein Containing Block liegt seit T2d beim `.rz-split`, weshalb es im Ruhezustand über beide Spalten reicht — der Rollbereich hält aber ein Klipprechteck in Spaltenbreite und rechnet es beim Aufklappen nicht neu.

**Schnitt:** `position:fixed` für das Band auf dem Desktop. Ein fixiertes Element misst gegen den Viewport; kein Vorfahre hält dann ein Klipprechteck, das veralten könnte. Geometrisch ändert sich nichts — `.rz-split` ist dort 100dvh hoch und beginnt am Fensterrand, `top:50dvh` trifft dieselbe Linie wie vorher `top:50%`. Die `200%/-100%`-Krücke samt ihrer Ausnahmeregel entfällt ganz; sie war nur nötig, solange die Spalte der Bezugsrahmen war.

Voraussetzung für `fixed`: kein Vorfahre mit `transform`, `filter` oder `contain` — geprüft, es gibt keinen. Der FLIP in `regalModus()` setzt kurzzeitig ein `transform` auf die Hälfte; dabei ist das Band geschlossen (S114.8).

**Vierter Anlauf am selben Befund.** T2d, S114.9 und S114.10 haben alle an den *Breiten*-Regeln gedreht, weil das Symptom wie ein Breitenproblem aussah. Jeder dieser Anläufe hat etwas verbessert — zuletzt blieb nur noch der Animationsmoment übrig — aber keiner traf die Ursache, weil sie im CSS nicht sichtbar ist. Die Lehre ist nicht „mehr CSS lesen", sondern: Wenn eine Regel geometrisch korrekt ist und der Fehler trotzdem auftritt, ist die Frage nicht mehr *was* gerechnet wird, sondern *wann neu gezeichnet* wird.

> **Anmerkung zur Herkunft dieses Patches:** Eine frühere Fassung entstand in einem Arbeitsverzeichnis, in dem parallel fremde Änderungen landeten. Dieser Patch ist neu aus einem unberührten Clone von `2bfff7f` gebaut und enthält ausschließlich die vier oben beschriebenen Schnitte.
