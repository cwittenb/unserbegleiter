# Designnotiz: Die sechs offenen Designfragen – Statusabgleich (v0.1)

> Bezieht sich auf die offenen Punkte aus `komponenten-definition.md`
> (Session vom 02.06.). Seitdem gebaut: Slices 1–5, Kernwetten-App
> v0.6 (JSON-Blöcke mit Schemavalidierung, v2-Flag), GATE-B-Pipeline
> (v7), `eskalation-an-profis.md`, `ko-regulations-grenzen.md`. Dieser
> Abgleich sortiert: Was ist durch das Gebaute faktisch entschieden,
> was liegt als Entscheidungsvorschlag vor, was bleibt echt offen.

## Frage 1 – „Spiegel statt Bewertung" strukturell erzwingen

**Damals:** Rohe Fremdwahrnehmung („du bist immer so abweisend") ist
als Beobachtung gemeint, landet aber als Urteil; das System muss den
Input umformen, BEVOR er in der gemeinsamen Schicht ankommt. Mechanik
offen.

**Status: im Prinzip entschieden, Prototyp gebaut.** Die
GATE-B-Pipeline ist exakt diese Mechanik: Umformung nach B-Kriterien
(eigene Sorge statt Urteil, keine Gewissheit über Innenleben, kein
Charakter-Etikett, keine Generalisierung, Ein-Stimmen-Regel,
Gegenstands-Treue) + Owner-Bestätigung des Bedeutungserhalts +
Freigabe-Gate. Das Prinzip ist damit Systemeigenschaft, nicht
Wohlverhalten – und es ist eval-gesichert (rote Linien, Härteregel).

**Restpunkt:** Die Pipeline ist für Befürchtungen (BS/BV) gebaut. Die
Ausweitung auf Beobachtungs-Items („was ich an dir beobachte") ist
dasselbe Muster mit eigenem Kriterienkatalog (statt B-Kriterien:
Situations-Bindung, Verhaltens- statt Wesens-Sprache). Vorschlag:
eigenes Gate nach GATE-B-Vorbild, wenn Beobachtungs-Querung gebaut
wird – kein neues Design nötig, nur Instanziierung des Musters.

## Frage 2 – Feed vs. kuratierter gemeinsamer Moment

**Damals:** Ein bloßer Feed verschiebt das Flooding-Problem in die
gemeinsame Schicht; der andere soll Material ungeflutet begegnen.

**Status: entschieden durch Kernwetten – kuratierter Moment, kein
Feed.** Das gebaute Muster: Material quert nur (a) freigegeben, (b)
umgeformt, (c) in einem choreografierten gemeinsamen Termin, der erst
öffnet, wenn BEIDE Übergaben vorliegen, mit Reihenfolge-Regie (Treffer
vor Divergenzen, eine Sache nach der anderen, betroffene Person
zuerst). Es gibt im System keinen Kanal, über den Eingespeistes den
anderen asynchron und ungeformt erreicht.

**Verallgemeinerung (Vorschlag, zu bestätigen):** Auch im späteren
Mehr-Session-Produkt gilt: Asynchron eingespeistes Material WARTET auf
den nächsten kuratierten Moment. Ein Feed existiert höchstens für
Selbst-Material der eigenen Einzelschicht, nie für Material über mich
von der anderen Person.

## Frage 3 – Messmodell für „überprüfbare" Ziele

**Damals:** Selbstbericht (sozial erwünscht), wechselseitiger Bericht
(Punkte-Konto-Gefahr) oder beobachtbares Verhalten? Unbestimmt.

**Status: Entscheidungsvorschlag.** Zweigleisig:

1. **Beidseitiger Selbstbericht, nebeneinander, unbewertet.** Bereits
   gebaut als Startwerte des gemeinsamen Auftrags („Wie nah seid ihr
   dem heute, 1–10?" – beide Werte nebeneinander, nicht verrechnet).
   Die Soziale-Erwünschtheits-Schwäche wird nicht wegmodelliert,
   sondern durch das Nebeneinander sichtbar gemacht: Die DIFFERENZ der
   beiden Werte ist informativer als jeder Einzelwert.
2. **Das Beziehungswesen als geteilte Frage** (Slice 3, abgelöst S107):
   Beide beantworten dieselbe Frage über dasselbe Dritte – wie es der
   Beziehung ergeht. Es ist punkte-konto-resistent, weil es **keinen
   richtigen Wert gibt**, auf den sich performen ließe: Wer hoch
   antwortet, hat nicht gewonnen, wer niedrig antwortet, nichts falsch
   gemacht. Die Differenz zwischen beiden ist informativ, ohne dass
   einer sie verursacht hätte.

   Die Resistenz ist damit **stärker** als vorher: Beim früheren
   Empathie-Signal (Lücke zwischen Vermutung und Selbstbericht) ließ
   sich immerhin auf Genauigkeit hin optimieren – man konnte lernen,
   was der andere wohl antwortet. Beim Beziehungswesen gibt es nichts
   zu treffen. Begründung: `docs/designnotiz-beziehungswesen.md`.

**Verworfen (Vorschlag):** Verhaltens-Messung. Sie erbt das
Erkennungsproblem („kein scannender Wächter",
grundpraemissen-und-sicherheit) und macht das System zur
Kontrollinstanz im Alltag – genau die Rolle, die die Charta
ausschließt. Verhalten erscheint nur dort, wo Personen es selbst
berichten.

## Frage 4 – Zielfindung gemeinsam oder getrennt-dann-zusammengeführt

**Damals:** Getrennt erheben und konsolidieren öffnet eine Tür, durch
die Einzelinhalt unbemerkt in die gemeinsame Schicht sickert.

**Status: entschieden durch Kernwetten – sequenziell, mit zwei
Dichtungen.** Die Sicker-Tür ist baulich geschlossen: (1) Das
Freigabe-Gate – nur ausdrücklich Freigegebenes quert, das Repo kennt
keinen anderen Weg in die gemeinsame Schicht. (2) Die Auftrags-Probe –
der Vertrag entsteht ausschließlich IM gemeinsamen Raum; ein nicht von
beiden bestätigter Auftrag existiert nicht, seit v0.5 schema-erzwungen
(`vonBeidenBestaetigt: true` oder `null`). Getrennte Erhebung liefert
Material, niemals Vertragsinhalt. Damit ist „getrennt-dann-zusammen"
nicht die riskante, sondern die sichere Variante – sie schützt
zusätzlich vor Anker-Effekten der zuerst sprechenden Person.

## Frage 5 – Qualitätszeit / Einladungen: Quelle und Scope

**Damals:** Speisung aus der Einzelarbeit (Leak-Gefahr) oder generisch
(beliebig)? Und: bewusste Erweiterung oder Abdriften vom Kernauftrag?

**Status: echt offen – aber mit einer dritten Option, die es damals
noch nicht gab.** Kernwetten produziert inzwischen genau das Material,
aus dem sich Einladungen leak-frei speisen lassen: die FREIGEGEBENE
gemeinsame Schicht (bestätigte Wünsche, „gemeinsam arbeiten"-Themen,
der gemeinsame Auftrag, Auftrags-Ergänzungen). Vorschlag:

- **Quelle:** ausschließlich gemeinsame Schicht. Nie Einzelmaterial
  (Leak), nie rein generisch (beliebig). Eine Einladung ist damit
  immer begründbar: „Ihr habt beide X freigegeben – wäre Y eine
  Gelegenheit dafür?"
- **Scope:** bewusste Erweiterung, aber als eigene Funktion getrennt
  von der gemeinsamen Reflexion (die Trennung der zwei
  C-Funktionen war ja bereits angelegt). Kein Bestandteil des
  Kernwetten-Tests; eigener Slice, wenn dran.
- **Charta-Anschluss:** Einladungen sind Angebote ohne Engagement-Zug
  (Ko-Regulations-Grenzen: kein „das System bittet um Interaktion") –
  Frequenz-Deckel und Ignorieren-ohne-Nachfassen gehören in die
  Spezifikation.

**Hier braucht es deine Entscheidung:** Erweiterung ja/nein – die
Quelle-Frage ist mit „gemeinsame Schicht" m. E. gelöst, die
Scope-Frage (gehört Enrichment überhaupt ins Produkt?) ist eine
Produktentscheidung, keine Architekturfrage mehr.

## Frage 6 – Eskalationsendpunkt ohne Menschen im System

**Damals:** Risiko 4 hatte den Menschen als Endpunkt; den gibt es
nicht mehr. „Wohin eskaliert das System?" geparkt.

**Status: entschieden und spezifiziert** durch
`eskalation-an-profis.md` (drei Trigger-Klassen: Sicherheitslagen /
akute Krisen / Kompetenzgrenzen mit Angebots-Logik und
Tonlagen-Grammatik) plus `ko-regulations-grenzen.md`
(Stabilisieren-vs-Ko-Regulieren, Profi-Brücke). Die Antwort auf „wohin
eskaliert das System?": **an menschliche Profis AUSSERHALB des
Systems, über Information und Angebot** – das System ist Brücke, nicht
Endpunkt, und es wird nicht zum scannenden Wächter (Trigger nur aus
Selbstgeäußertem). Eval-Anschluss (ESC-01–04) liegt im Backlog.

## Zusammenfassung

| # | Frage | Status |
|---|---|---|
| 1 | Spiegel-Prinzip strukturell | Entschieden, GATE-B = gebauter Prototyp; Ausweitung auf Beobachtungs-Items = Muster-Instanziierung |
| 2 | Feed vs. kuratierter Moment | Entschieden: kuratierter Moment; Feed-Verbot für Fremd-Material als Verallgemeinerung vorgeschlagen |
| 3 | Messmodell | Vorschlag: Selbstbericht nebeneinander + Empathie-Signal; Verhaltens-Messung verwerfen |
| 4 | Zielfindung | Entschieden: sequenziell mit Gate + beidseitiger Bestätigung (schema-erzwungen) |
| 5 | Qualitätszeit | Entschieden: Enrichment ja, Zwei-Quellen-Modell (Resonanz + Negativraum), Fächer-Pflicht – s. `qualitaetszeit-einladungen.md` |
| 6 | Eskalationsendpunkt | Entschieden und spezifiziert (Profi-Brücke, drei Klassen) |
