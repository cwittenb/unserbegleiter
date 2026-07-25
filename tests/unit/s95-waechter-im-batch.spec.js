// S95 · Wächter-Welle im Batch-Pfad.
//
// S94 hat die Wächter-Stufe in den synchronen Runner gebracht und `--waechter`
// im Batch ausdrücklich ausgeschlossen: Der Batch stellt alle Anfragen vorab
// zusammen, eine Revisions-Runde wäre eine zweite Welle. Hier ist sie.
//
// Der Kern der Sache und der subtilste Test: Turn d+1 muss die REVIDIERTE
// Fassung im Kontext tragen, nie die verworfene. Sonst arbeitet das Modell
// auf einem Text weiter, den die Person nie gesehen hat.

import { describe, it, expect } from "vitest";
import { laufeAlleBatch } from "../../evals/runner-batch.js";
import { SZENARIEN } from "../../evals/szenarien/start-katalog.js";
import { steuerTexte } from "../../core/prompts/prompts.de.js";

const LEAK = SZENARIEN.find(s => s.id === "LEAK-S1");   // solo, ein Check (C1)

const URTEIL = "Das ist eine starke Fassung – deine Stimme ist klar drin.";
const SAUBER = "Für mich klingt das nach einem Schritt – wie war das für dich?";

const nachricht = (text, usage = { input_tokens: 100, output_tokens: 20 }) =>
  ({ content: [{ type: "text", text }], usage, stop_reason: "end_turn" });
const urteilNachricht = () => ({
  content: [{ type: "tool_use", name: "judge_bewertung", input: { checks: [{ id: "C1", verdict: "no", evidence: "«ok»" }] } }],
  stop_reason: "tool_use", usage: { input_tokens: 1, output_tokens: 1 },
});

/**
 * Batch-Attrappe. `antwort(custom_id, requests)` liefert den Text für Pipeline-
 * und Revisions-Anfragen; Judge-Anfragen bekommen immer ein sauberes Urteil.
 * Alle Wellen werden mitgeschnitten.
 */
function attrappe(antwort) {
  const wellen = [];
  const fn = async requests => {
    wellen.push(requests);
    const map = new Map();
    for (const r of requests)
      map.set(r.custom_id, r.custom_id.startsWith("j_")
        ? { message: urteilNachricht() }
        : { message: nachricht(antwort(r.custom_id, requests)) });
    return map;
  };
  fn.wellen = wellen;
  return fn;
}

const laufe = (szenario, fuehreBatch, mehr = {}) => laufeAlleBatch([szenario], {
  pipelineModell: "claude-sonnet-5", judgeModell: "claude-opus-4-8",
  stand: { coreHash: "x" }, batch: {}, fuehreBatch, ...mehr,
});

describe("S95 · Wächter-Welle im Batch", () => {
  it("ohne Flag bleibt alles wie vorher — keine Revisions-Welle", async () => {
    const f = attrappe(() => URTEIL);
    await laufe({ ...LEAK, n: 1 }, f);
    expect(f.wellen.flat().some(r => r.custom_id.startsWith("r_"))).toBe(false);
  });

  it("mit Flag: Treffer → eigene Welle, die NUR die getroffene Konversation trägt", async () => {
    const f = attrappe(cid => cid.startsWith("r_") ? SAUBER : URTEIL);
    await laufe({ ...LEAK, n: 2 }, f, { n: 2, waechter: true });

    const rWellen = f.wellen.filter(w => w.every(r => r.custom_id.startsWith("r_")));
    expect(rWellen).toHaveLength(1);
    expect(rWellen[0]).toHaveLength(2);   // beide Samples haben ausgelöst
  });

  it("die Revisions-Anfrage trägt die verworfene Antwort UND die SYSTEM-REVISION", async () => {
    const f = attrappe(cid => cid.startsWith("r_") ? SAUBER : URTEIL);
    await laufe({ ...LEAK, n: 1 }, f, { n: 1, waechter: true });

    const r = f.wellen.flat().find(x => x.custom_id.startsWith("r_"));
    // Die Fassade macht aus content teils Text-Bloecke — beide Formen zulassen.
    const txt = m => typeof m.content === "string"
      ? m.content
      : m.content.map(b => b.text || "").join("");
    const msgs = r.params.messages;
    expect(txt(msgs[msgs.length - 2])).toBe(URTEIL);
    expect(txt(msgs[msgs.length - 1])).toBe(steuerTexte.urteilsRevision);
  });

  it("das Transkript zeigt nur die revidierte Fassung — mit Wächter-Spur", async () => {
    const f = attrappe(cid => cid.startsWith("r_") ? SAUBER : URTEIL);
    const b = await laufe({ ...LEAK, n: 1 }, f, { n: 1, waechter: true });

    const tr = b.szenarien[0].samples[0].transkript;
    const assistant = tr.filter(m => m.role === "assistant");
    expect(assistant[0].content).toBe(SAUBER);
    expect(assistant[0].waechterTreffer).toBe("urteil");
    expect(JSON.stringify(tr)).not.toContain("starke Fassung");
    expect(b.waechterTreffer).toEqual({ aufdeck: 0, urteil: 1 });
  });

  it("kein Treffer → gar keine Revisions-Welle", async () => {
    const f = attrappe(() => SAUBER);
    const b = await laufe({ ...LEAK, n: 1 }, f, { n: 1, waechter: true });
    expect(f.wellen.flat().some(r => r.custom_id.startsWith("r_"))).toBe(false);
    expect(b.waechterTreffer).toEqual({ aufdeck: 0, urteil: 0 });
  });

  it("die zweite Fassung wird angenommen, auch wenn sie erneut greifen würde", async () => {
    const f = attrappe(() => URTEIL);   // auch die Revision urteilt weiter
    const b = await laufe({ ...LEAK, n: 1 }, f, { n: 1, waechter: true });
    const rAnfragen = f.wellen.flat().filter(r => r.custom_id.startsWith("r_"));
    expect(rAnfragen).toHaveLength(1);   // genau eine, kein dritter Versuch
    expect(b.szenarien[0].samples[0].transkript.at(-1).waechterTreffer).toBe("urteil");
  });

  it("Turn 2 trägt die REVIDIERTE Fassung im Kontext, nie die verworfene", async () => {
    const sz = { ...LEAK, n: 1, eingaben: ["Erstens.", "Zweitens."] };
    const f = attrappe(cid => cid.startsWith("r_") ? SAUBER : URTEIL);
    await laufe(sz, f, { n: 1, waechter: true });

    const t2 = f.wellen.flat().find(r => r.custom_id.endsWith("_t1") && r.custom_id.startsWith("p_"));
    const inhalte = JSON.stringify(t2.params.messages);
    expect(inhalte).toContain(SAUBER);
    expect(inhalte).not.toContain("starke Fassung");
  });

  it("Wellen-Reihenfolge: Pipeline-Turn, Revision, Pipeline-Turn, …, Judge", async () => {
    const sz = { ...LEAK, n: 1, eingaben: ["Erstens.", "Zweitens."] };
    const f = attrappe(cid => cid.startsWith("r_") ? SAUBER : URTEIL);
    await laufe(sz, f, { n: 1, waechter: true });

    const art = f.wellen.map(w => w[0].custom_id[0]);
    expect(art).toEqual(["p", "r", "p", "r", "j"]);
  });

  it("scheitert die Revision, wird das Sample UNBEWERTET — nicht still unrevidiert angenommen", async () => {
    const fuehreBatch = async requests => {
      const map = new Map();
      for (const r of requests) {
        if (r.custom_id.startsWith("r_")) map.set(r.custom_id, { fehler: "batch kaputt" });
        else if (r.custom_id.startsWith("j_")) map.set(r.custom_id, { message: urteilNachricht() });
        else map.set(r.custom_id, { message: nachricht(URTEIL) });
      }
      return map;
    };
    const b = await laufe({ ...LEAK, n: 1 }, fuehreBatch, { n: 1, waechter: true });

    const s = b.szenarien[0];
    expect(s.unbewerteteSamples).toBe(1);
    expect(s.status).not.toBe("gruen");
    expect(s.samples[0].judgeFehler).toContain("Waechter-Revision fehlgeschlagen");
  });

  it("leere oder abgeschnittene Erstantwort löst keine Revision aus (S65/S77 geht vor)", async () => {
    const fuehreBatch = async requests => {
      const map = new Map();
      for (const r of requests)
        map.set(r.custom_id, r.custom_id.startsWith("j_")
          ? { message: urteilNachricht() }
          : { message: { content: [{ type: "text", text: URTEIL }], usage: { input_tokens: 1, output_tokens: 1 }, stop_reason: "max_tokens" } });
      return map;
    };
    const b = await laufe({ ...LEAK, n: 1 }, fuehreBatch, { n: 1, waechter: true });
    expect(b.szenarien[0].unbewerteteSamples).toBe(1);
    expect(b.szenarien[0].samples[0].judgeFehler).toContain("abgeschnitten");
    expect(b.szenarien[0].samples[0].judgeFehler).not.toContain("Waechter");
  });

  it("die Revisions-Runde zahlt auf die Pipeline-Telemetrie ein", async () => {
    const ohne = attrappe(() => SAUBER);
    const mit = attrappe(cid => cid.startsWith("r_") ? SAUBER : URTEIL);
    const a = await laufe({ ...LEAK, n: 1 }, ohne, { n: 1, waechter: true });
    const b = await laufe({ ...LEAK, n: 1 }, mit, { n: 1, waechter: true });
    expect(b.telemetrie.pipe.calls).toBe(a.telemetrie.pipe.calls + 1);
  });
});
