# Sprint S142 — Zugangszeile: eigener Name, zwei Zustände

**Basis:** `origin/main` @ `f6554d9` (`patch-s141-einstellungen-rueckweg-und-fuss`),
frisch geklont. S141 ist gepusht; dieser Patch setzt direkt darauf auf.
**Auslieferung:** `patch-s142-zugangszeile-nach-zustand.mjs`
**Kern-Hash danach:** `41ea8a6e2b7a8c2c`
**Suite:** 286 Dateien / 2795 Fälle grün

---

## 1 · Die Beschriftung nennt jetzt die Sache

„Zugang wiederfinden" benannte den **Anlass** — den Verlustfall, der
hoffentlich nie eintritt. Dahinter liegt aber genau eine Sache: eine
hinterlegte E-Mail-Adresse. Und im eingerichteten Zustand tut man dort auch
nichts anderes, als sie zu ändern.

| | alt | neu |
|---|---|---|
| DE | Zugang wiederfinden | **E-Mail-Adresse für deine Zugangslinks** |
| EN | Regain Access | **Email address for your access links** |

`rec.titel` hat genau **eine** Verwendungsstelle (die Regal-Zeile
`#btnRecovery` in den Einstellungen) — kein weiterer Ort zieht mit.

**Schreibweise:** Im Deutschen steht „E-Mail-Adresse" mit Bindestrichen, wie
im ganzen Wörterbuch (`rec.neu`, `rec.pflicht.text`, `wieder.email`). Wenn du
die Zeile bewusst anders geschrieben haben willst als den Rest der App, sag
Bescheid — es ist eine Zeile.

---

## 2 · Die Wegweiser-Zeile folgt dem Zustand

**Befund.** Sie stand seit S140 unbedingt da und riet zum Einrichten — auch,
wenn die Adresse längst hinterlegt war. Dann empfahl sie etwas, das erledigt
ist.

**Korrektur zur S140-Notiz.** Ein Umbau von `ladeLage()` ist **nicht** nötig
gewesen. `state.info.recoveryEmail` liegt bereits vor: Der Worker liefert es in
`/api/me` (`hasRecoveryEmail`), und `recovery-screen.js` liest es an derselben
Stelle für seinen „hinterlegt"-Zweig. Der Einstellungs-Zweig des Wegweisers
greift ohnehin schon auf `state.info` zu (Sprachantrag). Es kommt kein
Backend-Weg dazu.

| Zustand | Stufe | Text |
|---|---|---|
| keine Adresse | 3 | Für deine Zugangslinks ist noch keine E-Mail-Adresse hinterlegt — hinterlege sie hier, bevor du sie brauchst: Sie holt dich auf ein neues Gerät zurück. |
| Adresse liegt | 4 | Für deine Zugangslinks ist eine E-Mail-Adresse hinterlegt — du kannst sie hier jederzeit ändern. |

**Zwei Texte statt eines mit Einschub.** Der eingerichtete Zustand sagt etwas
anderes (ändern) als der leere (hinterlegen); ein Satz mit
Und-sonst-anders-Teil wäre in beiden Lagen halb falsch.

**Die Stufe wechselt mit.** Eine fehlende Adresse ist ein offener Punkt
(Stufe 3, „Neues / Offenes" im Inventar), eine vorhandene eine stehende
Auskunft (Stufe 4). Die Reihenfolge zu `weg.einstEndgueltig` bleibt dadurch,
wie sie war.

**Ohne `backend.recovery` entfällt die Zeile ganz.** Dort blendet
`zeigeRecovery()` auch die Regal-Zeile aus (Artefakt-Bau) — ein Wegweiser, der
auf etwas Unsichtbares zeigt, ist schlechter als keiner.

**Praxisnote:** Bei gesetztem `EMAIL_PFLICHT` kommt niemand ohne bestätigte
Adresse in die App; produktiv wird also fast nur die Stufe-4-Zeile zu sehen
sein. Die andere trägt den Bau ohne Pflicht (Dev, Artefakt) — und den Moment
zwischen Notausgang und Nachholen.

---

## 3 · Nach dem Hinterlegen zieht der Wegweiser nach

Der Wegweiser wird nur bei `betrete()` gezeichnet. Wer die Adresse **im
Einstellungs-Regal** hinterlegt, bekäme sonst weiter „noch keine Adresse" zu
lesen, bis er den Screen verlässt und wieder betritt — eine Zeile, die
nachweislich falsch ist, direkt neben der Handlung, die sie falsch gemacht hat.

`macheRecoveryScreen` nimmt deshalb einen optionalen Rückruf `nachZugang`; die
App legt ihn auf `aktualisiereWegweiser(state.screen)`. Beide Wege zur
bestätigten Adresse (Regal-Formular und Pflicht-Screen) laufen jetzt über
`zugangHinterlegt()` — eine Stelle, die den Zustand setzt **und** nachzieht.

Bewusst ein gereichter Rückruf und kein Ereigniskanal: Wer die Datei liest,
sieht, wer mitzieht. Optional geprüft, damit Aufrufer ohne ihn nicht brechen.

---

## 4 · Tests

**Neu** — `tests/unit/s142-zugangszeile-nach-zustand.spec.js` (9):
ohne Adresse die Einrichte-Zeile, mit Adresse die Ändern-Zeile, nie beide;
Stufe 3 steht vor Stufe 4; die vorhandene Adresse verdrängt keinen Sprachantrag;
ohne `backend.recovery` keine von beiden, aber der übrige Wegweiser bleibt
stehen; das Nachziehen nach bestätigtem Code ohne Screenwechsel; Beschriftung
und DE/EN-Parität der neuen Keys.

**Angepasst** — `tests/unit/s140-einstellungen-wegweiser.spec.js`: Die
Test-Fassade trägt jetzt eine `recovery`-Attrappe. Ohne sie prüfte die Datei ab
diesem Sprint stillschweigend den Artefakt-Fall („kein Wiedereinstieg
vorhanden") statt der ruhigen Lage einer vollständigen App — der Wegfall wäre
grün geblieben und hätte die Aussage der Datei halbiert.

---

## 5 · Dokumentation

`docs/wegweiser-inventar.md` — die `scrEinstellungen`-Tabelle trägt beide
Zustände samt Bedingung.

---

## 6 · Offen

- Aus einem laufenden Gespräch heraus in den Chat zurückführen (aus S141) —
  das wäre eine Wiederaufnahme (`resume()`), nicht ein Anzeigen.
