# Sprint S109 · Der Kontext sagt jetzt dasselbe wie der Prompt

Basis: `origin/main` @ `35f9055` („patch-s108-polaritaet-und-zweischritt")
Kern-Hash: `b833165d7392d463` · Suite: **2315 grün** (2311 + 4)

Kein Lauf-Befund — beim Nachsehen gefunden. Der Anlass war eine andere Frage
(der Kontext-Wächter für `[[META-REVEALED]]`, siehe §3).

---

## 1 · Der Fund

S107 hat den Aufdeckungs-Abschnitt des Prompts ersetzt. Die **Kontexttexte**,
die die App vor jedem Zug mitschickt, blieben stehen:

> `mk.prozessKopf`: „… **einzelne Zahlen darfst du häppchenweise aussprechen,
> Treffer zuerst** — höchstens ein Wertepaar je Gesprächsschritt, die beiden
> **Lese-Richtungen** nie unmittelbar nacheinander … nie **Richtungs-Vergleich**"

Der Prompt sagt seit S107 das Gegenteil: *„in Worten, nicht in Zahlen"*,
*„es gibt nichts zu treffen"*. Dasselbe in `mk.prozessNachtrag`.

**Warum das schwerer wiegt als ein Prompt-Widerspruch:** Der Kontext steht
näher an den Daten. Er kommt mit jedem Zug, direkt neben den Werten, die er
beschreibt — der Prompt liegt 30.000 Zeichen davor.

Es ist derselbe Fehlertyp wie MRV-01 in S108 (dort widersprach sich der Prompt
selbst und riss 4/5), nur eine Ebene versetzt. Dass die Läufe trotzdem gut
aussahen, heißt vermutlich nur: der Prompt gewinnt. Verlassen würde ich mich
darauf nicht.

**Neu:**

> META-REFLECTION (aufzudecken — die Werte stehen nie in der UI und werden nie
> als Block vorgelesen; **sprich KEINE Zahlen aus**, sondern erzähle in Worten
> (»da liegt ihr nah beieinander« / »da liegt ein Stück dazwischen«); **beginne
> mit dem Beziehungswesen**, danach Passung und Wirksamkeit je Thema; die beiden
> Sichten nie im selben Atemzug, nie Mittelwert oder Score):

Der Nachtrag nennt zusätzlich die fragefreie Nachricht aus S108.

---

## 2 · Zwei weitere Reste

**`mess.markerDistanz/Ueber/Unter`** — die Texte des Lese-Markers („{me} hat
{partner}s Nähe zuletzt dreimal in Folge ÜBERSCHÄTZT — mögliches Muster:
{partner}s Not wird überlesen"). Ihr Aufrufer `pruefeLeserichtung` ist mit S107
entfallen; die Texte standen weiter im Korpus. Entfernt.

**`mein.messSub`** — der **sichtbare** Untertitel im Vorraum: „Ein kurzer,
verdeckter Blick auf **eure Nähe** und eure Aufträge". Das ist die alte Frage
(`closeness`), und sie steht in der Oberfläche, nicht nur im Prompt. Jetzt:
„… auf **euer Beziehungswesen** und eure Themen".

Der Untertitel ist der ärgerlichere der beiden: Er verspricht dem Paar etwas,
das die Mess-Runde seit S107 nicht mehr fragt.

---

## 3 · Der Kontext-Wächter wird NICHT gebaut

Anlass dieses Sprints war eigentlich ein Backlog-Punkt aus S103: ein Wächter
für „Marke nur bei vorhandener META-REFLECTION".

**Er ist überflüssig.** Die App setzt den Kontext eindeutig — `mk.prozessKopf`
mit Werten oder `mk.prozessLeer` („META-REFLECTION: keine ausstehend."). Die
Regel steht im Prompt. Der Check dazu (MRV-02/C3) war im Lauf vom 03.08. **5/5
grün**, und in allen Läufen davor ebenso. Es gibt keinen belegten Verstoß.

Der Merkposten stammt aus S103, als der Meta-Wächter gebaut wurde und die
Kontextbedingung als „andere Bauart" zurückgestellt wurde. Damals war das
richtig; inzwischen ist die Frage beantwortet, nur hatte sie niemand abgehakt.

**Gestrichen, wie der Struktur-Umbau** (ST8): ein Problem, das die Daten nicht
zeigen.

---

## 4 · Ein Test, der recht hatte

`s96-eval-haertung` prüfte, dass die Kontext-Kopftexte die Wertepaar-Regel
tragen — und schlug beim Umbau fehl. **Die Absicht war richtig und bleibt:**
Der Kontext muss dasselbe sagen wie der Prompt. Geprüft wurde nur die alte
Regel.

Umgeschrieben statt gestrichen: Er prüft jetzt „keine Zahlen", „Wesen zuerst"
und dass die alte Sprache fort ist. Damit fängt er künftig genau den Fehler ab,
den er diesmal offengelegt hat.

Dazu vier Prüfungen in `s107-beziehungswesen.spec.js` für die Reste aus §2.

---

## 5 · Der Sprachschnitt-Test — die Absicherung

Die Frage nach dem Fund: **Gibt es weitere Stellen, und lässt sich das generell
absichern?**

**Weitere Stellen:** Eine systematische Suche über alle vier Textquellen (Korpus
DE/EN, i18n DE/EN, die vier Prompts) fand noch `sk.leseMarkerKopf` — den
Kopftext des Lese-Markers, ohne Aufrufer seit S107. Entfernt, samt dem
Parameter `leseMarker` in `baueSoloKontext`, der seither immer `null` trug.

**Die Absicherung:** `tests/unit/s109-sprachschnitte.spec.js`.

### Die Idee

Wird eine Entscheidung getroffen (»Genauigkeits-Sprache ist raus«), gilt sie für
den **gesamten** Korpus — nicht nur für die Stelle, an der sie umgesetzt wurde.
Genau das lässt sich prüfen: eine Liste verbotener Wendungen mit Begründung,
geprüft über alle Textquellen. Vorbild ist der grep-Wächter aus S35d (keine
Modell-Literale im Code).

```js
{
  id: "S107 · Empathie-Signal",
  grund: "Die Lese-Genauigkeit ist als Maß verworfen — …",
  de: /Lese-Genauigkeit|Lese-Richtung|Empathie-Signal|…/i,
  en: /reading accuracy|reading direction|…/i,
  wo:   ["korpus", "i18n", "moment"],
  aber: [],
}
```

### Warum mit Geltungsbereich und benannten Ausnahmen

Ein reiner Wortlisten-Test wäre naiv. »Treffer zuerst« steht auch im
**Auflösungs**-Prompt — dort geht es um HANDOVER-Vermutungen (G-Items gegen
S-Items), einen Mechanismus, den es weiterhin gibt. **Gleiche Worte,
verschiedene Sachen.** Deshalb trägt jeder Schnitt seinen Geltungsbereich, und
Ausnahmen stehen als Liste da: Jede ist eine Behauptung, die jemand prüfen kann;
eine stillschweigende wäre unsichtbar.

Dieselbe Sorgfalt bei der Verbotsregel selbst: `KEIN EMPATHIE-AUFTRAG VON DIR`
nennt den Begriff, den sie verbietet — das ist ihr Zweck, also eine benannte
Ausnahme.

### Zwei Selbstprüfungen

Ein Verbotstest, dessen Muster nichts mehr findet, ist immer grün — auch wenn er
ins Leere zielt. Deshalb zwei Gegenproben:

* Die Muster treffen die Sätze, die vor S107 **wörtlich** im Korpus standen.
* Sie treffen **nicht**, was weiterhin gilt (die Treffer-Phase der Auflösung).

Dazu: Jeder Schnitt muss eine Begründung tragen. Ein Verbot ohne Grund wird beim
nächsten Umbau zu Recht entfernt.

### Was er leistet — und was nicht

Er fängt **überholte Sprache**: Text, der eine abgeschaffte Regel weiterträgt.
Das war der Fall bei `mk.prozessKopf` und `mein.messSub`.

Er fängt **nicht** den Fall, dass zwei Stellen inhaltlich auseinanderlaufen, ohne
dass eine verbotene Wendung fällt — etwa der MRV-01-Widerspruch aus S108 (»frage
in die Differenz« gegen »diese Nachricht enthält keine Frage«). Dort waren beide
Sätze für sich richtig. Für solche Fälle gibt es kein billiges Netz; sie brauchen
das Nachlesen oder einen Lauf.

**Der Test hat sich beim ersten Lauf bewährt:** Er meldete `sk.leseMarkerKopf`,
den ich beim manuellen Durchgehen übersehen hatte.

---

## 6 · Merkposten

Beide Fundstellen waren **verwaiste Texte** — Korpus- und i18n-Einträge, deren
Aufrufer verschwunden ist oder deren Inhalt überholt wurde. Die Suite sieht das
nicht: Ein unbenutzter Schlüssel bricht nichts.

Denkbar wäre ein Strukturtest wie der aus U11 („keine Fußmarke ohne rz-fuss"):
**jeder Korpus-Schlüssel hat mindestens einen Aufrufer.** Das hätte die
Marker-Texte gefunden — nicht aber `mk.prozessKopf`, der ja benutzt wird und
nur inhaltlich veraltet war. Für den zweiten Fall gibt es kein billiges Netz;
er braucht das Nachlesen.
