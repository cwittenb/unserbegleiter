# Sprint D12-2f — Sichtbar, richtig herum, und der Antrag steht im Blatt

**Design-Track D12-2f** (Basis: `origin/main` @ `dd3b831`, *patch-r4b-chatkern*) · Kette: **f → T1a**

Neu aufgesetzt nach dem R-Track: das Einstellungsblatt lebt seit R4b in `core/ui/einstellungen-screen.js`, der Antragsknopf ist dort eingezogen.

## 1 · Warum die Zeilen unsichtbar waren

Das Blatt hängt am selben Element wie die Bedien-Ecke, und dieses trägt weiterhin `.pb-theme` — als Wirt für die Push-Glocke (M7a). Aus D10 lagen dort aber noch die Regeln des alten Pillen-Paars:

```
.pb-theme button{font-size:0; …}      /* der sichtbare Text war ein ::before-Zeichen */
.pb-theme button.an{display:none}     /* der aktive Zustand wurde ausgeblendet */
```

Beides greift auf **jeden** Knopf im Blatt durch: die Zeilen waren anklickbar, aber `font-size:0` — und die gerade gewählte Zeile war ganz weg.

Die Pillen-Regeln sind entfallen, ebenso `#pbHell::before`/`#pbDunkel::before`. `.pb-theme` bleibt reine Haltemarke ohne Aussehen; ein Test hält fest, dass keine `.pb-theme button`-Regel mehr existiert.

*Lehre: eine Klasse, die nur noch als Anker dient, muss ihr Aussehen abgeben — sonst vererbt sie es an alles, was später darunter einzieht.*

## 2 · Das Zeichen ist das Wechselziel

Auf **Hell** steht die **Seerose**, auf **Dunkel** der **Baum** — dasselbe Prinzip wie beim alten Pillen-Paar, bei dem stets nur der inaktive Zustand sichtbar war.

## 3 · Der Antrag wird im Blatt gestellt, verhandelt in der Agenda

Der Sprachabschnitt trägt DE · EN für die eigene Oberfläche, die Zeile mit der Sprache der Begleitung und den Knopf **„Sprachwechsel vorschlagen"**. Der Knopf ruft `backend.language.request(ziel)` — der Eintrag entsteht in der Agenda, wo er bestätigt, zurückgezogen oder abgelehnt wird. Steht bereits ein Antrag, zeigt das Blatt seinen Stand statt eines zweiten Knopfs. Ohne `backend.language` erscheint der Knopf gar nicht.

Neue Schlüssel: `einst.vorschlagen`, `einst.antragOffen`.

## Tests

`d10` (12): das Zeichen zeigt das Wechselziel; keine `.pb-theme button`-Regel mehr.
`d8` (15): Knopf vorhanden und benannt; Klick stellt den Antrag, das Blatt wechselt auf die Standzeile.

Volle Suite grün (**1593**).
