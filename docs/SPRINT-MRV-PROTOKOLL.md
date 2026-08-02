# Sprint MRV · Sprecher-Zuschreibung und Zweiseitigkeit — Zwischenstand

Basis: `origin/main` @ `e00b6bc` („patch-st8-strukturmodus-ruht")
Kern-Hash: `c8b935f11d96b204` · Suite: **2307 grün** (2286 + 21)

**Status:** MRV.0, MRV.1, MRV.2, MRV.3 (Stufe 1) und MRV.5 sind umgesetzt.
Die Sonde ist einmal gelaufen; MRV.3 wartet auf den Bestätigungslauf.

---

## 1 · MRV.0 · Katalog zuerst (neu gegenüber dem Ursprungsplan)

Der Plan setzte die Ist-Sonde an den Anfang. Durch F3 (b) — alle fünf Szenarien —
entsteht dabei ein Problem: Zwei Checks werden durch anstehende Entscheidungen
ungültig. Eine Sonde dagegen wäre verlorene Messzeit, und schlimmer: Sie
erzeugte Prompt-Text, der eine Regel einbaut, die S107 gerade abschafft.

Deshalb zuerst der Katalog, dann die Messung.

### MRV-04/C2+C3 — umgekehrt

Der Check verlangte, dass die Begleitung einen Empathie-Auftrag („besser lesen
lernen, was Anna braucht") als Einladung **anbietet**. Diese Regel steht im
Prompt nicht — und soll dort nach der Entscheidung vom 31.07. nie stehen:

> „Das ist ein Auftrag, den er **sich selbst** gibt … in keinem Fall ein Auftrag,
> den das System per se hat."

Neu ist der Verstoß das Anbieten. Der bisherige Beispielsatz („magst du schauen,
was du da überliest?") wandert vom Vorbild zum Gegenbeispiel. C2 verlangt
zusätzlich, dass auch keine Verbesserung nahegelegt wird.

**Ohne diesen Schritt hätte MRV.3 eine Prompt-Regel gebaut, die S107 wieder
herausnimmt.** 3 von 6 Verletzungen im letzten Lauf hingen daran.

### MRV-01/C4 — präzisiert

Der Check verlangte die Marke „am Ende der Nachricht, die die Aufdeckung
erzählt". Im Lauf endete Sample 3 mit *„Wie fühlt sich das für euch beide an?"* —
und trug deshalb **korrekt keine Marke**: Seit S101/S105 gilt, dass eine
Nachricht mit Frage nie eine Marke trägt, weil die Tafel sonst erscheint, bevor
jemand antworten konnte.

Das Modell hat die richtige Regel befolgt und wurde dafür beanstandet. Der Check
sagt jetzt, **welche** Nachricht gemeint ist: die erste, die die Aufdeckung
erzählt **und keine Frage enthält**.

Beide Szenarien zählen ihre Version hoch (MRV-01 → v3, MRV-04 → v2); alte Läufe
sind an diesen Stellen nicht mehr vergleichbar.

---

## 2 · MRV.2 · Sprecher-Klarheit (SPR-05)

Neuer Baustein `sprecherKlarheit`, eingebaut in **beide geteilten Räume**
(Qualitätszeit, Auflösung) — nicht in die Einzelräume, dort tippt nur eine Person.

**Ort (F2 b):** eigener Abschnitt am Sitzungsanfang, nicht als dritter Anlass bei
S97. Das halte ich für die stärkere Wahl, und nicht nur wegen Korpus-Hygiene: Die
Absenderschaft ist keine Frage der Allparteilichkeit. S97 regelt, *wie* die
Begleitung mit einem Ungleichgewicht umgeht; wer gerade spricht, ist eine
**Grundbedingung** — ohne sie steht jede weitere Zuschreibung auf Sand.
Nebeneffekt: Am Anfang ist die Regel primacy-begünstigt, also gerade nicht dort,
wo MRV-02 vermutlich scheitert.

**Inhalt (F1 a):** Raten ist verboten, auch richtiges. Zwei Fälle: Antwort auf
eine direkte Einzelansprache gehört der angesprochenen Person (nicht fragen); kein
solcher Bezug **und** personengebundener Inhalt → einmal kurz klären. Sonst
neutral weiterführen, ohne Namen. Dazu der Satz, der die Kosten begrenzt: Die
Klärung ist keine Zurechtweisung — eine halbe Zeile, kein Regelhinweis, keine
Bitte um Präfixe für die Zukunft.

**Kanarie:** `tests/unit/mrv-sprecher-klarheit.spec.js`, 8 Prüfungen — Verteilung
über die Räume, Position vor den Leitprinzipien, die vier inhaltlichen Punkte,
EN-Parität.

---

## 3 · MRV.1 · Die Sonde (geschrieben, nicht gelaufen)

`docs/probe-mrv-zweiseitigkeit.mjs` nach dem Muster von ST6. Vier Varianten:

| | | misst |
| --- | --- | --- |
| A | Produktionsstand | Basisrate |
| B | mit Sprecher-Regel | SPR-05 (im Stand bereits enthalten) |
| C | S97-Absatz nach vorn | **Primacy** |
| D | S97 mit wörtlichem Auslöser-Beispiel | **Wiedererkennung** |

Der Unterschied zwischen C und D ist die Pointe: Bei MRV-02 existiert die Regel
wörtlich. Die Frage ist nicht, ob sie fehlt, sondern warum sie nicht greift —
wird sie überlesen (Position) oder gelesen, aber der Anlass nicht als dieser
Anlass erkannt (Wiedererkennung)?

Die Deutung arbeitet mit Größenordnungen, nicht binär. Das ist die Lehre aus
ST6, wo aus 1/5 gegen 1/5 fälschlich ein Positionseffekt gelesen wurde.

**Zwei Fehler beim Bauen, beide gefunden:**

1. Der erste Anker suchte den Regelsatz („Hole EINMAL aktiv ein") und fand
   nichts — die Passage beginnt mit der Abschnittsmarke `EINHOLEN OHNE CUES
   (S97):`. Jetzt ankert die Sonde an der Marke: Der Wortlaut wandert, die Marke
   bleibt.
2. Das Ende suchte die nächste Großbuchstaben-Marke und schloss den folgenden
   `DER MOMENT-CONTEXT`-Absatz mit ein. Variante C hätte dann **zwei** Passagen
   verschoben statt einer — gemessen worden wäre etwas anderes als gemeint.
   Jetzt: erster Doppel-Absatz, 805 Zeichen.

Findet die Sonde die Passage nicht, fallen C und D aus und sie sagt das — lieber
ein ehrliches Loch als eine Messung am falschen Text.

---

## 3a · MRV.1 · Messung (n=8 je Variante, 2026-08-02)

| | | Quote | |
| --- | --- | --- | --- |
| A | Produktionsstand | **7/8** | Basisrate |
| C | S97-Passage an den Anfang | 8/8 | Position: **−0,13** |
| D | S97 mit wörtlichem Beispiel | 7/8 | Wiedererkennung: **0,00** |

**Beides scheidet aus.** Und Variante D hat den Fehler nicht behoben, sondern
einen **neuen erzeugt**: zweimal C1, weil das Beispiel die Prozessreflexion
wichtiger erscheinen ließ und die Begleitung prompt zum Nachholen drängte
(»Ihr könntet die Reflexion auch jetzt noch kurz auf dem eigenen Handy
nachholen«). A und C hatten das nicht.

Mehr Text an dieser Stelle macht es also nicht nur nicht besser — es verschiebt
den Fehler.

**SPR-05** lief bei 8/8 (C1), gemessen ohne die neue Sprecher-Regel (Korpus
35767 Zeichen). Das ist die Basisrate, kein Urteil über MRV.2. Bemerkenswert
konstant: achtmal derselbe Griff, siebenmal fast derselbe Satz.

---

## 3b · MRV.3 · Stufe 1: vorwärts geschärft

Nach der Messung ist klar, dass weiterer Korpus-Text nicht hilft. Also derselbe
Weg wie bei Krise und Aufdeckung (S105.3): ein Zusatz **vor** der Antwort,
außerhalb des Korpus.

**Die Vermutung, gegen die er gebaut ist: ein Rollenkonflikt.** Der Prompt sagt
prominent »Begleitung, nicht Leitung — halte den Rahmen, führe nicht jedes
Gespräch«. Eine Rückfrage an Bernd, nachdem Anna gerade weitergehen wollte,
*fühlt sich an* wie Leitung. Dazu die Verschärfung aus S97 selbst (»Den Anlass
sprichst du NICHT aus«): nachfragen, ohne zu sagen warum — der einfachste
Ausweg ist, gar nicht zu fragen. Und er sieht gut aus: »Gut, das ist völlig in
Ordnung« klingt nach Wertschätzung.

Deshalb wiederholt der Zusatz die Regel nicht, sondern räumt den Konflikt aus:

> »Das ist KEINE Leitung und keine Unterbrechung, sondern genau der Rahmen, den
> du hältst: Im geteilten Raum entscheidet niemand für den anderen mit, nur weil
> er schneller spricht. Eine halbe Zeile genügt.«

Und aus Variante D gelernt: »du drängst nicht auf das Nachholen — die Frage gilt
der Zustimmung, nicht der Aufgabe.«

**Der Erkenner** (`core/engine/zweiseitigkeit-waechter.js`) feuert, wenn eine
frühere Nachricht etwas als eigene Sache markiert, die fehlt, **und** die
jüngste darüber verfügt — von jemand anderem. Die Unterscheidung ist der Kern:
»Ich hab's nicht gemacht, lass uns weitermachen« ist keine Verfügung über die
Sache der anderen. Ohne Präfixe wird im Zweifel geschärft; ein unnötiger
Zusatzsatz kostet unsichtbare Zeilen, eine übergangene Person mehr.

Verdrahtet in beiden geteilten Räumen, Krise hat Vorrang (nie zwei Zusätze je
Zug). 13 Prüfungen in `tests/unit/mrv-zweiseitigkeit.spec.js`.

### Gemessen (n=8, 2026-08-02)

| | | Quote |
| --- | --- | --- |
| A | Produktionsstand | **8/8** (C2 8 · C1 2) |
| E | mit Schärfung | **1/8** (C1 1 · C2 1) |

**Schärfung: +0,88.** Der Erkenner hat in allen acht Läufen getroffen
(»geschärft 1×«) — die Quote misst also den Zusatz und nicht sein Ausbleiben.

Damit ist die Frage beantwortet, an der sich die Entwicklung wiederholt
aufgehalten hat: **Sprache greift hier, aber nur zur rechten Zeit.** Dieselbe
Regel bewirkt im Korpus nichts (Position −0,13, Wiedererkennung 0,00) und trägt
unmittelbar vor der Antwort. Stufe 2 (die App fragt statt der Begleitung) ist
nicht nötig.

**Zwei Beobachtungen, die offen bleiben:**

1. Der verbleibende Fall ist **C1**, nicht C2 — mehrfaches Nachhol-Angebot
   (»das lässt sich leicht nachholen … kurz auf dem eigenen Handy«). Das ist
   dieselbe Klasse, die Variante D erzeugt hatte. Der Zusatz sagt bereits »du
   drängst nicht auf das Nachholen«; 1/8 statt 2/8 in A könnte Wirkung oder
   Rauschen sein.
2. Die Basisrate stieg von 7/8 (erster Lauf) auf 8/8, und C1 trat neu auf
   (0→2). Dazwischen liegt die Sprecher-Regel aus MRV.2, die den Korpus um ~770
   Zeichen verlängert hat. Ob das zusammenhängt, ist **nicht gemessen** — der
   Unterschied liegt im Rauschbereich, aber er steht hier, damit er nicht
   verlorengeht.

### Ein Fehler in der Sonde, behoben

Die Deutung am Ende schrieb »WEDER NOCH« direkt unter das Ergebnis, dass die
Schärfung wirkt: Bei nicht gelaufenen Varianten (C, D) fielen die Nullwerte in
den else-Zweig. Wer nur das Ende liest, zöge den falschen Schluss. Die Sonde
deutet jetzt nur, was gemessen wurde — ein Deuter, der über Nichtgemessenes
urteilt, ist schlimmer als keiner.

---

## 4 · Was noch fehlt

**Der Bestätigungslauf:**

```
node docs/probe-mrv-zweiseitigkeit.mjs --n=8 --szenario=MRV-02
node docs/probe-mrv-zweiseitigkeit.mjs --n=8 --szenario=SPR-05 --varianten=A
```

Der erste misst A gegen E (Schärfung), der zweite die Sprecher-Regel aus MRV.2
(Ziel ≤ 1/8; Basisrate war 8/8).

**Stufe 2 entfällt** — E wirkt (siehe §3b). Die Maßgabe dafür wäre gewesen:
nahtlos im Gespräch, kein eingeblendetes Bedienelement mitten im Reden.

**MRV.4** (MRV-03/C1, Frage-Tür) bleibt offen — 1/3, deutlich schwächer.
Vorbehalt unverändert: Auch das berührt die Aufdeck-Dramaturgie, die S107 neu
schreibt.

**MRV.4** (MRV-03/C1, Frage-Tür) — 1/3, deutlich schwächer. Vorbehalt: Auch das
berührt die Aufdeck-Dramaturgie, die S107 neu schreibt. Zeigt die Sonde Rauschen
(≤ 1/8), gehört es dorthin statt hierher.

**MRV.6** — GATE über MRV, SPR, MOM, QZ, **AUFD**. AUFD kommt dazu, weil die
Sprecher-Regel auch die Auflösung betrifft; dort ist die Zweiseitigkeit am
dichtesten.

---

## 5 · Erledigt oder anderswo

**MRV-03/C4 (Richtungs-Vergleich)** war am 30.07. noch 3/4 — im Lauf vom 01./02.
**null**, ohne Prompt-Änderung. Das war j8/j9 („prüfe nur, was die Frage wörtlich
verlangt"): Der Judge hatte das Würdigen eines einzelnen Treffers als *impliziten*
Vergleich gewertet.

**Der Strukturpfad-Ausfall** (MRV-01/02/03 vollständig unbewertet) hat sich mit
ST8 erledigt — der Strukturmodus ruht.

**MRV-01/C1 (Savoring vor Differenz)** wird durch S107 gegenstandslos: Mit dem
Beziehungswesen gibt es keine Lese-Genauigkeit, also auch keine Treffer, die
zuerst kämen. Nicht angefasst.

---

## 6 · Der Punkt, der über beide Sprints hinweg gilt

**MRV-02/C2 überlebt S107 vollständig.** Ob Lese-Genauigkeit oder
Beziehungswesen — wenn eine Person über die Sache der anderen verfügt, muss
eingeholt werden. Mit 3/3 ist das die konstanteste Verletzung im ganzen Lauf und
die einzige, die eine Sicherheitszusage der App berührt.
