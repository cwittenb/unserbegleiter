# Sprintprotokoll · PRV-0 — Vermessung und Sperrklinke der Prompt-Masse

**Datum:** 07.11.2026 · **Basis:** `main` @ `c1f2adc` (Modellentscheidung 6.5) · **Kern:** `07882d74212d7dfa` (unverändert — reine Werkzeugänderung, kein Korpus, keine Engine) · **Patch:** `patch-prv0-prompt-masse-sperrklinke.mjs`

Serie: PRV (Prompt-Verdichtung). Review: `docs/REVIEW-PRV-prompt-verdichtung.md` · Plan: `sprintplan-PRV-prompt-verdichtung.md`.

## 1 · Warum

Jeder Zug schickt 12–14k Token Systemtext, unabhängig von der Phase; Regeln stehen bis zu 11× darin, dazu 230–400 Betonungen und Sprint-Referenzen. Drei Korpus-Sprints (S145, S145b, S146) haben Haikus Prädikats-Eröffnung nicht bewegt — das Modell erreicht der Regelzuwachs nicht mehr (IFScale: Haiku 78 % Regeltreue bei 50 Regeln, 43 % bei 100; Fehlerart Auslassung). Bevor ein Sprint verdichtet, braucht die Serie ein Maß, das sagt, **was** sich bewegt hat — der Golden-Snapshot aus MOD-0 sagt nur, **dass**.

## 2 · Gebaut

| Datei | Inhalt |
|---|---|
| `scripts/prompt-masse.js` | `messePrompt(text, sprache)` (reine Funktion) und `baueMasse(sprache)` über `baueSystemText` (App-Pfad, Festwerte Anna/Bernd). Kennzahlen: Zeichen, Token-Schätzung (÷3,4), Zeilen, Zeilen > 600 Zeichen, Betonungs-CAPS (3+ Großbuchstaben, ohne Protokoll-Tokens `X-BLOCK`/`END`/`[[MARKE]]`/`X-RESULT`/`X-CONTEXT`), GENAU/EXACTLY, VERSTOSS/VIOLATION, Sprint-Referenzen, Block-Vorlagen-Zeichen, Treffer je Leitphrase. CLI mit Tabelle; `--schreibe` schreibt die Sperrklinke. |
| `tests/fixtures/golden/prompt-masse-{de,en}.json` | Sperrklinke je Art × Sprache (inkl. `qualitytime`). |
| `tests/unit/prv0-prompt-masse.spec.js` | 5 Tests der reinen Funktion + je Art und Sprache ein Sperrklinken-Test: **gewachsen** → rot mit „begründen oder zurücknehmen“; **still gesunken** → rot mit „mit `--schreibe` festschreiben“ (T1b-Muster auf Kennzahlen). |
| `docs/REVIEW-PRV-prompt-verdichtung.md`, `sprintplan-PRV-prompt-verdichtung.md` | Befund, Recherche, Lösungswege, Entscheidungen F1–F7, Plan PRV-0…PRV-8. |

Leitphrasen (DE / EN): „allein in der letzten Zeile“ / „alone on the last line“ · Richterposition / judge · Ich-Rahmung / I-fram… · Hypothese / hypothes… · Not-Frage / „distress are you in“ · erfinde… / invent…

Gemessen wird der Text, den das Modell sieht — `<!-- -->`-Kommentare der Quellen zählen nicht (deshalb VIOLATION im EN-Prompt 0–1, in den Quellen 9–19).

## 3 · Vorher-Werte (Basis für PRV-1 ff.)

### DE

| Session | Zeichen | ≈Token | Zeilen | >600 Z. | CAPS | GENAU | VERSTOSS | Sprint-Refs | Block-Vorlagen | Wiederholungen |
|---|---|---|---|---|---|---|---|---|---|---|
| solo | 48 949 | 14 397 | 63 | 21 | 389 | 4 | 0 | 22 | 478 | Marke 1 · Richter 3 · Ich 3 · Hypothese 5 · Not 1 · erfinde 6 |
| moment | 41 721 | 12 271 | 58 | 20 | 366 | 3 | 0 | 15 | 344 | Marke 2 · Richter 3 · Ich 1 · Hypothese 2 · Not 1 · erfinde 2 |
| einzel | 40 202 | 11 824 | 72 | 22 | 229 | 10 | 0 | 2 | 252 | Marke 11 · Richter 3 · Ich 2 · Hypothese 6 · Not 2 · erfinde 2 |
| gemeinsam | 40 868 | 12 020 | 61 | 19 | 294 | 8 | 0 | 6 | 972 | Marke 6 · Richter 3 · Ich 2 · Hypothese 4 · Not 2 · erfinde 4 |
| qualitytime | 4 190 | 1 232 | 11 | 2 | 32 | 0 | 0 | 1 | 156 | Richter 1 · Hypothese 1 |

### EN

| Session | Zeichen | ≈Token | Zeilen | >600 Z. | CAPS | EXACTLY | VIOLATION | Sprint-Refs | Block-Vorlagen | Wiederholungen |
|---|---|---|---|---|---|---|---|---|---|---|
| solo | 47 310 | 13 915 | 63 | 20 | 403 | 4 | 1 | 22 | 488 | Marke 1 · judge 7 · I-fram 3 · hypothes 6 · distress 1 · invent 9 |
| moment | 40 230 | 11 832 | 58 | 21 | 381 | 3 | 0 | 15 | 344 | Marke 3 · judge 7 · I-fram 1 · hypothes 3 · distress 0 · invent 5 |
| einzel | 39 431 | 11 597 | 72 | 21 | 226 | 10 | 0 | 2 | 252 | Marke 11 · judge 7 · I-fram 2 · hypothes 7 · distress 1 · invent 4 |
| gemeinsam | 39 365 | 11 578 | 61 | 20 | 301 | 8 | 0 | 6 | 972 | Marke 6 · judge 7 · I-fram 2 · hypothes 5 · distress 0 · invent 5 |
| qualitytime | 4 044 | 1 189 | 11 | 3 | 34 | 0 | 0 | 1 | 156 | judge 3 · hypothes 1 |

Lesart: Die Block-Vorlagen selbst sind klein (0,3–1 kB); die Masse der Format-Prosa liegt in den „Regeln: …“-Zeilen dahinter, die als lange Zeilen (> 600 Z.) zählen. 19–22 lange Zeilen je Prompt tragen den Großteil des Texts.

## 4 · Tests und Build

- Suite: 306 Dateien, **3 098 Tests grün** (Ebene 1: 2 881 · Engine: 26 · Worker: 187 · e2e: 4); davon neu 17 (`prv0-prompt-masse.spec.js`).
- Build: `npm run build` grün, Kern `07882d74212d7dfa` (unverändert), Eval-Artefakt `dist/paarbegleitung-eval_*.html` gebaut.

## 5 · Entscheidungen

| Nr. | Entscheid |
|---|---|
| F1 a | Reihenfolge Redaktion (PRV-1/2) → Transport (PRV-3) → Guideline-Matching (PRV-4) → Phasen (PRV-5–7) |
| F2 | Artefakt-Eval (Haiku + Opus-Judge, n=3, betroffene Familien) nach jedem Korpus-/Engine-Schritt; Vollmatrix lokal nach PRV-2, 4, 5, 7 |
| F3 b | PRV-1 entfernt Rauschen **und** formuliert Negativregeln positiv mit Grund |
| F4 a | `<regie>`-Block an der letzten User-Nachricht (Kopie, nie persistiert); Echo-Wächter im Eval (Befund Regie-Echo Medium, modellentscheidung.md §6.5) |
| F5 a | PRV-8 Schema-Zwang nur am deterministischen Abschlusszug eingeplant |
| F6 | Phasen-Pilot einzel → gemeinsam → solo/moment |
| F7 a | Eval-Sonde Selbst-Checkliste (nicht gestreamt) nach PRV-3 |
| klein | CAPS-Schwelle 3 Buchstaben (NIE/KEIN zählen); Protokoll-Tokens zählen nicht; Sperrklinke meldet Wachsen und stilles Schrumpfen |

## 6 · Nächster Schritt

PRV-1 (Redaktion A): Sprint-Referenzen und Begründungsprosa raus (Begründung bleibt als `<!-- -->` in den `.md`-Quellen; `build-korpus.js` bekommt Kommentar-Stripping im Fließtext), CAPS ≤ 1 je Regelzeile, Negativ → positiv mit Grund. Zielwerte für die Sperrklinke: CAPS ≤ 100 je Prompt, Sprint-Refs 0, −15–25 % Zeichen. Danach Artefakt-Eval GATE/SYC/ANT/KOR/SPA/AUF (Haiku, n=3) gegen diese Basis.
