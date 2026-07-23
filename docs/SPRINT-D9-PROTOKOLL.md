# Sprint D9 — Regal-Vollbild: ruhig öffnen

**Design-Track D9** (Basis: D8) · Kette: … → patch-d8 → **patch-d9**

## Befund — woher das Ruckeln kam

Die Vorräume sind seit D3 eine Zweiteilung, in der sich beide Zonen den Schirm teilen (`flex:1`). Ein Regal-Eintrag füllte seinen Kasten und nahm ihm `pb-hidden` — schlagartig, mitten im Layout:

1. **Die Naht sprang.** Neuer Inhalt in der unteren Zone verschiebt die Grenze zwischen den Hälften; Wegweiser-Badge und Kulisse hängen an dieser Grenze und ruckten mit.
2. **Das Dokument wuchs.** Die Zweiteilung hatte nur `min-height:100dvh` — längere Inhalte machten die Seite höher, eine Bildlaufleiste erschien (und beim Zuklappen wieder), was die ganze Breite um wenige Pixel verschob.
3. **`display:none` lässt sich nicht überblenden.** Der Kasten war entweder ganz da oder gar nicht — nichts konnte anlaufen.
4. **Mehrere Kästen konnten gleichzeitig offen sein** — jeder weitere Tap verschob erneut alles darunter.

## Umsetzung

**Zustand `rz-regal-offen` am Screen.** Sobald ein Regal-Kasten offen ist, übernimmt die Regal-Zone den ganzen Schirm:

- Die obere Zone faltet sich weg (`flex-grow: 1 → 0`, 360 ms, gleiche Kurve wie überall) und blendet aus — sie wird nicht entfernt, nur zusammengelegt, deshalb bleibt der Rückweg exakt symmetrisch.
- Die Höhe ist im offenen Zustand auf `100dvh` **festgenagelt** (`overflow:hidden`): das Dokument wächst nicht mehr, keine Bildlaufleiste kommt und geht.
- Der Inhalt rollt **innerhalb** der Zone (`flex:1; min-height:0; overflow-y:auto`) und blendet mit 120 ms Versatz ein — er läuft der Bewegung hinterher statt mitten hinein.
- Wegweiser-Badge und Kulisse treten leise ab (sie hängen an der Naht bzw. am Zonenfuß, die beide gerade unterwegs sind).

**Die Überschrift fährt nach oben** (`order:-1` im offenen Zustand). Damit sie *fährt* statt zu springen, macht `regalModus()` FLIP: Position messen → Zustand setzen → neu messen → die Differenz als `translateY` vorgeben → im übernächsten Bild loslassen. Das ist eine reine Transform-Bewegung; das Layout wird nicht je Bild neu gerechnet. Ohne Layout (Testumgebung) ist die Differenz 0 — dann passiert nur der Zustandswechsel, nichts bricht.

**Immer nur ein Kasten offen.** `infoToggle` schließt die Geschwister derselben Zone, bevor es öffnet. Ausgenommen ist `boxRecovery`: der Wiedereinstiegs-Hinweis steht von selbst da, schließt nicht mit und zählt auch nicht als Regal-Inhalt — sonst hinge der Raum dauerhaft im Vollbild.

**Bewegung ist abschaltbar:** `prefers-reduced-motion` nimmt Übergänge und Einblendung heraus; der Zustand wechselt dann hart.

## Nachtrag — sieben Feinheiten

1. **Entwickler-Panel unten rechts** (`platforms/artifact/shell.html`): aus der linken oberen in die rechte untere Ecke, rechtsbündig ausgerichtet, klappt nach oben auf. Es liegt weiter über allem (`z-index:60`) und teilt sich die Ecke mit dem DE/EN-Knopf — dev-only, deshalb bewusst in Kauf genommen.
2. **Klick oberhalb schließt.** Ein Tap auf die obere Zone fährt das Regal herunter (`regalZu`). Der ←-Knopf bleibt unberührt: er schließt und navigiert, was beides richtig ist.
3. **Der obere Teil bleibt exakt stehen.** Er wird nicht mehr zusammengefaltet und nicht ausgeblendet — beim Öffnen misst `regalModus()` seine Höhe und setzt sie als `--rz-oben-h` fest, damit das Flex-Layout nichts neu verteilt. Oben verschiebt sich kein Pixel.
4. **Bis unter den Titel.** Die Regal-Zone legt sich als Fläche darüber, von der Unterkante des Kopfes (dort steht „Raum für uns" bzw. „Raum für mich") bis zur Unterkante des Schirms — gemessen als `--rz-regal-top`. Die Bewegung selbst läuft weiter als FLIP, jetzt an der Zone statt an der Überschrift.
5. **Akkordeon direkt unter der Zeile.** Die Kästen stehen jetzt im Markup **unmittelbar hinter ihrer Zeile** (statt gesammelt darunter) und tragen `data-box` als Zuordnung. Der Inhalt wächst aus dem Trennstrich hervor: `clip-path: inset(0 0 100% 0) → inset(0)`, also eine Freilegung nach unten — der Text wird dabei nicht gestaucht, wie es ein `scaleY` täte.
6. **Die offene Zeile verliert ihren Pfeil** (`rz-auf`) — der Weg nach unten steht jetzt an einer Stelle, nicht an zweien.
7. **Zu-Pfeil an der Zonen-Überschrift.** „Das Regal." und ein ↓ ganz rechts teilen sich eine Zeile (`rz-fuss-kopf`); der Pfeil erscheint nur im offenen Zustand. Als Beschriftung dient der bestehende Schlüssel `weg.fuss` („tippen zum Schließen") — **kein neuer Text**.

**Abwägung, die dir gehört:** Die Überschrift „fährt" jetzt nicht mehr eigenständig nach oben — sie reist mit der Zone, die als Ganzes hochfährt (Punkt 4), und blendet an ihrem neuen Platz kurz ein. Zwei getrennte FLIP-Bewegungen (Zone *und* Überschrift) hätten sich addiert und die Überschrift doppelt so weit laufen lassen. Falls du die Überschrift zusätzlich eigenständig wandern sehen willst, ist das ein eigener Handgriff.

## Weitere Ruhe-Ideen (nicht umgesetzt, zum Abwägen)

- **Auch die Session-Zeilen der oberen Zone** öffnen heute in einen Chat-Screen — das ist ein harter Screenwechsel. Eine gemeinsame Übergangs-Grammatik (Zone wächst, Rest faltet sich) wäre der nächste konsequente Schritt.
- **Feste Zeilenhöhen im Regal:** Einträge unterschiedlicher Länge lassen die Liste beim Nachladen zucken. Eine Mindesthöhe je Zeile würde das glätten.
- **Bildlaufleisten-Reserve** (`scrollbar-gutter: stable`) auf dem Desktop, damit auch außerhalb des Vollbildmodus nichts um Pixel springt.
- **Inhalt vor dem Öffnen füllen:** Heute füllt `zeigeRegal()` erst und zeigt dann. Bei langsamem Speicher sieht man kurz einen leeren Kasten — Füllen im verborgenen Zustand und erst danach öffnen wäre ruhiger.

## Tests

Neu: `tests/unit/d9-regal-vollbild.spec.js` (14): die vier Ruhe-Verträge im CSS (Höhe festgenagelt, Rollen in der Zone, Überschrift nach oben, Bewegung abschaltbar) und das Verhalten in **beiden** Räumen (Zustand kommt und geht, nur ein Kasten zugleich, Wiedereinstiegs-Hinweis zwingt nichts ins Vollbild).

Dazu die Nachtrags-Verträge: oberer Teil festgesetzt statt gefaltet, Zone bis unter den Kopf, Akkordeon per `clip-path`, Pfeil-Zustände — und das Verhalten: Zu-Pfeil, Klick oberhalb, nur die offene Zeile ohne Pfeil. `s36-ui.spec.js` nachgezogen (Kasten sitzt jetzt direkt hinter seiner Zeile).

Volle Suite grün (**1242**), Build Kern `59f6d81040f923f7`.
