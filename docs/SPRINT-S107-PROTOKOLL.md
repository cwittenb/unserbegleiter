# Sprint S107 · Beziehungswesen statt Empathie-Signal

Basis: `origin/main` @ `774e0c4` („patch-mrv2-runner-misst-die-app")
Kern-Hash nach Patch: `be7c4aa365942f75` · Suite: **2301 grün**

Setzt die Designnotiz `docs/designnotiz-beziehungswesen.md` um. Sie ist die
Begründung; hier steht, was daraus im Code geworden ist.

---

## 1 · Was die Prozessreflexion jetzt misst

```
                    vorher                       jetzt
  closeness   Wie nah fühle ICH mich?      ⟶     entfällt
  guess       Wie nah fühlt sich Bernd?    ⟶     entfällt
                                                 wesen        Wie geht es eurem
                                                              Beziehungswesen?
  fit         Passung je Thema             ⟶     bleibt
                                                 wirksamkeit  Wie wirksam fühlst
                                                              DU dich dabei?
```

Der Unterschied ist nicht die Zahl der Regler, sondern **was zwischen ihnen
liegt**: Aus `guess` × `closeness` entstand die Lese-Genauigkeit — ein Maß auf
eine Person. Beim Wesen beantworten beide **dieselbe Frage über dasselbe**. Es
gibt keinen wahren Wert, keine Rollen und nichts zu vergleichen.

**Die Reglerzahl sinkt sogar.** Die Auflösung erzeugt genau EIN gemeinsames Ziel
(`sharedGoal`, Einzahl) — im Normalfall also 1 + 2 = drei Regler statt bisher
2 + 1. Eine Obergrenze für die Mess-Runde wäre die falsche Antwort auf die
falsche Frage: Sind mehr als drei Themen aktiv, ist nicht die Runde zu lang,
sondern das Paar hat zu viel offen. **Merkposten**, kein Schritt.

---

## 2 · Die Aufdeckung wurde ersetzt, nicht angepasst

Der ganze Abschnitt im `momentPrompt` ist neu geschrieben, DE und EN. Vorher
begann er mit *„Beginne mit guter Lese-Genauigkeit … das ist Savoring (‚ihr
lest euch da gut')."* Jetzt:

> Die Prozessreflexion misst NICHT, wie gut zwei Menschen einander lesen,
> sondern wie es dem Dritten geht, das zwischen ihnen entstanden ist — und
> woran sie gerade arbeiten. … Es gibt hier keinen wahren Wert und niemanden,
> der falsch liegt; es gibt zwei Sichten.

Die vier Regeln, die daraus folgen:

* **Übereinstimmung ist ein Kontaktmoment, keine Leistung** — „da seht ihr euer
  Wir ähnlich", nie „ihr lest euch gut". *Es gibt nichts zu treffen.*
* **Differenz ist die reichere Tür** — dort wird verweilt, nicht darüber
  hinweggegangen. In sie hineinfragen, statt sie zu erklären.
* **Sorgfalt beim Zeigen** — ein weiter Abstand kann eine harte Nachricht sein;
  die beiden Sichten nie im selben Atemzug.
* **Kein Empathie-Auftrag von der Begleitung** — weder als Ziel noch als
  Einladung noch als Andeutung.

### Zu F1: keine Zahlen mehr

Entschieden wie empfohlen — qualitativ. Die Begründung steht im Prompt selbst:

> „in Worten, nicht in Zahlen (‚da liegt ihr nah beieinander' / ‚da liegt ein
> Stück dazwischen', nie ‚du 8, er 3'). Zwei Zahlen nebeneinander sind eine
> Genauigkeitsaussage, egal wie warm der Satz drumherum klingt."

Die Werte bleiben im Datenmodell und in der Trajektorie; die Begleitung spricht
sie nicht aus. Die S96-Kanarie ist damit **strenger** geworden: aus „höchstens
EIN Wertepaar je Schritt" wurde „gar keine Zahlen".

### Zu F2: anders als geplant

Im Plan stand „Reihenfolge behalten, Gewicht drehen". Beim Schreiben zeigte
sich, dass „TREFFER ZUERST" seinen Gegenstand verloren hat — mit dem Wesen gibt
es keine Treffer, die zuerst kämen. Die Regel ist **ganz gefallen**; an ihre
Stelle tritt „BEGINNE MIT DEM WESEN", also die Reihenfolge Wesen → Themen.

### Nebenbei behoben: MRV-01/C4

Die Marken-Regel trägt jetzt ausdrücklich die Regie-Übergabe:

> „Diese Nachricht enthält KEINE Frage an das Paar: Die Marke übergibt die
> Führung, und eine Frage daneben käme zu spät."

Genau der Fall, an dem MRV-01/C4 im Lauf vom 02.08. viermal riss — dort hatte
das Modell die S101-Regel korrekt befolgt und wurde vom Check bestraft. Jetzt
sagen Prompt und Check dasselbe.

---

## 3 · `pruefeLeserichtung` ist ersatzlos gefallen

Zusammen mit `formatiereLeseMarker` und dem Lese-Marker im Einzelraum.

Es las aus drei aufeinander folgenden Runden ein Muster — „distanz",
„ueberschaetzt" (Not wird überlesen), „unterschaetzt" (Distanz lesen, wo keine
ist) — und machte daraus ein einmaliges Angebot. Sauber gebaut, mit
Merken-statt-Melden und Schlüssel in `pstate`.

Und die reinste Form dessen, was hier verworfen wird: **eine Aussage über eine
Person, abgeleitet aus einer Trefferquote.**

An der Stelle steht jetzt ein Kommentar, der sagt, was dort stand und warum der
Gedanke trotzdem wertvoll bleibt: Dass einer die Beziehung wiederholt anders
sieht als der andere, lässt sich über das Wesen **implizit** erheben — dann ist
es eine Beobachtung über die Beziehung und lässt sich als gemeinsames Rätsel
ansprechen. Im Backlog, nicht gebaut: erst messen, dann Muster lesen.

**Eine kleine eigene Entscheidung:** `leseMarker` bleibt als Parameter von
`baueSoloKontext` bestehen (jetzt immer `null`). So bleibt die Stelle sichtbar,
an der ein Nachfolger stehen könnte, ohne dass jetzt etwas Halbes dasteht.

---

## 4 · Katalog

| | vorher | jetzt |
| --- | --- | --- |
| MRV-01/C1 | beginnt mit Lese-Genauigkeit? | beginnt mit dem **Beziehungswesen**? |
| MRV-01/C2 | Differenz als Fehler? | … **oder geht sie über sie hinweg?** |
| MRV-01/C3 | Zahlen-Dump, Richtungs-Vergleich | **spricht sie Zahlen überhaupt aus?** |
| MRV-03/C4 | vergleicht die Lese-Richtungen? | **würdigt sie Übereinstimmung als Leistung?** |
| MRV-04 | Lese-Marker, Auftrag anbieten | **Selbstverpflichtung**: Bernd formuliert ihn selbst |

MRV-01/C2 ist dabei nicht nur umformuliert, sondern **erweitert**: Neu ist der
Verstoß auch, die Differenz zu *übergehen*. Nach der Klärung ist sie die
reichere Erfahrung — sie zu überspringen ist ein eigener Fehler, nicht nur ihre
Fehlrahmung.

MRV-04 wäre gegenstandslos gewesen (sein ganzer Kontext war der Lese-Marker).
Umgebaut statt gestrichen: Bernd sagt jetzt selbst *„ich würde gern besser
verstehen, was in ihr vorgeht. Das nehme ich mir vor."* Geprüft wird, ob die
Begleitung das **aufnimmt** wie jeden anderen Auftrag — und ob sie es nicht als
Defizit rahmt.

Alle Szenario-Kontexte tragen jetzt Wesen/Passung/Wirksamkeit statt
Nähe/Lese-Genauigkeit. Versionen hochgezählt; die Läufe davor sind an diesen
Stellen nicht mehr vergleichbar.

---

## 5 · Angepasste Bestandstests

`prozess-qz`, `s88-prozessreflexion-raum`, `s96-eval-haertung`,
`s97-gabelung-einholen`. Neu: `s107-beziehungswesen.spec.js` (11 Prüfungen).

Der S97-Test nagelte `version === 2` fest — das bricht bei jeder Katalog-Pflege.
Er prüft jetzt den Zuschnitt (fünf Eingaben) und eine **Mindestversion**.

**Ein Fund beim Testschreiben:** Die Mess-Runde muss **betreten** werden
(`btnMyRoom` → `btnMess`); `show("scrProzess")` schaltet nur den Screen um und
lädt die Runde nicht. Dieselbe Lektion wie in S99.1.

---

## 6 · Was der nächste Lauf zeigen muss

Der erste Lauf, der das neue Messmodell misst — und der erste seit der
Runner-Reparatur, der überhaupt misst, was die App tut.

```
npm run eval -- --familie MRV
npm run eval -- --familie MOM
npm run eval -- --familie QZ
```

**Erwartung:** MRV-03/C4 verschwindet, weil es nichts mehr zu vergleichen gibt.
MRV-01/C4 sollte fallen, weil Prompt und Check jetzt dasselbe sagen.
Interessant ist **MRV-01/C2** — der neue Teil der Frage („geht sie über die
Differenz hinweg?") ist noch nie gemessen worden.

---

## 7 · Merkposten

- **Nachfolge-Muster** für `pruefeLeserichtung` (§3): „Wesen dreimal in Folge
  weit auseinander", „Passung hoch bei anhaltend niedriger Wirksamkeit".
- **Obergrenze für aktive Themen** (§1) — gehört dorthin, wo Ziele entstehen.
- **Drei Konzeptdokumente** ziehen nach (Designnotiz §7): Slice 2, Slice 3,
  Designfragen-Status. Sie liegen außerhalb des Repos.
- Die **Punkte-Konto-Resistenz** braucht eine neue Begründung: Sie war damit
  begründet, dass „besser lesen" das Gewollte sei. Die Resistenz selbst dürfte
  bleiben — beim Wesen gibt es keinen Wert, auf den sich performen ließe.
