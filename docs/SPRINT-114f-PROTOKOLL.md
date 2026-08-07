# Sprint 114f — Die Wächter nachziehen

**Basis:** `origin/main` @ `004b6ed` („114de")
**Kern-Hash:** `ed741f7dac209c7f` — **unverändert.** Dieser Patch fasst keinen Produktivcode an.
**Suite:** 257 Dateien, 2488 Tests grün (unit 227/2303, engine+worker+e2e 30/185)
**Ceremony:** Light-Lane (reine Testanpassung, kein Verhalten)

---

## Befund

Nach dem Push von `114de` war die Suite rot: sechs Tests in drei Dateien. Alle sind CSS-Wächter, die den Wortlaut *vor* S114d.3 und S114e festhalten. Der Produktivcode ist vollständig und richtig — die Wächter waren nur nicht mitgezogen.

| Datei | Test | hielt fest |
|---|---|---|
| `d8-vollbild-mitte-sprache` | Panel klappt in der Mitte auf | `top:50%` + `width:200%` + `margin-left:-100%` |
| `d8-vollbild-mitte-sprache` | offenes Regal bleibt in seiner Hälfte | Q2 im **ersten** 900px-Block |
| `s114-design-textschnitte` | Desktop-Regeln gelten nur der Zweiteilung | `.rz-split .rz-weg-panel{top:50%` |
| `s114-design-textschnitte` | Breite wechselt nicht mitten in der Bewegung | die alte `:not`-Ausnahmeregel |
| `t2d-desktop-anker` | Panel gibt die Krücke auf | `{right:0;width:auto;margin-left:0}` |
| `t2d-desktop-anker` | Q2 · offenes Regal in seiner Hälfte | Q2 im **ersten** 900px-Block |

## Schnitt

Die Wächter prüfen jetzt den Stand, der tatsächlich im Code steht:

- **Wegweiser (S114e):** Im Ruhezustand `position:fixed; top:50dvh` — geprüft wird die Regel `.rz-split:not(.rz-regal-offen) .rz-weg-panel`, nicht mehr die alte zustandslose Fassung. Zusätzlich, dass die `200%/-100%`-Rechnung **nur noch** dem aufgeklappten Regal gehört und keine zustandslose Breitenregel mehr existiert, deren Reihenfolge entscheiden müsste.
- **Regal-Spalte (S114d.3):** Statt „die Regel steht im ersten Block" prüfen beide Tests jetzt, dass die Spaltenbegrenzung **hinter** der Grundregel steht. Genau das war der Fehler, den S114d.3 behoben hat: Davor war sie wirkungslos, weil bei gleicher Spezifität die Reihenfolge entscheidet und eine `@media`-Klammer die Spezifität nicht erhöht. `d8` prüft zusätzlich `first-child{right:50%}`.

Flanke (S114d.1) und Zonenfuß (S114d.2) waren bereits abgedeckt und sind unverändert grün.

## Lehre

Dieselbe Handschrift wie bei Q2 selbst: **Ein Wächter, der einen Wortlaut festhält, prüft die Schreibweise — nicht die Wirkung.** Q2 stand jahrelang wirkungslos im CSS, und zwei Tests bestätigten brav, dass sie *dasteht*. Wo eine Regel nur wirkt, wenn sie an der richtigen Stelle steht, muss der Test die Stelle prüfen, nicht den Text. Die vier neuen Assertions tun das über Index-Vergleiche gegen die Grundregel.
