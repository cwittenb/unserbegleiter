// PRV-3 · Regie-Transport: Die Zug-Schaerfung reist an der letzten Nachricht
// der Person, nicht im Systemtext.
//
// Begruendung: core/llm/regie.js. Was dieser Test festhaelt:
//   1. mitRegie() — Kopie, Original unangetastet, nur die letzte Person-Nachricht.
//   2. Anthropic mit Cache: der Hinweis ist ein eigener Textblock HINTER dem
//      cache_control des Inhalts — System- und Verlaufs-Cache bleiben gleich.
//   3. Anthropic ohne Cache, Mistral/OpenAI: angehaengt an den Inhalt.
//   4. Proxy: das Feld reist zum Worker mit; ohne Regie bleibt der Body wie bisher.
//   5. Der Systemtext eines geschaerften Zugs ist byte-gleich zu dem eines
//      ungeschaerften (Cache-Invariante) — ueber die echte Engine.
//   6. Echo-Waechter kennt den App-Hinweis.

import { describe, it, expect } from "vitest";
import { mitRegie } from "../../core/engine/regie.js";
import { inhaltMitRegie } from "../../core/llm/regie.js";
import { LLM_PROVIDERS } from "../../core/llm/providers/index.js";
import { makeAdapter } from "../../core/llm/adapter.js";
import { Engine } from "../../core/engine/engine.js";
import { baueSessionDef } from "../../core/komposition.js";
import { echoImText } from "../../evals/runner-kern.js";

const H = "[APP-HINWEIS für diesen Zug: X]";
const verlauf = () => [
  { role: "user", content: "eins" },
  { role: "assistant", content: "zwei" },
  { role: "user", content: "drei" },
];

describe("PRV-3 · mitRegie", () => {
  it("haengt den Hinweis an eine Kopie der letzten Nachricht der Person", () => {
    const v = verlauf();
    const r = mitRegie(v, H);
    expect(r).not.toBe(v);
    expect(r[2]).toEqual({ role: "user", content: "drei", regie: H });
    expect(v[2].regie).toBeUndefined();           // Original unangetastet
    expect(r[0]).toBe(v[0]);                       // Rest geteilt
  });
  it("ohne Hinweis oder ohne Person-Nachricht: derselbe Verlauf", () => {
    const v = verlauf();
    expect(mitRegie(v, null)).toBe(v);
    expect(mitRegie(v, "")).toBe(v);
    const nurA = [{ role: "assistant", content: "x" }];
    expect(mitRegie(nurA, H)).toBe(nurA);
  });
  it("letzte Person-Nachricht, auch wenn danach eine Assistant-Nachricht steht", () => {
    const v = [...verlauf(), { role: "assistant", content: "vier" }];
    expect(mitRegie(v, H)[2].regie).toBe(H);
    expect(mitRegie(v, H)[3].regie).toBeUndefined();
  });
  it("inhaltMitRegie: Absatz und Hinweis hinten an", () => {
    expect(inhaltMitRegie({ content: "drei", regie: H })).toBe("drei\n\n" + H);
    expect(inhaltMitRegie({ content: "drei" })).toBe("drei");
  });
});

describe("PRV-3 · Provider-Bodies", () => {
  const cfg = (mehr = {}) => ({ models: { anthropic: "m", mistral: "m", openai: "m" }, maxTokens: 100, ...mehr });

  it("Anthropic mit Cache: Hinweis als eigener Block hinter dem Breakpoint", () => {
    const b = LLM_PROVIDERS.anthropic.body(cfg({ cache: true }), "SYS", mitRegie(verlauf(), H));
    const letzte = b.messages.at(-1);
    expect(letzte.content).toHaveLength(2);
    expect(letzte.content[0]).toMatchObject({ type: "text", text: "drei", cache_control: { type: "ephemeral" } });
    expect(letzte.content[1]).toEqual({ type: "text", text: H });
    expect(b.system[0].text).toBe("SYS");
    for (const m of b.messages) expect(m.regie).toBeUndefined();   // kein Fremdfeld zur API
  });
  it("Anthropic mit Cache, ohne Hinweis: Body exakt wie vor PRV-3", () => {
    const b = LLM_PROVIDERS.anthropic.body(cfg({ cache: true }), "SYS", verlauf());
    expect(b.messages.at(-1).content).toEqual([{ type: "text", text: "drei", cache_control: { type: "ephemeral" } }]);
    expect(b.messages[0]).toEqual({ role: "user", content: "eins" });
  });
  it("Anthropic ohne Cache: angehaengt", () => {
    const b = LLM_PROVIDERS.anthropic.body(cfg({ cache: false }), "SYS", mitRegie(verlauf(), H));
    expect(b.messages.at(-1)).toEqual({ role: "user", content: "drei\n\n" + H });
  });
  for (const p of ["mistral", "openai"]) {
    it(p + ": angehaengt, Systemtext unveraendert", () => {
      const b = LLM_PROVIDERS[p].body(cfg(), "SYS", mitRegie(verlauf(), H));
      expect(b.messages[0]).toEqual({ role: "system", content: "SYS" });
      expect(b.messages.at(-1)).toEqual({ role: "user", content: "drei\n\n" + H });
    });
  }
});

describe("PRV-3 · Proxy", () => {
  it("das Feld reist zum Worker mit — und nur, wenn es da ist", async () => {
    const bodies = [];
    const fetchFn = async (url, init) => { bodies.push(JSON.parse(init.body)); return { ok: true, status: 200, headers: { get: () => "application/json" }, json: async () => ({ text: "ok", stop: "end_turn" }) }; };
    const a = makeAdapter({ provider: "anthropic", mode: "proxy", models: { anthropic: "m" } }, fetchFn);
    await a("SYS", mitRegie(verlauf(), H));
    await a("SYS", verlauf());
    expect(bodies[0].messages.at(-1)).toEqual({ role: "user", content: "drei", regie: H });
    expect(bodies[1].messages.at(-1)).toEqual({ role: "user", content: "drei" });
  });
});

describe("PRV-3 · Cache-Invariante über die echte Engine", () => {
  it("geschärfter und ungeschärfter Zug sehen denselben Systemtext", async () => {
    const def = baueSessionDef("moment");
    const gesehen = [];
    const llm = async (system, msgs) => { gesehen.push({ system, regie: msgs.at(-1).regie || null }); return { text: "Ich bin da.", stop: "end_turn" }; };
    const e = new Engine({ def, chat: { messages: [], status: "running" }, llm, ctx: { nameA: "Anna", nameB: "Bernd" } });
    await e.sendUser("Anna: Ich will nicht mehr leben.");
    await e.sendUser("Bernd: Wie war dein Tag?");
    expect(gesehen[0].regie).toMatch(/APP-HINWEIS/);
    expect(gesehen[1].regie).toBeNull();
    expect(gesehen[0].system).toEqual(gesehen[1].system);   // String oder Blöcke (PRV-7m)
    expect(JSON.stringify(e.chat.messages)).not.toContain("APP-HINWEIS");
  });
});

describe("PRV-3 · Echo-Wächter", () => {
  it("meldet einen zitierten App-Hinweis (DE/EN), nicht gewöhnliche Sprache", () => {
    expect(echoImText("Okay. [APP-HINWEIS für diesen Zug: …]").map(x => x.name)).toContain("App-Hinweis-Echo");
    expect(echoImText("[APP NOTE for this turn: …] Hi").map(x => x.name)).toContain("App-Hinweis-Echo");
    expect(echoImText("Die App weist dich gleich auf etwas hin.")).toEqual([]);
  });
});
