# Sprintplan PRV-5 · Phasen-Komposition, Pilot `einzel`

Basis: `main` nach PRV-4. Branch `prv5-phasen-einzel`.

## Befund vorab (gemessen, DE, nach PRV-4)

| Teil | Zeichen | ≈ Token |
|---|---|---|
| Kern (Rolle, Haltung, Regeln, Übergänge, Merkposten/NOTE, Kapitel-Mechanik, Krise …) | 12 008 | 3 530 |
| Kapitel 1 · Ankommen & Landkarte | 4 893 | 1 440 |
| Kapitel 2 · Herzstücke | 4 266 | 1 255 |
| Kapitel 3 · Rate-Runde | 2 158 | 635 |
| Kapitel 4 · Klartext (inkl. Umformung, CLOSURE) | 8 855 | 2 605 |
| Nachklang | 803 | 235 |
| Wiedereinstieg | 587 | 175 |
| **heute je Zug** | 33 632 | **9 890** |
| **mit Phasen je Zug** | 12–21k | **4 200–6 300 (−36 … −57 %)** |

Cache: Der Kern allein liegt unter der Cache-Mindestlänge von Haiku (4 096 Token). Der Breakpoint sitzt deshalb hinter dem Phasenmodul (Kern+Modul ≥ 4 096 in allen Kapiteln außer knapp Kap. 3); ein Kapitelwechsel kostet einmal einen Cache-Aufbau. Ein zusätzlicher Breakpoint am Kern schadet nicht (wird bei < Mindestlänge ignoriert).

## Phase (deterministisch aus dem Verlauf, nicht aus UI-Zustand)

Kapitel = größtes von: 1 + höchste `[[CHAPTER-n]]`-Marke in Begleiter-Nachrichten · `[Weiter mit Kapitel n.]` · Panel-Ergebnisse als Untergrenze (RANKING-RESULT ⇒ ≥ 2; PARTNER-RANKING/-GUESS ⇒ ≥ 3). Nach CLOSURE-BLOCK bzw. `[Rückkehr nach Abschluss …]` ⇒ Nachklang. Ist die letzte Nachricht der Person `[Rückkehr in die laufende Auftragsklärung …]`, kommt der Wiedereinstieg-Block zum Kapitelmodul dazu. So rechnen App und Eval gleich (der Eval kennt kein `chat.kapitel`).

## Schritte

| # | Schritt | Test |
|---|---|---|
| 1 | Korpus DE/EN: `sessions/einzel.md` → `sessions/einzel/{kern,kapitel-1..4,nachklang,wiedereinstieg}.md`; Build erzeugt je Datei einen Export; der bisherige Gesamttext bleibt als Verkettung (Golden, Struktur-Brücke, Rückfall) byte-gleich. | Generat ≡ Quellen, Golden einzel unverändert |
| 2 | `core/policies/phasen.js`: `phaseEinzel(messages)` | Unit: jede Grenze, Wiedereinstieg, Nachklang, Panel-Untergrenze |
| 3 | Komposition/Def: `sysBloecke(ctx, phase)` → `[kern, modul]`; Engine nutzt es, wenn vorhanden; `sysPrompt(ctx)` bleibt der Gesamttext | Engine-Unit: Systemtext je Kapitel, Verlauf unberührt |
| 4 | Provider: System als Array — Anthropic zwei Textblöcke (Breakpoint am Modul, zusätzlich am Kern), OpenAI-kompatibel zu einem Text verbunden | Provider-Unit |
| 5 | Eval: Runner rechnet die Phase wie die Engine; Schalter `phasenAus` (Gesamttext = Stand vorher) für A/B; Kanarie Token je (einzel, Phase, Sprache) ≤ 6 500 | Unit, Kanarie |
| 6 | Eval-Paket `prv5` | Smoke |

## Merge-Regel

Phasen nicht schlechter als Gesamttext in allen Paket-Szenarien (J8 bereinigt, Rauschen wie PRV-4 begründet), kein Echo; Token je Zug ≤ 6 500.
