// Repo — Key-Autorität, Cache-Kohärenz, _schema-Stempel, Grep-Wächter.

import { describe, it, expect } from "vitest";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Repo, SCHEMA_VERSION } from "../../core/store/repo.js";
import { MemoryStore, StoernisStore } from "../../core/store/store.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function frisch(overrides = {}) {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "paar1", activeModuleId: "betrieb", ...overrides });
  return { store, repo };
}

describe("Repo · Key-Format & Stempel", () => {
  it("baut den Modul-Key p:<NS>:<code>:<modul>:<teil>", () => {
    const { repo } = frisch();
    expect(repo.key("bstate")).toBe("p:T:paar1:betrieb:bstate");
    expect(repo.key("x", "kernwetten")).toBe("p:T:paar1:kernwetten:x");
  });

  it("stempelt Objekte mit _schema und module; Nicht-Objekte bleiben unberührt", async () => {
    const { store, repo } = frisch();
    await repo.set("a", { v: 1 }, true);
    expect(await store.get(repo.key("a"), true)).toMatchObject({ v: 1, _schema: SCHEMA_VERSION, module: "betrieb" });
    await repo.set("b", [1, 2], true);
    expect(await store.get(repo.key("b"), true)).toEqual([1, 2]);
  });
});

describe("Repo · Roundtrip & Cache (portierter v0.29-Fall)", () => {
  it("set/get/del-Roundtrip: Cache-Lesen, Frisch-Lesen, nach del nicht mehr lesbar", async () => {
    const { repo } = frisch();
    expect(await repo.set("rt", { v: 1 }, true)).toBe(true);
    const a = await repo.get("rt", true);                    // aus Cache (write-through)
    const b = await repo.get("rt", true, undefined, { fresh: true });
    await repo.del("rt", true);
    const c = await repo.get("rt", true, undefined, { fresh: true });
    expect(a).toMatchObject({ v: 1 });
    expect(b).toMatchObject({ v: 1 });
    expect(c).toBeNull();
  });

  it("write-through: get nach set trifft den Cache, nicht den Store", async () => {
    const { store, repo } = frisch();
    await repo.set("x", { v: 2 }, true);
    const getsVorher = store.ops.get;
    const v = await repo.get("x", true);
    expect(v).toMatchObject({ v: 2 });
    expect(store.ops.get).toBe(getsVorher);   // kein Store-Roundtrip
  });

  it("del invalidiert den Cache sofort (Kohärenz)", async () => {
    const { repo } = frisch();
    await repo.set("y", { v: 3 }, true);
    await repo.del("y", true);
    expect(await repo.get("y", true)).toBeNull();   // auch OHNE fresh
  });

  it("TTL: nach Ablauf wird frisch gelesen (injizierte Uhr)", async () => {
    let t = 1000;
    const { store, repo } = frisch({ now: () => t, cacheMs: 12000 });
    await repo.set("z", { v: 4 }, true);
    t += 11999;
    const getsVorher = store.ops.get;
    await repo.get("z", true);
    expect(store.ops.get).toBe(getsVorher);       // noch im TTL → Cache
    t += 2;
    await repo.get("z", true);
    expect(store.ops.get).toBe(getsVorher + 1);   // TTL abgelaufen → Store
  });

  it("shared und privat sind getrennte Cache- und Speicherwelten", async () => {
    const { repo } = frisch();
    await repo.set("k", { welt: "geteilt" }, true);
    await repo.set("k", { welt: "privat" }, false);
    expect((await repo.get("k", true)).welt).toBe("geteilt");
    expect((await repo.get("k", false)).welt).toBe("privat");
  });
});

describe("Repo · Paar-Wechsel & Fehlerpfad", () => {
  it("setCode leert den Cache vollständig (Invalidierung bei pair-switch)", async () => {
    const { store, repo } = frisch();
    await repo.set("m", { v: 5 }, true);
    repo.setCode("paar2");
    const v = await repo.get("m", true);
    expect(v).toBeNull();                          // anderer Key, kein Alt-Cache
    expect(repo.key("m")).toContain("paar2");
    expect(store.ops.get).toBeGreaterThan(0);
  });

  it("abgelehntes set → false + lastError, Cache bleibt unverfälscht", async () => {
    const store = new StoernisStore({ rejectSetsFrom: 1 });
    const repo = new Repo({ store, ns: "T", code: "c", activeModuleId: "betrieb" });
    expect(await repo.set("a", { v: 1 }, true)).toBe(false);
    expect(repo.lastError).toBe("Speichern abgelehnt");
    expect(await repo.get("a", true)).toBeNull();  // nichts vorgegaukelt
  });

  it("kein Legacy-Fallback mehr: Alt-Key ohne Modul wird NICHT gelesen (Ballast-Register §1.1)", async () => {
    const { store, repo } = frisch();
    await store.set("p:T:paar1:alt", { v: 9 }, true);   // v0.3-Form
    expect(await repo.get("alt", true)).toBeNull();
  });
});

describe("Repo · Grep-Wächter", () => {
  it("Storage-Key-Literale (p:…) existieren in core/ NUR in repo.js", async () => {
    const verstoesse = [];
    async function scan(dir) {
      for (const e of await readdir(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) { await scan(p); continue; }
        if (!e.name.endsWith(".js") || e.name === "repo.js") continue;
        const txt = await readFile(p, "utf8");
        if (/["'`]p:|p:\$\{/.test(txt)) verstoesse.push(path.relative(ROOT, p));
      }
    }
    await scan(path.join(ROOT, "core"));
    expect(verstoesse, "Key-Wissen außerhalb von repo.js").toEqual([]);
  });
});
