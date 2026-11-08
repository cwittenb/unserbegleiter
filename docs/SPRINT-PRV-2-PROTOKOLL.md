# Sprintprotokoll · PRV-2 — Dedup (geschrumpft) · Grundgesetz gestrichen

**Datum:** 08.11.2026 · **Branch:** `prv2-dedup` (auf `prv1d-schablone-ich` — Kette: main → 1d → 2) · **Kern:** `e57a2ab732027782`

## 1 · Befund: Die Redundanz ist kleiner als geplant

Der Plan rechnete mit −3–5k Zeichen Dedup je Prompt (Architekten-Zählung: Ich-Rahmung 8–11×, Sprecher 13–15×, „Marke allein in der letzten Zeile“ 11×). Nachgemessen auf dem Stand nach PRV-1d:

| Session (DE) | Wörter | wortgleich doppelt (10-Wort-Schindeln) |
|---|---|---|
| solo | 6 635 | 48 Wörter (0,7 %) |
| moment | 5 786 | 28 (0,5 %) |
| einzel | 5 537 | 40 (0,7 %) |
| gemeinsam | 5 432 | 104 (1,9 %) |

- Ich-Rahmung / Urteil: durch PRV-1b–1d bereits auf je eine Quelle zusammengeschrumpft.
- Sprecher (gemeinsam): 5 Erwähnungen, ein zusammenhängender Baustein – kein Duplikat; die hohe Zählung kam von Namen.
- „Marke allein in der letzten Zeile“ (einzel 11×): jede Stelle steht **am Auslöser** ihrer Marke (SCALE-SAFETY, SLIDERS, CHAPTER-n, RANKING …). Die Lehre „eine Ordnungsregel gehört an den Auslösepunkt“ (learnings, mk.prozess*) spricht gegen Zusammenlegen; Gewinn wären ~300 Zeichen bei echtem Risiko für Marken-Fehler.
- JSON-Formatsatz („zwischen den Marken steht reines JSON …“) 3–4× in gemeinsam/moment: ebenfalls am Auslöser; bleibt.

## 2 · Umgesetzt (wortgleiche Doppelungen, beweisbar ohne Informationsverlust)

| Stelle | Änderung |
|---|---|
| `wissen/spiegelMittel` | `{{grundsaetze.SPIEGEL_ICH}}` entfernt – wo der Baustein steht (einzel, gemeinsam), trägt der haltungsKern denselben Text bereits |
| `wissen/entwicklungsRaum` | Rückzugs-Satz (wortgleich mit anteileSprache, das in jeder Session daneben steht) → „Bei Ablehnung gilt dasselbe wie bei der Anteile-Sprache.“ |

Gewinn: −200 bis −600 Zeichen je Prompt. 1 Kanarien-Pin umgestellt. Suite **3 155 grün**, Build grün.

## 3 · Gestrichen: das „Grundgesetz“ (8–12 rote Linien oben)

Kleine Entscheidung mit Begründung, rückholbar: Ein zusätzlicher Block oben wiederholt Regeln, die schon da sind – er macht den Prompt länger, und seine Wirkung hängt an Gewichtung durch Position. Dagegen sprechen die eigenen Daten (MRV: Regel im Korpus verschoben −0,13) und die Literatur (Control Illusion: Prioritätsmarken stellen keine verlässliche Hierarchie her). Was nach den Daten wirkt, ist **Rezenz** – das ist PRV-3. Wer das Grundgesetz zurückwill: nach PRV-3 messen, ob die rote-Linien-Familien (KRIS, ESK, AUF, LEAK) noch Lücken haben.

## 4 · Eval

Keiner eigens nötig: Beide Änderungen entfernen nur Text, der wortgleich an anderer Stelle desselben Prompts steht. Der 1d-Eval läuft auf dem 1d-Artefakt; PRV-2 wird mit 1d zusammen gemergt, wenn 1d besteht.
