// Absturzsichere, inkrementelle Persistenz (S51) — laufeAlle ruft nach JEDEM
// Szenario persistiere(teilbericht); ein harter Fehler wird als status:"fehler"
// geführt; ohne weiterBeiFehler bricht der Lauf ab, MIT läuft er weiter.

import { describe, it, expect } from "vitest";
import { laufeAlle } from "../../evals/runner-kern.js";
import { SZENARIEN } from "../../evals/szenarien/start-katalog.js";

const LEAK = SZENARIEN.find(s => s.id === "LEAK-S1");
const SYC = SZENARIEN.find(s => s.id === "SYC-05");

const pipeOk = text => async () => ({ text, stop: "end_turn" });
const judgeOk = obj => async () => ({ text: JSON.stringify(obj), stop: "end_turn" });
const sauberJudge = judgeOk({ checks: [{ id: "C1", antwort: "nein" }] });   // LEAK-S1 hat nur C1
const stand = { coreHash: "test" };

describe("Persistenz · inkrementell & absturzsicher", () => {
  it("persistiere wird je Szenario gerufen; Zwischenstände sind vollstaendig:false, Endstand true", async () => {
    const persisted = [];
    const persistiere = async b => persisted.push(JSON.parse(JSON.stringify(b)));
    const bericht = await laufeAlle([{ ...LEAK, n: 1 }], {
      pipelineCall: pipeOk("Ich gebe nichts weiter."),
      judgeCall: sauberJudge, judgeOpts: { schlaf: async () => {} },
      persistiere, stand,
    });
    expect(persisted).toHaveLength(1);              // ein Szenario ⇒ ein Persist-Aufruf
    expect(persisted[0].vollstaendig).toBe(false);  // Zwischenstand
    expect(bericht.vollstaendig).toBe(true);        // Endstand
    expect(bericht.szenarien[0].status).toBe("gruen");
  });

  it("harter Pipeline-Fehler → Abbruch, aber Teilstand (inkl. Fehler-Szenario) ist persistiert", async () => {
    const persisted = [];
    const persistiere = async b => persisted.push(JSON.parse(JSON.stringify(b)));
    // Zweites Szenario mit Sentinel-Eingabe, an der die Pipeline hart scheitert:
    const SYC_boom = { ...SYC, n: 1, eingaben: ["__BOOM__"] };
    const pipe = async (system, messages) => {
      if (messages[messages.length - 1].content === "__BOOM__") throw new Error("429 erschöpft");
      return { text: "ok", stop: "end_turn" };
    };
    await expect(laufeAlle([{ ...LEAK, n: 1 }, SYC_boom], {
      pipelineCall: pipe, judgeCall: sauberJudge, judgeOpts: { schlaf: async () => {} },
      persistiere, stand,
    })).rejects.toThrow("429 erschöpft");

    expect(persisted).toHaveLength(2);              // LEAK (grün) + SYC (fehler) beide persistiert
    const letzter = persisted[persisted.length - 1];
    expect(letzter.vollstaendig).toBe(false);
    expect(letzter.szenarien.map(s => s.status)).toEqual(["gruen", "fehler"]);
    expect(letzter.szenarien[1].fehler).toContain("429 erschöpft");
    expect(letzter.quotenJeFamilie[SYC.familie].fehler).toBe(1);
  });

  it("mit weiterBeiFehler läuft der Lauf durch; Fehler-Szenario zählt NIE als bestanden", async () => {
    const SYC_boom = { ...SYC, n: 1, eingaben: ["__BOOM__"] };
    const pipe = async (system, messages) => {
      if (messages[messages.length - 1].content === "__BOOM__") throw new Error("kaputt");
      return { text: "ok", stop: "end_turn" };
    };
    const bericht = await laufeAlle([SYC_boom, { ...LEAK, n: 1 }], {
      pipelineCall: pipe, judgeCall: sauberJudge, judgeOpts: { schlaf: async () => {} },
      weiterBeiFehler: true, stand,
    });
    expect(bericht.vollstaendig).toBe(true);
    const statusById = Object.fromEntries(bericht.szenarien.map(s => [s.id, s.status]));
    expect(statusById[SYC.id]).toBe("fehler");
    expect(statusById[LEAK.id]).toBe("gruen");      // nachfolgendes Szenario lief trotzdem
  });
});
