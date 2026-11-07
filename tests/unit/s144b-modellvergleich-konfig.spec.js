// S144b · Modellvergleich II — Konfiguration, Denkmodus, Judge-Freigabe.
//
// Befunde, die dazu führten:
//   · mistral-large-latest zeigt inzwischen auf ein anderes Modell als im August
//     gemessen — Aliasse machen Läufe über die Zeit unvergleichbar.
//   · Neuere Anthropic-Modelle lehnen thinking:"disabled" mit 400 ab; ohne
//     eigenen Denkmodus wären Lauf B und C beim ersten Aufruf gescheitert.
//   · Ein Judge-Wechsel zusammen mit neuen Kandidaten wäre konfundiert — die
//     Freigabe-Sperre hält die Reihenfolge Kalibrierung → Lauf fest.

import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeAdapter } from "../../core/llm/adapter.js";
import { leseEvalKonfig, EvalKonfigFehler } from "../../evals/eval-konfig.js";

const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const lies = p => JSON.parse(readFileSync(path.join(ROOT, p), "utf8"));
const KONFIG = lies("evals/modellvergleich.json");
const PREISE = lies("evals/preise.json").modelle;
const DENKMODI = ["aus", "adaptiv", "zwischen-tools"];

describe("S144b · evals/modellvergleich.json", () => {
  it("Kennungen eindeutig", () => {
    const k = KONFIG.laeufe.map(l => l.kennung);
    expect(new Set(k).size).toBe(k.length);
  });

  it("keine -latest-Aliasse — weder in Läufen noch beim Judge", () => {
    for (const m of [...KONFIG.laeufe.map(l => l.modell), KONFIG.judge.modell]) expect(m).not.toMatch(/-latest$/);
  });

  it("jedes Modell hat einen Preiseintrag (sonst Kosten null im Bericht)", () => {
    for (const m of [...KONFIG.laeufe.map(l => l.modell), KONFIG.judge.modell]) expect(PREISE[m], m).toBeTruthy();
  });

  it("Denkmodus nur mit gültigem Wert", () => {
    for (const l of KONFIG.laeufe) if (l.denkmodus !== undefined) expect(DENKMODI).toContain(l.denkmodus);
  });

  it("Judge trägt eine ausdrückliche Freigabe (boolean)", () => {
    expect(typeof KONFIG.judge.freigegeben).toBe("boolean");
  });

  it("kein Lauf nutzt das Judge-Modell als Pipeline (Self-Preference)", () => {
    for (const l of KONFIG.laeufe) expect(l.modell).not.toBe(KONFIG.judge.modell);
  });
});

describe("S144b · --denkmodus im Eval-Konfig", () => {
  const env = { EVAL_ANTHROPIC_PIPELINE_MODEL: "p", EVAL_ANTHROPIC_JUDGE_MODEL: "j", ANTHROPIC_API_KEY: "k" };

  it("Vorgabe bleibt aus → disabled (S77, alle alten Ergebnisse)", () => {
    expect(leseEvalKonfig(["node", "r"], env)).toMatchObject({ denkmodus: "aus", pipelineThinking: "disabled" });
  });

  it("zwischen-tools und adaptiv werden durchgereicht", () => {
    expect(leseEvalKonfig(["node", "r", "--denkmodus", "zwischen-tools"], env).pipelineThinking).toBe("zwischen-tools");
    expect(leseEvalKonfig(["node", "r", "--denkmodus", "adaptiv"], env).pipelineThinking).toBe("adaptiv");
  });

  it("unbekannter Wert wirft laut — kein stiller Rückfall", () => {
    expect(() => leseEvalKonfig(["node", "r", "--denkmodus", "disabled"], env)).toThrow(EvalKonfigFehler);
    expect(() => leseEvalKonfig(["node", "r", "--denkmodus", "toString"], env)).toThrow(EvalKonfigFehler);
  });
});

describe("S144b · Anthropic-Körper für zwischen-tools", () => {
  function mockFetch() {
    const calls = [];
    const fn = async (url, init) => {
      calls.push(JSON.parse(init.body));
      const a = { content: [{ type: "text", text: "ok" }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } };
      return { status: 200, json: async () => a, text: async () => JSON.stringify(a) };
    };
    fn.calls = calls;
    return fn;
  }
  const A = { provider: "anthropic", mode: "keyless", models: { anthropic: "test-modell" } };

  it("sendet thinking:{type:between_tools}", async () => {
    const f = mockFetch();
    await makeAdapter({ ...A, thinking: "zwischen-tools" }, f)("SYS", [{ role: "user", content: "u" }]);
    expect(f.calls[0].thinking).toEqual({ type: "between_tools" });
  });

  it("keine Temperatur dazu (nur bei disabled erlaubt, S137)", async () => {
    const f = mockFetch();
    await makeAdapter({ ...A, thinking: "zwischen-tools", temperature: 0.3 }, f)("SYS", [{ role: "user", content: "u" }]);
    expect(f.calls[0].temperature).toBeUndefined();
  });

  it("disabled bleibt unverändert (Produktionsvorgabe)", async () => {
    const f = mockFetch();
    await makeAdapter({ ...A }, f)("SYS", [{ role: "user", content: "u" }]);
    expect(f.calls[0].thinking).toEqual({ type: "disabled" });
  });
});

describe("S144b · scripts/modellvergleich.js", () => {
  const lauf = (...args) => spawnSync("node", ["scripts/modellvergleich.js", ...args], {
    cwd: ROOT, encoding: "utf8", env: { PATH: process.env.PATH },
  });

  it("Trockenlauf: n=3, Judge für alle, Denkmodus je Lauf", () => {
    const r = lauf("--trocken", "--kurz");
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toMatch(/n=3/);
    const zeilen = r.stdout.split("\n").filter(z => z.includes("evals/runner.js"));
    expect(zeilen).toHaveLength(3 * KONFIG.laeufe.length);
    for (const z of zeilen) expect(z).toContain("--judge-modell " + KONFIG.judge.modell);
    for (const l of KONFIG.laeufe.filter(x => x.denkmodus)) {
      const eigene = zeilen.filter(z => z.includes("--pipeline-modell " + l.modell + " "));
      for (const z of eigene) expect(z).toContain("--denkmodus " + l.denkmodus);
    }
  });

  it("nicht freigegebener Judge: echter Lauf verweigert, Exit 2", () => {
    if (KONFIG.judge.freigegeben !== false) return;   // nach der Freigabe gegenstandslos
    const r = lauf("--kurz", "--nur", "A");
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/nicht freigegeben/);
  });

  it("--nur mit unbekannter Kennung nennt alle Kennungen aus der Datei", () => {
    const r = lauf("--trocken", "--nur", "Z");
    expect(r.status).toBe(2);
    expect(r.stderr).toContain(KONFIG.laeufe.map(l => l.kennung).join(", "));
  });
});
