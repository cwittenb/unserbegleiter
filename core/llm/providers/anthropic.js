// Provider Anthropic (MOD-5): Messages-API, Prompt-Caching, Denkmodus,
// Structured Outputs via output_config (ST3). Wortlaut aus adapter.js,
// unveraendert — nur die Einrueckung ist um eine Stufe zurueckgenommen.

import { sseDaten } from "../transport.js";
import { baueAntwortExtraktor } from "../antwort-extraktor.js";
import { anthropicSoDialekt } from "../schema-dialekt.js";
import { strukturAuszug, extrahiereStrukturAusText, pruefeAbschnitt, markiereAbschnitt } from "../struktur.js";
import { inhaltMitRegie } from "../regie.js";
import { systemAlsText } from "../system.js";

export const anthropic = {
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
    let system = systemAlsText(systemPrompt);
    // PRV-3 · Regie (core/llm/regie.js): ohne Cache einfach angehaengt.
    const msgs = messages.map(m => ({ role: m.role, content: cfg.cache ? m.content : inhaltMitRegie(m), regie: m.regie || null }));
    if (cfg.cache) {
      // System-Prompt als cachebarer Block (größter, je Turn identischer Teil).
      // S82: cfg.cacheTtl (z. B. "1h") für Aufrufer, deren Turns Minuten
      // auseinanderliegen (Batch-Lockstep, S65) — sonst Standard-TTL.
      /* PRV-5 · Bloecke [Kern, Modul]: je ein Breakpoint. Liegt der Kern unter
         der Cache-Mindestlaenge, ignoriert die API seinen Breakpoint; der am
         Modul cacht dann Kern+Modul zusammen. */
      const cc = { type: "ephemeral", ...(cfg.cacheTtl ? { ttl: cfg.cacheTtl } : {}) };
      system = (Array.isArray(systemPrompt) ? systemPrompt : [systemPrompt])
        .filter(t => t).map(text => ({ type: "text", text, cache_control: cc }));
      // Rolling-Cache: letzten Turn markieren → der wachsende Prefix wird
      // beim nächsten Aufruf ein Treffer
      if (msgs.length) {
        const last = msgs[msgs.length - 1];
        last.content = [{ type: "text", text: last.content,
          cache_control: { type: "ephemeral", ...(cfg.cacheTtl ? { ttl: cfg.cacheTtl } : {}) } }];
        /* PRV-3 · Regie als eigener Block HINTER dem Breakpoint: Der Cache
           endet beim Inhalt der Person; der Hinweis gilt nur fuer diesen Zug
           und veraendert den Praefix nicht. */
        if (last.regie) last.content.push({ type: "text", text: last.regie });
      }
      // Regie an frueheren Nachrichten (nicht vorgesehen) ginge sonst verloren.
      for (let i = 0; i < msgs.length - 1; i++) if (msgs[i].regie) msgs[i].content = inhaltMitRegie(msgs[i]);
    }
    for (const m of msgs) delete m.regie;
    const body = { model: cfg.models.anthropic, max_tokens: cfg.maxTokens, system, messages: msgs };
    // S77: Denkmodus explizit. "disabled" wird mitgesendet, "adaptiv" lässt das
    // Feld weg (dann gilt die Vorgabe des Modells).
    if (cfg.thinking === "disabled") body.thinking = { type: "disabled" };
    /* S144 · Neuere Modelle lehnen "disabled" mit 400 ab und bieten statt dessen
       "between_tools": Denken nur zwischen Tool-Aufrufen. Die Begleitung ruft
       keine Tools — das ist dort also das Gegenstück zu "disabled" (S77:
       deterministisches Budget), ohne dass das Modell es verweigert. */
    if (cfg.thinking === "zwischen-tools") body.thinking = { type: "between_tools" };
    /* S137 · Temperatur nur bei ausdruecklicher Angabe. Achtung: Anthropic
       weist temperature ZUSAMMEN mit aktivem Thinking ab — bei "adaptiv"
       also weglassen, sonst scheitert der Aufruf. */
    if (typeof cfg.temperature === "number" && cfg.thinking === "disabled")
      body.temperature = cfg.temperature;
    return body;
  },
  streamBody(cfg, systemPrompt, messages) {
    return { ...this.body(cfg, systemPrompt, messages), stream: true };
  },
  /* ST3 · MECHANIKWECHSEL: native Structured Outputs (output_config.format,
     constrained decoding, GA für ≥ 4.5) statt erzwungenem Tool-Use.
     Sonden-Beweis (Blockgrenze, 1. Aug 2026): tool_choice riss den
     kombinierten antwort+Block-Zug in ~50 % der Läufe — die Tool-Use-
     Serialisierung blutete in den antwort-String ("</antwort>",
     "<parameter …"); mit output_config existiert die Leckklasse mechanisch
     nicht (E: 0 Lecks). Das JSON kommt als Text-Content. Der Dialekt-Wandler
     ist deterministisch — stabile Serialisierung, Grammatik-Cache (24 h) und
     Prompt-Cache bleiben treffsicher. Hinweis der Doku: die API injiziert
     zusätzlich einen kleinen Format-Systemprompt (Tokenkosten; Wechsel des
     Formats invalidiert den Prompt-Cache des Fadens). */
  structuredBody(cfg, systemPrompt, messages, structured) {
    return {
      ...this.body(cfg, systemPrompt, messages),
      output_config: { format: { type: "json_schema", schema: anthropicSoDialekt(structured.schema) } },
    };
  },
  /* ST3 · Streaming unter output_config: das schema-erzwungene JSON kommt
     als GANZ NORMALE text_delta-Häppchen. Der antwort-Extraktor (S79)
     schält daraus live das antwort-Feld für onDelta; am Ende wird das
     vollständige JSON geparst (data ist die Wahrheit, der Extraktor nur die
     Anzeige-Spur). Scheitert der Parse (nur ohne Erzwingung denkbar, etwa
     keyless), trägt der Fehler code struktur_fehlt + den Roh-Text — die
     eine keyless-Korrekturrunde (ST1.4) greift dann im Wiederholungszug. */
  async streamStructuredParse(resp, onDelta) {
    const ex = baueAntwortExtraktor();
    let roh = "", stop = null;
    const usage = { in: undefined, out: undefined, cacheWrite: undefined, cacheRead: undefined };
    for await (const d of sseDaten(resp)) {
      let ev; try { ev = JSON.parse(d); } catch { continue; }
      if (ev.type === "error" || ev.error) throw new Error((ev.error && ev.error.message) || "Anthropic-Fehler");
      if (ev.type === "message_start" && ev.message && ev.message.usage) {
        const u = ev.message.usage;
        usage.in = u.input_tokens; usage.cacheWrite = u.cache_creation_input_tokens; usage.cacheRead = u.cache_read_input_tokens;
      } else if (ev.type === "content_block_delta" && ev.delta && typeof ev.delta.text === "string") {
        roh += ev.delta.text;
        const stueck = ex.speise(ev.delta.text);
        if (stueck) onDelta(stueck);
      } else if (ev.type === "message_delta") {
        if (ev.delta && ev.delta.stop_reason) stop = ev.delta.stop_reason;
        if (ev.usage && ev.usage.output_tokens != null) usage.out = ev.usage.output_tokens;
      }
    }
    pruefeAbschnitt(stop, ex.text);
    let daten;
    try { daten = JSON.parse(roh); }
    catch (e) {
      const fehler = new Error("Strukturausgabe ist kein JSON: " + e.message + strukturAuszug(roh));
      fehler.code = "struktur_fehlt";
      fehler.antwortText = roh;
      throw fehler;
    }
    return { text: ex.text, data: daten, stop, usage, strukturQuelle: "schema" };
  },
  /* ST3 · output_config: das schema-erzwungene JSON IST der Text-Content.
     Reihenfolge der Deutung: (1) tool_use-Block, falls vorhanden — Alt-
     Kompatibilität für Antworten der Tool-Mechanik (etwa Batch-Nachzügler);
     (2) Text als JSON parsen (Regelfall, strukturQuelle:"schema");
     (3) S85-Rettung: GENAU EIN JSON-Wert aus Freitext geschält
         (keyless ohne Erzwingung; strukturQuelle:"text");
     (4) harter Fehler mit code struktur_fehlt + Roh-Text — die eine
         keyless-Korrekturrunde (ST1.4) zeigt dem Modell seine Antwort. */
  parseStructured(data, name) {
    if (data.error) throw new Error(data.error.message || "Anthropic-Fehler");
    const bloecke = data.content || [];
    const text = bloecke.filter(b => b.type === "text").map(b => b.text).join("\n").trim();
    pruefeAbschnitt(data.stop_reason, text);
    const u = data.usage || {};
    const usage = {
      in: u.input_tokens, out: u.output_tokens,
      cacheWrite: u.cache_creation_input_tokens, cacheRead: u.cache_read_input_tokens,
    };
    const tu = bloecke.find(b => b.type === "tool_use" && (!name || b.name === name));
    if (tu && tu.input && typeof tu.input === "object")
      return { text, data: tu.input, stop: data.stop_reason, usage, strukturQuelle: "tool" };
    try {
      return { text, data: JSON.parse(text), stop: data.stop_reason, usage, strukturQuelle: "schema" };
    } catch { /* kein reines JSON — Rettung versuchen */ }
    const gerettet = extrahiereStrukturAusText(text);
    if (gerettet != null)
      return { text, data: gerettet, stop: data.stop_reason, usage, strukturQuelle: "text" };
    const fehler = new Error("Strukturausgabe fehlt: kein JSON-Wert im Text (stop_reason=" + data.stop_reason + ")" + strukturAuszug(text));
    fehler.code = "struktur_fehlt";
    fehler.antwortText = text;
    throw fehler;
  },
  parse(data) {
    if (data.error) throw new Error(data.error.message || "Anthropic-Fehler");
    const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n").trim();
    const u = data.usage || {};
    return markiereAbschnitt({
      text, stop: data.stop_reason,
      usage: {
        in: u.input_tokens, out: u.output_tokens,
        cacheWrite: u.cache_creation_input_tokens, cacheRead: u.cache_read_input_tokens,
      },
    });
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
    return markiereAbschnitt({ text: text.trim(), stop, usage });
  },
};
