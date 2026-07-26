# Sprintprotokoll · S95.7a/b/c — Replay: nachträglich aus einer Session teilen

**Basis:** `origin/main` @ `3121e34` (patch-q3-desktop-feinschliff)
**Ausgangslage:** 1455 Struktur- / 155 Worker- / 25 Engine- / 4 e2e-Tests grün
**Endstand:** **1480 / 155 / 25 / 4 grün**, `npm run build` grün
**Kern-Hash:** `19367f4ae2cfb503`

---

## Vorgeschichte: wie der Schnitt verlorenging

Im ursprünglichen Sprintplan war **S95.7 = Replay**. Als die UI-Schnitte auf
S96.x umnummeriert wurden, wanderte der Verweis mit — im Code stand:

> Ohne diese Trennung liesse sich der **Replay-Eingang (S96.3)** nur mit einer
> zweiten Freigabestrecke anschliessen

S96.3 wurde aber die Regal-Seite. Der Verweis zeigte seither auf eine Nummer,
die etwas anderes bezeichnet — und damit sah es aus, als sei der Schnitt
abgedeckt. Die Vorleistungen wurden trotzdem gebaut, deshalb wirkte der Code
vollständig. **Der Kommentar ist in diesem Sprint korrigiert.**

Beide Vorleistungen haben getragen und mussten nicht angefasst werden:
S95.4/E7 (Eignungsprüfung bei jedem Abschluss) und die S96.1-Bauvorschrift
(engine-freies Panel, `if (!engine) return;` im Freigabepfad).

---

## Entscheidungen

| | |
|---|---|
| **F0** | Vorgabe **aufbewahren**; Erst-Information beim ersten Mal; Umstellung auf „jedes Mal fragen" |
| **F1** | Löschbar ist **nur das Transkript**; Zeitleisten-Einträge und freigegebene Punkte bleiben |
| **F2** | Kein Verfall |
| **K1** | Keine Größengrenze — beobachten |
| **K2** | Zeile statt eigener Fläche |
| **K3** | Sammellöschen stellt die Vorgabe **nicht** um |
| verworfen | Sorgen-Weiche als Aufbewahrungs-Kriterium |
| verworfen | Vorgemerkter Entwurf statt Transkript |

**Warum die Weiche ausscheidet:** Sie ist per Design stumm — sie darf das Muster
weder benennen noch deuten. Als Aufbewahrungs-Kriterium hieße das: Einer Person
verschwindet ihr Verlauf, und sie kann nie erfahren, warum. Die Maschine
entschiede, wo die Person entscheiden soll. Nebeneffekt: Es braucht keinen
Weichen-Marker und kein neues sensibles Signal im Speicher.

**Warum nur das Transkript löschbar ist:** Die freigegebenen Punkte sind in den
gemeinsamen Raum gequert — der Partner hat sie. Sie einseitig zu entfernen
erzeugte zwei Versionen dessen, was zwischen den beiden passiert ist. Das folgt
der Vertraulichkeitsarchitektur: Ziel- und Vertragsebene beidseitig bekannt,
Methoden- und Selbstebene vertraulich. Das Transkript liegt auf der zweiten.

---

## S95.7a · Ablage

**`core/ui/verlauf-ablage.js`** — `legeVerlaufAb`, `holeVerlauf`,
`loescheVerlauf`, `loescheAlleVerlaeufe`, `verlaufEinstellung`, `neueVerlaufId`.

Drei Eigenschaften, die die Ablage von „Verlauf ins Zeitleisten-Objekt"
unterscheiden:

**Eigener Schlüssel je Verlauf.** `pstate("timeline")` ist ein einziger
JSON-Block, der bei jedem Öffnen der Zeitleiste vollständig gelesen wird.
Transkripte darin ließen ihn unbegrenzt wachsen und verteuerten jeden Blick auf
die Chronik. Der Eintrag trägt nur die Kennung (`vid`).

**Eigene Identität — Befund beim Bauen.** Es gibt heute **keine
Session-Kennung**: `state.chatId` ist konstant `"einzel"`. Das ist genau der
eine Slot, den die nächste Reflexion überschreibt. Die Ablage bringt ihre
Kennung selbst mit (Zeitstempel + Zufall: sortierbar und kollisionsfrei).

**Rollengebunden privat.** `pstate` ist je Rolle getrennt. Der Verlauf kann
Material enthalten, das die Sorgen-Weiche bewusst **nicht** in den
Abschluss-Block gelassen hat — er gehört strikt in den privaten Speicher.

**Reihenfolge nicht geraten.** Ob der `EXCERPT-BLOCK` vor oder nach der Freigabe
der Auftragsklärung eintrifft, ist nicht garantiert. Statt es zu erraten, deckt
der Code beide Fälle ab: Liegt die Kennung beim Schreiben des Eintrags vor, wird
sie mitgegeben; trifft sie danach ein, wird der jüngste Eintrag ergänzt.

**Fail-safe:** Ein Fehlschlag beim Ablegen kostet die spätere Teilbarkeit, nie
die Session — dieselbe Haltung wie bei der Chronik.

---

## S95.7b · Einstellung und Erst-Information

Schalter im Einstellungsblatt (**Aufbewahren** / **Jedes Mal fragen**),
Sammellöschen, Erst-Information am ersten Abschluss mit Ablage.

**Zeile statt Fläche (K2).** Die Information hängt unter der Ausschnitt-Tür —
eine eigene Fläche machte aus einer Mitteilung ein Ereignis.

**Auslöser statt Dauergeräusch.** `ausschnittAngebot` meldet jetzt zurück, ob
die Tür erschienen ist; die Verlaufs-Zeile hängt an derselben Bedingung. Wo es
nichts Teilbares gibt, wird weder gefragt noch aufbewahrt — das hält den Bestand
zusätzlich klein.

**Ton.** Keine Empfehlung, kein vorausgewähltes Ja bei der Frage, kein Hinweis
darauf, was andere tun. Ein Test prüft die Abwesenheit solcher Formulierungen.

**Erst-Information genau einmal**, im selben Moment, in dem es zum ersten Mal
geschieht — nicht rückwirkend, nicht wiederholt.

---

## S95.7c · Der Replay-Eingang

Eingang und Löschweg am Zeitleisten-Eintrag. Er öffnet **dasselbe** Panel wie am
Sessionende:

```js
starteAuswahl(paare, verlauf.eignung, null);   // engine = null
```

Der Freigabepfad läuft bis `quereGate(backend, …)` durch und überspringt nur die
Quittung ans Modell. Es gibt **keine** zweite Freigabestrecke — genau dafür war
die Bauvorschrift aus S96.1 gedacht.

**Nur wo etwas liegt.** Der Eingang erscheint ausschließlich an Einträgen mit
Verlauf — keine ausgegraute Tür, kein Hinweis auf Fehlendes (dieselbe Regel wie
bei `ausschnittAngebot`: keine Tür statt einer verschlossenen).

**Still wie das Regal.** Kein Zähler, kein Badge, keine Erinnerung. Ein Test
prüft, dass im Zeitleisten-Text keine Zählmarke auftaucht.

**Bei laufendem Gespräch:** Hinweis statt Panel — eine Freigabe gehört in den
Fluss, in dem sie entsteht.

---

## Was der Replay kann und was nicht

Dieselbe Oberfläche, derselbe Auswahl-Modus, dieselbe Vorschau, dieselbe
Freigabe ins Regal mit Karenz und Rücknahme. Der Empfänger sieht keinen
Unterschied. Vier Abweichungen:

1. **Keine Quittung des Begleiters** — es gibt keine Session, die antworten
   könnte. Die Freigabe geschieht still.
2. **Die Auswahlmenge ist eingefroren** — wählbar ist, was beim Abschluss
   wählbar war. Eine abgeschlossene Session ist inert.
3. **Anderer Einstieg** — Zeitleisten-Eintrag statt Ausschnitt-Tür.
4. **Nur wo aufbewahrt wurde** — wer „jedes Mal fragen" gewählt und nein gesagt
   oder den Verlauf gelöscht hat, hat nichts zu schneiden.

Der Richtwert-Hinweis fällt beim Replay erneut: Es ist eine neue Auswahl.

---

## Tests

25 neue Fälle in drei Dateien:

| Datei | Fälle | Schwerpunkt |
|---|---|---|
| `s95-7a-verlauf-ablage.spec.js` | 13 | eigener Schlüssel, eigene Identität, Fail-safe, Löschen lässt Zeitleiste unberührt |
| `s95-7b-verlauf-einstellung.spec.js` | 5 | Vorgabe, Umstellen, kein Empfehlungston, Sammellöschen ohne Nebenwirkung auf die Vorgabe |
| `s95-7c-replay-eingang.spec.js` | 7 | Eingang nur wo Verlauf, keine Zählmarke, laufendes Gespräch, toter Eingang, Löschen |

**Kein Bestandstest wurde angepasst.**

---

## Offen

**S95.7d** ist in a–c weitgehend aufgegangen: Einzellöschen (c) und
Sammellöschen (b) sind gebaut. Offen bleibt allein die Frage, ob das Löschen
eine eigene Rückfrage-Fläche statt `window.confirm` verdient — heute reicht die
Rückfrage, sie ist aber schmucklos.

**S95.6 · Evals** — nie gebaut, gehört nach diesem Sprint: Das Replay belastet
den Freigabepfad ohne Session neu.

**Designnotiz.** Die ältere Fassung rühmt sich, keinen neuen Rohdatenbestand zu
schaffen. Das gilt ab hier nicht mehr — für alle, die nichts umstellen, kehrt
sich das bisherige Verhältnis um (bisher: die Essenz bleibt, die Worte lösen
sich auf). Der Satz muss weg, sonst steht in den eigenen Unterlagen etwas
Unzutreffendes.

**Rechtstext vor Marktstart.** Ab hier gibt es aufbewahrte Gesprächsverläufe mit
Voreinstellung „ja". Das ist der Punkt, an dem der Merkposten „Rechtstext
Datenschutz" konkret wird — und der wichtigste Grund, die Erst-Information
ernst zu nehmen.
