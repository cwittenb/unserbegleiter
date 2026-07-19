// Batch-Runner (S57): Pipeline im Turn-Lockstep + Judge in EINEM Batch, Report identisch
// zur synchronen Struktur. Der Batch-Ausführer wird injiziert (deps.fuehreBatch), damit die
// Orchestrierung ohne HTTP getestet wird (den Client testet batch-anthropic.spec separat).

import { describe, it, expect } from "vitest";
import { laufeAlleBatch } from "../../evals/runner-batch.js";
import { SZENARIEN } from "../../evals/szenarien/start-katalog.js";

const LEAK = SZENARIEN.find(s => s.id === "LEAK-S1");   // ein Check (C1)
const nachricht = (text, usage = { input_tokens: 100, output_tokens: 20 }) => ({ content: [{ type: "text", text }], usage, stop_reason: "end_turn" });
// S78: Batch-Judge antwortet strukturiert — der Mock liefert den tool_use-Block.
const urteilNachricht = (checks, usage) => ({
  content: [{ type: "tool_use", name: "judge_bewertung",
    input: { checks: checks.map(c => ({ id: c.id, verdict: c.antwort === "ja" ? "yes" : "no", evidence: c.beleg || "«Beleg»" })) } }],
  stop_reason: "tool_use",
  usage: usage || { input_tokens: 1, output_tokens: 1 },
});

describe("Batch-Runner · Lockstep + Judge-Batch", () => {
  it("Pipeline im Lockstep, Judge-Batch, Report + Telemetrie stimmen", async () => {
    const batches = [];
    const fuehreBatch = async requests => {
      batches.push(requests);
      const map = new Map();
      for (const r of requests) {
        if (r.custom_id.startsWith("j_"))
          map.set(r.custom_id, { message: urteilNachricht([{ id: "C1", antwort: "nein", beleg: "ok" }], { input_tokens: 50, output_tokens: 10 }) });
        else
          map.set(r.custom_id, { message: nachricht("Antwort") });
      }
      return map;
    };

    const b = await laufeAlleBatch([{ ...LEAK, n: 2 }], {
      pipelineModell: "claude-sonnet-5", judgeModell: "claude-opus-4-8", n: 2,
      stand: { coreHash: "x" }, batch: {}, fuehreBatch,
    });

    expect(b.szenarien).toHaveLength(1);
    expect(b.szenarien[0].id).toBe("LEAK-S1");
    expect(b.szenarien[0].status).toBe("gruen");
    expect(b.szenarien[0].samples).toHaveLength(2);
    expect(b.telemetrie.pipe.calls).toBeGreaterThan(0);
    expect(b.telemetrie.judge.calls).toBe(2);        // 2 Samples → 2 Judge-Requests
    expect(b.telemetrie.judge.in).toBe(100);         // 50 × 2
    // letzter Batch ist der Judge-Batch mit 2 Anfragen
    const letzter = batches[batches.length - 1];
    expect(letzter.every(r => r.custom_id.startsWith("j_"))).toBe(true);
    expect(letzter).toHaveLength(2);
  });

  it("Turn-2-Request enthält die Assistant-Antwort von Turn 1 (Lockstep-Reihenfolge)", async () => {
    const sz = SZENARIEN.find(s => s.eingaben.length >= 2) || LEAK;
    const batches = [];
    const fuehreBatch = async requests => {
      batches.push(requests.map(r => ({ cid: r.custom_id, msgs: r.params.messages })));
      const map = new Map();
      for (const r of requests) {
        if (r.custom_id.startsWith("j_"))
          map.set(r.custom_id, { message: urteilNachricht(sz.checks.map(c => ({ id: c.id, antwort: "nein", beleg: "x" }))) });
        else map.set(r.custom_id, { message: nachricht("REPLY") });
      }
      return map;
    };
    await laufeAlleBatch([{ ...sz, n: 1 }], {
      pipelineModell: "claude-sonnet-5", judgeModell: "claude-opus-4-8", n: 1,
      stand: {}, batch: {}, fuehreBatch,
    });
    const turn0 = batches[0][0].msgs;
    const turn1 = batches[1][0].msgs;
    expect(turn0).toHaveLength(1);
    expect(turn0[0].role).toBe("user");
    expect(turn1.length).toBeGreaterThanOrEqual(3);
    expect(turn1[1]).toMatchObject({ role: "assistant", content: "REPLY" });
  });

  it("Pipeline-Batch-Fehler → Szenario nicht grün, kein Judge für dieses Sample", async () => {
    const fuehreBatch = async requests => {
      const map = new Map();
      for (const r of requests) {
        if (r.custom_id.startsWith("p_")) map.set(r.custom_id, { fehler: "errored: boom" });
        else map.set(r.custom_id, { message: nachricht("{}") });
      }
      return map;
    };
    const b = await laufeAlleBatch([{ ...LEAK, n: 1 }], {
      pipelineModell: "claude-sonnet-5", judgeModell: "claude-opus-4-8", n: 1,
      stand: {}, batch: {}, fuehreBatch,
    });
    expect(b.szenarien[0].status).not.toBe("gruen");
    expect(b.szenarien[0].samples[0].judgeFehler).toContain("Batch-Fehler");
  });

  it("Pipeline-Requests tragen 1h-Cache-TTL auf dem System-Prompt (S65)", async () => {
    let cc = null;
    const fuehreBatch = async requests => {
      const map = new Map();
      for (const r of requests) {
        if (r.custom_id.startsWith("p_") && cc === null) cc = r.params.system[0].cache_control;
        map.set(r.custom_id, { message: r.custom_id.startsWith("j_")
          ? urteilNachricht([{ id: "C1", antwort: "nein", beleg: "ok" }])
          : nachricht("x") });
      }
      return map;
    };
    await laufeAlleBatch([{ ...LEAK, n: 1 }], {
      pipelineModell: "claude-sonnet-5", judgeModell: "claude-opus-4-8", n: 1, stand: {}, batch: {}, fuehreBatch,
    });
    expect(cc).toEqual({ type: "ephemeral", ttl: "1h" });
  });

  it("Gesamt-Wallclock landet im Bericht (nicht 0-hart) (S65)", async () => {
    const fuehreBatch = async requests => {
      await new Promise(r => setTimeout(r, 3));
      const map = new Map();
      for (const r of requests) map.set(r.custom_id, { message: r.custom_id.startsWith("j_")
        ? urteilNachricht([{ id: "C1", antwort: "nein", beleg: "ok" }])
        : nachricht("x") });
      return map;
    };
    const b = await laufeAlleBatch([{ ...LEAK, n: 1 }], {
      pipelineModell: "claude-sonnet-5", judgeModell: "claude-opus-4-8", n: 1, stand: {}, batch: {}, fuehreBatch,
    });
    expect(typeof b.telemetrie.ms).toBe("number");
    expect(b.telemetrie.ms).toBeGreaterThan(0);
  });

  it("leere Pipeline-Antwort → Sample unbewertet, kein Judge, nicht grün (S65)", async () => {
    let judgeCalls = 0;
    const fuehreBatch = async requests => {
      const map = new Map();
      for (const r of requests) {
        if (r.custom_id.startsWith("j_")) { judgeCalls++; map.set(r.custom_id, { message: nachricht("{}") }); }
        else map.set(r.custom_id, { message: nachricht("") });   // leere Antwort
      }
      return map;
    };
    const b = await laufeAlleBatch([{ ...LEAK, n: 1 }], {
      pipelineModell: "claude-sonnet-5", judgeModell: "claude-opus-4-8", n: 1, stand: {}, batch: {}, fuehreBatch,
    });
    expect(b.szenarien[0].samples[0].unbewertet).toBe(true);
    expect(b.szenarien[0].samples[0].judgeFehler).toMatch(/leere Pipeline-Antwort/);
    expect(b.szenarien[0].status).not.toBe("gruen");
    expect(judgeCalls).toBe(0);
  });
});

describe("Batch-Runner · S81: Denkmodus, Budget, Abschneide-Robustheit", () => {
  it("Pipeline-Requests: thinking disabled + 4096er Budget; Judge-Requests OHNE thinking (adaptiv)", async () => {
    const fuehreBatch = async requests => {
      const map = new Map();
      for (const r of requests) {
        if (r.custom_id.startsWith("p_")) {
          expect(r.params.thinking).toEqual({ type: "disabled" });
          expect(r.params.max_tokens).toBe(4096);
          map.set(r.custom_id, { message: nachricht("Antwort") });
        } else {
          expect(r.params.thinking).toBeUndefined();
          map.set(r.custom_id, { message: urteilNachricht([{ id: "C1", antwort: "nein", beleg: "ok" }]) });
        }
      }
      return map;
    };
    const b = await laufeAlleBatch([LEAK], { n: 1, fuehreBatch, pipelineModell: "p", judgeModell: "j" });
    expect(b.szenarien[0].status).toBe("gruen");
  });

  it("EIN abgeschnittener Turn (nur thinking, kein Text) ⇒ dieses Sample unbewertet, der Lauf lebt weiter", async () => {
    const kaputt = { content: [{ type: "thinking", thinking: "", signature: "x" }], stop_reason: "max_tokens", usage: { input_tokens: 1, output_tokens: 1024 } };
    const fuehreBatch = async requests => {
      const map = new Map();
      for (const r of requests) {
        if (r.custom_id.startsWith("p_"))
          map.set(r.custom_id, { message: r.custom_id.includes("_1_") ? kaputt : nachricht("Vollständige Antwort.") });
        else map.set(r.custom_id, { message: urteilNachricht([{ id: "C1", antwort: "nein", beleg: "ok" }]) });
      }
      return map;
    };
    const b = await laufeAlleBatch([LEAK], { n: 2, fuehreBatch, pipelineModell: "p", judgeModell: "j" });
    const sz = b.szenarien[0];
    expect(sz.unbewerteteSamples).toBe(1);
    expect(JSON.stringify(sz)).toContain("abgeschnitten");
    expect(sz.samples.filter(x => !x.unbewertet)).toHaveLength(1);   // das saubere Sample wurde gerichtet
  });

  it("Halbsatz (abgeschnitten MIT Text) wird markiert und NICHT gerichtet (S77-Regel im Batch)", async () => {
    const halb = { content: [{ type: "text", text: "Ich höre, dass" }], stop_reason: "max_tokens", usage: { input_tokens: 1, output_tokens: 4096 } };
    let judgeRufe = 0;
    const fuehreBatch = async requests => {
      const map = new Map();
      for (const r of requests) {
        if (r.custom_id.startsWith("p_")) map.set(r.custom_id, { message: halb });
        else { judgeRufe++; map.set(r.custom_id, { message: urteilNachricht([{ id: "C1", antwort: "nein", beleg: "ok" }]) }); }
      }
      return map;
    };
    const b = await laufeAlleBatch([LEAK], { n: 1, fuehreBatch, pipelineModell: "p", judgeModell: "j" });
    expect(b.szenarien[0].unbewerteteSamples).toBe(1);
    expect(judgeRufe).toBe(0);
  });
});
