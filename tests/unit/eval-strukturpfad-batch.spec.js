// ST5.4b · Strukturmodus im Batch-Turn-Lockstep. Der Batch ist der teuerste
// Pfad zum Debuggen und der einzige, in dem ein stiller Fehler GATE-Zahlen
// verfälscht statt laut zu scheitern — deshalb prüft diese Spec beide
// Berührungspunkte mit dem Provider einzeln: Request-Körper und Antwort-Deutung.

import { describe, it, expect } from "vitest";
import { laufeAlleBatch } from "../../evals/runner-batch.js";
import { SZENARIEN } from "../../evals/szenarien/start-katalog.js";
import { BLOECKE } from "../../core/contracts/registry.js";

const SOLO = SZENARIEN.find(s => s.session === "solo" && s.eingaben.length >= 1);

const urteilNachricht = checks => ({
  content: [{ type: "tool_use", name: "judge_bewertung",
    input: { checks: checks.map(c => ({ id: c.id, verdict: "no", evidence: "«Beleg»" })) } }],
  stop_reason: "tool_use", usage: { input_tokens: 1, output_tokens: 1 },
});
/** ST3-Form der Pipeline-Antwort: erzwungenes JSON als Text-Content. */
const strukturNachricht = obj => ({
  content: [{ type: "text", text: JSON.stringify(obj) }],
  stop_reason: "end_turn", usage: { input_tokens: 100, output_tokens: 20 },
});
const textNachricht = t => ({
  content: [{ type: "text", text: t }], stop_reason: "end_turn",
  usage: { input_tokens: 100, output_tokens: 20 },
});

describe("Batch · Strukturmodus", () => {
  it("Struktur-Variante: output_config im Request, Schatten im Transkript", async () => {
    const gesehen = [];
    const fuehreBatch = async requests => {
      gesehen.push(...requests);
      const map = new Map();
      for (const r of requests) {
        map.set(r.custom_id, r.custom_id.startsWith("j_")
          ? { message: urteilNachricht(SOLO.checks) }
          : { message: strukturNachricht({ antwort: "Begleitende Antwort.", marker: null, block: { typ: "zeit", daten: { noContent: true } } }) });
      }
      return map;
    };

    const b = await laufeAlleBatch([{ szenario: { ...SOLO, n: 1 }, variante: "struktur" }], {
      pipelineModell: "claude-sonnet-5", judgeModell: "claude-opus-4-8", n: 1,
      stand: { coreHash: "x" }, batch: {}, fuehreBatch,
    });

    const pipeReq = gesehen.filter(r => r.custom_id.startsWith("p_"));
    expect(pipeReq.length).toBeGreaterThan(0);
    for (const r of pipeReq) {
      expect(r.params.output_config.format.type).toBe("json_schema");   // ST3-Mechanik
      expect(r.params.tools).toBeUndefined();
      expect(r.params.system).toBeTruthy();
    }
    const sz = b.szenarien[0];
    expect(sz.variante).toBe("struktur");
    const zug = sz.samples[0].transkript.find(m => m.role === "assistant");
    expect(zug.content).toContain("Begleitende Antwort.");
    expect(zug.content).toContain(BLOECKE.zeitleiste.start);      // Schatten trägt den Block
    expect(zug.strukturQuelle).toBe("schema");
    expect(zug.blockTyp).toBe("zeit");
  });

  it("Text-Variante bleibt unverändert (kein output_config, kein Schatten)", async () => {
    const gesehen = [];
    const fuehreBatch = async requests => {
      gesehen.push(...requests);
      const map = new Map();
      for (const r of requests)
        map.set(r.custom_id, r.custom_id.startsWith("j_")
          ? { message: urteilNachricht(SOLO.checks) } : { message: textNachricht("Reiner Text.") });
      return map;
    };
    await laufeAlleBatch([{ ...SOLO, n: 1 }], {   // nacktes Szenario: Altform muss weiter gehen
      pipelineModell: "claude-sonnet-5", judgeModell: "claude-opus-4-8", n: 1,
      stand: { coreHash: "x" }, batch: {}, fuehreBatch,
    });
    for (const r of gesehen.filter(r => r.custom_id.startsWith("p_")))
      expect(r.params.output_config).toBeUndefined();
  });

  it("A/B: beide Varianten desselben Szenarios landen getrennt im Bericht", async () => {
    const fuehreBatch = async requests => {
      const map = new Map();
      for (const r of requests) {
        if (r.custom_id.startsWith("j_")) { map.set(r.custom_id, { message: urteilNachricht(SOLO.checks) }); continue; }
        map.set(r.custom_id, r.params.output_config
          ? { message: strukturNachricht({ antwort: "Strukturiert.", marker: null, block: null }) }
          : { message: textNachricht("Textlich.") });
      }
      return map;
    };
    const b = await laufeAlleBatch([
      { szenario: { ...SOLO, n: 1 }, variante: "text" },
      { szenario: { ...SOLO, n: 1 }, variante: "struktur" },
    ], {
      pipelineModell: "claude-sonnet-5", judgeModell: "claude-opus-4-8", n: 1,
      stand: { coreHash: "x" }, batch: {}, fuehreBatch,
    });

    expect(b.szenarien).toHaveLength(2);
    expect(b.szenarien.map(s => s.variante)).toEqual(["text", "struktur"]);
    const inhalt = v => b.szenarien.find(s => s.variante === v)
      .samples[0].transkript.find(m => m.role === "assistant").content;
    expect(inhalt("text")).toBe("Textlich.");
    expect(inhalt("struktur")).toBe("Strukturiert.");
  });
});
