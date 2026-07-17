# Sprint S70 — Protokoll: 529/Overload-Härtung (Produktion: Worker + Pages)

**Basis:** `origin/main` @ `48469aa` (patch-s69-boden-und-weg)
**Patch:** `patch-s70-overload-haertung.mjs` (Ganzdatei-Ersetzung, SHA-256-Anker, idempotent, `--dry-run`)
**Testlage nach Sprint:** 802 grün (4 e2e · 20 Engine/Mock · 687 Struktur · 91 Worker/Miniflare) · **Kern-Hash `42b61896e7485eea`**

## Anlass

Beim Betreten des gemeinsamen Raums traf wiederholt `LLM HTTP 529 — overloaded_error`
(Anthropic-seitige Auslastung) den Nutzer als rohe Fehlermeldung. Der Adapter wiederholte
529 zwar bereits (S51: 429/5xx), aber ohne Jitter (Gleichtakt beider Partner), mit knappem
Fenster, und der Fehler verlor an der Proxy-Grenze seinen Code — `fehlerText()` konnte
nichts lokalisieren.

## Gelockte Entscheidungen

- **D1** Core-Jitter + stabiler Code `llm_overloaded` + Code-Durchreichung über die Proxy-Grenze.
- **D2** Worker-Retry **kurz**: `versuche=4`, `backoffMs=1500`, `maxBackoffMs=6000` (Full Jitter);
  Worst-Case-Stille ≈ 10–12 s — im bereits erprobten TTFT-Bereich. Per env übersteuerbar:
  `LLM_VERSUCHE` / `LLM_BACKOFF_MS` / `LLM_MAX_BACKOFF_MS`.
- **D3** Fehlerton: knapp + Handlungshinweis („… bitte sende sie gleich noch einmal").
- **D4=b ohne Zähler** Status-Kanal komplett verdrahtet, Anzeige **zahlenlos**
  („Gerade ist viel los — ich bleibe dran …") + „Erneut senden"-Knopf. Kein „n/m" irgendwo.
- **D5 entfällt** Kein SSE-Heartbeat — Sicherheit kommt aus dem kurzen Fenster (D2).

## Änderungen

### `core/llm/adapter.js`
- `LlmHttpError.code = "llm_overloaded"` bei Status 429/503/529, sonst `null` (non-breaking, `.status` bleibt).
- `mitWiederholung`: **Full Jitter** — Wartezeit `zufall() · min(maxBackoffMs, backoffMs·2^v)`;
  RNG injizierbar (`cfg.zufall`). Ein `Retry-After`-Header schlägt den Jitter IMMER.
  Neuer Hook `onRetry({status, versuch})` vor jeder Wartephase; Callback-Fehler brechen nie ab.
- Fassade: 4. Parameter `onStatus` — `call(sys, msgs, onDelta, onStatus)`.
  - **proxy:** neues SSE-Event `{retry:true}` → `onStatus("overloaded_retry")`; Fehler-Events
    rekonstruieren `e.code` aus flachem `{error, code}`; Alt-Form (nur String) bleibt gültig.
  - **direct/keyless:** lokale Retries melden symmetrisch an `onStatus` (zusätzlich zu `cfg.onRetry`) —
    auch die Artefakt-Sandbox bekommt die Warteanzeige ohne Sonderpfad.

### `platforms/cloudflare/worker/index.js`
- `/api/llm`: Adapter-Konfiguration `llmCfg` mit D2-Retry-Parametern (env-übersteuerbar; Tuning,
  kein Provider-Wissen — Konfigurationspflicht S35d unberührt).
- Streaming-Zweig: eigener Adapter mit `onRetry: () => sende({retry:true})` (zahlenlos);
  Fehler-Event **flach** `{error, code}` — exakt die `fehler()`-Konvention des JSON-Pfads;
  Alt-Clients lesen `error` weiter als String.
- JSON-Altpfad: unverändert — der äußere Catch serialisiert `e.code` bereits via
  `fehler(msg, status, code)`; HTTP-Status ist dann 529.

### `core/engine/engine.js`
- `requestAssistant` reicht `hooks.onStatus` als 4. Argument an `this.llm` durch
  (zweiter, rein informativer Rückkanal neben `onDelta`).

### `core/i18n/index.js` · `de.js` · `en.js`
- `fehlerText(e)`: erkennt Auslastung über `e.code` **oder** nackten Status 429/503/529
  (Altpfade tragen nur `.status`).
- Neue Schlüssel (de/en-Parität): `fehler.code.llm_overloaded`, `chat.ausgelastetWarte`,
  `chat.erneutSenden`.

### `core/ui/app.js`
- `zeigeAusgelastet` (Hook `onStatus`): zahlenlose Warte-Zeile in der Tipp-Blase; eine bereits
  laufende Stream-Anzeige wird nie überschrieben (Retries laufen vor dem ersten Token).
- `warteAntwort`: Auslastungs-Fehler → lokalisierte Meldung + „Erneut senden"-Knopf;
  alle anderen Fehler unverändert (`err(e.message)`).
- „Erneut senden" ruft `engine.resume()` — der gescheiterte Zug liegt vollständig im Verlauf
  (User-Nachricht gespeichert), niemand tippt neu. Jeder **neue** Wartevorgang entfernt einen
  offenen Knopf (ein stehengebliebener Knopf dürfte später keinen falschen `resume()` feuern —
  im UI-Test entdeckt und zentral in `warteAntwort` gelöst).

### Tests (neu: 24 · angepasst: 1)
- `tests/unit/s70-overload.spec.js` (16): 529-Wiederholung & finaler Wurf mit Code; Jitter-Grenzen
  (RNG 0 / ≈1); Retry-After schlägt Jitter; Code-Klassifizierung; `onRetry`/`onStatus` je Retry genau
  einmal; 404 fliegt sofort ohne Retry; Proxy: `{retry}`→`onStatus`, Fehlercode-Rekonstruktion
  (Stream + JSON), Alt-String-Form; `fehlerText`-Lokalisierung (Code, nackter Status, en-Parität, Fallback).
- `tests/unit/s70-overload-ui.spec.js` (4, happy-dom): Warte-Zeile zahlenlos (explizit kein „n/m");
  freundliche Meldung statt Roh-JSON + Knopf; Klick feuert Zug erneut, Nachricht bleibt genau einmal
  im Verlauf, Erfolg räumt auf; code-loser Fehler zeigt KEINEN Knopf.
- `tests/worker/s70-llm-overload.spec.js` (4, Miniflare): 2×529→Erfolg = genau zwei `{retry}`-Events
  (ohne Zahlen) + `{delta}…{done}`; dauerhaft 529 = `{error, code}` flach, kein done, env-Override
  nachweisbar (3 Upstream-Aufrufe); JSON-Altpfad HTTP 529 mit `{error, code}`; Normalfall ohne
  `{retry}`-Events.
- `tests/unit/adapter-resilienz.spec.js` (semantiktreu angepasst): der S51-Exponentialtest pinnt
  `zufall: () => 1` und prüft damit weiterhin exakt die Exponential-**Obergrenze** — die
  ursprüngliche Zusicherung bleibt erhalten, der Jitter ist als neue Schicht anerkannt.

## Bewusste Nicht-Ziele
- Kein Provider-/Modell-Fallback (S35d), kein SSE-Heartbeat (D5 gestrichen), kein Versuchszähler
  in der UI (Ton: die App soll Ruhe ausstrahlen, nicht Kampf), Artefakt-`llm-config` unverändert
  (Entwicklung; profitiert über die Core-Symmetrie trotzdem von Jitter + Warteanzeige).

## Betriebshinweis
Die Worker-Defaults greifen ohne Deploy-Änderung. Bei anhaltenden Overload-Phasen kann das Fenster
ohne Code-Änderung per Worker-env nachjustiert werden (`LLM_VERSUCHE`, `LLM_BACKOFF_MS`,
`LLM_MAX_BACKOFF_MS`); Werte ≤ 0 oder nicht-numerisch fallen auf die Defaults zurück.
