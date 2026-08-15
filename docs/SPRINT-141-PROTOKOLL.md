# Sprint S141 — Einstellungen: Rückweg und Zonenfuß

**Basis:** `origin/main` @ `8a00f89` (`patch-s140-einstellungen-wegweiser-kopf-toggle`),
frisch geklont. S140 ist gepusht; dieser Patch setzt direkt darauf auf.
**Auslieferung:** `patch-s141-einstellungen-rueckweg-und-fuss.mjs`
**Kern-Hash danach:** `8a4c785fc3e4e8bc`
**Suite:** 285 Dateien / 2786 Fälle grün

Zwei Nachträge zu S140.

---

## 1 · Der Rückweg führt dorthin zurück, wo man herkam

**Befund.** Pfeil und Zeichen landeten immer auf `scrStart`, auch wenn man aus
dem gemeinsamen Raum kam.

**Warum das für die Vorräume richtig war und hier nicht.** `scrMyRoom` und
`scrShared` sind die Ebene unter dem Start; ihr Rückweg hat genau ein
sinnvolles Ziel. Die Einstellungen betritt man dagegen von überall her — das
Zeichen liegt in der festen Bedien-Ecke und ist auf jedem Screen sichtbar. Ein
Ort, der von überall erreichbar ist, muss auch überallhin zurückführen, sonst
wirft er einen bei jedem Blick in die Einstellungen aus dem Raum, in dem man
gerade war.

**Umsetzung** (`core/ui/app.js`):
- `zurueckAus(screenId, ziel = () => "scrStart")`. Das Ziel ist eine
  **Funktion**, kein Wert: Es steht erst beim Klick fest, nicht bei der
  Verdrahtung. Als Wert gereicht wäre es beim Boot eingefroren.
- `betreteEinstellungen()` merkt `state.screen` beim **Betreten**. Beim
  Verlassen ginge es nicht — dort steht `state.screen` längst auf
  `scrEinstellungen`, der Merker zeigte auf sich selbst.
- Pfeil und Zeichen bekommen dasselbe Ziel. Ein Ort, ein Ausgang (S140).

**Randentscheidung: `scrChat` steht nicht in der Herkunftsliste.** `show()`
räumt die Chat-Oberfläche ab, sobald man den Chat verlässt (S87) — ein Rückweg
dorthin führte auf eine leere Fläche. Aus einem laufenden Gespräch heraus
landet man deshalb weiter auf dem Start. Das ist eine Wiederaufnahme und keine
Rückkehr, und die hat mit `resume()` ihren eigenen Weg. Erlaubt sind
`scrStart`, `scrMyRoom`, `scrShared`, `scrProzess`.

---

## 2 · Aufklappen rechts verschiebt links nichts mehr

**Befund.** Klappte im rechten Panel eine Sektion auf, rutschte der Inhalt der
Papier-Spalte um eine halbe Fensterhöhe nach unten.

**Ursache.** `.rz-regal-offen>.rz-half:first-child .rz-fuss{margin-bottom:50dvh}`
(S125, Desktop). Die Regel hält beim Aufklappen einen Zonenfuß an der Naht, der
**unten** steht (Vorräume, `margin-top:auto`) — sonst sackte er an den unteren
Rand und die halbe Seite spränge.

Auf diesem Screen steht der Zonenfuß **oben** (S125, `.rz-fuss-oben`) und trägt
die Zonenüberschrift; darunter folgt der Inhalt. Dort schiebt `margin-bottom`
nicht den Fuß an die Naht, sondern alles, was unter ihm steht.

S119.4 hatte die Flanke für diesen Screen bereits stillgelegt — aber nur im
zugeklappten Zustand (`:not(.rz-regal-offen)`). Der offene blieb übrig.

**Umsetzung** (`core/ui/design.js`):
`#scrEinstellungen.rz-regal-offen>.rz-half:first-child .rz-fuss{margin-bottom:0}`.
Eine Kennung sticht die Klassenregel; die Reihenfolge im Stylesheet entscheidet
nicht mit (anders als beim S114d.3-Fund, wo Gleichstand herrschte).

Damit gilt für diesen Screen in **beiden** Zuständen dasselbe: keine Flanke.

---

## 3 · Tests

**Neu** — `tests/unit/s141-einstellungen-rueckweg-und-fuss.spec.js` (11):
- Rückweg aus `scrMyRoom` und `scrShared`, je für Zeichen und Pfeil.
- Vom Start aus bleibt es der Start.
- Die Herkunft wird beim Betreten gemerkt und beim zweiten Durchgang
  aktualisiert.
- Regressionsschutz: die Vorräume behalten ihren Rückweg auf den Start.
- CSS: Ausnahme vorhanden, Grundregel für die Vorräume unangetastet, die
  S119.4-Ausnahme steht weiterhin daneben.
- Struktur-Fall, der die **Begründung** absichert: Der Zonenfuß dieses Screens
  trägt `.rz-fuss-oben` und hat Inhalt unter sich. Kippt das Markup je zurück
  auf einen Fuß am Zonenende, ist die Ausnahme falsch — und dieser Fall meldet
  es, statt dass die Regel still weiterläuft.

**Geschärft** — `tests/unit/s140-einstellungen-toggle.spec.js`: „der zweite Tap
führt auf den Start" verlangte das Richtige aus dem falschen Grund (der Screen
kannte damals kein anderes Ziel). Der Fall bleibt stehen, mit ergänzter
Begründung im Kopf: Hier ist der Start zugleich die Herkunft.

---

## 4 · Offen

- Aus einem laufenden Gespräch heraus in den Chat zurückführen — das wäre eine
  Wiederaufnahme (`resume()`), nicht ein Anzeigen, und damit ein eigener
  Schritt.
- Recovery-Zustand in `ladeLage()`, damit `weg.einstZugang` verschwindet,
  sobald der Wiedereinstieg eingerichtet ist (aus S140).
