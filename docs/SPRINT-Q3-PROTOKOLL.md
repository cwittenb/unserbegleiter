# Quick-Lane Q3 — Desktop-Feinschliff und ein Rest aus T1d

**Basis:** `origin/main` @ `f426c78` (*desktop wegweiser*) · Kette: **Q2 → Q3**

Vier Punkte. Der fünfte aus dem Zuruf — Transkript-Link in der Zeitleiste — ist kein Fix, sondern eine neue Sache; er steht am Ende als Befund.

## 1 · Der Einstellungs-Trigger trug eine Zeichnung zu viel

T1d hat Baum und Seerose auf `zeichen()` umgestellt, aber die **alte Seerosen-Zeichnung blieb stehen** — ein Rest meines Ersetzungsschnitts, der eine Zeile zu früh endete. Im Hellmodus standen dadurch zwei Seerosen nebeneinander (die neue Rosette aus dem Kulissensatz und der alte Flammenkelch), und weil die Rosette selbst mehrteilig ist, las sich das als drei Zeichen.

Der Rest ist entfernt. Ein Test zählt jetzt nach: genau zwei `<svg>` im Trigger, genau ein `.rz-einst-baum`, genau ein `.rz-einst-seerose`. Die Zuordnung bleibt wie in D12-2f — hell zeigt die Seerose, dunkel den Baum, jeweils das Wechselziel.

## 2 · Der Wegweiser im Chat stand falsch

`.rz-auf-naht{left:0;top:50%}` galt ab 900 px für **alle** Naht-Elemente. Gemeint war die senkrechte Naht des Splits — aber der Chat ist kein Split: er bleibt auf jeder Breite gestapelt, seine Naht liegt waagerecht über der Schreibkante. Die Regel zog sein Badge an die linke Kante.

Sie ist jetzt auf `.rz-split .rz-auf-naht` eingeschränkt. Das Chat-Badge fällt damit auf die Grundregel zurück und sitzt wieder mittig auf seiner waagerechten Naht.

*Das ist dieselbe Fehlerart wie in T1e beim toten `var(--bg)`: eine Regel, die für einen Fall geschrieben war und stillschweigend einen zweiten mitnahm.*

## 3 · Aufgeklappt bleibt der Wegweiser stehen

Mobil fährt das Badge mit der Kante nach oben (D12-2b) — dort **ist** die Kante die Naht. Auf dem Desktop ist die Naht senkrecht und bleibt, wo sie ist, während die Zone hochfährt. Das Badge markiert die Naht, nicht die Zonenkante:

```
.rz-split.rz-regal-offen .rz-auf-naht{top:50dvh}
```

## 4 · Die Linkgruppen flankieren den Wegweiser (Variante a)

Bisher klebten beide am Spaltenfuß, während das Badge auf halber Höhe schwebte. Jetzt endet die linke Gruppe knapp über der Naht und die rechte beginnt knapp darunter; Überschriften bleiben, wo sie sind.

```
.rz-split:not(.rz-regal-offen)>.rz-half:first-child .rz-fuss{margin-bottom:50dvh}
.rz-split:not(.rz-regal-offen)>.rz-half:last-child>.rz-zeile,
.rz-split:not(.rz-regal-offen)>.rz-half:last-child>.rz-regal-reihen{margin-top:calc(50dvh - 30px)}
```

**Warum `dvh` und nicht Prozent:** Prozent-Margins rechnen auch in einer Spalte gegen die **Breite**, nicht gegen die Höhe — `margin-bottom:50%` hätte die halbe Spaltenbreite ergeben. Solange die Hälfte 100 dvh hoch ist, trifft `50dvh` dieselbe Linie wie das `top:50%` des Badges. *Läuft der Inhalt einer Spalte über die Schirmhöhe hinaus, laufen beide auseinander — dann scrollt die Spalte ohnehin. Als Merkposten notiert.*

Das `:not(.rz-regal-offen)` ist nötig, weil die Zone im offenen Zustand neu ordnet; ein Test hält das fest.

## Prüfung

Vier Zusicherungen in `d8-vollbild-mitte-sprache.spec.js`: Zeichenanzahl im Trigger, senkrechte Naht **nur** im Split (die Regel darf nicht unqualifiziert stehen), Badge-Position im offenen Regal, flankierende Linkgruppen samt Ausnahme.

Volle Suite grün (**1639**).

---

## Befund zu Punkt 5 — Transkript in der Zeitleiste

Das ist kein Anzeigefehler: **Zeitleisten-Einträge kennen ihr Transkript gar nicht.** `zeitleistenEintrag()` schreibt `{ topics, summary, at, details? }` in `pstate.timeline` — kein Sessionbezug, keine Chat-Kennung. Die Gespräche selbst liegen unter `chat:<rolle>:<id>` bzw. `chat:<id>`, aber nichts verbindet beides.

Ein Link braucht deshalb drei Dinge, und zwei davon sind Entscheidungen:

1. **Bezug speichern** — beim Schreiben des Eintrags Chat-Kennung und Raum mitgeben. Mechanisch, unstrittig.
2. **Ansicht bauen** — ein Lesemodus für ein abgelegtes Gespräch. Hier ist zu klären, *was* gezeigt wird: nur die sichtbaren Züge, oder auch die verborgenen (`hidden`) Steuerzüge? Und: aufklappbar in der Zeitleiste wie die Details, oder ein eigener Screen?
3. **Altbestand** — bestehende Einträge (und die Vollausbau-Mockdaten) haben keinen Bezug. Entweder bleiben sie ohne Link, oder der Mock-Generator legt Transkripte mit an.

Sag mir zu 2 und 3, wie du es willst, dann kommt das als eigener Sprint — für die Quick-Lane ist es zu viel.
