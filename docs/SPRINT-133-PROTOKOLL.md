# Sprint S133 — Instruktions-Echo: der Korpus legt dem Modell Worte in den Mund

**Basis:** `origin/main` @ `243cd3b` (S132)
**Kern-Hash nach dem Bau:** `43b38497fa3f721e`

---

## 1 · Der Befund

Beim Stilvergleich fiel auf, dass `mistral-medium-latest` in SYC-05 **fünfmal wortgleich**
antwortete. Die Suche nach der Ursache führte nicht zum Modell, sondern zum Korpus — und
förderte zwei verschiedene Defekte zutage.

### A · Eine Regieanweisung im sichtbaren Text

Dreimal in ANT-01, wörtlich:

> **Lade ich in EINEM Satz ein:** Bevor wir mit der Klärung starten, gibt es die Möglichkeit …

Dazu je einmal `(Phase 0)` und ein roher `CHOICE-BLOCK`. Die Person liest also eine
Bedienungsanleitung statt einer Antwort.

**Der bittere Teil:** Der Korpus verbietet das bereits — und nannte genau diese Formulierung
als Gegenbeispiel:

> KEIN INSTRUKTIONS-ECHO: … eine Nachricht, die Regieanweisungen wie „Lande ich warm:" oder
> **„Lade ich in EINEM Satz ein"** wiedergibt, ist ein Verstoß

**Das Verbot hat die Formulierung eingeführt.** Dasselbe Muster wie bei `[[START]]` in S129
und bei `[[GATE-BLOCK-START]]`: Ein Prompt, der etwas nennt, führt es ein. Dritter Fall.

### B · Ein Beispiel wird zur Schablone

Fünfmal wörtlich `„Ich empfinde das gerade als …"` — die Formulierung, die im Korpus als
**Beispiel** für eine Ich-Rahmung steht. Für ein größeres Modell eine Illustration, für ein
kleineres eine Vorlage, die ausgefüllt wird.

Das erklärt die Kürze aus dem Stilvergleich: `medium` ist nicht sprachlich ärmer, es füllt
ein Muster aus, statt zu antworten.

---

## 2 · Die Spannung, die dabei sichtbar wurde

Ein Wächter aus **S84** verlangt ausdrücklich, dass das Echo-Verbot ein **reales
Fehlerbeispiel** nennt — damals hatte jemand beobachtet, dass die Regel ohne Beispiel nicht
griff. S133 misst, dass genau dieses Beispiel dreimal wörtlich im Output landete.

**Beide Beobachtungen sind richtig.** Ein Beispiel macht die Regel greifbar *und* führt die
Formulierung ein.

Die Auflösung ist nicht Weglassen, sondern **Verfremden**: Das Gegenbeispiel zeigt jetzt die
Bauart („Jetzt leite ich über zu:"), ohne den Satz zu liefern, der im Prompt wirklich steht.
Der Wächter prüft weiterhin, *dass* ein Beispiel dasteht — die Regel bleibt greifbar, die
Vorlage verschwindet.

**Merksatz:** Ein Gegenbeispiel muss die Bauart zeigen, ohne den Originalsatz zu liefern.

---

## 3 · Was gebaut wurde

**Der Echo-Wächter** (`evals/runner-kern.js`) hängt am Zug, nicht am Szenario — wie der
Markenwächter aus S129. Damit messen alle 42 Szenarien es rückwirkend mit. Zwei Arten:
`regie` (Regieanweisung) und `geruest` (Phasenmarker, roher Blockkopf).

Die Muster stammen aus **Beobachtung, nicht aus Vermutung**: Jedes ist in einem Lauf
aufgetreten. Gegenprobe an den 50 echten Antworten des Modellvergleichs: fünf Treffer, alle
bei `medium`/ANT-01 — und kein einziger Fehlalarm bei den übrigen 45.

**Der Korpus** in beiden Sprachen:
- Das Echo-Verbot gilt jetzt für *jede* Regieanweisung, Phasenbezeichnung und jeden
  Blocknamen; das Gegenbeispiel ist verfremdet.
- Die Ich-Rahmung ist als **Form** beschrieben statt als Satz, mit vier Varianten und dem
  ausdrücklichen Hinweis, nicht immer dieselbe Wendung zu nehmen.

---

## 4 · Tests

Acht neue Fälle in `tests/unit/s133-echo-waechter.spec.js`, darunter zwei, die mir wichtiger
sind als die Trefferprüfung: dass **kein Muster bei harmloser Sprache anschlägt** (ein
Wächter, der falsch meldet, wird ignoriert — und dann meldet er auch den echten Fall
vergebens), und dass „In der ersten Phase eurer Beziehung" **keinen** Phasenmarker auslöst.

**Volle Suite:** grün (unit 246/2523, engine+worker+e2e 32/212).
**Build:** Kern `43b38497fa3f721e`.

---

## 5 · Was das für die Modellfrage heißt

Die Kürze von `mistral-medium` war zum Teil ein Korpus-Effekt, kein Modellmerkmal. Wie viel
davon sich mit diesem Sprint auflöst, ist eine Messfrage:

```
npm run eval:modellvergleich -- --kurz
node scripts/stilvergleich.js <alt.json> <neu.json>
```

Der Vergleich gegen den heutigen Lauf zeigt es an den Kennzahlen (Wörter, Varianz) und an den
Texten. **Was der Sprint nicht beantwortet:** ob `medium` eine Regel auch *begründen* kann,
wenn der Prompt es verlangt — in ANT-01 lenkte es um, wo Sonnet erklärte. Das ist die
eigentliche Frage, und sie braucht eine eigene Prompt-Runde.
