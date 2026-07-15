# Sprint S51 — Eval-Härtung: Adapter-Resilienz, RPM-Drossel, absturzsichere Persistenz

**Status:** umgesetzt & verifiziert · **Core-Hash:** `49cbda035856c690`
**Basis-Commit:** `fe062c3` (`patch-s50-eval-modelle-pro-provider`) · **Tests:** 584 grün / 69 Dateien
**Ablage:** `docs/SPRINT-51-PROTOKOLL.md`

> Inhaltlich identisch zum genehmigten Plan (`SPRINTPLAN-S45-eval-haertung.md`). Nur
> neu gegen den aktuellen Repo-Stand aufgesetzt und auf **S51** nummeriert — die Basis
> war zwischenzeitlich bis `s50` gewandert (siehe Abschnitt 5).

---

## 1 · Ziel

Der Eval-Runner unterstützte `--provider mistral` bereits, war aber gegen Mistrals
Ratengrenzen (429) nicht robust und verlor bei Abbruch den gesamten Lauf. Drei
verifizierte Schwachstellen sind behoben:

- **A** — `core/llm/adapter.js` (direkter Pfad) prüfte den HTTP-Status nicht; ein 429
  ohne `.error`-Feld (Mistral) lieferte **still `text:""`** statt eines Fehlers.
- **B/C** — Retry existierte nur im Judge (`richte`), nicht in der Pipeline; kein
  `Retry-After`, keine Drossel → im Free-Tier lief man in die ~2-RPM-Wand.
- **D** — `evals/runner.js` schrieb die Ergebnisdatei erst **nach** dem ganzen Lauf;
  bei Abbruch blieb **keine Datei** → abgebrochene Läufe waren nicht auswertbar.

## 2 · Umsetzung (Designentscheidungen)

**D1 — Retry + Backoff transportneutral im Adapter.**
Injizierbarer Wrapper `mitWiederholung` um beide direkten Transportaufrufe. Wiederholt
bei **HTTP 429/5xx**, liest `Retry-After` (Sekunden *oder* HTTP-Date), sonst gedeckelter
Exponential-Backoff. **`resp.status >= 400`-Check vor dem Parsen** wirft `LlmHttpError`
(behebt A). Request-Body ohne `onDelta` byte-identisch — die 27 Adapter-Tests bleiben grün.

**D2 — Geteilte RPM-Drossel (Slot-Scheduler), pro Workspace.**
`baueDrossel({ rpm, uhr })`, mit Mock-Uhr testbar. **Eine** Instanz für Pipeline **und**
Judge (Mistral-Limit gilt pro Organisation/Workspace). `--rpm N` (Default **2** =
1 Req/30 s), `--rpm unlimited`/`0` hebt sie auf.

**D3 — Absturzsichere, inkrementelle Persistenz.**
`laufeAlle` ruft nach **jedem** Szenario `deps.persistiere(teilbericht)`; der Kern bleibt
fs-frei (I/O in `runner.js`, Dateipfad vorab). Bericht trägt `vollstaendig: true|false`;
bei Abbruch spiegelt die Datei den Teilstand → auswertbar.

**D4 — `--weiter-bei-fehler` (Opt-in).**
Hart gescheitertes Szenario → `status:"fehler"` (zählt nie als bestanden). Default =
Abbruch + Flush.

**Bewusst NICHT angefasst: `evals/judge/judge.js`** — der dortige Retry ist getestet; die
Pipeline-Resilienz kommt aus der Adapter-Schicht.

## 3 · Geänderte / neue Dateien

**Ersetzt (Ganzdatei, mit SHA-256-Anker):**

| Datei | alt (Anker, HEAD `fe062c3`) | neu |
|---|---|---|
| `core/llm/adapter.js` | `9371d08d…76ba84` | `553a54cd…` |
| `evals/runner.js` | `009a85c0…93bad8` | `c59d8e57…` |
| `evals/runner-kern.js` | `0f161475…d475824` | `af460d39…` |

**Neu:** `tests/unit/drossel.spec.js` (5) · `tests/unit/adapter-resilienz.spec.js` (7) ·
`tests/unit/eval-persistenz.spec.js` (3)

## 4 · Tests (neu, +15)

- **drossel.spec** — 2 RPM ⇒ 30 s Slot-Abstand (Mock-Uhr); unter Rate kein Warten;
  `unlimited`/ungültig ⇒ No-Op; geteiltes Budget zählt Pipeline+Judge zusammen.
- **adapter-resilienz.spec** — `parseRetryAfter` (Sekunden/HTTP-Date); Mistral-429 ohne
  `.error` wirft `LlmHttpError` (Regression zu A); 400 wirft ohne Retry; 429/5xx werden
  mit `Retry-After`/Backoff wiederholt; erschöpfte Versuche werfen; Drossel greift.
- **eval-persistenz.spec** — `persistiere` je Szenario, Zwischenstände `vollstaendig:false`,
  Endstand `true`; harter Pipeline-Fehler ⇒ Abbruch mit persistiertem Teilstand inkl.
  `status:"fehler"`; `--weiter-bei-fehler` läuft durch.

Bestehende Suiten unverändert grün: `adapter.spec` (14), `adapter-stream.spec` (13),
`eval-runner.spec` (18).

## 5 · Warum neu aufgesetzt (S48 → S51)

Der ursprünglich verifizierte Patch entstand gegen einen älteren Tip; die Basis wanderte
seither mehrfach und traf dabei jedes Mal `evals/runner.js`:

`e89b5aa → 1938baa (s47) → 19241d1 (s49, runner.js → eval-konfig/env-datei) → fe062c3 (s50, Modelle pro Provider)`

Dieser Patch ist gegen **`fe062c3` (s50)** neu aufgesetzt:
- `adapter.js` und `runner-kern.js` waren an diesem Tip **unverändert** — Anker gelten weiter.
- `runner.js`-Änderungen auf den s50-Stand re-basiert (neuer Alt-Anker `009a85c0…`).
- In-Code-Provenienz und Dateinamen auf **S51** (nächste freie Nummer nach s50).

Der Core-Hash ist jetzt `49cbda035856c690` (statt `d46933ab…`), weil die
`S48→S51`-Umnummerierung `adapter.js` — eine Kern-Datei — berührt.

## 6 · Verifikation (frischer Clone `fe062c3`)

- **Trockenlauf** → 6 geplant, 0 Fehler, Exit 0.
- **Anwenden** → 6 ersetzt/neu, 0 Fehler, Exit 0.
- **Idempotenz** (2. Lauf) → 0 geändert, 6 übersprungen, Exit 0.
- **Byte-Vergleich** gegen die getestete Referenz → alle 6 Dateien identisch.
- **`npx vitest run`** → **584 grün / 69 Dateien**.
- **`npm run build`** → Kern **`49cbda035856c690`**, Eval-Artefakt gebaut.
- Offline-Smoke: `--rpm abc` ⇒ klare Meldung + Exit 2.

## 7 · Anwenden

```bash
git clone --depth 1 https://github.com/cwittenb/unserbegleiter.git && cd unserbegleiter
node /pfad/patch-s51-eval-haertung-rpm-drossel-persistenz.mjs --dry-run
node /pfad/patch-s51-eval-haertung-rpm-drossel-persistenz.mjs
npx vitest run && PAARE_KV_ID=1590b0377c4a47588ec27f3039edf4d5 npm run build
```

> Springt der Upstream erneut und ändert `evals/runner.js`, meldet der Patch einen
> sauberen Anker-Mismatch für genau diese Datei und schreibt nichts Halbes.

## 8 · Nutzung

```bash
# Free-Tier (Default-Drossel 2 RPM, geteilt über Pipeline+Judge):
npm run eval -- --provider mistral --pipeline-modell <klein> --judge-modell <mittel> --familie GATE
# Scale-/Anthropic-Tier (keine Drossel):
npm run eval -- --rpm unlimited --familie GATE
# Über Einzelfehler hinweg durchlaufen (Fehler-Szenario markiert):
npm run eval -- --weiter-bei-fehler --familie GATE
```

Bei Abbruch liegt der Teilstand als `evals/ergebnisse/<zeit>.json` mit `vollstaendig:false`
vor und ist auswertbar.
