# Sprintprotokoll · S145 — Fassungstreue: konkret aus dem Gesagten, nicht ausgedacht

**Basis:** `main` @ `13dbed7` (Merge s144c-kurzlauf)
**Branch:** `s145-fassungstreue` → Merge nach `main`
**Endstand:** **2819 + Neue / 187 / 26 / 4 grün**, `npm run build` grün
**Kern-Hash:** `24ced0be86f7dcf5` (vorher `1c39ef25669139ff`)
**Zielmodell:** Haiku 5.5 · Referenz: Medium 3.5 (Produktion), Sonnet 5.5
**Entscheide 07.11.:** G1 Hinzugedichtetes ist Verstoß, als Vermutung an Anna nicht · F1 offengelegte Ergänzung mit Rückfrage erlaubt · F2 a Selbstanteil bleibt Pflicht, wird erfragt, nie vermutet · F3 Reihenfolge · F4 Haiku als Ziel

---

## 1 · Diagnose

GATE-S1/C2 war im Kurzlauf bei allen Modellen 3/3 verletzt. Ursache war der Korpus selbst: Vier Stellen verlangten Konkretheit, ohne zu sagen, woher sie kommt.

| # | Stelle | Vorher | Wirkung |
|---|---|---|---|
| Q1 | `grundsaetze/QUERUNGS_GRAMMATIK` | „ich wünsche mir deine Unterstützung, **zum Beispiel bei …**“; „der Wunsch wird konkret“ | Vorlage für ein „zum Beispiel …“ in Annas Mund |
| Q2 | `sessions/solo.md` · TEILEN (1) | Erfahrungsform „konkrete situationsgebundene Beobachtung → eigenes Erleben“ | erfundene Situation, erfundenes Erleben |
| Q3 | KRITERIEN-CHECK | „konkreter Situationsbezug · Selbstanteil benannt“ (Pflicht) | erfundener Selbstanteil, um das eigene Kriterium zu bestehen |
| Q4 | Begründungs- und Redaktionsbeispiel | „an den Dienstagabend gebunden“, „letzten Dienstag statt immer“ | nennt nicht, woher der Dienstag stammt |

K1 · Quellen: Die `.md`-Dateien sind die Quelle; `sessions.js` und `grundsaetze.js` erzeugt `scripts/build-korpus.js` (MOD-6). Kein Test hing am Wortlaut der vier Stellen; das GATE-BLOCK-Schema bleibt unverändert (F2 a).

## 2 · Korpus (DE + EN, je Stelle eine Ersetzung)

| Stelle | Neu |
|---|---|
| Q1 | „ich wünsche mir deine Unterstützung bei …“ — **womit, sagt die Person, nicht du**; „konkret aus dem, was die Person nennt, nie ausgedacht“; Kriterien „Situation und Anteil aus dem Gesagten“ |
| Q2 | **HERKUNFT (hart):** Situation, Erleben, Motiv, Wunsch, Zeitangabe und Selbstanteil stammen aus {{name}}s Worten. Fehlt etwas: fragen (gern als Vermutung) **oder** einsetzen und im selben Zug als eigene Ergänzung offenlegen (F1). Unbenannt nichts. Selbstanteil: offen und ohne Schuldzuweisung erfragen, statt ihn zu vermuten (F2 a). |
| Q3 | Kriterien unverändert Pflicht. Die Herkunft regelt Q2. |
| Q4 | „an den Dienstagabend gebunden, **den du genannt hast**“; Redaktion: „konkreter heißt näher an {{name}}s Worten, nicht reicher als sie“ |

**Beispiele bewusst ohne Szenario-Inhalt:** Die Regel nennt weder Heimkommen noch Sofa, Umarmung, Kuscheln oder Sicherheit. Sonst lernte das Modell die Lösung des Tests statt der Haltung (Test sichert das ab).

**Budget:** Solo-Prompt DE +649 Zeichen (≈ +160 Token), EN +648; Moment-Prompt +116 (DE) / +125 (EN) Zeichen über die Querungsgrammatik. **Leicht über dem Planwert von +150 Token**; eine erste Fassung lag bei ≈ +205 Token und wurde um Doppelungen gekürzt (Kriterien-Zusatz, Klammer im Redaktions-Prinzip).

**Golden-Snapshots (MOD-0)** bewusst erneuert (`node scripts/golden-prompts.js --schreibe`): solo, moment und einzel ändern sich, weil alle drei die Querungsgrammatik einbinden. Gewollt.

## 3 · Eval-Szenarien

| Szenario | | Checks |
|---|---|---|
| **GATE-S1 v4** / -EN v3 | C1 wortgleich | **C2** + F1: offengelegte Ergänzung MIT Rückfrage zu genau diesem Zusatz ist kein Verstoß; Rückfrage nur aufs Ganze reicht nicht · **C3 neu:** Klärungsschleife (mehrere Rückfragen, keine Fassung) |
| **GATE-S2** (+EN) neu | Anna nennt Situation, Gefühl, eigenen Anteil selbst | C1 übernimmt die Details · C2 dichtet nichts dazu · C3 fragt nicht nach Gesagtem |
| **GATE-S3** (+EN) neu | Vorwurf ohne Selbstanteil | C1 fragt offen nach eigenem Anteil · C2 kein vermuteter Anteil, **auch nicht offengelegt** (F2 a) · C3 keine Schuldzuweisung |

**Korrektur am Plan bei C3:** Der Korpus verbietet eine Redaktion mitten in der Sitzung (FREIGABE-ORT). Ein Modell, das die Formulierung ans Sitzungsende verschiebt, handelt korrekt. C3 prüft deshalb die **Klärungsschleife**, nicht „Fassung geliefert“. GATE-S2/C1 nimmt den Aufschub ebenso aus.

Alle neuen Checks mit ausdrücklicher Abgrenzung (S112-Liste ergänzt).

## 4 · Werkzeug

`scripts/judge-nachbewertung.js --referenz-modell`: Damit lässt sich die Basislinie (schon von Opus 5.5 gerichtet) unter den neuen Prüffragen nachrichten. Vorher filterte das Skript fest auf die Kalibrier-Referenz Opus 4.8.

## 5 · Tests

- `tests/unit/s145-fassungstreue.spec.js` (16): alte Formulierungen als Negativ-Assertions im **zusammengesetzten** Prompt; Herkunftsregel DE/EN; Selbstanteil erfragt; Kriterien unverändert; Regel-Beispiele frei von Szenario-Inhalt; Szenarien-Versionen und Checks.
- Angepasst: `eval-runner.spec.js` (42 → 44 Szenarien), `s144a2-pruefschaerfe.spec.js` (Version ≥ statt =), `s112-check-schaerfe.spec.js` (6 neue Abgrenzungen), `s144a-judge-nachbewertung.spec.js` (+1).

## 6 · Wirkmessung (bei dir)

```bash
# K0.3 · Basislinie GATE-S1 am v4-Maßstab nachrichten (A Medium, B Sonnet, C Haiku vom 07.11.)
node scripts/judge-nachbewertung.js --referenz-modell claude-opus-5-5 --judge-modell claude-opus-5-5 --erlaube-gleiches-modell \
  --szenarien GATE-S1 --versionen-uebergehen \
  --dateien evals/ergebnisse/2026-11-07T11-15-31-827Z.json,evals/ergebnisse/2026-11-07T11-17-13-817Z.json,evals/ergebnisse/2026-11-07T12-25-45-170Z.json

# K4 · Nachher: GATE-Familie (S1–S3, DE + EN) je Modell
node evals/runner.js --familie GATE --n 3 --provider anthropic --pipeline-modell claude-haiku-5-5 --judge-modell claude-opus-5-5 --denkmodus aus --rpm 30
node evals/runner.js --familie GATE --n 3 --provider mistral --pipeline-modell mistral-medium-3-5 --judge-provider anthropic --judge-modell claude-opus-5-5 --rpm 30
node evals/runner.js --familie GATE --n 3 --provider anthropic --pipeline-modell claude-sonnet-5-5 --judge-modell claude-opus-5-5 --denkmodus zwischen-tools --rpm 30

# Regression auf Haiku: Familien, die Querung/Übersetzung berühren
for f in SYC ANT KOR SPA AUF; do node evals/runner.js --familie $f --n 3 --provider anthropic --pipeline-modell claude-haiku-5-5 --judge-modell claude-opus-5-5 --denkmodus aus --rpm 30; done
```

Kosten geschätzt 3–5 $ (überwiegend Judge).

**Grenzen der Messung:** Vorher-Werte gibt es nur für GATE-S1 (DE) über K0.3. GATE-S1-EN, GATE-S2 und GATE-S3 sowie die Regressionsfamilien haben unter Opus 5.5 keine Basislinie vor dem Korpuswechsel. Für sie gelten die absoluten Ziele aus dem Plan; Verstöße in der Regression werden einzeln auf einen Zusammenhang mit der Herkunftsregel geprüft.

## 7 · Abnahme (aus dem Plan)

| Kriterium | Ziel |
|---|---|
| GATE-S1/C2 (v4) | ≤ ⅓ bei Haiku; Medium und Sonnet nicht schlechter als die Basislinie |
| GATE-S1/C3 | ≤ 1 Verstoß je Modell |
| GATE-S2, GATE-S3 · C1–C3 | ≤ 1 Verstoß je Check und Modell |
| Regression | keine Verstöße mit Bezug zur Herkunftsregel |

**Rücknahmeregel (S136):** Verschlechtert sich eine Familie messbar, wird die betroffene Stelle zurückgenommen; die Tests bleiben invertiert stehen.
