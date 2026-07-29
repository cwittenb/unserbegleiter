# Sprint U3c · Die Zweiteilung der Freigabe-Auswahl (Turn 41 §1.1)

Basis: `origin/main` @ `4e856f2` (U0 bis U3b gemergt) · Kern-Hash nach Patch: `812b804794ec0e75`
Suite: 1888 grün (Basis 1884 + 4)

> Als Kette hinter U3b gebaut; da U2, U3a und U3b inzwischen auf `main` liegen, setzt der Patch
> direkt dort auf.

Damit ist die Freigabe-**Auswahl** (41a, 41b) vollständig. Die Vorschau (41c) folgt als U4.

---

## 1 · Das Finding

`renderAuswahl` zeichnete Anleitung, Paare **und Leiste** alle auf Papier und ersetzte den
Verlauf. Der Screen verlor damit, was jeder andere Screen der App hat: die Naht als Kante zwischen
dem, was man ansieht, und dem, was man tut.

Die Leiste half sich mit `position:sticky;bottom:0` und einem Papier-Boden — sie klebte am unteren
Rand, hatte aber **keine Haarlinie nach oben**. Wo die Liste unter ihr durchlief, war nicht zu
sehen, wo das eine aufhört und das andere anfängt.

§1.1: **oben Papier** = was du aussuchst, **unten Tiefgrün** = was das Gerät verlässt.

---

## 2 · Die Leiste zieht in die Schreibkante

Der Chat hat seine Zweiteilung längst: `.rz-chat-oben` (Papier, Verlauf) und `.rz-chat-unten`
(Tiefgrün, Schreibkante) mit Naht, Badge und Kulisse dazwischen. Die Auswahl rendert in
`#pbMsgs` — also **schon** in der Papier-Zone. Es fehlte nur, dass die Leiste die andere Hälfte ist.

Neu in `CHAT_HTML()`: ein `#auswLeiste` in der Schreibkante, direkt unter dem Wegweiser-Panel.
`renderAuswahl` füllt ihn statt an die Liste anzuhängen.

**Die Naht ist die Kante** — die fehlende Haarlinie der Sticky-Leiste erledigt sich damit, ohne
dass eine Linie dazukommt. Und `position:sticky` sowie der Papier-Boden entfallen: die Zone hält
sich von selbst unten.

`.rz-ausw-fein` (Zähler, Richtwert) zieht jetzt `--rz-sek2-auf-gruen` statt `--rz-sek2` — die
Leiste steht auf Tiefgrün, dort wäre die Papier-Rolle die falsche.

---

## 3 · Warum der Composer über eine Klasse weicht, nicht über `pb-hidden`

Solange die Auswahl offen ist, gehört die Schreibkante der Leiste: Eingabefeld, Skala,
„Session abschließen" und „Raum verlassen" treten zurück.

Der naheliegende Weg wäre, `pb-hidden` auf diese Elemente zu setzen. **Das hält nicht.**
`aktualisiereComposer()` läuft aus eigenen Anlässen weiter — beim Ende einer Qualitätszeit, beim
Öffnen der Zeitleiste, nach jedem Zustandswechsel der Session — und setzt die Sichtbarkeit dort
jedes Mal neu. Der Composer wäre also jederzeit zurückgekommen, ohne dass jemand ihn gerufen hätte.

Deshalb hängt es an einer Klasse am Screen:

```css
#scrChat.rz-auswahl .pb-composer,
#scrChat.rz-auswahl .pb-skala,
#scrChat.rz-auswahl #btnChatEnde,
#scrChat.rz-auswahl #btnRaumVerlassen{display:none}
```

CSS gewinnt gegen jedes `pb-hidden`-Umschalten, egal wer es auslöst. Ein Test hält fest, dass die
vier Selektoren zusammen in **einer** Regel stehen — träten sie auseinander, könnte einer
vergessen werden.

---

## 4 · Wo das Umschalten steht

In `zeichneAuswahl(box)` — der Stelle, an der ohnehin über „offen oder nicht" entschieden wird.
Damit muss kein zweiter Ort davon wissen, und es gibt keinen Pfad, auf dem die Fläche schließt,
ohne dass die Schreibkante zurückkommt.

Der Aufräumteil ist ausdrücklich dabei: beim Schließen wird die Leiste geleert, nicht nur
versteckt. Eine versteckte Leiste mit altem Inhalt wäre beim nächsten Öffnen für einen Bildaufbau
sichtbar — mit dem Zählerstand der vorigen Auswahl.

---

## 5 · Die Wächter

**`s96-ausschnitt-auswahl-ui.spec.js`** (1 neuer Test) — der strukturelle:
die Leiste liegt in `.rz-chat-unten`, die Knöpfe sitzen darin und **nicht mehr** im Verlauf, der
Screen trägt `rz-auswahl`, und nach dem Verlassen ist die Klasse weg, die Leiste versteckt **und
leer**.

**`u3b-auswahl-verhalten.spec.js`** (3 neue Tests) — die CSS-Seite:
kein `position:sticky`, kein Papier-Boden, der grüne Ton für die feine Schrift, und die
Vier-Selektoren-Regel für das Zurücktreten des Composers.

---

## 6 · Prüfliste für die Sichtprüfung (Stufe B)

| # | Was | Wo |
| --- | --- | --- |
| 1 | Die Auswahl hat eine Naht wie jeder andere Screen — oben Papier, unten Tiefgrün | Ausschnitt teilen, hell + dunkel |
| 2 | **Das Eingabefeld ist weg, solange ausgewählt wird** | dieselbe Stelle |
| 3 | Zähler und die zwei Knöpfe stehen unten und scrollen nicht mit | Auswahl mit vielen Paaren |
| 4 | Das Wegweiser-Badge sitzt weiterhin auf der Naht und öffnet die Anleitung | dieselbe Stelle |
| 5 | Nach „Noch für mich behalten": Eingabefeld zurück, keine Reste der Leiste | zurück im Verlauf |
| 6 | **Eine Qualitätszeit beenden, während die Auswahl offen ist** — der Composer darf nicht zurückspringen | falls erreichbar |
| 7 | Die Vorschau sieht noch aus wie bisher (Knöpfe im Fluss) — das ist U4 | nach „Ansehen, wie es ankommt" |

Punkt 6 ist der Test der Entscheidung aus §3. Punkt 7 ist kein Fehler, sondern der offene Rest.

---

## 7 · Was noch offen ist

- **U4 · Die Vorschau** (41c, §4.8–4.11): Ausschnitt auf Papier, Rahmensatz und die zwei Wege und
  „Freigeben" unten in Tiefgrün; `.rz-teilen-block` als dunkler Kasten auf Papier entfällt ganz;
  das „×" bekommt 44 px; die Wege werden Haarlinien-Zeilen statt nativer Checkboxen.
- **U5 · Zugang in den Einstellungen** (41d) — K13 ist beantwortet (es wird ein Screen), aber die
  Navigation ist noch nicht geklärt: ein Screen braucht einen Weg hinein, eine Zurück-Kante und
  eine Antwort darauf, was die Bedien-Ecke dann noch tut.
- **U6 · Pflicht-Vollbild** (41e, 41f).
