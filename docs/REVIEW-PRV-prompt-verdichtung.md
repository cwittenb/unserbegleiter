# REVIEW PRV · Prompt-Verdichtung — Befund, Recherche, Lösungswege

Stand: 2026-11-07 · Basis: `main` @ `d1c02b3` (S145b) · Zwei Agenten (Forscher: Stand der Technik im Web; Architekt: Code-Vermessung), eine Kritikrunde, danach Synthese.

## 1. Das Problem, vermessen

Alle vier Session-Arten schicken jeden Zug denselben Systemtext, unabhängig von der Gesprächsphase (gemessen über `baueSystemText`, Zeichen/3,4 ≈ Token):

| Session | Zeichen | ≈ Token | Zeilen (davon > 600 Z.) | längste Zeile | CAPS-Wörter | Sprint-Refs „(S96)“ | JSON-Block-Spezifikationen |
|---|---|---|---|---|---|---|---|
| solo | 48 579 | 14 300 | 61 (20) | 11 347 (TEILEN) | 276 | 23 | 0,8 kB |
| moment | 41 404 | 12 200 | 57 (19) | 5 914 | 252 | 16 | 7,4 kB |
| einzel | 39 832 | 11 700 | 70 (21) | 3 169 | 198 | 4 | 2,5 kB |
| gemeinsam | 40 551 | 11 900 | 60 (19) | 3 787 | 227 | 7 | 3,3 kB |

EN liegt jeweils 3–4 % darunter. Effektiv enthält jeder Prompt 150+ einzelne Anweisungen.

Was darin steckt (DE, Zeichen):

| Kategorie | Anteil | Beispiel |
|---|---|---|
| Phasenabhängige Dramaturgie, von der je Zug ~10 % gilt | 37–50 % (15–24k) | einzel: Kapitel 1–4 + Nachklang + Wiedereinstieg; solo: Einstieg, TEILEN/Türen (11k), Zeitleisten-Abschluss, Wortlaut-Abruf |
| Redundanz (gleiche Regel mehrfach) | 3–5k | „Marke allein in der letzten Zeile“ 11× (einzel), Urteil/Richterposition 4–7×, Ich-Rahmung 8–11×, Sprecher/Namen 13–15× (moment/gemeinsam) |
| Betonung ohne Information | 2–4k | 200–280 CAPS je Prompt, 12 „VERSTOSS“-Sätze, Sprint-Referenzen und Begründungsprosa („(S103, aus dem Lauf gelernt)“, „Zwei Gründe: …“) = Dev-Changelog im Modellprompt |
| Format/JSON, nur an einem Zugtyp nötig | 3,5–7,4k | GATE/EXCERPT/RECALL/TIMELINE (solo), CHOICE/GOAL/MOMENT (moment), NOTE/CLOSURE (einzel), REVEAL/CLARIFICATION/CHOICE (gemeinsam) |
| Theorie-Wissen, situativ auslösbar | ~10k (20–25 %) | `anteileSprache` 2,7k, `bedeutsameMomente` 3,1k, `entwicklungsRaum` 3,2k, `ehrlichesMitteilen`, `reaktionsTypen` |

Zusätzlicher Befund: Jede per-Zug-Schärfung wird heute an den Systemtext gehängt (`engine.js: system += zusatz`) → bei Anthropic ein voller Cache-Miss für jeden geschärften Zug (Präfix-Caching).

## 2. Was die Forschung sagt (belegt, sofern nicht anders markiert)

| Befund | Quelle | Folge für uns |
|---|---|---|
| Haiku 3.5: 98 % Regeltreue bei 10 Anweisungen, 78 % bei 50, 43 % bei 100; Fehlerart fast nur **Auslassung** (31:1) | IFScale, arXiv 2507.11538 | Unser Prompt liegt weit jenseits der Zone, in der Haiku zuverlässig ist; „Regel fehlt einfach“ ist das erwartete Symptom |
| Prompt-Erfolg fällt 0,57 (5 Regeln) → 0,21 (10 Regeln); eine Regel mit 97 % isoliert fällt auf 2 % neben fünf weiteren; Regelzahl erklärt r≈0,99 | ManyIFEval, arXiv 2509.21051 | „Budget ist fix“ ist genau das Datenmuster; Wiederholung hilft nicht, Zahl senken hilft |
| Reasoning-Modelle robuster, weil sie Regeln einzeln abhaken | ebd. | Kurze Vor-Planung als Experiment denkbar, für Haiku unbelegt |
| Lost-in-the-Middle am stärksten bei Prompts < 50 % des Fensters; Rezenz > Primacy | arXiv 2508.07479 | Mitte ist der schwächste Ort; wichtige Regeln an die Enden, Dramaturgie/Theorie in die Mitte |
| Ein einzelner GROSS-geschriebener Ausdruck zieht Attention (+9 Pp bei kleinen Modellen); Massen-CAPS verpufft | „Attention is Case-Sensitive“, arXiv 2608.03711 | 250 CAPS = kein Signal; auf eine Handvoll reduzieren |
| „Do not X“ primt X; Verletzungsrate steigt mit Baseline von X | arXiv 2601.08070 (1 Modell, 7B) | Literaturbeleg für die ST8/S133-Lehre „wer es nennt, führt es ein“; Negativregeln positiv mit Grund |
| Explizite Prioritätsmarken („A geht vor B“) stellen keine verlässliche Hierarchie her | Control Illusion, arXiv 2502.15851 | Ein „Grundgesetz oben“ wirkt nur zusammen mit Entrümpelung, nicht als Gewichtung |
| Anthropic 4.x-Doku: Betonungen zurücknehmen, „NEVER“ → „X nicht, weil …“, XML-Tags, Anweisung ans Ende bei langen Eingaben (bis +30 %); Caching bis 4 Breakpoints, Haiku 4.5 cacht erst ab 4 096 Token | platform.claude.com | Kernblock muss über der Cache-Mindestlänge bleiben |
| Algorithmische Kompression (LLMLingua & Co.) ist nur für Kontext belegt, nicht für Verhaltensregeln | Microsoft Research | **Nicht** einsetzen |
| Fine-Tuning/Distillation für aktuelle Haiku-Versionen nicht verfügbar | Anthropic | kein Weg |
| Praxis (Parlant, Nubank, Sierra): Policies **pro Zug selektiert** (Bedingung → Regel) oder auf Rollen verteilt; Qualität über Offline-Judge; In-line-LLM-Judge verdreifacht Latenz → gestuft (deterministisch → Klassifikator → Judge nur bei Grenzfall) | Parlant README, Nubank-Paper, Sierra-Blog, „Guardrail Tax“ | Entspricht unserem `POLICY_KATALOG` + `baueSchaerfe`, verallgemeinert |

## 3. Zustand, den die Engine schon kennt (ohne LLM-Aufruf)

| Signal | Woher | Phase ableitbar |
|---|---|---|
| `chat.kapitel` (1–3) | `panels.js` nach `[[CHAPTER-n]]` | einzel: Kapitel exakt |
| Marken in Assistant-Nachrichten (`findeMarker`, `markerOrder`) | `contracts/marker.js` | einzel: SCALE-SAFETY → SLIDERS → RANKING …; gemeinsam: REVEAL-A/B, BASELINE, SCALE-CLOSING |
| Panel-Antworten als User-Nachrichten (`SLIDERS-RESULT`, `CHOICE-RESULT: connect/…`, …) | `sessions.js`, `kernwetten.js` | Schritt innerhalb Kapitel/Akt |
| Steuertokens (`[CLOSE SESSION]`, `[CHECKPOINT]`, `[Rückkehr …]`) | `steuerTexte` | Abschluss-/Wiedereinstiegszug eindeutig |
| Erste Nachricht (`COMPANION-CONTEXT`, `MERKPOSTEN`, `HANDOVER-BLOCK`, `imAufdeckPfad`) | `aufdeck-waechter.js` | kalter Start vs. Wiederkehr |
| Blöcke im Verlauf (`hatBlock`: GATE/RECALL/NOTE/GOAL) | `contracts` | solo: Redaktion läuft / Freigabe erfolgt |
| `messages.length === 0`, `lastStop`, `letzteVerweigerung`, `pausedAt` | `engine.js`, `app.js` | Einstiegszug; Korrekturrunde; Pause |
| Text-Signale per Regex (Krise, Zweiseitigkeit) | `*-waechter.js`, `signale.js` | Trigger-Mechanik existiert bereits |

Fazit: einzel und gemeinsam haben eine **deterministische** Phase; solo/moment nur Einstieg/Mitte/Abschluss plus Text-Trigger (Teilen-Wunsch, Abruf-Bitte, Anteile-Sprache).

## 4. Lösungswege (Architekt), bewertet

| # | Weg | Effekt | Caching | Eval-Infra | Aufwand | Urteil |
|---|---|---|---|---|---|---|
| 1 | Entrümpeln (Sprint-Refs, Begründungsprosa, CAPS-Diät) | mittel, −2–4k Z. | keins | Golden-Snapshots neu | S | **ja, zuerst** |
| 2 | Baustein-Dedup (eine Quelle je Regel) | mittel, −3–5k | keins | Snapshots | S–M | **ja** |
| 3 | 8–12 „Grundgesetz“-Sätze oben | nur mit 1/2 wirksam (Control Illusion, MRV −0,13) | keins | keins | S | ja, als Teil von 2 |
| 4 | Phasen-Komposition (Kern + Phasenblock) | **hoch**, −50–65 % Token; nimmt dem Modell Blöcke/Türen außerhalb ihres Fensters (ST8-Mechanismus umgekehrt) | hoch wenn naiv → System als Array `[Kern (cache), Phase (cache)]` | hoch: `sysPromptFuer` verlaufsunabhängig, Snapshots pro (Art, Phase) | L | **ja**, Pilot einzel |
| 5 | Zustandsobjekt („WO WIR SIND: Kapitel 2 · Ranking offen · Blöcke jetzt erlaubt: NOTE“) | hoch für Dramaturgie/Marken | nur konversationsseitig cache-neutral | kleine Runner-Ergänzung | M | ja, mit 6 |
| 6 | Schärfung + Zustand als **transiente** Erinnerung in der letzten User-Nachricht statt `system +=` | Rezenz: die einzige Position mit gemessenem Effekt (MRV 8/8 → 1/8); behebt Cache-Miss | **behebt** heutigen Miss | Runner spiegelt | S | **ja** |
| 7 | Beobachter-Zug (kleiner Klassifikator wählt 1–3 Regelkarten) | hoch für situative Regeln | neutral bei 6 | neue Fehlerquelle | M | später, für solo/moment-Trigger, die Regex nicht trägt |
| 8 | Selbst-Checkliste im Vorspann | fraglich (ST8/S133: Echo, Schablone) | — | Echo-Wächter schlägt an | M | nein; allenfalls nicht gestreamter Scratch als Eval-Sonde |
| 9 | Zweistufige Antwort (Entwurf → Rewriter) | hoch für Stil | — | — | M–L | nein (doppelte Latenz, Streaming-Bruch S77) |
| 10 | Beispiele statt Regeln | Form lernt sich aus Beispielen; Schablonen-Risiko (S133: 9/18 bei Medium) | keins | `stilvergleich.js` | M | teilweise: 1–2 verfremdete Struktur-Beispiele je Phase |
| 11 | Deterministische Einstiegs-/Abschlusszüge (fester Wortlaut, Block-JSON) ohne oder mit Mini-Prompt | entfernt 8–10k Z. Format-/Wortlautregeln | keins | ERO/AUS messen App-Logik | M | ja, Beifang von 4 |
| 12 | Negativregeln „nie Block X außerhalb Phase Y“ als mechanischer Wächter (`pruefungen: {art:"fenster"}`) statt Prosa | hoch (Omission-Fehlerart → Regex-Check) | keins | `zug.verweigert` existiert | S–M | ja, Beifang von 4 |
| 13 | Schema-Zwang für Abschlussblöcke **nur** am deterministischen Abschlusszug (eine Ausgabe, keine Zweige) | wirft 5–7k Format-Prosa aus dem Mitte-Prompt | keins | `strukturmodus-ruht.spec.js` bewusst umstellen | M | **offen** (ST8-Revision, enge Variante) |

Verworfen: algorithmische Kompression, Fine-Tuning, Prioritätsmarken als Gewichtung, Format-Wahl (XML vs. Markdown) als Haupthebel.

## 5. Konvergenz der beiden Agenten

Beide landen bei derselben Reihenfolge und demselben Transportprinzip:

1. **Redaktion zuerst** (billig, Snapshot-Basis für alles Weitere, sofort messbar): Dev-Changelog raus, CAPS ≤ 1 je Regel, Negativ → positiv mit Grund, Dedup, Grundgesetz oben.
2. **Transport trennen**: Phase → zweiter System-Block (stabil über viele Züge, eigener Cache-Breakpoint); Schärfung + Zustandsobjekt → transient konversationsseitig als getaggter `<regie>`-Block („nicht an die Person gerichtet“), nie persistiert, ≤ 5–6 Regeln (ManyIFEval-Grenze). Providerübergreifend funktioniert nur der Nachrichten-Transport identisch; bei Mistral ist ein zweiter System-Eintrag harmlos, aber ohne Cache-Garantie.
3. **Phasen-Komposition** als Pilot bei `einzel` (deterministische Phase), dann `gemeinsam`, dann `solo/moment`; Phasenmodule als getrennte `.md`-Dateien/Exporte (E2 b: keine Bedingungen im Template), Auswahl im Katalog.
4. **Beifang**: mechanische Fenster-Wächter, deterministische Wortlaut-Züge, ggf. Schema-Zwang nur am Abschlusszug.

Dissens, aufgelöst: Selbst-Checkliste — Forscher: Reasoning-Checklisten helfen in Benchmarks; Architekt: Echo-/Schablonen-Befunde. Einigung: nicht im Produkt, allenfalls als nicht gestreamte Eval-Sonde.

Zielbild nach allen Schritten: **4–6k Token je Zug statt 12–14k, 60–80 CAPS statt 250+, ≤ 40 aktive Regeln je Zug.**

## 6. Messung mit vorhandener Infrastruktur

- Masse: neues Skript `scripts/prompt-masse.js` (Token/CAPS/Redundanz je Art × Sprache × Phase) + Shrink-only-Kanarie (T1b-Muster).
- Verhalten: Vollmatrix Haiku + Medium, n=3, Judge Opus, Nullhypothese „nicht schlechter“ (Rücknahmeregel S136); Basislinie S145 (07.11.) liegt vor. Familien je Schritt: Redaktion → GATE/SYC/ANT/KOR/SPA/AUF + `stilvergleich.js` (Schablonen-Echo); Transport → MRV-02, KRIS-02, AUFD-01, AUS-04/05 + Cache-Read-Quote (`core/llm/usage.js`, heute ≈ 0 bei geschärften Zügen, Ziel > 80 %); Phasen → SCA/SPA/MERK/SPR für einzel + neue Phasen-Szenarien („Kapitel 3 ohne Kapitel-4-Regeln → kein CLOSURE-BLOCK“), RCL-02/02b als Kanarien.
- Pro Modell getrennt messen (Formateffekte übertragen sich zwischen Familien kaum).

## 7. Nachtrag nach S146/S147/BV-1 (Stand `c1f2adc`)

- `docs/modellentscheidung.md` §6.4: Drei Korpus-Sprints haben Haikus Prädikats-Eröffnung („Das ist eine wichtige Einsicht“) nicht bewegt — der Regelzuwachs im Prompt erreicht das Modell nicht. Das ist das Problem dieser Serie in einem Satz.
- §6.5: Medium 3.5 zeigt **Regie-Echo** („(No reveal context is present, so we move directly to phase 0.)“). Für PRV-3 heißt das: der `<regie>`-Block braucht einen Echo-Wächter im Eval (Tag oder Regietext im sichtbaren Text = Verstoß) und einen Satz im Kern, dass Regie-Hinweise nie zitiert werden.
- Messwerte PRV-0 (neue Basis, Kern `07882d74`): siehe `docs/SPRINT-PRV-0-PROTOKOLL.md`.
