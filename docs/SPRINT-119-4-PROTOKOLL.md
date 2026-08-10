# Sprint S119.4 — Einstellungen zweispaltig: links unten bündig, rechts oben bündig

**Basis:** `origin/main` @ `cf662c0` (S119.3 · Chat: ein Rollbereich)
**Kern-Hash nach dem Bau:** `130f0f4d5183f65c`
**Deckt ab:** I3 und I4 aus dem Sprintplan S119

---

## 1 · Befund

Auf dem Desktop lag in den Einstellungen „Gerät und Zugang." über „Impressum" und die
Fußmarke über „Datenschutz"; an beiden Spalten stand eine Bildlaufleiste.

Zwei Ursachen, die zusammenwirkten:

**Die gespiegelte Flanke ist für kurze Spalten gebaut.** Ab 900px hält links
`.rz-fuss{margin-bottom:50dvh}` den Zonenfuß über der Naht, rechts beginnt der Inhalt mit
`margin-top:calc(50dvh + var(--rz-nahtfrei))` (T2d / Q3a / S114d). So rücken beide Seiten an
die Naht heran und lassen den Rest frei — richtig in den Vorräumen, wo oben ein Titel und
zwei, drei Zeilen stehen. In den Einstellungen stehen oben Ansicht, Sprache und Verläufe,
unten drei Gruppen samt Rechtlichem. Beide Spalten liefen über.

**Und Flex-Items schrumpfen per Vorgabe.** `flex-shrink:1` ist überall in Kraft; steht die
Spalte auf festem Maß (`.rz-half` ist ab 900px `height:100dvh`), weicht der Text nicht nach
unten aus, sondern läuft aus seiner Box heraus und legt sich auf den Nachbarn. Das ist der
Grund, warum es *überlappte* statt bloß zu rollen.

---

## 2 · Entscheidungen

**Nur dieser Screen.** Die Regeln hängen an der Screen-Kennung `#scrEinstellungen`.
Startseite und Vorräume behalten die gespiegelte Flanke — dort sitzt sie richtig, und sie
ist eine gestalterische Aussage, keine Notlösung.

**Kennung statt Klassenkette.** Eine Kennung sticht jede Klassenregel; die Reihenfolge im
Stylesheet entscheidet hier also nicht mit. Das ist ausdrücklich anders als beim
S114d.3-Fund, wo zwei Regeln gleicher Spezifität standen und die spätere gewann. Die
Ausnahme steht trotzdem hinter der Grundregel — lesbar bleibt lesbar.

**`flex:none` bewusst eng.** Es gilt für die direkten Kinder der beiden Hälften dieses
Screens. Global gesetzt wäre es eine Aussage über jede Fläche der App und müsste dann auch
überall geprüft werden. Ein eigener Schritt, falls je gewollt.

**Was daraus folgt:** Passt der Inhalt nicht ins Fenster, wird künftig **gerollt** statt
übereinandergelegt. Die Bildlaufleisten aus I4 sollten mit der Flankenrechnung verschwinden;
bleibt bei sehr niedrigen Fenstern eine übrig, ist sie dann ehrlich — es gibt dort wirklich
mehr Inhalt als Platz.

---

## 3 · Änderungen

- `core/ui/design.js` — drei Regeln: Ausnahme links (`margin-bottom:0`), Ausnahme rechts
  (`margin-top:0`) innerhalb des 900px-Blocks, sowie `flex:none` für die direkten Kinder
  beider Hälften (breitenunabhängig).
- `tests/unit/s119-4-einstellungen-ausrichtung.spec.js` — neu.

---

## 4 · Tests

Sechs Fälle:

- links fällt der 50dvh-Abstand nach unten weg;
- rechts beginnt der Inhalt oben statt auf halber Höhe;
- die Blöcke schrumpfen nicht mehr untereinander;
- **Regressionsschutz:** die Grundregeln der Flanke stehen unverändert da — die Ausnahme
  nimmt sie nicht weg, sie tritt nur davor;
- `flex:none` ist nicht global gesetzt;
- Aufbau-Probe im DOM: `#scrEinstellungen` ist ein `rz-split` mit zwei Hälften, links dem
  Zonenfuß und rechts den Regalreihen — also genau den Bauteilen, auf die die Regeln zielen.

Der vierte und der sechste Fall sind hier so wichtig wie der Fix: Eine CSS-Ausnahme, die
ins Leere zeigt, wäre grün, ohne etwas zu bewirken.

**Volle Suite:** 266 Dateien, 2585 Fälle, grün (unit 235/2387, engine+worker+e2e 31/198).
**Build:** erfolgreich, Kern `130f0f4d5183f65c`.

---

## 5 · Nachweis am laufenden System

Fenster ≥ 900px, Einstellungen öffnen:

1. Keine Überlappung mehr — „Gerät und Zugang." und die Fußmarke stehen frei.
2. Die helle Spalte endet unten bündig, die grüne beginnt oben.
3. Keine Bildlaufleiste an den Spalten, solange der Inhalt hineinpasst.
4. Gegenprobe: Startseite und beide Vorräume sehen aus wie vorher — die Flanke um die Naht
   ist dort unverändert.

Bei sehr niedrigem Fenster darf eine Spalte rollen. Das ist der gewollte Unterschied zu
vorher: rollen statt überlappen.
