# Sprint S66 — Testabdeckung & Eval-Ausbau (Umsetzung Analyse 2026-07-15)

**Basis:** `origin/main` @ `60b2872` (patch-s65-batch-haertung-1h-cache-wallclock), 706 Tests grün
**Ergebnis:** **755 Tests grün** (648 Struktur · 20 Engine/Mock · 87 Worker/Miniflare) · Kern-Hash nach Build **`6544826bddcd060d`** (unverändert seit S64 — weder Upstream-S65 noch dieser Sprint greifen in `core/` ein)
**Quelle:** `ANALYSE-testabdeckung-und-eval-review.md` — alle P1–P3-Punkte · **Plan:** `SPRINT-66-PLAN.md` (genehmigt als S65-Plan; nur Nummer/Basis gewandert)
**Patch:** `patch-s66-testabdeckung-eval-ausbau.mjs` · **Nach dem Anwenden einmalig `npm install`** (neue devDependency `@vitest/coverage-v8`)

> **Hinweis zur Nummer:** Der Sprint war als S65 geplant; während der Umsetzung landete upstream
> `patch-s65-batch-haertung-1h-cache-wallclock` auf `main`. Die SHA-256-Ankerprüfung des Patches hat die
> Kollision erkannt (`evals/runner-kern.js` und `evals/runner.js` abweichend); der Sprint wurde auf die
> neue Basis rebased (die Upstream-Änderungen — leere-Antwort-Behandlung, 1h-Cache-Tarif, Batch-Fortschritt —
> sind orthogonal und blieben unangetastet) und als **S66** nummeriert (S61-Muster).

## Entscheidungen

| # | Entscheidung |
|---|---|
| K1 | **E2E-Smoke (P3.9) vertagt:** Playwright-Browser-Download ist in der Arbeitsumgebung nicht erreichbar — ein unverifiziertes Gerüst widerspräche der Sprint-Regel „abgeschlossen & testbar". Designnotiz: ein einzelner Release-Gate-Pfad (gebautes Pages-Artefakt → Onboarding → Solo-Nachricht gegen Mock) bleibt der richtige Schnitt; Aufwand ~½ Baustein, sobald in CI ein Browser liegt. |
| K2 | **EN-Gesamtlauf + echte Läufe der neuen Familien** sind Folgeaktionen (Keys/Budget), Kommandos unten. |
| K3 | **TRAU-01 als rote Linie** gesetzt (Analyse: „empfohlen"). |
| K4 | **Offene Frage an dich:** Hochstufung von AUF-01 C2 bzw. DOS-S1 C1 zur roten Linie? (Review 3: Grundsatz „ein Treffer wäre ein Vorfall", nicht „wichtig" — ich habe bewusst NICHT eigenmächtig hochgestuft.) |
| K5 | QZ-02 prüft die RESTING-Regel im **`qualitytime`-Menü** (schließt die Null-Abdeckung der Isolationsinsel); der „Einladung bleibt ablehnbar"-Aspekt aus E5 lebt im `moment`-Raum und ist dort über die CHOICE-Mechanik (Ohne-Option, Strukturtests) gedeckt. |

## Änderungen

**B1 · `mailer.js` unter Test (P1.1).** `cloudflare:sockets` ist jetzt per Vitest-Alias auf einen skriptbaren Stub gelegt (`tests/fixtures/cloudflare-sockets-stub.js`) — damit ist das Modul in Node importierbar und der **SMTP-Dialog gegen einen gescripteten Fake-Server beweisbar** (bisher nur deploy-verifiziert). `baueNachricht` exportiert (reine Funktion). 8 Tests: MAIL_UPSTREAM ok/Fehler, Konfig-Fehler fail-closed, Port-25-Sperre, Nachrichtenbau (CRLF, Dot-Stuffing, UTF-8-Subject), Dialog 465 happy path, 535-Auth-Fehler, vorzeitiges Verbindungsende.

**B2 · `pages/client.js` (P2.4) — mit echtem Bug-Fund.** `language.request` referenzierte die nicht existierende Variable `target` → **ReferenceError bei jedem Sprachwechsel-Antrag** in Produktion (der Worker erwartet `{ target }`). Gefixt; `api`/`remoteBackend`/`boot`/`zeigeWiedereinstieg` exportiert (Auto-Boot unverändert). 9 Tests: Wiedereinstiegs-Screen, Recover ohne Enumeration, Sprachumschalter, verbrauchter vs. unbekannter Link, Wire-Mapping inkl. Bugfix-Beweis, api()-Fehlerobjekt. Der Bug ist exakt die Fehlerklasse, die die Analyse für diese Datei vorhersagte.

**B3 · Coverage ehrlich & bewacht (P1.3).** `@vitest/coverage-v8` devDependency; `coverage`-Block: include zieht auch nie geladene Dateien in den Bericht (so wäre `mailer.js` aufgefallen), `reporter-de.js` und Szenarien-Daten ausgeschlossen, **Miniflare-Blindfleck als Kommentar dokumentiert**. Schwellen als Regressionswächter knapp unter Ist: 73/65/76/75 (Ist S66: 74,5/67,1/78,2/77,2). Scripts: `test:coverage`.

**B4/B5 · Fehlerzweige Ebene 1 (P2.7).** `adapter-fehlerzweige.spec.js` (9): Retry-After als HTTP-Date steuert die Wartezeit, Fehlerkörper-Fallbacks (text→json→leer), onDelta ohne Event-Stream → JSON-Pfad. `block-fehlformen.spec.js` (7): blockDef-Vertragsränder, Schema-null, kaputtes JSON, unvollständige Blöcke, cleanDisplay-Ränder, Korrektur-Nachricht.

**B6 · Build-Fehlerpfade (P3.7).** `build-fehlerpfade.spec.js` (3, alles in mkdtemp): Env-Vorrang (getrimmt), deploy.config als Quelle, **kein Rücklesen einer kontaminierten wrangler.toml** — die Vorfalls-Klasse ist jetzt gepinnt.

**B7 · Katalog 12→23 Szenarien je Sprache (P1.2/P2.5/P3.10).** Neu: NOT-01 ⚑, KRIS-01 ⚑, KRIS-02 ⚑, QZ-01, QZ-02 (qualitytime), WDR-01 (mit echtem S64-Steuertext), TRAU-01 ⚑, KOREG-01, ANT-01, AUFD-01 (mit echtem REVEAL-SHOWN-Steuertext), MERK-01; SPR-05→v2 (+C3 Überklärung). EN-Parität vollständig (Stufe-D-Test erzwingt Familie/Session/Check-IDs/rote Linien). Rote Linien 3→**7**. `eval-runner.spec.js`-Pins semantisch treu angepasst.

**B8 · Kontext-Injektion.** `sysPromptFuer` hängt `szenario.zusatzKontext` an den System-Prompt (wie die App: nie als User-Turn) — MERK-01 (Merkposten) und QZ-02 (RESTING-Stand) nutzen es.

**B9 · Judge-Golden-Transcripts (P2.6, Review 1+8).** `evals/judge/golden.js`: 3 eingefrorene Transkripte mit Soll-Urteil — die beiden S52-Fehlurteilsklassen (PERSON-Zahlen-Zurechnung; Prozess-Rahmung ≠ Bestätigung) plus eine Verstoß-Gegenprobe. `pruefeJudge()` läuft **vor jedem echten Lauf** (Opt-out `--ohne-judge-selbsttest`); Abweichung ⇒ Exit 3 mit Lehre, bevor Pipeline-Geld verbrannt wird. Eigener ungezählter Judge-Adapter — die Lauf-Telemetrie bleibt sauber. Deterministisch bewiesen in `judge-golden.spec.js` (4).

**B10 · n-Politik `--ziel dev|release` (Review 2).** `wendeZielAn()` im Kern (rein, exportiert): release hebt n für Rote-Linien-Szenarien auf ≥5; `stand.ziel` steht im Ergebnis-JSON. Tests in `eval-ziel-kontext.spec.js` (5).

**B11 · Abdeckungs-Matrix (Review 5).** `scripts/eval-matrix.js` generiert `evals/ergebnisse/abdeckung.md` (Sessions × Familien, ⚑ rote Linien, Lücken-Warnung — genau die Fehlerklasse der monatelang unbemerkten QZ-Null). Script `eval:matrix`; Snapshot liegt bei. 4 Tests.

**B12 · Prozess (Review 6+7).** `docs/SPRINT-PROTOKOLL-TEMPLATE.md` mit **Eval-Kadenz-Checkliste** (prompts-berührende Sprints → Familien-Lauf; Katalog-Änderung → Matrix; Release-Gate → `eval:voll --ziel release`); Script `eval:voll` = Batch-Runner als Voll-Lauf-Default.

## Tests

Neu: `mailer.spec.js` (8) · `pages-client.spec.js` (9) · `adapter-fehlerzweige.spec.js` (9) · `block-fehlformen.spec.js` (7) · `build-fehlerpfade.spec.js` (3) · `eval-ziel-kontext.spec.js` (5) · `judge-golden.spec.js` (4) · `eval-matrix.spec.js` (4) = **49 neue Tests**.
Semantisch treu angepasst: `eval-runner.spec.js` (Katalog 23, rote Linien 7).

## Verifikation

- Voller Testlauf **grün**: 648 + 20 + 87 = **755 Tests** (Basis 706 + 49)
- `npm run test:coverage` **grün** (Schwellen 73/65/76/75 greifen)
- `npm run build` · Kern-Hash `6544826bddcd060d`
- Patch auf frischem Klon: dry-run → apply → Idempotenz → Byte-Vergleich → Tests → Build ✓

## Folgeaktionen (brauchen Keys/Budget — Kommandos bereit)

1. **Echte Läufe der neuen Familien:** `npm run eval -- --familie KRIS && npm run eval -- --familie NOT && npm run eval -- --szenario TRAU-01 && npm run eval -- --familie QZ && npm run eval -- --familie WDR` (danach KOREG/ANT/AUFD/MERK; SPR-05 v2 wiederholen).
2. **EN-Gesamtlauf** (steht seit S33B aus): `npm run eval:voll -- --language en` — Ergebnisse je Sprache getrennt lesen.
3. **Release-Gate-Probe:** `npm run eval:voll -- --ziel release`.
4. Beobachtung aus den letzten Ergebnisdateien: **AUF-01 flappt** (grün↔verletzt am 15.07.), SCA-01 einmal verletzt, **MOM-01 noch nie gelaufen** — 1. und 3. zuerst.
5. K4 beantworten (Hochstufung AUF-01 C2 / DOS-S1 C1?).
