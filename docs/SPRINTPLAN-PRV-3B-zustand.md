# Sprintplan PRV-3b · Zustandsobjekt im Zug-Hinweis

Basis: `main` nach PRV-3 (Zug-Hinweis reist als `regie` an der letzten Nachricht der Person, hinter dem Cache-Punkt).

## Ziel

In langen Sessions gehen Ablauf-Anweisungen im 12–14k-Token-Korpus unter: Marken werden wiederholt, Kapitel übersprungen, nach dem Wiedereinstieg wird Erarbeitetes neu gefragt. Ein kurzer, **deterministisch aus dem Verlauf abgeleiteter** Stand pro Zug steht dort, wo das Modell zuletzt liest.

## Was der Stand weiß (nur Ableitbares, keine Modell-Deutung)

Ablauf je Art aus dem Korpus (Reihenfolge der Marken und Blöcke):

| Art | Ablauf |
|---|---|
| einzel | Kap. 1: SCALE-SAFETY → SLIDERS → CHAPTER-1 · Kap. 2: RANKING → (SLIDERS / PARTNER-RANKING / PARTNER-GUESS-CHANGE) → CHAPTER-2 · Kap. 3: PARTNER-RANKING → PARTNER-GUESS-CHANGE → CHAPTER-3 · Kap. 4 → CLOSURE-BLOCK |
| gemeinsam | REVEAL-A/B bzw. REVEAL → Phasen 0–4 → BASELINE → 5–6 → SCALE-CLOSING → 7 → CLARIFICATION-BLOCK |
| moment | CHOICE-CONNECT → META-REVEALED → BASELINE → GOAL-BLOCK → MOMENT-BLOCK |
| solo | keine Marken → kein Stand |

Quelle: Marken und Blöcke in den Assistant-Nachrichten des Verlaufs (dieselben Erkenner wie der Dispatch: `findeMarker`, `findeBlock`).

## Schritte

| # | Schritt | Test |
|---|---|---|
| 1 | `core/engine/zustand.js`: `staendeFuer(art)` (Ablauf-Tabelle) + `baueZustand(messages, ablauf)` → Zeilen. ≤ 4 Zeilen, Format `[APP-STAND: …]` (Klammerkonvention wie die Schärfung). | Unit je Art: leerer Verlauf, Kapitelgrenze, Wiedereinstieg, Marke doppelt |
| 2 | Korpus DE/EN: Stand-Texte als Bausteine (`bausteine/zustand/*.md`), keine Sprache im Code | Paritäts-Kanarie |
| 3 | Komposition: Def bekommt `zustand(messages, ctx)`; Engine und Eval-Runner hängen Stand **und** Schärfung zusammen als eine Regie an (Schärfung zuerst) | Engine-Unit: chat.messages unverändert, Systemtext je Zug gleich |
| 4 | Echo-Wächter „App-Stand-Echo“; Ratchet ≤ 4 Zeilen | Unit |
| 5 | Eval-Paket `prv3b` mit A/B-Schalter (Stand an/aus) | Paket-Smoke |

## Eval

Offen (siehe Fragen): Die bestehenden Szenarien sind 1–3 Züge lang; der Stand wirkt erst über viele Züge.

## Merge-Regel

Stand-an nicht schlechter als Stand-aus in allen Szenarien des Pakets, kein Stand-Echo; in den Langszenarien besser oder gleich. Sonst Rücknahme (S136).
