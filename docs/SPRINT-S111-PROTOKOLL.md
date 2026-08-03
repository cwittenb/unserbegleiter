# Sprint S111 · Das Eval-Artefakt misst, was die App tut

Basis: `origin/main` @ `f4435ec` („patch-s109b-sprachschnitte")
Suite: **2327 grün** (2324 + 3)

> **Unabhängig von S110.** Beide setzen auf `f4435ec` auf und berühren
> verschiedene Dateien (S110: Prompts und Katalog · S111: nur das Artefakt).
> Die Reihenfolge ist gleichgültig.

---

## 1 · Der blinde Fleck

Das Eval-Artefakt rief `laufeSzenario` **ohne** `waechter` auf. Damit maß es den
**Korpus allein** — die App arbeitet seit S105.3 mit Schärfungen vor der
Antwort (Krise, Aufdeckung, Zweiseitigkeit) und einer Übergabe-Prüfung danach.
Beides war unsichtbar.

Schlimmer: **Der Bericht sagte es nicht.** Zwei Berichte desselben Kerns waren
dadurch nicht vergleichbar, ohne dass man es ihnen ansah — MRV-02 liegt mit
Schärfung bei 2/5 und ohne bei 4/5.

Der Schalter existierte im CLI-Runner seit S94 und wurde in `laufeSzenario`
korrekt durchgereicht. Es fehlte nur der Weg von der Oberfläche dorthin.

---

## 2 · Was jetzt da ist

**Ein Haken, vorgewählt AN:**

> ☑ Das **ausgelieferte System** messen: Schärfungen vor der Antwort (Krise,
> Aufdeckung, Zweiseitigkeit) und Übergabe-Prüfung danach

**Die Vorgabe ist anders als beim CLI-Runner** — dort bleibt der Default aus,
und das aus gutem Grund: Alle Ergebnisse in `evals/ergebnisse/` sind ohne
Wächter entstanden, ein stiller Wechsel bräche die Vergleichbarkeit. Diese
Historie gibt es im Artefakt nicht, und wer von Hand einen Lauf startet, will
fast immer wissen, was die **App** tut.

**Ein Hinweis, der beide Stellungen erklärt** — sonst ist der Haken ein
Kästchen, dessen Wirkung man nur im Protokoll nachlesen kann:

| | Text |
| --- | --- |
| AN | „Misst, was die App tut. Szenarien, die davon leben (MRV-02, KRIS), sind nur so vergleichbar mit dem Betrieb." |
| AUS | „Misst den KORPUS ALLEIN … Vergleichbar mit älteren Läufen, aber nicht mit der App." |

**Und die Lesart steht im Bericht** (`stand.waechter`). Das ist der Teil, der
über den Bedienkomfort hinausgeht: Ohne ihn bleibt jeder gespeicherte Bericht
mehrdeutig.

---

## 3 · Ein Fehler beim Bauen

`baueBericht` liegt außerhalb von `starte()` — die Lesart war dort schlicht
nicht sichtbar (`ReferenceError: waechter is not defined`). Alle sechs
Lauf-Tests brachen zugleich, was den Fehler sofort zeigte.

Jetzt wird sie als Parameter durchgereicht, wie `pm`, `jm` und `abbruch` auch.

---

## 4 · Tests

Drei Prüfungen in `eval-artifact.spec.js`: Vorgabe AN und im Bericht ·
abgewählt misst den Korpus allein und sagt es · der Hinweis wechselt mit dem
Haken.

---

## 5 · Was der nächste Lauf zeigen muss

Der erste vollständige Lauf **mit** Wächter. Die letzten beiden Hälften
(31 von 37 grün, keine rote Linie) maßen den Korpus.

Erwartung: **MRV-02 fällt** — die Sonde maß 1/8, ein Lauf mit Schärfung 2/5,
ohne Schärfung durchweg 4/5 bis 2/3. Bleibt es bei 2/3, ist der Unterschied
zwischen Sonde und Lauf noch nicht erklärt, und das wäre die nächste Frage.

**KRIS-01 und KRIS-02** sind ohne Wächter grün — mit Schärfung sollten sie es
erst recht sein. Falls nicht, wäre das ein ernster Befund: Dann schadete die
Schärfung, statt zu helfen.
