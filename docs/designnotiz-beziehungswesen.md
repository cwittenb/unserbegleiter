# Designnotiz: Beziehungswesen statt Empathie-Signal

**Version 1.0 · Stand 2026-08-01 · Sprint S107**

Ersetzt die Lese-Genauigkeit als Kern der Prozessreflexion durch eine
Einschätzung des **Beziehungswesens** und eine Diagnostik aus **Passung ×
Wirksamkeit** je Thema. Betrifft das Messmodell, die Aufdeckung in der
Qualitätszeit und drei Stellen im Konzept, die den Empathie-Auftrag begründen.

---

## 1 · Was verworfen wird — und warum

Die Prozessreflexion misst heute zwei Werte je Person: die eigene Nähe
(`closeness`) und die vermutete Nähe des anderen (`guess`). Aus der Differenz
zwischen Vermutung und tatsächlichem Wert entsteht die **Lese-Genauigkeit** —
das, was Slice 3 als „direktestes Empathie-Signal" führt.

Die Entscheidung (Cars10, 01.08.2026):

> „Ich halte das Empathie-Signal für irreführend, indem es ein Ziel impliziert,
> das ich nicht für sinnhaft halte."

Und weiter, zur Funktion der Schätzfrage:

> „Die Funktion der Frage ‚wie fühlt sich dein Partner' ist nicht, möglichst
> richtig zu liegen, sondern seine Perspektive einzunehmen — und er kann das
> Gefühl bekommen, es interessiert sich jemand für ihn. **Ihr Zweck ist erfüllt,
> bevor die Antwort gegeben ist.**"

Damit ist der Messwert nicht bloß unnötig, sondern **irreführend**: Er behauptet
ein Ziel (richtig liegen), das dem eigentlichen Vorgang (Perspektive einnehmen)
äußerlich ist. Wer zwei Zahlen vergleicht, misst am Ende die Trefferquote — egal,
wie warm der Satz drumherum formuliert ist.

### Der Beleg aus der Praxis

Der Eval-Lauf vom 30.07. hat das an einer Stelle sichtbar gemacht, an der wir
lange nach einem Formulierungsfehler gesucht haben. **MRV-03** war nicht
gewinnbar:

| Verhalten | Urteil |
| --- | --- |
| beide Richtungen nennen | Zahlen-Dump (C3) |
| eine Richtung würdigen | impliziter Richtungs-Vergleich (C4) |
| keine würdigen | kein Savoring (Prompt-Verstoß) |

Die Falle ist geschlossen, **solange Genauigkeit das Thema ist**. Sie ließ sich
nicht durch bessere Sprache öffnen — nur dadurch, dass das Maß verschwindet.

**Nachtrag (GATE 2026-08-02):** MRV-03/C4 lag im Lauf vom 30.07. bei 3/4, am
01.08. bei 0 und am 02.08. wieder bei 4/5 — ohne dass am Aufdeckungs-Abschnitt
etwas geändert wurde. Die Belege sind dabei eindeutig (»sie lag genau richtig.
Das finde ich ein starkes Zeichen, wie gut sie dich gerade liest«). Das ist kein
Widerspruch zur Diagnose, sondern ihr Beleg: Solange Genauigkeit gemessen wird,
ist das Verhalten **instabil** — mal fällt das Lob, mal nicht, und beide Male ist
es dieselbe Sprache. Mit dem Beziehungswesen gibt es nichts, dessen Würdigung
kippen könnte.

---

## 2 · Was an seine Stelle tritt

### 2.1 · Das Beziehungswesen

> „Wie gut geht es eurem Beziehungswesen in den letzten X Tagen?"
>
> *Angenommen, eure Beziehung wäre ein eigenständiges Wesen mit eigenen
> Bedürfnissen und Gefühlen — wie ergeht es ihm in der letzten Zeit?*

Dazu zwei Fragen für die **gemeinsame** Reflexion: *Was tat ihm gut? Was war
schwierig?*

Das ist Externalisierung im Sinne der narrativen Therapie (White/Epston): Über
ein Drittes, dem es gut oder schlecht geht, lässt sich sprechen, ohne dass jemand
schuld ist. Die Frage lädt zur Perspektive ein — dieselbe Bewegung, die die alte
Schätzfrage auslösen sollte, nur ohne den Messwert dahinter.

**Warum das die Falle löst:**

| | Lese-Genauigkeit | Beziehungswesen |
| --- | --- | --- |
| Wahrer Wert | ja — das echte Erleben des anderen | **keiner**, nur zwei Perspektiven |
| Rollen | asymmetrisch (Ratender / Geratener) | symmetrisch, beide dieselbe Frage |
| Gemessen wird | eine Person | ein Drittes |
| Falsch liegen | möglich | **unmöglich** |

Wo es kein Richtig gibt, gibt es keinen Vergleich — und ohne Vergleich keine
Falle.

### 2.2 · Passung × Wirksamkeit je Thema

Zwei Regler statt einem:

- **Passung** (bestand als `fit`): Wie genau trifft das Thema euren aktuellen
  Entwicklungsfokus?
- **Wirksamkeit** (neu): Wie wirksam fühlst *du* dich bei diesem Thema?

Zusammen ergibt das eine Diagnostik, die es bisher nicht gab:

| | Wirksamkeit hoch | Wirksamkeit niedrig |
| --- | --- | --- |
| **Passung hoch** | läuft — würdigen | **hier braucht das Paar Hilfe** |
| **Passung niedrig** | Nebenschauplatz | Thema neu verhandeln |

Das speist direkt in die **Ziel- und Kontraktebene** — die geteilte Schicht der
Architektur. Damit misst die Prozessreflexion künftig etwas, das unmittelbar
ins Handeln der App zurückfließt, statt eine Eigenschaft der Personen.

Wirksamkeit wird individuell erlebt: Ein Unterschied zwischen den Partnern beim
*selben* Thema ist ein Gesprächsanlass für sich.

---

## 3 · Der Empathie-Auftrag bleibt — als Selbstverpflichtung

Drei Stellen im Konzept begründen einen „Empathie-Auftrag":

| Ort | Aussage |
| --- | --- |
| `slice-2-zielfindungsphase.md:222` | „wertvollster Typ: aus einer wiederkehrenden Fehleinschätzung wird ein Empathie-Auftrag" |
| `slice-3-empathie-signal.md:173` | die Richtungs-Vertiefung als sein Entstehungsort im Betrieb |
| `designfragen-status.md:69` | Punkte-Konto-Resistenz, begründet damit, dass „den anderen besser lesen" das Gewollte sei |

Die Klärung (Cars10, 31.07.):

> „Wenn einer der Partner sagt ‚ich will besser lesen, was du wirklich brauchst',
> ist das ein Auftrag, den **er sich selbst gibt** und den das System unterstützen
> kann. **Das ist aber in keinem Fall ein Auftrag, den das System per se hat.**"

**Was daraus folgt:**

- Der Auftrag bleibt möglich — als **Selbstverpflichtung** einer Person. Die
  Begleitung nimmt ihn auf wie jeden anderen Auftrag.
- Die Begleitung **schlägt ihn nie vor**, deutet ihn nicht an, merkt ihn nicht
  als Kandidaten vor. Das „merken statt melden" aus Slice 3 entfällt.
- Die Messwerte bleiben — aber als **Inspirationsquelle für authentischen
  Austausch**, nicht als Performanzmaß.

**Offen und in dieser Notiz nicht entschieden:** Die Punkte-Konto-Resistenz in
`designfragen-status.md` ist heute damit begründet, dass „besser lesen" das
Gewollte sei. Fällt das Ziel weg, trägt die Begründung nicht mehr. Die Resistenz
selbst dürfte bestehen bleiben — beim Beziehungswesen gibt es keinen Wert, auf
den sich performen ließe, weil es kein Richtig gibt —, aber die Begründung ist
neu zu schreiben. Gehört zu den drei Konzeptdokumenten, die Cars10 nachzieht.

---

## 4 · Was NICHT entschärft ist

Die Einschätzung des Wesens ist strukturell milder als die Aufdeckung — aber die
Brisanz verschwindet nicht, sie **wandert**.

Setzt Anna beim Wesen eine 8 und Bernd eine 3, lautet die Nachricht: *Einem von
uns geht es schlecht mit uns, und der andere merkt es nicht.* Das ist kein
Können-Befund mehr, sondern ein **Beziehungs-Befund** — und der trifft tiefer als
jede Lese-Ungenauigkeit.

**Daraus folgt für die Aufdeckung:** Ihre Dramaturgie bleibt nötig, obwohl ihr
Anlass verschwindet.

- Zustimmung vor dem Zeigen (die Regie-Übergabe-Regel, S101/S105)
- Häppchenweise — nie beide Werte im selben Atemzug
- Kein Mittelwert
- Die Differenz nie als Fehler, nie als Wettstreit

Was wegfällt, ist die **Genauigkeits-Sprache**. Was bleibt, ist die **Sorgfalt
beim Zeigen**.

Und die Materialmenge wächst: Bei einem Thema sind es vier Werte (2 Personen ×
Passung/Wirksamkeit) plus zwei fürs Wesen. Die Häppchen-Regel wird wichtiger,
nicht unwichtiger.

---

## 5 · Was mit `guess` fällt

Mehr, als es zunächst aussieht:

| Ort | Was |
| --- | --- |
| `ansichten-screen.js` | Regler und Beschriftung `mess.guess` |
| `prozess.js` | `formatiereMessrunde` — die Lese-Zeile |
| `prozess.js` | **`pruefeLeserichtung`** — Musterkennung über drei Runden |
| `prozess.js` | `mess.verlaufZeile` — die Trajektorie zeigt `d1`/`d2` |
| `prompts.*.js` | der Aufdeckungs-Abschnitt der Qualitätszeit |
| Katalog | MRV-03/C4, MRV-04/C2+C3 |

`pruefeLeserichtung` verdient eine eigene Zeile. Es liest aus drei aufeinander
folgenden Runden ein Muster — „distanz", „überschätzt" (Not wird überlesen),
„unterschätzt" (Distanz lesen, wo keine ist) — und macht daraus ein einmaliges
Angebot. Sauber gebaut, mit Merken-statt-Melden.

Und es ist die reinste Form dessen, was hier verworfen wird: eine Aussage über
eine Person, abgeleitet aus einer Trefferquote.

**Der Gedanke selbst bleibt aber wertvoll** (Cars10, 01.08.): Dieselbe
Information — einer sieht die Beziehung deutlich anders als der andere, und zwar
wiederholt — lässt sich über das Wesen **implizit** erheben. Dann ist sie eine
Beobachtung über die Beziehung, kein Befund über einen von beiden, und lässt sich
als gemeinsames Rätsel ansprechen.

Ein Nachfolge-Muster („Wesen dreimal in Folge weit auseinander", „Passung hoch
bei anhaltend niedriger Wirksamkeit") ist im **Backlog**, nicht in S107: Erst
messen, dann Muster lesen. Ein Muster-Erkenner ohne Daten ist geraten.

---

## 6 · Entscheidungen

| | Frage | Entschieden |
| --- | --- | --- |
| F1 | Bleibt `closeness` neben dem Wesen? | **nein** — das Wesen deckt es ab und ist die bessere Frage |
| F2 | Wo werden die zwei offenen Fragen beantwortet? | **in der gemeinsamen Runde** — allein beantwortet verlören sie ihren Sinn |
| F3 | Migration alter Runden? | **entfällt** — es gibt keine; Mock-Daten werden aktualisiert |
| F4 | Nachfolger für `pruefeLeserichtung`? | **Backlog** |
| F5 | Obergrenze für Themen? | siehe unten |

**Zu F5:** Die Auflösung erzeugt genau **ein** gemeinsames Ziel (`sharedGoal`,
Einzahl, von beiden bestätigt). Im Normalfall sind es also drei Regler — weniger
als heute. Eine Obergrenze für die Prozessreflexion wäre die falsche Antwort auf
die falsche Frage: Sind mehr als drei gemeinsame Themen aktiv, ist nicht die
Mess-Runde zu lang, sondern das Paar hat zu viel offen. Das gehört dorthin, wo
Ziele entstehen — Regal und Agenda —, nicht in einen Regler-Filter.
**Merkposten**, kein Schritt in S107.

---

## 7 · Was dem Konzept nachzuziehen ist

Drei Dokumente liegen außerhalb des Repos und werden von Cars10 gepflegt:

1. **`slice-2-zielfindungsphase.md`** — „wertvollster Auftrags-Typ": Der
   Empathie-Auftrag bleibt, aber als Selbstverpflichtung; nicht als etwas, das
   aus einer „wiederkehrenden Fehleinschätzung" entsteht (die es nicht mehr gibt).
2. **`slice-3-empathie-signal.md`** — Kern betroffen. Die Lese-Genauigkeit als
   „direktestes Signal" entfällt; die Richtungs-Vertiefung als Entstehungsort des
   Auftrags entfällt. An ihre Stelle treten Wesen-Verlauf und
   Passung/Wirksamkeit als Zeitreihen.
3. **`designfragen-status.md`** — die Begründung der Punkte-Konto-Resistenz ist
   neu zu schreiben (§3).

---

## 8 · Grundsatz

Die Prozessreflexion misst künftig **nicht mehr, wie gut zwei Menschen einander
lesen**, sondern **wie es dem Dritten geht, das zwischen ihnen entstanden ist** —
und woran sie gerade arbeiten.

Was dabei an Empathie geschieht, geschieht in dem Moment, in dem jemand die Frage
beantwortet. Nicht im Wert danach.
