// MOD-5 · Provider-Vertrag — fuer JEDEN Eintrag der Tabelle.
//
// Ein neuer Provider ist seit MOD-5 eine Datei unter core/llm/providers/ plus
// eine Zeile im Register. Dieser Test laeuft ueber die Tabelle, nicht ueber
// eine Auswahl: Wer einen Provider registriert, bekommt hier automatisch die
// Pruefung, dass er (1) alle Vertragsmethoden traegt, (2) ohne Modellnamen im
// Code auskommt (S35d), (3) im Mock-fetch-Lauf Text, Stream und Struktur in
// der Fassadenform liefert. Dazu: der Adapter traegt keinen Wire-Text mehr —
// die keyless-Plattform reicht die Formforderung herein.

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LLM_PROVIDERS, PROVIDER_VERTRAG } from "../../core/llm/providers/index.js";
import { makeAdapter, LLM_PROVIDERS as ausAdapter } from "../../core/llm/adapter.js";
import { STRUKTUR_KORREKTUR } from "../../core/contracts/struktur-korrektur.js";
import { ARTEFAKT_LLM } from "../../platforms/artifact/llm-config.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCHEMA = { type: "object", properties: { antwort: { type: "string" } }, required: ["antwort"], additionalProperties: false };

/* Je Provider: eine JSON-Antwort und ein SSE-Strom in SEINEM Dialekt. */
const DIALEKT = {
  anthropic: {
    json: text => ({ content: [{ type: "text", text }], stop_reason: "end_turn", usage: { input_tokens: 10, output_tokens: 3 } }),
    sse: text => [
      'data: {"type":"message_start","message":{"usage":{"input_tokens":10}}}\n\n',
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":' + JSON.stringify(text) + '}}\n\n',
      'data: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":3}}\n\n',
    ],
  },
  openaiKompatibel: {
    json: text => ({ choices: [{ message: { content: text }, finish_reason: "stop" }], usage: { prompt_tokens: 10, completion_tokens: 3 } }),
    sse: text => [
      'data: {"choices":[{"delta":{"content":' + JSON.stringify(text) + '}}]}\n\n',
      'data: {"choices":[{"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":10,"completion_tokens":3}}\n\n',
      'data: [DONE]\n\n',
    ],
  },
};
const dialektFuer = name => DIALEKT[name] || DIALEKT.openaiKompatibel;

function sseResponse(zeilen) {
  const enc = new TextEncoder();
  return {
    status: 200,
    headers: { get: n => (n.toLowerCase() === "content-type" ? "text/event-stream" : null) },
    body: new ReadableStream({ start(c) { for (const z of zeilen) c.enqueue(enc.encode(z)); c.close(); } }),
    json: async () => { throw new Error("kein json() im Stream"); },
  };
}
const jsonResponse = data => ({ status: 200, headers: { get: () => "application/json" }, json: async () => data });

describe("MOD-5 · Jeder registrierte Provider erfuellt den Vertrag", () => {
  it("die Tabelle ist dieselbe, die der Adapter exportiert, und nicht leer", () => {
    expect(ausAdapter).toBe(LLM_PROVIDERS);
    expect(Object.keys(LLM_PROVIDERS).length).toBeGreaterThanOrEqual(3);
  });
  for (const [name, P] of Object.entries(LLM_PROVIDERS)) {
    const cfg = { provider: name, mode: "direct", apiKey: "k", models: { [name]: "test-modell" }, thinking: "disabled", stream: true };
    it(name + ": traegt alle Vertragsmethoden", () => {
      for (const m of PROVIDER_VERTRAG) expect(typeof P[m], name + "." + m).toBe("function");
    });
    it(name + ": body/streamBody/structuredBody tragen Modell aus cfg, nie aus dem Code", () => {
      const b = P.body(cfg, "SYS", [{ role: "user", content: "hi" }]);
      expect(b.model).toBe("test-modell");
      expect(P.streamBody(cfg, "SYS", [{ role: "user", content: "hi" }]).stream).toBe(true);
      const sb = P.structuredBody(cfg, "SYS", [{ role: "user", content: "hi" }], { name: "turn", schema: SCHEMA });
      expect(sb.model).toBe("test-modell");
      expect(JSON.stringify(sb)).toContain("antwort");
    });
    it(name + ": Text ueber den Adapter (JSON-Antwort) in Fassadenform", async () => {
      const d = dialektFuer(name);
      const call = makeAdapter({ ...cfg, stream: false }, async () => jsonResponse(d.json("Hallo Welt")));
      const r = await call("SYS", [{ role: "user", content: "hi" }]);
      expect(r.text).toBe("Hallo Welt");
      expect(r.usage.in).toBe(10);
      expect(r.usage.out).toBe(3);
    });
    it(name + ": Stream ueber den Adapter — Deltas kommen an, Ergebnis in Fassadenform", async () => {
      const d = dialektFuer(name);
      const call = makeAdapter(cfg, async () => sseResponse(d.sse("Hallo Welt")));
      const deltas = [];
      const r = await call("SYS", [{ role: "user", content: "hi" }], t => deltas.push(t));
      expect(deltas.join("")).toBe("Hallo Welt");
      expect(r.text).toBe("Hallo Welt");
    });
    it(name + ": Struktur ueber den Adapter — data ist das geparste Objekt", async () => {
      const d = dialektFuer(name);
      const call = makeAdapter({ ...cfg, stream: false }, async () => jsonResponse(d.json('{"antwort":"Hallo"}')));
      const r = await call("SYS", [{ role: "user", content: "hi" }], { structured: { name: "turn", schema: SCHEMA } });
      expect(r.data).toEqual({ antwort: "Hallo" });
    });
  }
});

describe("MOD-5 · Eine Datei je Provider, kein Modellname im Code", () => {
  it("jeder Tabelleneintrag hat eine eigene Datei unter core/llm/providers/", () => {
    const dateien = readdirSync(path.join(ROOT, "core/llm/providers")).map(f => f.replace(/\.js$/, ""));
    for (const name of Object.keys(LLM_PROVIDERS)) expect(dateien, name).toContain(name);
  });
  it("core/llm/providers/*.js nennt kein Modell (S35d, Muster des Grep-Waechters)", () => {
    const verdaechtig = /claude-[a-z]+-\d|mistral-(small|medium|large)|gpt-\d/i;
    for (const f of readdirSync(path.join(ROOT, "core/llm/providers"))) {
      const q = readFileSync(path.join(ROOT, "core/llm/providers", f), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:\\])\/\/[^\n]*/g, "$1");   // Kommentare duerfen Sonden nennen
      expect(q, f).not.toMatch(verdaechtig);
    }
  });
});

describe("MOD-5 · Der Wire-Text ist Vertrag, nicht Transport", () => {
  it("STRUKTUR_KORREKTUR lebt in core/contracts und die keyless-Plattform reicht ihn herein", () => {
    expect(STRUKTUR_KORREKTUR).toMatch(/^\[SYSTEM-REVISION/);
    expect(ARTEFAKT_LLM.strukturKorrektur).toBe(STRUKTUR_KORREKTUR);
  });
  it("ohne cfg.strukturKorrektur gibt es keine Korrektur-Runde — der Ursprungsfehler bleibt", async () => {
    const antworten = [{ content: [{ type: "text", text: "nur Prosa" }], stop_reason: "end_turn", usage: {} }];
    let aufrufe = 0;
    const call = makeAdapter({ provider: "anthropic", mode: "keyless", models: { anthropic: "m" }, thinking: "disabled", stream: false },
      async () => { aufrufe++; return jsonResponse(antworten[0]); });
    await expect(call("SYS", [{ role: "user", content: "hi" }], { structured: { name: "t", schema: SCHEMA } })).rejects.toThrow(/kein JSON-Wert im Text/);
    expect(aufrufe).toBe(1);
  });
});
