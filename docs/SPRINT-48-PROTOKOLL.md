# Sprint S48 — Eval-Härtung: Adapter-Resilienz, RPM-Drossel, absturzsichere Persistenz

**Status:** umgesetzt & verifiziert · **Core-Hash:** `d46933ab404ea747`
**Basis-Commit:** `19241d1` (`patch-s49-eval-env-datei`) · **Tests:** 582 grün / 69 Dateien
**Ablage:** `docs/SPRINT-48-PROTOKOLL.md`

> Umgesetzt nach dem genehmigten `SPRINTPLAN-S45-eval-haertung.md`. Zwei Nummern-/Basis-
> Anpassungen gegenüber dem Plan (beide Konsequenz aus dem fortgeschrittenen Repo-Stand,
> nicht aus einer Design-Änderung): siehe Abschnitt 5.

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
  bei Abbruch (`main().catch`) blieb **keine Datei** → abgebrochene Läufe waren nicht
  auswertbar.

## 2 · Umsetzung (Designentscheidungen)

**D1 — Retry + Backoff transportneutral im Adapter.**
Neuer, injizierbarer Wrapper `mitWiederholung` um beide direkten Transportaufrufe.
Wiederholt bei **HTTP 429/5xx**, liest `Retry-After` (Sekunden *oder* HTTP-Date),
sonst gedeckelter Exponential-Backoff. Ein **`resp.status >= 400`-Check vor dem
Parsen** wirft jetzt einen typisierten `LlmHttpError { status, retryAfterS, koerper }`
(behebt A). Der Request-Body ist ohne `onDelta` **byte-identisch** zum bisherigen
Stand — die 27 bestehenden Adapter-Tests bleiben grün.

**D2 — Geteilte RPM-Drossel (Slot-Scheduler), pro Workspace.**
`baueDrossel({ rpm, uhr })` als reine, mit Mock-Uhr testbare Funktion. **Eine**
Instanz wird von Pipeline **und** Judge geteilt (Mistrals Limit gilt pro
Organisation/Workspace, nicht pro Key). Gate vor jedem Request inkl. Retries.
CLI: `--rpm N` (Default **2** = 1 Req/30 s, Free-Tier-sicher); `--rpm unlimited`
(bzw. `0`) hebt die Drossel fürs Scale-/Anthropic-Tier auf.

**D3 — Absturzsichere, inkrementelle Persistenz.**
`laufeAlle` ruft nach **jedem** Szenario `deps.persistiere(teilbericht)`; der Kern
bleibt fs-frei (I/O liegt in `runner.js`, das den Dateipfad vorab bestimmt und
dieselbe Datei fortschreibt). Bericht trägt `vollstaendig: true|false`. Bei Abbruch
spiegelt die Datei den erreichten (Teil-)Stand — abgebrochene Läufe sind auswertbar.

**D4 — `--weiter-bei-fehler` (Opt-in, nicht Default).**
Ein nach Retries hart gescheitertes Szenario wird als `status:"fehler"` geführt (zählt
nie als bestanden). **Default = Abbruch + Flush** (respektiert „bricht eh ab"); mit
`--weiter-bei-fehler` läuft der Lauf über den Fehler hinweg weiter.

**Bewusst NICHT angefasst: `evals/judge/judge.js`.** Der Retry in `richte` (inkl.
Korrektur-Runde und „API-Fehler → frisch, kein Correction") ist ausführlich getestet.
Die Pipeline-Resilienz kommt vollständig aus der Adapter-Schicht; damit bleiben alle
Judge-Tests unberührt und das Ziel ist trotzdem erreicht.

## 3 · Geänderte / neue Dateien

**Ersetzt (Ganzdatei, mit SHA-256-Anker):**

| Datei | alt (Anker) | neu |
|---|---|---|
| `core/llm/adapter.js` | `9371d08d…76ba84` | `062ab881…5ab7d3` |
| `evals/runner.js` | `0963c3b6…fedc9d4` | `55d4c5d1…b90f6eb` |
| `evals/runner-kern.js` | `0f161475…d475824` | `a1647eea…4255561` |

**Neu:**
`tests/unit/drossel.spec.js` (5) · `tests/unit/adapter-resilienz.spec.js` (7) ·
`tests/unit/eval-persistenz.spec.js` (3)

## 4 · Tests (neu, +15)

- **drossel.spec** — 2 RPM ⇒ 30 s Slot-Abstand (Mock-Uhr); unter der Rate kein Warten;
  `unlimited`/ungültig ⇒ No-Op; geteiltes Budget zählt Pipeline+Judge zusammen.
- **adapter-resilienz.spec** — `parseRetryAfter` (Sekunden/HTTP-Date); Mistral-429 ohne
  `.error` wirft `LlmHttpError` (Regression zu A); 400 wirft ohne Retry; 429/5xx werden
  mit `Retry-After`/Backoff wiederholt, dann Erfolg; erschöpfte Versuche werfen; Drossel
  greift vor jedem Request.
- **eval-persistenz.spec** — `persistiere` je Szenario, Zwischenstände `vollstaendig:false`,
  Endstand `true`; harter Pipeline-Fehler ⇒ Abbruch mit persistiertem Teilstand inkl.
  `status:"fehler"`; `--weiter-bei-fehler` läuft durch, Fehler zählt nie als bestanden.

Bestehende Suiten unverändert grün: `adapter.spec` (14), `adapter-stream.spec` (13),
`eval-runner.spec` (18).

## 5 · Zwei Anpassungen gegenüber dem Plan

1. **Sprint-Nummer S45 → S48.** Bei frischem Clone zeigte sich: `SPRINT-45-` und
   `SPRINT-46-PROTOKOLL.md` existieren bereits, HEAD war `patch-s47…`. „S45" war
   vergeben; auf die nächste freie Nummer **S48** hochgezogen. Inhalt = genehmigter Plan.
2. **`runner.js` auf S49 re-basiert.** Während der Arbeit sprang der Upstream weiter
   (`1938baa` → `19241d1`); der Commit **`patch-s49-eval-env-datei`** hatte `runner.js`
   umgebaut (Provider/Modell/Key-Auflösung nach `eval-konfig.js`/`env-datei.js`
   verlagert, inline-`flag`-Helfer entfernt). Meine `runner.js`-Änderungen wurden auf
   diesen neuen Stand neu aufgesetzt (Alt-Anker `0963c3b6…`). `adapter.js` und
   `runner-kern.js` waren an diesem Tip unverändert — deren Anker gelten weiter.
   Der Patch selbst hat den Konflikt **korrekt abgefangen** (Anker-Mismatch → keine
   halbe Schreibung); die Neufassung war nur nötig, damit er auf dem aktuellen Tip
   sauber greift.

## 6 · Verifikation (frischer Clone `19241d1`)

- **Trockenlauf** → 6 geplant, 0 Fehler, Exit 0.
- **Anwenden** → 6 ersetzt/neu, 0 Fehler, Exit 0.
- **Idempotenz** (2. Lauf) → 0 geändert, 6 übersprungen, Exit 0.
- **Byte-Vergleich** gegen die getestete Referenz → alle 6 Dateien identisch.
- **`npx vitest run`** → **582 grün / 69 Dateien**.
- **`npm run build`** → Kern **`d46933ab404ea747`**, Eval-Artefakt gebaut.
- Offline-Smoke: `--rpm abc` ⇒ klare Meldung + Exit 2.

## 7 · Anwenden

```bash
git clone --depth 1 https://github.com/cwittenb/unserbegleiter.git && cd unserbegleiter
node /pfad/patch-s48-eval-haertung-rpm-drossel-persistenz.mjs --dry-run
node /pfad/patch-s48-eval-haertung-rpm-drossel-persistenz.mjs
npx vitest run && PAARE_KV_ID=1590b0377c4a47588ec27f3039edf4d5 npm run build
```

> Springt der Upstream erneut und ändert `evals/runner.js`, meldet der Patch einen
> sauberen Anker-Mismatch für genau diese Datei und schreibt nichts Halbes —
> dann kurz Bescheid geben, ich rebasiere die eine Datei nach.

## 8 · Nutzung

```bash
# Free-Tier (Default-Drossel 2 RPM, geteilt über Pipeline+Judge):
npm run eval -- --provider mistral --pipeline-modell <klein> --judge-modell <mittel> --familie GATE

# Scale-/Anthropic-Tier (keine Drossel):
npm run eval -- --rpm unlimited --familie GATE

# Über Einzelfehler hinweg durchlaufen (Fehler-Szenario markiert):
npm run eval -- --weiter-bei-fehler --familie GATE
```

Bei Abbruch liegt der Teilstand als `evals/ergebnisse/<zeit>.json` mit
`vollstaendig:false` vor und ist auswertbar.
