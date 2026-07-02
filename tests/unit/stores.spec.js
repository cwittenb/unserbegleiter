// Store-Implementierungen — gleicher Vertrag, drei Träger.
// ArtifactStore läuft hier gegen einen werkgetreuen window.storage-Fake
// (wirft bei fehlendem Key, liefert {value}-Hüllen). KVStore läuft in
// tests/worker/kv-store.spec.js gegen echtes Miniflare-KV.

import { describe, it, expect } from "vitest";
import { ArtifactStore } from "../../platforms/artifact/artifact-store.js";
import { MemoryStore } from "../../core/store/store.js";

/** Werkgetreuer Fake der Artefakt-Sandbox-API (inkl. Wurf bei fehlendem Key). */
function fakeWindowStorage() {
  const m = { true: new Map(), false: new Map() };
  return {
    async get(k, shared) {
      const v = m[!!shared].get(k);
      if (v === undefined) throw new Error("Key not found: " + k);
      return { key: k, value: v, shared: !!shared };
    },
    async set(k, v, shared) { m[!!shared].set(k, v); return { key: k, value: v, shared: !!shared }; },
    async delete(k, shared) { m[!!shared].delete(k); return { key: k, deleted: true }; },
    async list(prefix, shared) {
      return { keys: [...m[!!shared].keys()].filter(x => x.startsWith(prefix || "")) };
    },
  };
}

/** Vertrags-Suite, die jede Store-Implementierung bestehen muss. */
function storeVertrag(name, machStore) {
  describe("Store-Vertrag · " + name, () => {
    it("get auf fehlenden Key → null (kein Wurf)", async () => {
      const s = machStore();
      expect(await s.get("gibtsnicht", true)).toBeNull();
    });
    it("set/get-Roundtrip mit Objekt-Erhalt, shared und privat getrennt", async () => {
      const s = machStore();
      await s.set("k", { tief: { zahl: 7, liste: [1, 2] } }, true);
      await s.set("k", { welt: "privat" }, false);
      expect(await s.get("k", true)).toEqual({ tief: { zahl: 7, liste: [1, 2] } });
      expect(await s.get("k", false)).toEqual({ welt: "privat" });
    });
    it("del ist idempotent, danach null", async () => {
      const s = machStore();
      await s.set("k", { v: 1 }, true);
      await s.del("k", true);
      await s.del("k", true);
      expect(await s.get("k", true)).toBeNull();
    });
    it("list filtert per Präfix und Namensraum", async () => {
      const s = machStore();
      await s.set("a:1", 1, true);
      await s.set("a:2", 2, true);
      await s.set("b:1", 3, true);
      await s.set("a:9", 4, false);
      expect((await s.list("a:", true)).sort()).toEqual(["a:1", "a:2"]);
    });
  });
}

storeVertrag("MemoryStore", () => new MemoryStore());
storeVertrag("ArtifactStore (Fake-Sandbox)", () => new ArtifactStore(fakeWindowStorage()));

describe("ArtifactStore · Fehlertoleranz", () => {
  it("kaputter Träger → get null, set false, del/list still", async () => {
    const kaputt = {
      async get() { throw new Error("iframe weg"); },
      async set() { throw new Error("iframe weg"); },
      async delete() { throw new Error("iframe weg"); },
      async list() { throw new Error("iframe weg"); },
    };
    const s = new ArtifactStore(kaputt);
    expect(await s.get("k", true)).toBeNull();
    expect(await s.set("k", 1, true)).toBe(false);
    await s.del("k", true);
    expect(await s.list("", true)).toEqual([]);
  });
});
