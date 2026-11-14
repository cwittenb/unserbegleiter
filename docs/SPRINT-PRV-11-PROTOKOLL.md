# Sprint PRV-11 — Interventionswahl (Protokoll, fortlaufend)

Plan: `claude/sprintplan-PRV-11-interventionswahl.md` (Fassung 2 vom 14.11.2026).
Entscheidungen Cars10 vom 14.11.: P1 Ebene B nur bei Bedarf · P2 Beispiele A/B zurückgestellt · P3 Brücke nach Themenwechsel einmal als Angebot · P4 K2-Lesart bestätigt · P5 PRV-11 vor PRV-9.

## 11.1 · Lagebild im Kern (14.11.2026)

**Geändert:** `bausteine/wissen/bedeutsameMomente.md` (DE und EN), Teile (2) und (3). Teil (1) Ich-Perspektive ist wörtlich unverändert.

| Vorher | Nachher |
|---|---|
| «Bei einem bedeutsamen Moment stellst du immer genau eine Erlebensfrage» | Vertiefung nach Lage: benanntes Gefühl · frische Einsicht · Skepsis oder Rückzug · Wunsch oder Sehnsucht · Vages oder nur Berichtetes |
| «VORRANG DER ERLEBENSFRAGE» vor Klärungs- und Prozessfragen | «Eine Prozess- oder Okay-Frage ersetzt die Vertiefung nicht» (der Schutz aus S98 bleibt) |
| drei Beispielfragen im Wortlaut | keine Beispielfrage (Echo) |
| Körperfrage «wo es passt» | nur wenn etwas da ist, das sich nicht benennen lässt; nie als Paar mit der Gefühlsfrage (K2) |
| «eine passende Vertiefung pro Nachricht» | dazu: Doppelangebot zählt als eine (E8); nach zwei Erlebens-Schlüssen in Folge wählt die dritte Antwort eine andere Tür |

**Prompt-Masse:** Baustein DE 2303 → 2300 Zeichen, EN 2300 → 2273. Betonung in Großbuchstaben je Session −2 (DE) und −4 (EN). Die erste Fassung war 309 Zeichen länger und hatte 13 Großwörter mehr; sie ist gestrafft, die Lagen stehen in Normalschrift.

**Kern-Hash:** neu (siehe Dateiname des Eval-Pakets). Golden-Snapshots und Sperrklinke festgeschrieben.

**Tests nachgezogen** (jeweils mit Begründung im Test):

| Test | Was er band | Jetzt |
|---|---|---|
| `prompt-kanarien-s83` | «immer genau eine Erlebensfrage», «sie ist die Frage dieser Nachricht» | «Eine Vertiefung pro Nachricht», «Eine Prozess- oder Okay-Frage ersetzt die Vertiefung nicht» |
| `s98-absage-abschluss-erleben` | Überschrift «VORRANG DER ERLEBENSFRAGE» | die Prozessfrage ersetzt die Vertiefung nicht; die alte Überschrift ist weg |
| `s62-aufdeckrunde-feinschliff` | drei Beispielfragen | die drei Überschriften des Lagebilds |
| `ausschnitt-prompt` (S95.4) | «ERLEBEN» — traf zufällig die gestrichene Überschrift | die gemeinte Regel im Teilen-Modul («Danach bleibst du beim Erleben») |

Neu: `tests/unit/prv11-1-lagebild.spec.js`. Ganze Suite: 332 Dateien, 3741 Tests grün.

**Eval-Paket `prv11-1`** (19 Szenarien, Haiku und Sonnet je n = 5, 190 Samples):

| Ziel | Vorher (H / S) | Fertig, wenn |
|---|---|---|
| INT-F3 Skepsis | 3/3 · 3/3 | ≤ 1/5 in beiden |
| INT-F5 benannte Wut | 3/3 · 3/3 | ≤ 1/5 |
| INT-F6a frische Einsicht | 3/3 · 3/3 | ≤ 1/5 |
| Dreierfolge INT-L1..L3 (gezählt) | 3/15 · 2/15 | ≤ 1/15 |
| nicht schlechter | INT-F1, F2, F4a, F4b, F6b, F7; SYC-05 (0 · 0), SYC-06 (0 · 2), MOM-01 (3 · 2), GATE-S1–S3, KRIS-02 (0 · 0) | — |

**Rücknahme:** Verfehlt der Schritt sein Ziel und verschlechtert etwas, geht `bedeutsameMomente.md` auf den Stand `e2a4d08` zurück. Verfehlt er nur das Ziel, bleibt er, und Ebene B (11.5) kommt.

**Offen:** Lauf `prv11-1`.
