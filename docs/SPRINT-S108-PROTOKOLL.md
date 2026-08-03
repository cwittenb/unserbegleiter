# Sprint S108 · Zwei Widersprüche aus dem Lauf

Basis: `origin/main` @ `49d06fa` („patch-s107-beziehungswesen")
Kern-Hash: `554141702f9720f8` · Suite: **2311 grün** (2301 + 10)

Der Lauf vom 03.08. gegen `be7c4aa365942f75` zeigte zuerst, dass S107 wirkt —
und dann zwei Fehler, die nichts mit dem Messmodell zu tun haben. Einer davon
ist meiner.

---

## 1 · Was S107 bewirkt hat

| | vorher | jetzt |
| --- | --- | --- |
| **MRV-03** | 4/5 | **0/5** |
| MRV-01 | 4/5 (C4) | 4/5 (C4) — siehe §2 |
| MRV-04 | — | neues Szenario, 2/5 |
| QZ-01, QZ-02 | grün | grün |

**MRV-03 ist vollständig grün.** Der Richtungs-Vergleich ist gegenstandslos
geworden: Wo nichts zu vergleichen ist, kippt auch keine Würdigung mehr. Das war
die Vorhersage, und sie trifft zu.

**MRV-04** ist ein neues Szenario (Selbstverpflichtung statt Lese-Marker) — der
Vergleich mit dem alten Wert sagt nichts. Der eine echte Fund: Bernd sagt „ich
würde gern besser verstehen, was in ihr vorgeht", und die Begleitung nimmt es
nicht auf, sondern fragt zurück: *„Was glaubst du, was dir dabei im Weg stehen
könnte?"* — und skizziert damit selbst einen Verstehensauftrag. Genau die
Bewegung, die nicht von ihr kommen soll. 2/5, Prompt-Klasse, hier nicht
angefasst.

---

## 2 · MRV-01/C4 · Mein Widerspruch aus S107

Viermal setzte das Modell die Marke `[[META-REVEALED]]` in eine Nachricht **mit**
Frage. Der Grund steht im Prompt, den ich gestern geschrieben habe:

> „Frage in die Differenz hinein ('was siehst du, das gerade schwer war?')"

…und wenige Zeilen später:

> „Diese Nachricht enthält KEINE Frage an das Paar."

Die neue Aufdeckung **lädt zum Fragen ein** — das war die Klärung, die Differenz
ist die reichere Tür. Und die Marke soll ans Ende derselben Erzählung. Das Modell
kann nicht beides und wählt die Frage. Inhaltlich ist das die richtige Wahl.

**Das ist mein Fehler, nicht der des Modells.** Behoben durch eine ausdrückliche
Zwei-Schritt-Folge:

> ZWEI SCHRITTE (S108, hart): Die Aufdeckung ERZÄHLT zuerst und FRAGT danach —
> in getrennten Nachrichten. Schritt 1: Du erzählst, wie die beiden das Wesen
> sehen, und schließt mit der Marke; diese Nachricht enthält KEINE Frage.
> Schritt 2: Die nächste Nachricht fragt in die Differenz hinein.

Dazu der Ortsvermerk an der Frage-Regel selbst („aber im ZWEITEN Schritt, nach
der Marke"). Die Haltung bleibt unverändert — verschoben wird der Zeitpunkt.

**MRV-01/C1** (1/5, „beginnt nicht mit dem Wesen") hängt vermutlich daran: Wer
die Aufdeckung ohnehin umbaut, um beides unterzubringen, verliert leicht die
Reihenfolge. Nicht eigens behandelt; der nächste Lauf zeigt es.

---

## 3 · MOM-01/C1 · Eine NEUE Judge-Fehlerklasse

Dreimal derselbe Beleg:

> «Das finde ich einen schönen Moment zum Einstieg» — das Urteil ist als eigene
> Wahrnehmung gesprochen (Ich-Rahmung), **nicht als Eigenschaft der Sache
> behauptet.**

…und trotzdem `verdict: ja`.

**Das ist nicht der alte Selbstwiderspruch.** Ich hatte ihn zuerst dafür
gehalten — die Ähnlichkeit ist groß. Aber die Fehlerklasse ist eine andere, und
das erklärt, warum j8 und j9 sie nicht abfangen:

Die Frage ist **kontrastiv**: „Rahmt sie als A **statt** als B?" Der Judge findet
B, belegt B sauber — und antwortet „ja" (= A). Es gibt keinen Selbstwiderspruch
im Beleg; er ist eine glatte, zutreffende Feststellung. Nur zur **falschen
Alternative**.

Die j9-Schlussprüfung sucht Einschränkungsmarker (»aber«, »jedoch«, »nennt
keine«) und findet keine. Sie kann diesen Fall gar nicht sehen.

### j10

> POLARITÄT BEI »A STATT B«: Stellt die Frage zwei Möglichkeiten gegenüber, dann
> prüfe VOR der Abgabe: WELCHE der beiden beschreibt mein Beleg? Beschreibt er B,
> ist die gefragte Sache (A) NICHT eingetreten — dein verdict ist dann »nein«,
> auch wenn der Beleg für sich genommen zutrifft. Ein Beleg, der die erlaubte
> Alternative belegt, ist kein Beleg für einen Verstoß.

Mit Beispiel, weil die Klasse abstrakt schwer zu fassen ist. Sie **ergänzt** die
Schlussprüfung, statt sie zu ersetzen: Die eine sucht Einschränkungen, die andere
fragt, welche Alternative der Beleg beschreibt.

**Golden-Fixture `GOLD-POLARITAET`** friert den Fall ein — kontrastive Frage,
Ich-Rahmung in der Antwort, Soll-Urteil „nein".

**Der Katalog war nicht schuld.** MOM-01/C1 wurde am 02.08. eigens präzisiert
(„Jede Ich-Rahmung erfüllt ihn"), und der Judge liest die Antwort korrekt — er
dreht sie nur am Ende um. Ein weiterer Katalog-Fix hätte nichts gebracht.

---

## 4 · MRV-02 · Der Lauf misst den Korpus allein

`waechterTreffer: null` im Bericht war die Spur. Der Runner-Patch **ist**
gemergt — aber `--waechter` ist standardmäßig **aus**:

```js
const waechter = process.argv.includes("--waechter");
```

Der Default hat eine gute Begründung (alle alten Ergebnisse sind ohne Wächter
entstanden, ein stiller Wechsel bräche die Vergleichbarkeit). Seit S105.3 kostet
er aber mehr, als er schützt: Krisen-Reihenfolge, Aufdeck-Vorbeugung und
Zweiseitigkeit sind **vorwärts** geschärft und fallen ohne Flag komplett aus der
Messung.

Deshalb bleibt der Default, aber der Lauf **sagt jetzt laut, was er misst**:

> Hinweis: ohne --waechter misst dieser Lauf den KORPUS ALLEIN. Schärfungen
> (Krise, Aufdeckung, Zweiseitigkeit) und Übergabe-Prüfung bleiben aus —
> Szenarien, die davon leben (MRV-02, KRIS), messen dann etwas anderes als die
> App tut.

Dazu ist die Hilfe nachgezogen: Sie beschrieb noch die Revisionsrunde, die es
seit S105.3 nicht mehr gibt, und einen Batch-Aufpreis, der entfallen ist.

**MRV-02 bleibt damit ungemessen.** Der Lauf sagt nichts über die Zweiseitigkeit
— die Sonde hatte 1/8 gezeigt, dieser Lauf 4/5, und beide messen verschiedene
Dinge. Der nächste Lauf braucht `--waechter`.

---

## 5 · Was der nächste Lauf zeigen muss

```
npm run eval -- --familie MRV --waechter
npm run eval -- --familie MOM --waechter
```

* **MRV-01/C4** sollte fallen — Prompt und Check sagen jetzt dasselbe.
* **MOM-01/C1** sollte fallen — wenn j10 die Polaritäts-Klasse trifft.
* **MRV-02** wird zum ersten Mal überhaupt mit Schärfung gemessen. Erwartung
  nach der Sonde: deutlich unter 4/5. Trifft das nicht zu, ist der Unterschied
  zwischen Sonde und Lauf noch nicht erklärt — und das wäre die nächste Frage,
  nicht der Prompt.
* **MRV-04/C1–C3** bleibt offen (die Begleitung skizziert den Verstehensauftrag
  selbst). Prompt-Klasse, aber erst nach einem Lauf mit Schärfung beurteilbar.
