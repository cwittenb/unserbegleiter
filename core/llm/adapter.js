// LLM-Adapter — aus der Adapter-Harness übernommen und um den Proxy-Modus
// sowie Streaming erweitert. Fassade bleibt abwärtskompatibel:
//
//   const call = makeAdapter(cfg, fetchFn);
//   await call(systemPrompt, messages)           → { text, stop, usage }
//   await call(systemPrompt, messages, onDelta)  → dito; onDelta(teilText)
//                                                  feuert je Text-Häppchen
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
    //   data: {"error":"…"}   … statt done bei Upstream-Fehlern
    async function callClaude(systemPrompt, messages, onDelta) {
      const streamen = typeof onDelta === "function" && cfg.stream !== false;
      const nutz = { system: systemPrompt, messages: messages.map(m => ({ role: m.role, content: m.content })) };
      if (streamen) nutz.stream = true;
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
          if (ev.error) throw new Error(ev.error);
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
      if (data.error) throw new Error(data.error);
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

  return async function callClaude(systemPrompt, messages, onDelta) {
    const streamen = typeof onDelta === "function" && cfg.stream !== false;
    const body = streamen ? P.streamBody(cfg, systemPrompt, messages) : P.body(cfg, systemPrompt, messages);
    const resp = await fetchFn(P.url(cfg), {
      method: "POST",
      headers: P.headers(cfg),
      body: JSON.stringify(body),
    });
    if (streamen && istEventStream(resp)) return P.streamParse(resp, onDelta);
    const data = await resp.json();
    return P.parse(data);
  };
}
