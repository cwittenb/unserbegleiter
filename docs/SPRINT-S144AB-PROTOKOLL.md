# Sprintprotokoll · S144a + S144b — Judge-Kalibrierung und Modellvergleich II

**Basis:** `main` @ `3c0c448` (Merge mod-7)
**Branch:** `s144-modellvergleich-ii` → Merge nach `main`
**Endstand:** **2777 / 187 / 26 / 4 grün**, `npm run build` grün
**Kern-Hash:** `4e92a7f2320cf178` (vorher `7ed21b0cacda3382`) — verschoben **nur** durch `core/llm/adapter.js` (Kommentar) und `core/llm/providers/anthropic.js` (neuer Denkmodus). Prompt, Korpus und Policies unverändert; ohne die beiden Dateien ergibt sich wieder `7ed21b0c…`. `eval-vergleich` warnt beim Vergleich mit älteren Läufen daher zu Recht formal, inhaltlich misst der Prompt dasselbe.

**Entscheidungen (07.11.):** F1 Large 4 läuft mit · F3 EU-Provider-Eintrag eigener Stream nach der Testphase · n=3 · F4 Branch-Flow · F5 Preise geprüft · F6 Small 4 weggelassen

---

## 1 · Befundlage

| Was | Stand 07.11.2026 |
|---|---|
| Augustvergleich | Kern `44649fb9…`, Judge `claude-opus-4-8` j10 — durch MOD-0…7 nicht mehr übertragbar |
| `mistral-medium-3-5` | deprecated seit 31.10.2026, Retirement 30.04.2027, Nachfolger Large 4 |
| `mistral-large-4-0` | GA, 0,70 / 2,10 $ (cached 0,07), 1M Kontext, open-weight |
| `claude-sonnet-5` | „Active (legacy)", Retirement nicht vor 30.06.2027 |
| `claude-sonnet-5-5` | 2 / 10 $; **lehnt `thinking:disabled` mit 400 ab**, bietet `between_tools` |
| `claude-haiku-5-5` | 0,10 / 0,50 $ (bis 100K Prompt; darüber 0,50 / 2,50); Temperatur ≠ 1 → 400; kein Prefill |
| `claude-opus-5-5` | 4 / 20 $, Cache-Read 0,20; Thinking immer adaptiv |
| `mistral-large-latest` | Preis in `preise.json` war 2 / 6 $ — tatsächlich Large 3: 0,50 / 1,50 $ |

---

## 2 · S144a — Judge-Kalibrierung

**Neu:** `scripts/judge-nachbewertung.js`, `evals/nachbewertung.js` (reine Logik), `evals/judge-kalibrierung.json` (Referenz `opus-4-8`, Kandidat `opus-5-5`).

Das Skript richtet gespeicherte Transkripte mit dem Kandidaten neu — nur Judge-Aufrufe, keine Pipeline — und stellt jedes Urteil gegen das alte.

- **Default-Filter:** nur Berichte des Referenz-Judges **und** des heutigen Judge-Prompts (j10). Ohne diesen Filter mischte der erste Trockenlauf Urteile aus j3–j10 — das hätte Prompt- und Modellwechsel zugleich gemessen. `--alle-promptversionen` hebt ihn auf.
- **Übersprungen:** fremder Judge, fremder Prompt, Szenario nicht mehr im Katalog, Szenario-Version abweichend, Altformat ohne Check-Liste, altes Sample unbewertet.
- **Golden-Selbsttest vorab** wie im Runner (S66): scheitert der Kandidat dort, ist das der Befund.
- **Ausgabe:** Übereinstimmung gesamt und je Check, Richtung (↑ strenger / ↓ milder), **jede Abweichung mit beiden Belegen**. Stoppsignal: ≥3 Abweichungen eines Checks alle in dieselbe Richtung.
- **Ablage:** `evals/nachbewertungen/` — bewusst nicht `evals/ergebnisse/`, weil `modellvergleich.js` dort die neueste Datei als Laufergebnis greift.

**Trockenlauf:** 68 Berichte → **247 Fälle** (ERO-01/02 DE+EN je 8, GATE-S1 70, GATE-S1-EN 15, SYC-05 75, ANT-01 55), alle j10. Kosten geschätzt unter 5 $.

## 3 · S144b — Konfiguration

**Denkmodus der Pipeline** (`--denkmodus aus | adaptiv | zwischen-tools`, Default `aus` = S77):
- `core/llm/providers/anthropic.js`: `zwischen-tools` → `thinking:{type:"between_tools"}`. Ohne Tool-Aufrufe ist das das Gegenstück zu `disabled` (deterministisches Budget) für Modelle, die `disabled` ablehnen. Keine Temperatur dazu (S137-Regel unverändert).
- `evals/eval-konfig.js`: Flag mit Validierung (unbekannter Wert → `EvalKonfigFehler`, kein stiller Rückfall).
- `evals/runner.js`: Denkmodus an die Pipeline, im `stand` des Ergebnisses, in der Kopfzeile; `--batch` mit Denkmodus ≠ `aus` wird abgelehnt (der Batch-Pfad hat `disabled` fest verdrahtet).
- **Produktion unberührt:** Worker setzt weiterhin `disabled` oder `adaptiv` (`LLM_THINKING`). Ein Wechsel auf Sonnet/Haiku 5.5 braucht dort `zwischen-tools` — eigener Schritt.

**`evals/modellvergleich.json`:** gepinnte IDs, Judge `claude-opus-5-5` mit `freigegeben: false`.

| Lauf | Modell | Denkmodus |
|---|---|---|
| A | `mistral-medium-3-5` (Basislinie) | — |
| B | `claude-sonnet-5-5` | zwischen-tools |
| C | `claude-haiku-5-5` | zwischen-tools |
| D | `mistral-large-4-0` | — |

**`scripts/modellvergleich.js`:** n=3 Default; `--denkmodus` je Lauf; **verweigert den Lauf, solange der Judge nicht freigegeben ist** (Trockenlauf geht); `--nur`-Meldung nennt die Kennungen aus der Datei.

**`evals/preise.json`:** Opus 5.5, Sonnet 5.5, Haiku 5.5, Medium 3.5, Large 4 ergänzt; `mistral-large-latest` korrigiert (2 / 6 → 0,50 / 1,50). Haiku: Stufe bis 100K (unsere Prompts ~12–22K). Sonnet-5.5-1h-Write aus 2× Input abgeleitet.

## 4 · Tests

- `tests/unit/s144a-judge-nachbewertung.spec.js` (13): Ausschlussgründe als Negativfälle, Zeile je Check mit `verletztWenn`, unbewertet ≠ Abweichung, Richtung, Stoppsignal nur bei Einseitigkeit, Trockenlauf ohne Schlüssel, Ablageort.
- `tests/unit/s144b-modellvergleich-konfig.spec.js` (15): keine `-latest`, jeder Preis vorhanden, Kennungen eindeutig, Freigabe boolean, Judge ≠ Pipeline, `--denkmodus`-Parsing, `between_tools` im Körper ohne Temperatur, `disabled` unverändert, Trockenlauf-Befehle, Freigabe-Sperre.
- S35d-Wächter grün (keine Modellnamen im Code).

## 5 · Nächste Schritte (S144c)

```bash
# 1 · Kalibrierung (nur Judge, Cent-Beträge)
node scripts/judge-nachbewertung.js --trocken
node scripts/judge-nachbewertung.js
# optional: auch die MRV-02-EN-Datei vom 07.11. (6/8 verletzt — guter Strenge-Test)
node scripts/judge-nachbewertung.js --dateien evals/ergebnisse/2026-11-07T08-36-26-721Z.json

# 2 · Abweichungen lesen. Keine einseitige Häufung → in evals/modellvergleich.json
#     judge.freigegeben auf true

# 3 · Kurzlauf, dann voller Zehner
npm run eval:modellvergleich -- --kurz
npm run eval:modellvergleich
```

**Bekannte Risiken beim ersten Lauf:**
- Haiku 5.5 und `between_tools` sind nicht ausdrücklich dokumentiert. Lehnt es ab (400), in der JSON auf `adaptiv` stellen und hier vermerken.
- Opus 5.5 denkt immer; bei 4096 `max_tokens` könnte ein Judge-Urteil abgeschnitten werden → erscheint als `unbewertet`, nicht als Abweichung. Häuft es sich, Budget anheben (eigener Schritt).
- Large 4 liefert „reasoning" als Ausgabeart; ob der OpenAI-kompatible Adapter das sauber liest, zeigt `--nur D`.

## 6 · Nicht in diesem Sprint

EU-Provider-Eintrag (Bedrock/Vertex; F3) · Produktionswechsel · Prompt-Änderungen · Judge-Prompt j11 · deutsche Hoster (IONOS/OVH) als Läufe E/F — Entscheidung offen, s. `docs/modellentscheidung.md`.
