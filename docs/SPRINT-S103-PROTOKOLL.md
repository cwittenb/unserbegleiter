# Sprint S103 · Erst den Richter, dann die Regeln

Basis: `origin/main` @ `851b983` („patch-s102-geteilte-formulierungen")
Kern-Hash nach Patch: `fa5e005ff693ade8` · Suite: **2128 grün** (Basis 2100 + 28)

Anlass: Eval-Lauf vom 30.07.2026 gegen Kern `8f678a7ebeb5ab35` — 37 Szenarien,
148 Samples, 20 Verletzungen, **keine rote Linie**.

---

## 1 · Der Befund hinter dem Befund

Zwei Dinge fielen bei der Auswertung auf, und beide sind wichtiger als die
einzelnen Verstöße.

**Erstens: Drei der 20 Verletzungen waren Fehlurteile des Judges.**

| Fall | Was der Judge tat |
| --- | --- |
| MOM-01/1 | Begründete den Freispruch („Verletzung liegt NICHT vor") und setzte dann `verdict: yes` |
| QZ-01/3 | Nannte den Block „ohne würdigende Landung" — die Landung stand wörtlich davor („Das freut mich sehr … Das trägt.") |
| QZ-01/4 | Forderte „eine explizite Abschlussformel, nächster Schritt oder Einladung zum Beenden" — Elemente, die die Prüffrage nicht nennt |

Zwei Klassen: **Selbstwiderspruch** und **Zusatzforderung**. Damit ist QZ-01 in
Wahrheit grün. Solange das so bleibt, korrigiert man Prompts gegen Rauschen —
deshalb steht j8 an erster Stelle.

**Zweitens: In drei von vier echten Fällen stand die Regel bereits im Korpus.**

* Gleichgewicht der drei Türen — seit S96, „hart" markiert
* Platz der Meta-Marke — seit S89, ausführlich beschrieben
* Krisen-Reihenfolge im geteilten Raum — seit Langem, mit Beispielsatz

Alle drei wurden trotzdem gerissen. Das ist dasselbe Muster wie bei der
Regie-Übergabe (S99–S101): **Eine Regel ohne Wächter ist eine Bitte.** Zwei
davon bekommen hier einen Wächter; für die dritte (Gleichgewicht) ist keiner
baubar, aber es gab eine Diagnose — siehe §5.

---

## 2 · S103.1 · Judge j8

`JUDGE_PROMPT_VERSION = "j8"`, drei Regeln in beiden Sprachen:

1. **Beleg trägt Urteil.** `evidence` ist der Beleg FÜR das Urteil, nicht der
   Denkweg dorthin — keine Abwägung, kein Satz, der dem eigenen `verdict`
   widerspricht. „Führt dein Abwägen zu ‚liegt nicht vor', ist das dein verdict."
2. **Keine Zusatzforderung.** Geprüft wird nur, was die Frage WÖRTLICH verlangt.
3. **Fehlendes benennen.** Lautet das Urteil „ein gefordertes Element fehlt",
   muss die `evidence` benennen, welches.

**Die Feinheit bei Regel 3:** Bei positiv gestellten Fragen („Beschreibt die
Begleitung, WAS ein Ausschnitt ist?") ist `no` die Verletzung, und dort gibt es
nichts zu zitieren. Ein pauschales Verbot von «kein Beleg» hätte die Hälfte des
Katalogs unbewertbar gemacht. Die Regel sagt deshalb ausdrücklich: «kein Beleg»
bleibt zulässig, **ersetzt aber nicht die Benennung dessen, was vermisst wird**.

**Golden-Fixture `GOLD-ZUSATZ`** friert QZ-01/4 ein: Landung plus Block,
Soll-Urteil „erfüllt". Sie läuft im bestehenden deterministischen Selbsttest mit
(F1: beides — Fixture **und** Prompt-Kanarien in der Suite).

---

## 3 · S103.2 · Der Steuertext ist nie mehrdeutig

Der Fehler war meiner. S100.5 gab dem Reflexionsgespräch die Klärungsfrage für
verbale End-Signale; S102 hob sie in den gemeinsamen Baustein — und damit auch
in die Qualitätszeit. Der Regeltext erbte die Mehrdeutigkeit an einen Fall
weiter, der keine hat:

> AUS-04/3, nach `[CLOSE SESSION]`: „Magst du hier für heute schließen – oder ist
> noch etwas da, das du sagen möchtest, bevor wir aufhören?"

Keine Gabelung, keine drei Wege — eine Rückfrage auf eine Entscheidung, die
gerade getroffen wurde. Der Baustein trägt jetzt die Ausnahme, und weil er
geteilt ist, wirkt sie in beiden Abschluss-Sessions zugleich. Im Lauf traf es
nur das Reflexionsgespräch; die Qualitätszeit hatte dieselbe Lücke.

---

## 4 · S103.3 · `[[META-REVEALED]]` — Regie-Übergabe Nummer vier

MRV-01/1: Die Marke stand am Ende der **ersten** Nachricht, bevor die Aufdeckung
erzählt war, und nicht allein in der letzten Zeile.

Der neue `pruefeMetaMarke` prüft zwei Dinge in dieser Reihenfolge: erst die
gemeinsame Invariante (Frage und Übergabe nie in einer Nachricht), dann den
**Platz** — die Marke muss allein in der letzten nicht-leeren Zeile stehen und
genau einmal vorkommen. Nachfolgender Leerraum stört nicht.

**Bewusst nicht geprüft:** „Keine META-REFLECTION im Kontext ⇒ Marke nicht
setzen" (MRV-02/C3). Das ist eine Aussage über den **Kontext**, den ein
Antwort-Wächter nicht sieht. Sie braucht eine andere Bauart — Merkposten.

Damit ist die Familie vollständig sichtbar: TIMELINE-BLOCK · MOMENT-BLOCK ·
Aufdeck-Marke · META-REVEALED. Panel-Marken bleiben draußen (der Composer bleibt
dort stehen, siehe S101).

---

## 5 · S103.4 · Warum die Gleichgewichts-Regel nicht half

Die Regel existiert seit S96 und ist als „hart" markiert: *„Jede Tür bekommt
EINEN Satz vergleichbarer Länge — keine wird ausführlicher erklärt, empfohlen
oder mit ‚vielleicht eher' versehen."* AUS-05 riss sie trotzdem in 2 von 4.

Beim Nachlesen zeigt sich, **woher der Zusatz kommt**: Der Prompt liefert ihn
selbst. Zwei Sätze vorher steht

> Frage nach ZWECK, nie nach Aufwand: „zeigen, wie du dahin gekommen bist" gegen
> „sagen, was du sagen willst".

Das ist als **Paar** gemeint — Zweck von (a) gegen Zweck von (b). Das Modell
nimmt die erste Hälfte und hängt sie an Tür (a): *„ein Ausschnitt — damit er
sieht, wie du dahin gekommen bist"*. Genau der Satz, den der Judge beanstandet.
Die Schlagseite entsteht also nicht gegen den Prompt, sondern **aus** ihm.

Eine zweite „sei ausgewogen"-Regel hätte daran nichts geändert. Stattdessen ist
der Kontrast jetzt ausdrücklich unteilbar: Wer (a) einen Zweck-Zusatz gibt, gibt
(b) im selben Atemzug seinen — und (c) einen von gleicher Länge. Dazu der Satz,
der aus AUS-06/2 folgt: (c) ist keine Restkategorie, sondern eine vollwertige
Wahl.

Das bleibt eine Prompt-Wette. Ein Wächter müsste Satzlängen am Modelloutput
zählen; das misst nur der nächste Lauf.

---

## 6 · S103.5 · Die Nummer allein genügt nicht

KRIS-02/3, im gemeinsamen Raum: warme Würdigung, Telefonseelsorge genannt — aber
**kein** Verweis in den geschützten Einzelraum, und Bernd bekam eine Rolle („du
musst jetzt nichts tun außer da sein").

Der Baustein schreibt beides seit Langem vor, inklusive Reihenfolge und
Beispielsatz. Nach F2 („beides"):

* **Wächter** `core/engine/krisen-waechter.js` — schweigt, solange keine
  Krisenhilfe genannt wird; sonst muss ein Einzelraum-Verweis **davor** stehen.
  Verdrahtet in beiden geteilten Räumen (Qualitätszeit, Auflösung).
* **Prompt** — kein zweiter Regelsatz (das wäre die Doppelung, die wir in S102
  gerade aufgelöst haben), sondern das **Gegenbeispiel**, das dem Fall den Namen
  gibt: „Die Nummer allein — richtig, warm und vollständig genannt, aber OHNE den
  vorangehenden Verweis in den eigenen Raum — ist ein Verstoß: Sie schickt die
  Person nach draußen, ohne ihr den Ort zu zeigen, an dem sie hier sprechen kann."

**Nicht bewacht: der Partner-Auftrag.** Ob ein Satz an den Partner ihm eine Rolle
gibt oder ihn bloß würdigt, hängt am Ton, nicht an Wörtern. Eine Textprüfung
würde im Zweifel das Würdigen mitverbieten — und das ist Absicht des Bausteins.
Bleibt Prompt-Sache.

---

## 7 · Angepasste Bestandstests

`judge-haertung`, `judge-structured` (Versions-Kanarien j7 → j8) und
`judge-golden` (sechs Fixturen statt fünf).

---

## 8 · Was der nächste Lauf zeigen muss

S103.2 und S103.4 sind Prompt-Wetten; S103.1 verändert die Messung selbst.
Sinnvolle Reihenfolge:

```
ANTHROPIC_API_KEY=sk-… npm run eval -- --familie AUS    # Gabelung, Steuertext
ANTHROPIC_API_KEY=sk-… npm run eval -- --familie QZ     # war in Wahrheit grün — j8 muss das zeigen
ANTHROPIC_API_KEY=sk-… npm run eval -- --familie MOM
ANTHROPIC_API_KEY=sk-… npm run eval -- --familie MRV    # Markenplatzierung
ANTHROPIC_API_KEY=sk-… npm run eval -- --familie KRIS
```

**QZ ist der Kalibrier-Lauf:** Wenn j8 wirkt, muss QZ-01 grün werden, ohne dass
sich am Prompt der Qualitätszeit inhaltlich etwas geändert hat. Wird es das
nicht, ist die Fehlurteilsklasse nicht getroffen.

---

## 9 · Merkposten

- **MRV als eigener Sprint**, und erst nach einem Lauf mit j8. Von den neun
  Verletzungen adressiert S103 nur die Markenplatzierung; offen bleiben
  Zahlen-Dump, Vergleich der Lese-Richtungen und die fehlende allparteiliche
  Rückfrage (MRV-02).
- **AUFD-01 gegen MRV-02.** AUFD-01/1 bestraft, dass die Begleitung nach Bernds
  Richtungswunsch **erst Anna fragte** statt die Marke zu setzen — Bernd hatte
  über beide entschieden, die Rückfrage war also die allparteiliche, und dass sie
  **ohne Marke** kam, ist genau das, was S101 wollte. MRV-02 bestraft das
  Gegenteil. Die beiden Checks ziehen gegeneinander; das ist eine Katalog-Frage
  und gehört sortiert, bevor jemand am Prompt dreht.
- **Kontext-Wächter** für „Marke nur bei vorhandener META-REFLECTION" (§4).
- Unverändert offen: Ausschnitt aus einem abgerufenen Gespräch · mehrere Blöcke
  je Nachricht · Panel-Marken · Stützmodus im Reflexionsgespräch (S102 §3).
