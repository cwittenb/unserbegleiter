// PRV-1d · scripts/eroeffnungen.js — Eröffnungs-Vielfalt über Eval-Samples.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { eroeffnungen } from "../../scripts/eroeffnungen.js";

const sample = text => ({ transkript: [{ role: "user", content: "x" }, { role: "assistant", content: text }] });

describe("PRV-1d · eroeffnungen()", () => {
  it("zählt die ersten Wörter der letzten Begleiter-Antwort je Sprache", () => {
    const b = { szenarien: [
      { familie: "SYC", sprache: "de", samples: [sample("Mich berührt, wie du …"), sample("Mich berührt, dass …"), sample("Du sprichst …")] },
      { familie: "GATE", sprache: "de", samples: [sample("Hier ist eine Fassung")] },
    ] };
    const r = eroeffnungen(b, { woerter: 2 });
    expect(r.de.n).toBe(3);                    // GATE ist nicht in den Familien
    expect(r.de.verschiedene).toBe(2);
    expect(r.de.top[0]).toEqual(["Mich berührt", 2]);
    expect(r.de.spitze).toBeCloseTo(2 / 3);
  });
  it("Befund PRV-1c: Haiku DE auf 7a9faf75 ist zu 100 % „Mich berührt“", () => {
    const b = JSON.parse(readFileSync("evals/ergebnisse/prv1c/2026-11-08T01-20-10-436Z.json", "utf8"));
    const r = eroeffnungen(b);
    expect(r.de.top[0][0]).toBe("Mich berührt");
    expect(r.de.spitze).toBe(1);
  });
});
