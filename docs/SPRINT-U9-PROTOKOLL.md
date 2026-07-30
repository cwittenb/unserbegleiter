# Sprintprotokoll · U9 — Eine Zeitsprache in den Rückblicken

**Basis:** `origin/main` @ `b35ac13` (`patch-u8-zeitleiste-leseansicht`, inzwischen gemerged)
**Kette:** keine — U8 liegt in `main`, U9 setzt direkt auf.
**Patch:** `patch-u9-zeitsprache.mjs`
**Endstand:** **1798 / 155 / 25 / 4 grün** (209 Dateien), `npm run build` grün
**Kern-Hash:** `bcfaf92fefae68b4`

---

## 0 · Korrektur am eigenen Merkposten

Der U8-Merkposten lautete: *„`relativZeit` wird bisher nur in der Zeitleiste benutzt. ‚Gemeinsame Momente' und das Regal tragen weiter absolute Daten."*

Die zweite Hälfte war **falsch**. Sie stammte aus dem Sprintplan, nicht aus dem Code. Eine Bestandsaufnahme aller nutzersichtbaren Datumsstellen ergibt:

| Ort | Ist | Entscheidung |
|---|---|---|
| Chronik (`zeigeZeitleiste`) | relativ seit U8 | — |
| **Gemeinsame Momente** (`zeigeMomente`) | `2026-07-23 · Qualitätszeit · …` | **angeglichen** |
| **Regal** (`zeigeRegal`, `regalKoerper`) | **gar kein Datum** | nichts zu tun |
| Kopf der Leseansicht | `Gespräch vom 23.07.2026` | bleibt absolut |
| `mess.gesperrt` („wieder ab …") | Kalendertag, **Zukunft** | bleibt, s. §3 |
| Modell-Kontext (`sessions.js`, `prozess.js`) | ISO-Daten | bleibt absolut |

Das Regal zeigt kein Datum an — dort eins einzuführen wäre ein Feature, kein Angleich, und das Regal ist bewusst still gehalten. Der reale Umfang dieses Sprints ist damit **eine Renderstelle**.

---

## 1 · Was geändert wurde

### Die Meta-Zeile der Gemeinsamen Momente

Vorher: `2026-07-23 · Qualitätszeit · Wochenenden`
Nachher: `vor 6 Tagen · Qualitätszeit · Wochenenden`

Begründung: Chronik und Gemeinsame Momente sind beides Rückblicke, und sie liegen zwei Klicks auseinander. Wer sie nebeneinander liest, sollte nicht zwei Rechenarten im Kopf halten müssen.

**Nebenbei ein alter Schönheitsfehler:** Die Zeile wurde bisher zusammengeklebt (`{datum} · {art}{themen}`). Bei einem Eintrag ohne `at` — im Code ausdrücklich möglich, `at: e2.at || ""` — begann sie mit einem führenden `· `. Sie wird jetzt aus Teilen gefügt und leere weggefiltert. Ein Test hält das fest.

### Der bestehende Test S42 wurde nachgezogen — und zeitfest gemacht

`s42-qualitaetszeit.spec.js` prüfte auf die Literale `2026-07-08` und `2026-07-10`. Beim Nachziehen fiel auf, dass diese Daten **im Juli 2026 lagen** — der Test hätte auch ohne U9 irgendwann unbrauchbare Aussagen gemacht, weil er reale Kalendertage gegen einen mitlaufenden „heute"-Begriff stellt.

Er rechnet jetzt relativ zu `Date.now()` und prüft gegen `relativZeit(…)` statt gegen Literale. Die chronologische Reihenfolge wird weiter geprüft; zusätzlich, dass **kein** Kalendertag mehr in der Ansicht steht.

---

## 2 · Was die Weite ausdrücklich NICHT bekommt

Zwei Wächter im neuen Spec halten die Grenzen fest, damit ein späterer „einheitlich ist besser"-Reflex nicht darüber hinweggeht:

**Der Modell-Kontext behält ISO-Daten.** `baueSoloKontext`, `baueMomentKontext`, `baueAnlassKontext` und `formatiereVerlauf` rendern weiter `2026-07-23`. S95.8b nennt den Grund: Der Begleiter löst Zeitbezüge nicht selbst auf, *„bei ‚gestern' gegen ‚letzte Woche' ist eine Verwechslung teuer."* Dazu kommt ein zweites Argument: Eine relative Angabe im Kontext wäre in dem Moment falsch, in dem sie gespeichert wird.

**Der Kopf der Leseansicht behält den Kalendertag.** Dort wird ein einzelnes Gespräch identifiziert, nicht eine Liste überflogen. „Gespräch vom 23.07.2026" ist das, was man jemandem nennt; „Gespräch von vor drei Wochen" ist es nicht.

---

## 3 · Offen gelassen, bewusst

**`mess.gesperrt` bleibt beim Kalendertag.** Der Text nennt, ab wann die nächste Prozessreflexion möglich ist — eine **Zukunftsangabe**. `relativZeit` deckt nur die Vergangenheit ab; eine Zukunftsleiter („in 3 Tagen", „nächste Woche") wäre neue Copy in beiden Sprachen und eine eigene Entscheidung über Rundung und Grenzen. Falls gewünscht, ist das ein sauberer eigener Light-Lane-Schritt.

**Präzisionsverlust bei alten Einträgen.** „vor 11 Monaten" sagt weniger als ein Datum. Für die Chronik war das in U8 die bewusste Wahl, und die Gemeinsamen Momente folgen ihr jetzt. Sollte sich zeigen, dass Paare in ihrem gemeinsamen Log tatsächlich nach *Daten* suchen („wann war unsere erste Qualitätszeit"), wäre ein Titel-Attribut oder eine zweite Zeile der nächste Schritt — nicht ein Rückbau.

---

## 4 · Tests

| Datei | Tests | Art |
|---|---|---|
| `u9-zeitsprache.spec.js` | 8 | neu |
| `s42-qualitaetszeit.spec.js` | 6 | eine Prüfung nachgezogen und zeitfest gemacht |

---

## 5 · Geänderte Dateien

`core/ui/ansichten-screen.js` · `tests/unit/s42-qualitaetszeit.spec.js` · `tests/unit/u9-zeitsprache.spec.js` (neu) · `docs/SPRINT-U9-PROTOKOLL.md` (neu)
