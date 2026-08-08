# Sprint 114h — Beim Aufklappen steht die linke Spalte still

**Basis:** `origin/main` @ `8eaaa5a` (patch-s114g-wegweiser-clippfad)
**Kern-Hash nach Build:** `0ff9d07ece620ebd`
**Suite:** 257 Dateien, 2492 Tests grün (unit 227/2307, engine+worker+e2e 30/185)
**Ceremony:** Voll

---

## Befund

Im Vergleich der beiden Zustände (zugeklappt / Regal „Geteiltes" offen) springt auf dem Desktop die **linke** Spalte: Zugeklappt stehen „Qualitätszeit beginnen" und „Gemeinsame Auflösung beginnen" oben an der Naht, aufgeklappt sitzen dieselben Zeilen am unteren Bildschirmrand. Bewegt hat sich also die Hälfte, die mit dem Aufklappen gar nichts zu tun hat. Zusätzlich rutscht die Regal-Zone rechts um die Kopfhöhe nach unten.

## Ursache

Die Regal-Mechanik (D9/D12-2b) ist für die **waagerechte** Naht gebaut. Dort ist die erste Hälfte die *obere Zone*: Sie schrumpft beim Aufklappen auf ihr gemessenes Maß (`--rz-oben-h`), und ihre Zeilen rücken an die neue Unterkante — richtig so.

Auf dem Desktop ist die erste Hälfte aber die *linke Spalte*. Zwei Regeln treffen sie trotzdem:

- `.rz-regal-offen>.rz-half:first-child{height:var(--rz-oben-h,50%)}` setzt sie auf ein Zonenmaß, das hier nichts bedeutet.
- `.rz-split:not(.rz-regal-offen)>.rz-half:first-child .rz-fuss{margin-bottom:50dvh}` (Q3a) fällt weg, weil die Bedingung `:not(.rz-regal-offen)` nicht mehr greift — und ohne diesen Abstand sackt der Zonenfuß an den unteren Rand.

Das Muster ist dasselbe wie bei S114d.3 und S114c: **Eine Regel für die waagerechte Naht gilt unbesehen auch senkrecht.** Dort war es die Breite, hier ist es die Höhe.

## Schnitt

Drei Zeilen im Desktop-Block:

```
.rz-regal-offen>.rz-half:first-child{height:100dvh}
.rz-regal-offen>.rz-half:first-child .rz-fuss{margin-bottom:50dvh}
.rz-regal-offen>.rz-half:last-child{top:0}
```

Volle Spaltenhöhe statt Zonenmaß, der Nahtabstand gilt weiter, und die Regal-Zone füllt ihre Spalte von oben — `--rz-regal-top` ist die Kopfhöhe der waagerechten Naht, senkrecht gibt es darüber nichts zu verschonen.

Mobil bleibt die Zonen-Mechanik unberührt; ein eigener Test hält das fest.
