# Sprint S35 — Structured Outputs (Judge · Transkript-Pipeline · Mistral-Blocktest)

Stand: 2026-07-12 · Status: Entwurf zur Bestätigung

## Ziel

Die Fehlerklasse "syntaktisch kaputtes JSON aus dem Modell" strukturell eliminieren —
dort, wo die Ausgabe reine Datenstruktur ist (Judge, Transkript-Pipeline). Zugleich die
offene Provider-Frage (Mistral-Zuverlässigkeit bei strukturierten Prompts) mit einem
messbaren Blocktest beantworten, bevor über eine Block-Migration entschieden wird.

## Nicht-Ziele (explizit)

- KEINE Umstellung der Session-Blöcke (BEFUND, GATE, …) auf Tool-Use — das ist eine
  eigene Entscheidung NACH dem Blocktest (S35c liefert die Datengrundlage).
- KEINE Änderung an Markern ([[SCALE-SAFETY]] etc.) — Konvention bleibt.
- KEINE Änderung an den semantischen Schema-Validatoren (`core/contracts/schemas.js`) —
  Transportgarantie ≠ fachliche Gültigkeit; die zweite Prüfschicht bleibt unverändert.
- Kein Streaming.

---

## S35a — Adapter-Fähigkeit "structured"

**Fassaden-Erweiterung (rückwärtskompatibel):**

```
callClaude(system, messages)                          → { text, stop, usage }            (unverändert)
callClaude(system, messages, { structured })          → { text, stop, usage, data }
   structured = { name: "judge_bewertung", schema: <JSON Schema>, description?: string }
```

- Ohne `structured`-Option verhält sich der Adapter byte-identisch wie heute
  (bestehende adapter.spec.js-Tests laufen unverändert grün).
- `data` ist das bereits geparste Objekt; `text` bleibt bei structured-Aufrufen leer
  oder enthält begleitenden Text, falls der Provider einen liefert.

**Provider-Übersetzung:**

| Provider | Mechanik |
|---|---|
| anthropic | `tools: [{name, description, input_schema: schema}]` + `tool_choice: {type:"tool", name}`; `data` = `input` des tool_use-Blocks |
| mistral | `response_format: {type:"json_schema", json_schema:{name, schema, strict:true}}`; `data` = `JSON.parse(choices[0].message.content)` |
| openai-kompat | wie mistral (gleiches Format) |
| proxy | `structured` wird im Request-Körper durchgereicht; der Worker (direct-Modus) übersetzt — Fassadenform der Antwort um `data` erweitert |

**Wechselwirkung Prompt-Caching (anthropic):** Tool-Definitionen stehen im Request vor
dem System-Prompt und sind Teil des cachebaren Präfixes. Bestehende cache_control-Logik
bleibt; ein Test prüft, dass bei structured-Aufrufen System-Prompt-Caching weiterhin
gesetzt wird und die Tool-Definition je Aufruf identisch serialisiert ist (sonst
Cache-Miss).

**Fehlermodell:** Liefert der Provider trotz Erzwingung kein schema-konformes Objekt
(z. B. `stop_reason` ≠ tool_use), wirft der Adapter mit diagnostischem Auszug — KEINE
Reparaturheuristik im Adapter (gleiche Grenze wie parseBlock: Ballast-Register §1.4).

**Tests (Vitest, Mock-fetch):**
- Request-Körper je Provider korrekt (tool_choice bzw. response_format, strict).
- `data`-Extraktion aus tool_use-Block bzw. content-JSON.
- Rückwärtskompatibilität: Aufruf ohne `structured` erzeugt identische Request-Körper
  wie vor S35 (Snapshot-Vergleich).
- Proxy-Durchreichung inkl. Cookie-Mitnahme.
- Fehlerfall: kein tool_use-Block → verständlicher Wurf mit Auszug.

---

## S35b — Judge & Transkript-Pipeline auf structured

**Judge (`evals/judge/judge.js`):**
- JSON Schema `judge_bewertung`: `{checks: [{id: string, antwort: "ja"|"nein", beleg: string}]}`,
  `required` vollständig, `additionalProperties: false`.
- `richte()` ruft mit `structured` auf; die semantische Prüfung bleibt unverändert
  (jeder Check aus dem Szenario beantwortet, id-Abdeckung, ja/nein) — sie prüft jetzt
  `data` statt geparsten Text.
- Retry+Backoff bleibt (exceeded_limit-Learning); die JSON-KORREKTUR-Runde entfällt
  im structured-Pfad.
- **Ballast-Abbau mit Gate:** `retteJudge` und die KORREKTUR-Konstante bleiben in
  diesem Sprint als toter, aber getesteter Fallback erhalten. Abbau-Kriterium
  (dokumentiert im Ballast-Register): ein vollständiger Eval-Lauf über alle Szenarien
  mit 0 Transport-Ausfällen im structured-Pfad → Folge-Patch entfernt beide.
- Härteregel unverändert: unbewertet ≠ bestanden.

**Transkript-Pipeline (Ernte, DeID-Gate):**
- Je Stufe ein JSON Schema analog; Aufruf über dieselbe Adapter-Fähigkeit.
- Fachliche Nachprüfungen (z. B. DeID: kein Klarname im Output) bleiben als eigene
  Prüfschicht NACH dem Parse — das Schema garantiert Form, nie Inhalt.

**Tests:**
- Judge-Schema-Fixture: gültige/ungültige `data`-Objekte gegen semantische Prüfung.
- Ein Integrationstest je Pipeline-Stufe mit Mock-LLM im structured-Modus.
- Kanarie: Härteregel-Test (unbewerteter Lauf zählt nicht als bestanden) unverändert grün.

---

## S35c — Mistral-Blocktest (Messung, keine Migration)

**Frage:** Emittiert mistral-large mit der bestehenden Text-Konvention
(Block-Marken + reines JSON) zuverlässig gültige Blöcke — oder braucht die
Block-Schicht die Adapter-Fähigkeit aus S35a?

**Aufbau:**
- Testtreiber im Eval-Harness (direct-Modus, Mistral-Key): je Blocktyp mindestens ein
  Szenario, das die Block-Emission erzwingt — Kandidaten: ZEITLEISTE (Einzelsession-
  Abschluss), GATE-BLOCK (Aufdeck-Prüfung), BEFUND (gemeinsame Session), AUFTRAG-BLOCK
  (Änderung mit beiden Okays), MOMENT-BLOCK. N = 10 Läufe je Szenario.
- Gemessen wird je Lauf: (1) Block gefunden ja/nein, (2) parseBlock ok beim ersten
  Versuch, (3) ok nach der einen Korrektur-Runde, (4) Marker-Disziplin (keine rohen
  Marker im Fließtext), (5) Sprachdisziplin (deutsche Ausgabe).
- Zum Vergleich derselbe Lauf gegen anthropic (Baseline).

**Entscheidungsgate (dokumentiert als Designnotiz-Nachtrag):**
- Erstversuchs-Parserate ≥ 95 % UND nach Korrektur-Runde ≥ 99 % → Text-Konvention
  reicht auch für Mistral; Block-Migration bleibt offen/unnötig.
- Darunter → Folge-Sprint "Blöcke über structured" wird eingeplant (Adapter-Fähigkeit
  existiert dann bereits aus S35a; Text-Konvention bleibt Fallback, Validatoren bleiben
  zweite Schicht).

**Nebenbefund erwünscht:** Marker- und Sprachdisziplin-Werte fließen in die offene
Provider-Entscheidung (EU/DSGVO) ein, unabhängig vom Blockergebnis.

---

## S35d — Konfigurationspflicht für Provider/Modell (Befund vom 2026-07-12)

**Regel:** Provider, Modus und Modell werden NIRGENDS im Code definiert oder als
Fallback ergänzt — fehlende Konfiguration ⇒ klare Fehlermeldung. Einzige Ausnahme:
die Artefakt-Umgebung (`platforms/artifact/*`), dort explizit und lokal.

**Befund am Stand eaf5928 (Verstöße):**
1. `core/llm/adapter.js` — LLM_DEFAULTS enthält provider, mode und drei Modellnamen;
   jeder Aufruf fällt still darauf zurück.
2. `platforms/cloudflare/worker/index.js` — `env.LLM_PROVIDER || "anthropic"`,
   `env.LLM_API_KEY || "test"`, fehlendes `env.LLM_MODEL` fällt aufs Kern-Default.
   **Bug obendrein:** `env.LLM_MODEL` wird immer als `models.anthropic` eingetragen —
   bei `LLM_PROVIDER=mistral` wird das konfigurierte Modell ignoriert.
3. `evals/runner.js` — Modell-Fallbacks für `--pipeline-modell`/`--judge-modell`.

**Maßnahmen:**
- LLM_DEFAULTS behält nur technische, modellfremde Defaults (proxyUrl, maxTokens,
  cache, stream). `makeAdapter` wirft mit verständlicher Meldung, wenn provider,
  mode oder das Modell des gewählten Providers fehlen. Ausnahme im Fehlerdesign:
  `mode:"proxy"` braucht weder Provider noch Modell (der Worker entscheidet).
- Worker: alle `||`-Fallbacks entfernt; fehlende env-Variablen ⇒ 500 mit
  "LLM_PROVIDER / LLM_MODEL / LLM_API_KEY nicht konfiguriert". Modell-Zuordnung
  korrigiert: `models: { [env.LLM_PROVIDER]: env.LLM_MODEL }`.
- Runner: keine Modell-Defaults; fehlende Flags ⇒ exit 2 mit Flag-Hinweis.
- Artefakt-Plattform: explizite `ARTEFAKT_LLM`-Konstante (provider anthropic,
  keyless, Modell) in `platforms/artifact/` — die einzige sanktionierte Stelle;
  eval-app-UI-Vorbelegungen bleiben (Artefakt-Ausnahme).
- **Grep-Wächter-Test** (nach dem Muster des Key-Wächters): Modellnamen-Muster
  (`claude-`, `mistral-`, `gpt-`) dürfen außerhalb von `platforms/artifact/**`
  und Tests/Docs in keinem Quellcode vorkommen; ebenso kein `provider:`-Literal
  im Kern außerhalb der Provider-Tabelle.

**Reihenfolge:** S35d VOR S35a — die Adapter-Signatur wird ohnehin angefasst;
erst die Konfigurationspflicht herstellen, dann darauf die structured-Fähigkeit bauen.

---

## Reihenfolge & Abhängigkeiten

S35d → S35a → S35b (braucht die Fähigkeit) · S35c parallel zu S35b möglich (nutzt
nur den bestehenden Text-Pfad + direct-Modus, benötigt aber die explizite
Modell-Konfiguration aus S35d).

## Akzeptanzkriterien (Sprint-Abschluss)

1. Adapter-Fassade erweitert, alle Alt-Tests grün, neue Tests grün (npx vitest run).
2. Judge läuft vollständig über structured; ein kompletter Eval-Lauf ohne
   Transport-Ausfall dokumentiert.
3. Transkript-Pipeline-Stufen laufen über structured.
4. Mistral-Blocktest-Bericht mit Zahlen + Entscheidungsgate-Auswertung liegt als
   Markdown vor.
5. Ballast-Register-Eintrag: Abbaupfad für retteJudge/KORREKTUR mit Kriterium.

## Lieferform

Wie gehabt: frischer Clone von origin/main als Basis → ein Node-ESM-Patchskript
(anker-basiert, idempotent, Dry-Run) + neue Dateien → Tests → Core-Hash → Ablage in
/mnt/user-data/outputs. S35c liefert zusätzlich den Messbericht.

## Offene Punkte zur Bestätigung

- `strict:true` bei Mistral: falls das Modell/Endpoint json_schema-strict nicht für
  alle Konstrukte unterstützt, Rückfallebene `json_object` + Schema-Prüfung clientseitig
  — Entscheidung erst nach erstem Live-Aufruf, nicht spekulativ einbauen.
- N=10 je Szenario in S35c: reicht für eine Richtungsentscheidung; für harte
  Prozentzahlen wäre N=30 nötig — bewusst iterativ klein starten.
- Worker-Proxy: `structured` durchreichen jetzt mitbauen (eine Stelle) oder auf den
  Moment verschieben, in dem ein Browser-Pfad es braucht? Vorschlag: mitbauen, da der
  Eval-Runner ohnehin direct läuft und die Proxy-Änderung trivial ist.
