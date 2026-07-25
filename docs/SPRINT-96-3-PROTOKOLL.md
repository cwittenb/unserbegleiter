# Sprint S96.3 — Regal-Seite: Dialogdarstellung und Rücknahme

**Basis:** `origin/main` @ `c1183fa` (S96.1) + **S96.2**
**Kettenreihenfolge:** `patch-s96-2-auswahl-oberflaeche.mjs` → **`patch-s96-3-…`**
**Designgrundlage:** Designnotiz D2/D4/D5, Sprintplan Schnitt 5d

---

## Ziel

Der Empfänger liest den Ausschnitt als Dialog, und der Absender kann ihn während
der Karenz zurückziehen. Erster Aufruf für `nimmFreigabeZurueckAb`.

## Geändert

| Datei | Art |
|---|---|
| `core/ui/app.js` | `regalKoerper`, Rücknahme-Knopf, Handler |
| `core/i18n/de.js`, `core/i18n/en.js` | 2 Strings je Sprache |
| `tests/unit/s96-regal-ausschnitt.spec.js` | neu (10 Tests, happy-dom) |

## Entscheidungen

**E1 · Zwei Artefakt-Formen, zwei Darstellungen.** Ein Ausschnitt ist eine
**Szene**, keine Aussage. Als Fließtext gelesen verlöre er genau das, was ihn
wertvoll macht: dass man dem Denken beim Arbeiten zusieht. Die Selbstmitteilung
bleibt unverändert Fließtext — `regalKoerper` verzweigt an `kind`.

**E2 · Die Auslassungen reisen mit.** Was der Absender in der Vorschau gesehen
hat, sieht der Empfänger genauso: „…" zwischen den Paaren. Ohne das wäre D2 eine
Absender-Zusicherung ohne Wirkung.

**E3 · Der Rahmensatz steht außen.** Zwischen den Zügen gelesen wäre er ein
weiterer Zug und damit Teil der Szene — außen ist er, was er sein soll: ein
Kommentar der Person zu ihrem eigenen Material. Ein Test prüft die Reihenfolge
(Rahmung zuerst, dann Rahmensatz, dann die Paare).

**E4 · „Noch zurückziehbar" ist ein Zustand, kein Countdown.** Ein tickender
Timer erzeugt genau die Anspannung, gegen die die Karenz gedacht ist. Der Test
prüft ausdrücklich die **Abwesenheit** jeder Zeitangabe.

**E5 · Der Knopf trägt die Freigabe-Kennung, nicht die Item-Kennung.** Rücknahme
räumt beide Fächer (Regal und Agenda) — zurückziehen heißt „das doch nicht",
nicht „davon die Hälfte". Ein Test nagelt fest, dass im DOM `FG…` steht und
nicht `RG…`; das ist die Stelle, an der ein späterer Umbau still auf ein Fach
zusammenschrumpfen könnte.

**E6 · Nach Ablauf verschwindet der Knopf.** Endgültig ist endgültig — etwas
möglicherweise schon Gelesenes zu entfernen wäre schlimmer, als es
stehenzulassen.

## Tests

10 Tests: Dialogdarstellung statt Fließtext · Rahmung als Denkarbeit ·
Rahmensatz außen und in der richtigen Reihenfolge · Auslassung beim Empfänger ·
kein Rahmensatz → keine Zeile · Selbstmitteilung bleibt Fließtext · ruhiger
Zustand ohne Countdown · Knopf verschwindet nach Ablauf · Knopf trägt die
Freigabe-Kennung · Empfänger bekommt keinen Rücknahme-Knopf.

## Verifikation

- `npx vitest run` — 1464 Tests in 165 Dateien grün
- `npm run build` — grün, Kern-Hash `b7d4b47efc77ee71`

## Offen

Damit ist die Freigabestrecke des Ausschnitts vollständig: auswählen, ansehen,
freigeben, zurückziehen, lesen. Offen bleiben die Evals (`AUS-01`…`AUS-06`) und
das Zeitleisten-Replay.
