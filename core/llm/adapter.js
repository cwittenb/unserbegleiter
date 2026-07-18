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
  maxTokens: 1024,
  cache: true,                  // Prompt-Caching (nur Anthropic wirksam)
  stream: true,                 // SSE nutzen, WENN der Aufrufer onDelta übergibt
};

/* ---- SSE-Werkzeug (transportneutral) ---- */

/** Ist die Antwort ein lesbarer Event-Stream? (Mocks ohne headers → nein) */
export function istEventStream(resp) {
  const ct = resp && resp.headers && typeof resp.headers.get === "function"
    ? (resp.headers.get("content-type") || "") : "";
  return ct.includes("text/event-stream") && !!(resp.body && typeof resp.body.getReader === "function");
}

/** Async-Generator über die data:-Nutzlasten eines SSE-Bodys. */
export async function* sseDaten(resp) {
  const reader = resp.body.getReader();
  const dec = new TextDecoder();
  let puffer = "";
  let daten = [];
  const zeile = z => {
    if (z === "") { const d = daten.length ? daten.join("\n") : null; daten = []; return d; }
    if (z.startsWith("data:")) daten.push(z.slice(5).replace(/^ /, ""));
    return null;   // event:/id:/Kommentar-Zeilen sind hier bedeutungslos
  };
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    puffer += dec.decode(value, { stream: true });
    let i;
    while ((i = puffer.indexOf("\n")) >= 0) {
      const d = zeile(puffer.slice(0, i).replace(/\r$/, ""));
      puffer = puffer.slice(i + 1);
      if (d !== null) yield d;
    }
  }
  const rest = zeile(puffer.replace(/\r$/, ""));
  if (rest !== null) yield rest;
  if (daten.length) yield daten.join("\n");
}

/* ---- Strukturausgabe (S76) ---- */

/** Kurzer Diagnose-Auszug für Fehlermeldungen (nie die ganze Antwort). */
function strukturAuszug(roh) {
  const t = String(roh == null ? "" : roh).replace(/\s+/g, " ").trim().slice(0, 160);
  return t ? " — Anfang: «" + t + (String(roh).length > 160 ? "…" : "") + "»" : "";
}

/** Abgeschnittene Strukturausgabe ist ein HARTER Fehler: halbes JSON ist keine
 *  halbe Antwort, sondern gar keine (anthropic: max_tokens, openai/mistral: length). */
function pruefeAbschnitt(stop, roh) {
  if (stop === "max_tokens" || stop === "length")
    throw new Error("Strukturausgabe abgeschnitten (stop=" + stop + ") — max_tokens erhöhen." + strukturAuszug(roh));
}

/** Prüft die structured-Option des Aufrufers (Konfigurationspflicht-Muster). */
export function pruefeStructured(structured) {
  if (!structured || typeof structured !== "object")
    throw new Error("structured muss ein Objekt { name, schema } sein.");
  if (typeof structured.name !== "string" || !structured.name)
    throw new Error("structured.name fehlt.");
  if (!structured.schema || typeof structured.schema !== "object")
    throw new Error("structured.schema fehlt.");
  return structured;
}

function openaiCompat(baseUrl, modelKey) {
  return {
    url: () => baseUrl,
    headers(cfg) {
      return { "Content-Type": "application/json", Authorization: "Bearer " + cfg.apiKey };
    },
    body(cfg, systemPrompt, messages) {
      return {
        model: cfg.models[modelKey],
        max_tokens: cfg.maxTokens,
        messages: [{ role: "system", content: systemPrompt },
                   ...messages.map(m => ({ role: m.role, content: m.content }))],
      };
    },
    streamBody(cfg, systemPrompt, messages) {
      const b = { ...this.body(cfg, systemPrompt, messages), stream: true };
      // Nur OpenAI braucht die Opt-in-Flagge für usage im Schlusshäppchen;
      // Mistral liefert usage von selbst und könnte unbekannte Felder abweisen.
      if (modelKey === "openai") b.stream_options = { include_usage: true };
      return b;
    },
    // response_format json_schema mit strict:true — von Sonde v1/v2 gegen
    // mistral-large verifiziert (100 % Parse + Schema, inkl. nullable Union).
    structuredBody(cfg, systemPrompt, messages, structured) {
      return {
        ...this.body(cfg, systemPrompt, messages),
        response_format: {
          type: "json_schema",
          json_schema: { name: structured.name, schema: structured.schema, strict: true },
        },
      };
    },
    parseStructured(data) {
      const r = this.parse(data);
      pruefeAbschnitt(r.stop, r.text);
      let d;
      try { d = JSON.parse(r.text); }
      catch (e) { throw new Error("Strukturausgabe ist kein JSON: " + e.message + strukturAuszug(r.text)); }
      return { ...r, data: d };
    },
    parse(data) {
      if (data.error) throw new Error(data.error.message || "API-Fehler");
      const ch = (data.choices || [])[0] || {};
      const u = data.usage || {};
      return {
        text: ((ch.message && ch.message.content) || "").trim(),
        stop: ch.finish_reason,
        usage: { in: u.prompt_tokens, out: u.completion_tokens, cacheWrite: null, cacheRead: null },
      };
    },
    async streamParse(resp, onDelta) {
      let text = "", stop = null;
      const usage = { in: undefined, out: undefined, cacheWrite: null, cacheRead: null };
      for await (const d of sseDaten(resp)) {
        if (d === "[DONE]") break;
        let ev; try { ev = JSON.parse(d); } catch { continue; }
        if (ev.error) throw new Error(ev.error.message || "API-Fehler");
        const ch = (ev.choices || [])[0] || {};
        if (ch.delta && typeof ch.delta.content === "string" && ch.delta.content) {
          text += ch.delta.content;
          onDelta(ch.delta.content);
        }
        if (ch.finish_reason) stop = ch.finish_reason;
        if (ev.usage) { usage.in = ev.usage.prompt_tokens; usage.out = ev.usage.completion_tokens; }
      }
      return { text: text.trim(), stop, usage };
    },
  };
}

export const LLM_PROVIDERS = {
  anthropic: {
    url: () => "https://api.anthropic.com/v1/messages",
    headers(cfg) {
      const h = { "Content-Type": "application/json" };
      if (cfg.mode === "direct" && cfg.apiKey) {
        h["x-api-key"] = cfg.apiKey;
        h["anthropic-version"] = "2023-06-01";
        h["anthropic-dangerous-direct-browser-access"] = "true";
      }
      // keyless: keine Auth-Header — die Artefakt-Sandbox injiziert selbst
      return h;
    },
    body(cfg, systemPrompt, messages) {
      let system = systemPrompt;
      const msgs = messages.map(m => ({ role: m.role, content: m.content }));
      if (cfg.cache) {
        // System-Prompt als cachebarer Block (größter, je Turn identischer Teil)
        system = [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }];
        // Rolling-Cache: letzten Turn markieren → der wachsende Prefix wird
        // beim nächsten Aufruf ein Treffer
        if (msgs.length) {
          const last = msgs[msgs.length - 1];
          last.content = [{ type: "text", text: last.content, cache_control: { type: "ephemeral" } }];
        }
      }
      return { model: cfg.models.anthropic, max_tokens: cfg.maxTokens, system, messages: msgs };
    },
    streamBody(cfg, systemPrompt, messages) {
      return { ...this.body(cfg, systemPrompt, messages), stream: true };
    },
    // Erzwungener Tool-Use: tool_choice macht den Tool-Aufruf zur Pflicht, die
    // Argumente sind die Strukturausgabe. Das Schema-Objekt wird UNVERÄNDERT
    // durchgereicht (stabile Serialisierung → Prompt-Cache-Treffer bleiben).
    structuredBody(cfg, systemPrompt, messages, structured) {
      return {
        ...this.body(cfg, systemPrompt, messages),
        tools: [{
          name: structured.name,
          description: structured.description || "Liefert die Antwort in der geforderten Struktur.",
          input_schema: structured.schema,
        }],
        tool_choice: { type: "tool", name: structured.name },
      };
    },
    parseStructured(data, name) {
      if (data.error) throw new Error(data.error.message || "Anthropic-Fehler");
      const bloecke = data.content || [];
      const text = bloecke.filter(b => b.type === "text").map(b => b.text).join("\n").trim();
      pruefeAbschnitt(data.stop_reason, text);
      const tu = bloecke.find(b => b.type === "tool_use" && (!name || b.name === name));
      if (!tu || !tu.input || typeof tu.input !== "object")
        throw new Error("Strukturausgabe fehlt: kein tool_use-Block (stop_reason=" + data.stop_reason + ")" + strukturAuszug(text));
      const u = data.usage || {};
      return {
        text, data: tu.input, stop: data.stop_reason,
        usage: {
          in: u.input_tokens, out: u.output_tokens,
          cacheWrite: u.cache_creation_input_tokens, cacheRead: u.cache_read_input_tokens,
        },
      };
    },
    parse(data) {
      if (data.error) throw new Error(data.error.message || "Anthropic-Fehler");
      const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n").trim();
      const u = data.usage || {};
      return {
        text, stop: data.stop_reason,
        usage: {
          in: u.input_tokens, out: u.output_tokens,
          cacheWrite: u.cache_creation_input_tokens, cacheRead: u.cache_read_input_tokens,
        },
      };
    },
    async streamParse(resp, onDelta) {
      let text = "", stop = null;
      const usage = { in: undefined, out: undefined, cacheWrite: undefined, cacheRead: undefined };
      for await (const d of sseDaten(resp)) {
        let ev; try { ev = JSON.parse(d); } catch { continue; }
        if (ev.type === "error" || ev.error) throw new Error((ev.error && ev.error.message) || "Anthropic-Fehler");
        if (ev.type === "message_start" && ev.message && ev.message.usage) {
          const u = ev.message.usage;
          usage.in = u.input_tokens;
          usage.cacheWrite = u.cache_creation_input_tokens;
          usage.cacheRead = u.cache_read_input_tokens;
        } else if (ev.type === "content_block_delta" && ev.delta && typeof ev.delta.text === "string") {
          text += ev.delta.text;
          onDelta(ev.delta.text);
        } else if (ev.type === "message_delta") {
          if (ev.delta && ev.delta.stop_reason) stop = ev.delta.stop_reason;
          if (ev.usage && ev.usage.output_tokens != null) usage.out = ev.usage.output_tokens;
        }
      }
      return { text: text.trim(), stop, usage };
    },
  },
  mistral: openaiCompat("https://api.mistral.ai/v1/chat/completions", "mistral"),
  openai: openaiCompat("https://api.openai.com/v1/chat/completions", "openai"),
};

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
    if (structured && onDelta)
      throw new Error("structured + Streaming ist noch nicht unterstützt (Worker-Extraktor folgt mit S77).");
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
      const nutz = { system: systemPrompt, messages: messages.map(m => ({ role: m.role, content: m.content })) };
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
      if (resp.status === 401) throw new Error("Sitzung abgelaufen – bitte neu anmelden.");
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
        // Strom riss ohne done ab → das bereits Empfangene ist die beste Antwort
        callClaude.kontingent = null;
        return { text: text.trim(), stop: null, usage: null };
      }
      const data = await resp.json();
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
    const streamen = typeof onDelta === "function" && cfg.stream !== false;
    const body = structured
      ? P.structuredBody(cfg, systemPrompt, messages, structured)
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
      const resp = await fetchFn(P.url(cfg), {
        method: "POST",
        headers: P.headers(cfg),
        body: JSON.stringify(body),                        // Body byte-identisch zum bisherigen Stand (ohne onDelta)
      });
      // HTTP-Status prüfen, BEVOR geparst wird — sonst liefert ein 429 ohne
      // .error-Feld (Mistral) still text:"" statt eines Fehlers.
      if (typeof resp.status === "number" && resp.status >= 400) {
        throw new LlmHttpError(resp.status, parseRetryAfter(resp), await leseFehlerkoerper(resp));
      }
      if (streamen && istEventStream(resp)) return P.streamParse(resp, onDelta);
      const data = await resp.json();
      return structured ? P.parseStructured(data, structured.name) : P.parse(data);
    }, lokal);
  };
}
