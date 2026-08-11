# Sprint S121.5 — der Freiraum an der Naht gilt auf beiden Seiten

**Basis:** `origin/main` @ `a89d2c3` **plus S121.4** (setzt darauf auf)
**Kern-Hash nach dem Bau:** `71589eebf7be440c`
**Deckt ab:** F20 aus S121.3

---

## 1 · Befund

S121.3 hat den Freiraum an der Naht nur der Papier-Spalte gegeben — so steht es in Turn 48
§2.5. Dort stimmt das, weil die kurze Hälfte nur Titel, Absatz, einen Weg und die Fußlinks
trägt. Bei uns stehen rechts die Regalzeilen.

Das Badge ist auf der Naht **zentriert**. Es ragt also genauso weit nach rechts wie nach
links und deckte dort den Zeilenanfang. Der Freiraum gilt jetzt beidseitig, mit demselben
Maß: eine Naht, ein Freiraum.

---

## 2 · Warum der Inhalt nicht um das Badge fließt

Die naheliegendere Lösung wäre, den Text um das Badge herumlaufen zu lassen. Das geht nicht,
und der Grund ist nicht Aufwand:

- **Text fließt in CSS nur um Floats im selben Textfluss.** `shape-outside` — das Werkzeug
  für runde Aussparungen — setzt einen Float voraus. Das Badge ist absolut positioniert und
  lebt in der *anderen* Spalte.
- **CSS Exclusions** (`wrap-flow`) wären das passende Werkzeug: Sie ließen beliebige
  Elemente den Fluss verdrängen. Nie außerhalb des alten Internet Explorer umgesetzt, in der
  Praxis tot.
- **In der rollenden Spalte wäre es ohnehin unmöglich.** Dort wandert das Badge über den
  ganzen Inhalt hinweg; welche Zeile gerade darunter liegt, ändert sich mit jedem
  Scrollschritt. Ein Umfluss müsste sich pro Bild neu setzen — Layout-Arbeit bei jedem
  Scroll, mit sichtbarem Springen.

Denkbar wäre ein Umweg allein in der **klebenden** Hälfte, wo das Badge auf einer festen
Dokumentposition steht: ein unsichtbarer Float in dessen Höhe. Das hieße aber zwei
Bauformen für dieselbe Erscheinung, je nachdem welche Spalte gerade klebt. Der Freiraum ist
die ehrlichere Lösung.

---

## 3 · Was das kostet

192px verschwinden aus der nutzbaren Breite. Bei 1440px bleiben je Spalte rund 530px statt
690 — noch gut. Bei 1024px sind es je etwa 320px; dort könnten die Regalzeilen mit ihren
rechtsbündigen Zuständen eng werden.

Die Stellschraube ist der Wert selbst. `--rz-nahtfrei-x` ist mit 96px großzügig gerechnet
(halbe Badge-Breite 70 + Randmaß 24 = 94, aufgerundet auf 4 × `--rz-rand`). 80px würden
reichen, wären aber kein Vielfaches des Randmaßes. Das ist eine Sichtprobe, keine Rechnung.

---

## 4 · Änderungen

- `core/ui/design.js` — `padding-left:var(--rz-nahtfrei-x)` an der zweiten Hälfte, ab 900px.
- `tests/unit/s121-3-luft-an-der-naht.spec.js` — der Fall „die zweite Hälfte bleibt
  unangetastet" ist umgekehrt; dazu ein neuer, der beide Seiten auf **dasselbe Token**
  festlegt.

Der zweite Fall ist der wichtigere: Zwei getrennte Zahlen für eine symmetrische Erscheinung
wären die nächste Differenzrechnung, die beim ersten Wertwechsel auseinanderläuft.

---

## 5 · Tests

**Volle Suite:** 273 Dateien, 2676 Fälle, grün (unit 242/2478 in zwei Scherben,
engine+worker+e2e 31/198).
**Build:** erfolgreich, Kern `71589eebf7be440c`.

---

## 6 · Nachweis am laufenden System

1. Vorraum, Fenster ≥ 900px: Das Badge überdeckt an keiner Rollhöhe etwas — weder die
   rechtsbündigen Zustände links noch die Zeilenanfänge rechts.
2. Bei 1024px: Wirken die Spalten gedrängt? Dann ist der Wert zu prüfen, nicht die Regel.
3. Gestapelt (< 900px): unverändert.
