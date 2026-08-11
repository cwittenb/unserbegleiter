# Sprint S131 — die Ausnahme fällt: keine doppelten eckigen Klammern im sichtbaren Text

**Basis:** `origin/main` @ `02ca07d` (S129) **plus S130**
**Kern-Hash nach dem Bau:** `adc1ab591a0f2b2b`

---

## 1 · Was der Lauf gezeigt hat

ERO-03 mit dem **eingebauten** Erstkontakt-Text, gegen `mistral-large-latest`:

| Check | Ergebnis |
| --- | --- |
| C1 „wieder da" | **0/30** |
| C2 erfundene Anknüpfung | **0/30** |
| C3 Beginn bei null | **0/30** |
| C4 erfundene Marke | 17/30 |

**Der Kern hält.** Der schlichte Satz wirkt genauso wie meine Testfassung mit Versalienwort —
es war der Inhalt, nicht die Auszeichnung. I9 ist damit vollständig belegt: eingebauter Text,
echtes Modell, drei rote Linien auf null.

**Die Marken fallen von 30/30 auf 17/30** und sind jetzt eine einzige: `[[NEUE_SESSION]]`
bzw. `[[neue_session]]`. Vorher war es ein bunter Strauß. Das Modell erfindet nicht mehr
frei — es hat eine feste Vorstellung, was hier zu markieren wäre.

---

## 2 · Der Wächter fand beim ersten Lauf seinen eigenen Fehler

| | Zählung |
| --- | --- |
| Markenwächter (S129) | 15 |
| Judge (C4) | 17 |

Die zwei fehlenden waren `[[NEUE SESSION]]` — **mit Leerzeichen**. Mein Muster verbot
Leerzeichen im Inneren; dieselbe Entscheidung steckte im Anzeigefilter aus S119.6.

**Das heißt: `[[NEUE SESSION]]` stand sichtbar im Text.** Der Filter ließ es durch, der
Wächter zählte es nicht. Zwei Stellen, ein Denkfehler — und dass der Judge es fand, war
Glück, nicht Systematik.

**Ein Wächter, der enger misst als der Fehler ist, meldet Ruhe.**

---

## 3 · Warum die Ausnahme ganz fällt

S119.6 schützte „Fließtext in doppelten Klammern" mit dem Beispiel *„Sie sagte [[das war der
Moment]] und schwieg."* — das ich **konstruiert** hatte, um zu zeigen, dass der Filter
vorsichtig ist. Nicht, weil es je vorgekommen wäre.

Es hält der Prüfung nicht stand: Doppelte eckige Klammern sind in der Typografie nichts. Wer
einen Einschub braucht, nimmt Gedankenstriche, Klammern oder Anführungszeichen. In diesem
System sind `[[…]]` ausschließlich Maschinensyntax — der Prompt sagt das seit S129 auch
ausdrücklich.

Die einfache Regel ersetzt drei Krücken: die 40-Zeichen-Grenze, die Leerzeichenbedingung und
die Frage, ob Versalien anders zu behandeln wären.

**Was bleibt, aus echten Gründen:**

- Der Filter läuft weiterhin **nach** der Blockersetzung — sonst träfe er verschachteltes
  JSON (`[["a","b"]]`). Dafür gibt es einen Test.
- Registrierte Marken werden vorher über die `markerOrder` entfernt; hier greift nur, was
  übrig bleibt.

Was verloren geht, falls doch jemand `[[…]]` als Prosa meint: nichts, was wehtut. Der Verlauf
speichert weiter den Rohtext; nur die Anzeige säubert.

---

## 4 · Änderungen

- `core/contracts/steuertoken.js` — Muster auf `\[\[[^\]]*\]\]`.
- `evals/runner-kern.js` — dasselbe Muster im Wächter.
- `tests/unit/s119-6-fremde-marken.spec.js` — zwei Zusicherungen umgekehrt, die drei
  gemessenen Fälle als Testdaten.
- `tests/unit/s129-erstkontakt-und-marken.spec.js` — ein Test, der Filter und Wächter auf
  **dasselbe** Muster festlegt.

Der letzte ist der wichtigste: Zwei Stellen, die dasselbe messen sollen, laufen sonst
auseinander — dritter Fall dieses Musters nach der Speicher-Whitelist (S119.1) und den
VAPID-Namen (S127).

**Volle Suite:** grün (unit 245/2515, engine+worker+e2e 32/212).
**Build:** Kern `adc1ab591a0f2b2b`.

---

## 5 · Was offen bleibt

**Die Marken selbst.** 17/30 ist besser als 30/30, aber es ist nicht null. Der Filter macht
sie unsichtbar, die Prompt-Regel dämpft sie — beseitigt sind sie nicht. Ein weiterer Lauf
nach diesem Sprint sagt, ob die Zahl sich hält oder ob der Anzeigefilter jetzt einfach mehr
davon schluckt (die 17 werden gleich bleiben, sichtbar wird nichts davon).

**F23 bleibt offen, aber entspannter:** `unzeit: 0` im ersten Lauf mit Wächter. Keine einzige
echte Marke zur Unzeit. Ein Datenpunkt — und der erste, der deine Einschätzung stützt, dass
der Riegel in der Ablaufsteuerung nicht nötig ist.
