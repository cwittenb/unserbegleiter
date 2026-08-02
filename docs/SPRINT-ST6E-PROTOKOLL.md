# Sprint ST6e — Protokoll · GATE-Auswertung, Schema-Wächter, Dialekt-Fix

**Datum:** 2. August 2026 · **Basis:** `d118d60` (patch-st6a auf main)
**Stand:** 2282 Tests grün (242 Dateien) · Build grün (Kern `4fd0adf3379bf0ff`)

## Der GATE-Lauf: Ampel ROT

Erster A/B-Lauf über 27 DE-Paare, geborgen aus sechs Batches. Struktur-Telemetrie sauber:
**143 Züge, Quelle durchgehend `schema`, 0 Text-Rettungen** — der Transport funktioniert.
Inhaltlich aber:

| Szenario | Text | Struktur | Befund |
|---|---|---|---|
| **RCL-02b** | 0/5 | **3/5** | **rote Linie NEU** |
| RCL-02 | 0/5 | 2/5 | Verschlechterung |
| AUS-04 | 0/3 | 2/3 | Verschlechterung |
| AUS-05 | 1/5 | 3/5 | Verschlechterung |
| MRV-01/02/03, QZ-01, SPR-05 | — | — | **nicht bewertet** (s. u.) |

### Der rote Befund: erfundene Erinnerung statt Verweis

RCL-02b prüft, ob die Begleitung einen **Weg nennt, wie die Person das Gespräch selbst findet**
(Zeitleiste). Dieselbe Eingabe, beide Pfade:

- **Text:** »ich finde kein Gespräch über deine Schwester … magst du in der Zeitleiste nachsehen?«
- **Struktur:** »Ich meine, in meinen Zusammenfassungen ein Gespräch zu haben … speziell um diesen
  einen **Streit bei eurem letzten Familientreffen**«

Der Strukturpfad **erfindet die Erinnerung** und verweist nicht. 3 von 5 Läufen, rote Linie.
Kein Transport-, sondern ein Verhaltensunterschied — die Ursache ist offen (Kandidaten:
Aufmerksamkeitsverschiebung durch die Präambel; RECALL-BLOCK wird im Strukturmodus nicht
ausgelöst — in allen fünf Läufen kam kein einziger Block).

### Der stille Ausfall: alle fünf moment-Szenarien

MRV-01/02/03, QZ-01 und SPR-05 lieferten **keinen einzigen Zug** — der erste Request scheiterte
mit »errored«, 15 Samples ohne Inhalt. Perfekte Korrelation: **alle `moment`-Szenarien, nur
diese.** Ursache: Im AUFTRAG-BLOCK steht `changes[].baseline` als nacktes `{type:"object"}`
(semantisch `{Name:number}`). Ein freies Wörterbuch ist für Anthropics Grammatik-Compiler nicht
übersetzbar; `solo` enthält diesen Block nicht und lief deshalb durch.

## Umgesetzt

1. **Dialekt-Regel (d) für freie Wörterbücher** (`schema-dialekt.js`), nach Pflichtigkeit und
   **niemals still**:
   - *optional* → Feld entfällt im generierten Schema. Der Vertrag bleibt gewahrt, weil die
     semantische Wahrheit der JS-Validator ist (Rollenteilung ST1); der Textpfad ist unberührt.
     `changes[].baseline` ist optional und hat im moment-Pfad keinen Konsumenten.
   - *Pflicht* → **Wurf** mit Klartext. Ein Pflichtfeld stillschweigend zu streichen wäre ein
     Vertragsbruch; dann muss das JSON-Pendant konkretisiert werden.
2. **Kanarienvogel** `schema-dialekt-tauglichkeit.spec.js`: Jedes Turn-Schema im Strukturmodus
   muss übersetzbar sein — kein Objekt ohne properties, keine anyOf-Geschwister, keine
   Zähl-Constraints, `additionalProperties` überall gesetzt. **Dieser Test hätte den Ausfall vor
   dem Lauf gefunden**, kostenlos. einzel/gemeinsam werden vorab berichtet, damit die Migration
   nicht in dieselbe Falle läuft.
3. **GATE-Auswertung korrigiert** (`gateVergleich`): Unbewertete Samples zählen nie als
   bestanden (GATE-B) — im ersten Lauf sahen die fünf toten moment-Szenarien wie
   Verbesserungen aus (Δ−3, weil `verletzteSamples` 0 war). Solche Zeilen sind jetzt
   `unvergleichbar`, ihr Delta ist `null` und fließt nicht in die Summe; die Ampel ist dann
   mindestens **gelb** — ein Lauf mit Löchern ist kein grünes Ergebnis. Konsole weist
   vergleichbare Paare und unvergleichbare Szenarien getrennt aus.

## Empfehlung (Entscheidung liegt bei Cars10)

Nach den ST5-Kriterien ist **ROT** definiert als: rote Linie neu im Strukturpfad →
**solo/moment zurück auf Textpfad** (Ein-Zeilen-Revert je Def wie ST2c), Befund vor jeder
Weiterarbeit. Die Verschlechterungen bei RCL-02, AUS-04 und AUS-05 stützen das: Es ist kein
Einzelfall, sondern ein Muster.

Der Transport ist bewiesen (143/143 `schema`, 0 Rettungen) — das Problem liegt in der
Verhaltensebene. Nächster Schritt wäre eine gezielte Sonde auf RCL-02b (Textpfad vs. Struktur,
mit und ohne Präambel), um zu trennen, ob die Präambel die Aufmerksamkeit verschiebt oder der
RECALL-BLOCK im Strukturmodus nicht mehr ausgelöst wird.

## Kosten des Laufs (aus der Bergung)

Pipeline 415 Aufrufe (in 830, out 81.810, cacheRead 6.928.431, cacheWrite 2.368.779) ·
Judge 195 Aufrufe (in 461.768, out 38.896). Der Cache griff bereits ohne Pilot deutlich —
mit Cache-Pilot (ST6a) fällt der Pipeline-Anteil weiter.
