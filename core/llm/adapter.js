// LLM-Adapter — aus der Adapter-Harness übernommen und um den Proxy-Modus
// sowie Streaming erweitert. Fassade bleibt abwärtskompatibel:
//
//   const call = makeAdapter(cfg, fetchFn);
//   await call(systemPrompt, messages)           → { text, stop, usage }
//   await call(systemPrompt, messages, onDelta)  → dito; onDelta(teilText)
//                                                  feuert je Text-Häppchen
//   await call(sys, msgs, onDelta, onStatus)     → dito; onStatus("overloaded_retry")
//                                                  je Auslastungs-Wiederholung (S70)
//   await call(sys, msgs, { structured })        → { text, stop, usage, data } (S76)
//                                                  data = geparste Strukturausgabe
//
// S76 · Strukturausgabe: Statt die Struktur aus Fließtext zu parsen, wird sie
// vom Provider ERZWUNGEN — anthropic über Tool-Use (tool_choice), mistral/openai
// über response_format json_schema (strict). Beide liefern dieselbe Fassade;
// .data ist das geparste Objekt. Kein stiller Downgrade: fehlt die Struktur
// oder wurde sie abgeschnitten, wirft der Adapter mit Diagnose-Auszug (Muster
// parseBlock: melden statt raten). Streaming + structured folgt mit dem
// Worker-Extraktor (S77) und wirft bis dahin bewusst.
//
// Streaming (SSE) senkt die gefühlte Latenz massiv: der erste Buchstabe
// erscheint nach Time-to-first-token statt nach der Gesamtdauer. Ohne
// onDelta bleibt der Request-Körper BYTE-IDENTISCH zum bisherigen Stand
// (kein stream-Feld) — bestehende Aufrufer und Tests sind unberührt.
// Antwortet die Gegenstelle trotz stream:true mit JSON (Sandbox-Puffer,
// alte Worker-Version, Fehlerobjekt), greift der Nicht-Stream-Parser als
// Fallback — Streaming ist strikt opportunistisch.
//
// Drei Transportmodi (cfg.mode):
//   "keyless" — Artefakt-Sandbox: api.anthropic.com direkt, Sandbox injiziert Auth
//   "direct"  — eigener Key (Eval-Runner in Node; serverseitig im Worker)
//   "proxy"   — Browser-Client der Cloudflare-Form: POST an den eigenen Worker
//               (/api/llm), der Key bleibt serverseitig; der Worker re-emittiert
//               provider-neutrale SSE-Events {delta} … {done} (siehe index.js)
//
// fetchFn ist injizierbar (Tests prüfen die Request-Körper gegen Mock-fetch).

// Technische Defaults — bewusst OHNE provider, mode oder Modellnamen (S35d):
// Provider, Modus und Modell sind Konfigurationspflicht des Aufrufers; fehlt
// etwas, wirft makeAdapter statt still zurückzufallen. Einzige sanktionierte
// Stelle mit Provider-/Modellwissen im Code ist die Artefakt-Plattform
// (platforms/artifact/llm-config.js) — bewacht vom Grep-Wächter-Test.
export const LLM_DEFAULTS = {
  apiKey: "",
  proxyUrl: "/api/llm",
  // S77: 1024 war zu knapp bemessen. Zwei Gründe: (a) neuere Anthropic-Modelle
  // denken adaptiv von sich aus, und max_tokens deckelt die GESAMTE Ausgabe —
  // Thinking PLUS Text; (b) der neue Tokenizer erzeugt für denselben Text rund
  // 30 % mehr Token. Messung: 4 von 11 Turns verbrauchten das ganze 1024er
  // Budget im Thinking und lieferten gar keinen Text.
  maxTokens: 4096,
  cache: true,                  // Prompt-Caching (nur Anthropic wirksam)
  stream: true,                 // SSE nutzen, WENN der Aufrufer onDelta übergibt
  // S77 · Denkmodus (nur Anthropic wirksam):
  //   "disabled" — thinking:{type:"disabled"} wird MITGESENDET; deterministisches
  //                Budget, keine unsichtbaren Kosten. Vorgabe für die Begleitung.
  //   "adaptiv"  — kein thinking-Feld; das Modell entscheidet selbst (API-Vorgabe).
  //                Für Prüf-/Richtaufgaben sinnvoll (Judge).
  //   "zwischen-tools" — thinking:{type:"between_tools"} (S144). Für Modelle, die
  //                "disabled" mit 400 ablehnen; ohne Tool-Aufrufe wirkt es wie "disabled".
  // Bewusst eine Vorgabe und keine Pflichtangabe: es ist Robustheits-Tuning wie
  // maxTokens, kein Provider-/Modellwissen (S35d bleibt unberührt).
  thinking: "disabled",
  /* S147 · Denkaufwand für OpenAI-kompatible Anbieter (Mistral-Plattform:
     reasoning_effort). null = Feld wird NICHT gesendet, es gilt die Vorgabe des
     Modells (Medium 3.5: aus; GLM 5.3: "max" — teuer und langsam). Robustheits-
     Tuning wie thinking/maxTokens, kein Modellwissen (S35d). */
  reasoningEffort: null,
  /* S137 · Temperatur — bewusst NICHT vorbelegt (undefined = Feld wird nicht
     mitgesendet, es gilt die Vorgabe des Anbieters: Mistral 0.7, Anthropic 1.0).
     Anlass: mistral-medium antwortete in SYC-05 dreimal fast wortgleich. Das ist
     Varianz, keine Regelfrage — und die einzige Stellschraube dafuer, die dem
     Prompt nichts wegnimmt. S135 hat gezeigt, was eine zusaetzliche Regel
     kostet: Der Prompt hat ein Budget, die Temperatur nicht.
     Eine Vorgabe zu setzen waere ein stiller Verhaltenswechsel fuer alle
     Aufrufer. Wer sie will, setzt sie ausdruecklich — und misst, was sie tut. */
  temperature: undefined,
};

/* MOD-5 · Der Adapter ist nur noch Fassade und Ablauf: Transport (transport.js),
   Struktur-Helfer (struktur.js) und die Provider (providers/<name>.js) sind
   eigene Module; die bisherigen Exporte laufen hier unveraendert durch. Ein
   neuer Provider ist eine Datei plus eine Zeile in providers/index.js. */
import { LLM_PROVIDERS } from "./providers/index.js";
import { istEventStream, sseDaten, STILLE_FRIST_MS } from "./transport.js";
import { extrahiereStrukturAusText, escapeSteuerzeichenInStrings, istAbgeschnitten, markiereAbschnitt, pruefeStructured } from "./struktur.js";
export { LLM_PROVIDERS, istEventStream, sseDaten, STILLE_FRIST_MS, extrahiereStrukturAusText, escapeSteuerzeichenInStrings, istAbgeschnitten, markiereAbschnitt, pruefeStructured };

/* ---- Robustheit: HTTP-Fehler, Retry-After, Backoff, RPM-Drossel (S51) ---- */

/** Getippter Transportfehler — trägt Status und (falls vorhanden) Retry-After (Sekunden).
 *  S70: .code = "llm_overloaded" bei Auslastungs-Status (429/503/529) — ein
 *  STABILER Code, den fehlerText() lokalisieren und der Worker über die
 *  Proxy-Grenze reichen kann; alle anderen Status tragen code null. */
export class LlmHttpError extends Error {
  constructor(status, retryAfterS, koerper) {
    super("LLM HTTP " + status + (koerper ? " — " + String(koerper).slice(0, 200) : ""));
    this.name = "LlmHttpError";
    this.status = status;
    this.code = (status === 429 || status === 503 || status === 529) ? "llm_overloaded" : null;
    this.retryAfterS = (typeof retryAfterS === "number" && retryAfterS >= 0) ? retryAfterS : null;
    this.koerper = koerper || "";
  }
}

/** Liest den Retry-After-Header (Sekunden ODER HTTP-Date) → Sekunden oder null. */
export function parseRetryAfter(resp) {
  const roh = resp && resp.headers && typeof resp.headers.get === "function"
    ? resp.headers.get("retry-after") : null;
  if (!roh) return null;
  const sek = Number(roh);
  if (Number.isFinite(sek)) return Math.max(0, sek);
  const ms = Date.parse(roh);
  return Number.isFinite(ms) ? Math.max(0, (ms - Date.now()) / 1000) : null;
}

/** Fehlerkörper defensiv lesen (text bevorzugt, sonst json) — nur für die Fehlermeldung. */
async function leseFehlerkoerper(resp) {
  try { if (typeof resp.text === "function") return await resp.text(); } catch { /* egal */ }
  try { if (typeof resp.json === "function") return JSON.stringify(await resp.json()); } catch { /* egal */ }
  return "";
}

/**
 * RPM-Drossel als Slot-Scheduler. EINE Instanz wird von Pipeline UND Judge
 * geteilt (Mistrals Limit gilt pro Organisation/Workspace, nicht pro Key).
 * rpm ≤ 0 oder nicht endlich ⇒ „unlimited" (No-Op). Uhr injizierbar (Testbarkeit).
 */
export function baueDrossel({ rpm, uhr } = {}) {
  if (!Number.isFinite(rpm) || rpm <= 0) {
    const frei = async () => {};
    frei.rpm = 0;
    return frei;
  }
  const jetzt = (uhr && typeof uhr.jetzt === "function") ? uhr.jetzt : () => Date.now();
  const schlaf = (uhr && typeof uhr.schlaf === "function") ? uhr.schlaf : (ms => new Promise(r => setTimeout(r, ms)));
  const abstandMs = 60000 / rpm;
  let naechster = 0;
  const drossel = async () => {
    const t = jetzt();
    const start = Math.max(t, naechster);
    naechster = start + abstandMs;
    const warten = start - t;
    if (warten > 0) await schlaf(warten);
  };
  drossel.rpm = rpm;
  drossel.abstandMs = abstandMs;
  return drossel;
}

/** Wiederholt fn bei HTTP 429/5xx (mit Retry-After bzw. gedeckeltem Exponential-Backoff).
 *  S70 · Full Jitter: ohne Server-Anweisung (Retry-After) wird die Wartezeit
 *  gleichverteilt aus [0, min(maxBackoffMs, backoffMs·2^v)] gezogen — sonst
 *  feuern beide Partner (und alle Clients) im Gleichtakt in dieselben
 *  Overload-Fenster. Ein Retry-After-Header schlägt den Jitter IMMER (die
 *  Server-Anweisung wird nicht verwässert). zufall ist injizierbar
 *  (deterministische Tests); onRetry({status, versuch}) feuert VOR jeder
 *  Wartephase — Fehler des Callbacks brechen den Retry nie ab. */
async function mitWiederholung(fn, { versuche, backoffMs, maxBackoffMs, schlaf, zufall, onRetry }) {
  let letzter;
  for (let v = 0; v < versuche; v++) {
    try {
      return await fn();
    } catch (e) {
      letzter = e;
      const wiederholbar = e instanceof LlmHttpError && (e.status === 429 || (e.status >= 500 && e.status <= 599));
      if (!wiederholbar || v === versuche - 1) throw e;
      if (typeof onRetry === "function") { try { onRetry({ status: e.status, versuch: v + 1 }); } catch { /* Anzeige ist Komfort */ } }
      const wartenMs = e.retryAfterS != null
        ? e.retryAfterS * 1000
        : (typeof zufall === "function" ? zufall() : Math.random()) * Math.min(maxBackoffMs, backoffMs * (2 ** v));
      await schlaf(Math.max(0, wartenMs));
    }
  }
  throw letzter;
}

/**
 * Liest das dritte/vierte Fassaden-Argument (S76).
 * Funktion ⇒ Altpfad onDelta; Objekt ⇒ Optionen { structured, onDelta?, onStatus? }.
 * structured + onDelta gemeinsam wirft bewusst: der inkrementelle Extraktor
 * (Worker) kommt mit S77 — bis dahin gibt es kein halbgares Verhalten.
 */
export function leseAufrufOptionen(drittes, viertes) {
  if (typeof drittes === "function") return { onDelta: drittes, onStatus: viertes, structured: null };
  if (drittes && typeof drittes === "object") {
    const structured = drittes.structured ? pruefeStructured(drittes.structured) : null;
    const onDelta = typeof drittes.onDelta === "function" ? drittes.onDelta : null;
    // S79: structured + Streaming ist jetzt unterstützt — die Deltas sind der
    // EXTRAHIERTE Begleitertext (antwort-Feld), nie rohes JSON (D1/O3).
    return {
      onDelta,
      onStatus: typeof drittes.onStatus === "function" ? drittes.onStatus : viertes,
      structured,
    };
  }
  return { onDelta: null, onStatus: viertes, structured: null };
}

/**
 * Baut die callClaude-Fassade.
 * @param {object} cfgIn — überschreibt LLM_DEFAULTS
 * @param {function} fetchFn — injizierbar; default globalThis.fetch
 */
export function makeAdapter(cfgIn = {}, fetchFn = globalThis.fetch) {
  const cfg = { ...LLM_DEFAULTS, ...cfgIn, models: { ...(cfgIn.models || {}) } };
  if (cfg.mode !== "keyless" && cfg.mode !== "direct" && cfg.mode !== "proxy")
    throw new Error('LLM-Konfiguration unvollständig: "mode" fehlt oder ist unbekannt (keyless | direct | proxy) — kein Fallback (S35d).');

  if (cfg.mode === "proxy") {
    // Der Worker übersetzt selbst (dort läuft derselbe Adapter im direct-Modus) —
    // der Client schickt nur die Fassaden-Parameter. Mit onDelta zusätzlich
    // stream:true; der Worker antwortet dann mit provider-neutraler SSE:
    //   data: {"delta":"…"}   … je Text-Häppchen
    //   data: {"done":{text,stop,usage[,kontingent]}}   … genau einmal am Ende
    //   data: {"retry":true}  … je Upstream-Wiederholung bei Auslastung (S70)
    //   data: {"error":"…"[, "code":"…"]}   … statt done bei Upstream-Fehlern
    // S70: onStatus("overloaded_retry") ist der zweite Rückkanal neben onDelta —
    // rein informativ (Warteanzeige), nie Teil des Antworttexts. Fehler-Events
    // tragen einen optionalen stabilen code (flach, wie fehler() im Worker);
    // die Alt-Form ohne code bleibt gültig (alter Worker, neuer Client).
    const wirfProxyFehler = (meldung, code) => {
      const e = new Error(typeof meldung === "string" && meldung ? meldung : "API-Fehler");
      if (code) e.code = code;
      throw e;
    };
    async function callClaude(systemPrompt, messages, drittes, viertes) {
      const { onDelta, onStatus, structured } = leseAufrufOptionen(drittes, viertes);
      const streamen = typeof onDelta === "function" && cfg.stream !== false;
      /* CR-2.3 · Leere Nachrichten gehen nie an den Anbieter. Verlaeufe vor
         CR-2 koennen eine leere Begleiter-Nachricht tragen (abgerissener
         Strom wurde als Antwort gespeichert); mitgeschickt blockiert sie das
         Gespraech bei Anbietern, die leere Inhalte abweisen. */
      messages = messages.filter(m => typeof m.content !== "string" || m.content.trim());
      const nutz = { system: systemPrompt, messages: messages.map(m => (m.regie ? { role: m.role, content: m.content, regie: m.regie } : { role: m.role, content: m.content })) };   // PRV-3: Regie reist zum Worker mit
      if (streamen) nutz.stream = true;
      // S76: Der Worker übersetzt die Struktur providerspezifisch — der Client
      // schickt nur Name und Schema und bekommt data in der Fassade zurück.
      if (structured) nutz.structured = { name: structured.name, schema: structured.schema, description: structured.description };
      const resp = await fetchFn(cfg.proxyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(nutz),
      });
      // CR-2.4 · mit Code — der Text steht im Woerterbuch (fehler.code.sitzung).
      if (resp.status === 401) throw Object.assign(new Error("Sitzung abgelaufen – bitte neu anmelden."), { status: 401, code: "sitzung" });
      if (streamen && istEventStream(resp)) {
        let text = "";
        for await (const d of sseDaten(resp)) {
          let ev; try { ev = JSON.parse(d); } catch { continue; }
          if (ev.retry) { if (typeof onStatus === "function") { try { onStatus("overloaded_retry"); } catch { /* Anzeige ist Komfort */ } } continue; }
          if (ev.error) wirfProxyFehler(ev.error, ev.code);
          if (typeof ev.delta === "string" && ev.delta) { text += ev.delta; onDelta(ev.delta); }
          if (ev.done) {
            callClaude.kontingent = ev.done.kontingent || null;   // Hinweis für die UI
            return ev.done;   // Fassadenform vom Worker
          }
        }
        /* CR-2.3 · Strom riss ohne done ab. Bis CR-2 galt das Empfangene als
           Antwort — auch wenn es leer war oder mitten im Satz endete. Eine
           halbe Antwort kann ihre Marke oder ihren Block verloren haben; als
           fertig gespeichert stuende das Gespraech (kein Panel, kein
           Abschluss). Deshalb: Fehler, der Zug bleibt offen, "Erneut senden"
           holt die ganze Antwort. */
        callClaude.kontingent = null;
        throw Object.assign(new Error("Die Antwort ist unterwegs abgerissen."), { code: "llm_abbruch", teil: text.length });
      }
      // CR-2.4 · Eine HTML-Fehlerseite (Gateway, Wartung) ist kein JSON —
      // statt "Unexpected token '<'" traegt der Fehler die Klasse "server".
      let data;
      try { data = await resp.json(); }
      catch { throw Object.assign(new Error("Unlesbare Antwort vom Server."), { status: resp.status, code: "server" }); }
      if (data.error) wirfProxyFehler(data.error, data.code);
      callClaude.kontingent = data.kontingent || null;   // Hinweis für die UI
      return data;   // {text, stop, usage[, kontingent]} — Fassadenform vom Worker
    }
    return callClaude;
  }

  if (!cfg.provider)
    throw new Error('LLM-Konfiguration unvollständig: "provider" fehlt (anthropic | mistral | openai) — kein Fallback (S35d).');
  const P = LLM_PROVIDERS[cfg.provider];
  if (!P) throw new Error("Unbekannter Provider: " + cfg.provider);
  if (!cfg.models[cfg.provider])
    throw new Error('LLM-Konfiguration unvollständig: kein Modell für Provider "' + cfg.provider + '" (models.' + cfg.provider + ') — kein Fallback (S35d).');
  if (cfg.provider !== "anthropic" && cfg.mode !== "direct")
    throw new Error(cfg.provider + " geht nur im direct-Modus (braucht API-Key).");
  if (cfg.mode === "direct" && !cfg.apiKey)
    throw new Error("direct-Modus benötigt einen API-Key.");

  // Robustheit (S51): geteilte Drossel vor jedem Request; Retry bei 429/5xx.
  // Ohne cfg.drossel bleibt es ein No-Op; ohne Retry-Fehler ändert sich nichts.
  const drossel = typeof cfg.drossel === "function" ? cfg.drossel : async () => {};
  const retry = {
    versuche: Number.isFinite(cfg.versuche) ? cfg.versuche : 4,
    backoffMs: Number.isFinite(cfg.backoffMs) ? cfg.backoffMs : 2000,
    maxBackoffMs: Number.isFinite(cfg.maxBackoffMs) ? cfg.maxBackoffMs : 30000,
    schlaf: typeof cfg.schlaf === "function" ? cfg.schlaf : (ms => new Promise(r => setTimeout(r, ms))),
    zufall: typeof cfg.zufall === "function" ? cfg.zufall : undefined,     // S70: injizierbarer Jitter-RNG
    onRetry: typeof cfg.onRetry === "function" ? cfg.onRetry : undefined,  // S70: Konfigurations-Hook (Worker → SSE)
  };

  return function callClaude(systemPrompt, messages, drittes, viertes) {
    const { onDelta, onStatus, structured } = leseAufrufOptionen(drittes, viertes);
    // CR-2.3 · wie im Proxy-Modus: leere Nachrichten gehen nie an den Anbieter.
    messages = messages.filter(m => typeof m.content !== "string" || m.content.trim());
    /* ST3 · Der R3-Waechter (ST1.5) ist GEFALLEN: output_config ist laut Doku
       MIT Thinking kompatibel — die Grammatik greift nicht in Thinking-Tags,
       der Grammatik-Zustand setzt sich vor der finalen Ausgabe zurueck. Der
       Ausschluss galt nur dem erzwungenen Tool-Use (tool_choice). */
    const streamen = typeof onDelta === "function" && cfg.stream !== false;
    const body = structured
      ? { ...P.structuredBody(cfg, systemPrompt, messages, structured), ...(streamen ? { stream: true } : {}) }
      : streamen ? P.streamBody(cfg, systemPrompt, messages) : P.body(cfg, systemPrompt, messages);
    // S70: per-Aufruf-Statuskanal — direct/keyless melden lokale Retries direkt
    // an onStatus, symmetrisch zum {retry}-Event des Proxy-Modus. Beide Hooks
    // (cfg.onRetry UND onStatus) feuern, falls beide gesetzt sind.
    const lokal = { ...retry };
    if (typeof onStatus === "function") {
      const konfig = retry.onRetry;
      lokal.onRetry = info => {
        if (konfig) { try { konfig(info); } catch { /* Anzeige ist Komfort */ } }
        try { onStatus("overloaded_retry"); } catch { /* Anzeige ist Komfort */ }
      };
    }
    return mitWiederholung(async () => {
      await drossel();                                     // geteilte RPM-Drossel (pro Workspace), falls gesetzt
      const einAufruf = async (aufrufBody) => {
        const resp = await fetchFn(P.url(cfg), {
          method: "POST",
          headers: P.headers(cfg),
          body: JSON.stringify(aufrufBody),                // Body byte-identisch zum bisherigen Stand (ohne onDelta)
        });
        // HTTP-Status prüfen, BEVOR geparst wird — sonst liefert ein 429 ohne
        // .error-Feld (Mistral) still text:"" statt eines Fehlers.
        if (typeof resp.status === "number" && resp.status >= 400) {
          throw new LlmHttpError(resp.status, parseRetryAfter(resp), await leseFehlerkoerper(resp));
        }
        if (streamen && istEventStream(resp))
          return structured ? P.streamStructuredParse(resp, onDelta) : P.streamParse(resp, onDelta);
        const data = await resp.json();
        return structured ? P.parseStructured(data, structured.name) : P.parse(data);
      };
      /* ST1.4 · keyless ohne Formgarantie (K2-Entscheid, Sprintplan ST1–ST4):
         (a) Greift der S85-Rettungspfad (strukturQuelle:"text"), meldet
             onStatus("struktur_rettung") — die Anzeige zaehlt und warnt,
             die Fassade bleibt regulaer.
         (b) Kommt gar keine Struktur (code struktur_fehlt), fordert GENAU
             EINE Korrektur-Runde nach dem Judge-KORREKTUR-Muster nach: Das
             Modell sieht seine eigene Antwort und die Formforderung;
             onStatus("struktur_korrektur"). Scheitert auch das → der
             urspruengliche harte Fehler. NUR keyless — in direct/proxy ist
             die Struktur erzwungen, ein Formfehler dort ein echter Defekt. */
      const melde = (st) => { if (typeof onStatus === "function") { try { onStatus(st); } catch { /* Anzeige ist Komfort */ } } };
      let ergebnis;
      try {
        ergebnis = await einAufruf(body);
      } catch (e) {
        if (!(cfg.mode === "keyless" && structured && e.code === "struktur_fehlt")) throw e;
        /* MOD-5 · Die Formforderung ist Wire-Text (core/contracts/struktur-korrektur.js)
           und kommt als cfg.strukturKorrektur herein — der Adapter traegt keinen
           modell-gerichteten Text mehr. Ohne sie gibt es keine Korrektur-Runde:
           der Ursprungsfehler geht unveraendert an den Aufrufer. Dass die
           keyless-Plattform sie setzt, haelt tests/unit/mod-provider-vertrag.spec.js. */
        if (typeof cfg.strukturKorrektur !== "string" || !cfg.strukturKorrektur) throw e;
        melde("struktur_korrektur");
        const nachMsgs = [
          ...messages.map(m => ({ role: m.role, content: m.content })),
          { role: "assistant", content: String(e.antwortText || "").trim() || "…" },
          { role: "user", content: cfg.strukturKorrektur },
        ];
        ergebnis = await einAufruf(P.structuredBody(cfg, systemPrompt, nachMsgs, structured));
      }
      if (ergebnis && ergebnis.strukturQuelle === "text") melde("struktur_rettung");
      return ergebnis;
    }, lokal);
  };
}
