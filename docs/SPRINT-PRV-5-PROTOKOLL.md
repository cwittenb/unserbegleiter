# Sprintprotokoll · PRV-5 — Phasen-Komposition, Pilot `einzel`

**Datum:** 08.11.2026 · **Branch:** `prv5-phasen-einzel` (von `main` nach PRV-4) · Plan: `docs/SPRINTPLAN-PRV-5-phasen-einzel.md` · Entscheidungen Cars10: nur aktuelles Kapitel; A/B + 3 Phasen-Szenarien.

## 1 · Ergebnis Größe (Token ≈ Zeichen/3,4)

| | gesamt vorher | Kern | Kap. 1 | Kap. 2 | Kap. 3 | Kap. 4 | Nachklang |
|---|---|---|---|---|---|---|---|
| DE | 9 892 | 3 756 | 5 206 (−47 %) | 4 794 (−52 %) | 4 391 (−56 %) | 6 360 (−36 %) | 3 992 (−60 %) |
| EN | 9 804 | 3 716 | 5 177 (−47 %) | 4 755 (−52 %) | 4 327 (−56 %) | 6 305 (−36 %) | 3 941 (−60 %) |

Kern < 4 096 Token (Haiku-Cache-Minimum): Der Breakpoint am Modul cacht Kern+Modul; ein Kapitelwechsel kostet einmal einen Cache-Aufbau. Kap. 3 und Nachklang liegen knapp darüber.

## 2 · Mechanik

| Ort | Änderung |
|---|---|
| `sessions/einzel/NN-<teil>.md` (DE/EN) | `einzel.md` in Teile geschnitten: kern, kapitel-1, kapitel-2, krise, kapitel-3, kapitel-4, nachklang, wiedereinstieg, start. Verkettet = Gesamttext (Build prüft das). DE byte-gleich; **EN**: der Krisen-Vorrang stand mitten in einer Kapitel-2-Zeile und hat jetzt seine eigene Zeile wie in DE (Golden EN einzel neu). |
| `build-korpus.js` | Sessions mit `teile` → `klaerungsPrompt` (Gesamttext) + `klaerungsTeile` (Objekt). |
| `core/policies/phasen.js` (neu) | `phaseEinzel(messages, steuer)`: Kapitel aus `[[CHAPTER-n]]`, `[Weiter mit Kapitel n.]`, Panel-Untergrenzen (RANKING-RESULT ⇒ 2, PARTNER-GUESS ⇒ 3); Nachklang nach `[Rückkehr nach Abschluss …]`; Wiedereinstieg, wenn er die letzte Nachricht ist. `bloeckeEinzel`: Kern = kern + krise; Modul = Kapitel (+ Startsatz in Kap. 1, + Wiedereinstieg) bzw. Nachklang. |
| Katalog / Komposition / Def | `einzel.phasen: "einzel"`; Def trägt `sysTeile`; Komposition baut `sysBloecke(ctx, messages)`. `sysPrompt` bleibt der Gesamttext (Golden, Struktur-Brücke). |
| Engine | nutzt `sysBloecke`, wenn vorhanden. |
| Provider / Worker | System darf `[Kern, Modul]` sein: Anthropic mit Cache zwei Blöcke mit Breakpoint, sonst verbunden; OpenAI-kompatibel verbunden; Worker akzeptiert 1–3 Strings (`core/llm/system.js`). |
| Eval | Runner und Batch rechnen die Phase je Zug wie die Engine; Schalter `phasenAus`; Szenarien PHA-02/03/04 (+EN, mit fester Vorgeschichte über die Kapitelgrenze); Paket `prv5`. Die Struktur-Variante des Eval misst weiter den Gesamttext. |

## 3 · Tests

Neu `prv5-phasen-einzel.spec.js` (29): Phase je Grenze/Wiedereinstieg/Nachklang (DE/EN), Teile = Gesamttext, Kern ohne Kapitel, Modul genau ein Kapitel, **Sperrklinke ≤ 6 500 Token je Phase**, CLOSURE nur in Kap. 4, Engine (Kern gleich, Modul wechselt), Provider, Worker-Prüfung. Angepasst: Fassade +`klaerungsTeile`, Template-Verzeichnis, Katalog (`phasen`), zwei UI-Tests lesen den Systemtext als String oder Blöcke, Szenarienzahl 47 → 50. Suite 3 225 grün, Kern `ede9b1bd`.

## 4 · Eval (bei dir)

Paket `prv5-eval_…_ede9b1bd.html`: SCA-01, SPA-01, PHA-02..04 (je DE/EN); Haiku n=5, Sonnet n=3, je Phasen vs. aus. Merge, wenn Phasen nicht schlechter (Rauschen wie bei PRV-4 begründet) und kein Echo.

## 5 · Eval-Ergebnis (08.11.2026) — nicht gemergt, Nachmessung PRV-5b

`evals/ergebnisse/prv5/prv5_alle.json`, Kern ede9b1bd. Verstöße, J8-bereinigt (Judge schreibt „keine Zahl genannt“ und markiert trotzdem):

| Szenario | Haiku Phasen | Haiku aus | Sonnet Phasen | Sonnet aus |
|---|---|---|---|---|
| SCA-01, SPA-01, PHA-02, PHA-03 (DE/EN), PHA-04 DE | 0 | 0 (PHA-04 DE: C4 2/5) | 0 | 0 |
| SPA-01-EN C2 (Zahlenwert genannt) | **3/5** | 1/5 | **1/3** | 0/3 |
| PHA-04-EN C4 (mehrere Fragen) | 2/5 | 0/5 | 2/3 | 0/3 |

**Befund 1 — Zahlen-Regel:** Im Gesamttext steht „Werte qualitativ, keine Zahlen“ dreimal (Kapitel 2, Kapitel 4, Nachklang). Mit Phasen sieht Kapitel 2 sie einmal — die EN-Antworten nannten die „3“ häufiger. Wiederholung über Abschnitte hinweg war im Gesamttext tragend, ohne dass sie so gemeint war.

**Befund 2 — PHA-04 C4 ist ein Szenariofehler:** Schritt 2d schreibt genau diese Doppelfrage vor („nicht verhandelbar?“ Und: „fehlt etwas?“), und REGELN erlaubt „höchstens kleine Gruppe“. Der Check bestrafte also Korpustreue — mit Phasen steht 2d am Anfang des Moduls und wird wörtlicher befolgt. C4 v2 zählt die vorgesehene Doppelfrage als eine.

Nach S136 nicht gemergt. **PRV-5b** (gleicher Branch, eigener Commit): Zahlen-Regel einmal im Kern (gilt in jeder Phase, auch im Gesamttext); PHA-04 v2. Nachmessung mit Paket `prv5b` (SPA-01, PHA-04, je DE/EN).

## 6 · Nachmessung PRV-5b und Merge (08.11.2026)

`evals/ergebnisse/prv5/prv5b_alle.json`, Kern 241f2e4d. Gewichtung nach Vorgabe Cars10: **DE vor EN**.

| Szenario | Haiku Phasen | Haiku aus | Sonnet Phasen | Sonnet aus |
|---|---|---|---|---|
| SPA-01 (DE) | 0 | 0 | 1 (C1: zwei Spannungen) | 0 |
| PHA-04 (DE) | 1 | 0 | 0 | 1 |
| SPA-01-EN C2 | 2 | 2 | 0 | 2 |
| PHA-04-EN C4 | 4 | 2 | 0 | 2 |

DE: Phasen 2, aus 1 — Rauschen. Zahlen-Befund behoben: SPA-01-EN C2 jetzt in beiden Armen gleich und überwiegend J8 (Judge: „keine Zahl wörtlich genannt“). PHA-04 C4 bleibt unzuverlässig: Der Judge wertet auch eine **Folgefrage in der nächsten Nachricht** als Verstoß (sonnet-aus #3) — der Check misst über Nachrichtengrenzen hinweg; Eval-Backlog (eigener Strang). **Gemergt.**
