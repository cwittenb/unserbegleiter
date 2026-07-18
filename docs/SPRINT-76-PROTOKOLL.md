# Sprint S76 — Strukturausgabe: Adapter-Fähigkeit + Judge-Migration

Basis: `4148fc5` (S75) · Referenz: Designnotiz Structured Outputs (D1–D5)
Tests: 936 grün (810 Struktur · 97 Worker · 25 Engine · 4 e2e) · Kern `bd9d633cea8f4854`

## Warum

Die Struktur wurde bisher aus Fließtext geparst (Block-Marken, Zaun-Toleranz,
Korrektur-Runde, Parser-Rettung). Zwei Sonden gegen `mistral-large-latest`
haben gemessen, dass provider-erzwungene Strukturausgabe diese Fehlerklasse
strukturell beseitigt:

- Sonde v1 (Judge-Fall, n=5 je Variante): `json_schema` mit und ohne `strict`
  je 100 % Parse + Schema; der prompt-basierte `json_object`-Modus (≙ heutige
  Konvention) nur 80 % strukturtreu.
- Sonde v2 (Konversations-Turn, n=3 je Szenario): nullable Block-Union
  (`anyOf` + `null`) und nullable Marker-Enum unter `strict` → 100 %;
  Streaming liefert echte Deltas; Textqualität im JSON-Feld unverändert.

S76 zieht daraus die kleinste Konsequenz: die Fähigkeit im Adapter und der
Judge als erster Nutznießer. Engine, UI und Worker-Streaming bleiben unberührt
(S77).

## Was geändert wurde

### 1 · Adapter (`core/llm/adapter.js`)

Fassade um ein Optionen-Objekt erweitert, rückwärtskompatibel:

    call(sys, msgs)                    → { text, stop, usage }        (unverändert)
    call(sys, msgs, onDelta)           → Streaming                    (unverändert)
    call(sys, msgs, { structured })    → { text, stop, usage, data }  (neu)

- `leseAufrufOptionen` unterscheidet Funktion (Altpfad `onDelta`) von Objekt
  (Optionen). Exportiert und einzeln getestet.
- **anthropic**: `tools` + `tool_choice: {type:"tool"}` — erzwungener Tool-Use;
  `data` ist der `input` des `tool_use`-Blocks. Das Schema-Objekt wird
  UNVERÄNDERT durchgereicht, damit die Serialisierung je Aufruf identisch
  bleibt (Prompt-Cache-Treffer; per Test abgesichert).
- **mistral / openai-kompatibel**: `response_format: json_schema` mit
  `strict: true` (Produktionsform lt. Sonde v1).
- **proxy**: `structured` wandert im Body zum Worker, `data` kommt in der
  Fassade zurück.
- Fehlerdesign ohne stillen Downgrade: kein `tool_use`-Block ⇒ Wurf mit
  Diagnose-Auszug; kaputtes JSON ⇒ Wurf mit Auszug; `stop_reason=max_tokens`
  bzw. `finish_reason=length` ⇒ **harter** Abschneide-Fehler (halbes JSON ist
  keine halbe Antwort); HTTP-4xx trägt den Roh-Körper in die Meldung (macht
  den dokumentierten 422-Fall von Dritt-Deployments sichtbar).
- `structured` + Streaming wirft bewusst mit Verweis auf S77 — kein halbgares
  Verhalten vor dem Worker-Extraktor.

### 2 · Worker (`platforms/cloudflare/worker/index.js`)

`/api/llm` nimmt optional `structured` entgegen und reicht es an den
direct-Adapter durch. Grenzen am öffentlichen Endpunkt:

- unvollständige Angabe (`name`/`schema` fehlt) ⇒ 400, kein Upstream-Kontakt;
- `JSON.stringify(structured).length > 20000` ⇒ 400 (Schema-Bomben);
- `structured` + `stream` ⇒ 400 mit Verweis auf S77.

Missbrauchsschutz (Duplikat-Wächter → Rate → Kontingent) liegt unverändert
davor; unangemeldet bleibt es bei 401.

### 3 · Judge (`evals/judge/judge.js`)

- Neues `JUDGE_SCHEMA` (`judge_bewertung`), Wire-Felder **englisch**:
  `{ checks: [{ id, verdict: "yes"|"no", evidence }] }`, `strict`-tauglich
  (`required` vollständig, `additionalProperties: false`). Begründung: neue
  Schemas entstehen gleich anglisiert, damit die Wire-Anglisierung (S31) sie
  nicht erneut anfassen muss. **Prompts bleiben deutsch**, und die interne
  `antworten`-Struktur bleibt `ja`/`nein` — `yes`/`no` wird beim Einlesen
  zurückgemappt, damit Härteregeln, Berichte und Goldens EINE Wahrheit behalten.
- `JUDGE_PROMPT_VERSION` `j4` → `j5`: im strukturierten Pfad entfallen die
  JSON-Formatregeln (Beispiel, Zaun-Verbot) und das Verbot gerader
  Anführungszeichen. Letzteres war eine reine Parser-Krücke und hat die Belege
  verzerrt (Sonde v1: gerade Anführungszeichen wurden ersetzt). Die
  inhaltlichen Härtungsregeln aus j4 sind in BEIDEN Pfaden identisch.
- `pruefeJudgeDaten` prüft die fachliche Gültigkeit auf `data` — Vollständigkeit
  aller Szenario-Check-ids, gültiges `verdict`. Transportgarantie ≠ Gültigkeit:
  diese Schicht bleibt dauerhaft.
- `richte(..., { strukturiert = true })`: der strukturierte Pfad ist die
  Produktionsform und läuft **ohne** Korrektur-Runde und **ohne** Parser-Rettung.
  Retry + Backoff bleiben (Auslastung, `exceeded_limit`), die Härteregel bleibt
  (unbewertet ≠ bestanden).

### 4 · Ballast-Register (D5)

`parseJudge`, `retteJudge` und `KORREKTUR` bedienen nur noch den Fallback-Pfad
(`strukturiert: false`) und bleiben getestet in Betrieb. **Abbau-Kriterium:**
ein vollständiger Eval-Zyklus über beide Provider mit 0 Transport-Ausfällen im
strukturierten Pfad — dann entfernt ein Folge-Patch die drei Bausteine samt
Fallback-Zweig. Die semantischen Validatoren sind KEIN Ballast.

## Tests

Neu (30):

- `tests/unit/adapter-structured.spec.js` (14): Request-Übersetzung je Provider,
  `data`-Extraktion, Prompt-Caching + identische Tool-Serialisierung,
  Umlaut-/Anführungszeichen-Treue, alle Fehlerfälle, Proxy-Durchreichung,
  Optionen-Fassade, Rückwärtskompatibilität des Request-Körpers.
- `tests/unit/judge-structured.spec.js` (10): Schema-Strenge, j5-Promptvarianten,
  yes/no→ja/nein-Mapping, fachliche Lücken, Retry, Abschneide-Ursache,
  Fallback-Schalter.
- `tests/worker/llm-structured.spec.js` (6): Tool-Use-Übersetzung im Worker,
  Altpfad unberührt, 400-Grenzen ohne Upstream-Kontakt, 401 unangemeldet.

Migriert: alle Judge-Mocks der Eval-Specs liefern jetzt `data` mit den
Wire-Feldern (`eval-runner`, `eval-artifact`, `eval-persistenz`,
`eval-telemetrie`, `eval-fortschritt`, `judge-golden`, `judge-haertung`,
`stufe-d`). `judgeQueue` reicht Objekte unverändert durch, `judgeJson`
übersetzt die vertraute ja/nein-Schreibweise der Fixtures ins Wire-Format,
`judgeText` bedient die Fallback-Pfad-Tests. Die Korrektur-Runden-Tests sind
als Fallback-Pfad kenntlich gemacht und laufen mit `strukturiert: false`.

## Offen / nächste Schritte

- **S77**: Engine-Turn-Schema (`antwort`/`marker`/`block`-Union) + Worker-
  Extraktor (D1) + Feldreihenfolge-Kanarie (D2) + Artefakt-Pfad ohne
  Live-Streaming (D3).
- Echter Eval-Probelauf gegen beide Provider (Akzeptanzkriterium 3) steht
  noch aus — er braucht Keys und läuft außerhalb der Sandbox.
- Eval-Backlog-Learning aus Sonde v1: Belege sind nicht zeichengenau verbatim
  (gerade Anführungszeichen werden ersetzt) — künftige Beleg-Vergleiche
  anführungszeichen-tolerant auslegen.
