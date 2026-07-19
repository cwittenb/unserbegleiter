# Sprint S79 — Stream-Extraktor für strukturierte Turns (D1/O3, D2)

Basis: S78 · Tests: 960 grün (834 Struktur · 97 Worker · 25 Engine · 4 e2e)
Kern-Hash: `ebaaa4643164bce4`

## Zweck

Die Infrastruktur, an der die Engine-Umstellung (S80) hängt: Bei strukturierten
Konversations-Turns ist die gesamte Modellantwort JSON — der Begleitertext lebt
im Feld `antwort`. Damit die UI weiter Text-Deltas bekommt, wird das Feld
INKREMENTELL aus dem rohen JSON-Fragmentstrom extrahiert. Der Client-Vertrag
(`{delta}… {done}`) bleibt byte-kompatibel; `data` reist im done-Event.

## Neu

### `core/llm/antwort-extraktor.js`

Reiner, zustandsbehafteter String-Automat (suche → vorText → text → fertig)
ohne JSON.parse auf Fragmenten. Dekodiert alle JSON-Escapes inklusive über
Häppchengrenzen zerrissener `\uXXXX`-Sequenzen; häppchengrößen-invariant
(getestet mit 1-Zeichen-Häppchen). D2-Rückfall eingebaut: steht `antwort`
nicht vorn im Objekt, wird gepuffert statt kaputtzugehen — der Text erscheint
dann später, aber korrekt. Abriss-Semantik erhalten: das bis zum Abriss
Dekodierte ist gültiger Text.

### Adapter (`core/llm/adapter.js`)

- `structured` + `onDelta` gemeinsam ist jetzt erlaubt (der S77-Wurf entfällt).
- anthropic `streamStructuredParse`: sammelt `input_json_delta`-Fragmente,
  speist den Extraktor (onDelta = extrahierter Text), parst am Ende das
  vollständige JSON → `data` ist die Wahrheit, der Extraktor nur die
  Anzeige-Spur. Abschneidung (`stop=max_tokens` ohne extrahierten Text) wirft.
- openai-kompatibel `streamStructuredParse`: identische Logik über
  `delta.content`-Fragmente; `response_format` bleibt `json_schema` strict.
- Fassade unverändert: `{ text, data, stop, usage }` — `text` ist der
  extrahierte antwort-Text.

### Worker (`platforms/cloudflare/worker/index.js`)

Die 400-Sperre `structured+stream` (S76) ist aufgehoben. Der Streaming-Pfad
reicht `{ structured, onDelta }` an den Adapter durch; die `{delta}`-Events
tragen ausschließlich extrahierten Begleitertext (Kanarie: nie `{` in Deltas),
`data` reist im `{done}`. Alle Grenzen davor (unvollständig/zu groß ⇒ 400,
Session-Pflicht) unverändert.

## Tests (+11, −0)

- `tests/unit/antwort-extraktor.spec.js` (7): Deltas, Häppchen-Invarianz,
  Escape-Dekodierung, Abriss, D2-Rückfall, Feldname-im-Wert, fertig-Sperre.
- `tests/unit/adapter-stream-structured.spec.js` (4): Anthropic
  (input_json_delta, Abschneide-Wurf), Mistral (delta.content, strict),
  Proxy (Client-Sicht: Deltas + data im done).
- `tests/worker/llm-structured.spec.js`: der 400-Test ist durch den echten
  Miniflare-Streaming-Test ersetzt (SSE-Upstream-Stub mit zerrissenem
  antwort-Feld über zwei Fragmente).

## Bewusst NICHT in diesem Sprint (→ S80, eigener Sprintplan)

Die Engine-Umstellung selbst: Turn-Schema (antwort/marker/block-Union) in den
Session-Prompts, Ablösung der Block-Marken-Konvention, Artefakt-Pfad ohne
Live-Streaming (D3), Feldreihenfolge-Kanarie auf Eval-Ebene 2, Qualitätszeit-
Sonderverdrahtung. S79 liefert die komplette, unabhängig getestete Unterlage
dafür — die Engine kann darauf umgestellt werden, ohne dass Adapter, Worker
oder Client noch angefasst werden müssen.
