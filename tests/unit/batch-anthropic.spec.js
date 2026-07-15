// Batch-Client (S57): erstellt Batch, pollt bis "ended", liest Ergebnisse als JSONL,
// ordnet über custom_id zu. Gegen Mock-fetch (das reale Round-Trip prüft Cars10).

import { describe, it, expect } from "vitest";
import { fuehreBatchAus } from "../../evals/batch-anthropic.js";

const nachricht = text => ({ content: [{ type: "text", text }], usage: { input_tokens: 10, output_tokens: 5 }, stop_reason: "end_turn" });

/** Mock-fetch, das die Batch-API abspielt: POST create → N Polls → JSONL-Ergebnisse. */
function mockFetch({ pollsBisEnded = 1, ergebnisse }) {
  let polls = 0;
  const calls = [];
  const fn = async (url, init) => {
    const method = (init && init.method) || "GET";
    calls.push({ url, method, body: init && init.body ? JSON.parse(init.body) : null });
    if (method === "POST")
      return { ok: true, status: 200, json: async () => ({ id: "msgbatch_1", processing_status: "in_progress", request_counts: { processing: ergebnisse.length } }) };
    if (url.endsWith("/results"))
      return { ok: true, status: 200, text: async () => ergebnisse.map(e => JSON.stringify(e)).join("\n") + "\n" };
    polls++;
    const ended = polls >= pollsBisEnded;
    return { ok: true, status: 200, json: async () => ({
      id: "msgbatch_1",
      processing_status: ended ? "ended" : "in_progress",
      request_counts: { processing: ended ? 0 : ergebnisse.length, succeeded: ended ? ergebnisse.length : 0 },
      results_url: "https://api.anthropic.com/v1/messages/batches/msgbatch_1/results",
    }) };
  };
  fn.calls = calls;
  return fn;
}

describe("Batch-Client (Anthropic)", () => {
  it("erstellt, pollt bis ended, liefert custom_id → message / fehler", async () => {
    const ergebnisse = [
      { custom_id: "a", result: { type: "succeeded", message: nachricht("Antwort A") } },
      { custom_id: "b", result: { type: "errored", error: { message: "kaputt" } } },
    ];
    const f = mockFetch({ pollsBisEnded: 2, ergebnisse });
    const map = await fuehreBatchAus(
      [{ custom_id: "a", params: {} }, { custom_id: "b", params: {} }],
      { apiKey: "k", fetchFn: f, intervallMs: 1, schlaf: async () => {} },
    );
    expect(map.get("a").message.content[0].text).toBe("Antwort A");
    expect(map.get("b").fehler).toContain("errored");
    expect(f.calls[0].method).toBe("POST");
    expect(f.calls[0].body.requests).toHaveLength(2);
    expect(f.calls.some(c => c.url.endsWith("/results"))).toBe(true);
  });

  it("Timeout, wenn der Batch nie 'ended' erreicht (deterministische Uhr)", async () => {
    const f = mockFetch({ pollsBisEnded: 9999, ergebnisse: [] });
    let t = 0;
    await expect(fuehreBatchAus(
      [{ custom_id: "a", params: {} }],
      { apiKey: "k", fetchFn: f, intervallMs: 10, maxMs: 5, jetzt: () => t, schlaf: async ms => { t += ms; } },
    )).rejects.toThrow(/Timeout/);
  });

  it("leere Request-Liste → leere Map, kein Netzaufruf", async () => {
    let gerufen = false;
    const f = async () => { gerufen = true; return {}; };
    const map = await fuehreBatchAus([], { apiKey: "k", fetchFn: f });
    expect(map.size).toBe(0);
    expect(gerufen).toBe(false);
  });

  it("HTTP-Fehler beim Erstellen wirft klar", async () => {
    const f = async () => ({ ok: false, status: 500, text: async () => "boom" });
    await expect(fuehreBatchAus([{ custom_id: "a", params: {} }], { apiKey: "k", fetchFn: f }))
      .rejects.toThrow(/Batch-Erstellung fehlgeschlagen/);
  });
});
