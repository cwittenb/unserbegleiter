// Preistabelle (S55): Kosten aus ECHTEN usage-Token (Messung, keine Schätzung).
// Unbekanntes Modell → null, damit Token trotzdem ausgewiesen werden können.

import { describe, it, expect } from "vitest";
import { kostenFuer, cacheQuote } from "../../evals/preise.js";

describe("Preise · kostenFuer / cacheQuote", () => {
  it("bekanntes Modell → Kosten aus Token (in/out/cacheRead)", () => {
    expect(kostenFuer("claude-opus-4-8", { in: 1e6, out: 0 })).toBeCloseTo(5, 6);      // 5 / 1M in
    expect(kostenFuer("claude-opus-4-8", { in: 0, out: 1e6 })).toBeCloseTo(25, 6);     // 25 / 1M out
    expect(kostenFuer("claude-opus-4-8", { cacheRead: 1e6 })).toBeCloseTo(0.5, 6);     // 0.50 / 1M cache-read
  });

  it("Mistral-Modell wird bepreist (in + out)", () => {
    expect(kostenFuer("mistral-medium-latest", { in: 1e6, out: 1e6 })).toBeCloseTo(0.40 + 2.00, 6);
  });

  it("unbekanntes Modell → null (Token bleiben ausweisbar)", () => {
    expect(kostenFuer("gibtsnicht-1", { in: 1e6 })).toBeNull();
  });

  it("cacheQuote = cacheRead / (in + cacheRead + cacheWrite); keine Division durch 0", () => {
    expect(cacheQuote({ in: 100, cacheRead: 300, cacheWrite: 0 })).toBeCloseTo(0.75, 6);
    expect(cacheQuote({ in: 0, cacheRead: 0, cacheWrite: 0 })).toBe(0);
  });
});
