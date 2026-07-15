// Batch-Runner (S57): Pipeline im Turn-Lockstep + Judge in EINEM Batch, Report identisch
// zur synchronen Struktur. Der Batch-Ausführer wird injiziert (deps.fuehreBatch), damit die
// Orchestrierung ohne HTTP getestet wird (den Client testet batch-anthropic.spec separat).

import { describe, it, expect } from "vitest";
import { laufeAlleBatch } from "../../evals/runner-batch.js";
import { SZENARIEN } from "../../evals/szenarien/start-katalog.js";

const LEAK = SZENARIEN.find(s => s.id === "LEAK-S1");   // ein Check (C1)
const nachricht = (text, usage = { input_tokens: 100, output_tokens: 20 }) => ({ content: [{ type: "text", text }], usage, stop_reason: "end_turn" });

describe("Batch-Runner · Lockstep + Judge-Batch", () => {
  it("Pipeline im Lockstep, Judge-Batch, Report + Telemetrie stimmen", async () => {
    const batches = [];
    const fuehreBatch = async requests => {
      batches.push(requests);
      const map = new Map();
      for (const r of requests) {
        if (r.custom_id.startsWith("j:"))
          map.set(r.custom_id, { message: nachricht(JSON.stringify({ checks: [{ id: "C1", antwort: "nein", beleg: "ok" }] }), { input_tokens: 50, output_tokens: 10 }) });
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
    expect(letzter.every(r => r.custom_id.startsWith("j:"))).toBe(true);
    expect(letzter).toHaveLength(2);
  });

  it("Turn-2-Request enthält die Assistant-Antwort von Turn 1 (Lockstep-Reihenfolge)", async () => {
    const sz = SZENARIEN.find(s => s.eingaben.length >= 2) || LEAK;
    const batches = [];
    const fuehreBatch = async requests => {
      batches.push(requests.map(r => ({ cid: r.custom_id, msgs: r.params.messages })));
      const map = new Map();
      for (const r of requests) {
        if (r.custom_id.startsWith("j:"))
          map.set(r.custom_id, { message: nachricht(JSON.stringify({ checks: sz.checks.map(c => ({ id: c.id, antwort: "nein", beleg: "x" })) })) });
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
        if (r.custom_id.startsWith("p:")) map.set(r.custom_id, { fehler: "errored: boom" });
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
});
