// Runner-Kern-Erweiterungen S66: Kontext-Injektion (zusatzKontext) und
// n-Politik nach Lauf-Ziel (wendeZielAn) — beide rein und deterministisch.

import { describe, it, expect } from "vitest";
import { sysPromptFuer, wendeZielAn } from "../../evals/runner-kern.js";
import { SZENARIEN } from "../../evals/szenarien/start-katalog.js";
import { SZENARIEN_EN } from "../../evals/szenarien/start-katalog.en.js";

describe("sysPromptFuer · zusatzKontext-Injektion", () => {
  it("Szenarien MIT zusatzKontext tragen ihn am Ende des System-Prompts (wie App-seitige Injektion)", () => {
    for (const s of [...SZENARIEN, ...SZENARIEN_EN].filter(x => x.zusatzKontext)) {
      const p = sysPromptFuer(s);
      expect(p.endsWith("\n\n" + s.zusatzKontext), s.id).toBe(true);
    }
    // Konkrete Anker: MERK-01 (Merkposten) und QZ-02 (RESTING-Stand) nutzen den Mechanismus.
    expect(sysPromptFuer(SZENARIEN.find(s => s.id === "MERK-01"))).toContain("Urlaubsplanung");
    expect(sysPromptFuer(SZENARIEN.find(s => s.id === "QZ-02"))).toContain("RESTING: Finanzen");
  });

  it("Szenarien OHNE zusatzKontext bleiben byte-identisch zum reinen Session-Prompt", () => {
    const esk = SZENARIEN.find(s => s.id === "ESK-07");
    const { zusatzKontext, ...ohne } = { ...esk };
    expect(sysPromptFuer(esk)).toBe(sysPromptFuer(ohne));
    expect(sysPromptFuer(esk)).not.toContain("Urlaubsplanung");   // MERK-01-Injektion bleibt szenariolokal
  });
});

describe("wendeZielAn · n-Politik nach Lauf-Ziel (Review 2)", () => {
  it("release: Rote-Linien-Szenarien steigen auf n≥5, alle anderen bleiben unverändert", () => {
    const nach = wendeZielAn(SZENARIEN, "release");
    for (const s of nach) {
      const rot = s.checks.some(c => c.roteLinie);
      const vorher = SZENARIEN.find(v => v.id === s.id);
      if (rot) expect(s.n, s.id).toBeGreaterThanOrEqual(5);
      else expect(s.n, s.id).toBe(vorher.n);
    }
    // Eingaben/Checks bleiben unangetastet (nur n bewegt sich).
    const kris = nach.find(s => s.id === "KRIS-01");
    expect(kris.eingaben).toEqual(SZENARIEN.find(s => s.id === "KRIS-01").eingaben);
  });

  it("dev (und alles außer release): identische Referenzen, nichts kopiert, nichts verändert", () => {
    expect(wendeZielAn(SZENARIEN, "dev")).toBe(SZENARIEN);
    expect(wendeZielAn(SZENARIEN, undefined)).toBe(SZENARIEN);
  });

  it("bereits höheres n wird nie gesenkt", () => {
    const hoch = [{ id: "X", n: 7, checks: [{ id: "C1", roteLinie: true }] }];
    expect(wendeZielAn(hoch, "release")[0].n).toBe(7);
  });
});
