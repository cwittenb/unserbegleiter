// LLM-Adapter — aus der Adapter-Harness übernommen und um den Proxy-Modus
// erweitert. Fassade bleibt exakt stabil:
//
//   const call = makeAdapter(cfg, fetchFn);
//   await call(systemPrompt, messages) → { text, stop, usage }
//
// Drei Transportmodi (cfg.mode):
//   "keyless" — Artefakt-Sandbox: api.anthropic.com direkt, Sandbox injiziert Auth
//   "direct"  — eigener Key (Eval-Runner in Node; serverseitig im Worker)
//   "proxy"   — Browser-Client der Cloudflare-Form: POST an den eigenen Worker
//               (/api/llm), der Key bleibt serverseitig
//
// fetchFn ist injizierbar (Tests prüfen die Request-Körper gegen Mock-fetch).

export const LLM_DEFAULTS = {
  provider: "anthropic",        // "anthropic" | "mistral" | "openai"
  mode: "keyless",              // "keyless" | "direct" | "proxy"
  apiKey: "",
  proxyUrl: "/api/llm",
  maxTokens: 1024,
  cache: true,                  // Prompt-Caching (nur Anthropic wirksam)
  models: {
    anthropic: "claude-sonnet-4-6",
    mistral: "mistral-large-latest",
    openai: "gpt-5.4",
  },
};

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
  const cfg = { ...LLM_DEFAULTS, ...cfgIn, models: { ...LLM_DEFAULTS.models, ...(cfgIn.models || {}) } };

  if (cfg.mode === "proxy") {
    // Der Worker übersetzt selbst (dort läuft derselbe Adapter im direct-Modus) —
    // der Client schickt nur die Fassaden-Parameter.
    async function callClaude(systemPrompt, messages) {
      const resp = await fetchFn(cfg.proxyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ system: systemPrompt, messages: messages.map(m => ({ role: m.role, content: m.content })) }),
      });
      if (resp.status === 401) throw new Error("Sitzung abgelaufen – bitte neu anmelden.");
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      callClaude.kontingent = data.kontingent || null;   // Hinweis für die UI
      return data;   // {text, stop, usage[, kontingent]} — Fassadenform vom Worker
    }
    return callClaude;
  }

  const P = LLM_PROVIDERS[cfg.provider];
  if (!P) throw new Error("Unbekannter Provider: " + cfg.provider);
  if (cfg.provider !== "anthropic" && cfg.mode !== "direct")
    throw new Error(cfg.provider + " geht nur im direct-Modus (braucht API-Key).");
  if (cfg.mode === "direct" && !cfg.apiKey)
    throw new Error("direct-Modus benötigt einen API-Key.");

  return async function callClaude(systemPrompt, messages) {
    const resp = await fetchFn(P.url(cfg), {
      method: "POST",
      headers: P.headers(cfg),
      body: JSON.stringify(P.body(cfg, systemPrompt, messages)),
    });
    const data = await resp.json();
    return P.parse(data);
  };
}
