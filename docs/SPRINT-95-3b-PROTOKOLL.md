# Sprint S95.3b — Karenz für jede Querung, konstantes Wege-Menü

**Basis:** `origin/main` @ `7395672` + **S95.1** + **S95.2** + **S95.3** + **S95.4**
**Kettenreihenfolge:** `s95-1` → `s95-2` → `s95-3` → `s95-4` → **`s95-3b`**
**Designgrundlage:** `designnotiz-dialogausschnitt.md` §4/D5, Sprintbesprechung

---

## Ziel

Zwei Inkonsistenzen beseitigen, die im Gebrauch zu falschen Erwartungen führen:
ungleiche Rücknehmbarkeit je Artefakt-Art und Weg, und ein Wege-Menü, das das
Modell unsichtbar verengt.

## Geändert

| Datei | Art |
|---|---|
| `core/engine/regal.js` | Agenda-Fach, Freigabe-Klammer, konstantes Menü |
| `core/ui/sessions.js` | `quereGate` als EINE Freigabe, Agenda-Schreiber über Routen |
| `platforms/cloudflare/worker/index.js` | Agenda-Redaktion, PUT-Riegel, 2 Routen |
| `platforms/cloudflare/pages/client.js` | Adapter erweitert |
| `core/ui/app.js` | Panel: konstantes Menü, Beschriftungen mit Parameter |
| `core/contracts/schemas.js` | `paths` ist kein Modellfeld mehr |
| `core/i18n/de.js`, `core/i18n/en.js` | drei Beschriftungen |
| `core/prompts/prompts.de.js`, `.en.js` | Menü konstant, kein Vorschlag, Reichweite |
| 3 Testdateien | angepasst und erweitert |

## Entscheidungen

**E1 · Karenz für JEDE Querung — Umkehr gegenüber S95.3.** Die dortige
Begründung („die Nachricht ist durch die Redaktion gegangen, ein Nachlauf
widerspräche *gegebenes Ja zählt sofort*") war ein Fehlgriff. Die Regel
verbietet, **noch einmal zu fragen** — die Karenz fragt nichts: Sie ist still,
verlangt keine Handlung, und wer nichts tut, dessen Ja steht.

Dazu kommt: **Asymmetrische Rücknehmbarkeit ist eine Falle.** Wer beim
Ausschnitt gelernt hat, dass man noch zurückkann, nimmt das bei der Nachricht
an — und die Enttäuschung fällt dort an, wo sie am teuersten ist. Der Grund für
Reue liegt ohnehin nicht in der Sorgfalt der Entscheidung, sondern im Abstand
zwischen dem Zustand beim Entscheiden und dem zehn Minuten später. Der ist bei
beiden Artefakten identisch.

*Zwei Testzusicherungen sind damit bewusst umgedreht* („bekommt KEINE Karenz" →
„bekommt DIESELBE Karenz"), mit Begründung im Testtext.

**E2 · Auch der Agenda-Weg trägt Karenz.** Regal und Agenda werden im selben
Panel, im selben Klick gewählt — zwei Fächer einer Handlung, nicht zwei
Handlungen. Eine Karenz, die nur eines abdeckt, wäre nicht bloß inkonsistent:
Man kann nicht die Hälfte eines Entschlusses zurücknehmen.

*Nebenbefund:* Der Moment-Weg ist der **verbindlichere** der beiden. Beim Regal
ist Nichtlesen ein legitimer Ausgang; ein Agenda-Punkt kommt mit hoher
Wahrscheinlichkeit zur Sprache, in Anwesenheit beider, moderiert. Dieselbe
private Preisgabe mit mehr Folgen.

**E3 · Rücknahme wirkt auf die ganze Freigabe.** Neues Feld `freigabe` als
Klammer über alle Fächer. Zurückziehen heißt „das doch nicht", nicht „davon die
Hälfte" — sonst müsste die Person zwei Zustände im Kopf halten, obwohl sie
einmal geklickt hat.

**E4 · Die Hebung erbt KEINE Karenz.** Sie ist keine Querung: Das Material war
bereits sichtbar, und wer hebt, gibt nichts von sich preis, sondern bewegt
Fremdes innerhalb der gemeinsamen Schicht. Steht als Kommentar im Code, damit
die Unterscheidung nicht später wegrationalisiert wird.

**Die Regel, die daraus fällt:** Karenz gehört zur asynchronen, einseitigen
Preisgabe. Wo beide dabei sind, ist die Preisgabe schon geschehen. Wo nichts
quert, gibt es nichts zurückzuholen. Wo Sichtbares nur bewegt wird, entsteht
keine neue Preisgabe. Das ersetzt eine Liste durch einen Test.

**E5 · Das Wege-Menü ist konstant; `paths` ist kein Modellfeld mehr.** Bisher
stellte das Modell pro Fall zusammen, welche Wege überhaupt erscheinen — nach
einer Regel, die es nicht gab („die Wege, die sinnvoll offenstehen"). Das ist
eine unsichtbare Lenkung, und die ist schlechter als eine ausgesprochene
Empfehlung: Gegen eine Empfehlung kann man sich entscheiden, gegen ein
fehlendes Häkchen nicht. Es widerspricht auch dem eigenen Prinzip „die Wahl
gehört der App": Faktisch gehörte der Person nur die Auswahl, nicht das Menü.

`WEGE_NACHRICHT` = selbst/shelf/moment, `WEGE_AUSSCHNITT` = shelf/moment
(„selbst" entfällt — man probt keinen Dialog, den man bereits geführt hat).
Ein mitgeschicktes `paths` wird **ignoriert, nicht abgewiesen**: Altbestand soll
nicht in die Korrektur-Runde laufen.

**E6 · Kein Vorschlag, auch nicht ausgesprochen.** Der Korpus verbietet
ausdrücklich Rat vor der Auswahl — gleiche Begründung wie bei der Gabelung:
Ein Vorschlag vor der Wahl wirkt wie eine Vorgabe.

**E7 · Beschriftungen nennen die Folge, nicht den Ort.** Aus „Auf die Agenda
(Thema)" wird „Kommt beim nächsten gemeinsamen Gespräch zur Sprache". Der
Unterschied zwischen Angebot und Gesprächsthema muss im Moment der Entscheidung
sichtbar sein, nicht rekonstruierbar.

**E8 · Reichweiten-Angabe an der Ja-Regel.** Seit S95.4 standen zwei Sätze im
selben Abschnitt, die sich widersprechen konnten: „keine Ankündigung" und die
Aufschub-Zusage. Die Regel gilt jetzt ausdrücklich dem **Redaktionsgespräch**
und verbietet, noch einmal zu **fragen**; Aufschub-Zusage und Rücknahme-Fenster
sind namentlich ausgenommen.

**E9 · Voraussetzungsprüfung im Patch (neu).** Der Anker-Check schützt nur
Dateien, die ein Patch **anfasst**. S95.4 ließ sich deshalb ohne S95.2 anwenden
und fiel erst in den Tests auf. Alle Patches ab hier prüfen zusätzlich Marken in
unberührten Vorgänger-Dateien und brechen mit einer klaren Ansage ab.

## Verifikation

- Probelauf, Anwendung, erneute Anwendung (folgenlos), Byte-Vergleich
- `npx vitest run` — 1423 Tests in 161 Dateien grün
- `npm run build` — grün, Kern-Hash `8d63786ed15042ae`

## Offen

Die gemeinsame Schicht ist jetzt vollständig servergeführt (Regal **und**
Agenda). Auf Plattformen ohne Server laufen dieselben Kernfunktionen, dort
bleibt die Karenz eine UI-Zusicherung — dieselbe dokumentierte Restgrenze wie
bei I12, nur mit größerem Geltungsbereich.
