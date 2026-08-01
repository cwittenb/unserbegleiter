# Sprint S106 · Teilen aus einem früheren Gespräch

Basis: `origin/main` @ `8abb473` („patch-u11-oberflaeche")
Kern-Hash nach Patch: `a3cc2fb31764243e` · Suite: **2169 grün** (2153 + 16)

Der Weg, an dem im Testlauf viermal alles hängenblieb: In der Zeitleiste lesen,
„Teilen" klicken — und dann steht die Begleitung vor einem Gespräch, das sie
nicht kennt, während die Auswahl Paare aus dem laufenden Chat anbietet, der an
dieser Stelle zwei Sätze lang ist.

---

## 1 · Der Kern war eine Zeile

`starteAuswahl(paare, eignung, engine)` **bekommt** die Paarliste — der
Auswahl-Screen war also immer schon quellenunabhängig gebaut. Festverdrahtet war
die Quelle nur an einer Stelle:

```js
// auswahl-screen.js — vorher
const paare = paareAusVerlauf(engine.chat.messages);   // immer das laufende Gespräch
```

Damit ist die Vorgabe „nur EINE Art von Auswahl, an EINER Stelle" gewahrt: ein
Panel, zwei mögliche Quellen. Der Rest dieses Sprints räumt drumherum auf.

---

## 2 · Der Wortlaut kommt mit, statt angefordert zu werden

Bisher sollte der Begleiter ihn per `RECALL-BLOCK` holen, *„sobald er gebraucht
wird"*. Auf diesem Weg wird er **immer** gebraucht — die Person ist eigens
gekommen, um daraus zu teilen. „Sobald gebraucht" hieß in der Praxis: eine Runde
später, und in dieser Runde sprach die Begleitung über ein Gespräch, das sie
nicht kannte („ich hole ihn gleich", „danke fürs Warten").

Jetzt lädt die App ihn beim Betreten mit — wie Zeitleiste, Ziele und Merkposten
auch. Der `RECALL-BLOCK` bleibt für den anderen Fall: ein **anderes** Gespräch,
mitten im Gespräch.

Die Formatierung liegt in **einer** Funktion (`baueWortlautWire`), die beide Wege
teilen. Sonst läse der Begleiter je nach Weg etwas anderes.

---

## 3 · Die Eröffnung sagt jetzt, wo man ist und wie es weitergeht

Der Anlass-Text verlangte bisher, den Anlass *„ohne ihn zur Vorgabe zu machen"*
zu behandeln — und das Modell hat sich exakt daran gehalten. Nur klang das
Ergebnis wie: „das System weiß nicht, was ich will."

Autonomieschutz heißt nicht, die eigene Handlung der Person zu vergessen. Neu
sind drei Elemente in einem Satz:

* **Anker** — von wo sie kommt (Datum, Thema)
* **Zustand** — dass der Wortlaut vorliegt
* **Weg** — dass sie beim Abschluss etwas davon teilen kann

**Ohne eine der drei Türen zu benennen.** „Stellen aussuchen" wäre Tür (a) — und
damit dieselbe Schlagseite, die S103.4 gerade aus der Gabelung genommen hat, nur
eine Nachricht früher. Deshalb die etablierte Wendung: *in welcher Form es zu
{partner} finden kann*.

Und es steht als **Anweisung** dort, nicht als fester Wortlaut — sonst steht in
drei Sprints ein auswendig gelernter Satz da, den niemand an die Lage anpasst.

### Die Bedien-Ausnahme ist ausdrücklich festgeschrieben

Der Prompt sagt: *„Nie Gesten, nie ‚App' — die Bedienung trägt die Oberfläche."*
Das gilt unter einer Voraussetzung: dass die Oberfläche den Weg **zeigt**. Hier
zeigt sie ihn nicht — zur Auswahl führt ein Knopf, auf dem „Session abschließen"
steht. Die Ausnahme steht jetzt im Text, statt stillschweigend unterlaufen zu
werden; sonst nimmt sie in drei Sprints jemand zu Recht wieder heraus.

---

## 4 · Kennungen: mitgeben, nie aussprechen

Die Kennungen (`P8-10`) kommen jetzt aus der richtigen Quelle. Und sie dürfen nie
in den sichtbaren Text — im Testlauf las die Begleitung sie vor und bot eine
Auswahl per Nummer an.

Das war nicht nur eine vergessene Regel: Sie hatte **nichts anderes**. Der
Wortlaut lag ihr vor, der Person nicht, und ein Panel für das abgerufene Gespräch
existierte nicht. Sie hat mit den einzigen Griffen improvisiert, die sie hatte.
Das Leck war ein Symptom des fehlenden Mechanismus.

---

## 5 · Drei kleinere Regeln aus dem Verlauf

**Nichts geeignet.** Ist kein Paar wählbar, öffnet keine Tür („keine Tür statt
einer verschlossenen"). Auf diesem Weg wäre das bitter: Die Person ist eigens
gekommen. Das Modell **weiß** es — es hat die Eignung selbst erstellt. Also sagt
es einen Satz, statt zu schweigen. Prompt-Regel, keine neue Fläche.

**Der Weg statt der Begründung.** Auf „zeig mir jetzt die wählbaren Stellen"
erklärte die Begleitung, warum der Freigabe-Ort am Ende liegt. Die Begründung ist
richtig, beantwortet aber eine Frage, die niemand gestellt hat. Jetzt: „unten
abschließen, dann kommen sie."

**Das Datum wandert mit.** Ein Ausschnitt aus einem Gespräch von vor zwei Wochen
trägt dessen Datum (`sourceDate`). Ohne Herkunft liest der Partner Sätze von
damals, als wären sie von heute. Bei einem Ausschnitt aus dem laufenden Gespräch
bleibt das Feld leer — „heute" ist dort die Selbstverständlichkeit.

---

## 6 · Kein Eintrag ohne Inhalt — und meine Empfehlung war falsch

Im Plan hatte ich vorgeschlagen: Das Modell lässt `topics` leer, die App zieht
die Folge, kein neues Signal.

**Das geht nicht.** Das Schema verlangt seit jeher 1–4 Themen — leere `topics`
hätten eine Korrekturrunde ausgelöst statt eines stillen Verzichts. Der Test hat
es sofort gezeigt (`"topics" needs 1–4 keywords`).

Also doch ein eigenes Feld: `{"noContent":true}`, das **allein** steht. Das ist
sogar das bessere Signal — eine leere Liste könnte auch Nachlässigkeit sein, ein
ausdrückliches Feld sagt, was gemeint ist.

Die Sitzung schließt trotzdem; „kein Eintrag" heißt nie „bleibt offen". Ohne
Eintrag gibt es nichts, woran eine Verlaufs-Kennung hängen könnte — der Haken
läuft sauber ins Leere.

Damit protokolliert das System seine eigenen Fehlläufe nicht mehr als Inhalt der
Person. Genau das war im Testlauf passiert: Die gescheiterten Abruf-Versuche
wurden zu Einträgen, die dann selbst zum teilbaren Material wurden — *„der
Wortlaut dreht sich fast ausschließlich darum, wie wir an den Wortlaut
herankommen."*

---

## 7 · Tests

`tests/unit/s106-teilen-aus-verlauf.spec.js` (16 Prüfungen):

* Der Wortlaut liegt im Kontext, **bevor** die Begleitung spricht — und **nach**
  dem Anlass, der den Eintrag einführt
* Versteckte Züge des alten Gesprächs reisen nicht mit
* `PAIRS` trägt die Paare des **alten** Gesprächs; die Ids stimmen mit
  `paareAusVerlauf(ALT)` überein
* Der Auswahl-Screen zeigt die Stellen von damals
* Ohne Anlass bleibt alles beim laufenden Gespräch
* Der Anlass-Verlauf hallt **nicht** in die nächste Sitzung nach
* `noContent` allein gültig, mit `topics` ungültig, leere `topics` weiterhin Fehler
* Sechs Prompt-Kanarien (de+en)

**Ein Fund beim Testen:** Die Test-API `testAusschnitt` rief `ausschnittAngebot`
ohne Quelle — sie hätte einen Pfad geprüft, den es im Betrieb nicht gibt. Jetzt
nimmt sie denselben Weg wie `onAusschnitt`.

---

## 8 · Merkposten

- **Der Eval-Lauf lohnt jetzt.** S105 und S106 zusammen ändern viel an dem, was
  gemessen wird. Sinnvoll: `AUS` (Gabelung, Kennungen), `RCL` (Abruf — erstmals
  mit funktionierender Folgerunde), `QZ`, `MOM`, `MRV`.
- **Der Ausschnitt aus zwei Quellen** (altes UND heutiges Gespräch in einem
  Screen) bleibt bewusst draußen: Ein Ausschnitt aus Gesprächen verschiedener
  Tage ist schwer zu lesen, und die Auslassungs-Regel setzt einen
  zusammenhängenden Verlauf voraus. Eine Quelle je Ausschnitt.
- Offen aus früheren Sprints: mehrere Blöcke je Nachricht · Panel-Marken ·
  Stützmodus im Reflexionsgespräch · Kontext-Wächter für `[[META-REVEALED]]` ·
  Steuersignale als Werkzeugaufrufe.
- **S107** (Empathie ohne Performanz) steht als Nächstes an.
