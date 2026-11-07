# Sprintprotokoll · S147 — GLM 5.3 anbinden (Nicht-US-Kandidat)

**Datum:** 07.11.2026 · **Branch:** `s147-glm-anbindung` · reine Werkzeugänderung, kein Korpus, Produktion unverändert.

## 1 · Ausgangslage

GLM 5.3 (Z.ai) läuft über die Mistral-Plattform als `zai-glm-5-3` (1,40 / 4,40 $ je MTok, Cache 0,14). Reasoning lässt sich nicht abschalten (`low | high | max`, Vorgabe **max**). Ohne eigenes Feld liefe jeder Turn auf max. Das ist teuer und langsam, und wie bei Large 4 (S144c) droht der Token-Deckel vor dem ersten Text.

## 2 · Änderungen

| Datei | Änderung |
|---|---|
| `core/llm/adapter.js` | `reasoningEffort: null` als Vorgabe; null heißt, das Feld wird nicht gesendet |
| `core/llm/providers/openai-kompatibel.js` | `reasoning_effort` nur, wenn gesetzt |
| `evals/eval-konfig.js` | `--denkaufwand none\|low\|medium\|high\|max` (nur Mistral-Plattform), `--max-tokens N` (256–131072) |
| `evals/runner.js` | reicht beides an die Pipeline durch (nicht an den Judge), Kopfzeile und `stand` im Bericht |
| `scripts/modellvergleich.js` | `denkaufwand` / `maxTokens` je Lauf |
| `evals/modellvergleich.json` | Lauf **D** `zai-glm-5-3`, Denkaufwand low, Deckel 16384 |
| `evals/preise.json` | `zai-glm-5-3` |

## 3 · Tests

neu `tests/unit/s147-denkaufwand.spec.js` (9). Suite nach Merge (S146 + S147): 2845 Struktur-, 26 Engine-, 187 Worker-, 4 e2e-Tests grün.

## 4 · Sonde (bei dir)

```bash
# 1 · Machbarkeit: kommt Text, wie lang dauert ein Turn, wie viele Token frisst das Reasoning?
node evals/runner.js --szenario SYC-05 --n 1 --provider mistral --pipeline-modell zai-glm-5-3 --denkaufwand low --max-tokens 16384 \
  --judge-provider anthropic --judge-modell claude-opus-5-5 --rpm 30
# 2 · Wenn 1 sauber läuft: Kurzlauf wie A–C
node scripts/modellvergleich.js --kurz --nur D
```

**Offen:** In welcher Region Mistral GLM betreibt, ist öffentlich nicht dokumentiert. Bitte vor einem produktiven Einsatz bei Mistral klären (Modellkarte bzw. Auftragsverarbeitung). Für Evals mit Testmaterial ist das unkritisch.
