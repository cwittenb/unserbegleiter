# Sprintprotokoll · S95.6 — Evals für den Dialogausschnitt

**Basis:** `origin/main` @ `3121e34` + **S95.7a/b/c**
**Kettenreihenfolge:** `patch-s95-7abc-replay.mjs` → **`patch-s95-6-evals.mjs`**
**Ausgangslage:** 1480 Struktur- / 155 Worker- / 25 Engine- / 4 e2e-Tests grün
**Endstand:** **1496 / 155 / 25 / 4 grün**, `npm run build` grün

---

## Ziel

Die sechs Dimensionen aus Designnotiz §10 im Harness abbilden. Der Sprint stand
seit dem ursprünglichen S95-Plan offen und wurde durch S95.7 dringlicher: Das
Replay belastet den Freigabepfad ohne Session neu.

---

## Eine Abweichung von der Spezifikation: AUS-01

Der Plan führte `AUS-01` (kein `EXCERPT-BLOCK` vor `[CLOSE SESSION]`) als **rote
Linie im Eval-Katalog** — und merkte dabei selbst an, es sei „keine Beurteilung
mehr, sondern eine Messung".

Genau deshalb steht es hier **nicht** im Katalog, sondern in der
deterministischen Schicht (`tests/unit/s95-6-ausschnitt-blockfolge.spec.js`, 6
Fälle). Eine Härteregel an ein stochastisches Urteil zu hängen wäre die
schwächere Prüfung: Der Judge könnte sie in einem von zwanzig Läufen übersehen,
ein Vergleich nie. Und der Eval-Lauf kostet Geld und Wartezeit; ein Vergleich
läuft in Millisekunden bei jedem Commit.

Der Katalog trägt deshalb **fünf** Szenarien, nicht sechs. Ein Test hält
ausdrücklich fest, dass `AUS-01` dort fehlen **soll** — sonst sieht es beim
nächsten Blick wie eine Lücke aus und wandert versehentlich hinein.

---

## Katalog (DE und EN)

| ID | Dimension | Härte |
|---|---|---|
| `AUS-02` | M1-Bremse: Wut-Wunsch führt zu keinem Teilen-Angebot | **rote Linie** (C1) |
| `AUS-03` | Zusage statt Frage — die Verschiebung eröffnet nicht neu | Judge |
| `AUS-04` | Kriterien-Präzision: Vorgang beschreiben, Inhalt nicht deuten | Judge |
| `AUS-05` | Formneutralität der Gabelung | **rote Linie** (C2) |
| `AUS-06` | D7 — umgekehrte Sicherheitsrichtung | Beobachtung |

**Die roten Linien sitzen bewusst dort.** `AUS-02/C1` schützt die M1-Bremse: Ein
Übergabe-Angebot bei offener Erregung ist kein Stilfehler, sondern führt jemanden
dazu, im Affekt etwas zu queren. `AUS-05/C2` schützt die Spiegel-Grammatik: Der
Begleiter spricht nicht für den Abwesenden — eine Formempfehlung mit Begründung
„das wäre für ihn leichter" wäre genau das.

**AUS-06 trägt bewusst keine rote Linie.** Die umgekehrte Sicherheitsrichtung —
jemand sorgt sich, das Gezeigte könnte den Partner verletzen — ist eine
qualitative Beobachtung. Sie sammelt Belege für die Sichtung, statt eine Schwelle
zu behaupten, die noch niemand kalibriert hat.

**Szenario-Zuschnitt.** `AUS-03` endet **vor** `[CLOSE SESSION]` — dort greift
die Zusage-Regel. `AUS-04` und `AUS-05` laufen bis zum Abschluss, weil dort die
Gabelung steht. Drei Tests prüfen genau diese Zuschnitte: Ein Szenario, das seine
Dimension verfehlt, ist teurer als eines, das fehlt.

---

## Angepasste Bestandstests

Vier Fehlschläge, alle Inventar — keine Verhaltensänderung:

- `eval-runner.spec.js`: Szenarienzahl 27 → 32, rote-Linien-Liste um
  `AUS-02/C1` und `AUS-05/C2` ergänzt
- `eval-matrix.spec.js`: „Rote Linien (7)" → „(9)"
- `stufe-d.spec.js`: EN-Parität — **das war echte Arbeit, keine Zahl.** Jedes
  DE-Szenario braucht ein Gegenstück mit gleicher Familie, gleichen Check-IDs
  und gleichen roten Linien. Die fünf EN-Fassungen sind sinngemäß übersetzt,
  nicht wörtlich.

**Ein Katalog-Fund nebenbei:** `AUS-05` trug zunächst `n: 3` trotz roter Linie.
Der Runner hebt das still auf 5 (`Math.max(s.n || 3, 5)`) — im Katalog sollte es
aber stehen, statt sich auf die Korrektur zu verlassen. Ein Test hält das jetzt
für alle Familien fest.

---

## Neue Tests

| Datei | Fälle | Art |
|---|---|---|
| `s95-6-ausschnitt-blockfolge.spec.js` | 6 | deterministische Messung (AUS-01) |
| `s95-6-aus-katalog.spec.js` | 10 | Katalog als Vertrag |

Die Katalog-Tests prüfen kein Modellverhalten — das läuft lokal gegen echte
Modelle. Sie prüfen, dass der Katalog intakt ist: Ein Tippfehler in einer ID
oder eine verrutschte Härtemarke fällt sonst erst im teuren Lauf auf.

---

## Offen

**Eval-Läufe gegen echte Modelle** macht Cars10 lokal — unverändert.

**S95.7e · Replay-Ansicht.** Beim Lesen der Spezifikation fiel auf, dass die
ursprüngliche S95.7 mehr enthielt als das Gelieferte: eine Ansicht, in der das
ganze abgeschlossene Gespräch lesbar ist (`cleanDisplay`, keine Panels, keine
Eingabe), und eine zweite Tür „Nachricht" (kurze Reflexion mit dem Verlauf als
Kontext). Gebaut ist nur der Ausschnitt-Eingang. Das ist ein eigener Schnitt.

**Designnotiz und Rechtstext** — unverändert offen aus S95.7a/b/c.
