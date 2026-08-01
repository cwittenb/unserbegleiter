// ST2 · Übersetzungs-Präambel: Inhalt aus Def-Daten, Verdrahtung der Defs
// (solo+moment AN, kernwetten noch AUS), Korpus-Parität DE/EN.

import { describe, it, expect } from "vitest";
import { strukturPraeambel, schalteStruktur } from "../../core/prompts/struktur-praeambel.js";
import { soloDef, momentDef } from "../../core/ui/sessions.js";
import { einzelDef, gemeinsamDef } from "../../core/ui/kernwetten.js";
import * as de from "../../core/prompts/prompts.de.js";
import * as en from "../../core/prompts/prompts.en.js";
import { baueTurnSchema } from "../../core/contracts/turn-schema.js";

const backend = { pstate: { get: async () => null, set: async () => {} } };
const soloCtx = () => ({ me: "Anna", partner: "Bernd", kontext: "" });

describe("Struktur-Präambel (ST2)", () => {
  it("ST2c · solo/moment sind ZURÜCKGENOMMEN — kein Flag, Korpus-Prompt pur", () => {
    for (const bau of [soloDef, momentDef]) {
      const d = bau(backend);
      expect(d.strukturTurn).toBeUndefined();
      expect(d.sysPrompt({ me: "Anna", partner: "Bernd", kontext: "" }).includes(de.strukturTexte.kopf)).toBe(false);
    }
  });

  it("solo: schalteStruktur legt die Präambel VOR den unveränderten Korpus-Prompt", () => {
    const def = schalteStruktur(soloDef(backend));
    expect(def.strukturTurn).toBe(true);
    const sys = def.sysPrompt(soloCtx());
    expect(sys.startsWith(de.strukturTexte.kopf)).toBe(true);
    // Der Korpus-Prompt folgt wortgleich — Stichprobe auf eine gehärtete Regel:
    expect(sys).toContain("TIMELINE-BLOCK");
    // Übersetzungstabelle aus der Def selbst — jeder Block der Session hat eine Zeile:
    for (const b of def.blocks)
      expect(sys).toContain(b.start + ' ⇒ typ "' + b.dataset + '"');
    // solo kennt keine Marken:
    expect(sys).toContain(de.strukturTexte.ohneMarken);
  });

  it("moment: Marken-Liste sind die NACKTEN Namen der markerOrder", () => {
    const def = momentDef(backend);
    const p = strukturPraeambel(def);
    expect(p).toContain("CHOICE-CONNECT, META-REVEALED");
    expect(p).not.toContain("[[CHOICE-CONNECT]]");          // Präambel nennt nackte Namen
  });

  it("kernwetten waren nie AN", () => {
    expect(einzelDef(backend).strukturTurn).toBeUndefined();
    expect(gemeinsamDef(backend).strukturTurn).toBeUndefined();
  });

  it("Präambel und Turn-Schema stammen aus derselben Def — Marken und Blöcke decken sich", () => {
    const def = momentDef(backend);
    const p = strukturPraeambel(def);
    const t = baueTurnSchema(def);
    for (const name of t.schema.properties.marker.anyOf[0].enum) expect(p).toContain(name);
    for (const zweig of t.schema.properties.block.anyOf)
      if (zweig.type === "object") expect(p).toContain('typ "' + zweig.properties.typ.const + '"');
  });

  it("Korpus-Parität: strukturTexte in DE und EN mit identischen Schlüsseln und Platzhaltern", () => {
    expect(Object.keys(en.strukturTexte).sort()).toEqual(Object.keys(de.strukturTexte).sort());
    for (const k of Object.keys(de.strukturTexte)) {
      const ph = t => (t.match(/\{[a-z]+\}/g) || []).sort();
      expect(ph(en.strukturTexte[k]), "Platzhalter-Parität bei " + k).toEqual(ph(de.strukturTexte[k]));
    }
  });

  it("schalteStruktur ist EINE Zeile — Revert stellt den Basis-Prompt her", () => {
    const basis = () => "BASIS";
    const def = schalteStruktur({ sysPrompt: basis, markerOrder: [], blocks: [] });
    expect(def.strukturTurn).toBe(true);
    expect(def.sysPrompt({})).toContain("BASIS");
    expect(def.sysPrompt({}).indexOf("BASIS")).toBeGreaterThan(0);   // Präambel davor
  });
});
