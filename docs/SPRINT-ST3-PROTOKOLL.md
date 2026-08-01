# Sprint ST3 — Protokoll · Mechanikwechsel: native Structured Outputs statt erzwungenem Tool-Use

**Datum:** 1. August 2026 · **Basis:** `33f1c34` + Sonden-Kette st2e→st2f→st2g · **Track:** ST (ST1 ✓ · ST2 ✓ · ST2c ✓ · **ST3** · ST4 offen)
**Stand:** 2221 Tests grün (231 Dateien, keine Unhandled Errors) · Build grün (Kern `1bd281e71014e322`)

## Die Beweiskette, die hierher führte

1. **Sonde v2 (n=9):** Frage-ohne-Block-Züge 9/9 sauber, der kombinierte antwort+Block-Zug riss 2/3 — Tool-Use-Serialisierung (`</antwort>`, `<parameter …`) blutete in den antwort-String.
2. **Blockgrenzen-Matrix (n=40):** anthropic/tool-use variantenunabhängig ~50 % gerissen (Feldreihenfolge und Grenz-Regel heilen NICHTS) — mistral mit identischer Präambel, identischem Korpus, identischem Schema **20/20 sauber**. Damit war der Voll-Migrations-Fallback **widerlegt**: Die Prompts tragen; der Riss ist die Mechanik.
3. **Variante E (n=5):** anthropic mit nativen Structured Outputs (`output_config.format`, constrained decoding, GA für ≥ 4.5): **0 Lecks**, 4/5 sauber, 1× `block:null` — die Leckklasse ist mechanisch verschwunden; der Rest ist die gutartige WANN-Klasse, die in allen Mechaniken existiert (auch Textpfad) und in GATE/Eval gehört, nicht in den Transport.

**Entschieden:** Beide Provider erzwingen per constrained decoding — anthropic `output_config.format`, mistral `response_format json_schema strict`. Der erzwungene Tool-Use ist als Struktur-Transport Geschichte.

## Umgesetzt

1. **`core/llm/schema-dialekt.js` (neu):** `anthropicSoDialekt` — (a) anyOf mit Struktur-Geschwistern → reines anyOf gemergter Varianten (required vereinigt; trifft die zeit-noContent-Weiche), (b) `additionalProperties:false` auf jedem Objekt (generationsseitig; die Altbestand-Toleranz der JS-Validatoren, S95.3b, bleibt), (c) Zähl-Constraints raus — semantische Wahrheit bleibt der JS-Validator samt Vertrag-2-Korrekturrunde (Rollenteilung ST1). Deterministisch → Grammatik-Cache (24 h) und Prompt-Cache bleiben treffsicher.
2. **Adapter anthropic:**
   - `structuredBody`: `output_config.format` mit Dialekt-Schema; **keine** `tools`/`tool_choice` mehr.
   - `streamStructuredParse`: das erzwungene JSON strömt als normale `text_delta`-Häppchen durch den vorhandenen antwort-Extraktor (S79); `strukturQuelle:"schema"`; Parse-Fehler tragen `code:"struktur_fehlt"` + Roh-Text, sodass die keyless-Korrekturrunde (ST1.4) auch nach einem Streaming-Erstversuch greift (die Korrektur wiederholt ohnehin non-stream).
   - `parseStructured`, neue Deutungsreihenfolge: (1) `tool_use`-Block falls vorhanden = **Alt-Kompatibilität** (Batch-Nachzügler; Quelle `"tool"`), (2) Text als JSON = Regelfall (Quelle `"schema"`), (3) S85-Rettung aus Freitext (Quelle `"text"`), (4) harter Fehler `struktur_fehlt` („kein JSON-Wert im Text").
   - **R3-Wächter entfernt:** `output_config` ist laut Doku mit Thinking kompatibel (Grammatik greift nicht in Thinking-Tags) — der Ausschluss galt nur `tool_choice`. Der Test ist invertiert und schreibt das fest.
3. **Adapter mistral/openai:** `strukturQuelle:"schema"` in beiden Struktur-Pfaden — die Quelle ist providerübergreifend vereinheitlicht („schema" = decoder-erzwungen, „tool" = Alt, „text" = gerettet). Alle Konsumenten (Engine-Telemetrie, Runner, Judge) vergleichen nur gegen `"text"` und laufen unverändert.
4. **Test-Doubles:** E2E-Pages-Vollstack-Upstream und Selbstfahrt-Drehbuch erkennen `output_config` und antworten mit Text-JSON bzw. `text_delta`-SSE; die Alt-Specs (S76/S79/S85, Worker) prüfen jetzt die neue Mechanik inklusive Alt-Deutung.
5. **Sonde:** Nach dem Umbau messen A–D automatisch die neue Adapter-Mechanik (E bleibt Roh-Referenz); Quelle-Check akzeptiert `schema`/`tool`.

## Nicht getan (bewusst)

- **solo+moment bleiben AUS.** Wieder-Einschalten erst nach Wiederholung der Sonde v2 über die neue Mechanik (Ein-Zeilen-Patch, ST4) — Reihenfolge wie zugesagt.
- **Kein „Abschluss-Nachfassen"** für die `block:null`-WANN-Klasse — erst GATE-Zahlen, dann befund-getrieben entscheiden (Kandidatenliste ST3+ im ST2c-Protokoll).
- Enum-Casing-Normalisierung beim Marker-Vergleich: notiert (Doku-Caveat), unsere Marker tragen keine Leerzeichen — kein akutes Risiko.

## Nächste Schritte

1. Push, dann `node docs/probe-st2-strukturturn.mjs` (misst automatisch die neue Mechanik; optional `--diff` für die Text-Baseline).
2. Grün → ST4: solo+moment wieder AN (Ein-Zeilen-Patch) + Eval-GATE über den Strukturpfad + Kernwetten-Migration + REVEAL-Sonde.

## Verifikation

Frischer Clone `33f1c34` → Kette st2e/st2f/st2g → ST3-Implementierung → 2221 grün, keine Unhandled Errors → Build grün → Multipatch auf zweitem frischem Clone: Kette → Dry-run → Apply → Idempotenz → Byte-Vergleich → Suite → Build.
