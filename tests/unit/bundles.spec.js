// Bstate & Pstate — Bündel-Semantik über dem Repo.

import { describe, it, expect } from "vitest";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";

function welt() {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "paar1", activeModuleId: "betrieb" });
  return { store, repo, b: new Bstate(repo), p: new Pstate(repo) };
}

describe("Bstate · Lesen schreibt nie", () => {
  it("load() auf leerem Speicher liefert Defaults OHNE zu persistieren (v0.29-Prinzip)", async () => {
    const { store, b } = welt();
    const bundle = await b.load();
    expect(bundle.regal).toEqual({ items: [] });
    expect(bundle.qz).toEqual({ ruht: {}, wahl: [] });
    expect(store.ops.set).toBe(0);                        // KEIN Migrations-/Default-Write
    expect(await store.list("", true)).toEqual([]);
  });

  it("get() eines Feldes schreibt ebenfalls nichts", async () => {
    const { store, b } = welt();
    expect(await b.get("auftraege")).toBeNull();
    expect(store.ops.set).toBe(0);
  });
});

describe("Bstate · Feld-Roundtrip (portierter v0.29-Fall)", () => {
  it("set eines Feldes verliert keine Nachbarfelder", async () => {
    const { b } = welt();
    await b.set("regal", { items: [{ id: "R1" }] });
    const vorher = await b.get("regal");
    await b.set("agenda", { items: [{ id: "A1" }] });
    expect(await b.get("agenda")).toEqual({ items: [{ id: "A1" }] });
    expect(await b.get("regal")).toEqual(vorher);         // Nachbar unverändert
  });

  it("unbekannte Felder im gespeicherten Bündel überleben ein set (vorwärtskompatibel)", async () => {
    const { store, repo, b } = welt();
    await store.set(repo.key("bstate"), { regal: { items: [] }, zukunftsfeld: { x: 1 } }, true);
    await b.set("agenda", { items: [] });
    const roh = await store.get(repo.key("bstate"), true);
    expect(roh.zukunftsfeld).toEqual({ x: 1 });
  });

  it("Defaults füllen fehlende Felder eines Alt-Bündels still auf (ohne Write)", async () => {
    const { store, repo, b } = welt();
    await store.set(repo.key("bstate"), { regal: { items: [{ id: "R1" }] } }, true);
    const setsVorher = store.ops.set;
    expect(await b.get("qz")).toEqual({ ruht: {}, wahl: [] });
    expect(await b.get("regal")).toEqual({ items: [{ id: "R1" }] });
    expect(store.ops.set).toBe(setsVorher);
  });
});

describe("Bstate · Single-Flight (portierter v0.29-Fall)", () => {
  it("parallele Loads teilen EINEN Store-Zugriff und liefern dasselbe Objekt", async () => {
    const { store, repo, b } = welt();
    await b.set("regal", { items: [] });                  // Bündel existiert
    repo.clearCache();                                    // Cache aus dem Spiel nehmen
    const getsVorher = store.ops.get;
    const [x, y, z, w] = await Promise.all([b.load(), b.load(), b.load(), b.load()]);
    expect(store.ops.get - getsVorher).toBe(1);           // ein Flug
    expect(x).toBe(y); expect(y).toBe(z); expect(z).toBe(w);
    expect(store.ops.set).toBe(1);                        // keine Schreib-Stürme
  });
});

describe("Pstate · Single-Writer je Rolle", () => {
  it("Roundtrip je Rolle, Rollen sauber getrennt (portierter v0.29-Fall)", async () => {
    const { p } = welt();
    await p.set("A", "zeitleiste", { eintraege: [{ at: "x" }] });
    expect((await p.get("A", "zeitleiste")).eintraege).toHaveLength(1);
    expect((await p.get("B", "zeitleiste")).eintraege).toHaveLength(0);   // B unberührt
  });

  it("Pstate liegt im PRIVATEN Namensraum (Geheimnis-Architektur, Schicht Speicher)", async () => {
    const { store, p } = welt();
    await p.set("A", "generalproben", { items: [{ id: "G1" }] });
    expect(await store.list("", true)).toEqual([]);       // nichts im geteilten Raum
    expect((await store.list("", false)).some(k => k.includes("pstate:A"))).toBe(true);
  });

  it("Lesen schreibt nie + Defaults", async () => {
    const { store, p } = welt();
    expect(await p.get("A", "zeitleiste")).toEqual({ eintraege: [] });
    expect(store.ops.set).toBe(0);
  });

  it("parallele Loads derselben Rolle teilen einen Flug; verschiedene Rollen fliegen getrennt", async () => {
    const { store, p } = welt();
    const getsVorher = store.ops.get;
    await Promise.all([p.load("A"), p.load("A"), p.load("B")]);
    expect(store.ops.get - getsVorher).toBe(2);           // A einmal, B einmal
  });
});
