# Sprint S123 — Testhärtung: der flackernde e2e-Lauf und zwei Bauplan-Kanarien

**Basis:** `origin/main` @ `5195202` **plus S122** (box-sizing global)
**Kern-Hash nach dem Bau:** `6befc6f18c1c68ab` — unverändert gegenüber S122
**Deckt ab:** I15 und I16

Der unveränderte Kern-Hash ist hier die Aussage: Dieser Schritt fasst **keinen**
Produktionscode an. Nur Tests.

---

## 1 · I15 · Der e2e-Lauf, der zufällig fiel

Beobachtet beim Verifizieren von S119.6: `tests/e2e/pages-vollstack.spec.js` fiel mit
`Cannot read properties of null (reading 'submitToolResult')`. Zwei gezielte Wiederholungen
liefen grün.

**Was diese Meldung bedeutet:** Sie kommt aus dem Innenleben des Testläufers und heißt, dass
der Arbeitsprozess unerwartet endet. Sie stammt **nicht** aus einer gefallenen Zusicherung.
Ein Test, der so fällt, sagt nichts über die App.

**Erster Verdacht, verworfen:** Der äußere Testrahmen sei kürzer als die Summe der inneren
Wartefenster. Er ist es nicht — der Test trägt bereits 120s, die Fenster je 10s. Der Verdacht
war naheliegend und falsch; ich vermerke ihn, damit ihn niemand ein zweites Mal verfolgt.

**Zweiter Verdacht, umgesetzt:** Die App läuft nach dem letzten `expect` weiter — Streams,
Speicher-Schreibvorgänge, zeitversetztes Nachzeichnen. Wird Miniflare abgebaut, während so
ein Aufruf unterwegs ist, greift die fetch-Brücke auf eine abgebaute Instanz; die entstehende
Ablehnung hat keinen Zuhörer mehr und reißt den Prozess mit.

**Gegenmittel, in dieser Reihenfolge:** die Brücke abklemmen (nichts Neues geht hinein), die
Wurzel leeren (die App legt nichts nach), einen Zug warten (Angefangenes kommt zurück), erst
dann abbauen.

**Ehrlich gesagt:** Das ist eine begründete Vermutung, kein Beweis. Ein Fehler, der einmal in
zehn Läufen auftritt, lässt sich hier nicht als behoben nachweisen. Bleibt er aus, war es
das; kehrt er wieder, ist die nächste Spur der Speicher — Miniflare und happy-dom teilen sich
einen Prozess. Das steht so auch im Test.

---

## 2 · I16 · Gleiche Bauart, überall

Der Anlass war deine Frage, ob das Regal im eigenen Vorraum mit angepasst ist. Die Antwort
war ja — aber sie stimmt nur, **solange beide Räume dieselben Klassen tragen**. Alle Regeln
hängen an Klassen, kein Screen-Name kommt darin vor; das Markup wird aber je Raum einzeln
ausgeschrieben. Wer dort eine Klasse vergisst, bekommt einen Raum, der anders aussieht, und
kein bestehender Test merkt es: Jeder prüft genau einen Raum.

Neu: `tests/unit/i16-gleicher-bauplan.spec.js`, zwölf Fälle in zwei Gruppen.

**Vorräume** (`scrMyRoom`, `scrShared`): dieselben Klassen an der Zweiteilung; genau zwei
Hälften, Papier vor Tiefgrün; der Naht-Anker in der **zweiten** Hälfte (säße er links,
wanderte das Badge über die falsche Spalte); Regalreihen vorhanden; jede Zeile hat ihren
Kasten und jeder Kasten seine Zeile; jede Zeile trägt einen Pfeil; alle Kästen starten
geschlossen.

**Sessions** (`solo`, `einzel`, `moment`): dieselbe Hülle (Innenspalte, Verlauf,
Schreibkante); Verlaufsliste, Eingabefeld, Sendeknopf; der Verlauf liegt **oben**, die Kante
**unten**; die Kante ist der Naht-Anker (die waagerechte Entsprechung zur senkrechten Naht);
und keine Art bringt einen zweiten Verlauf oder eine zweite Kante mit.

Die Datei prüft **nicht**, ob der Bauplan richtig ist — das tun die bestehenden Tests. Sie
prüft, dass er überall **derselbe** ist.

### Zwei Funde beim Schreiben

**`boxLesen` ist ein Kasten ohne Zeile.** Die Leseansicht öffnet aus einem Eintrag der
Zeitleiste, nicht aus einer Regalzeile. Das ist zulässig — aber es ist eine Ausnahme, die man
kennen muss: Vergisst jemand den anderen Weg, ist der Inhalt unerreichbar und nichts fällt
auf. Sie steht jetzt als benannte Ausnahme im Test, statt die Prüfung aufzuweichen.

**Die Gemeinsame Auflösung startet nicht ohne Vorbedingung.** Sie verlangt, dass beide ihre
Auftragsklärung abgeschlossen und freigegeben haben. Das ist eine fachliche Sperre, kein
Bauplan-Unterschied; sie mitzuschleppen hieße, den halben Kernwetten-Ablauf im Testaufbau
nachzustellen. Bewusst ausgenommen, im Test begründet.

---

## 3 · Was ein gemeinsamer Bauplan gekostet hätte

Die gründlichere Lösung wäre eine Funktion, die beide Vorräume aus einer Vorlage erzeugt.
Sie hätte den Fehler unmöglich gemacht statt ihn nur zu finden — aber sie ist ein Eingriff in
zwei zentrale Markup-Blöcke, mit eigenem Risiko und ohne dass heute ein dritter Raum in Sicht
wäre. Die Kanarie kostet nichts und fängt denselben Fall. Wenn ein dritter Raum kommt, ist
der Umbau fällig; bis dahin ist er Vorrat.

---

## 4 · Tests

**Volle Suite:** 275 Dateien, 2693 Fälle, grün (unit 244/2495 in zwei Scherben,
engine+worker+e2e 31/198).
**Build:** Kern `6befc6f18c1c68ab` — unverändert, weil kein Produktionscode berührt wurde.
