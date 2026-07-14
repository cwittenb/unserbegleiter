# Sprint 48 — Protokoll · Eval-Konfiguration aus der Umgebung (einmal setzen)

**Datum:** 14. Juli 2026 · **Basis:** aktueller `origin/main` (S47 bereits gemergt, `1938baa`) · **Stand:** 562 Tests grün (20 · 461 · 81), 65 Dateien · **Kern-Hash: `7a02d852645581b1`** (unverändert — `runner.js` wird in kein Artefakt gebündelt; S48 ändert keine Build-Ausgabe)

## Ausgangslage & Ziel

Der Eval-Runner verlangte Provider + beide Modelle bei jedem Aufruf per Flag (`--provider`, `--pipeline-modell`, `--judge-modell`) und den Key inline im Env. Ziel: provider + Modelle **einmal** in die Umgebung legen, danach nur noch die Lauf-Selektoren angeben. S35d bleibt gewahrt — Env ist explizite Konfiguration, kein Code-Default; fehlt etwas, weiterhin lautstarker Abbruch, kein stiller Fallback.

## Gebaut

1. **Neues Konfig-Modul** `evals/eval-konfig.js` — reine Funktion `leseEvalKonfig(argv, env)`: löst provider + beide Modelle aus **Flag ODER Env** auf (Flag hat Vorrang vor Env, Env vor Vorgabe `anthropic`). Erlaubte Provider und ihre Key-Variablen stehen in einem einzigen Objekt (`PROVIDER_KEY`) — eine Quelle der Wahrheit, keine Modell-/Providerliterale in `||`-Fallback-Position (Grep-Wächter bleibt grün). Wirft `EvalKonfigFehler` bei: unbekanntem Provider, fehlendem Key zum Provider, fehlendem Pipeline- **oder** Judge-Modell (kein Default, S35d), Judge == Pipeline ohne `--erlaube-gleiches-modell`.
2. **`evals/runner.js` schlank gemacht** — der Inline-Block (Provider/Key/Modell-Auflösung + vier `console.error/exit`-Zweige) weicht einem `leseEvalKonfig`-Aufruf; `EvalKonfigFehler` wird zur klaren CLI-Meldung (`exit 2`), andere Fehler propagieren. Der ungenutzte `flag`-Helfer entfiel. Usage-Kommentar dokumentiert jetzt den Env-Weg.
3. **Warum ein separates Modul:** `runner.js` ruft `main()` ohne Import-Guard auf — ein Test, der `runner.js` importiert, würde `main()` (und dessen `process.exit`) auslösen. Die reine Funktion in `eval-konfig.js` ist ohne Seiteneffekt isoliert testbar.
4. **Test** `tests/unit/eval-konfig.spec.js` (+7): Env-only-Auflösung; Flag-Vorrang vor Env (Provider + Modelle); Default-Provider `anthropic`; fehlendes Modell → Fehler; fehlender Key → Fehler nennt die Key-Variable; unbekannter Provider → Fehler; Judge == Pipeline → Fehler bzw. mit Flag erlaubt.

## Betrieb: einmal setzen, dann kurz aufrufen

```bash
export EVAL_PROVIDER=anthropic          # anthropic | mistral
export EVAL_PIPELINE_MODEL=<modell>
export EVAL_JUDGE_MODEL=<modell>
export ANTHROPIC_API_KEY=sk-…           # bzw. MISTRAL_API_KEY zum gewählten Provider

npm run eval -- --familie GATE          # nur noch Selektoren
```

Flags überschreiben die Umgebung pro Lauf, z. B. einmalig auf Mistral gegenprüfen ohne die Env zu ändern:

```bash
npm run eval -- --provider mistral --pipeline-modell <m> --judge-modell <m> --szenario AUF-01
```

(Für dauerhaftes Ablegen: die `export`-Zeilen in dein Shell-Profil oder eine gesourcte Datei. Node ≥ 20 kann alternativ `node --env-file=.env evals/runner.js …`.)

## Verhältnis zu S47

Unabhängig. S47 (Provider-Schalter im Worker) ist bereits in `main` gemergt und berührt `runner.js` nicht — der Alt-Anker des Patches passt daher weiterhin. Namensparallele: der Worker-Schalter heißt `LLM_PROVIDER`, der Eval-Provider `EVAL_PROVIDER` (bewusst getrennter Namensraum, weil im Eval fast immer zwei verschiedene Modelle gegeneinander laufen und die Werte lokale Shell-Variablen sind, keine Deploy-Secrets).

## Auslieferung

`patch-s48-eval-konfig-env.mjs` — Ganzdatei-Ersetzung mit SHA-256-Anker, `--dry-run`, idempotent. 1 Ersetzung (`runner.js`) + 2 Neuanlagen (`eval-konfig.js`, Test).

**Verifiziert auf frischem Klon (`1938baa`):** dry-run → apply → 2. Lauf idempotent (3× skip) → Byte-Abgleich gegen verifizierte Fassung identisch (3/3) → `npx vitest run` 562 grün → `npm run build` Kern `7a02d852645581b1` (unverändert). Grep-Wächter (S35d) grün — `eval-konfig.js` enthält keine Modell-/Provider-Fallback-Literale. Kein Rebuild/Redeploy nötig (reines CLI-Werkzeug).
