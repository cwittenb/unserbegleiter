// ST3 · Schema-Dialekt für native Structured Outputs: anyOf-Geschwister
// aufgelöst, Objekte gehärtet, Zähler entfernt — am echten Turn-Schema.

import { describe, it, expect } from "vitest";
import { anthropicSoDialekt } from "../../core/llm/schema-dialekt.js";
import { baueTurnSchema } from "../../core/contracts/turn-schema.js";
import { soloDef, momentDef } from "../../core/ui/sessions.js";
import { schalteStruktur } from "../../core/prompts/struktur-praeambel.js";

const backend = { pstate: { get: async () => null, set: async () => {} } };

describe("anthropicSoDialekt", () => {
  it("zeit-noContent-Weiche: anyOf mit Struktur-Geschwistern → reines anyOf gemergter Varianten", () => {
    const d = anthropicSoDialekt({
      type: "object",
      properties: { noContent: { type: "boolean" }, summary: { type: "string" } },
      anyOf: [{ required: ["noContent"] }, { required: ["summary"] }],
    });
    expect(d.type).toBeUndefined();
    expect(d.properties).toBeUndefined();
    expect(d.anyOf).toHaveLength(2);
    expect(d.anyOf[0].required).toEqual(["noContent"]);
    expect(d.anyOf[1].required).toEqual(["summary"]);
    for (const v of d.anyOf) {
      expect(v.type).toBe("object");
      expect(v.properties.summary).toEqual({ type: "string" });
      expect(v.additionalProperties).toBe(false);
    }
  });

  it("description bleibt als Annotation am anyOf-Knoten", () => {
    const d = anthropicSoDialekt({ description: "x", type: "string", anyOf: [{ enum: ["a"] }] });
    expect(d.description).toBe("x");
    expect(d.anyOf[0]).toEqual({ type: "string", enum: ["a"] });
  });

  it("Zähl-Constraints entfallen, Type-Arrays/enum/const bleiben", () => {
    const d = anthropicSoDialekt({
      type: "object",
      properties: {
        topics: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 4 },
        wish: { type: ["string", "null"] },
        typ: { const: "zeit" },
        source: { type: "string", enum: ["resonance", "negativeSpace"] },
      },
    });
    expect(JSON.stringify(d)).not.toMatch(/minItems|maxItems/);
    expect(d.properties.wish).toEqual({ type: ["string", "null"] });
    expect(d.properties.typ).toEqual({ const: "zeit" });
    expect(d.properties.source.enum).toEqual(["resonance", "negativeSpace"]);
    expect(d.additionalProperties).toBe(false);
  });

  it("echte Turn-Schemata (solo, moment): dialektfest — kein anyOf mit Struktur-Geschwistern, überall gehärtet", () => {
    for (const bau of [soloDef, momentDef]) {
      const t = baueTurnSchema(schalteStruktur(bau(backend)));
      const d = anthropicSoDialekt(t.schema);
      const pruefe = (k) => {
        if (Array.isArray(k)) return k.forEach(pruefe);
        if (!k || typeof k !== "object") return;
        if (k.anyOf) {
          expect(k.type, "anyOf mit type-Geschwister").toBeUndefined();
          expect(k.properties, "anyOf mit properties-Geschwister").toBeUndefined();
          expect(k.required, "anyOf mit required-Geschwister").toBeUndefined();
        }
        if (k.type === "object" && k.properties) expect(k.additionalProperties).toBe(false);
        Object.values(k).forEach(pruefe);
      };
      pruefe(d);
      expect(JSON.stringify(d)).not.toMatch(/minItems|maxItems/);
    }
  });

  it("deterministisch: zweimal wandeln ist byte-identisch (Grammatik-/Prompt-Cache)", () => {
    const t = baueTurnSchema(schalteStruktur(soloDef(backend)));
    expect(JSON.stringify(anthropicSoDialekt(t.schema))).toBe(JSON.stringify(anthropicSoDialekt(t.schema)));
  });
});
