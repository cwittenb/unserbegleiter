// KVStore gegen echtes Miniflare-KV — und der Beweis, dass die komplette
// Kern-Schicht (Repo + Bstate) unverändert über KV läuft ("ein Kern, zwei Häuser").

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Miniflare } from "miniflare";
import { KVStore } from "../../platforms/cloudflare/worker/kv-store.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";

let mf, kv;

beforeAll(async () => {
  mf = new Miniflare({
    modules: true,
    script: "export default { fetch(){ return new Response('ok') } }",
    kvNamespaces: ["PAARE"],
  });
  kv = await mf.getKVNamespace("PAARE");
});

afterAll(async () => { if (mf) await mf.dispose(); });

describe("KVStore · Vertrag gegen echtes KV", () => {
  it("Roundtrip, Namensraum-Trennung, del, list", async () => {
    const s = new KVStore(kv);
    await s.set("k1", { v: 1 }, true);
    await s.set("k1", { v: 2 }, false);
    expect(await s.get("k1", true)).toEqual({ v: 1 });
    expect(await s.get("k1", false)).toEqual({ v: 2 });
    await s.set("k2", 7, true);
    expect((await s.list("k", true)).sort()).toEqual(["k1", "k2"]);
    await s.del("k1", true);
    expect(await s.get("k1", true)).toBeNull();
    expect(await s.get("gibtsnicht", true)).toBeNull();
  });
});

describe("Kern über KV · Repo + Bstate/Pstate unverändert", () => {
  it("Bstate-Feld-Roundtrip mit Nachbarfeld-Erhalt über echtem KV", async () => {
    const repo = new Repo({ store: new KVStore(kv), ns: "T", code: "kvpaar", activeModuleId: "betrieb" });
    const b = new Bstate(repo);
    await b.set("regal", { items: [{ id: "R1", text: "aus KV" }] });
    await b.set("agenda", { items: [{ id: "A1" }] });
    expect((await b.get("regal")).items[0].text).toBe("aus KV");
    expect((await b.get("agenda")).items).toHaveLength(1);
  });

  it("Pstate-Rollen-Trennung über echtem KV", async () => {
    const repo = new Repo({ store: new KVStore(kv), ns: "T", code: "kvpaar", activeModuleId: "betrieb" });
    const p = new Pstate(repo);
    await p.set("A", "zeitleiste", { eintraege: [{ at: "kv" }] });
    expect((await p.get("A", "zeitleiste")).eintraege).toHaveLength(1);
    expect((await p.get("B", "zeitleiste")).eintraege).toHaveLength(0);
  });
});
