# Sprintprotokoll · MOD-2a — Wächter textfrei und sprachfähig

**Basis:** `main` nach Merge `mod-1` (`1413430`)
**Kette:** MOD-0 → MOD-1 → **MOD-2a**
**Auslieferung:** ab diesem Sprint direkt über GitHub — Branch `mod-2a`, Merge nach `main` (Entscheidung Cars10, 2026-11-06; MOD-0/MOD-1 wurden rückwirkend als Branches `mod-0`/`mod-1` aus ihren Patches gemergt, byte-gleich zu den gelieferten Patches)
**Endstand:** **2667 / 187 / 26 / 4 grün** (+12 gegenüber MOD-1), `npm run build` grün
**Kern-Hash:** `cea45a345c83d522`

---

## 0 · Zweck

Review-Kopplung K1: Die Schärfungs-Wächter trugen deutschen Prompt-Text und deutsche Signal-Regexe im Engine-Code. Weil `sessions.js`/`kernwetten.js` keinen `ctx.text` durchreichten, bekam eine **EN-Session bei Krisensignal einen deutschen `[APP-HINWEIS …]`** in den Systemtext. MOD-2a zieht Inhalt und Mechanik auseinander: Inhalt in den Korpus je Sprache, Mechanik als sprachlose Fabrik.

## 1 · Was geändert wurde

| Datei | Änderung |
|---|---|
| `core/prompts/prompts.de.js`, `.en.js` | neuer Export `waechter = { krise:{signal,text}, krisenhilfe, einzelraum, zweiseitigkeit:{eigeneSache,verfuegung,text}, aufdeck:{text} }`. DE-Texte und -Regexe **byte-identisch** zu den alten Engine-Konstanten (geprüft, SHA-256 im neuen Spec). EN-Texte neu übersetzt (K1) |
| `core/engine/krisen-waechter.js` | `krisenSchaerfung` → Fabrik `baueKrisenSchaerfung(inhalt)`; `KRISEN_SCHAERFUNG`, `KRISEN_SIGNALE`, `KRISENHILFE`, `EINZELRAUM` entfernt (jetzt Korpus). `liesInhalt` wirft bei fehlendem Inhalt |
| `core/engine/zweiseitigkeit-waechter.js` | `zweiseitigkeitsSchaerfung` → `baueZweiseitigkeitsSchaerfung(inhalt)`; `EIGENE_SACHE`, `VERFUEGUNG`, `ZWEISEITIGKEIT_SCHAERFUNG` entfernt. `sprecherVon` bleibt |
| `core/engine/aufdeck-waechter.js` | `aufdeckSchaerfung` → `baueAufdeckSchaerfung(inhalt)`; `AUFDECK_SCHAERFUNG` entfernt |
| `core/engine/abschluss-waechter.js` | `ABSCHLUSS_REVISION`, `MARKEN_REVISION`, `META_PLATZ_REVISION` sind jetzt **Kennungen** (`"abschluss-mit-frage"` …) statt deutscher Revisionstexte — seit S105.3 wird nichts neu geschrieben, die Konstanten waren nur noch Rückfall; eine war bereits vom Korpus abgedriftet (MOD-0 B2) |
| `core/ui/sessions.js`, `kernwetten.js` | `schaerfe` aus Fabriken mit **lazy** Korpus-Zugriff (`() => K().waechter.krise`): die Sprache wird je Zug gelesen, nicht beim Def-Bau eingefroren |
| `tests/unit/mod-schaerfung-sprache.spec.js` (neu) | 11 Tests, s. §2 |
| `tests/unit/mod-grenzen.spec.js` | Ist-Liste auf `{}`; neuer Test „core/engine trägt keinen Inhalt mehr“ |
| 7 bestehende Specs | Import aus Fabrik + Korpus statt Engine-Konstante; Aussagen unverändert (`mrv-zweiseitigkeit`, `aufdeck-erkenner`, `aufdeck-vorbeugung-engine`, `s103-judge-marken-krise`, `s105-vertrag-und-zustand`, `s113-kein-totes-material` (invertiert: alte Namen `toBeUndefined`), `mod-komposition`) |

### Fabrik statt Funktion

`baueKrisenSchaerfung(inhalt)` → `(messages, ctx) ⇒ string|null`. `inhalt` ist `waechter.krise` des Korpus **oder eine Funktion, die es liefert**. Die Defs reichen eine Funktion (`() => K().waechter.krise`), damit der App-Pfad über den globalen Schnappschuss je Zug die richtige Sprache liest. Fehlt der Inhalt, wirft die Fabrik — es gibt keinen stillen Deutsch-Rückfall mehr, denn die Engine kennt keinen Text mehr.

## 2 · Was die Tests festhalten

- DE-Schärfungstexte byte-identisch zu den alten Konstanten (SHA-256 vor dem Umzug gerechnet).
- Parität DE≡EN (Schlüssel, Typen); Krisen-Signal und Erkenner sind in beiden Sprachen **dieselbe Union**.
- EN-Session (über `baueSessionDef(art, {sprache:"en"})` und über den globalen Schnappschuss) bekommt `[APP NOTE …]`, DE `[APP-HINWEIS …]` — für moment, gemeinsam und die Aufdeck-Schärfung.
- Fabriken sind laut ohne Inhalt; `ctx.text` überstimmt weiterhin (Eval, Sonden).
- Golden-Snapshot: alle fünf Systemprompte DE/EN unverändert.

## 3 · Entscheidungen in diesem Sprint

- **Krisen-Signal als Union in beiden Sprachen** (statt DE-/EN-Teilmengen): Wer in Not ist, wechselt unter Umständen die Sprache; eine Krise darf nicht an der Paarsprache scheitern. Verhalten damit byte-gleich zu vorher.
- **Zweiseitigkeits-Muster in EN unverändert deutsch**: In EN-Sessions feuerten sie vorher nie (deutsche Regexe) — so bleibt es. Englische Muster wären neues Verhalten und sind eine Entscheidung, keine stille Nebenwirkung → **F7** unten.
- **Revisionstexte im Korpus (`steuerTexte.*Revision`) bleiben vorerst**: Sie sind seit S105.3 ohne Code-Aufrufer. Entfernen gehört zu MOD-3 (Korpus-Zerlegung), nicht hierher.

## 4 · Offene Frage

**F7 · Englische Zweiseitigkeits-Muster.** Sollen `eigeneSache`/`verfuegung` englische Entsprechungen bekommen („I didn't get to it“, „let's just move on“)? (a) ja, als eigener kleiner Schritt mit Sonde wie MRV · (b) nein, EN bleibt ohne Zweiseitigkeits-Schärfung. Kein Blocker für MOD-2b.

## 5 · Verifikation

Arbeitsstand: `npx vitest run` 2884 grün, `npm run build` grün, Kern `cea45a345c83d522`. Branch `mod-2a` aus `main` (`1413430`), Commit, erneuter Suite-Lauf auf dem Branch, Merge `--no-ff` nach `main`, Push.

## 6 · Nächster Schritt

MOD-2b: Policy-Katalog als Daten (`core/policies/katalog.js`); Test „Policies greifen ohne Prompt“.
