# Quick-Lane Q1 — Der Wegweiser auf dem Desktop

**Basis:** `origin/main` @ `e67aa68` (*patch-t1g-eine-palette*) · Einzelpatch, Quick-Lane

## Der Fehler

Ab 900 px legt sich der Split waagerecht: die beiden Hälften stehen nebeneinander, die Naht läuft senkrecht durch die Mitte. Das Badge folgt dem bereits (`left:0;top:50%`).

Das Panel nicht. Es hängt im Markup in der **zweiten** Hälfte und trug unverändert die Handy-Regel `left:0;right:0;top:0` — es klappte also über die **Oberkante der rechten Spalte** auf: halbe Breite, falsche Höhe. Gemeint war auch hier ein Band über die volle Breite, nur eben durch die Mitte.

## Die Regel

```
@media(min-width:900px){
  .rz-weg-panel{top:50%;right:auto;width:200%;margin-left:-100%}
}
```

- `top:50%` — auf die Mitte, wo die Naht liegt. Das `translateY(-50%)` der Grundregel zentriert weiterhin.
- `right:auto` — sonst gewinnt `right:0` aus der Grundregel gegen die neue Breite.
- `width:200%` / `margin-left:-100%` — **Prozent statt `vw`**: sie rechnen gegen die Hälfte, die dank `flex:1` auf beiden Seiten genau die halbe Breite hat. `100vw`/`-50vw` hätte dasselbe ergeben, aber auf Systemen mit sichtbarem Scrollbalken einen waagerechten Überlauf.

## Zwei Dinge, die beim Prüfen auffielen

**Die Reihenfolge im Stylesheet entscheidet.** Mein erster Versuch legte die Regel in den bestehenden `@media(min-width:900px)`-Block — der steht bei den Split-Regeln, also **vor** der Grundregel des Panels. Gleiche Spezifität, später gewinnt: der Fix wäre wirkungslos geblieben, und zwar unsichtbar. Der Block steht jetzt direkt hinter der Grundregel, und der Test prüft diese Reihenfolge ausdrücklich mit, nicht nur den Inhalt.

## Prüfung (Quick-Lane)

Zwei gezielte Zusicherungen in `d8-vollbild-mitte-sprache.spec.js`: die Desktop-Regel trägt Mitte und volle Breite und steht hinter der Grundregel; am Handy bleibt es das Band an der waagerechten Naht. Dazu die vier Specs, die das Panel und den Split beschreiben (d1, d8, m3, t1b) — alle grün.

Volle Suite trotzdem einmal durchgelassen: grün.
