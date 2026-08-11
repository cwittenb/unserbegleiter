# Sprint S122 — box-sizing global

**Basis:** `origin/main` @ `052e606` plus S121.5 und S121.6
**Kern-Hash nach dem Bau:** `6befc6f18c1c68ab`
**Deckt ab:** I12 aus dem Sprintplan S119
**Nummer:** ursprünglich als S120 geplant — die war längst vergeben (Meldeweg und Mailgestalt)

---

## 1 · Befund

Es gab keine allgemeine Regel; `box-sizing:border-box` stand punktuell an einzelnen Flächen
(`#app`, `.rz-half`, `.pb-btn`, `.rz-feld` und ein paar Bedienelemente). Wo sie fehlte, wurde
ein Kasten stillschweigend größer als gedacht: Höhe **und** Polster ergaben zusammen mehr als
das Maß, das in der Regel steht.

Der gemessene Fall war `#scrChat`: 100dvh Inhaltshöhe plus 30px Kopf- und 24px Fußpolster —
**54px** höher als das Fenster. Das Dokument lief über, und neben der gewollten
Bildlaufleiste stand eine zweite am Body (S119.3).

Das ist kein Einzelfall, sondern ein Fehlertyp: Jede neue Fläche, die Höhe und Polster
zugleich setzt, hat ihn — bis jemand daran denkt.

---

## 2 · Entscheidungen

**Die Regel steht ganz vorn**, vor allem, was sie überschreiben könnte. Ein Test hält die
Position fest, nicht nur die Existenz.

**Die punktuellen Setzungen bleiben stehen.** Sie sind jetzt redundant, aber nicht
überflüssig: Sie dokumentieren an Ort und Stelle, dass dort mit Höhe und Polster zugleich
gerechnet wird. Sie zu entfernen wäre ein zweiter Eingriff mit eigenem Risiko im selben
Schritt — und der Sinn dieses Sprints ist, dass eine Regression eindeutig zuzuordnen ist.

**Die Kanarie aus S119.3 bleibt.** Zwei Netze, verschiedene Maschen: Sie prüft die
**Absicht** (wer Höhe und Polster zugleich setzt, muss `border-box` mitbringen), die globale
Regel sichert die **Umsetzung** — auch für Flächen, an die beim Schreiben niemand gedacht
hat. Fiele die globale Regel je wieder heraus, schlägt die Kanarie an.

**Kein `content-box` irgendwo.** Eine einzelne Rücknahme wäre schlimmer als gar keine globale
Regel: Sie träfe genau die Fläche, die danach niemand mehr prüft. Ein Test verbietet sie.

---

## 3 · Änderungen

- `core/ui/design.js` — `*,*::before,*::after{box-sizing:border-box}` am Kopf des Stylesheets.
- `tests/unit/s122-box-sizing-global.spec.js` — neu.

---

## 4 · Tests

Fünf Fälle: die Regel existiert; sie steht vor den Komponenten; niemand setzt `content-box`
zurück; die punktuellen Setzungen sind noch da; und die Kanarie aus S119.3 findet nichts
mehr.

**Volle Suite:** 274 Dateien, 2681 Fälle, grün (unit 243/2483 in zwei Scherben,
engine+worker+e2e 31/198).

---

## 5 · Nachweis — und warum er hier mehr wiegt als sonst

Die Tests sagen, dass die Regel **da** ist. Sie können nicht sagen, ob sie irgendwo ein Maß
verschoben hat: Kein Test in diesem Bestand rechnet Layout, und die Regel berührt jedes
Element.

Deshalb gehört zu diesem Schritt eine **Sichtprüfung aller Screens** in beiden Spaltigkeiten
und beiden Ansichten:

- Startseite, eigener Vorraum, gemeinsamer Vorraum, Einstellungen
- Prozessreflexion, alle vier Sessiontypen
- Wiedereinstieg, Pflicht-Screen, Rechtsseiten
- hell und dunkel, schmal (< 900px) und breit

Worauf zu achten ist: Elemente, die **Breite oder Höhe zusammen mit Polster** setzen, werden
jetzt schmaler bzw. niedriger als vorher — das ist der Zweck, sieht aber an einzelnen Stellen
womöglich enger aus als gewohnt. Kandidaten sind die Eingabefelder, die Regler und die Knöpfe
mit fester Tapziel-Größe.

Auffälligkeiten bitte einzeln melden; jede ist eine eigene Zeile, keine Rücknahme der Regel.
