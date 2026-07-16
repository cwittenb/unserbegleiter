// Adapter-Fehlerzweige (S66, P2.7a) — die offenen Branch-Ränder der
// S48/S51-Resilienz: Retry-After als HTTP-Date, defensives Fehlerkörper-Lesen,
// onDelta ohne Event-Stream-Antwort (Fallback auf den JSON-Pfad).

import { describe, it, expect, vi } from "vitest";
import { makeAdapter, parseRetryAfter } from "../../core/llm/adapter.js";

const kopf = map => ({ headers: { get: k => (k in map ? map[k] : null) } });

describe("parseRetryAfter · beide RFC-Formen", () => {
  it("Sekunden-Form: Zahl → Sekunden, negativ → 0", () => {
    expect(parseRetryAfter(kopf({ "retry-after": "7" }))).toBe(7);
    expect(parseRetryAfter(kopf({ "retry-after": "-3" }))).toBe(0);
  });

  it("HTTP-Date-Form: Zeitpunkt in der Zukunft → Restsekunden; Vergangenheit → 0", () => {
    const inZehn = new Date(Date.now() + 10000).toUTCString();
    const s = parseRetryAfter(kopf({ "retry-after": inZehn }));
    expect(s).toBeGreaterThan(8);
    expect(s).toBeLessThanOrEqual(10);
    expect(parseRetryAfter(kopf({ "retry-after": new Date(Date.now() - 5000).toUTCString() }))).toBe(0);
  });

  it("fehlender Header, kaputtes Datum, Response ohne headers → null", () => {
    expect(parseRetryAfter(kopf({}))).toBe(null);
    expect(parseRetryAfter(kopf({ "retry-after": "gestern irgendwann" }))).toBe(null);
    expect(parseRetryAfter({})).toBe(null);
    expect(parseRetryAfter(null)).toBe(null);
  });
});

describe("Fehlerkörper · defensives Lesen (429 mit sperrigen Antworten)", () => {
  const basisCfg = { provider: "anthropic", mode: "direct", apiKey: "k", models: { anthropic: "m" },
    versuche: 1, schlaf: async () => {} };

  it("text() wirft, json() liefert → JSON landet in der Fehlermeldung", async () => {
    const fetchFn = vi.fn(async () => ({
      status: 429, headers: { get: () => null },
      text: async () => { throw new Error("stream gone"); },
      json: async () => ({ error: { type: "rate_limit" } }),
    }));
    const call = makeAdapter(basisCfg, fetchFn);
    await expect(call("sys", [{ role: "user", content: "x" }])).rejects.toThrow(/429.*rate_limit/s);
  });

  it("text() UND json() werfen → Fehler trägt nur den Status (kein Absturz beim Lesen)", async () => {
    const fetchFn = vi.fn(async () => ({
      status: 503, headers: { get: () => null },
      text: async () => { throw new Error("weg"); },
      json: async () => { throw new Error("auch weg"); },
    }));
    const call = makeAdapter(basisCfg, fetchFn);
    await expect(call("sys", [{ role: "user", content: "x" }])).rejects.toThrow(/LLM HTTP 503/);
  });

  it("Retry-After als HTTP-Date steuert die Wartezeit des Retrys", async () => {
    const wartezeiten = [];
    let versuch = 0;
    const fetchFn = vi.fn(async () => {
      versuch++;
      if (versuch === 1) return {
        status: 429,
        headers: { get: k => (k === "retry-after" ? new Date(Date.now() + 2000).toUTCString() : null) },
        text: async () => "limit",
      };
      return { status: 200, json: async () => ({ content: [{ type: "text", text: "ok" }], stop_reason: "end_turn" }) };
    });
    const call = makeAdapter({ ...basisCfg, versuche: 2, schlaf: async ms => { wartezeiten.push(ms); } }, fetchFn);
    const r = await call("sys", [{ role: "user", content: "x" }]);
    expect(r.text).toBe("ok");
    expect(wartezeiten).toHaveLength(1);
    expect(wartezeiten[0]).toBeGreaterThan(1000);   // aus dem HTTP-Date abgeleitet, nicht Backoff-Default
    expect(wartezeiten[0]).toBeLessThanOrEqual(2000);
  });
});

describe("Stream-Wunsch ohne Event-Stream-Antwort", () => {
  it("onDelta gesetzt, Server antwortet mit JSON → Fallback auf den Parse-Pfad, Ergebnis vollständig", async () => {
    const fetchFn = vi.fn(async () => ({
      status: 200,
      headers: { get: k => (k === "content-type" ? "application/json" : null) },
      json: async () => ({ content: [{ type: "text", text: "volltext" }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 2 } }),
    }));
    const deltas = [];
    const call = makeAdapter({ provider: "anthropic", mode: "direct", apiKey: "k", models: { anthropic: "m" } }, fetchFn);
    const r = await call("sys", [{ role: "user", content: "x" }], d => deltas.push(d));
    expect(r.text).toBe("volltext");
    expect(deltas).toEqual([]);                      // kein Stream → keine Deltas, aber kein Fehler
  });
});
