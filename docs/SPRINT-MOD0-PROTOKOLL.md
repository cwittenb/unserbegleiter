# Sprintprotokoll · MOD-0 — Grenz-Kanarien und Golden-Snapshot

**Basis:** `origin/main` @ `34d8690` (`patch-s143-adresse-maskiert`)
**Kette:** keine — MOD-0 setzt direkt auf `main`. MOD-1 setzt auf MOD-0.
**Patch:** `patch-mod0-grenzkanarien-golden.mjs`
**Endstand:** **2638 / 187 / 26 / 4 grün** (vorher 2597 / 187 / 26 / 4; +41 Tests), `npm run build` grün
**Kern-Hash:** `e35ac2db2c33588a` — unverändert, MOD-0 fasst keine Kern-Datei an.
**Serie:** MOD (Schichten-Entkopplung). Review: `REVIEW-MOD-schichten.md`, Plan: `sprintplan-MOD-schichten.md`. Entscheidungen Cars10: E1 b (alle sechs), E2 b (`.md`-Templates), E3 keine Laufzeit-Nachladung, E4 a (i18n-Umzug als MOD-3b), E5 MOD-Serie, K1/K2 ja.

---

## 0 · Zweck

Bevor die MOD-Serie Inhalt zwischen Dateien bewegt, muss messbar sein, (a) wo die Schichtgrenzen heute verlaufen und (b) welchen Text das Modell heute sieht. MOD-0 baut nur Messinstrumente — kein Kern-Code ändert sich.

## 1 · Was hinzukam

| Datei | Inhalt |
|---|---|
| `tests/unit/mod-grenzen.spec.js` | Importrichtungs-Kanarie (engine/contracts/llm/prompts importieren nichts aus Inhalt bzw. UI); Ist-Liste modell-gerichteter Texte und deutscher Signal-Muster in `core/engine` (shrink-only); Steuertoken-Parität DE≡EN per Test statt per Kommentar |
| `tests/unit/mod-golden-prompts.spec.js` | SHA-256 je Session-Art (solo, moment, einzel, gemeinsam, qualitytime) × Sprache (de, en) × Pfad (Text, Struktur, Eval-Runner) gegen Fixture |
| `tests/fixtures/golden/prompts-{de,en}.json` | der Snapshot (Hashes + Textlängen) |
| `scripts/golden-prompts.js` | Generator; `--schreibe` aktualisiert die Fixture bewusst, ohne Flag druckt er nur |

Beide Kanarien wurden gegen Fehler geprüft: ein eingeschleuster `import … from "../prompts/prompts.js"` in `core/engine/freigabe.js` macht die Importrichtung rot; ein geändertes Zeichen im `haltungsKern` macht 11 Golden-Tests rot. Danach zurückgenommen.

## 2 · Befunde beim Anlegen

**B1 · Produktion ≠ Eval bei solo und moment.** `sessions.js:42/162` hängt `K().THEMEN_RAHMEN` an den Systemtext, `evals/runner-kern.js:41–58` (`sysPromptFuer`) nicht. Der Eval-Runner misst für Reflexionsgespräch und Qualitätszeit seit Einführung des Themenrahmens einen anderen Prompt als die App. `einzel` und `gemeinsam` sind identisch. Der Snapshot hält beide Hashes fest (`runnerGleichText: false`); MOD-1 schließt die Lücke über die Composition Root und dreht den Wert — **Entscheidung E6 für MOD-1:** Der Runner nimmt dann den App-Text inklusive Themenrahmen; bestehende Eval-Ergebnisse für solo/moment sind damit nicht mehr direkt vergleichbar. Kein Fix in MOD-0, weil das eine Verhaltensänderung des Evals wäre.

**B2 · Inhalt in `core/engine` (Ist-Liste).**

| Datei | Modell-gerichtete Texte | Deutsche Signal-Muster |
|---|---|---|
| `abschluss-waechter.js` | `ABSCHLUSS_REVISION`, `MARKEN_REVISION`, `META_PLATZ_REVISION` | — |
| `aufdeck-waechter.js` | `AUFDECK_SCHAERFUNG` | — |
| `krisen-waechter.js` | `KRISEN_SCHAERFUNG` | `EINZELRAUM`, `KRISENHILFE`, `KRISEN_SIGNALE` |
| `zweiseitigkeit-waechter.js` | `ZWEISEITIGKEIT_SCHAERFUNG` | `EIGENE_SACHE`, `VERFUEGUNG` |

Drei Schärfungstexte sind deutsch und werden ohne `ctx.text` ausgeliefert — EN-Sessions bekommen sie deutsch (Review K1). Die drei `*_REVISION`-Konstanten sind seit S105.3 nur noch Fallback-Labels (`ctx.revision || …`); `ABSCHLUSS_REVISION` ist bereits vom Korpus-Wortlaut (`steuerTexte.abschlussRevision`) abgedriftet, `MARKEN_REVISION`/`META_PLATZ_REVISION` noch identisch. MOD-2a räumt alle vier Dateien.

**B3 · `core/llm/adapter.js`** trägt genau einen modell-gerichteten Text (`STRUKTUR_KORREKTUR`). Festgehalten, MOD-5 zieht ihn aus.

**B4 · Importrichtung ist heute sauber.** Keine Verstöße in engine/contracts/llm/prompts. Der Umbau muss das nur halten.

## 3 · Nicht angefasst, bewusst

- Entwickler-Fehlermeldungen auf Deutsch in `engine.js`, `freigabe.js`, `adapter.js` (`throw new Error("Ungültige markerOrder …")`) sind kein Inhalt für das Modell und bleiben außerhalb der Ist-Liste.
- `urteils-waechter.js` erscheint nicht in der Liste: seine Regexe tragen keine der Marker-Wörter; der Text `urteilsRevision` lebt bereits im Korpus (S94).

## 4 · Verifikation

Frisch-Clone `34d8690` → `node patch-mod0-grenzkanarien-golden.mjs --dry-run` (6 Dateien neu) → apply → erneut apply (idempotent, 0 Änderungen) → Byte-Vergleich gegen Arbeitsstand → `npx vitest run` 2855 grün → `npm run build` grün, Kern `e35ac2db2c33588a`.

Hinweis Tooling: `npm install` scheitert mit npm 10.9.9 an `vitest@^4.1.9` (`Cannot read properties of null (reading 'edgesOut')`, Arborist-Bug bei Peer-Kanten). `npm install --legacy-peer-deps` installiert sauber (vitest 4.1.12). Kein Repo-Problem; nur zur Kenntnis, falls es lokal auftritt.

## 5 · Nächster Schritt

MOD-1 Composition Root (`core/komposition.js`), Entscheidung E6 oben vorab bestätigen.
