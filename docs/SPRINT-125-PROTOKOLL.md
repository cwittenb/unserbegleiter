# Sprint S125 — vier Feinschliffe nach der Sichtprobe

**Basis:** `origin/main` @ `6fe2e01` (S123) **plus S124**
**Kern-Hash nach dem Bau:** `4e93d980a23aa149`

Vier Befunde aus deiner Sichtprobe. Drei davon sind **Folgeschäden von S121.6** — die
Umstellung des Regals hat Stapel- und Abstandsregeln mitgerissen, die mit ihr nichts zu tun
hatten. Das gehört so vermerkt: Ein Ersatz dieser Größe hinterlässt Spuren an Stellen, die im
Test nicht auffallen, weil dort niemand Zahlenverhältnisse prüft.

---

## 1 · Mobil: der Wegweiser verschwand hinter der Titelzeile

`.rz-regal-offen .rz-weg-badge{z-index:6}` — die Zahl stammt aus der Zeit, als die obere Zone
eine absolut positionierte Fläche war und das Badge nur über **ihr** liegen musste. Seit
S121.6 klebt die Zone und liegt auf 8; das Badge verschwand dahinter.

Jetzt 9: über der Zone, unter dem Panel. Die Aussage der Regel bleibt unverändert — sichtbar,
aber ohne Klickannahme (S114.8).

## 2 · Desktop: der Wegweiser lag über dem Hilfepanel

Solange das Badge absolut in seiner Hälfte saß, ergab sich die Reihenfolge von selbst. Seit
es fest am Fenster steht (S121.6, `z-index:9`), schob es sich über das Panel, das auf 4 stand.
**Mobil war es richtig — aber zufällig**, nicht aus einem Grund.

Das Panel liegt jetzt auf 10 und damit in beiden Lagen über allem, aus demselben Grund.

## 3 · Desktop: die Links der linken Spalte sackten nach unten

Zugeklappt hält die Flanke (Q3a) den Zonenfuß an der Naht:
`.rz-fuss{margin-bottom:50dvh}` — die Regel gilt aber nur `:not(.rz-regal-offen)`. Fällt sie
beim Öffnen weg, sackt der Fuß über `margin-top:auto` an den unteren Rand, und die halbe
Seite springt, die gar nicht gemeint war.

**S114h hatte genau das schon einmal gelöst.** S121.6 hat die Zeile mit der Vollbild-Mechanik
verworfen, obwohl sie mit ihr nichts zu tun hatte — ein Fehler beim Aufräumen, nicht beim
Umbauen. Sie steht wieder da, diesmal mit eigener Begründung statt als Anhängsel.

## 4 · Einstellungen: die Zonentitel stehen jetzt oben

„Nur auf diesem Gerät." und „Gerät und Zugang." saßen am Zonenfuß. In den **Vorräumen** ist
das richtig: Dort trennt die Naht nach Reichweite, und der Titel bezeichnet die Grenze.

Die Einstellungen sind kein Raum, sondern eine Liste. Dort sagt der Titel, was man vor sich
hat — und gehört an den Anfang. Neu: `.rz-fuss.rz-fuss-oben` (kein `margin-top:auto`, kein
Naht-Polster) und die beiden Blöcke an den Kopf ihrer Spalte.

---

## 5 · Was ich NICHT geändert habe

**„Einstellungen als Titel im Wegweiser":** Das Badge trägt dort bereits `einst.titel`, also
„Einstellungen" — im Markup seit jeher (`wegBadgeEinst`). Entweder meinst du etwas anderes
(die Überschrift **im aufgeklappten Panel**?), oder es ist bei dir nicht sichtbar, dann wäre
das ein eigener Befund. **Sag mir, was du siehst**; ich habe hier nichts geraten.

---

## 6 · Drei nachgezogene Wächter

`d12-2b`, `s114` (zweimal) und `d8` hielten die alten Zahlen fest — 6 für das Badge, 4 für das
Panel, und die Abwesenheit des Nahtabstands. Alle drei bleiben stehen, mit der neuen Zahl und
dem Grund. Der `d8`-Fall ist der aufschlussreichste: Seine **Aussage** („der Knopf liegt unter
dem Panel") war die ganze Zeit richtig — nur stimmten die Zahlen nicht mehr zu ihr. Ein
Wächter, der eine Zahl prüft statt eines Verhältnisses, merkt so etwas nicht.

**Volle Suite:** 275 Dateien, 2693 Fälle, grün.
**Build:** Kern `4e93d980a23aa149`.

---

## 7 · Sichtprobe

1. Mobil, offenes Regal: Der Wegweiser liegt über der Titelzeile, nicht dahinter.
2. Desktop, offenes Regal: Die Zeilen der linken Spalte bleiben, wo sie waren.
3. Wegweiser antippen: Das Panel legt sich über das Badge — in beiden Lagen gleich.
4. Einstellungen: Beide Zonentitel stehen oben; darunter beginnt die jeweilige Liste.
