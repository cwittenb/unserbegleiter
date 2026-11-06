# Sprintprotokoll · MOD-1 — Composition Root

**Basis:** `origin/main` @ `34d8690` + MOD-0 (`patch-mod0-grenzkanarien-golden.mjs`)
**Kette:** MOD-0 → **MOD-1**. Der Patch prüft die MOD-0-Dateien per Anker und bricht ohne sie ab.
**Patch:** `patch-mod1-komposition.mjs`
**Endstand:** **2655 / 187 / 26 / 4 grün** (+17 gegenüber MOD-0), `npm run build` grün
**Kern-Hash:** `36ea071afd88a1e7` (vorher `e35ac2db2c33588a` — `core/komposition.js` neu, `app.js` delegiert)
**Entscheidung:** E6 a — der Eval-Runner misst ab jetzt den App-Text inklusive Themenrahmen.

---

## 0 · Zweck

Review-Kopplung K3: Dieselbe Session wurde an fünf Orten zusammengesetzt (app.js, sessions.js/kernwetten.js, runner-kern.js, struktur-bruecke.js, golden-prompts.js). MOD-1 macht `core/komposition.js` zur einzigen Stelle, die aus einer Art eine Def baut. Inhalt (Prompts, Wächter, Defs) bewegt sich nicht — nur die Wahl.

## 1 · Was geändert wurde

| Datei | Änderung |
|---|---|
| `core/komposition.js` (neu) | `baueSessionDef(art, {backend, hooks, sprache})`, `baueSystemText(art, ctx, {sprache})`, `markerOrderFuer(art)`, `mitKorpusSprache(sprache, fn)`, `BACKEND_ATTRAPPE`, `SESSION_ARTEN` |
| `core/ui/app.js` | Die vierfache Ternär-Wahl (`art === "solo" ? soloDef(…) : …`) wird `baueSessionDef(art, {backend, hooks})`; die Def-Fabriken werden dort nicht mehr importiert |
| `evals/runner-kern.js` | `sysPromptFuer`, `schaerfungFuer`, `uebergabeFuer`, `markerOrderFuer` delegieren an die Komposition. Die Wächter-Importe und die drei Marken-Kopien (`MOMENT_MARKEN` …) entfallen. Signaturen und Rückgabeformen bleiben — kein Aufrufer außerhalb ändert sich |
| `evals/struktur-bruecke.js` | Nutzt `baueSessionDef(art, {sprache})`; eigene `ATTRAPPE` entfällt zugunsten `BACKEND_ATTRAPPE` |
| `scripts/golden-prompts.js` | App-Pfad über die Komposition statt direkt über die Fabriken |
| `tests/fixtures/golden/prompts-{de,en}.json` | **Nur** die Runner-Hashes für solo/moment ziehen nach (jetzt ≡ Text). Alle Text- und Struktur-Hashes byte-identisch zu MOD-0 — der Beweis, dass sich am Modell-Text nichts geändert hat außer der Eval-Lücke |
| `tests/unit/mod-golden-prompts.spec.js` | `runnerGleichText` wird für alle Arten `true` verlangt (Test invertiert, nicht gelöscht) |
| `tests/unit/mod-komposition.spec.js` (neu) | 17 Tests, s. §2 |

### Die Sprachbindung

Der Eval spielt DE- und EN-Szenarien im selben Lauf; die Defs lesen den Korpus aber über den globalen Schnappschuss `K()`. `baueSessionDef(art, {sprache})` bindet deshalb `sysPrompt`, `schaerfe` und `pruefeUebergabe` so, dass jede Lesung synchron unter der Szenario-Sprache läuft und den Schnappschuss danach wiederherstellt — auch im Fehlerfall. Ohne `sprache` (App) wird die Def unverändert durchgereicht. Ein nicht registrierter Korpus ist laut (derselbe Grund wie `stelleKorpusBereit`, R5).

### Die Übergabe-Signatur

Die Def prüft mit Engine-Signatur `(text, engine)` und liest `engine.chat.messages`; der Runner prüfte mit `(text, messages)`. `uebergabeFuer` reicht jetzt `{chat: {messages}}` hinein — der Runner-Vertrag nach außen (`(text, messages) ⇒ Grund|null`) bleibt.

## 2 · Was die Tests festhalten

- Jede Art baut; unbekannte Art wirft. `qualitytime` hat keine Def (S113), aber einen Systemtext über `baueSystemText`.
- Sprachbindung liest EN, lässt `getKorpusSprache()` auf `de`, stellt auch nach `throw` wieder her.
- **Produktion ≡ Eval** je Art × Sprache: Systemtext (`sysPromptFuer` ≡ `def.sysPrompt`), Schärfung (gleiche Zuordnung, gleicher Text bei Krisensignal), Übergabe (gleicher Grund `abschluss-mit-frage` bei Frage + TIMELINE-BLOCK nach `[CLOSE SESSION]`), markerOrder.
- Kanarie: `app.js`, `runner-kern.js`, `runner-batch.js`, `struktur-bruecke.js`, `golden-prompts.js` rufen keine Def-Fabrik direkt.

## 3 · Befunde

**B1 (aus MOD-0) geschlossen.** Solo und moment haben im Eval jetzt den Themenrahmen. Folge für die Eval-Historie: Ergebnisse für `solo`/`moment` vor MOD-1 sind nicht mehr 1:1 mit späteren vergleichbar; die Kennzeichnung erfolgt über den Kern-Hash im Ergebnis (bestehender Mechanismus).

**B2 · „Der Runner soll die UI-Module nicht ziehen“** (Kommentar an den Marken-Kopien) war seit ST5 nicht mehr wahr: `struktur-bruecke.js` importiert `sessions.js`, und `runner-kern.js` importiert `struktur-bruecke.js`. Die Kopien schützten nichts mehr, sie konnten nur driften. Entfernt. Die Trennung UI ↔ Eval bleibt ein Ziel — sie wird in MOD-2b/MOD-3 real, wenn die Defs ihren Inhalt aus Katalog und Korpus beziehen statt aus `core/ui`.

## 4 · Nicht angefasst, bewusst

- `sessions.js` und `kernwetten.js`: Inhalt der Defs unverändert, inklusive der Wächter-Zuordnung — das ist MOD-2b.
- `runner-batch.js`: ruft weiterhin `sysPromptFuer`/`schaerfungFuer`/`uebergabeFuer` — profitiert ohne Änderung.
- `platforms/artifact/selbstfahrt.js`: wählt keine Defs, nichts zu tun.

## 5 · Verifikation

Frisch-Clone `34d8690` → MOD-0 anwenden → `patch-mod1-komposition.mjs --dry-run` (3 neu, 7 ersetzt) → apply → erneut apply (0 Änderungen) → Byte-Vergleich aller 10 Dateien gegen Arbeitsstand → `npx vitest run` 2872 grün → `npm run build` grün, Kern `36ea071afd88a1e7`.

## 6 · Nächster Schritt

MOD-2a: Wächter textfrei (Schärfungstexte und Signal-Regexe in den Korpus, EN-Fassungen neu). Keine offene Entscheidung.
