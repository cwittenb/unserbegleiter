// R2 · KV-Helfer: die Toleranz ist der Punkt, nicht die Entdopplung.
import { describe, it, expect } from "vitest";
import { leseJson, holePaar, schreibeAudit } from "../../platforms/cloudflare/worker/util.js";

/** Minimaler KV-Doppelgänger. */
function kvMit(daten = {}) {
  const speicher = new Map(Object.entries(daten));
  return {
    speicher,
    async get(k) { return speicher.has(k) ? speicher.get(k) : null; },
    async put(k, v) { speicher.set(k, v); },
  };
}

describe("R2 · leseJson", () => {
  it("liest gültiges JSON", async () => {
    const kv = kvMit({ "a": JSON.stringify({ x: 1 }) });
    expect(await leseJson(kv, "a")).toEqual({ x: 1 });
  });

  it("fehlender Schlüssel → null (statt Wurf)", async () => {
    expect(await leseJson(kvMit(), "weg")).toBeNull();
  });

  it("beschädigter Inhalt → null (statt Wurf)", async () => {
    // Genau der Fall, der eine ganze Admin-Liste mit 500 riss.
    const kv = kvMit({ "kaputt": "{nicht wirklich json" });
    expect(await leseJson(kv, "kaputt")).toBeNull();
  });
});

describe("R2 · holePaar", () => {
  it("findet das Paar unter sys/couple/<code>", async () => {
    const kv = kvMit({ "sys/couple/abc": JSON.stringify({ code: "abc", nameA: "Anna" }) });
    expect((await holePaar(kv, "abc")).nameA).toBe("Anna");
  });

  it("unbekannter Code → null", async () => {
    expect(await holePaar(kvMit(), "nix")).toBeNull();
  });
});

describe("R2 · schreibeAudit", () => {
  it("legt einen Eintrag mit Typ, Nutzdaten und Zeitstempel an", async () => {
    const kv = kvMit();
    await schreibeAudit(kv, () => 1700000000000, "relink", { code: "abc", role: "A" });
    const [schluessel] = [...kv.speicher.keys()];
    expect(schluessel.startsWith("sys/audit/1700000000000-")).toBe(true);
    expect(JSON.parse(kv.speicher.get(schluessel)))
      .toMatchObject({ typ: "relink", code: "abc", role: "A", at: 1700000000000 });
  });

  it("zwei Einträge in derselben Millisekunde kollidieren nicht", async () => {
    const kv = kvMit();
    await schreibeAudit(kv, () => 42, "resend", {});
    await schreibeAudit(kv, () => 42, "resend", {});
    expect(kv.speicher.size).toBe(2);
  });
});
