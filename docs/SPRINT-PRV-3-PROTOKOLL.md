# Sprintprotokoll · PRV-3 — Regie-Transport: Schärfung an die letzte Nachricht

**Datum:** 08.11.2026 · **Branch:** `prv3-regie-transport` (Kette: main → prv1d → prv2 → prv3) · **Kern:** `3ff76a39f52b815a`

## 1 · Warum

Die Zug-Schärfungen (Krise, Zweiseitigkeit, Aufdeckung — `core/policies/katalog.js`) hingen als Zusatz an den Systemtext (`system += zusatz`). Zwei Probleme:

1. **Position.** Der Hinweis stand hinter 12–14k Token Korpus. Die eigene Sonde (MRV) maß: dieselbe Regel unmittelbar vor der Antwort 8/8 → 1/8 Verstöße; im Korpus verschoben −0,13. Literatur: Rezenz > Primacy bei Prompts deutlich unter Fenstergröße.
2. **Cache.** Anthropic cacht Präfixe. Jeder geschärfte Zug änderte den Systemtext → für diesen Zug verfiel der ganze Cache (System **und** Verlauf), also gerade in den heiklen Zügen voller Input-Preis.

## 2 · Mechanik

| Ort | Änderung |
|---|---|
| `core/engine/regie.js` (neu) | `mitRegie(messages, zusatz)`: Kopie des Verlaufs, die letzte Nachricht der Person trägt das Feld `regie`. Original unangetastet. |
| `core/llm/regie.js` (neu) | `inhaltMitRegie(m)`: Inhalt + Absatz + Hinweis (für Provider ohne Content-Blöcke). Getrennt von der Engine-Seite, weil die Schichten einander nicht importieren (`mod-grenzen`); das Feld `regie` ist der Vertrag. |
| `core/engine/engine.js` | Systemtext = `def.sysPrompt(ctx)` unverändert; `llm(system, mitRegie(chat.messages, zusatz), …)`. |
| `providers/anthropic.js` | Mit Cache: Hinweis als **eigener Textblock hinter dem `cache_control`** der letzten Nachricht — der Präfix bleibt identisch. Ohne Cache: angehängt. Das Feld geht nie zur API. |
| `providers/openai-kompatibel.js` (Mistral/OpenAI) | angehängt an den Inhalt. |
| `core/llm/adapter.js` (Proxy) | `regie` reist zum Worker mit (nur wenn gesetzt); der Worker reicht die Nachrichten an denselben Adapter. Quota zählt weiter nur den Inhalt der Person. |
| `evals/runner-kern.js`, `evals/runner-batch.js` | gleicher Transport wie die Engine (der Eval misst, was die App tut). |
| Echo-Wächter (`ECHO_MUSTER`) | neu „App-Hinweis-Echo“ (`APP-HINWEIS` / `APP NOTE` im sichtbaren Text) — der Hinweis steht jetzt näher am Antworttext; Regie-Echo ist bei Medium beobachtet (modellentscheidung.md §6.5). |
| `format/steuerTextRegel` (DE/EN) | PROTOKOLL-ZEICHEN nennt jetzt auch „Hinweise für genau diesen Zug“ als Steuertext in eckigen Klammern. |

**Kleine Entscheidung (Abweichung von F4 a):** kein neues `<regie>`-Tag. Die Wächtertexte tragen schon die Form `[APP-HINWEIS für diesen Zug: …]`, und PROTOKOLL-ZEICHEN lehrt das Modell seit S93: eckige Klammern = Technik, handeln, nicht zitieren. Ein neues Tag wäre ein neues Zeichen, das das Modell erst lernen und echoen könnte — genau die Lehre aus PRV-1c/1d.

**Noch nicht drin (PRV-3b):** das Zustandsobjekt („wo wir sind / was jetzt gilt“). Getrennt gehalten, damit der Transport allein gemessen werden kann.

## 3 · Tests

Sieben Bestandstests invertiert (sie hielten „die Schärfung geht in den SYSTEMTEXT“ fest — jetzt: Systemtext je Zug gleich, Hinweis als Regie, nie im Verlauf). Neu `tests/unit/prv3-regie-transport.spec.js` (12): `mitRegie`-Semantik; Anthropic-Body mit Cache (Block hinter Breakpoint, kein Fremdfeld zur API, ohne Regie byte-gleich zu vorher); ohne Cache und Mistral/OpenAI angehängt; Proxy trägt das Feld nur, wenn gesetzt; **Cache-Invariante über die echte Engine** (geschärfter und ungeschärfter Zug sehen denselben Systemtext); Echo-Wächter. Suite **3 167 grün** (e2e nach Build).

## 4 · Eval (bei dir)

Artefakt `paarbegleitung-eval_*_3ff76a39` (enthält PRV-1d und PRV-2 aus der Kette). **Mit Wächter-Haken** (sonst gibt es keine Schärfung):

| Familie | Szenarien | warum |
|---|---|---|
| Zweiseitigkeit | MRV-02, MRV-02-EN | Schärfung `zweiseitigkeit` |
| Krise geteilter Raum | KRIS-02, KRIS-02-EN | Schärfung `krise` |
| Aufdeckung | AUFD-01 (+ EN) | Schärfung `aufdeck` |

Haiku n=5, Sonnet n=3. Erwartung: nicht schlechter, bei MRV eher besser (Rezenz). Achten auf `echo: App-Hinweis-Echo` in den Zügen.

Cache-Effekt lässt sich im Artefakt nicht messen (keyless, keine Usage-Kennzahlen); lokal mit `npm run eval -- --familie MRV --waechter` zeigen die Usage-Felder `cacheRead`/`cacheWrite` den Unterschied.
