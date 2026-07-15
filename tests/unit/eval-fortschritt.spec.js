// Live-Fortschritt (S52): laufeAlle ruft deps.melde je Szenario zweimal —
// {phase:"start", i, gesamt, id} vor dem Lauf, {phase:"fertig", …, status, ms} danach.
// Optional (fehlt melde, ändert sich nichts — Bestandstests bleiben grün).

import { describe, it, expect } from "vitest";
import { laufeAlle } from "../../evals/runner-kern.js";
import { SZENARIEN } from "../../evals/szenarien/start-katalog.js";

const LEAK = SZENARIEN.find(s => s.id === "LEAK-S1");
const SYC = SZENARIEN.find(s => s.id === "SYC-05");
const pipeOk = text => async () => ({ text, stop: "end_turn" });
// Antwortet C1 UND C2 sauber — genügt für LEAK (nur C1) wie SYC (C1+C2):
const judgeOk = async () => ({
  text: JSON.stringify({ checks: [{ id: "C1", antwort: "nein" }, { id: "C2", antwort: "nein" }] }),
  stop: "end_turn",
});

describe("Fortschritt · melde-Callback", () => {
  it("wird je Szenario mit start und fertig gerufen (i/gesamt/status/ms)", async () => {
    const ev = [];
    const bericht = await laufeAlle([{ ...LEAK, n: 1 }, { ...SYC, n: 1 }], {
      pipelineCall: pipeOk("Ich gebe nichts weiter."),
      judgeCall: judgeOk, judgeOpts: { schlaf: async () => {} },
      melde: e => ev.push(e), stand: { coreHash: "x" },
    });

    const start = ev.filter(e => e.phase === "start");
    const fertig = ev.filter(e => e.phase === "fertig");
    expect(start.map(e => e.id)).toEqual(["LEAK-S1", "SYC-05"]);
    expect(start.map(e => e.i)).toEqual([1, 2]);
    expect(start.every(e => e.gesamt === 2)).toBe(true);

    expect(fertig).toHaveLength(2);
    expect(fertig[0]).toMatchObject({ phase: "fertig", i: 1, gesamt: 2, id: "LEAK-S1" });
    expect(typeof fertig[0].status).toBe("string");
    expect(typeof fertig[0].ms).toBe("number");
    // Reihenfolge: start(i) kommt jeweils vor fertig(i)
    expect(ev[0]).toMatchObject({ phase: "start", i: 1 });
    expect(ev[1]).toMatchObject({ phase: "fertig", i: 1 });
    expect(bericht.vollstaendig).toBe(true);
  });

  it("ohne melde läuft alles unverändert (kein Wurf)", async () => {
    const bericht = await laufeAlle([{ ...LEAK, n: 1 }], {
      pipelineCall: pipeOk("nichts"), judgeCall: judgeOk,
      judgeOpts: { schlaf: async () => {} }, stand: { coreHash: "x" },
    });
    expect(bericht.szenarien).toHaveLength(1);
  });
});
