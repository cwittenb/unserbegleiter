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
