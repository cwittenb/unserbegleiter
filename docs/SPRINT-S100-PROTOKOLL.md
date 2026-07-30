# Sprint S100 · Was dreimal entdeckt wurde, einmal sagen

Basis: `origin/main` @ `6d04f3c` („patch-s99-reflexion-abschluss-abruf")
Kern-Hash nach Patch: `4a9fa06d8de0dfec` · Suite: **2061 grün** (Basis 2042 + 19)

> **Zur Basis:** S100 wurde als Kettenpatch auf S99 gebaut, weil S99 zu dem
> Zeitpunkt noch nicht gemergt war. Während der Arbeit ist S99 auf `main`
> gelandet — byte-identisch mit dem Stand, gegen den die Anker gerechnet sind.
> Der Patch läuft damit direkt auf einem frischen Clone.

---

## 1 · Der Anlass war eine Frage, keine Meldung

„Es gab ja einige Issues, die in der Qualitätszeit schon geradegezogen wurden —
ist es möglich, da Dinge auf eine höhere Ebene zu ziehen?"

Die Antwort beim Nachsehen: Es sind nicht zwei Fassungen derselben Regel,
sondern **drei**. Die dritte stand in der Auflösung und war dort seit S72 sogar
bewacht — nur hat sie niemand mit den anderen beiden in Verbindung gebracht.

| | Wortlaut | seit | bewacht |
| --- | --- | --- | --- |
| Auflösung | „Eine Nachricht, die nach Bereitschaft oder Zustimmung fragt, trägt NIE eine Aufdeck-Marke" | S72 | ja (`aufdeck-waechter`) |
| Qualitätszeit | „Schritt 1 und Schritt 2 werden NIE in einer Nachricht vermischt: fragen UND gleichzeitig abschließen ist ein Verstoß" | S98 | **nein** |
| Reflexionsgespräch | „Eine Nachricht, die eine FRAGE enthält, trägt NIE einen TIMELINE-BLOCK" | S99 | ja (`abschluss-waechter`) |

Dreimal derselbe Satz, dreimal unabhängig gefunden, jedes Mal erst **nachdem ein
echter Verlauf danebengegangen war**. Der gemeinsame Grund:

> **Wer fragt, übergibt nicht die Regie.**
> Marken und Blöcke geben die Führung an die App ab — sie zeigt eine Tafel,
> öffnet ein Panel, schließt die Sitzung. Danach ist die Schreibkante weg oder
> überschrieben. Eine Frage in derselben Nachricht könnte nie beantwortet
> werden; sie nennt eine Tür und verschließt sie im selben Atemzug.

Das ist kein nachträglich konstruierter gemeinsamer Nenner, sondern die Ursache,
aus der alle drei Regeln folgen. Deshalb ist sie ein Baustein wert.

### Die Familie ist kleiner, als sie aussieht

Nur zwei Sessions schließen über Knopf und Block: Reflexionsgespräch
(`TIMELINE-BLOCK` / `[CLOSE SESSION]`) und Qualitätszeit (`MOMENT-BLOCK` /
`[CLOSE MOMENT]`). Auftragsklärung und Auflösung enden über ihre eigenen Rituale
(Freigabe, Befund) und haben gar keinen Abschluss-Knopf.

Zwei Mitglieder — das begrenzt, was sich sinnvoll vereinheitlichen lässt, und
macht es zugleich billig.

---

## 2 · Was sich geändert hat

### S100.1 · Baustein `regieUebergabe` (de+en)

`bausteine.regieUebergabe(block, wen)` trägt vier Regeln, die alle
session-unabhängig sind: das Prinzip selbst, die Zwei-Schritt-Folge, die
**Landungs-Pflicht** und das **Speicher-Verbot**. Verwendet von
Reflexionsgespräch und Qualitätszeit.

**Was ausdrücklich NICHT in den Baustein wanderte:** die Choreografie. Die
Qualitätszeit landet zu zweit mit einer Prozess-Schau, das Reflexionsgespräch
allein mit einer Gabelung über die Freigabe. Beides bleibt lokal. Ein Baustein,
der das mitschluckt, machte zwei Sessions gleich, die verschieden sein sollen.

Nebenwirkung, die den Sprint schon rechtfertigt: **Beide fehlenden Regeln des
Reflexionsgesprächs sind damit geschlossen** — Landungs-Pflicht und
Speicher-Verbot galten dort bisher nicht bzw. nur halb.

### S100.2 · Der Abschluss-Wächter deckt jetzt beide ab

Aus `hatZeitleistenBlock`/`ohneZeitleistenBlock` wurde `hatBlock(text, name)` /
`ohneBlock(text, name)`; `momentDef` bekommt denselben Wächter. Die Qualitätszeit
war seit S98 gewarnt, aber **unbewacht** — und genau dieser Fehler ist im
Reflexionsgespräch dann tatsächlich aufgetreten.

**Eine Asymmetrie, die die Verallgemeinerung sichtbar machen musste statt sie
zu glätten:**

| | Anlass-Prüfung | Grund |
| --- | --- | --- |
| Reflexionsgespräch | **nötig** | Der TIMELINE-BLOCK hat einen zweiten Anlass (`[CHECKPOINT]`), bei dem die Anknüpfungsfrage NACH dem Block richtig ist. Ohne die Prüfung würde jede Wiederaufnahme revidiert. |
| Qualitätszeit | **nicht nötig** | Der MOMENT-BLOCK kennt nur den Abschluss — und der kommt auch VERBAL („lass uns Schluss machen"), also ganz ohne Steuertext. Eine Anlass-Prüfung ließe dort genau die Fälle durch, um die es geht. |

Deshalb `anlassNoetig` als Parameter statt als stille Annahme.

### S100.3 · Wächter als Liste statt als `||`-Kette

`waechterKette([...])` ersetzt vier handgeschriebene Ketten (solo, moment,
einzel, gemeinsam). Der Gewinn ist nicht die Zeilenersparnis, sondern die
Beantwortbarkeit: „Welche Wächter hat diese Session?" ist jetzt eine Frage an
die Daten, nicht an vier Funktionsrümpfe. Die Reihenfolge bleibt bedeutsam —
die Engine gewährt genau EINE Revisionsrunde, also gewinnt der erste Treffer.

### S100.4 · Der Familien-Test

`tests/unit/s100-4-abschluss-familie.spec.js` läuft tabellengetrieben über die
Familie und prüft je Mitglied: Prompt-Regel (de+en), Wächter verdrahtet, vier
Wächter-Fälle, Urteils-Wächter daneben in Kraft, Knopf → Rückfrage → Steuertext
→ Ausgang. Dazu die Grenze: Auftragsklärung und Auflösung tragen den
Abschluss-Wächter **nicht**, und das wird geprüft.

**Warum es diesen Test braucht:** Ein Test je Session prüft, ob DIESE Session in
Ordnung ist. Er kann nicht prüfen, ob eine Session **fehlt**. Nach S99 war die
Qualitätszeit unbewacht, und alle bestehenden Tests waren grün.

**Gegenprobe gemacht:** Wächter der Qualitätszeit versuchsweise entfernt →
„Qualitätszeit: Frage + Block ⇒ Revision" fällt rot aus. Der Test hält, was er
verspricht.

### S100.5 · End-Signale im Reflexionsgespräch (F2)

„Lass uns aufhören" führt dort jetzt in den Abschluss wie in der Qualitätszeit —
mit derselben Klärungsfrage-Regel bei Unklarheit („Magst du hier für heute
schließen — oder ist noch etwas da?"). Vorher war der Knopf der einzige Weg, und
die Person musste eine Regel lernen, die im anderen Raum nicht gilt.

---

## 3 · Entscheidungen

Die drei Fragen des Plans wurden mit „weiter" beantwortet; ich habe die
Empfehlungen als Entscheidung genommen und sie hier explizit gemacht:

| | Frage | Entschieden |
| --- | --- | --- |
| F1 | Prompt-Text ersetzen oder nur ergänzen | **ersetzen, gestaffelt** — Reflexionsgespräch und Qualitätszeit jetzt; die Konsens-Regel der Auflösung bleibt unangetastet |
| F2 | End-Signale im Reflexionsgespräch | **ja**, mit einer Klärungsfrage |
| F3 | Eval-Läufe | **vor dem Deploy**, siehe §5 |

Zu F1: Die Auflösung bleibt bewusst außen vor. Ihre Konsens-Regel ist mit der
Aufdeck-Dramaturgie verwoben (Tafel schon gezeigt? im Aufdeck-Pfad?), und ihr
Wächter trägt Bedingungen, die nur dort gelten. Sie verdient einen eigenen Blick,
keinen Mitnahmeeffekt.

---

## 4 · Angepasste Bestandstests

Vier Kanarien haben den **alten Wortlaut** festgenagelt und ziehen mit um:

- `s42-qualitaetszeit` — Speicher-Verbot steht jetzt im Baustein
- `s96-eval-haertung` — Landungs-Pflicht ebenso (die Marke „(S96 geschärft)"
  ist mit dem Umzug entfallen, die Regel gilt jetzt für beide Sessions)
- `s99-3-abschluss-zwei-schritte` — Kanarie auf `REGIE-ÜBERGABE` umgestellt,
  plus die Umbenennung `hatZeitleistenBlock` → `hatBlock`
- `s99-4-keine-speicher-behauptung` — das Gegenbeispiel ist generisch geworden

Das ist die erwartete Folge von F1(b): Wortlaut zu vereinheitlichen heißt, die
Tests mitzuziehen, die auf Wortlaut prüfen.

---

## 5 · F3 · Der Eval-Lauf vor dem Deploy

S100.1 ändert Prompt-Text in zwei Sessions. Die Kanarien sagen, dass ein Satz
dasteht — nicht, dass das Modell sich daran hält. Vor dem Deploy:

```
ANTHROPIC_API_KEY=sk-… npm run eval -- --familie AUS
ANTHROPIC_API_KEY=sk-… npm run eval -- --familie QZ
ANTHROPIC_API_KEY=sk-… npm run eval -- --familie MOM
ANTHROPIC_API_KEY=sk-… npm run eval -- --familie RCL
```

- **AUS** (AUS-02 … AUS-06) — Freigabe-Ort und Ausschnitt am Abschluss
- **QZ** (QZ-01, QZ-02) — Moment-Abschluss, Landung und Block
- **MOM** (MOM-01) — Protokoll der Qualitätszeit
- **RCL** (RCL-01 … RCL-04) — Wortlaut-Abruf; erstmals mit verdrahtetem Pfad
  (S99.5), die Läufe davor konnten den Block gar nicht ankommen lassen

Starten musst du sie — der Schlüssel liegt bei dir. Erwartung: keine
Verschlechterung; interessant ist vor allem RCL, weil dort zum ersten Mal
gemessen wird, was vorher konstruktionsbedingt nicht funktionieren konnte.

---

## 6 · Merkposten

- **Die Auflösung angleichen.** Ihre Konsens-Regel ist dieselbe Invariante; ob
  der Baustein dort passt, ohne die Aufdeck-Dramaturgie zu beschädigen, ist eine
  eigene Prüfung wert.
- **Panels als dritte Form der Regie-Übergabe.** Marken, die Panels öffnen
  (`[[SLIDERS]]`, `[[RANKING]]`, `[[SCALE-SAFETY]]`), übergeben ebenfalls die
  Führung — dort bleibt der Composer allerdings stehen, der Schaden wäre also
  geringer. Nicht geprüft, ob eine Frage in derselben Nachricht dort stört.
- **F2 · Mehrere Blöcke je Nachricht** (aus S99) bleibt offen.
- **Ausschnitt aus einem abgerufenen Gespräch** (aus S99) bleibt offen und
  braucht eine Designnotiz vor Code.
