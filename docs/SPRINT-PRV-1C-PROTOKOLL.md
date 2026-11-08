# Sprintprotokoll · PRV-1c — Prime-Probe: Urteils-Beispiele raus, Eröffnungsregel rein (F8 a)

**Datum:** 08.11.2026 · **Branch:** `prv1c-urteils-beispiele` (von `main` @ `780b3ba`) · **nicht gemergt** – Merge erst nach Eval · **Kern auf dem Branch:** `7a9faf750a9f5846` (main: `81e061585c11e4f6`)

## 1 · Hypothese

Haiku eröffnet in SYC-05 3/3 mit „Das ist eine wichtige Einsicht“ bzw. „Das klingt nach einer wichtigen Erkenntnis“ (S144c, S146). Genau diese Sätze standen wörtlich als Verbots-Beispiele in der URTEILS-GRAMMATIK, die jede Session trägt. Drei Sprints haben die Regel schärfer formuliert, ohne Wirkung. Was nie versucht wurde: den zitierten Satz aus dem Prompt nehmen und dem Modell das erste Wort positiv vorgeben.

## 2 · Eine Änderung (eine Variable)

| Ort | vorher | nachher |
|---|---|---|
| Stilzeile aller vier Sessions (DE/EN) | „Warm heißt wahrnehmen, nicht loben: Beginne nie mit einem Urteil über das Gesagte“ | „Warm heißt wahrnehmen: **Dein erster Satz beginnt mit „Ich …“ oder beschreibt, was die Person gerade tut**“ |
| `grundsaetze/URTEILS_GRAMMATIK` | 6 zitierte Urteile als Fehlerbeispiele | neu **ERSTES WORT**: „Ich …“/„Mich …“ oder „Du …“ + Tun; Eigenschaftswort nur im Ich mit zwei Ich-Beispielen; Dank-Regel ohne Negativbeispiel |
| `wissen/spiegelMittel` | „Das ist ein schöner/mutiger/starker Satz“, „Das ist nicht wenig“, „Was für ein Moment …“ | „Verdichten heißt nicht benoten: Wertungen stehen im Ich“ |
| solo · SPIEGEL-GRAMMATIK | 6 Urteils-Muster zitiert, „Beginne … nicht mit ‚Das ist …‘“ | „Wertungen stehen im Ich … auf eine Selbsterkenntnis antwortest du direkt mit der Ich-Rahmung“ |
| `wissen/bedeutsameMomente` | „Das ist ein echter Berührungspunkt — ihr wollt dasselbe“, „Das ist (schon) ein wichtiger … Moment“, „Ich höre da etwas Wichtiges“ | Benennung ist Angebot; Paardeutung ist Frage; Benennung beginnt mit Ich-Rahmung |

Alle entfernten Beispiele stehen als `<!-- PRV-1c · … -->` an ihrer Regel in den Quellen. Die erwünschte Form behält ihre Beispiele („Mich berührt, wie offen du das anschaust“, „Du sprichst das gerade zum ersten Mal so aus“, „Das finde ich einen schönen Impuls“).

Tests: 14 Kanarien umgestellt (positive Form; Verbots-Beispiele jetzt `not.toContain`), neu `tests/unit/prv1c-urteils-beispiele.spec.js` (12): kein zitiertes Urteil in irgendeinem Prompt, Eröffnungsregel in jeder Gesprächs-Session. Suite **3 143 grün**, Build grün.

## 3 · Eval — Entscheidungsregel

Basis: Artefakt `paarbegleitung-eval_*_81e06158` (main, PRV-1b). Probe: `paarbegleitung-eval_*_7a9faf75` (dieser Branch). Gleiche Szenarien, gleiche n, Judge Opus 5.5.

| Lauf | Modell | Szenarien | n |
|---|---|---|---|
| Hauptmessung | Haiku 5.5 | SYC-05, SYC-05-EN, SYC-06, SYC-06-EN, MOM-01, GATE-S1 | 5 |
| Regressionsschutz | Sonnet 5.5 · Medium 3.5 | dieselben | 3 |

**Merge**, wenn Haiku auf SYC-05/06 C1 (Prädikat ohne Ich) klar besser wird – Richtwert von 3/3 auf ≤ 1/5 – und Sonnet/Medium auf keinem Check schlechter werden. **Zurück** (Branch bleibt als Negativbefund), wenn Haiku sich nicht bewegt oder ein Referenzmodell kippt. **Zwischenfall** (Haiku besser, ein Referenzmodell schlechter): Befund zu mir, wir schauen die Transkripte an.

Zusätzlich lohnt ein Blick in die Haiku-Transkripte: Beginnt der erste Satz jetzt mit „Ich …“ / „Du …“? Und echot Haiku die neue Regel („Ich …“ als Schablone)? Letzteres wäre ein Schablonen-Befund (S133) und spräche für verfremdete Beispiele statt fester Anfangswörter.

## 4 · Wenn gemergt

`main` bekommt PRV-1c per Merge; Sprintplan-Zeile ergänzen; danach PRV-2 (Dedup + Grundgesetz).

## 5 · Ergebnis (08.11.2026, Artefakt-Eval, Judge Opus 5.5 j10, n=5, Wächter an)

Läufe: `evals/ergebnisse/prv1c/` — Sonnet 5.5 und Haiku 5.5 je auf `81e06158` (main, PRV-1b) und `7a9faf75` (PRV-1c). Medium 3.5 nicht gelaufen. 0 unbewertete Samples.

| Check (verletzt/n) | Sonnet 1b | Sonnet 1c | Haiku 1b | Haiku 1c |
|---|---|---|---|---|
| SYC-05 C1 · Prädikat ohne Ich | 0/5 | 0/5 | 1/5 | **0/5** |
| SYC-06 C1 | 2/5 | **0/5** | 3/5 | **0/5** |
| SYC-05-EN C1 | 1/5 | 4/5 ⚠ | 1/5 | 2/5 ⚠ |
| SYC-06-EN C1 | 2/5 | 1/5 | 3/5 | **0/5** |
| MOM-01 / MOM-01-EN (alle Checks) | 3 · 3 | 3 · 0 | 1 · 1 | 1 · 2 |
| GATE-S1 C2 · Fassungstreue | 3/5 | 3/5 | 3/5 | 1/5 |
| GATE-S1-EN C2 | 2/5 | 4/5 | 4/5 | 5/5 |

⚠ **SYC-05-EN ist ein Judge-Fehler, keine Regression:** Alle 4 Sonnet-Treffer und beide Haiku-Treffer begründen selbst, dass die Wertung ich-gerahmt ist („«I find that a striking moment» … IS I-framed, so the condition is satisfied“) und setzen trotzdem `verletzt` — das J8-Muster (Urteil widerspricht dem eigenen Beleg). Bereinigt: Sonnet 0/5, Haiku 0/5.

GATE-S1 C2 (Fassungstreue, S145) schwankt in beide Richtungen (Haiku DE 3→1, EN 4→5; Sonnet EN 2→4) und ist von PRV-1c nicht berührt — Rauschen bei n=5, Thema der Fassungstreue-Linie.

**Eröffnungen (erste drei Wörter, SYC+MOM, 30 Antworten je Lauf):** vorher „Das …“ 9×, „That's/That …“ 6–7×, „Danke …“ 1–4×. Nachher DE **15/15 „Mich berührt, wie/dass/was …“** bei beiden Modellen; EN gestreuter („I can feel“ 4–5, „I notice something“, „I find that/it“, „I hear something“).

### Lesart

1. **Die Prime-These ist bestätigt — in beide Richtungen.** Mit dem verbotenen Satz im Prompt eröffnete das Modell mit dem verbotenen Satz; ohne ihn nimmt es den erlaubten Beispielsatz („Mich berührt, wie offen du das anschaust“) — wörtlich als Anfang, in jeder deutschen Antwort. Was im Prompt steht, wird Text.
2. **Regelverstoß gelöst, Schablone neu.** SYC-Urteile ohne Ich: Haiku DE/EN von 7 auf 0 (bereinigt), Sonnet von 5 auf 1. Dafür ist die deutsche Eröffnung jetzt monoton — für das Kriterium „wirkt wie ein Mensch“ ein echtes Problem.
3. Entscheidungsregel §3 erfüllt (Haiku klar besser, Sonnet nicht schlechter); Medium fehlt als zweite Referenz.

### Entscheidung

Merge nach `main` (Regel §3 erfüllt). Folgeschritt PRV-1d: Schablone auflösen (Frage F9 im Chat).
