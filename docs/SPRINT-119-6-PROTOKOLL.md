# Sprint S119.6 — eine erfundene Marke erreicht die Anzeige nicht mehr

**Basis:** `origin/main` @ `ea6da9c` (S119.4 · Einstellungen: Ausrichtung)
**Kern-Hash nach dem Bau:** `f4ff02fd66feaebe`
**Deckt ab:** I10 aus dem Sprintplan S119

---

## 1 · Befund

Das Modell (Mistral) hängte an die Eröffnung eines Reflexionsgesprächs ein `[[weiter]]` —
eine Marke, die es im ganzen Bestand nicht gibt. Sie stand sichtbar im Text.

Warum sie durchkam, in zwei Schritten:

**Marken werden durch Auflisten entfernt.** `cleanDisplay` geht die `markerOrder` der
Session durch (`for (const mk of alleMarker) t = t.split(mk).join("")`). Das
Reflexionsgespräch hat eine **leere** Liste — es kennt planmäßig keine Marken. Es gab also
nichts abzugleichen.

**Der Klammerzeilen-Filter griff nicht.** Der Steuer-Token-Filter (S93) entfernt Zeilen, die
vollständig aus einem eckig geklammerten Ausdruck bestehen. Hätte `[[weiter]]` allein auf
einer Zeile gestanden, wäre es damit erledigt gewesen. Es stand aber am **Satzende, im
Fließtext** — und genau diese Lücke war offen.

Als echte Marke wäre `[[weiter]]` ohnehin unmöglich: Der Registry-Wächter verlangt
Großschreibung (`marker.js`). Es war reine Erfindung.

---

## 2 · Entscheidungen

**Die Anzeige wird gehärtet, das Modellverhalten nicht bekämpft.** Der Schaden entsteht in
der Anzeige; dort gehört er abgestellt. Ob ein Provider Steuermarken erfindet, ist eine
Frage für den Eval-Lauf (E1 im Sprintplan), keine für einen Regex im Prompt.

**Der Filter ist bewusst eng:** kein Leerzeichen im Inneren, keine weitere Klammer,
höchstens 40 Zeichen. Ein Satz in doppelten Klammern über mehrere Wörter ist damit **keine**
Marke und bleibt stehen — dort wäre Löschen der größere Eingriff.

**Er gilt für jede Session, nicht nur für die ohne Markenliste.** Eine Marke, die diese
Session nicht kennt, ist überall falsch: Die App wertet sie ohnehin nicht aus, anzeigen
wäre in jedem Fall ein Protokoll-Leck.

**Reihenfolge wie beim Steuer-Token: nach der Blockersetzung.** Sonst könnte verschachteltes
JSON (`[["a","b"]]`) getroffen werden. Ein Test hält diese Reihenfolge fest.

**Nicht angefasst:** das doppelte Leerzeichen, das der alte Auflistungs-Weg hinterlässt
(`"Text [[CHAPTER-1]] weiter"` → `"Text  weiter"`). Das ist Bestandsverhalten; dieser
Schritt soll die Anzeige dicht machen, nicht nebenbei die Typografie ändern. Ein Test hält
es als bekannt fest, statt es stillschweigend mitzuziehen.

---

## 3 · Änderungen

- `core/contracts/steuertoken.js` — neue Funktion `entferneFremdeMarken` samt Begründung.
- `core/contracts/block.js` — `cleanDisplay` ruft sie nach dem Steuer-Token-Filter auf.
- `tests/unit/s119-6-fremde-marken.spec.js` — neu.

---

## 4 · Tests

Neun Fälle:

- der gemeldete Fall: `[[weiter]]` am Satzende verschwindet;
- auch mitten im Satz, ohne die Wörter zu verkleben (`Ein[[X]]Wort` → `Ein Wort`);
- registrierte Marken laufen unverändert über den alten Weg;
- eine Session ohne Markenliste ist dicht — vier verschiedene Erfindungen;
- Fließtext in doppelten Klammern bleibt stehen;
- überlange Klammerausdrücke bleiben stehen;
- Text ohne doppelte Klammer wird unverändert durchgereicht;
- JSON-Innenleben eines Blocks wird nicht getroffen (Reihenfolge festgehalten);
- die Leerzeilen-Regel bleibt: kein doppelter Absatz, wo eine Marke stand.

**Volle Suite:** 267 Dateien, 2594 Fälle, grün (unit 236/2396, engine+worker+e2e 31/198).
**Build:** erfolgreich, Kern `f4ff02fd66feaebe`.

---

## 5 · Was das nicht löst

Die Erfindung selbst bleibt. Zwei Verstöße in **einer** Antwort — falsche Eröffnungsfassung
(I9) und erfundene Marke — sind ein Treue-Befund. Er gehört gemessen: Szenario „Erstkontakt
ohne Kontext", n Durchläufe gegen beide Provider, rote Linie = Wiederkehr-Fassung oder
erfundene Marke. Das steht als E1 im Sprintplan und ist mit diesem Schritt **nicht**
erledigt — nur unsichtbar gemacht.
