// Provider-Familie "OpenAI-kompatibel" (MOD-5): chat/completions, Bearer-Auth,
// response_format json_schema (strict). Mistral und OpenAI sind Instanzen
// dieser Fabrik (providers/mistral.js, providers/openai.js). Wortlaut aus
// adapter.js, unveraendert.

import { sseDaten } from "../transport.js";
import { baueAntwortExtraktor } from "../antwort-extraktor.js";
import { strukturAuszug, pruefeAbschnitt, markiereAbschnitt } from "../struktur.js";

/* S144 · Neuere Modelle (Mistral Large 4) liefern `content` nicht als String,
   sondern als Liste von Bloecken: Reasoning-Bloecke ({type:"thinking", …}) und
   Antworttext ({type:"text", text}). Die Begleitung zeigt nur den Antworttext —
   Reasoning wird bewusst verworfen, nie an die Person durchgereicht.
   Vorher: Liste → "trim is not a function" (parse) bzw. still verworfener Text
   (Streaming, das nur Strings annahm). */
export function textAusInhalt(inhalt) {
  if (typeof inhalt === "string") return inhalt;
  if (!Array.isArray(inhalt)) return "";
  return inhalt
    .filter(b => b && b.type === "text" && typeof b.text === "string")
    .map(b => b.text)
    .join("");
}

import { inhaltMitRegie } from "../regie.js";
import { systemAlsText } from "../system.js";

export function openaiCompat(baseUrl, modelKey) {
  return {
    url: () => baseUrl,
    headers(cfg) {
      return { "Content-Type": "application/json", Authorization: "Bearer " + cfg.apiKey };
    },
    body(cfg, systemPrompt, messages) {
      const body = {
        model: cfg.models[modelKey],
        max_tokens: cfg.maxTokens,
        messages: [{ role: "system", content: systemAlsText(systemPrompt) },
                   ...messages.map(m => ({ role: m.role, content: inhaltMitRegie(m) }))],   // PRV-3
      };
      // S137 · Nur mitsenden, wenn ausdruecklich gesetzt (siehe LLM_DEFAULTS).
      if (typeof cfg.temperature === "number") body.temperature = cfg.temperature;
      // S147 · reasoning_effort nur, wenn ausdrücklich gesetzt (sonst Modellvorgabe).
      if (typeof cfg.reasoningEffort === "string" && cfg.reasoningEffort) body.reasoning_effort = cfg.reasoningEffort;
      return body;
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
    async streamStructuredParse(resp, onDelta) {
      const ex = baueAntwortExtraktor();
      let roh = "", stop = null;
      const usage = { in: undefined, out: undefined, cacheWrite: null, cacheRead: null };
      for await (const d of sseDaten(resp)) {
        if (d === "[DONE]") break;
        let ev; try { ev = JSON.parse(d); } catch { continue; }
        if (ev.error) throw new Error(ev.error.message || "API-Fehler");
        const ch = (ev.choices || [])[0] || {};
        const dStruktur = ch.delta ? textAusInhalt(ch.delta.content) : "";
        if (dStruktur) {
          roh += dStruktur;
          const stueck = ex.speise(dStruktur);
          if (stueck) onDelta(stueck);
        }
        if (ch.finish_reason) stop = ch.finish_reason;
        if (ev.usage) { usage.in = ev.usage.prompt_tokens; usage.out = ev.usage.completion_tokens; }
      }
      pruefeAbschnitt(stop, ex.text);
      let daten;
      try { daten = JSON.parse(roh); }
      catch (e) { throw new Error("Strukturausgabe ist kein JSON: " + e.message + strukturAuszug(roh)); }
      // ST3: quelle vereinheitlicht — "schema" = decoder-erzwungen (hier via
      // response_format strict; das Anthropic-Feld "tool" bleibt Alt-Wert).
      return { text: ex.text, data: daten, stop, usage, strukturQuelle: "schema" };
    },
    parseStructured(data) {
      const r = this.parse(data);
      pruefeAbschnitt(r.stop, r.text);
      let d;
      try { d = JSON.parse(r.text); }
      catch (e) { throw new Error("Strukturausgabe ist kein JSON: " + e.message + strukturAuszug(r.text)); }
      return { ...r, data: d, strukturQuelle: "schema" };
    },
    parse(data) {
      if (data.error) throw new Error(data.error.message || "API-Fehler");
      const ch = (data.choices || [])[0] || {};
      const u = data.usage || {};
      return markiereAbschnitt({
        text: textAusInhalt(ch.message && ch.message.content).trim(),
        stop: ch.finish_reason,
        usage: { in: u.prompt_tokens, out: u.completion_tokens, cacheWrite: null, cacheRead: null },
      });
    },
    async streamParse(resp, onDelta) {
      let text = "", stop = null;
      const usage = { in: undefined, out: undefined, cacheWrite: null, cacheRead: null };
      for await (const d of sseDaten(resp)) {
        if (d === "[DONE]") break;
        let ev; try { ev = JSON.parse(d); } catch { continue; }
        if (ev.error) throw new Error(ev.error.message || "API-Fehler");
        const ch = (ev.choices || [])[0] || {};
        const dText = ch.delta ? textAusInhalt(ch.delta.content) : "";
        if (dText) {
          text += dText;
          onDelta(dText);
        }
        if (ch.finish_reason) stop = ch.finish_reason;
        if (ev.usage) { usage.in = ev.usage.prompt_tokens; usage.out = ev.usage.completion_tokens; }
      }
      return markiereAbschnitt({ text: text.trim(), stop, usage });
    },
  };
}
