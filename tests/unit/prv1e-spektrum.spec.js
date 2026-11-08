// PRV-1e · Spektrum statt Einzelbeispiel. 1c: ein Ich-Beispiel → 15/15 gleiche
// Eröffnung. 1d: kein Beispiel → Prädikatsurteile zurück. 1e: mehrere deutlich
// verschiedene Ich-Anfänge in der URTEILS-GRAMMATIK, mit dem Auftrag, jedes
// Mal einen eigenen zu finden. Dieser Test hält das Spektrum fest.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const lies = sp => readFileSync(`core/korpus/${sp}/bausteine/grundsaetze/URTEILS_GRAMMATIK.md`, "utf8")
  .replace(/<!--[\s\S]*?-->/g, "");
const anfaenge = (text, re) => [...text.matchAll(re)].map(m => m[1].split(/\s+/).slice(0, 2).join(" "));

describe("PRV-1e · Ich-Spektrum in der URTEILS-GRAMMATIK", () => {
  it("DE: mindestens vier Ich-Beispiele mit verschiedenen Anfängen + Auftrag zur eigenen Wendung", () => {
    const t = lies("de");
    const a = anfaenge(t, /„((?:Ich|Mich) [^“]+)“/g);
    expect(new Set(a).size).toBeGreaterThanOrEqual(4);
    expect(t).toMatch(/such dir jedes Mal einen eigenen/);
  });
  it("EN: dasselbe", () => {
    const t = lies("en");
    const a = anfaenge(t, /"((?:I|I'm|It moves) [^"]+)"/g);
    expect(new Set(a).size).toBeGreaterThanOrEqual(4);
    expect(t).toMatch(/find your own each time/);
  });
});
