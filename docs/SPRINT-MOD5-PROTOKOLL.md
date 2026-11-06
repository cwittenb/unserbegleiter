# Sprintprotokoll · MOD-5 — Provider je Datei, kein Wire-Text im Adapter

**Basis:** `main` nach Merge `mod-3` (`50fdcd2`)
**Kette:** MOD-0 → MOD-1 → MOD-2a → MOD-2b → MOD-3 → **MOD-5** (MOD-3b und MOD-4 warten auf Entscheidungen, s. Chat)
**Branch:** `mod-5` → Merge nach `main`
**Endstand:** **2715 / 187 / 26 / 4 grün** (+20), `npm run build` grün
**Kern-Hash:** `c9ff90a7d1b8d648`

---

## 0 · Zweck

Die KI-Anbindung war die am besten gekapselte Schicht (Review: Kopplung niedrig). Zwei Reste: ein neuer Provider hieß „Edit in `adapter.js`“ (795 Zeilen), und der Adapter trug einen modell-gerichteten Text (`STRUKTUR_KORREKTUR`). Beides weg. Kein Verhalten geändert; alle 80 Adapter-Tests laufen unverändert über die Fassade.

## 1 · Was geändert wurde

| Datei | Änderung |
|---|---|
| `core/llm/transport.js` (neu) | `istEventStream`, `sseDaten`, `STILLE_FRIST_MS`, Stille-Frist — SSE-Werkzeug, providerneutral |
| `core/llm/struktur.js` (neu) | `strukturAuszug`, `extrahiereStrukturAusText`, `escapeSteuerzeichenInStrings`, `pruefeAbschnitt`, `istAbgeschnitten`, `markiereAbschnitt`, `pruefeStructured` |
| `core/llm/providers/anthropic.js` (neu) | der Anthropic-Eintrag (Messages-API, Caching, Denkmodus, output_config) |
| `core/llm/providers/openai-kompatibel.js` (neu) | die Fabrik `openaiCompat(baseUrl, modelKey)` |
| `core/llm/providers/mistral.js`, `openai.js` (neu) | je eine Zeile: Instanz der Fabrik |
| `core/llm/providers/index.js` (neu) | `LLM_PROVIDERS = { anthropic, mistral, openai }`, `PROVIDER_VERTRAG` (die 9 Pflichtmethoden) |
| `core/llm/adapter.js` | 796 → 356 Zeilen: nur noch Defaults, Fassade, Modi, Retry/Drossel. Re-exportiert alle bisherigen Namen (`LLM_PROVIDERS`, `sseDaten`, …) — kein Aufrufer ändert sich |
| `core/contracts/struktur-korrektur.js` (neu) | `STRUKTUR_KORREKTUR` (ST1.4, sprachinvariantes Wire) — neben `korrekturNachricht` in `block.js`, wo Vertragstext hingehört |
| `platforms/artifact/llm-config.js` | reicht `strukturKorrektur: STRUKTUR_KORREKTUR` herein (nur keyless läuft ohne Formgarantie) |
| `tests/unit/mod-provider-vertrag.spec.js` (neu) | 20 Tests, s. §2 |
| `tests/unit/adapter-strukturturn.spec.js` | importiert den Wire-Text aus `contracts`, setzt ihn in die keyless-cfg |
| `tests/unit/mod-grenzen.spec.js` | „core/llm trägt keinen modell-gerichteten Text“ — über **alle** Dateien unter `core/llm` |

### Die Korrektur-Runde ohne eigenen Text

Die keyless-Korrektur-Runde (ST1.4) braucht die Formforderung. Sie kommt jetzt als `cfg.strukturKorrektur`. Fehlt sie, gibt es **keine** Korrektur-Runde — der Ursprungsfehler geht unverändert an den Aufrufer (kein stiller Ersatztext). Dass die keyless-Plattform sie setzt, hält der Kontrakttest fest; direct/proxy brauchen sie nicht (dort ist die Struktur erzwungen, ST3).

Nicht gewählt: ein Import `core/llm → core/korpus` oder `→ core/contracts`. Die Importrichtungs-Kanarie verbietet beides, und die Begründung trägt: Der Transport darf nicht wissen, was die App dem Modell sagt.

## 2 · Was die Tests festhalten

- Für **jeden** Eintrag der Tabelle: alle 9 Vertragsmethoden; Modell aus `cfg`, nie aus dem Code; Text (JSON), Stream (SSE, Deltas in Reihenfolge) und Struktur (`data` = geparstes Objekt) über `makeAdapter` in Fassadenform — mit einer Dialekt-Attrappe je Provider-Familie.
- Je Tabelleneintrag existiert eine Datei unter `providers/`; kein Modellname im Code (Kommentare dürfen Sonden nennen).
- `STRUKTUR_KORREKTUR` lebt in `contracts`, `ARTEFAKT_LLM` trägt ihn; ohne `cfg.strukturKorrektur` genau ein Aufruf und der Ursprungsfehler.
- Golden unverändert (MOD-5 fasst keinen Prompt an).

## 3 · Austausch-Probe (Soll-Architektur)

Zweiter Provider = `core/llm/providers/<name>.js` mit den 9 Methoden + eine Zeile in `index.js` + Env `LLM_PROVIDER=<name>`, `<NAME>_API_KEY`, `<NAME>_MODEL`. Der Kontrakttest läuft automatisch mit. Für einen OpenAI-kompatiblen Endpunkt (Ollama, vLLM, Groq) ist die Datei eine Zeile `openaiCompat(url, "<name>")`.

## 4 · Offen

Nichts aus MOD-5. Offene Entscheidungen der Serie: F7 (EN-Zweiseitigkeitsmuster), F8 (tote Revisionstexte), E4-Revision (MOD-3b), MOD-4-Detailfragen — alle im Chat.
