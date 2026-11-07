// S147 · Nicht-US-Kandidat GLM 5.3 über die Mistral-Plattform.
//
// GLM 5.3 kann nicht ohne Reasoning laufen (low|high|max, Vorgabe max). Ohne
// eigenes Feld liefe jeder Turn auf max — teuer, langsam, und wie bei Large 4
// (S144c) droht der Token-Deckel vor dem ersten Text. Daher: reasoning_effort
// und max_tokens je Lauf, nur auf ausdrücklichen Wunsch gesendet.

import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeAdapter, LLM_DEFAULTS } from "../../core/llm/adapter.js";
import { leseEvalKonfig, EvalKonfigFehler } from "../../evals/eval-konfig.js";

const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const KONFIG = JSON.parse(readFileSync(path.join(ROOT, "evals/modellvergleich.json"), "utf8"));

function mockFetch() {
  const calls = [];
  const fn = async (url, init) => {
    calls.push(JSON.parse(init.body));
    const a = { choices: [{ message: { content: "ok" }, finish_reason: "stop" }], usage: { prompt_tokens: 1, completion_tokens: 1 } };
    return { status: 200, ok: true, json: async () => a, text: async () => JSON.stringify(a) };
  };
  fn.calls = calls;
  return fn;
}
const M = { provider: "mistral", mode: "direct", apiKey: "k", models: { mistral: "test-modell" } };
const ruf = async cfg => { const f = mockFetch(); await makeAdapter(cfg, f)("SYS", [{ role: "user", content: "u" }]); return f.calls[0]; };

describe("S147 · reasoning_effort im OpenAI-kompatiblen Körper", () => {
  it("Vorgabe: Feld fehlt (Produktion unverändert, Modellvorgabe gilt)", async () => {
    expect(LLM_DEFAULTS.reasoningEffort).toBeNull();
    expect((await ruf(M)).reasoning_effort).toBeUndefined();
  });
  it("gesetzt: wird gesendet", async () => {
    expect((await ruf({ ...M, reasoningEffort: "low" })).reasoning_effort).toBe("low");
  });
  it("maxTokens überschreibt die Vorgabe 4096", async () => {
    expect((await ruf(M)).max_tokens).toBe(4096);
    expect((await ruf({ ...M, maxTokens: 16384 })).max_tokens).toBe(16384);
  });
});

describe("S147 · --denkaufwand / --max-tokens im Eval-Konfig", () => {
  const envM = { EVAL_MISTRAL_PIPELINE_MODEL: "p", EVAL_MISTRAL_JUDGE_MODEL: "j", MISTRAL_API_KEY: "k" };
  const envA = { EVAL_ANTHROPIC_PIPELINE_MODEL: "p", EVAL_ANTHROPIC_JUDGE_MODEL: "j", ANTHROPIC_API_KEY: "k" };
  it("ohne Flags: null (nichts wird gesendet)", () => {
    expect(leseEvalKonfig(["node", "r", "--provider", "mistral"], envM)).toMatchObject({ denkaufwand: null, maxTokens: null });
  });
  it("gültige Werte werden durchgereicht", () => {
    const k = leseEvalKonfig(["node", "r", "--provider", "mistral", "--denkaufwand", "low", "--max-tokens", "16384"], envM);
    expect(k).toMatchObject({ denkaufwand: "low", maxTokens: 16384 });
  });
  it("Tippfehler wirft laut", () => {
    expect(() => leseEvalKonfig(["node", "r", "--provider", "mistral", "--denkaufwand", "minimal"], envM)).toThrow(EvalKonfigFehler);
    expect(() => leseEvalKonfig(["node", "r", "--provider", "mistral", "--max-tokens", "viel"], envM)).toThrow(EvalKonfigFehler);
    expect(() => leseEvalKonfig(["node", "r", "--provider", "mistral", "--max-tokens", "100"], envM)).toThrow(EvalKonfigFehler);
  });
  it("Denkaufwand bei Anthropic wird abgelehnt (dort --denkmodus)", () => {
    expect(() => leseEvalKonfig(["node", "r", "--denkaufwand", "low"], envA)).toThrow(/nur bei --provider mistral/);
  });
});

describe("S147 · Modellvergleich Lauf D", () => {
  const D = KONFIG.laeufe.find(l => l.kennung === "D");
  it("GLM über Mistral mit Denkaufwand low und erhöhtem Deckel", () => {
    expect(D).toMatchObject({ provider: "mistral", modell: "zai-glm-5-3", denkaufwand: "low" });
    expect(D.maxTokens).toBeGreaterThan(4096);
  });
  it("Trockenlauf reicht --denkaufwand und --max-tokens an den Runner", () => {
    const r = spawnSync("node", ["scripts/modellvergleich.js", "--trocken", "--kurz", "--nur", "D"], {
      cwd: ROOT, encoding: "utf8", env: { PATH: process.env.PATH },
    });
    expect(r.status, r.stderr).toBe(0);
    const zeilen = r.stdout.split("\n").filter(z => z.includes("evals/runner.js"));
    expect(zeilen.length).toBeGreaterThan(0);
    for (const z of zeilen) { expect(z).toContain("--denkaufwand low"); expect(z).toContain("--max-tokens " + D.maxTokens); }
  });
});
