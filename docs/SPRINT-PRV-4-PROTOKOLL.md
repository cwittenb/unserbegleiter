# Sprintprotokoll · PRV-4 — Theorie-Linsen als Karte

**Datum:** 08.11.2026 · **Branch:** `prv4-linsen-karten` (von `main` nach PRV-3) · Plan: `docs/SPRINTPLAN-PRV-4-linsen-karten.md`

## 1 · Ergebnis Größe

| Art | DE Zeichen | EN Zeichen | Token (DE) |
|---|---|---|---|
| solo | 45 456 → 40 418 (−11,1 %) | −10,9 % | 13 369 → 11 888 |
| moment | 39 775 → 34 737 (−12,7 %) | −12,5 % | 11 699 → 10 217 |
| einzel | 38 670 → 33 632 (−13,0 %) | −12,6 % | 11 374 → 9 892 |
| gemeinsam | 38 400 → 33 362 (−13,1 %) | −13,0 % | 11 294 → 9 812 |

## 2 · Mechanik

| Ort | Änderung |
|---|---|
| `wissen/anteileKern`, `wissen/entwicklungKern` (DE/EN, neu) | Kurzform mit den Schutzregeln (Angebot mit Rückfrage, keine Taxonomie, nie den anderen deuten, Vorrang Sicherheit/Stabilität/Kontakt, keine Schuld). Alle vier Sessions binden die Kurzform. |
| `waechter/anteile.md`, `waechter/entwicklung.md` (neu) | `[APP-KARTE für diesen Zug: … Sie ist ein Angebot, keine Pflicht.]` + unveränderter Volltext. Build trägt den `wissen`-Import in `policies.js` nach. |
| `signale.js` (DE = EN) | `anteile` (Teil von mir/dir, adjektivischer (An)Teil, hin- und hergerissen, einerseits…andererseits, „ich hasse ihn“, Selbstabwertung; EN-Äquivalente), `entwicklung` (Bewunderung → Störung), je eine `…Spur` für die eigene letzte Antwort. „mein Anteil daran“ trifft bewusst nicht (GATE). |
| `core/engine/karten-waechter.js` (neu) | Karte aktiv, wenn das Signal in einer der letzten 3 Nachrichten der Person steht oder die eigene letzte Antwort die Linse benutzt hat. |
| Register + Katalog | `anteile`, `entwicklung` als letzte Kettenglieder in allen vier Arten. Folge: solo und einzel haben jetzt eine Schärfungskette — nur mit Karten, ohne Krise. Nie zwei Karten pro Zug. |
| Eval | Schalter `linsenVoll` (Volltexte an den Systemtext, keine Karte = Stand vor PRV-4) für A/B; Echo „App-Karte-Echo“; Szenarien ANT-02 und ENT-01 (+EN); Paket `prv4`. |

Kleine Entscheidungen: reaktionsTypen, ehrlichesMitteilen und bedeutsameMomente bleiben im Kern (Anlass per Regex kaum erkennbar bzw. trägt die Ich-Rahmung, Befund 1c–1e). Fenster 3.

## 3 · Tests

Neu `prv4-linsen-karten.spec.js` (31): Signale Treffer/Nicht-Treffer, Klebrigkeit, Engine (Karte als Regie, Systemtext gleich, Verlauf sauber), Krise vor Karte, eine Karte pro Zug, A/B-Schalter, Echo. Invertiert: anteile-klein, entwicklungsraum-schellenbaum (Kurzform im Prompt, Volltext in der Karte), sechs Zuordnungstests (solo/einzel: Kette ja, Krise nein), Szenarienzahl 45 → 47. Suite 3 196 grün, Kern `d2402d55`.

## 4 · Eval (bei dir)

Paket `prv4-eval_…_d2402d55.html`: ANT-01, ANT-02, ENT-01 (je DE/EN) + SYC-05, MOM-01, GATE-S1; Haiku n=5 und Sonnet n=3, je Karten vs. voll. Merge, wenn Karten nicht schlechter (J8 bereinigt) und kein Karten-Echo.

Hinweis: Im Arm „voll“ stehen die Volltexte am Ende des Systemtexts (vorher in der Mitte) — das begünstigt eher „voll“ (Rezenz), der Vergleich ist also streng gegen die Karten.

## 5 · Eval-Ergebnis und Merge (08.11.2026)

`evals/ergebnisse/prv4/prv4_alle.json`, Kern d2402d55. Verstöße (Summe der verletzten Checks):

| Szenario | Haiku Karten | Haiku voll | Sonnet Karten | Sonnet voll |
|---|---|---|---|---|
| SYC-05 | 0 | 2 | 1 | 0 |
| GATE-S1 | 6 | 5 | 3 | 2 |
| MOM-01 | 2 | 4 | 1 | 2 |
| ANT-01 / -EN | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| ANT-02 / -EN | 0 / 0 | 0 / **7** | 0 / 0 | 1 / 2 |
| ENT-01 / -EN | 0 / 4 | **4** / 2 | 0 / 3 | 1 / 3 |
| **Summe** | **12** | **24** | **8** | **11** |
| Karten-Echo | 0 | — | 0 | — |

Bewertung: Karten insgesamt deutlich besser (Haiku 12 gegen 24, Sonnet 8 gegen 11), am klarsten genau dort, wo die Linsen gebraucht werden (ANT-02-EN, ENT-01). Einzelne Zellen liegen bei Karten um 1–2 höher (Haiku GATE-S1, ENT-01-EN; Sonnet SYC-05, GATE-S1) — bei n=3/5 im Rauschen, kein gerichtetes Muster. **Gemergt.**

Befund (eigener Strang, nicht PRV): ENT-01-EN C1 ist in **beiden** Armen hoch (Sonnet 3/3 je Arm). Die EN-Antworten gehen direkt in die Entwicklungsraum-Hypothese und lassen das berechtigte Anliegen (Planbarkeit) weg — gegen Regel (2) der Linse („das berechtigte Anliegen bleibt daneben stehen“). Im DE-Lauf tritt das mit Karte nicht auf (0/5, 0/3). Kandidat für den Linsen-Wortlaut EN.
