// Token-Stand (S61) — Akkumulation echter usage-Werte (core/llm/usage.js)
// und der Artefakt-Zähl-Wrapper (token-zaehler.js): signaturgleich um den
// Adapter, Best-Effort (Speichern/Melden blockiert nie die Antwort),
// Stand überlebt in der geteilten Welt.

import { describe, it, expect } from "vitest";
import { addiereUsage, leererStand } from "../../core/llm/usage.js";
import {
  mitTokenZaehler, ladeTokenStaende, wipeTokenStaende, formatTokens, tokenKey, TOKEN_PREFIX,
} from "../../platforms/artifact/token-zaehler.js";
import { ArtifactStore } from "../../platforms/artifact/artifact-store.js";

/** Fake für window.storage — gleiche Schnittstelle wie im Artefakt. */
function fakeStorage() {
  const w = { true: new Map(), false: new Map() };
  return {
    async get(k, shared) { const v = w[!!shared].get(k); return v === undefined ? null : { value: v }; },
    async set(k, v, shared) { w[!!shared].set(k, v); return { ok: true }; },
    async delete(k, shared) { w[!!shared].delete(k); },
    async list(prefix, shared) { return { keys: [...w[!!shared].keys()].filter(k => k.startsWith(prefix || "")) }; },
  };
}

describe("Token-Stand · addiereUsage (core/llm/usage.js)", () => {
  it("erster Aufruf: Stand aus null, calls=1, Summen aus usage", () => {
    const s = addiereUsage(null, { in: 7, out: 2, cacheRead: 3, cacheWrite: 1 }, 1000);
    expect(s).toEqual({ calls: 1, in: 7, out: 2, cacheRead: 3, cacheWrite: 1, aktualisiert: 1000 });
  });

  it("akkumuliert immutabel über mehrere Aufrufe", () => {
    const a = addiereUsage(null, { in: 7, out: 2 }, 1);
    const b = addiereUsage(a, { in: 5, out: 4, cacheRead: 10 }, 2);
    expect(b).toEqual({ calls: 2, in: 12, out: 6, cacheRead: 10, cacheWrite: 0, aktualisiert: 2 });
    expect(a.calls).toBe(1);   // Vorgänger unverändert
  });

  it("fehlende/undefinierte usage-Felder zählen als 0 — der Aufruf zählt trotzdem", () => {
    const s = addiereUsage(leererStand(), { in: undefined, out: undefined }, 3);
    expect(s.calls).toBe(1);
    expect(s.in).toBe(0);
    expect(s.out).toBe(0);
    const t = addiereUsage(s, undefined, 4);
    expect(t.calls).toBe(2);
  });
});

describe("Token-Stand · Artefakt-Zähl-Wrapper (S61)", () => {
  const usage = { in: 7, out: 2, cacheRead: 3, cacheWrite: 0 };
  const fakeLlm = async (system, messages, onDelta) => {
    if (onDelta) onDelta("Hallo ");
    return { text: "Hallo Welt", stop: "end_turn", usage };
  };

  it("reicht die Antwort unverändert durch (inkl. onDelta) und akkumuliert im Store", async () => {
    const store = new ArtifactStore(fakeStorage());
    const gemeldet = [];
    const llm = mitTokenZaehler(fakeLlm, { store, code: "dev-mock01", melde: (c, s) => gemeldet.push([c, s]) });

    const deltas = [];
    const a1 = await llm("S", [], d => deltas.push(d));
    expect(a1).toMatchObject({ text: "Hallo Welt", stop: "end_turn", usage });
    expect(deltas).toEqual(["Hallo "]);

    await llm("S", []);
    const stand = await store.get(tokenKey("dev-mock01"), true);
    expect(stand).toMatchObject({ calls: 2, in: 14, out: 4, cacheRead: 6, cacheWrite: 0 });
    expect(gemeldet.length).toBe(2);
    expect(gemeldet[1][0]).toBe("dev-mock01");
    expect(gemeldet[1][1].calls).toBe(2);
  });

  it("Best-Effort: Fehler beim Melden blockiert die Antwort nicht", async () => {
    const store = new ArtifactStore(fakeStorage());
    const llm = mitTokenZaehler(fakeLlm, { store, code: "c1", melde: () => { throw new Error("kaputt"); } });
    const antwort = await llm("S", []);
    expect(antwort.text).toBe("Hallo Welt");
  });

  it("ladeTokenStaende / wipeTokenStaende: Rundlauf über die geteilte Welt", async () => {
    const store = new ArtifactStore(fakeStorage());
    const llm = mitTokenZaehler(fakeLlm, { store, code: "c1" });
    await llm("S", []);
    await store.set(TOKEN_PREFIX + "c2", addiereUsage(null, { in: 1, out: 1 }, 9), true);

    const staende = await ladeTokenStaende(store);
    expect(Object.keys(staende).sort()).toEqual(["c1", "c2"]);
    expect(staende.c1.calls).toBe(1);

    await wipeTokenStaende(store);
    expect(await ladeTokenStaende(store)).toEqual({});
  });

  it("formatTokens: roh unter 1000, dann k/M (de-DE), null → –", () => {
    expect(formatTokens(0)).toBe("0");
    expect(formatTokens(999)).toBe("999");
    expect(formatTokens(12345)).toBe("12,3k");
    expect(formatTokens(1234567)).toBe("1,23M");
    expect(formatTokens(null)).toBe("–");
    expect(formatTokens(undefined)).toBe("–");
  });
});
