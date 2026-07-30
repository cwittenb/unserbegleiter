# Sprint S99 · Reflexionsgespräch: Vorraum, Abschluss, Wortlaut-Abruf

Basis: frischer Clone `origin/main` @ `2d84dd5` („patch-u9-zeitsprache") · Kern-Hash nach Patch: `f9794f4cfb491c90`
Suite: **2042 grün** (Basis 1982 + 60) · Build grün

> **Zur Basis:** Der Sprint wurde zunächst gegen `91f7b5f` (U7) gebaut; während der
> Arbeit landeten U8 und U9 auf `main` und berührten dieselben Dateien
> (`app.js`, `sessions.js`, i18n, Prompts). Der Trockenlauf des Patches brach
> daraufhin korrekt mit Anker-Fehlschlägen ab — genau wozu die Anker da sind.
> Alles ist auf `2d84dd5` neu aufgesetzt, Suite und Build danach vollständig grün.

Sieben Meldungen aus einem echten Verlauf. Drei davon waren eigene kleine Mängel,
vier gingen auf **eine** Kette zurück, die an drei Stellen unterbrochen war.

---

## 1 · Der Befund zuerst: eine Zusage, die niemand einlöste

Der Prompt des Reflexionsgesprächs beschreibt seit S95.2/S95.8 zwei Fähigkeiten
ausführlich — den **Dialogausschnitt** und den **Wortlaut-Abruf**. Beide waren
im Register, beide hatten Schemata, beide hatten Haken in `app.js`. Und beide
funktionierten nicht. Die Kette:

```
Paar-Kennungen ──✗──→ Eignungsbericht ──→ Ausschnitt-Tür ──→ Verlaufs-Ablage
                                                                    │
                                                       {vid} am Eintrag
                                                                    │
                                                            Wortlaut-Abruf ──✗
```

**Bruch 1 — die Kennungen kamen nie an.** Der Prompt sagt wörtlich: *„`id` = die
Paar-Kennung, die dir die App im Verlauf mitgibt"*. Die App gab sie nirgends mit.
Die Kennungen entstehen als `P<i>-<j>` aus den **Nachrichten-Indizes** des Chats
(`core/engine/ausschnitt.js:79`) — versteckte Züge eingerechnet. Ein Modell kann
sie weder sehen noch nachzählen; es riet. Geratene Kennungen passen zu keinem
Paar, `paarWaehlbar` ist dann für **alle** Paare falsch, und `ausschnittAngebot`
gibt `false` zurück: keine Tür. Kein Fehler, keine Meldung — eine Tür, die es
einfach nicht gab.

**Bruch 2 — die Ablage hing an der Tür.** `legeVerlaufAb` lief ausschließlich im
`onAusschnitt`-Pfad und auch dort erst, wenn die Tür wirklich aufging. Ohne
Ablage keine Kennung am Zeitleisten-Eintrag; ohne Kennung ist der Abruf in der
Folgesitzung konstruktionsbedingt unmöglich.

**Bruch 3 — der Abruf-Block war nirgends geführt.** `BLOECKE.abruf`
(`RECALL-BLOCK`) stand im Register, `abrufBlockSchema` war getestet, der Haken
`onAbruf` hing in `app.js` — aber `soloDef().blocks` führte ihn nicht. Die Engine
dispatcht aus `def.blocks`; was dort fehlt, existiert für sie nicht.

**U8.6 hat auf diesen toten Pfad kurz zuvor einen Weg gelegt.** Der Link „Teilen"
in der Leseansicht übergibt eine Kennung an eine neue Sitzung, und der
Anlass-Kontext sagt dem Begleiter ausdrücklich, er möge „den Wortlaut bei Bedarf
per RECALL-BLOCK" holen. Der Block wurde weiterhin von niemandem entgegengenommen.
Der neue Weg konnte also gar nicht ankommen — er war der direkteste Weg in genau
den Verlauf, der gemeldet wurde.

Dass es niemandem auffiel, liegt an einer Asymmetrie: `cleanDisplay` läuft über
`ALLE_BLOECKE`, nicht über die Blöcke der Session. Der Block verschwand also
sauber aus der Anzeige. Der Begleiter sagte „ich hole mir das Gespräch dazu", die
App antwortete nie, und beide warteten aufeinander — sichtbar wurde nur ein
Begleiter, der sich in Ausflüchte verwickelte.

Der Test aus S95.8b prüfte den Block *an sich* (Register, Schema, Kontextzeile).
Nicht geprüft war, dass eine Session ihn führt. Genau diese Prüfung steht jetzt
als erste in `s99-5-abruf-verdrahtet.spec.js`.

---

## 2 · Was sich geändert hat

### S99.1 · „Reflexionsgespräch fortsetzen"

`ladeLage()` lädt jetzt auch `mine/solo` und meldet `soloOffen`; `#soloLabel`
wechselt wie `einzelLabel` (S53), `momentLabel` und `gemeinsamLabel` (S63). Das
Reflexionsgespräch war die letzte Zeile im Haus, die auch mitten in einer
offenen Sitzung einen Neuanfang versprach, den der Klick nicht einlöst.

Abgeschlossene Solo-Sessions werden beim Betreten ohnehin verworfen — „running
mit Zügen" ist deshalb der eindeutige Fortsetzen-Zustand, ohne Sonderfall.

### S99.2 · Rückfrage vor dem Abschluss (K1: inline)

Der Abschluss ist der einzige unumkehrbare Griff im Gespräch: Composer weg,
Status `finished`, kein Wiederöffnen. Dafür genügte ein einzelner Klick.

Die Frage steht als Zeile **an der Stelle** des Knopfes — nie beide zugleich.
Kein schwebender Behälter (U7 §1.1 hat den letzten entfernt) und kein
`confirm()`, das unter Capacitor als Systemdialog aus der Kulisse fiele. Vorgabe
ist Nein; wer nichts tut, schließt nichts ab. Dieselbe Grammatik wie die
Verlaufs-Frage aus S95.7b.

Die Frage benennt die Folge („Danach lässt sich hier nichts mehr schreiben"),
statt nur „sicher?" zu fragen — eine Rückfrage ohne Grund ist Bürokratie.

### S99.3 · Zwei Schritte am Abschluss

Im gemeldeten Verlauf standen die Gabelung mit den drei Türen **und** der
TIMELINE-BLOCK in einer Nachricht. Der Block beendet die Sitzung sofort; die drei
Türen wurden genannt und im selben Atemzug verschlossen.

*Erste Verteidigung:* die Zwei-Schritt-Regel im Prompt (de+en) — wortgleich zu
der, die die Qualitätszeit seit S98 kennt und die dem Reflexionsgespräch nie
gegeben wurde.

*Zweite Verteidigung:* `core/engine/abschluss-waechter.js`, verkettet mit dem
Urteils-Wächter in `soloDef.validiereAntwort`. Genau eine SYSTEM-REVISION
(Vertrag 2), danach wird angenommen.

Zwei Engführungen halten ihn dort, wo er zuständig ist:

| | |
| --- | --- |
| **nur mit Block** | Ohne TIMELINE-BLOCK endet nichts — dann darf gefragt werden. |
| **nur nach `[CLOSE SESSION]`** | Der zweite Anlass des Blocks ist `[CHECKPOINT]`: Dort verlangt der Prompt ausdrücklich erst den Block, dann das Wiederanknüpfen („wir waren bei … — magst du da weitermachen?"). Ohne diese Prüfung hätte der Wächter jede Wiederaufnahme revidiert. |

Ein Assistant-**Echo** des Steuertexts macht den Wächter nicht scharf (das Modell
spiegelte ihn früher zurück, S93/A1) — nur die App löst den Abschluss aus.

Fragezeichen **im** Blockkörper zählen nicht: Eine Frage in `summary` ist Chronik.
Schlimmster Fehlalarm bleibt ein rhetorisches Fragezeichen im Landungssatz und
kostet eine Revisionsrunde — dieselbe dokumentierte Toleranz wie beim Aufdeck-
und Urteils-Wächter.

### S99.4 · Keine Speicher-Behauptung (K2: ersatzlos)

„Dein Zeitleisten-Eintrag wurde gespeichert." ist jetzt im Prompt verboten (de+en),
mit dem Gegenbeispiel im Regeltext. Zwei Gründe stehen dabei: Die Begleitung redet
über Mechanik statt über den Abschied — und in der Gabelungs-Nachricht behauptet
der Satz obendrein etwas über eine Sitzung, deren Ausgang noch offen ist.

Nichts tritt an seine Stelle. Die Zeitleiste liegt im Vorraum und zeigt sich
selbst; eine eigene Mitteilungszeile hätte aus dem Normalfall ein Ereignis
gemacht (dieselbe Erwägung wie S95.7b, „Zeile statt Fläche"). Ein Test hält fest,
dass die Oberfläche keinen solchen Text kennt.

### S99.5 · RECALL-BLOCK verdrahtet

`soloDef().blocks` führt den Abruf-Block, an **erster** Stelle: Die Engine nimmt
je Nachricht genau einen Block (`findeBlock` bricht beim ersten Treffer ab), und
ein Abruf wiegt schwerer als ein Abschluss, der in derselben Nachricht ohnehin
nicht stehen dürfte.

### S99.6 · Aufbewahren am Sitzungsende

Die Ablage hängt nicht mehr am Eignungsbericht, sondern am Abschluss — er kommt
immer, und der Eintrag, zu dem die Kennung gehört, ist gerade entstanden. Der
Haken `onZeitleiste` wird dafür **abgewartet** und bekommt die Engine mit.

**Ein Fund beim Umbau, über den Plan hinaus:** `hefteVerlaufAn` hängte die
Kennung an den jüngsten Zeitleisten-Eintrag **überhaupt**. Kam der
Eignungsbericht vor dem Abschluss-Eintrag — der Normalfall —, landete der frische
Verlauf am Eintrag der **vorigen** Sitzung. Ein Abruf hätte dann das falsche
Gespräch geholt; genau davor warnt der Kommentar am Abruf-Haken selbst („bei
‚gestern' gegen ‚letzte Woche' ist eine Verwechslung teuer"). Behoben über eine
Zeitmarke beim Betreten (`state.sessionAb`): Ein Eintrag, der älter ist als die
laufende Sitzung, bekommt keine Kennung mehr.

**K3 — Einstellung „jedes Mal fragen":** Es wird auch am Sitzungsende gefragt,
in einer Zeile an der Stelle des Composers (`#verlaufAusgang`). Sonst hätte die
Einstellung eine stille Nebenwirkung, die niemand gewählt hat: ohne Ausschnitt-Tür
weder Frage noch Ablage. Vorgabe bleibt Nein.

Aufbewahren bleibt Best-Effort: Ein Speicherfehler kostet die spätere
Teilbarkeit, nie den Abschluss.

### S99.7 · Paar-Kennungen an das Modell (F1: mitgenommen)

Neuer Wire-Kopf `PAIRS` (`core/contracts/steuertoken.js`). Die Kennungsliste
reist **huckepack im Abschluss-Zug**: eine Panel-Antwort ist genau eine
User-Nachricht (Vertrag 1), eine zweite wäre eine zweite Modellrunde. Je Zeile
Kennung und Frage — die Antwort steht dem Modell im Verlauf ohnehin zur Verfügung.

Ohne Paare reist nichts mit: Eine leere Liste wäre eine Einladung ins Leere.

Der Prompt (de+en) nennt jetzt die Quelle und verbietet Erfinden und Nachzählen
ausdrücklich.

---

## 3 · Entscheidungen

| | Frage | Entschieden |
| --- | --- | --- |
| K1 | Form der Abschluss-Rückfrage | **inline**, Zeile an der Stelle des Knopfes |
| K2 | Ersatz für die Speicher-Behauptung | **ersatzlos** streichen |
| K3 | Verlaufs-Frage bei „fragen" | **dieselbe Zeile** am Ausgang |
| F1 | S99.7 in diesem Sprint | **mitgenommen** |
| F2 | Mehrere Blöcke je Nachricht | **Backlog** (siehe §5) |

Klein und selbst entschieden, hier zur Nachvollziehbarkeit:

- **Jedes** Fragezeichen zählt für den Abschluss-Wächter. Ein Landungssatz
  braucht keins; die Kosten eines Fehlalarms sind eine Revisionsrunde.
- Die Zeitmarke `state.sessionAb` (S99.6) war nicht geplant, behebt aber eine
  Fehlzuordnung, die den Zweck des Sprints unterlaufen hätte.
- Der Abruf-Block steht an erster Stelle in `blocks`, nicht irgendwo.

---

## 4 · Angepasste Bestandstests

Fünf Tests klickten den Abschluss-Knopf direkt und brauchen jetzt das Ja — die in
K1 benannte Folge:

- `s42-qualitaetszeit.spec.js` (1) · `s80-agenda-workflow.spec.js` (2) · `s93-abschluss-und-freigabe.spec.js` (2)

In `s80` zusätzlich `toBe("[CLOSE SESSION]")` → `toContain(…)`: Der Abschluss-Zug
trägt seit S99.7 die Kennungen mit. Der Steuertext steht weiterhin darin, und
weiterhin genau einmal.

---

## 5 · Merkposten

- **F2 · Mehrere Blöcke je Nachricht.** `findeBlock` bricht beim ersten Treffer
  ab. Stehen EXCERPT- und TIMELINE-BLOCK in derselben Nachricht, verfällt einer
  still. Mit S99.3 kollidieren sie in der Praxis nicht mehr — die Enge bleibt
  aber im Vertrag stehen und ist eines Tages fällig.
- **Ausschnitt aus einem *abgerufenen* Gespräch.** Der Prompt verspricht ihn
  („Für einen Ausschnitt prüfst du die Eignung seiner Paare wie bei einer eigenen
  Sitzung"); die Oberfläche baut die Auswahl aber aus `engine.chat.messages`
  (`auswahl-screen.js:43`), also aus dem **laufenden** Gespräch. Genau dieser Weg
  wurde im gemeldeten Verlauf versucht. Nach S99.5–S99.7 scheitert er nicht mehr
  stumm — er trägt aber noch nicht. Eigener Entwurf, Designnotiz vor Code:
  Kennungen des abgerufenen Verlaufs, Quelle der Auswahl, Ablage-Bezug.
- **Wächter „Abruf angekündigt, kein Block".** Erst sinnvoll, wenn Läufe mit
  verdrahtetem Pfad zeigen, ob das Modell den Block zuverlässig setzt.
- **Eval-Szenarien** für Abruf und Abschlussgrammatik (RCL-/AUS-Familie)
  nachziehen.
