# Sprint U3b · Das Verhalten der Freigabe-Auswahl (Turn 41 §4.4, §4.5, §4.7)

Basis: `origin/main` @ `e9ed89e` **+ U2 + U3a** · Kern-Hash nach Patch: `90c0880f82b2f12c`
Suite: 1884 grün (U3a-Stand 1877 + 7)

> **Kette:** `U2 → U3a → U3b`. Die Nutzlast ist auf `main + U2 + U3a` gebaut, nicht nur dagegen
> geankert.

Drei Findings, die nichts mit dem Aussehen zu tun haben. §1.1 (die Zweiteilung) folgt als **U3c**.

---

## 1 · §4.4 · Die Anleitung scrollte weg

`.rz-ausw-kopf` stand über der Liste: „Tippen wählt aus, Gedrückthalten nimmt alles bis dorthin
mit." Bei fünfzehn Paaren ist die einzige Erklärung der Interaktion nach dem ersten Wisch
verschwunden — und mit ihr der Hinweis auf die Geste, die man ohne Erklärung nicht findet.

Sie lebt jetzt im Wegweiser, der nicht mitscrollt. Neuer Schlüssel `weg.auswahlHalten`, und er
nennt **beide** Wege:

> Tippen wählt eine Stelle aus. Gedrückthalten nimmt alles bis dorthin mit — mit Tastatur:
> Umschalt und Eingabe.

Der Tastaturweg war korrekt gelöst, aber nirgends erklärt. Jetzt hat er einen Ort.

**Über der Liste bleibt nur, was über DIESE Auswahl etwas sagt:** der Lücken-Hinweis („Manches aus
diesem Gespräch bleibt hier"). Gibt es keine Lücken, steht dort gar nichts mehr.

### Wie der Wegweiser davon erfährt

R4b hält die Phasen der Auswahl im Modul; `app.js` fragt über `zeichneAuswahl(box)` nur, ob
gezeichnet wurde. Für §4.4 braucht der Wegweiser genau **eine** Auskunft mehr — nicht die Phase,
nur das Ob:

```js
const auswahlOffen = () => !!ausw && ausw.phase !== "vorschau";
```

Während die Fläche offen ist, trägt der Wegweiser drei Zeilen: Vertraulichkeit (Stufe 1),
Bedienung (Stufe 2), Freigabe-Zusage (Stufe 3). Die Bedienung steht auf **Stabilität** — sie sagt,
wie man die Fläche beherrscht: nach der Vertraulichkeit, vor allem anderen. Das ist dieselbe
Charta-Kette wie bei den übrigen Chat-Zeilen (T2-5 §2).

**Nachziehen:** der Wegweiser hängt an `renderMsgs` — dem einen Punkt, den jede Zustandsänderung
der Auswahl ohnehin passiert. Damit stimmt er beim Öffnen und beim Verlassen der Fläche, ohne dass
irgendwo ein zweiter Auslöser gepflegt werden muss.

---

## 2 · §4.5 · Gedrückthalten war unsichtbar

500 ms Timer ohne jede Rückmeldung. Wer zu kurz hält, schaltet stattdessen um — und hält das für
einen Fehler des Programms, nicht der eigenen Hand.

Ab **150 ms** wird die Oberkante kräftiger und nimmt den Akzent an:

```css
.rz-paar.rz-halten{border-top-width:2px;border-top-color:var(--rz-akzent-ink)}
```

**Auf der Linie, die ohnehin da ist** — kein Wachsen, kein Schatten, keine Verschiebung. Die
Fläche darf sich nicht bewegen, solange der Finger noch nicht entschieden hat; sonst rutscht das
Ziel unter der Berührung weg. Ein Test hält fest, dass weder `transform` noch `box-shadow` dazukommen.

Die Rückmeldung wird in **allen** Fällen zurückgenommen — beim Loslassen, beim Verlassen, beim
Abbrechen des Zeigers, und wenn die Spanne zuschlägt.

---

## 3 · §4.7 · Das Paar hatte keinen Namen

`role="button"` auf einem `<div>` mit zwei bis drei Zeilen Fließtext: ein Screenreader liest den
**ganzen Inhalt** als Namen des Knopfes vor. Und `aria-pressed` sagt dabei nicht, *was* gewählt ist.

```
aria-label        „Antwort auf: {frage}"
aria-describedby  → der Antworttext
```

Erst wozu, dann was. Der Name bleibt kurz genug, um in einer Liste von fünfzehn Paaren tragfähig zu
sein; der Antworttext folgt als Beschreibung, wenn man ihn hören will.

Die Frage geht dabei **ungekürzt** in den Namen — die 220-Zeichen-Kürzung ist eine Sache der
sichtbaren Fläche, nicht der Vorlesestimme.

---

## 4 · Die Wächter

**`tests/unit/u3b-auswahl-verhalten.spec.js`** (5 Tests) — die Bausteine:
Schlüssel in beiden Sprachen; der Anleitungstext nennt Gedrückthalten *und* Umschalt; die
Halte-Rückmeldung sitzt auf der Linie und bewegt nichts; grüne Zone trägt den grünen Akzent.

**`tests/unit/s96-ausschnitt-auswahl-ui.spec.js`** (2 neue Tests) — die Verdrahtung, dort wo die
Auswahl schon läuft:

- Der Wegweiser trägt die Anleitung **nur**, solange ausgewählt wird — vorher nicht, nach dem
  Verlassen nicht mehr. Das ist der eigentliche Test von §4.4: nicht, dass der Text existiert,
  sondern dass er zur richtigen Zeit da ist.
- Jedes Paar trägt `aria-label` und eine `aria-describedby`-Beziehung auf seinen eigenen
  Antworttext.

> **Ein Testansatz, der nicht getragen hat:** ich hatte zuerst versucht, das Modulverhalten über
> den *Quelltext* zu prüfen (`readFileSync` auf `auswahl-screen.js`, Suche nach `auswahlOffen`).
> Das scheitert unter happy-dom an derselben URL-Falle wie in T3-1 §4 — und es hätte ohnehin nur
> geprüft, dass eine Zeile dasteht, nicht dass sie wirkt. Die zwei Verhaltenstests sagen mehr und
> laufen stabil.

---

## 5 · Prüfliste für die Sichtprüfung (Stufe B)

| # | Was | Wo |
| --- | --- | --- |
| 1 | Über der Liste steht nichts mehr — außer bei Lücken | Auswahl ohne / mit stillen Lücken |
| 2 | **Wegweiser während der Auswahl öffnen: die Anleitung steht da** | Auswahl offen, hell + dunkel |
| 3 | Nach „Noch für mich behalten": die Anleitung ist wieder weg | zurück im Verlauf |
| 4 | **Ein Paar gedrückt halten: nach einem Augenblick wird die Oberkante kräftiger** | mit dem Finger, nicht der Maus |
| 5 | Loslassen vor der Spanne: die Kante geht zurück, nichts ist passiert | dasselbe |
| 6 | Die Fläche bewegt sich beim Halten **nicht** | dasselbe |

Punkt 4 ist die Abnahme des Findings: reichen 150 ms, oder kommt die Rückmeldung zu früh und
flackert beim normalen Tippen? Das ist der Wert, den ich am ehesten falsch geraten habe.

---

## 6 · Was in U3c folgt

**§1.1 · Die Zweiteilung.** Auswahlfläche in `.rz-half.rz-papier`, Leiste als
`.rz-half.rz-tiefgruen` statt `position:sticky`. Das ist der strukturelle Schritt: die Auswahl
rendert heute in `#pbMsgs` innerhalb der Papier-Zone des Chats, und die untere Zone ist die
Schreibkante — während der Auswahl müsste dort die Leiste stehen statt des Composers.
Danach ist auch die fehlende Haarlinie der Sticky-Leiste erledigt: die Naht **ist** die Kante.
