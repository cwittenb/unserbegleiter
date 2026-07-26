# Sprintprotokoll · F4 (Token-Erfassung), R5 (Korpus-Nachladen), R4a/R4b (app.js-Modularisierung)

**Basis:** `origin/main` @ `0e46903` (patch-r0-r3-r6-r7-refaktoring)
**Ausgangslage:** 1377 Struktur- / 147 Worker- / 25 Engine- / 4 e2e-Tests grün
**Endstand:** **1407 Struktur- / 155 Worker- / 25 Engine- / 4 e2e-Tests grün**, `npm run build` grün
**Kern-Hash:** `c4bf8ef1…` → `66d937a3e9889c3f`

Fortsetzung des Refactoring-Tracks. R0, R1, R2, R3, R6a und R7 sind mit
`0e46903` bereits auf main. R4 ist mit **R4a** und den ersten beiden Gruppen von **R4b** begonnen.

---

# F4 · Token-Erfassung exakt

## Wie der Zuschnitt zustande kam

Der ursprünglich vorgeschlagene Rollen-Split war ein **Reparaturvorschlag für
die Nebenläufigkeit**, nicht die Anforderung. Die Anforderung ist:
Token-Verbrauch je Testpaar erheben, um Kostenmodell und Marge zu rechnen.
Dafür ist die Paar-Summe genau die richtige Granularität — wer von beiden
getippt hat, geht in keine Rechnung ein.

Der Rollen-Split hätte zudem ein dokumentiertes Prinzip berührt (Dateikopf
`tokenstat.js`: kein Rollen-Split, Datensparsamkeit, Grundprämissen). Der
gewählte Weg braucht ihn nicht — das Prinzip bleibt vollständig unberührt.

## Was falsch war

`erfasseUsage` addierte auf zwei gemeinsame Schlüssel: lesen — rechnen —
schreiben. KV kennt kein atomares Increment. Lesen zwei Aufrufe denselben Stand,
bevor der jeweils andere geschrieben hat, ergeben sie zusammen **einen**
gezählten Aufruf statt zwei.

Die gemeinsamen Räume laufen an einem Gerät — dort entsteht keine
Gleichzeitigkeit. Die **privaten Reflexionsräume** liegen aber je Partner auf
dessen eigenem Gerät; zwei Menschen, die am selben Abend jeder für sich
nachdenken, sind eher der erwartbare als der seltene Fall. Die Untererfassung
war damit systematisch einseitig — und dort am größten, wo am meisten passiert.

## Lösung: ein Satz je Aufruf

Neues Schlüsselformat:

```
sys/tokens/<code>/<YYYY-MM>/<zufall>
    { calls: 1, in, out, cacheRead, cacheWrite, aktualisiert }
```

Jeder Aufruf schreibt seinen eigenen Satz. Zwei gleichzeitige Aufrufe schreiben
verschiedene Schlüssel und können einander nicht überschreiben. Summiert wird
beim Lesen — neu `summiereStaende` in `core/llm/usage.js` (`aktualisiert` ist
der jüngste Zeitstempel, nicht die Summe).

Der Monat steht im Schlüssel, damit die Historie ohne Lesen aller Sätze
gefiltert werden kann; die Paar-Gesamtsumme ist die Summe über alle Monate.

**Das Prinzip bleibt unberührt:** weder Schlüssel noch Inhalt tragen
Rolleninformation. Der Dateikopf von `tokenstat.js` gilt unverändert; ein Test
prüft es ausdrücklich (Schlüssel enthält kein `/A/` oder `/B/`, der Satz hat
genau die sechs bekannten Felder).

**Keine Aufrufstelle ändert sich.** `erfasseUsage(kv, code, usage, now)` behält
seine Signatur; `leseTokenStand`, `leseTokenHistorie` und `leseTokenExport`
behalten Signatur und Rückgabeform.

## Beweis statt Behauptung

Neu: `tests/worker/f4-gleichzeitigkeit.spec.js` (8 Fälle) mit einem
KV-Doppelgänger, der die Lücke zwischen Lesen und Schreiben aufreißt (jedes
`get()` gibt der Ereignisschleife nach — genau dort ging der Zählschritt
verloren).

**Gegen den alten Stand: 5 von 8 rot.** Die verlorenen Zählschritte sind damit
belegt, nicht angenommen. Geprüft werden zusätzlich: 20 gleichzeitige
Erfassungen ohne Verlust, ein eigener Schlüssel je Aufruf, das Rollen-Prinzip,
die Formgleichheit aller drei Lesewege und ein beschädigter Satz, der die
Auswertung nicht kippt.

## Angepasste Bestandstests

Zwei Tests in `tokenstat.spec.js` griffen direkt auf das KV-Schlüsselformat zu
(`sys/tokens/<code>/total`) — also auf die Ablage, nicht auf den Vertrag. Sie
prüfen jetzt über `leseTokenStand` und zusätzlich, dass zwei Aufrufe zwei Sätze
ergeben. **Die vier Tests über die API waren durchweg grün** — der Vertrag hat
sich nicht geändert, nur seine Umsetzung.

## Merkposten

Die Schlüsselzahl wächst mit den Aufrufen; die Lesewege machen `list` + `get`
über alle Sätze eines Paars. Bei Testpaaren unkritisch. **Vor Marktstart** gehört
abgeschlossenen Monaten eine Verdichtung zu je einem Eimer — dann ist die
Nebenläufigkeit dort ohnehin vorbei.

---

# R5 · Korpus-Nachladen

Entscheidungen: **F1(a)** zweiter esbuild-Einstieg · **F2** Deutsch bleibt
statisch · **F3** bestehende Arbeits-Pille, kein neuer Text.

## Messung

| | vorher | nachher |
|---|---|---|
| deutsches Paar | 557 kB | **441 kB** (−116 kB, **−21 %**) |
| englisches Paar | 557 kB | 557 kB (zweiter Abruf) |

`public/app.js` 441 kB · `public/korpus.en.js` 116 kB.

## Der eigentliche Fallstrick

`setKorpusSprache` fiel bei unbekannter Sprache **lautlos** auf Deutsch zurück.
Statisch war das harmlos. Beim Nachladen wäre daraus ein Korrektheitsfehler
geworden: Ist Englisch beim Session-Start noch nicht registriert, bekommt ein
englischsprachiges Paar deutsche Prompts — ohne Fehler, ohne Anzeichen.

Deshalb `stelleKorpusBereit(locale)` als **Tor vor dem Session-Start**, an beiden
Stellen in `app.js` (neue Session und Resume). Dort ist der Fehlschlag **laut**.
Der synchrone Rückfall in `K()` bleibt weich, damit Bestandscode nie ins Leere
greift.

## Umsetzung

| Datei | Änderung |
|---|---|
| `core/prompts/prompts.js` | EN nicht mehr statisch importiert; `setKorpusLader`, `stelleKorpusBereit`, `istKorpusDa` ergänzt. Deutsch bleibt statisch (F2) |
| `platforms/cloudflare/pages/korpus-en-entry.js` | neu — eigener Bundle-Einstieg, legt das Modul auf `globalThis.__KORPUS_EN__` ab |
| `scripts/build-pages.js` | dritter esbuild-Schritt → `public/korpus.en.js` |
| `platforms/cloudflare/pages/client.js` | Lader per Script-Tag (IIFE kann nicht splitten, F1a); Fehlschlag ist laut |
| `platforms/cloudflare/pages/sw-routing.js` | `/korpus.*.js` ist **cache-zuerst**, aber bewusst **nicht** in `SHELL_PFADE` |
| `core/ui/app.js` | zwei Tore vor `setKorpusSprache` |
| `scripts/build-capacitor.js` | unverändert — kopiert `public/` bereits rekursiv |

Zum Service Worker: Läge der Korpus in `SHELL_PFADE`, zöge ihn jedes
deutschsprachige Paar beim Installieren mit — also genau das, was das Nachladen
vermeidet. Wer ihn einmal geholt hat, soll ihn aber offline behalten.

## Drei Hüllen, die beide Korpora behalten müssen

Beim Bauen fiel auf, dass das **Eval-Artefakt um 116 kB schrumpfte** — ihm fehlte
EN. Das Harness unterstützt EN-Szenarien (`evals/szenarien/start-katalog.en.js`,
`--sprache en`), die sonst **still auf Deutsch gelaufen wären** und damit
unbrauchbare Ergebnisse geliefert hätten, ohne dass es auffällt.

Versorgt sind jetzt:

- `platforms/artifact/main.js` — Einzeldatei-Zwang, beide Korpora bei
- `platforms/artifact/eval-main.js` — dito
- `evals/runner-kern.js` — Node-Pfad ohne Plattform, registriert EN beim Import

## Tests ohne Teständerung

Vierzehn Bestandstests brachen zunächst — sie laufen ohne Plattform, also ohne
Lader. Statt vierzehn Dateien anzufassen: ein zentrales
`tests/fixtures/korpus-setup.js` als `setupFiles` in `vitest.config.js`.

Die Testumgebung ist faktisch die **dritte Plattform**; sie darf direkt
importieren, weil Node ESM das kann und hier keine Bundle-Größe zählt. Wäre der
Lader je Spec zu setzen, wäre die erste vergessene Datei ein Test, der aus dem
falschen Grund grün ist.

**Keine einzige Testdatei wurde geändert.**

Neu: `tests/unit/r5-korpus-nachladen.spec.js` (10 Fälle) — Tor, Nicht-Doppelladen,
drei Arten des lauten Scheiterns (kein Lader / leeres Ergebnis / Abruf bricht),
Korpus-Zugriff nach dem Tor, SW-Routing.

---

# R4a · Reine Helfer aus app.js herausgelöst

Erster Teil der app.js-Modularisierung. Bewusst mit dem Ungefährlichsten
begonnen: Funktionen, die an **keinem** Zustand, keinem DOM und keiner Session
hängen. Sie waren nur zufällig in der `createApp`-Closure eingeschlossen — und
dadurch ausschließlich über eine laufende Session prüfbar.

## Verschoben

| Nach | Was |
|---|---|
| `core/ui/html.js` | `mdRender`, `IKON`, `lesezeichenLabels` |
| `core/ui/stream-anzeige.js` (neu) | `schneideStreamText` — der Rumpf des früheren `streamAnzeige` |
| `core/ui/zeit-texte.js` (neu) | `zeitraumText`, `rhythmusText` |

`streamAnzeige` war die einzige Funktion, die noch am Zustand hing (sie las
`state.engine.def.markerOrder`). Die Markerliste ist jetzt ein Parameter; in
`app.js` bleibt eine dreizeilige Bindung an die laufende Session.

`app.js`: **2692 → 2638 Zeilen.**

## Warum gerade `schneideStreamText`

Das ist die Logik, die verhindert, dass während des Streams `[[META-` oder
`[CLOSE SESS…` kurz aufblitzen, bevor sie vollständig sind — die Person sähe
sonst die Mechanik statt des Gesprächs. Sie ist subtil (angerissene Marker,
halbe Klammern, S93-Steuer-Token) und war bisher nur indirekt geprüft.

## Tests

Neu: `tests/unit/r4a-reine-helfer.spec.js` (20 Fälle). Direkt geprüft fällt auf,
wo die Kanten sind — etwa dass `mdRender` **zuerst** escapt (der Rohtext kommt
vom Modell) und dass Sternchen mitten im Wort keine Betonung sind.

**Kein Bestandstest wurde angepasst.** Das ist das Abnahmekriterium für R4: Eine
nötige Teständerung wäre das Warnsignal, dass sich Verhalten geändert hat.

## R4b · offen

Die Screen-Module (`chat-screen`, `regal-screen`, `mess-screen`,
`weitere-screens`) sind der schwierigere Teil — sie hängen tief in der Closure
(`state`, `$`, `el`, `renderMsgs`) und brauchen explizite Abhängigkeiten statt
Closure-Zugriff. Eigener Durchgang, gleiches Abnahmekriterium.

---

# R4b · Erste Screen-Gruppen mit expliziten Abhängigkeiten

Anders als R4a ist das kein reines Verschieben. Die Screens hingen über die
`createApp`-Closure an `doc`, `$`, `backend`, `state`, `err`, `relaunch` — jede
Extraktion ist deshalb eine **Schnittstellen-Entscheidung**: Was braucht diese
Gruppe wirklich, und was hat sie sich nur aus dem Sichtbarkeitsbereich genommen,
weil es da war?

Gewählt wurden die zwei Gruppen mit den dünnsten Kanten.

## `core/ui/recovery-screen.js` (139 Zeilen)

`baueVerifikation`, `zeigeRecovery`, `zeigeEmailPflicht`.

Geeignet als erste Gruppe, weil `baueVerifikation` **ausschließlich** innerhalb
der Gruppe gerufen wird und die anderen beiden je genau einmal von außen. Kein
Rückgriff auf Chat, Engine, Panels oder Wegweiser.

Abhängigkeiten: `doc`, `$`, `backend`, `state`, `wurzel`.

## `core/ui/einstellungen-screen.js` (150 Zeilen)

`aktualisierePunkt`, `waehleAnsicht`, `zeigeEinstellungen`,
`verdrahteEinstellungen`, `sprachName`, `zeigePaarsprache`.

Gehört zusammen, weil das Einstellungsblatt die Paarsprache anzeigt, der
Sprachantrag von dort gestellt wird und beide denselben Punkt am Zeichen
bespielen, der einen offenen Antrag des Partners meldet.

Abhängigkeiten: `doc`, `$`, `chrome`, `backend`, `state`, `err`, `relaunch`.

## Eine übersehene Abhängigkeit — und was sie zeigt

Beim ersten Anlauf fehlte `relaunch` (Neuaufbau nach Wechsel der
Oberflächensprache). Meine Abhängigkeitsprüfung war eine **Handliste** und
deshalb unvollständig; `s37-auftragsklaerung.spec.js` hat den Fehler gefangen.

Das ist genau die Rolle, die die Suite bei R4 spielen soll: Sie ist das Netz,
das die Vollständigkeit der Schnittstelle beweist — nicht die Sorgfalt beim
Lesen. Für die verbleibenden Gruppen wird deshalb systematisch nach freien
Bezeichnern gesucht statt per Stichprobe.

## Bilanz

`app.js`: **2692 → 2416 Zeilen** (−276, −10 %). Fünf neue Module.

**Kein Bestandstest wurde angepasst** — Abnahmekriterium eingehalten.

## Offen: die schweren Gruppen

Chat (`renderMsgs`, `zeigeStream`, `verdrahteChat`, Composer), Regal/Agenda,
Mess und die Panels hängen erheblich tiefer: gegenseitige Aufrufe, gemeinsamer
Zustand, `renderMsgs` als Rückkanal aus fast allem. Dort ist die
Schnittstellen-Entscheidung die eigentliche Arbeit, nicht das Verschieben —
eigener Durchgang, gleiches Abnahmekriterium.

---

## Prüfprotokoll

```
npx vitest run
  ✓ e2e                                   4 bestanden
  ✓ Ebene 1.5 · Engine mit Mock-LLM      25 bestanden
  ✓ Ebene 1 · Strukturtests            1407 bestanden
  ✓ Worker · Auth & KV (Miniflare)      155 bestanden

npm run build
  Kern 66d937a3e9889c3f — Artefakt (608,3 kB), Cloudflare-Build,
  Eval-Artefakt (379,3 kB) grün
```

Verifikation auf frischem Clone: Trockenlauf → anwenden → erneut anwenden
(Idempotenz) → Byte-Vergleich gegen den Arbeitsstand → Suite → Build.

---

## Offen

**R4b · die schweren Gruppen.** Chat, Regal/Agenda, Mess und die Panels.
Abnahmekriterium bleibt: volle Suite grün, **ohne dass ein Test angepasst
wurde**.

**Terminhinweis:** Während dieses Tracks ist `origin/main` zweimal
weitergezogen; der SHA-256-Ankercheck hat beide Male sauber abgebrochen, statt
zu überschreiben. Bei R4 ist das kritischer: Ein Ganzdatei-Patch auf 2610 Zeilen
ist bei einem zwischenzeitlichen Commit auf `app.js` nicht mehr auflösbar,
sondern bedeutet vollständiges Neuaufsetzen. R4 gehört deshalb in ein Fenster,
in dem `app.js` von deiner Seite ruht.

**R2.5 · `still()` in `ladeLage`.** Zwölf Backend-Lesungen werden einzeln mit
`catch(() => null)` abgefangen; ein vorübergehender Aussetzer wird dadurch zu
„nichts Neues" statt zu einem Fehler. Fällt sachlich mit R4 zusammen.
