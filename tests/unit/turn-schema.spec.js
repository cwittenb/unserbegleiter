// ST1.1 · Turn-Schema-Generator: Form, Kanarienvogel, stabile Serialisierung.

import { describe, it, expect } from "vitest";
import { baueTurnSchema, markerName, markerVoll, TURN_TOOL_NAME } from "../../core/contracts/turn-schema.js";
import { BLOECKE } from "../../core/contracts/registry.js";
import { soloDef, momentDef } from "../../core/ui/sessions.js";
import { einzelDef, gemeinsamDef } from "../../core/ui/kernwetten.js";

const backend = { pstate: { get: async () => null, set: async () => {} } };

describe("Turn-Schema", () => {
  it("Marker-Namen: [[X]] ↔ X", () => {
    expect(markerName("[[SCALE-SAFETY]]")).toBe("SCALE-SAFETY");
    expect(markerVoll("SCALE-SAFETY")).toBe("[[SCALE-SAFETY]]");
  });

  it("solo (ohne Marken): kein marker-Feld, block-Union über die Session-Blöcke", () => {
    const t = baueTurnSchema(soloDef(backend));
    expect(t.name).toBe(TURN_TOOL_NAME);
    expect(t.schema.properties.marker).toBeUndefined();
    expect(t.schema.required).toEqual(["antwort", "block"]);
    const typen = t.schema.properties.block.anyOf
      .filter(z => z.type === "object").map(z => z.properties.typ.const);
    expect(typen).toContain("abruf");
    expect(typen).toContain("zeit");
    expect(typen).toContain("gateart");
    expect(typen).toContain("note");
    expect(typen).toContain("ausschnitt");
    // null ist der letzte Zweig — Block ist die Ausnahme, nicht die Regel
    expect(t.schema.properties.block.anyOf.at(-1)).toEqual({ type: "null" });
  });

  it("moment: marker-Enum sind NACKTE Namen aus der markerOrder", () => {
    const t = baueTurnSchema(momentDef(backend));
    const en = t.schema.properties.marker.anyOf[0].enum;
    expect(en).toEqual(["CHOICE-CONNECT", "META-REVEALED"]);
    expect(t.schema.required).toEqual(["antwort", "marker", "block"]);
  });

  it("alle vier Session-Definitionen liefern ein Schema (Kanarienvogel-Lauf)", () => {
    for (const def of [soloDef(backend), momentDef(backend), einzelDef(backend), gemeinsamDef(backend)])
      expect(() => baueTurnSchema(def)).not.toThrow();
  });

  it("Block ohne JSON-Pendant → Wurf (halbe Registrierung fällt im Test auf)", () => {
    const def = { markerOrder: [], blocks: [{ ...BLOECKE.note, dataset: "gibt-es-nicht" }] };
    expect(() => baueTurnSchema(def)).toThrow(/gibt-es-nicht/);
  });

  it("stabile Serialisierung: zweimal stringify ist byte-identisch, Schema eingefroren", () => {
    const def = momentDef(backend);
    const t = baueTurnSchema(def);
    expect(JSON.stringify(t)).toBe(JSON.stringify(baueTurnSchema(def)));
    expect(Object.isFrozen(t)).toBe(true);
    expect(Object.isFrozen(t.schema.properties.antwort)).toBe(true);
    expect(() => { t.schema.properties.antwort.type = "number"; }).toThrow();
  });
});
