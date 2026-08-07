# Sprint 114d — Flankenabstand, Spaltenüberschrift, Regal in seiner Spalte

**Basis:** `origin/main` @ `2bfff7f` (patch-l4-landing-drei-bildschirme). S114, S114b und S114c sind dort enthalten — keine Ketten-Voraussetzung.
**Kern-Hash nach Build:** `16e179fb1f009d79`
**Suite:** 257 Dateien, 2490 Tests grün
**Ceremony:** Voll für §1/§2, Light-Lane-Anhang für §3

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

## 4. Nicht behoben: der Wegweiser auf dem Desktop

Der Befund („öffnet erst nur über der rechten Spalte, erst nach der Animation über beide") bleibt offen und ist **nicht** Teil dieses Patches.

Bestätigte Reproduktion: tritt **sofort** auf, auch ohne vorher ein Regal zu bewegen, und **konstant** bei jedem Öffnen. Damit ist die FLIP-Hypothese aus dem Vorprotokoll widerlegt — es ist kein Zustandswechsel, sondern die Bewegung selbst.

Tragfähige Erklärung: Das Panel liegt im DOM in der zweiten Hälfte, und die ist auf dem Desktop ein Rollbereich (T2d, `overflow:auto`). Sein Containing Block liegt seit T2d beim `.rz-split`, weshalb es im Ruhezustand über beide Spalten reicht. Während der `scaleY`-Transition hebt der Browser das Panel auf eine eigene Kompositionsebene — und eine solche Ebene erbt das Klipprechteck des Rollbereichs, in dem sie im Baum liegt, auch wenn ihr Containing Block darüber liegt. Nach der Transition fällt die Ebene weg, das Panel wird normal gemalt.

Der naheliegende Schnitt wäre, das Panel auf dem Desktop mit `position:fixed` aus dem Rollbereich zu nehmen (geometrisch identisch: `.rz-split` ist dort 100dvh hoch und beginnt am Fensterrand, `top:50dvh` trifft dieselbe Linie). Er ist hier bewusst **nicht** enthalten — siehe Anmerkung unten.

> **Anmerkung zur Herkunft dieses Patches:** Eine frühere Fassung entstand in einem Arbeitsverzeichnis, in dem parallel fremde Änderungen landeten (ein vollständiger S114e-Schnitt am Wegweiser-Panel, samt eigenem Protokoll). Dieser Patch ist neu aus einem unberührten Clone von `2bfff7f` gebaut und enthält ausschließlich die drei oben beschriebenen Schnitte. Falls die S114e-Arbeit anderswo weiterlebt, lässt sie sich konfliktfrei darauf setzen: Sie berührt nur die Wegweiser-Regeln, dieser Patch nur Flanke, Zonenfuß und Regal-Zone.
