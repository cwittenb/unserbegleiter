# Sprint S<NN> — <Titel>

**Basis:** `origin/main` @ `<commit>` (<letzter Patch>) · **Kern-Hash nach Build:** `<hash>`
**Quelle/Anlass:** <Finding, Analyse, Nutzerwunsch>
**Patch:** `patch-s<NN>-<inhaltlicher-name>.mjs`

## Entscheidungen (Klärungsfragen)

| # | Entscheidung |
|---|---|
| K1 | … |

## Änderungen

**<Baustein> (`<datei>`).** …

## Tests

**Neu:** `tests/unit/<name>.spec.js` — <n> Tests: …
**Semantisch treu angepasst:** …

## Verifikation

- Voller Testlauf **grün**: <Struktur> + <Engine/Mock> + <Worker> = **<gesamt> Tests**
- Build: `npm run build` · Kern-Hash `<hash>`
- Patch auf frischem Klon: dry-run → apply → Idempotenz → Byte-Vergleich → Tests → Build

## Eval-Kadenz (S66 · Review-Empfehlung 6+7 — vor dem Merge abhaken)

- [ ] **Berührt der Sprint UI-Verhalten, Session-Wiring oder Marker→Widget-Ketten?** → Selbstfahrt lokal fahren:
      Dev-Panel-Knopf im Artefakt bzw. `#selbstfahrt` im gebauten Build (Bericht: `window.__PB_SELBSTFAHRT__`);
      in CI laufen dieselben Journeys als `tests/e2e/` bei jedem `npm test` mit (S67)
- [ ] **Berührt der Sprint `core/prompts/*` oder Session-Verhalten?** → Lauf der betroffenen Familien:
      `npm run eval -- --szenario <ID>` bzw. `npm run eval -- --familie <FAM>`
- [ ] **Berührt der Sprint den Szenarien-Katalog?** → `npm run eval:matrix` (Abdeckungs-Matrix aktualisieren;
      unbelegte Session-Typen bewusst entscheiden)
- [ ] **Berührt der Sprint den Judge (Prompt-Version, Parser)?** → Golden Transcripts laufen automatisch vor
      jedem Lauf; bei absichtlicher Urteils-Änderung Fixtures in `evals/judge/golden.js` mitziehen
- [ ] **Release-Gate?** → voller Lauf mit `npm run eval:voll -- --ziel release`
      (Batch −50 %, rote Linien n≥5); Ergebnisse je Sprache getrennt lesen
- [ ] **EN-Lauf fällig?** (steht seit S33B aus) → `npm run eval -- --language en …`

## Offene Punkte / Folgeaktionen

- …
