# Sprint D12-2a — Turn 27: die Etiketten-Ordnung

**Design-Track D12-2a** (Basis: `origin/main` @ `c37a1ae`, *missing S96x*) · Kette: **patch-d12-2a** → patch-d12-2b
Quelle: `DELTA-turn27.md` + Designdokument Turn 27 (27a–27e), Handoff aus Claude Design.

## Befund — zwei Etiketten gleicher Ordnung

Seit D2/D3 trugen die Screens zwei Beschriftungen derselben Gewichtsklasse übereinander: im Kopf ein Caps-Etikett mit dem Raumnamen („RAUM FÜR MICH"), unmittelbar darunter der Serif-Titel „Der Raum." — und unten in der Regal-Zone dieselbe Dopplung noch einmal, „Das Regal." plus die Caps-Gruppenzeile „Mein Weg". Vier Etiketten auf einem Schirm, von denen zwei dasselbe sagen.

Turn 27 räumt das auf, indem er jedem Element genau einen Platz gibt:

| Was | Wo es jetzt steht |
| --- | --- |
| Paar-Signatur | Kopfzeile, auf **jedem** Screen |
| Ortsname | Wegweiser-Badge auf der Naht |
| Zonenname | genau ein Serif-Titel je Zone |
| Wortmarke | Fuß jedes Screens |

## Umsetzung

**1 · Die Kopfzeile trägt die Paar-Signatur.** Neue Klasse `.rz-signatur` (11 px, 600, `letter-spacing:.34em`, uppercase, zentriert; gedimmt auf Papier, `--rz-sek2-auf-gruen` auf Tiefgrün). Die Sperrung ist bewusst weiter als bei `.rz-caps` (.2em) — das hält die beiden Zeilenarten optisch auseinander, auch wenn sie einmal untereinander stehen.

Der **eigene Name steht zuerst**: Anna sieht „ANNA & BERND", Bernd sieht „BERND & ANNA". Das Format lebt als `allg.signatur` (`{ich} & {partner}`) in beiden Wörterbüchern — nicht als verdrahtetes `" & "` im Code, sonst stünde ein sichtbarer Text wieder in `app.js` (der i18n-Kanarientest wacht darüber).

`setzeSignatur()` und `setzeMarke()` suchen über die Attribute `data-rz-signatur` / `data-rz-marke` statt über Ids: die Chat-Fläche wird seit S87 bei **jedem** Betreten neu aus der Vorlage gebaut, eine Id-Zuweisung im Boot liefe dort ins Leere. Beide werden deshalb im Boot *und* nach jedem Aufbau der Chat-Fläche gesetzt. Ohne geladene Lage bleibt die Signatur leer — ein Platzhalter würde beim Nachladen sichtbar springen.

**2 · Das Badge nennt den Ort — mit dem Wegweiser-Zeichen.** Neues Icon `IKON.wegweiser`: ein Pfosten mit Schild, 9 × 11, als Flächen statt Striche gezeichnet (bei 9 px bleibt das scharf) und über `currentColor` eingefärbt. Es steht **immer** neben dem Badge-Text, auch dort, wo das Badge einen Ortsnamen trägt.

Die Label-Quelle je Ort: Startseite `weg.badge` („Wegweiser" — dort gibt es keinen einzelnen Ort), eigener Vorraum `start.capsMein`, gemeinsamer Vorraum `start.capsTeil`. Der Kopf des **geöffneten Panels** bleibt unverändert `weg.badge`.

**3 · Ein Titel je Zone.** In den Vorräumen wird die Regalgruppe zum Zonentitel: die H2 unten trägt jetzt `mein.gruppeRegale` / `teil.gruppeRegale`, die Caps-Gruppenzeile darunter entfällt ersatzlos. `zone.regal` („Das Regal.") wird dort nicht mehr gerendert — der Schlüssel bleibt in beiden Wörterbüchern erhalten. Oben steht unverändert `zone.raum`.

Weil die Regalgruppe damit aus einer Caps-Zeile zu einem Serif-Titel wird, bekommt sie den Punkt der Titel-Familie: „Mein Weg." / „Euer gemeinsamer Boden." (EN „My path." / „Your common ground."). Der Punkt sitzt in der i18n, nicht im Markup — sonst müsste jede Sprachfassung ihn sich vom Code aufzwingen lassen.

**Startseite als Ausnahme:** dort steht „RAUM FÜR MICH" weiterhin als Caps-Etikett, jetzt aber **direkt über der Betreten-Zeile** (`.rz-caps-ueber`, 11 px Abstand) statt über der Begrüßung. Die untere Hälfte behält ihr Etikett unter der Betreten-Zeile — die Symmetrie an der Naht ist damit erhalten.

**4 · Die Wortmarke ist Signet am Fuß.** Neue Klasse `.rz-fussmarke` (gleiche Größe und Sperrung wie die Signatur, zentriert, 28 px Abstand nach oben; im Chat 6 px). Sie steht als letztes Element der jeweils unteren Zone in allen fünf Screen-Rahmen. Auf Tiefgrün trägt sie einen eigenen Ton: neuer Token `--rz-marke-auf-gruen:#6f8062` — der Entwurf nennt dort ausdrücklich den helleren Wert, `--rz-marke` (#5c6653) wäre zu dunkel.

Die Start-Marke behält ihre Id `pbKern`, damit der Bestand daran nicht neu suchen muss; gefüllt werden alle fünf über `[data-rz-marke]`.

**Nachtrag zum Prozess-Screen** (nicht Teil des Entwurfs, aber betroffen): sein Kopf trug bisher `prozess.titel` als Caps-Etikett. Weil der Kopf jetzt die Signatur trägt und dieser Screen kein Badge hat, das den Ort nennen könnte, wandert `prozess.titel` als H1 in den Inhalt — dieselbe Bauform wie „Der Raum." *Das war eine kleine Eigenentscheidung; wenn der Titel dort anders stehen soll, ist es ein Handgriff.*

## Kleine Eigenentscheidungen

- **E1** · Signatur-Format als i18n-Schlüssel statt verdrahtetem Trennzeichen.
- **E2** · Eigener Farb-Token für die Marke auf Tiefgrün.
- **E3** · Wegweiser-Zeichen als Inline-SVG in `currentColor` statt zweier positionierter `span`s wie im Prototyp — gleiche Optik, skaliert mit der Schriftgröße.
- **E4** · `prozess.titel` als H1 im Inhalt (s. o.).

## Tests

Neu: `tests/unit/d12-2a-kopf-badge-marke.spec.js` (17) — je Schritt die Zusicherungen: genau eine Signatur je Kopf und **beide Rollen** gelesen (eigener Name zuerst), kein Raum-Caps mehr im Kopf, das Icon in jedem Badge, Ortsname je Screen, genau eine H2 je Regal-Zone, `zone.regal` gerendert nirgends und im Wörterbuch überall, das Startseiten-Etikett **vor** der Betreten-Zeile, die Fußmarke als letztes Kind ihrer Zone.

Nachgezogen: `d2-startscreen.spec.js` und `s37-auftragsklaerung.spec.js` (Marke wandert vom Kopf an den Fuß), `d3-vorraeume.spec.js` (Zonentitel unten), `d4-chat.spec.js` (Signatur statt Caps-Titel im Chat-Kopf), `s69-boden-ueberschrift.spec.js` (Wortlaut mit Punkt).

Volle Suite grün (**1481**) auf frischem Klon.

## Merkposten

Der Sessionname verlässt in diesem Patch den Chat-Kopf und steht als leise Serif-Zeile über der ersten Nachricht (`.rz-sessionname`). Die Zweiteilung des Chats mit Naht und Ortsbadge folgt in **patch-d12-2b**.
