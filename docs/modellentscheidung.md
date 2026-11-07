# Modellentscheidung — Vorlage (S144)

**Stand:** 07.11.2026 · Teil 1 (Kosten, Datenwege, Self-Hosting) fertig · Teil 2 (Messung) nach S144c
**Frage:** Welches Modell trägt die Begleitung in Produktion — und über welchen Datenweg?

---

## 0 · Kurzfassung

1. **Kosten entscheiden es nicht.** Selbst das teuerste Kandidatenmodell kostet rund 4,40 $ je aktivem Paar und Monat; der Status quo 1,37 $. Entscheidend sind rote Linien (Messung, Teil 2) und der Datenweg.
2. **Der Preisvorteil der EU-Anbieter ist weg.** Haiku 5.5 (0,22 $/Paar) ist billiger als fast jedes EU-Angebot. Die EU-Wahl ist damit eine reine Datenschutz- und Vertrauensentscheidung — kein Kostenargument mehr.
3. **Status quo ist ein Risiko, kein Ruhepunkt.** Produktion läuft auf `mistral-large-latest`: im August das Modell mit 30/30 Fehlschlägen an der Eröffnungsweiche — und der Alias kann inzwischen still auf Large 4 zeigen, das nie gemessen wurde.
4. **Self-Hosting lohnt erst ab ~1.300–3.200 aktiven Paaren** und kostet einen Betriebsaufwand, den ein Ein-Personen-Projekt schwer trägt. Strategisch wertvoll bleibt es als Ausweg: Medium 3.5 (das einzige Modell mit gemessenem Bestehen) ist open-weight.

---

## 1 · Gemessene Token-Profile

Aus der Telemetrie aller Ergebnisdateien in `evals/ergebnisse/` (4.341 Pipeline-Aufrufe):

| Familie | Aufrufe | Prompt je Turn | davon Cache-Read | Cache-Write | Ausgabe |
|---|---|---|---|---|---|
| Anthropic (`claude-sonnet-5`) | 3.378 | 21.615 | 16.351 | 5.245 | 209 |
| Mistral (`medium`/`large`) | 963 | 9.600–11.850 | 0 (nicht gemeldet) | 0 | 81–132 |

Anthropic zählt rund 30 % mehr Token für denselben Text (neuer Tokenizer) und schreibt je Turn den wachsenden Verlauf in den Cache (Rolling-Cache). Für Mistral ist mit 11.000 Prompt- und 130 Ausgabe-Token gerechnet, **ohne** Caching (Obergrenze); Large 4 zusätzlich mit 85 % Präfix-Treffer.

**Annahme Nutzung:** 240 Turns je aktivem Paar und Monat (2 Partner × 8 Sitzungen × 15 Turns). Skaliert linear — bei anderer Annahme die Spalte „je 1.000 Turns" nehmen.

---

## 2 · Kostenvergleich

| Modell | Datenweg | je 1.000 Turns | je Paar/Monat | 100 Paare | 1.000 Paare |
|---|---|---|---|---|---|
| **Status quo** `mistral-large-latest` (= Large 3) | Mistral EU | $5,70 | $1,37 | $137 | $1.367 |
| `mistral-medium-3-5` (Basislinie, deprecated) | Mistral EU | $4,66 | $1,12 | $112 | $1.118 |
| `mistral-large-4-0` | Mistral EU | $7,97 | $1,91 | $191 | $1.914 |
| `mistral-large-4-0` mit Präfix-Cache | Mistral EU | $2,08 | $0,50 | $50 | $500 |
| `mistral-small-4` | Mistral EU | $1,73 | $0,41 | $41 | $415 |
| GLM 5.3 Flash (bei Mistral gehostet) | Mistral EU | $1,71 | $0,41 | $41 | $412 |
| `claude-sonnet-5-5` | USA (Direkt-API) | $19 | $4,44 | $444 | $4.442 |
| `claude-haiku-5-5` | USA (Direkt-API) | $0,93 | $0,22 | $22 | $222 |
| `gpt-6.1-sol` (+10 % EU-Region) | OpenAI, Inferenz EU | $19 | $4,45 | $445 | $4.455 |
| `gpt-6-luna` (+10 % EU-Region) | OpenAI, Inferenz EU | $0,87 | $0,21 | $21 | $210 |
| Qwen3.8-27B (OVHcloud / IONOS) | FR / DE | €4,75 | €1,14 | €114 | €1.140 |
| gpt-oss-120b (OVHcloud) | FR | €0,93 | €0,22 | €22 | €224 |
| gpt-oss-120b (IONOS) | DE | €1,73 | €0,42 | €42 | €416 |

Ohne Wechselkursumrechnung ($ und € nebeneinander). `evals/preise.json` führte `mistral-large-latest` bis S144 mit 2 / 6 $ — viermal zu hoch; korrigiert auf den Large-3-Preis 0,50 / 1,50 $.

---

## 3 · Datenwege, geordnet nach Schutzniveau

Inhalte der Begleitung berühren regelmäßig Gesundheit und Sexualleben — besondere Kategorien nach Art. 9 DSGVO. Der Datenweg ist deshalb mehr als eine Formalie.

| Rang | Weg | Beispiele | Für uns |
|---|---|---|---|
| 1 | **Selbst gehostet in Deutschland** | Hetzner GEX131 (Falkenstein) | volle Kontrolle; Betrieb liegt bei uns |
| 2 | **Deutscher Hoster, offene Modelle** | IONOS (Berlin), STACKIT (eu01), T-Systems T-Cloud | kein US-Konzern; OpenAI-kompatibel → je eine Zeile `openaiCompat` |
| 3 | **EU-Anbieter** | Mistral (Paris), OVHcloud | heutiger Weg; eigene Modelle |
| 4 | **US-Anbieter, EU-Inferenz** | OpenAI EU-Region, Anthropic über Bedrock/Vertex EU | Inferenz in der EU, Konzern unter US-Recht; Freigabe/Zusatzverträge nötig |
| 5 | **US-Anbieter direkt** | Anthropic-API | globale Verarbeitung |

Scaleway (Paris) führt nur Modelle der Vorjahre (Llama 3.x, Mistral Nemo) und scheidet aus.

---

## 4 · Self-Hosting

| Modell | Größe / Lizenz | Hardware | Hetzner | Breakeven gegen API |
|---|---|---|---|---|
| **Mistral Medium 3.5** | 128B dicht · Modified MIT | FP8 ~128 GB Gewichte + KV-Cache → 4 × 96 GB | GEX430, €3.599/Monat + €3.599 Setup, **Helsinki** | ~772.000 Turns ≈ **3.200 Paare** |
| Gemma 4 31B | dicht · Apache 2.0 | 1 × 96 GB (BF16) | GEX131, ab €1.499/Monat + Setup, **Falkenstein** | ~315.000 Turns ≈ **1.300 Paare** |
| Qwen3.8-27B | dicht · Apache 2.0 | 1 × 96 GB | GEX131 | wie oben |
| gpt-oss-120b | 117B MoE (5B aktiv) · Apache 2.0 | 1 × 96 GB (MXFP4) | GEX131 | ~864.000 Turns gegen IONOS |
| Mistral Large 4 | ~1T MoE | weit über einem Hetzner-Server | — | — |

Dazu kommt, was keine Rechnung zeigt: ein einzelner Server ohne Ausfallsicherheit (für Redundanz doppelt), Modell-Updates, Monitoring, Lastspitzen — für ein Ein-Personen-Projekt ein eigener Arbeitsbereich. Die Lizenz von Medium 3.5 („Modified MIT") ist laut Ankündigung kommerziell nutzbar; der Lizenztext im Hugging-Face-Repository ist vor jeder Entscheidung zu prüfen.

**Lesart:** Medium 3.5 ist der strategische Ausweg — das einzige Modell, das unsere Eröffnungsweiche nachweislich hält (50/50), und seine Abkündigung bei Mistral (Retirement 30.04.2027) spielt beim Selbstbetrieb keine Rolle. Die kleineren Modelle passen auf einen Server in Deutschland, aber unsere Learnings (Schablone, Instruction-Echo, Regelbudget) sprechen gegen sie, solange sie nicht gemessen sind. **Messen kostet Cent über die API desselben Gewichts — erst dann über Hardware reden.**

---

## 5 · Einschätzung für raumzuzweit

- **Was zählt, in dieser Reihenfolge:** rote Linien (Krise, Sycophancy, Sprecherzuschreibung, Eröffnungsweiche) → Datenweg → Sprachqualität (Grenzen mit Grund, keine Schablone) → Kosten → Haltbarkeit (Retirement, Alias).
- **Sofort, unabhängig von S144:** Produktion von `mistral-large-latest` auf eine gemessene, gepinnte ID umstellen. Naheliegend als Brücke: `mistral-medium-3-5` (Weiche 50/50, 0/50 erfundene Marken; abgekündigt, aber bis 30.04.2027 verfügbar).
- **Kandidaten für S144c:** A Medium 3.5 · B Sonnet 5.5 · C Haiku 5.5 · D Large 4 — ergänzt um **deutsch gehostete offene Modelle** (Qwen3.8-27B, gpt-oss-120b über IONOS), weil sie dieselben Gewichte sind, die wir selbst betreiben könnten. Die Messung beantwortet dann zugleich die Self-Hosting-Frage.
- **Wenn ein US-Modell die Messung klar gewinnt:** Weg über die EU-Region (Bedrock Frankfurt / OpenAI EU) als eigener Workstream (F3), nicht die Direkt-API.

---

## 6 · Teil 2 — Messung (nach S144c)

*Folgt: Verstöße je Szenario mit Beleg, Stilpaare, gemessene Kosten je Lauf.*

---

## Quellen

Preise und Verfügbarkeit Stand 07.11.2026: Anthropic (Modellübersicht, Ankündigung Opus 5.5), Mistral (Changelog, Modellseiten, Pricing), OpenAI (API-Changelog; EU-Datenresidenz), Hetzner (GPU-Server-Matrix), OVHcloud (AI-Endpoints-Katalog), Scaleway (Generative APIs), Vergleich europäischer LLM-APIs (wz-it.com), Medium-3.5-Hardware (vrlatech.com).
