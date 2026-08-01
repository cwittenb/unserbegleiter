// ST5.2 · Struktur-Brücke des Eval-Runners. Die zentrale Assertion ist die
// GATE-INVARIANTE: derselbe Korpus-Prompt in beiden Varianten, nur die
// Präambel davor. Ohne sie misst das GATE zwei verschiedene Prompts und nennt
// den Unterschied "Struktur".

import { describe, it, expect } from "vitest";
import { strukturFuer, evalDefFuer, istStrukturfaehig } from "../../evals/struktur-bruecke.js";
import { sysPromptFuer } from "../../evals/runner-kern.js";
import { soloDef } from "../../core/ui/sessions.js";
import { getPrompts } from "../../core/prompts/prompts.js";

const szenario = (session, extra = {}) => ({
  id: "T-01", session, kontext: { me: "Anna", partner: "Bernd", nameA: "Anna", nameB: "Bernd" },
  eingaben: ["hallo"], ...extra,
});

describe("Eval-Struktur-Brücke", () => {
  it("GATE-INVARIANTE: Struktur-System = Präambel + BYTE-IDENTISCHER Eval-Prompt", () => {
    for (const s of [szenario("solo"), szenario("moment"), szenario("solo", { sprache: "en" })]) {
      const st = strukturFuer(s);
      const basis = sysPromptFuer(s);
      expect(st.system.endsWith(basis), s.session + "/" + (s.sprache || "de")).toBe(true);
      const kopf = getPrompts(st.sprache).strukturTexte.kopf;
      expect(st.system.startsWith(kopf)).toBe(true);
    }
  });

  it("zusatzKontext des Szenarios bleibt im Struktur-Prompt erhalten", () => {
    const s = szenario("solo", { zusatzKontext: "MERKPOSTEN: Schwester" });
    expect(strukturFuer(s).system).toContain("MERKPOSTEN: Schwester");
  });

  it("Schema trägt die Blöcke der ECHTEN Def (kein Eval-Nachbau)", () => {
    const st = strukturFuer(szenario("solo"));
    const ausSchema = st.schema.schema.properties.block.anyOf
      .filter(z => z.properties && z.properties.typ)
      .map(z => z.properties.typ.const || (z.properties.typ.enum || [])[0]);
    const ausDef = soloDef({ pstate: { get: async () => null, set: async () => {} } })
      .blocks.map(b => b.dataset);
    expect(ausSchema.sort()).toEqual(ausDef.sort());
  });

  it("nur solo/moment sind strukturfähig — Kernwetten und QZ bleiben Textpfad (bis ST6)", () => {
    expect(istStrukturfaehig(szenario("solo"))).toBe(true);
    expect(istStrukturfaehig(szenario("moment"))).toBe(true);
    for (const nicht of ["einzel", "gemeinsam", "qualitytime"]) {
      expect(istStrukturfaehig(szenario(nicht))).toBe(false);
      expect(strukturFuer(szenario(nicht))).toBeNull();
      expect(evalDefFuer(szenario(nicht))).toBeNull();
    }
  });

  it("Def der Brücke trägt das Struktur-Flag und die Marken-Ordnung der App", () => {
    const def = evalDefFuer(szenario("moment"));
    expect(def.strukturTurn).toBe(true);
    expect(Array.isArray(def.markerOrder)).toBe(true);
  });
});

describe("Präambel-Sprache im gemischten Lauf (ST5.2)", () => {
  it("EN-Szenario bekommt die ENGLISCHE Präambel vor den englischen Korpus", () => {
    const s = { id: "T", session: "solo", sprache: "en", kontext: { me: "Anna", partner: "Bernd" }, eingaben: ["x"] };
    const st = strukturFuer(s);
    expect(st.system.startsWith(getPrompts("en").strukturTexte.kopf)).toBe(true);
    expect(st.system.startsWith(getPrompts("de").strukturTexte.kopf)).toBe(false);
  });

  it("DE-Szenario bleibt deutsch, unabhängig vom zuletzt gebauten Szenario", () => {
    strukturFuer({ id: "A", session: "solo", sprache: "en", kontext: {}, eingaben: ["x"] });
    const st = strukturFuer({ id: "B", session: "solo", kontext: {}, eingaben: ["x"] });
    expect(st.system.startsWith(getPrompts("de").strukturTexte.kopf)).toBe(true);
  });
});
