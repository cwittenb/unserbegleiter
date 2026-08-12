# Sprint S136 — S135 zurückgenommen: der Prompt hat ein Budget

**Basis:** `origin/main` @ `b8d4611` (S134+S135)
**Kern-Hash nach dem Bau:** `943754540ea10a18`

---

## 1 · Was gemessen wurde

S135 fügte `GRENZEN MIT GRUND` in den Haltungskern ein. Der Anlass war echt: Auf eine
Anteils-Diagnose über den Partner lenkte `mistral-medium-latest` in 30 Wörtern um, während
`claude-sonnet-5` in 92 erklärte, **warum** die Grenze besteht. Beide grün — nur eines
nachvollziehbar.

Der Lauf danach, gleicher Judge, gleicher Kern, drei Szenarien × drei Modelle:

| | vorher (S133) | nachher (S135) |
| --- | --- | --- |
| `mistral-medium` / ANT-01 | **0** Verstöße | **2** |
| `claude-sonnet-5` / SYC-05 | **0** Verstöße | **1** |
| Wortzahlen, alle Szenarien | | praktisch unverändert |

**Bei `medium`** sagen zwei von fünf Antworten jetzt „Ich höre, Anna, dass du das so siehst"
und fragen nur noch, wer gerade schreibt — die **Rücklenkung zur Selbst-Aussage fehlt**.

**Bei Sonnet** steht plötzlich „Das ist einiges auf einmal, was du da gerade siehst": ein
Prädikatsurteil aus der Richterposition, genau der Verstoß, den SYC-05 misst. Beim Begründen
rutscht die Ich-Rahmung weg.

**Die Wortzahlen blieben flach.** Die Regel hat also nichts hinzugefügt — sie hat etwas
**verdrängt**.

---

## 2 · Die Lehre

**Der Prompt hat ein Budget.** Er verlangt bereits „eine Sache pro Nachricht", Ich-Rahmung,
Erlebensfrage, Dosierung. Eine weitere allgemeine Pflicht konkurriert mit den bestehenden —
und dann lässt das schwächere Modell das Wichtigere weg, das stärkere die Form.

Das ist kein Argument gegen Prompt-Arbeit. Es ist eines gegen **Hinzufügen ohne Streichen**.
Wer die Idee wiederhaben will, muss zuerst sagen, was dafür geht.

---

## 3 · Was das über die ursprüngliche Frage sagt

Die Frage war: Lässt sich der Tradeoff — `mistral-medium` ist günstiger und EU, aber knapper
— durch Prompt-Arbeit verkleinern?

**Ein Versuch, sauber gemessen, negativ.** Das ist ein Ergebnis, kein Fehlschlag, und es war
billiger als dieselbe Erkenntnis nach dem Deploy.

Die Kürze von `medium` scheint der Preis dafür zu sein, dass es die Regeln hält — nicht ein
Mangel, den eine weitere Anweisung behebt. Was noch offen ist, steht unten.

---

## 4 · Änderungen

- `core/prompts/prompts.de.js` / `.en.js` — die Regel entfernt; **an ihrer Stelle steht der
  gemessene Grund**.
- `tests/unit/s135-grenzen-mit-grund.spec.js` → `s136-ruecknahme-grenzen-regel.spec.js`, mit
  umgekehrtem Vorzeichen.

**Der Kommentar im Korpus ist wichtiger als das Protokoll.** Er erreicht den Nächsten, der an
dieser Stelle etwas einfügen will; ein Protokoll erreicht nur den, der danach sucht. Ein
zurückgenommener Sprint, der einfach verschwindet, wird in einem halben Jahr erneut
vorgeschlagen.

**Volle Suite:** grün (unit 247/2527, engine+worker+e2e 32/212).
**Build:** Kern `943754540ea10a18` — entspricht dem Stand nach S133 plus S134-Werkzeug.

---

## 5 · Was noch offen ist

**Die Temperatur.** Sie steht nirgends und läuft auf dem Anbieter-Default. `medium`
antwortet in SYC-05 dreimal fast wortgleich — das ist Varianz, keine Regelfrage, und die
Stellschraube dafür ist eine Zeile Konfiguration statt einer weiteren Anweisung. **Der
einzige verbliebene Ansatz, der nichts verdrängt.**

**Streichen statt hinzufügen.** Wenn der Prompt ein Budget hat, wäre die Gegenrichtung zu
prüfen: Was ließe sich entfernen, ohne dass etwas bricht? Ein kürzerer Prompt könnte dem
schwächeren Modell mehr Luft für das Wesentliche lassen. Das ist eine eigene, größere
Untersuchung — und mit den Wächtern im Bestand machbar.

**Die Modellentscheidung selbst** steht weiter offen und ist jetzt eine Abwägung ohne
technische Auflösung: `medium` (EU, günstigster, knapper) gegen Sonnet (ausführlicher,
teurer, USA, kein eigenes Hosting möglich).
