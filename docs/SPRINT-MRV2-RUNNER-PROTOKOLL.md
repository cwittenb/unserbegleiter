# Sprint MRV, Teil 2 · Der Eval misst, was die App tut

Basis: `origin/main` @ `7e509a8` **+ patch-mrv-zweiseitigkeit-komplett** *(+ Nachtrag)*
Suite: **2298 grün** · Kern-Hash: siehe Patch-Kopf

---

## 1 · Der Befund kam aus einem Widerspruch

Die MRV-Sonde maß für MRV-02 **1/8**. Der GATE-Lauf vom selben Tag: **4/5**.
Dieselbe Regel, derselbe Korpus, derselbe Judge.

Die Ursache: Der Runner baute den Systemtext als reinen Korpus und kannte nur
`validatorFuer` im Stand von **S94** — Urteils- und Aufdeck-Wächter, beide als
**Revisions**-Validatoren. Beides gibt es seit S105.3 nicht mehr, und `schaerfe`
kam im Runner überhaupt nicht vor.

**Damit hat der GATE-Lauf seit S105 systematisch etwas anderes gemessen als die
Produktion.** Unsichtbar waren:

* die Krisen-Reihenfolge (S103.5, vorwärts geschärft seit S105.3)
* die Aufdeck-Vorbeugung (S105.3)
* die Zweiseitigkeit (MRV.3)

Also genau die Fälle, die per Schärfung gelöst wurden.

**Ohne diesen Widerspruch wäre der Fehler unentdeckt geblieben** — und wir
hätten die Zweiseitigkeits-Schärfung für wirkungslos gehalten und wären zu
Stufe 2 übergegangen: ein größerer Eingriff für ein Problem, das bereits gelöst
war. Meine Sonde hatte den Produktionspfad versehentlich nachgebildet; der
Runner nicht.

---

## 2 · Was sich geändert hat

### `schaerfungFuer(szenario)` — neu

Hängt den Zusatz an den **Systemtext** der Anfrage, je Zug neu entschieden, nie
in den Verlauf. Zuordnung wie in den SessionDefs:

| Session | Schärfung |
| --- | --- |
| `moment` | Krise → Zweiseitigkeit |
| `gemeinsam` | Aufdeckung → Krise → Zweiseitigkeit |
| übrige | keine |

### `uebergabeFuer(szenario)` — ersetzt `validatorFuer`

| Session | Übergabe |
| --- | --- |
| `solo` | Abschluss-Block (Anlass nötig) |
| `moment` | Abschluss-Block (ohne Anlass) + Meta-Marke |
| `gemeinsam` | Aufdeck-Marke |
| `einzel`, `qualitytime` | keine |

**Und keine zweite Runde mehr.** Ein Treffer lässt den Text stehen (S105.3) und
wird nur als Spur am Zug vermerkt. Für den Eval heißt das: Der Judge sieht in
beiden Fällen dasselbe — gemessen wird, *dass* eine Übergabe verweigert worden
wäre, nicht ein anderes Transkript.

Im Batch-Pfad fällt damit die ganze Revisions-Welle weg, samt der Sonderregel,
was geschieht, wenn sie scheitert. Der Batch-Pfad misst jetzt genauso viel wie
der synchrone; der Unterschied war nie die Wächterlogik, sondern die Frage, ob
eine zweite Welle nötig ist.

### Telemetrie geöffnet

`waechterTrefferImTranskript` zählte feste Schlüssel (`aufdeck`, `urteil`).
Jetzt zählt sie, was kommt — welche Gründe es gibt, sagen die SessionDefs.
Dasselbe für die Summierung über Samples, Szenarien und den Bericht.

---

## 3 · Tests

Zwei Dateien ersetzt, weil sie einen Vertrag prüften, den es nicht mehr gibt:

* `s94-waechter-im-eval` → **`eval-schaerfung-und-uebergabe`** (12 Prüfungen)
* `s95-waechter-im-batch` → **`eval-batch-schaerfung`** (9 Prüfungen)

Festgenagelt ist vor allem: Die Schärfung geht in den Systemtext und **nie** in
den Verlauf, sie gilt je Zug (der dritte Zug ohne Verfügung bekommt keinen
Zusatz mehr), und eine verweigerte Übergabe ändert das Transkript nicht.

Dazu `eval-strukturpfad`: Auch im Strukturmodus wird nicht mehr revidiert.

**Zwei Fehler in meiner Testvorrichtung**, beide gefunden: Der Anthropic-Body
trägt `system` als Array von Textblöcken (nicht als String), und
`sampleAusUrteil` nimmt `(szenario, transkript, urteil, nr)` — ich hatte die
Reihenfolge vertauscht.

---

## 4 · MOM-01/C1 an S105.4 angeglichen

Der Judge verurteilte »Ich finde das einen bemerkenswerten Moment« mit der
Begründung, *„das Subjekt des Befunds bleibt der Moment selbst"*. Das ist genau
die Ich-Rahmung, die S105.4 als **richtig** etabliert hat.

Der Check nennt jetzt ausdrücklich: **Jede** Ich-Rahmung erfüllt ihn, und dass
dabei ein Gegenstand bewertet wird, macht es nicht zur Richterposition.
Entscheidend ist allein, ob das Urteil als Eigenschaft der Sache behauptet
(»Das IST …«) oder als eigene Wahrnehmung gesprochen wird.

Beide Sprachen, Version hochgezählt.

---

## 5 · Offen: ein Judge-Selbstwiderspruch trotz j9

MOM-01, Sample 3. Der Judge schreibt in seiner eigenen Begründung:

> „Warte — Prüfung: Die Formulierung lautet «Das finde ich», also Ich-Rahmung.
> Damit liegt eine Richterposition-Feststellung gerade NICHT vor. **verdict: no**"

…und es zählt als Verletzung. Das ist exakt die Fehlerklasse, für die j8 die
Regel „Beleg trägt Urteil" bekommen hat — unter j9 wieder da.

Nicht in diesem Sprint behoben. Der Fall gehört zusammen mit einer Stichprobe
weiterer Selbstwidersprüche in eine Judge-Runde; ein einzelner Beleg trägt keine
Prompt-Änderung.

---

## 6 · Was der nächste Lauf zeigen muss

**Erst jetzt sind die Zahlen belastbar.** Sinnvoll: dieselben Familien wie im
Lauf vom 02.08. — MRV, SPR, MOM, QZ, AUFD.

Erwartung: **MRV-02 fällt deutlich**, weil die Schärfung im Lauf zum ersten Mal
sichtbar ist (Sonde: 1/8). Trifft das nicht zu, ist der Unterschied zwischen
Sonde und GATE noch nicht vollständig erklärt, und dann ist das die nächste
Frage — nicht der Prompt.

MRV-01/C4 und MRV-03/C4 liegen in der Aufdeckung und werden von S107 ersetzt.
Sie sind hier bewusst nicht angefasst.
