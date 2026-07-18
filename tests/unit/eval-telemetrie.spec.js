// Lauf-Telemetrie (S55): laufeAlle schnappschusst die echten usage-Token je Szenario
// (Pipeline/Judge getrennt) über deps.messen und summiert sie. Ohne messen bleibt alles
// beim Alten. Zusätzlich: beleglose Verstöße werden markiert (Triage, ändert Wertung nicht).

import { describe, it, expect } from "vitest";
import { laufeAlle } from "../../evals/runner-kern.js";
import { SZENARIEN } from "../../evals/szenarien/start-katalog.js";

const LEAK = SZENARIEN.find(s => s.id === "LEAK-S1");   // ein einzelner Check (C1)
const leer = () => ({ in: 0, out: 0, cacheRead: 0, cacheWrite: 0, calls: 0 });
const zaehl = (fn, akk) => async (...a) => {
  const r = await fn(...a);
  const u = r.usage || {};
  akk.in += u.in || 0; akk.out += u.out || 0; akk.cacheRead += u.cacheRead || 0; akk.cacheWrite += u.cacheWrite || 0; akk.calls++;
  return r;
};

describe("Telemetrie · Token je Szenario + Lauf", () => {
  it("Wrapper summiert echte usage; laufeAlle hängt Telemetrie an (Pipeline/Judge getrennt)", async () => {
    const tP = leer(), tJ = leer();
    const messen = () => ({ pipe: { ...tP }, judge: { ...tJ } });
    const pipelineCall = zaehl(async () => ({ text: "Ich gebe nichts weiter.", usage: { in: 100, out: 20, cacheRead: 40, cacheWrite: 5 } }), tP);
    const judgeCall = zaehl(async () => ({ data: { checks: [{ id: "C1", verdict: "no", evidence: "ok" }] }, usage: { in: 50, out: 10 } }), tJ);

    const b = await laufeAlle([{ ...LEAK, n: 1 }], { pipelineCall, judgeCall, messen, judgeOpts: { schlaf: async () => {} }, stand: {} });

    expect(b.telemetrie.judge.calls).toBe(1);                                  // ein Judge-Aufruf je Sample
    expect(b.telemetrie.pipe.calls).toBeGreaterThanOrEqual(1);
    expect(b.telemetrie.pipe.in).toBe(100 * b.telemetrie.pipe.calls);          // Pipeline-Token summiert
    expect(b.telemetrie.pipe.cacheRead).toBe(40 * b.telemetrie.pipe.calls);
    expect(b.telemetrie.judge.in).toBe(50);                                    // getrennt vom Pipeline-Modell
    expect(b.szenarien[0].telemetrie.pipe.in).toBe(b.telemetrie.pipe.in);      // per-Szenario == Lauf (1 Szenario)
    expect(typeof b.szenarien[0].telemetrie.ms).toBe("number");
  });

  it("ohne messen: keine Telemetrie-Pflicht, kein Wurf", async () => {
    const pipelineCall = async () => ({ text: "x", usage: { in: 1 } });
    const judgeCall = async () => ({ data: { checks: [{ id: "C1", verdict: "no", evidence: "«Beleg»" }] } });
    const b = await laufeAlle([{ ...LEAK, n: 1 }], { pipelineCall, judgeCall, judgeOpts: { schlaf: async () => {} }, stand: {} });
    expect(b.szenarien).toHaveLength(1);
    expect(b.telemetrie.pipe.calls).toBe(0);
  });

  it("verletzter Check ohne Beleg → belegloserVerstoss=true; mit Beleg → false", async () => {
    const pipe = async () => ({ text: "…", usage: {} });
    const judge = beleg => async () => ({ data: { checks: [{ id: "C1", verdict: "yes", evidence: beleg }] }, stop: "end_turn" });

    const ohne = await laufeAlle([{ ...LEAK, n: 1 }], { pipelineCall: pipe, judgeCall: judge(""), judgeOpts: { schlaf: async () => {} }, stand: {} });
    expect(ohne.szenarien[0].status).not.toBe("gruen");
    expect(ohne.szenarien[0].belegloserVerstoss).toBe(true);

    const mit = await laufeAlle([{ ...LEAK, n: 1 }], { pipelineCall: pipe, judgeCall: judge("echtes Zitat"), judgeOpts: { schlaf: async () => {} }, stand: {} });
    expect(mit.szenarien[0].belegloserVerstoss).toBe(false);
  });
});
