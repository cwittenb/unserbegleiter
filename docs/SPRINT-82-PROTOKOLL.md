# Sprint S82 — Eine Request-Quelle: Batch-params aus den Fassaden-Bausteinen

Basis: main `ceac663` + S81 · Tests: 964 grün (853 Struktur · 97 Worker · 25 Engine · 4 e2e)

## Anlass

Der Batch-Pfad baute seine Anthropic-`params` von Hand und ist damit zweimal
hinter Fassaden-Änderungen zurückgeblieben (S76: `structured` fehlte,
S77: `thinking` fehlte). Der S81-Merkposten wird eingelöst: die Batch-params
kommen jetzt aus DENSELBEN Bausteinen wie der synchrone Pfad.

## Änderungen

### Adapter (`core/llm/adapter.js`)

Neu `cfg.cacheTtl` (z. B. `"1h"`): wird auf den System-Prompt-Cache-Block UND
den Rolling-Prefix-Marker angewendet. Bisher konnte nur der Batch-Runner die
1h-TTL setzen — per Hand und nur auf dem System-Block. Nebeneffekt-Verbesserung:
der Rolling-Prefix trägt im Batch jetzt ebenfalls 1h und wird über die
Minuten auseinanderliegenden Turn-Batches hinweg zum Treffer (S65-Motiv,
konsequent zu Ende geführt).

### Batch-Runner (`evals/runner-batch.js`)

- `PIPE_CFG`: `cache:true, cacheTtl:"1h", thinking:"disabled"`, 4096 —
  Pipeline-params = `LLM_PROVIDERS.anthropic.body(PIPE_CFG, system, messages)`.
- `JUDGE_CFG`: `cache:false` (Judge-Caching AUS, S56), `thinking:"adaptiv"` —
  Judge-params = `structuredBody(JUDGE_CFG, prompt, [userMsg], JUDGE_SCHEMA)`.
- Sämtliche handgebaute Request-Konstruktion ist entfernt. Künftige
  Fassaden-Änderungen (neue Felder, geänderte Serialisierung) erreichen den
  Batch automatisch — die Lückenklasse ist konstruktiv geschlossen, nicht nur
  auswendig gelernt.

## Absicherung

Keine neuen Tests nötig — genau das ist der Punkt: die vorhandenen Tests
(S65 1h-TTL auf dem System-Prompt, S81 thinking je Rolle + Budget,
Lockstep-Reihenfolge, structured-Judge-Form) laufen unverändert grün über die
neue Request-Quelle und bewachen sie ab jetzt mit.
