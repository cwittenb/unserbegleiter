# Sprint U2 · Die Wegweiser-Fläche (Turn 41 §3)

Basis: `origin/main` @ `e9ed89e` (U0 und U1 gemergt) · Kern-Hash nach Patch: `c7d25d0c1e6acb40`
Suite: 1871 grün (Basis 1860 + 11)

> Als Kette hinter U1 gebaut; da U0 und U1 inzwischen auf `main` liegen, setzt der Patch direkt
> dort auf. Die Nutzlast ist auf diesem Stand entstanden, nicht nur dagegen geankert
> (Lehre aus `SPRINT-U1-PROTOKOLL.md` §6a).

---

## 1 · §3 ist zum größten Teil eine Bestätigung

Der erste Satz von §3 sagt es selbst: „**Maßgeblich ist der Ist-Stand**, nicht das Band aus 25d."
Der Abschnitt prüft die vorhandene Umsetzung gegen eine ältere Designidee und bestätigt sie —
er gestaltet nicht neu. Nachgemessen:

| §3 verlangt | Ist im Repo |
| --- | --- |
| aufgeklappt wird der Wegweiser die Zone | `position:absolute; left:0; right:0`, skaliert von der Mitte auf — **so** |
| das Badge weicht dem Text | Panel `z-index:4`, Badge `z-index:3` — **so** |
| Absätze Serif 17 / 1.5 | `--rz-serif`, `--rz-fs-zeile`, `--rz-lh-fein` — **exakt so** |
| zentriert „tippen zum Schließen" darunter | `.rz-weg-fuss{text-align:center}` — **so** |
| kein grünes Band, kein Schließen-Kreuz | existiert beides nicht — **so** |
| kein abgedunkelter Hintergrund, Raum darüber in voller Deckkraft | kein Schleier vorhanden — **so** |
| dieselbe Gestalt fürs Chat-Badge | seit T2-5 erledigt |
| **Absatzabstand 22 px** | war `14px` — **geändert** |
| **Fläche hebt sich einen Ton vom Boden ab** | war `--rz-papier` — **geändert** |
| Fußzeile 13 px, `--rz-sek2` | bleibt 11 px, `--rz-sek` — bewusste Abweichung, siehe §4 |

Der Sprint war ursprünglich als mittelgroß und riskant geplant („berührt alle vier vorhandenen
Wegweiser"). Das war eine Fehleinschätzung meinerseits: **es sind zwei Werte.**

Der Wächter hält deshalb vor allem fest, was schon stimmt — inklusive der drei Dinge, die §3
ausdrücklich **nicht** haben will (Band, Kreuz, Schleier). Sie haben nie existiert; der Test sorgt
dafür, dass das so bleibt.

---

## 2 · Die Fläche

Das Panel trug bisher `background:var(--rz-papier)` — **exakt den Ton der Zone darüber**. Als
Fläche war es damit unsichtbar; getrennt wurde es allein durch die zwei Haarlinien oben und unten.
Genau davon will §3 weg: der aufgeklappte Wegweiser soll sich als eigene Zone lesen.

Neues Token `--rz-weg-flaeche`: hell `#f7f4ed`, dunkel `#2c3428` (der Wert aus §3).

### Warum der helle Ton nicht dunkler ist

Auf Papier stoßen zwei Anforderungen aneinander. Je dunkler die Fläche, desto sichtbarer die Zone —
und desto weniger Kontrast bleibt der Fußzeile, die seit T3-3 auf `--rz-sek` steht, weil sie eine
Anweisung trägt.

| Flächenton | `--rz-sek` darauf | Abhebung vom Papier |
| --- | --- | --- |
| `#faf8f2` (Papier, vorher) | 4.70 | — |
| **`#f7f4ed` (gewählt)** | **4.55** | 1.03 |
| `#f4f1e8` (mein erster Vorschlag) | **4.43** ✗ | 1.06 |
| `#f2efe8` | 4.35 ✗ | 1.08 |

Mein ursprünglicher Vorschlag `#f4f1e8` wäre unter 4.5 gefallen und hätte die T3-3-Entscheidung
stillschweigend zurückgenommen. `#f7f4ed` ist der dunkelste Ton mit Luft über der Schwelle.

**Eine Asymmetrie, die dabei sichtbar wurde:** im dunklen Theme hebt sich `#2c3428` gegen Papier
`#242b21` mit 1.13 ab und trägt `--rz-sek` mit **7.04** — dort ist reichlich Luft. Am oberen Ende
der Helligkeitsskala kostet derselbe Schritt Kontrast-Spielraum, am unteren nicht. Die helle
Fassung ist deshalb subtiler als die dunkle; zusammen mit den Haarlinien reicht es, aber es ist
kein starker Effekt.

**Falls dir die helle Fläche zu unscheinbar ist:** der Weg wäre nicht ein dunklerer Ton, sondern
die Fußzeile und die Hinweiszeile auf `--rz-marke` (5.68 : 1 auf Papier) zu heben. Dann hätte die
Fläche wieder Luft nach unten. Das wäre ein eigener kleiner Schritt.

Beide Paare stehen jetzt im **Kontrast-Wächter** (`--rz-ink` und `--rz-sek` gegen
`--rz-weg-flaeche`, je 4.5). Wer die Fläche später nachdunkelt, kommt dort vorbei.

---

## 3 · Der Absatzabstand

`.rz-option` stand auf `margin:0 0 14px`. §3 nennt 22 px — beides liegt neben dem Raster
(4 / 8 / 12 / 16 / 24 / 32). **Entschieden: `--rz-r-5` (24 px)**, die nächste Rasterstufe über dem
genannten Wert.

---

## 4 · Was bewusst nicht mitgeht

§3 setzt die Fußzeile auf 13 px und `--rz-sek2`. Sie bleibt bei 11 px und `--rz-sek`:

- **`--rz-sek2` wäre 3.07 : 1.** T3-3 hat diese Zeile bewusst auf `--rz-sek` (4.70) gehoben, weil
  „tippen zum Schließen" die einzige Angabe ist, wie man das Panel wieder loswird — eine Anweisung,
  keine Zier. Das war eine explizite Entscheidung und bleibt.
- **Die Hierarchie trägt die Größe**, nicht die Farbe: 11 px Caps gegen 17 px Serif der Absätze.

---

## 5 · Der Wächter (`tests/unit/u2-wegweiser-flaeche.spec.js`, 7 Tests)

- Fünf Tests halten fest, was §3 bestätigt — Zone über die volle Breite, Badge unter dem Panel,
  Serif 17/1.5, zentrierte Fußzeile, und **kein** Band / Kreuz / Schleier.
- Zwei Tests decken die Änderungen: die Fläche zieht `--rz-weg-flaeche` (in beiden Themes
  angelegt), der Absatzabstand liegt auf `--rz-r-5`.

Dazu zwei neue Paare im Kontrast-Wächter.

---

## 6 · Prüfliste für die Sichtprüfung (Stufe B)

| # | Was | Wo |
| --- | --- | --- |
| 1 | Wegweiser aufklappen: die Fläche liest sich als eigene Zone, nicht als Papier mit zwei Linien | Startseite, hell + dunkel |
| 2 | **Im hellen Theme: reicht der eine Ton?** Siehe §2 — er ist bewusst zurückhaltend | Startseite hell, verschiedene Bildschirme |
| 3 | Absätze stehen luftiger als vorher (24 statt 14 px) — noch ein Panel oder schon eine Liste? | Vorraum mit drei Zeilen |
| 4 | „tippen zum Schließen" unverändert lesbar | alle Wegweiser |
| 5 | Chat-Wegweiser sieht genauso aus wie die in den Vorräumen | Reflexionsgespräch |

Punkt 2 und 3 sind die eigentlichen Abnahmen — beide Werte sind Geschmacksfragen mit Messgrenze.

---

## 7 · Stand des U-Tracks

| | | |
| --- | --- | --- |
| U0 | Inline-Stile außerhalb der Turn-41-Screens | geliefert |
| U1 | Feldkante (§2) | geliefert |
| **U2** | Wegweiser-Fläche (§3) | **dieser Patch** |
| U3 | Freigabe-Auswahl (41a, 41b) | startbar |
| U4 | Freigabe-Vorschau (41c) | startbar |
| U5 | Zugang in den Einstellungen (41d) | K13: wird ein Screen — Navigation und Bedien-Ecke vorher klären |
| U6 | Pflicht-Vollbild (41e, 41f) | startbar |
