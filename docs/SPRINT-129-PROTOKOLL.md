# Sprint S129 — das Erstkontakt-Signal, zwei Prompt-Regeln und ein Markenwächter

**Basis:** `origin/main` @ `f66d4e9` (S127) **plus S128**
**Kern-Hash nach dem Bau:** `83409c9e7d587e38`
**Deckt ab:** I9 (belegt durch ERO-03), Teil der Markenfrage; **F23 bleibt offen und wird jetzt gemessen**

---

## 1 · Der Beleg, der diesen Sprint auslöst

| Check | ERO-01 (ohne Signal) | ERO-03 (mit Signal) |
| --- | --- | --- |
| „wieder da" | 30/30 verletzt | **0/30** |
| erfundene Anknüpfung | 30/30 verletzt | **0/30** |
| Beginn bei null | 30/30 verletzt | **0/30** |
| erfundene Marke | 27/30 | 30/30 |

Ein Satz im Kontext kippt drei rote Linien von „immer" auf „nie". `mistral-large-latest` ist
also **nicht** ungeeignet für den Solo-Pfad — es scheitert ausschließlich an einer Weiche, die
auf einem Fehlen beruht. Wo nichts steht, füllt es die Lücke mit dem, was plausibel klingt,
und erfindet passende Erinnerungen dazu.

I9 wird damit **mit Beleg** gebaut, nicht auf Verdacht.

---

## 2 · Das Signal

`steuerTexte.erstkontakt`, in beiden Korpora. Die App sendet ihn als versteckten Zug, wenn
`baueSoloKontext` `null` liefert — **vor** dem Auftakt, damit die Lage geklärt ist, bevor die
Aufforderung kommt.

**Bewusst schmucklos.** Meine Testfassung in ERO-03 lautete „ERSTKONTAKT (app-intern): …" —
und das Modell erfand daraufhin passende Marken dazu: `[[EINSTIEG]]`, `[[START]]`,
`[[EINSTIEG · KALTER START]]`. Bei den Marken ging es von 27/30 auf 30/30.

**Der Kontexttext lehrt eine Formsprache mit.** Wer ein Versalienwort mit Doppelpunkt und
Klammerzusatz hineinschreibt, führt vor, wie „app-intern" in diesem System aussieht — und
bekommt es zurück. Der eingebaute Satz nennt darum nur die Leerstellen, in gewöhnlicher
Sprache, ohne Etikett und ohne Klammern. Ein Test hält das fest (keine Versalienwörter, keine
Klammern, kein Doppelpunkt-Label).

---

## 3 · Zwei Prompt-Regeln, die fehlten

**Die Umkehrung.** Der Prompt verbot „behaupte nie, wir kennen uns noch nicht, wenn Kontext
vorliegt" — die andere Richtung stand nirgends. Jetzt steht sie da, in beiden Sprachen, mit
dem Grund: Beides ist derselbe Verstoß, der Einstieg behauptet eine Geschichte, die die
Person nicht hat.

**Doppelte eckige Klammern.** Im Reflexionsraum gibt es planmäßig keine Marken; ein Verbot
fehlte trotzdem.

### Der Wächter hat mich beim Wort genommen

Mein erster Entwurf des Verbots nannte Beispiele: „nicht als Gliederung oder Abschluss
(`[[weiter]]`, `[[START]]`)". Die Korpus-Invariante fiel sofort — sie prüft, welche Marken
ein Korpus enthält, und ich hatte gerade zwei eingeführt, während ich sie verbot.

**Ein Prompt, der eine Marke nennt, führt sie ein.** Das Verbot steht jetzt ohne Beispiele,
und der Grund steht dabei. Vierter Fall derselben Falle in diesem Strang — nach Kommentaren
in `design.js`, in `core/` und in einem Test.

---

## 4 · Der Markenwächter — messen, nicht riegeln

Der Katalog war für erfundene Marken **blind**: Von 21 roten Linien prüfen drei darauf, alle
drei in der Familie ERO, alle drei zwei Stunden alt. Die übrigen 39 Szenarien schauen nicht
danach, und alle älteren Läufe liefen gegen ein Modell, das nicht in Produktion ist.

Deshalb hängt der Wächter am **Zug**, nicht am Szenario: `markenImText` prüft jede
Assistant-Antwort gegen die `markerOrder` ihrer Session. Damit messen alle 42 Szenarien es
rückwirkend mit, ohne dass jemand daran denken muss.

Zwei Arten, getrennt gezählt:

- **`fremd`** — steht in keiner Liste. Bekanntes Anzeigeproblem, seit S119.6 abgefangen.
- **`unzeit`** — eine **echte** Marke dieser Session an unerwarteter Stelle. **Bisher nie
  beobachtet.**

Der zweite Fall ist die offene Frage **F23**: Erfindet ein Modell zufällig eine Zeichenfolge,
die einer echten Marke gleicht, steuert sie die Oberfläche — `findeMarker` läuft vor dem
Anzeigefilter. Der Riegel dagegen wäre ein Eingriff in die Ablaufsteuerung.

**Den baue ich nicht.** Es gibt keinen einzigen beobachteten Fall; der Sprung von „das Modell
setzt Marken" zu „es trifft eine echte" ist eine Konstruktion, keine Beobachtung. Bleibt
`unzeit` über die kommenden Läufe bei null, ist es ein Anzeigeproblem und bleibt eines. Wenn
nicht, reden wir mit Daten.

**Die Spur ändert keine Wertung** — ein Test hält genau das fest.

---

## 5 · Zwei nachgezogene Tests, beide lehrreich

**`chat-ux`** prüfte `msgs[0]` auf den Auftakt. Der steht jetzt an zweiter Stelle. Der Test
sucht ihn nun nach Inhalt statt nach Position — die Zusicherung war nie die Position.

**`s99-7`** übergab die feste Kennung `P4-5`. Paar-Kennungen sind Positionen im Verlauf
(`"P"+i+"-"+j`), ein zusätzlicher versteckter Zug verschiebt jede um eins. Der Test nutzt
jetzt eine Kennung, die es nicht geben kann (`P999-1000`) — gemeint war ohnehin: Eine
geratene Kennung lässt die Tür zu.

Beide Fälle sind derselbe Fehlertyp wie beim `z-index`-Wächter in S125: **Ein Test, der eine
Zahl prüft statt einer Beziehung, misst beim nächsten Zug etwas anderes als gemeint.**

---

## 6 · Änderungen

- `core/prompts/prompts.de.js` / `.en.js` — `erstkontakt`, Umkehrregel, Klammer-Verbot.
- `core/ui/app.js` — das Signal bei fehlendem Kontext.
- `evals/runner-kern.js` — `markenImText`, `markerOrderFuer`, `markenSpurImTranskript`.
- `tests/unit/s129-erstkontakt-und-marken.spec.js` — neu, 15 Fälle.
- `tests/unit/chat-ux.spec.js`, `tests/unit/s99-7-paar-kennungen.spec.js` — nachgezogen.

**Volle Suite:** grün (unit 245/2510 in zwei Scherben, engine+worker+e2e 32/212).
**Build:** Kern `83409c9e7d587e38`.

---

## 7 · Was als Nächstes zu messen ist

```
node evals/runner.js --szenario ERO-03 --provider mistral --rpm 30 \
  --pipeline-modell mistral-large-latest --judge-modell mistral-medium-latest \
  --erlaube-gleiches-modell
```

ERO-03 trägt weiterhin **meine** Testfassung des Signals. Sinnvoll wäre, das Szenario auf den
eingebauten Text umzustellen und neu zu messen: Fällt C4 dann auf das Niveau von ERO-02
(10/30) zurück, war der Signaltext das Problem. Bleibt es bei 30/30, ist es Grundverhalten
und Punkt 2 muss tragen.

**Und weiterhin der schnellste Weg für heute:** `MISTRAL_MODEL` auf `mistral-medium-latest`
stellen — dort 0/50 bei den Marken.
