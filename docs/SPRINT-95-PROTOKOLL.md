# Sprint S95 — Wächter-Welle im Batch-Pfad

**Basis:** `origin/main` @ `761e2b6` **+ S93 + S94**
**Kettenreihenfolge:** S93 → S94 → **S95**
**Testlauf:** volle Suite grün — 1323 bestanden (nach S94: 1312, +11)
**Build:** grün, Kern-Hash **unverändert** `efac5f7f8df0e483` — dieser Sprint fasst nur `evals/` an, und der Kern-Hash deckt `core/*.js`. Das ist die Probe darauf, dass die Änderung wirklich außerhalb des Kerns liegt.

---

## 1 · Ausgangslage

S94 hat die Wächter-Stufe in den synchronen Runner gebracht und `--waechter` im Batch **ausdrücklich ausgeschlossen** — laut, mit Abbruch, nicht still. Begründung damals: Der Batch stellt alle Anfragen vorab zusammen, eine Revisions-Runde wäre eine zweite Welle mit eigener Wartezeit.

Dieser Sprint baut diese zweite Welle. Der Ausschluss fällt.

---

## 2 · Umsetzung

### Phase 1b — die Wächter-Welle

Der Batch-Pfad fährt Phase 1 im **Turn-Lockstep**: für jede Turn-Tiefe *d* ein Batch über alle Konversationen. Die Wächter-Welle setzt sich dazwischen:

```
Turn 1 → Revision 1 → Turn 2 → Revision 2 → … → Judge
```

Sie läuft **vor** Turn *d+1*, weil der nächste Turn die revidierte Fassung im Kontext tragen muss — nie die verworfene. Sonst arbeitete das Modell auf einem Text weiter, den die Person nie zu sehen bekommen hätte.

Eigenschaften:

- Die Welle trägt **nur** die Konversationen, bei denen ein Wächter gegriffen hat (`ridx`), nicht alle.
- **Genau eine** Revision je Turn — die zweite Fassung wird angenommen, auch wenn sie erneut greifen würde. Wie Vertrag 2 in der Engine, wie der synchrone Pfad in S94.
- Die verworfene Fassung betritt `k.messages` **nie**: Der Assistant-Zug wird an Ort und Stelle ersetzt, das `waechterTreffer`-Merkmal kommt dazu.
- Wer bei der Erstantwort schon leer oder abgeschnitten ist, wird **nicht** revidiert — die S65/S77-Regel geht vor. Ein Halbsatz wird nicht korrigiert, er wird als Anomalie geführt.
- Die Revisions-Runde zahlt auf `k.pipe` ein: Sie ist ein Pipeline-Call und erscheint in Telemetrie und Kosten.

Wiederverwendet, nichts nachgebaut: `validatorFuer`, `waechterArt` (beide aus S94), `PIPE_CFG`, `LLM_PROVIDERS.anthropic.body/parse`, `fuehreBatch`, das `custom_id`-Schema (neues Präfix `r_`).

Die S94-Telemetrie greift **ohne Zutun**: `sampleAusUrteil` liest `waechterTreffer` aus dem Transkript, und das Transkript ist hier `k.messages`. Kein zweiter Zählweg.

### Scheiternde Revision → unbewertet

Bricht die Revisions-Welle für ein Sample weg (Batch-Fehler, Parse-Fehler), wird das Sample **unbewertet** — es zählt nie als bestanden. Die unrevidierte Antwort wird *nicht* stillschweigend angenommen.

Das ist dieselbe Überlegung, aus der in S94 der laute Ausschluss entstand: Ein Lauf, der für ein Sample die Korpus-Lesart meldet, während er die Wächter-Lesart behauptet, ist schlimmer als ein fehlendes Sample.

### `runner.js`

Der Abbruch fällt weg. An seine Stelle tritt ein einzeiliger Hinweis auf den Preis:

> *Hinweis: --waechter verdoppelt im Batch die Zahl der Wellen (je Turn-Tiefe eine Revisions-Welle).*

---

## 3 · Was das kostet

**Token:** wenig. Nur die ausgelösten Konversationen zahlen einen Extra-Call, im Batch zu −50 %.

**Wanduhr:** das eigentliche Thema. Die Batch-Durchlaufzeit hängt kaum an der Wellengröße — eine Welle mit 3 Anfragen dauert ungefähr so lange wie eine mit 81. Beim aktuellen Katalog (27 Szenarien, `maxTurns` 5, bei n=3 also 81 Konversationen) werden aus 5 Pipeline-Wellen + 1 Judge-Welle im Ungünstigfall **10 + 1**. Bei 81 Konversationen wird auf fast jeder Tiefe etwas auslösen — der Ungünstigfall ist der Regelfall.

Wo keine Konversation auslöst, entfällt die Welle ganz; das ist im Test festgehalten.

---

## 4 · Entscheidungen

| # | Frage | Entscheidung |
|---|---|---|
| A/B | Variante | **A** — Revisions-Unterwelle je Turn-Tiefe |
| — | Scheiternde Revision | unbewertet, nicht still unrevidiert annehmen |

### Zur nicht gewählten Variante B

Angeboten war auch: eine Welle pro Runde mit **gemischtem** Inhalt — Revision für Konversation X und Turn *d+1* für Konversation Y im selben Batch, jede Konversation in ihrem eigenen Takt. Das hielte die Wellenzahl bei etwa `maxTurns + 1` statt beim Doppelten.

Nicht gewählt, weil es genau den Lockstep umbaut, den elf Tests absichern — und weil der Batch-Modus für den halben Preis existiert, nicht für Tempo. **Bleibt als Merkposten**, falls die Laufzeit in der Praxis wirklich stört.

---

## 5 · Tests

`tests/unit/s95-waechter-im-batch.spec.js` (neu, 11 Fälle):

- ohne Flag entsteht keine Revisions-Welle
- mit Flag trägt die Welle **nur** die getroffenen Konversationen
- die Revisions-Anfrage trägt die verworfene Antwort **und** die SYSTEM-REVISION
- das Transkript zeigt nur die revidierte Fassung, mit Wächter-Spur; die verworfene taucht nirgends auf
- kein Treffer → gar keine Welle
- kein dritter Versuch
- **Turn 2 trägt die revidierte Fassung im Kontext, nie die verworfene** — der subtilste Fall
- Wellen-Reihenfolge `p · r · p · r · j`
- scheiternde Revision → unbewertet, nicht grün, mit Grund im Sample
- abgeschnittene Erstantwort löst keine Revision aus (S65/S77 geht vor)
- die Revisions-Runde erscheint in der Pipeline-Telemetrie

---

## 6 · Merkposten

- **Variante B** (verschränkte Wellen) — falls die verdoppelte Wanduhr stört.
- **K6 ist jetzt in beiden Modi messbar.** Das Lauf-Paar (ohne/mit `--waechter`) über SYC-05, MOM-01 und die GATE-Familie geht damit auch im Batch.
- **Stufe 2 des Urteils-Wächters ist auf Deutsch kalibriert** (S93/S94, unverändert). Mit 101 EN-Szenarien und aktiver Wächter-Stufe wird das messbar.
