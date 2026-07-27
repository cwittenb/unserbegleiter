# Sprintprotokoll · S95.6 (Evals) und S95.7e (Leseansicht)

**Basis:** `origin/main` @ `36d84c8` (patch-s95-7abc-replay)
**Ausgangslage:** 1480 Struktur- / 155 Worker- / 25 Engine- / 4 e2e-Tests grün
**Endstand:** **1509 / 155 / 25 / 4 grün**, `npm run build` grün
**Kern-Hash:** `19367f4a…` → `aff9f2c8c6d88ece`

---

# S95.6 · Evals für den Dialogausschnitt

## Eine Abweichung von der Spezifikation: AUS-01

Der Plan führte `AUS-01` (kein `EXCERPT-BLOCK` vor `[CLOSE SESSION]`) als rote
Linie im Eval-Katalog — und merkte im selben Absatz an, es sei „keine
Beurteilung mehr, sondern eine Messung".

Genau deshalb steht es hier **nicht** im Katalog, sondern in der
deterministischen Schicht (`s95-6-ausschnitt-blockfolge.spec.js`, 6 Fälle). Eine
Härteregel an ein stochastisches Urteil zu hängen wäre die schwächere Prüfung:
Der Judge könnte sie in einem von zwanzig Läufen übersehen, ein Vergleich nie.
Und der Eval-Lauf kostet Geld und Wartezeit; ein Vergleich läuft bei jedem
Commit.

Ein Test hält ausdrücklich fest, dass `AUS-01` im Katalog fehlen **soll** —
sonst sieht es beim nächsten Blick wie eine Lücke aus und wandert versehentlich
hinein.

## Katalog (DE und EN)

| ID | Dimension | Härte |
|---|---|---|
| `AUS-02` | M1-Bremse: Wut-Wunsch führt zu keinem Teilen-Angebot | **rote Linie** (C1) |
| `AUS-03` | Zusage statt Frage | Judge |
| `AUS-04` | Kriterien-Präzision: Vorgang beschreiben, Inhalt nicht deuten | Judge |
| `AUS-05` | Formneutralität der Gabelung | **rote Linie** (C2) |
| `AUS-06` | D7 — umgekehrte Sicherheitsrichtung | Beobachtung |

`AUS-02/C1` schützt die M1-Bremse: Ein Übergabe-Angebot bei offener Erregung ist
kein Stilfehler, sondern führt jemanden dazu, im Affekt etwas zu queren.
`AUS-05/C2` schützt die Spiegel-Grammatik: Der Begleiter spricht nicht für den
Abwesenden.

`AUS-06` trägt bewusst **keine** rote Linie — die umgekehrte Sicherheitsrichtung
ist eine qualitative Beobachtung. Eine Schwelle zu behaupten, die niemand
kalibriert hat, wäre Scheingenauigkeit.

## Angepasste Bestandstests

Vier Fehlschläge, drei davon Inventar (Szenarienzahl 27 → 32, rote-Linien-Liste,
Matrix-Zählung 7 → 9). Der vierte war echte Arbeit: **EN-Parität** — jedes
DE-Szenario braucht ein Gegenstück mit gleicher Familie, gleichen Check-IDs und
gleichen roten Linien.

**Katalog-Fund:** `AUS-05` trug zunächst `n: 3` trotz roter Linie. Der Runner
hebt das still auf 5 (`Math.max(s.n || 3, 5)`) — im Katalog sollte es stehen,
statt sich auf die Korrektur zu verlassen. Ein Test hält das jetzt für alle
Familien fest.

---

# S95.7e · Das abgeschlossene Gespräch nochmal lesen

Der Ausschnitt-Eingang (S95.7c) öffnete die Auswahl. Was fehlte, war das
Naheliegendere: das Gespräch selbst noch einmal ansehen.

## `core/ui/replay-ansicht.js` (73 Zeilen)

**Bewusst nicht wiederverwendet: `renderMsgs`.** Es zöge Auswahlfläche,
Aufdeck-Tafeln mit Weiter-Knopf, Stream-Blase, Skalen, Composer und
Scroll-Nachführung mit. Nichts davon gehört zu einem abgeschlossenen Gespräch,
und jedes davon hätte einen Sonderfall gebraucht. **Eine inerte Session braucht
eine inerte Ansicht.**

**Übernommen wird die Darstellungsregel:** dieselbe Maskierung, dieselbe
Marker-Bereinigung, dieselben Sprecherlabel beim Rollenwechsel. Wer den Verlauf
später liest, soll ihn wiedererkennen.

**Was wegfällt:** Aufdeck-Tafeln (sie trügen einen Weiter-Knopf in einen Ablauf,
den es nicht mehr gibt), Eingabe, Composer, Stream-Blase. Ein Test prüft, dass
in der Ansicht **kein einziger Knopf** steht.

**Was bleibt:** Panel-Echos — sie waren damals zu sehen und gehören zum Bild.

## Eingang

Der Zeitleisten-Eintrag trägt jetzt zwei Links: **Lesen** vor **Teilen**. Das
Naheliegendere zuerst. Anders als der Teilen-Eingang braucht Lesen keine
Rücksicht auf ein laufendes Gespräch — Lesen ändert nichts.

## Zwei falsche Tests von mir

Der erste Testentwurf behauptete, `HANDOVER-BLOCK` sei eine Wire-Nachricht. Ist
es nicht: `WIRE_KOEPFE` enthält nur Protokoll-Ergebnisköpfe
(`SLIDERS-RESULT`, `RANKING-RESULT`, …). Der zweite Entwurf behauptete, der
Block werde durch `cleanDisplay` aus einer Nutzernachricht entfernt — auch
falsch: Übergabe-Nachrichten tragen `hidden`.

Beide Male hat der Test etwas Unwahres über das System behauptet, und beide Male
war die richtige Antwort, den Test zu entfernen statt die Zusicherung
abzuschwächen. Die tatsächliche Regel steht jetzt als Kommentar an der Stelle,
wo sie geprüft wird: Zwei verschiedene Wege (Wire-Kopf und `hidden`) müssen
beide greifen, sonst stünde im Lesetext, was im Chat nie zu sehen war.

---

## Neue Tests

| Datei | Fälle |
|---|---|
| `s95-6-ausschnitt-blockfolge.spec.js` | 6 |
| `s95-6-aus-katalog.spec.js` | 10 |
| `s95-7e-leseansicht.spec.js` | 13 |

---

## Offen

**Die zweite Tür „Nachricht"** aus der ursprünglichen S95.7-Spezifikation: eine
kurze Reflexion mit dem Verlauf als Kontext starten. Das startet eine Session
und ist ein eigener Schnitt — nicht wie das Lesen ein reiner Anzeigeweg.

**Eval-Läufe gegen echte Modelle** macht Cars10 lokal.

**Vor einem Deploy fällig:** Die Designnotiz behauptet, es entstehe kein neuer
Rohdatenbestand — das gilt seit S95.7a nicht mehr. Und der Merkposten
„Rechtstext Datenschutz" ist konkret geworden: aufbewahrte Gesprächsverläufe mit
Voreinstellung „ja".
