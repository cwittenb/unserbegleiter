# Sprint S77 — Denkmodus & Abschneide-Erkennung

Basis: S76 + S76b · Tests: 957 grün (831 Struktur · 97 Worker · 25 Engine · 4 e2e)
Kern-Hash: `24af2bd8a23122e2` · Entscheidungen: D1–D4 (bestätigt)

## Befund

Nach S76 lieferte der erste Node-Lauf gegen claude-sonnet-5 in 3 von 18
Pipeline-Aufrufen eine LEERE Antwort. Eine Diagnose-Sonde, die den
Produktionsaufruf mit protokollierendem fetch reproduziert, zeigte die Ursache:

    D2 Turn2: stop=max_tokens · Blöcke=thinking · Text=0 Z. · out=1024 Tok
    D3 Turn1: stop=max_tokens · Blöcke=thinking+text · Text=383 Z. · out=1024 Tok

Jede Antwort enthielt `thinking`-Blöcke, obwohl wir Thinking nie angefordert
haben. Laut Anthropic-Doku ist auf Claude Sonnet 5 **adaptives Thinking
standardmäßig aktiv** (Änderung gegenüber Sonnet 4.6), `max_tokens` deckelt die
**gesamte** Ausgabe — Thinking plus Text —, und der neue Tokenizer erzeugt rund
30 % mehr Token für denselben Text. Große System-Prompts (unserer: ~31 000
Zeichen) lösen Thinking häufiger aus.

Zwei Fehlerbilder, das zweite gravierender:

1. Denkbudget frisst alles ⇒ leerer Text (vom S65-Detektor gefangen).
2. Denkbudget frisst fast alles ⇒ **mitten im Satz abgeschnittene Antwort**,
   die unbemerkt ins Transkript wanderte und vom Judge bewertet wurde, als
   wäre sie vollständig. In der Begleitung hätte derselbe Pfad jemandem einen
   abgebrochenen Halbsatz vorgesetzt.

Nicht ursächlich war S76: der Pipeline-Request ist unverändert (zwei Argumente,
kein `structured`); es ist ein Modellgenerationswechsel.

## Änderungen

### Adapter (`core/llm/adapter.js`)

- `LLM_DEFAULTS.maxTokens`: 1024 → **4096** (Denkbudget + neuer Tokenizer).
- Neu `LLM_DEFAULTS.thinking`: `"disabled"` (Vorgabe) | `"adaptiv"`.
  `"disabled"` sendet `thinking: {type:"disabled"}` mit, `"adaptiv"` lässt das
  Feld weg. Nur für Anthropic wirksam; bewusst eine Vorgabe und keine
  Pflichtangabe — Robustheits-Tuning wie `maxTokens`, kein Provider- oder
  Modellwissen, S35d bleibt unberührt.
- Neu `istAbgeschnitten(stop)` und `markiereAbschnitt(ergebnis)`: greift in
  allen vier Parse-Pfaden (anthropic/openai-kompatibel, je JSON und Stream).
  **Leerer Text + Abschneidung ⇒ harter Wurf** mit Handlungshinweis;
  **Text vorhanden ⇒ Fassade trägt `abgeschnitten: true`**, der Text bleibt
  erhalten (Streaming-Prinzip „das Empfangene ist die beste Antwort"), die
  Abschneidung ist aber nicht mehr unsichtbar.

### Eval-Kern (`evals/runner-kern.js`)

- `spieleSample` reicht `abgeschnitten` als Merkmal ins Transkript und bricht
  die Kaskade ab (wie bei leerer Antwort).
- Neu `anomalieImTranskript`: erste technische Anomalie (leer ODER
  abgeschnitten) mit Begründung; `leereAntwortTurn` bleibt unverändert
  erhalten. `laufeSzenario` nutzt die neue Funktion — Ergebnis: unbewertet,
  nie bestanden, nie „verletzt", und der Judge wird gar nicht erst befragt.

### Rollenverteilung des Denkmodus (D1/D4)

| Rolle | Modus | Grund |
|---|---|---|
| Begleitung (Runner-Pipeline, Artefakt, Worker) | `disabled` | deterministisches Budget, keine unsichtbaren Kosten (~8 000 Token/Lauf) |
| Judge (Runner, Eval-Artefakt) | `adaptiv` | Richten profitiert plausibel vom Denken |

Worker: `LLM_THINKING="adaptiv"` und `LLM_MAX_TOKENS` sind per Environment
übersteuerbar, ohne Code-Änderung.

## Tests (+21)

- `tests/unit/adapter-thinking-abschnitt.spec.js` (10): Denkmodus im Körper je
  Provider, Vorgabewerte, beide Abschneide-Schreibweisen, Wurf bei leerem Text,
  Merkmal bei Teiltext, Reinheit von `markiereAbschnitt`.
- `tests/unit/eval-abgeschnitten.spec.js` (7): Anomalie-Erkennung, Abbruch der
  Kaskade, Statusführung als unbewertet, und die Kanarie, dass der Judge über
  Halbsätze gar nicht erst urteilt.
- Angepasst: die S76-Rückwärtskompatibilitätsprüfung kennt `thinking` als
  regulären Körperbestandteil.

## Offen

- **Qualitätsfrage zu D1**: ob die Begleitung ohne Thinking gleich haltungstreu
  bleibt, ist unbelegt. Sauber entscheidbar über zwei Eval-Läufe (`disabled`
  gegen `adaptiv`) und den Vergleich der Verletzungsquoten — lohnt sich, sobald
  der Katalog wieder vollständig durchläuft.
- Der D5-Gate-Lauf für Anthropic (Ballast-Abbau aus S76) steht weiterhin aus;
  er sollte auf diesem Stand wiederholt werden.
