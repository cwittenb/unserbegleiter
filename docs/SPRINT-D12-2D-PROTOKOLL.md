# Sprint D12-2d — Ein Blatt für Ansicht und Sprache

**Design-Track D12-2d** (Basis: `origin/main` @ `4d96336`, *patch-d12-2e-farbaufteilung*) · Einzelpatch

## Was schon da war — und was nicht

Der erste Entwurf dieses Sprints ging von einer Zusammenlegung zweier gleichartiger Schalter aus. Das war falsch. Der Code kennt die Unterscheidung längst:

| | wo | Art |
| --- | --- | --- |
| **Oberflächensprache** | `pstate.language` (pro Person), gespiegelt nach `localStorage["pb.sprache"]` | persönlich, sofort — `setLocale()` + `relaunch()` |
| **Paarsprache** | `couple.locale` im Worker | ausgehandelt: wechselt nur bei zwei gleichlautenden Anträgen beider Rollen |

`core/i18n/index.js` schreibt es im Kopfkommentar sogar hin: „Paarsprache (couple) bzw. UI-Wahl (pstate)". Auch `vorSessionSprache()` liegt fertig da. Gefehlt hat nur der **Schalter**: S36 hatte den EN·DE-Umschalter aus der Kopfzeile entfernt, seither wurde `pstate.language` ausschließlich als Nebenwirkung eines Paarsprach-Wechsels gesetzt.

Wirklich neu sind zwei Dinge: **„Automatisch"** (`prefers-color-scheme` wurde nirgends gelesen) und **überhaupt ein gemerktes Theme** — `applyDesign` endete mit `setze("light")`, jeder Start begann hell.

## 1 · Die Bedien-Ecke trägt ein Zeichen

Statt zweier Pillen ein Blatt-Zeichen: **Baum bei Hell, Seerose bei Dunkel**, getauscht per CSS wie `.pb-baeume`/`.pb-seerosen` und die Kulisse. Am Zeichen sitzt der **Wartepunkt** für einen offenen Sprachantrag des Partners — seit die Paarsprach-Karte in der Agenda wohnt, ist das der einzige Ort, an dem ein Antrag noch auffällt.

Die Klasse `.pb-theme` bleibt am selben Element: `client.js` sucht sie als Wirt für die Push-Glocke (M7a). Ohne sie wäre die Glocke lautlos verschwunden — ein Fund aus dem Bestandstest, der genau davor warnt.

## 2 · Das Blatt

Zwei Gruppen: **Ansicht** (Hell · Dunkel · Automatisch) und **Sprache der Oberfläche** (Deutsch · Englisch), je als Zeile mit Haken. Darunter eine leise Zeile, welche Sprache die Begleitung spricht, mit dem Verweis auf die Agenda. Das Blatt schließt per erneutem Tap und per Klick daneben.

Es sitzt in der Bedien-Ecke am Dokument, nicht in der App-Wurzel: es soll auf jedem Screen erreichbar sein, auch während die Wurzel neu gebaut wird.

## 3 · „Automatisch" hört mit

`setzeAnsicht(doc, wahl)` ist dreiwertig. Bei `auto` wird `prefers-color-scheme` gelesen **und beobachtet** — wer den Nachtmodus per Zeitplan umstellt, soll nicht neu laden müssen. Der Zuhörer hängt genau einmal am Dokument und prüft vor jedem Zugriff, ob die Wahl noch auf `auto` steht.

## 4 · Wo die Wahl wohnt

`pstate.theme` ist die Wahrheit (folgt der Person aufs nächste Gerät), `localStorage["pb.ansicht"]` der Spiegel fürs sofortige Zeichnen — genau das Muster, das `client.js` für die Sprache schon fährt. Der Worker bekommt `theme` in `PSTATE_FELDER`, die Pages-Fassade den zweiten Spiegel.

**Der Boot wartet nicht darauf.** Der erste Versuch las `pstate.theme` mit `await` vor dem Rest des Boots — und der E2E-Vollstack lief in einen Timeout: eine zusätzliche Runde durch die API, bevor die Sitzung stand. Jetzt zeichnet localStorage sofort, und der pstate-Abgleich läuft nebenher nach. Dieselbe Regel wie bei der Kulisse: eine Komfort-Einstellung darf den Start nie aufhalten.

## 5 · Der Paarsprach-Antrag zieht in die Agenda

`psZeile` und `boxPaarsprache` verlassen den Startscreen; die Karte wird unter den Absprachen der Agenda gerendert (`#agendaSprache`, direkt nach dem Rhythmus-Block). Kein Aufklapp-Link mehr — wer die Agenda offen hat, sieht den Stand. Die Zustandsmaschine bleibt unangetastet: `request` / `withdraw`, Wechsel nur bei zwei gleichlautenden Anträgen, erzwungen vom Worker.

Der Knopf „Nur UI-Sprache ändern" entfällt dort — diese Wahl steht jetzt im Blatt.

## Kleine Eigenentscheidungen

- **E1** · Zeichen folgt dem Theme (Baum/Seerose) statt eines festen Symbols.
- **E2** · Der Wächter in `applyDesign` galt bisher für die **ganze** Funktion; er wurde entkoppelt. Das Stylesheet lebt im Head und überlebt einen Hüllenwechsel, die Bedien-Ecke lebt im Body und nicht — wer den Body neu baute, stand ohne Ecke da. Jetzt wacht jeder Teil über sich selbst.
- **E3** · Reihenfolge im Blatt: Ansicht zuerst, Sprache darunter.

## Tests

- `d10-ansicht-umschalter.spec.js` neu geschrieben (11): Ecke wird angelegt, nicht doppelt, auch nach Hüllenwechsel; beide Zeichenfassungen; `.pb-theme` bleibt Wirt der Glocke; dreiwertige Ansicht inkl. Systemvorgabe in **beide** Richtungen, ausdrückliche Wahl überstimmt, unbekannte Werte fallen auf `auto`.
- `d8-vollbild-mitte-sprache.spec.js` (13): Sprachwahl im Blatt, Paarsprache nur als Hinweis mit Verweis auf die Agenda, Ansicht als drei Zeilen, Schließen, alter Knopf weg.
- `paarsprache.spec.js` (8): die drei Zustände jetzt über die Agenda; dazu neu, dass der Punkt am Zeichen genau bei einem **fremden** offenen Antrag erscheint.
- `s37`, `m3` nachgezogen.

Volle Suite grün (**1524**) auf frischem Klon, Build Kern `c0542b0664f8a666`.

## Merkposten

- Der Worker braucht ein Deploy, sonst wird `pstate.theme` abgelehnt und die Ansicht bleibt gerätelokal (die App fällt still auf den localStorage-Spiegel zurück — kein Fehler, nur kein Gerätewechsel).
- `paarspr.uiWechsel` und `paarspr.uiHinweis` sind unbenutzt geworden; die Schlüssel bleiben vorerst im Wörterbuch.
