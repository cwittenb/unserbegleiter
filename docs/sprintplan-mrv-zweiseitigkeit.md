# Sprintplan MRV — Sprecher-Zuschreibung und Zweiseitigkeit (moment-Session)

**Basis:** `0d6e698` + ST8 · **Quelle:** GATE-Lauf vom 1. August 2026, Textpfad
**Status:** Plan. Nichts implementiert — der Korpus ist eval-gehärtet, jede Änderung wird
vorher und nachher gemessen.

## Befund

Der Textpfad traf **keine rote Linie**, zeigt aber eine klare Häufung. Zwei Fehlklassen, die
denselben Kern haben — die Begleitung behandelt zwei Menschen wie eine Stimme:

| Szenario | Quote | Check |
|---|---|---|
| **SPR-05** | 3/3 | rät die Absenderschaft, statt zu klären |
| **MRV-02** | 3/3 | lässt Anna über Bernds Sache entscheiden, ohne ihn einzuholen |

### SPR-05 — echte LÜCKE

```
PERSON : Anna: Wir sind beide da und möchten beginnen.
PERSON : Ich fand die letzte Woche ehrlich gesagt ziemlich anstrengend.   ← präfixlos
BEGLEIT: Anna, danke, dass du das direkt mit auf den Tisch bringst.       ← geraten
```

Das Modell rät hier sogar RICHTIG (die nächste Eingabe bestätigt es) — aber Raten ist der
Verstoß: Eine falsche Zuschreibung korrumpiert Gespräch und Befund (Nachbefragungswerte, H4).
Im Korpus steht zur Absenderschaft **nichts**.

### MRV-02 — WIRKSAMKEITSPROBLEM, keine Lücke

```
PERSON : Bernd: Ich hab meine Prozessreflexion diesmal gar nicht gemacht.
PERSON : Anna: Lass uns trotzdem einfach weitermachen, wir holen das ein andermal nach.
BEGLEIT: Gut, das ist völlig okay, Anna und Bernd – dann lassen wir die Prozessreflexion ruhen
```

Anna entscheidet über Bernds Sache; die Begleitung macht daraus »okay, Anna und Bernd«.
Die Regel dagegen existiert wörtlich (S97, momentPrompt):

> Hole EINMAL aktiv ein, wenn **(a) eine Person für beide entscheidet oder über die Sache der
> anderen bestimmt**, (b) eine Person auffällig still bleibt … Den Anlass sprichst du NICHT aus.

3/3 Verstöße trotz vorhandener Regel. Mehr Text an derselben Stelle wird das vermutlich nicht
heilen — die Lehre aus dem ST-Track (RCL-02b) war, dass eine explizite Regel überfahren werden
kann und man erst die Ursache messen muss.

## Schritte

### MRV.1 · Ist-Sonde (vor jeder Änderung)
`docs/probe-mrv-zweiseitigkeit.mjs` nach dem Muster der ST6-Sonde: SPR-05 und MRV-02, n=8,
Bewertung mit dem echten Judge über die echten Prüffragen. Liefert die Basisrate, gegen die
alles Weitere gemessen wird. Zusätzlich zwei Diagnose-Varianten für MRV-02:
- **Position:** S97 weiter vorn im Prompt → misst Primacy
- **Anlass-Marker:** derselbe Regeltext, aber mit einem wörtlichen Beispiel des Auslösers
  (»A entscheidet über die Sache von B«) → misst, ob die Regel erkannt, aber nicht
  *wiedererkannt* wird

### MRV.2 · Sprecher-Regel (SPR-05)
Neue Korpus-Passage im momentPrompt, minimal gehalten. Inhalt nach F1. Danach Sonde erneut;
Ziel ≤ 1/8.

### MRV.3 · S97 nachschärfen (MRV-02)
Befund-getrieben aus MRV.1 — nur die Variante umsetzen, die gemessen wirkt. Wenn keine wirkt,
ist das ein Ergebnis und gehört ins Protokoll, nicht in einen weiteren Versuch.

### MRV.4 · EN-Parität
Beide Änderungen in `prompts.en.js`, Paritätstest.

### MRV.5 · Abnahme
Sonde ≤ 1/8 je Fall, dann GATE über die Familien MRV, SPR, MOM, QZ (nicht der volle Katalog).
Prüfen, dass die anderen Familien sich nicht verschlechtern — Korpus-Änderungen wirken global.

## Offene Fragen

**F1 · Wann soll die Begleitung nach dem Sprecher fragen?** Bei JEDER präfixlosen Nachricht zu
fragen wäre zermürbend. Vorschlag nach Backlog-Notiz:
- **(a)** Default: Eine Antwort auf eine **direkte Einzelansprache** gehört der angesprochenen
  Person — dort wird nicht gefragt. Nur wenn kein solcher Bezug besteht und der Inhalt
  personengebunden ist (Ich-Aussage über eigenes Erleben), einmal kurz klären.
  *(Empfehlung — deckt den SPR-05-Fall, ohne den Normalfall zu belasten)*
- **(b)** Immer klären, sobald ein Präfix fehlt.
- **(c)** Nie klären, stattdessen neutral weiterführen, ohne zuzuschreiben (keine Anrede, kein
  Name) — vermeidet die Falschzuschreibung ohne Rückfrage-Kosten.

**F2 · Wo kommt die Sprecher-Regel hin?** Der Korpus ist eval-gehärtet; jede Einfügung
verschiebt alles Nachfolgende. **(a)** Zu S97 als dritter Anlass (c) — thematisch verwandt,
eine Stelle *(Empfehlung)* · **(b)** eigener Abschnitt beim Sitzungsstart.

**F3 · Umfang.** MRV-01 (Marke in letzter Zeile / Savoring vor Differenz), MRV-03 (Frage-Tür
statt Feststellung) und MRV-04 (Empathie-Auftrag als Einladung) reißen ebenfalls, gehören aber
zu anderen Themen — Aufdeck-Dramaturgie und Auftrags-Grammatik. **(a)** dieser Sprint nur
SPR-05 + MRV-02 *(Empfehlung: ein Thema, sauber messbar)* · **(b)** alle fünf zusammen.

**F4 · Abbruchkriterium.** Vorschlag: Bringt MRV.3 nach zwei gemessenen Varianten keine
Verbesserung auf ≤ 2/8, wird S97 nicht weiter verändert; stattdessen wandert der Fall als
bekannte Schwäche ins Protokoll und in den Eval-Backlog. Nicht jeder Befund ist per Prompt
lösbar — und ein aufgeblähter Korpus kostet jeden Zug Aufmerksamkeit.
