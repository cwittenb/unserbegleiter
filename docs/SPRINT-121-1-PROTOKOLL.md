# Sprint S121.1 — eine Bildlaufleiste, nie zwei

**Basis:** `origin/main` @ `cde3e13` (S119.6 · fremde Marken)
**Kern-Hash nach dem Bau:** `a1da071ae3ab717a`
**Vorlage:** Designdokument Turn 48, §2.1 und §2.2
**Deckt ab:** I1 und I13 aus dem Sprintplan S119 — Schritt 1 von vier in S121

---

## 1 · Befund

Ab 900px bekam jede Hälfte ihre eigene Höhe und, sobald der Inhalt länger war als das
Fenster, ihren eigenen Rollbereich. Das ergab zwei Balken nebeneinander, die unterschiedlich
weit liefen. Zwei Folgen, beide schlecht: Die Hälften verschoben sich gegeneinander — die
Naht war keine Naht mehr, das Badge saß irgendwo. Und das Rad rollte je nach Zeigerposition
mal die eine, mal die andere Spalte.

Am Gerät kam dasselbe als Touch-Befund an: In der oberen Zone ließ sich nur die
Bildlaufleiste ziehen, nicht wischen, während die zweite Zone — die über das Dokument rollt
— normal reagierte. Das war nie ein Touch-Fehler, sondern ein Rollbereich zu viel.

---

## 2 · Was sich ändert

**Kein `overflow` auf den Hälften, auf keiner, auch nicht `auto`** (Turn 48 §2.1). Beide sind
Zellen **eines** Rahmens; gerollt wird das Dokument. Die feste Höhe der Zweiteilung fällt;
`min-height:100dvh` bleibt — auch für kurze Seiten, damit die Naht bis zum unteren
Fensterrand geht. `dvh`, nicht `vh`: sonst springt es auf iOS beim Ein- und Ausblenden der
Browserleiste.

**Der Tiefgrün-Grund wandert als Verlauf auf den Rahmen** (§2.2). Trägt die zweite Hälfte
ihren Grund allein, endet sie als abgerissener Farbblock, sobald die andere Spalte
weiterläuft — ein Fehler, der erst durch den ersten Teil dieses Schritts sichtbar geworden
wäre. Als Verlauf läuft die Farbe immer bis zur letzten Zeile der **längeren** Spalte, ohne
dass irgendwo eine Höhe gerechnet werden muss.

Die Hälften behalten ihren eigenen Grund: Er deckt den Verlauf deckungsgleich ab, solange
sie reichen, und trägt mobil (gestapelt) die Färbung allein — dort gibt es keinen
senkrechten Verlauf, die Naht liegt waagerecht.

---

## 3 · Zwei umgekehrte Entscheidungen, ausdrücklich vermerkt

**T2c (Turn 40 §3.1) entfällt.** Die Regel machte die obere Zone zum eigenen Rollbereich,
damit ihr Inhalt auf niedrigen Geräten nicht in die Naht läuft. Genau dieser Rollbereich war
die Ursache des gemeldeten Befunds. Turn 48 löst es an der Wurzel: Die obere Zone darf so
lang werden, wie ihr Inhalt ist, und die Seite rollt.

**T2d (Turn 40 §3.3) ist umgekehrt.** „Die Zweiteilung ist auf dem Desktop höhenfest" war
eine bewusste Entscheidung mit eigenem Wächter. Sie gilt nicht mehr.

Beide Wächter bleiben stehen — **mit umgekehrtem Vorzeichen** und mit dem Grund im
Kommentar. Eine Umkehr, die als gelöschter Test dasteht, ist später nicht mehr auffindbar.

---

## 4 · Was bewusst NICHT in diesem Schritt steckt

**Das aufgeklappte Regal** (F17: umstellen) bleibt vorerst höhenfest. Es hat eine eigene
Mechanik samt Animation (S114h: der grüne Grund steht, nur der Inhalt fährt); sie in
denselben Schritt zu ziehen hieße, zwei Dinge gleichzeitig zu bewegen. Ein Test hält den
Ist-Zustand fest, damit die Verschiebung sichtbar bleibt.

**Die klebende Hälfte** (§2.3) fehlt noch — das ist S121.2. Bis dahin steht der Inhalt der
kurzen Hälfte oben und die Fläche darunter bleibt leer, während die lange Spalte weiterläuft.
Das ist ein sichtbarer Zwischenzustand, kein Fehler; die Farbe stimmt bereits.

**Der Wegweiser** hängt weiter mit `position:fixed` am Fenster. Auch das ist §2.4 und damit
S121.2. `top:50dvh` bleibt dabei richtig: Bis hierher galt die Zahl, *weil* die Zweiteilung
höhenfest 100dvh war — jetzt gilt sie, weil `fixed` ohnehin am Fenster misst. Der Wächter in
`s114-design-textschnitte.spec.js` trägt diesen Begründungswechsel jetzt im Kommentar.

**Der Chat** bleibt unangetastet (S121.4).

---

## 5 · Änderungen

- `core/ui/design.js` — feste Höhe und beide `overflow:auto`-Regeln entfallen, T2c entfällt,
  Verlauf auf den Rahmen; drei veraltete Kommentare nachgezogen.
- `tests/unit/s121-1-ein-rollbereich.spec.js` — neu.
- `tests/unit/t2-layout-grundlagen.spec.js` — T2c-Block umgekehrt.
- `tests/unit/t2d-desktop-anker.spec.js` — Höhenfest-Block umgekehrt.
- `tests/unit/s114-design-textschnitte.spec.js` — Begründung für `top:50dvh` nachgezogen.

---

## 6 · Tests

Elf neue Fälle: keine feste Höhe mehr; `min-height:100dvh` bleibt; `dvh` statt `vh`; keine
Hälfte eröffnet einen Rollbereich (samt Test des Tests); der Verlauf liegt auf dem Rahmen
und trennt genau auf der Naht; die Hälften behalten ihren Grund; der Verlauf gilt nur ab
900px; und zwei Fälle, die festhalten, was in diesem Schritt bewusst stehen bleibt (Regal,
Chat).

### Vierter Fund derselben Art

Mein erster Testentwurf schlug an, ohne dass eine Regel existierte — er hatte eine
**Kommentarzeile** getroffen, in der `.rz-half` vorkam. Dasselbe Muster wie in S119.3 und
S119.7, diesmal auf der Testseite. Alle Greifer in diesem Schritt entfernen Kommentare,
bevor sie suchen, und tragen den Grund im Code.

**Volle Suite:** 268 Dateien, 2607 Fälle, grün (unit 237/2409 in zwei Scherben,
engine+worker+e2e 31/198).
**Build:** erfolgreich, Kern `a1da071ae3ab717a`.

---

## 7 · Nachweis am laufenden System

Prüfliste aus Turn 48 §4, soweit dieser Schritt sie trägt:

1. 1440 × 700 mit langer linker Spalte: genau **ein** Balken, ganz rechts am Fenster.
2. Rad über der rechten Hälfte bewegt dasselbe wie über der linken.
3. Am Seitenende läuft Tiefgrün bis zur letzten Zeile — kein Papier unter der kurzen Hälfte.
4. Kurze Seite: die Naht geht trotzdem bis unten.
5. **Mobil:** In beiden Zonen löst eine Wischgeste das Rollen der Seite aus — der Befund aus
   I1 und I13 ist damit erledigt oder er ist etwas anderes, als wir dachten.
6. iOS Safari: beim Ein-/Ausblenden der Browserleiste springt die Naht nicht.

Noch **nicht** erfüllt (S121.2): Die kurze Hälfte klebt noch nicht, und das Badge steht noch
auf `fixed`.
