# Sprint S105 · Was gesagt wurde, gilt

Basis: `origin/main` @ `3f65cbc` („patch-s103-judge-marken-krise")
Kern-Hash nach Patch: `c6dfd69f7642db65` · Suite: **2148 grün** (Basis 2128 + 20)

Anlass: dein Testlauf vom 30./31.07. und die Exploration danach. Sieben
Meldungen, von denen vier auf meine Sprints zurückgingen.

---

## 1 · Der gemeinsame Nenner

Alle Verhaltensfunde sind Varianten **einer** Sache: Sprache und Mechanik laufen
auseinander — und zwar in beide Richtungen.

**Sprache läuft der Mechanik voraus.** „Ich hole mir das Gespräch dazu" (der
Abruf lieferte nie). „Der Wortlaut ist da – danke fürs Warten" (es gab kein
Warten, das die Begleitung kannte). „Dein Zeitleisten-Eintrag wurde gespeichert"
(behauptet Mechanik, die sie nicht steuert).

**Mechanik läuft über die Sprache hinweg.** Der Wächter nahm weg, was gelesen
war. Umgekehrte Richtung, gleiche Wunde: Was gesagt wurde, gilt nicht.

Beides trifft dieselbe Zusage — dass dieser Raum verlässlich ist. Und beides ist
teurer als der Einzelfehler, den es zu verhindern versucht.

---

## 2 · S105.1 · Die Folgerunde, die nie kam

`holeWortlaut` läuft **im Block-Handler**, und der läuft innerhalb von
`requestAssistant`, wo `busy` gesetzt ist:

```js
async requestAssistant() { if (this.busy) return;   // ← hier stieg die Runde aus
```

Die `RECALL-RESULT`-Nachricht landete im Verlauf, eine Antwort darauf gab es
nie. Sie kam erst, wenn du selbst tipptest — deshalb „okay? so lang war der text
nicht" und danach die korrekte Auskunft. **Die Wartezeit war echt; die
Begleitung hat sie nicht erfunden.** Meine erste Einschätzung war falsch.

Die Engine kennt das Problem an zwei anderen Stellen und löst es dort
ausdrücklich (Revisions- und Korrekturpfad geben die Sperre frei). Neu:
`antworteAufBlock()`. Gegenprobe im Test:

| Weg | Runden | letzte Rolle |
| --- | --- | --- |
| `submitToolResult` (bisher) | 1 | **user** |
| `antworteAufBlock` (neu) | 2 | assistant |

**Warum das durchrutschte:** Mein S99.5-Test prüfte, dass die Wire-Nachricht im
Chat landet — das Artefakt, nicht die Wirkung. Er wäre grün geblieben, egal wie
lange die App hängt. Der neue Test prüft, dass eine Antwort **folgt**.

---

## 3 · S105.2 · Der Ladezustand, der stehen blieb

Zwei Ursachen, beide behoben.

**Der Strom kann still werden.** Eine Anfrage, die weder antwortet noch
fehlschlägt, hält den Zähler laufender Aufrufe für immer oben. Neu: eine Frist
auf die **Stille zwischen zwei Datenstücken** (60 s), nicht auf die Gesamtdauer
— lange Antworten sind legitim, eine stille Verbindung nicht. Jedes Stück setzt
die Uhr zurück; beim Ablauf wird der Leser freigegeben.

**Der Generations-Zaun griff auch beim Aufräumen.** Wechselte die Generation
während eines Wartevorgangs, übersprang das `finally` alles, und `state.warten`
blieb stehen.

Mein erster Fix war falsch, und **der S87-Test hat ihn abgefangen**: Ich hatte
geschrieben, „einen Wartezustand abzuschalten ist in jeder Generation harmlos".
Ist es nicht — wenn der neue Raum bereits wartet, löscht der Nachzügler dessen
Anzeige. Die richtige Frage ist nicht *welche Generation*, sondern **wartet noch
jemand**. Also ein Zähler statt eines Schalters, dieselbe Bauweise wie beim
Zähler der Backend-Aufrufe. Nebeneffekt: Geschachtelte Wartevorgänge (der Abruf
läuft innerhalb des Zuges, der ihn auslöst) zählen jetzt sauber.

---

## 4 · S105.3 · Nichts wird mehr zurückgenommen

Deine Entscheidung, und sie ist die größte Änderung dieses Sprints.

Der Mechanismus (S72/S73) versteckte die beanstandete Antwort und ließ sie neu
schreiben. **Er schützte niemanden:** Was gestreamt wurde, war gelesen. Das
Verstecken räumte das Protokoll auf, nicht die Erinnerung. Sein einziger echter
Effekt war der Vertrauensverlust.

Und ich hatte ihn vervierfacht — vor S99 gab es zwei Wächter, jetzt sechs.

`chat.textFix` kommt im ganzen Code nicht mehr vor. Aus einem Mechanismus wurden
drei:

| Klasse | wer | Verhalten |
| --- | --- | --- |
| **Übergabe verweigern** | Abschluss-Block, Aufdeck-Marke, Meta-Marke | Block/Marke wird nicht ausgeführt, **Text bleibt** |
| **vorwärts schärfen** | Krise, Aufdeckung | Zusatzsatz im Systemtext, **bevor** geantwortet wird |
| **nur Prompt** | Urteil, Speicher-Behauptung | bleibt stehen, wenn es durchrutscht |

Bei „fragen UND abschließen in einer Nachricht" ist das Ergebnis exakt das, was
die Regel wollte: Die Frage steht lesbar da, die Sitzung endet nicht, du kannst
antworten. Ohne dass irgendetwas verschwindet.

**Die Schärfungen sind keine neuen Regeln** — sie stehen längst im Korpus. Ein
Prompt von 30.000 Zeichen macht eine Regel vorhanden, aber nicht *präsent*. Die
Schärfung ist eine Wette auf Aufmerksamkeit im richtigen Moment; sie geht in den
Systemtext und nie in den Verlauf.

Bei der **Aufdeckung** ist die Vorbeugung besonders sauber: Sie fragt den
Zustand („ist die Tafel gezeigt?"), nicht den Text. Das Restrisiko ist
ausdrücklich akzeptiert — es ist die einzige Stelle, an der der Schaden nicht
dich trifft, sondern den Partner.

---

## 5 · S105.4 · Was jetzt allein der Prompt trägt

**Urteils-Grammatik.** Beim Umschreiben der Tests fiel auf: Die Regel lebte im
`haltungsKern`, und **die Qualitätszeit bindet den nicht ein** — dort trug sie
allein der Wächter. Hätte ich ihn nur entfernt, wäre sie in dieser Session
ersatzlos verschwunden, ohne dass ein Test es gemerkt hätte. Jetzt steht sie als
eigene Konstante in allen vier Sessions, DE und EN.

Und sie trägt deine Anmerkung: *Der Fehler ist nicht das Würdigen — der Fehler
ist die Form.* Statt „Was für ein schöner Impuls" heißt es „Das finde ich einen
schönen Impuls". Dazu der Satz, der die neue Lage benennt: „Diese Regel wird
nicht mehr maschinell korrigiert: Was du sagst, bleibt stehen."

**Abruf-Disziplin.** „Der Abruf geschieht, er wird nicht angekündigt" — dieselbe
Regel, die für Marken seit S89 gilt. Plus: nie behaupten, den Wortlaut zu haben,
bevor er vorliegt.

---

## 6 · S105.5 · Der Abschluss-Knopf

Das Label wird **aus dem Verlauf abgeleitet**, nie gemerkt: Hat die App den
Abschluss angefordert und läuft die Sitzung noch, steht die Gabelung offen. Ein
frischer Chat hat einen leeren Verlauf — das Label kann nicht hängenbleiben, ohne
dass jemand aufräumen muss. Genau das war der Fehler hinter „beginnen/fortsetzen"
(S99.1) und der falsch angehefteten Kennung (S99.6). Dein Verdacht war berechtigt.

Steht die Gabelung, heißt der Knopf **„Ohne Teilen abschließen"**, und ein Druck
darauf sendet `[CLOSE SESSION · KEEP]` — die **dritte Tür**, nicht eine zweite
Abschlussbitte. Ohne diese Unterscheidung entstünde eine Schleife: Bitte →
Gabelung → Bitte → Gabelung.

Solange die App am Zug ist, ist der Knopf inaktiv.

---

## 7 · S105.6 · Das Ruckeln beim Sprecher-Label

Die Stream-Blase entstand als nacktes `.pb-msg.ai`; „Begleitung" kam erst beim
Voll-Render **nach** der fertigen Antwort und schob alles darunter nach unten —
im Moment des Zuendelesens. Jetzt trägt sie das Label von Anfang an, mit
derselben Rollenwechsel-Logik wie `renderMsgs` (sonst wandert das Ruckeln nur in
den Fall zweier aufeinanderfolgender Begleitungs-Nachrichten).

---

## 8 · Vier Fehler von mir, die die Tests gefunden haben

Der Vollständigkeit halber, weil sie etwas über die Arbeitsweise sagen:

1. **Ein `sed` löschte eine Zeile zu viel** — den Import von `krisenSchaerfung`.
   In JavaScript fällt das erst beim Aufruf auf: Alle vier Marker der Auflösung
   liefen ins Leere. 16 der 43 gefallenen Tests hingen daran. Ausgerechnet die
   Sprintregel „Ganzdatei-Ersetzung statt Textersetzung" hätte es verhindert.
2. **Ein Kommentar mit deinem Namen** wäre ins ausgelieferte Artefakt gewandert,
   wo ein Test die Antwort auf die Eingangsfrage schützt. Neun weitere Ausfälle.
   Merkposten unten.
3. **`gabelungOffen` suchte nach einem Blocktext** und meldete dann
   „geschlossen". Genau falsch herum: Ein Blocktext, der dasteht und nicht
   ausgeführt wurde, IST die verweigerte Übergabe. Ich hatte den alten Vertrag
   mitgedacht.
4. **Der Knopf wurde gesperrt, aber nie freigegeben.** `setzeWarten` schaltete
   nur die obere Anzeige. Wer nur sperrt, sperrt für immer. Gefunden habe ich es
   erst, als ich eine Wegwerf-Probe schrieb und **maß**, statt weiter an
   Symptomen zu raten (`warten: false`, aber `disabled: true`).

---

## 9 · Angepasste Bestandstests

`s99-2` · `s99-3` · `s100-4` · `s101` · `s103` · `aufdeck-waechter-engine`
(umbenannt zu `aufdeck-vorbeugung-engine`). Alle prüfen jetzt: **Text bleibt,
Handlung fällt aus** statt „Revision".

Neu: `s105-vertrag-und-zustand.spec.js` (18 Prüfungen) für die Stellen, für die
es bisher keinen Test gab — genau der Grund, warum sie durchrutschen konnten.

---

## 10 · Merkposten

- **Zwei Bestandsdateien nennen deinen Namen** (`prompts.en.js:2`,
  `i18n/en.js:1`). Sie fallen nicht auf, weil sie nicht ins Dev-Artefakt gebaut
  werden — der Test ist präziser als die Konvention. In diesem Sprint nicht
  angefasst.
- **Voller Puffer für den Aufdeck-Pfad**, falls die Vorbeugung dort nicht trägt.
  Nur dort, nur vor der Tafel.
- **Steuersignale als Werkzeugaufrufe** statt als Textmarken. Das würde die halbe
  Wächter-Familie gegenstandslos machen (Positionsprobleme gibt es nur, weil das
  Signal eine Textposition hat). Berührt Adapter, Streaming und alle vier
  Sessions.
- Offen aus S99–S103: Ausschnitt aus abgerufenem Gespräch (→ S106) · mehrere
  Blöcke je Nachricht · Panel-Marken · Stützmodus im Reflexionsgespräch ·
  Kontext-Wächter für `[[META-REVEALED]]`.

---

## 11 · Als Nächstes

**U11** (Oberfläche, fünf Funde — die Suite kann keinen davon prüfen) und
**S106** (Ausschnitt aus einem abgerufenen Gespräch, neun Schritte).
Danach **S107** (Empathie ohne Performanz, zurückgestellt).

Ein Eval-Lauf lohnt erst nach S106: S105 verändert, was gemessen wird — ohne
reparierende Wächter zeigt ein Lauf ungeschönt, wie gut die Regeln allein tragen.
