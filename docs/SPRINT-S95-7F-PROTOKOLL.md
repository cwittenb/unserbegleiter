# Sprintprotokoll · S95.7f — Mockdaten mit aufbewahrtem Verlauf

**Basis:** `origin/main` @ `7d57d55` + T-E2E
**Endstand:** **1552 / 155 / 25 / 4 grün**, `npm run build` grün
**Kern-Hash unverändert** `03cf4d4bfd7d6dd6` — Dev-Panel-Fixture, kein Produktionscode.

---

## Anlass

Auf die Frage, ob es Mockdaten mit Session und Transkript gibt: **nein**. Die
Mockdaten hatten einen Solo-Chat und Zeitleisten-Einträge, aber kein `vid` und
keinen einzigen `verlauf:`-Schlüssel.

Praktisch war damit alles unsichtbar, was seit S95.7 gebaut wurde:

- Der **Lese-Eingang** erscheint nie — er hängt an `e2.vid`.
- Der **Löschweg** ebenso wenig.
- Der **Wortlaut-Abruf** findet nichts: Der Begleiter sieht keine
  `{vid:…}`-Markierung und muss korrekt sagen, dass dort nichts zu holen ist.

Man konnte die Funktionen nur erleben, indem man eine echte Solo-Session
komplett durchspielt und abschließt — also genau die Sorte Feature, die
ausgeliefert wird, ohne dass sie je jemand von Hand gesehen hat.

## Änderung

`baueAufbewahrtenVerlauf(meta)` legt für **A** einen Verlauf unter
`verlauf:<MOCK_VID>` ab; der Zeitleisten-Eintrag trägt das `vid`.

**Material ist dasselbe wie im laufenden Solo-Chat** — so lässt sich Gelesenes
mit Erlebtem vergleichen.

**Die Eignung liegt bei**, damit auch die *Auswahl* aus dem Replay heraus
prüfbar ist und nicht nur das Lesen. Ein Paar fällt bewusst durch, mit
Begründung — sonst zeigt die Auswahl nie, wie eine begründete Nicht-Eignung
aussieht. Die bestandenen tragen `reason: null`: Schweigen bei Bestehen gilt
auch in der Fixture.

**B bleibt bewusst ohne Verlauf.** Damit stehen beide Fälle im selben Datensatz
nebeneinander — und der zweite ist der wichtigere: Er zeigt, dass dort *keine*
ausgegraute Tür steht und der Begleiter ehrlich sagen muss, dass nichts da ist.

## Tests

`tests/unit/s95-7f-mockdaten-verlauf.spec.js`, 8 Fälle. **Kein Bestandstest
wurde angepasst.**

---

## Befund zur gemeinsamen Session

Ein aufbewahrtes Transkript gibt es dort nicht — der Verlauf liegt in
`chat("shared", …)`, demselben Ein-Slot-Muster, das die nächste Sitzung
überschreibt. Was überlebt, ist `momentLog` in `bstate` und die Agenda.

**Und es sollte auch keins geben.** Nicht „noch nicht" — hier ist die
Asymmetrie richtig:

**Der Zweck fehlt.** Die Ausschnitt-Maschinerie existiert, um etwas aus dem
privaten Raum zum Partner zu bringen. Im gemeinsamen Raum waren beide dabei —
es gibt nichts zu queren. Was bliebe, ist Erinnern, und dafür sind
Zusammenfassung und Agenda da.

**Die Eigentumsfrage hat keine gute Antwort.** Beim Solo-Transkript war F1
sauber, weil es einen Eigentümer gibt. Bei einem gemeinsamen gäbe es zwei: Will
A löschen und B nicht, kann entweder einer etwas entfernen, worauf der andere
sich verlässt, oder keiner kann es. Beides schlechter als der Solo-Fall.

**Und der Ausschlag:** Im Einzelraum ist das Transkript eigenes Material. Im
gemeinsamen Raum würde daraus ein *Protokoll der Beziehung*, das keiner allein
beenden kann. Im Streit ist „du hast am Zwölften gesagt…" mit wörtlichem Beleg
kein Erinnerungshilfsmittel, sondern eine Waffe, die die App gereicht hätte —
das Gegenteil dessen, wofür der gemeinsame Raum gebaut ist.

Als Entscheidung festgehalten, nicht als offener Punkt.

---

## Merkposten

Während dieses Sprints war ein voller Lauf rot, der Folgelauf grün — vermutlich
erneut das e2e-Flattern. Die Ausgabe wurde beim Abrufen abgeschnitten, der neue
Befund ging dabei verloren. **Beim nächsten roten Lauf: vollständige Ausgabe
sichern, bevor irgendetwas anderes geschieht.** Die Diagnosehilfe aus T-E2E
nützt nur, wenn man sie auch liest.
