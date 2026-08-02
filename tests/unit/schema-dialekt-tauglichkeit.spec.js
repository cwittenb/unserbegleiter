// ST6e · Kanarienvogel: Jedes Turn-Schema, das in den Strukturmodus geht, muss
// von Anthropics Grammatik-Compiler übersetzbar sein.
//
// ANLASS (GATE-Lauf vom 2026-08-01): Alle fünf moment-Szenarien scheiterten mit
// "errored" — 15 Samples ohne einen einzigen Zug, entdeckt erst bei der Bergung.
// Ursache: Im auftrag-Block steht changes[].baseline als NACKTES {type:"object"}
// (semantisch ein Wörterbuch {Name:number}). Ein Objekt ohne properties ist für
// den Compiler nicht übersetzbar; solo enthält diesen Block nicht und lief
// deshalb durch.
//
// Dieser Test hätte den Fehler vor dem Lauf gefunden — er kostet nichts und
// prüft, was sonst erst eine API-400 zeigt.

import { describe, it, expect } from "vitest";
import { anthropicSoDialekt } from "../../core/llm/schema-dialekt.js";
import { baueTurnSchema } from "../../core/contracts/turn-schema.js";
import { soloDef, momentDef } from "../../core/ui/sessions.js";
import { einzelDef, gemeinsamDef } from "../../core/ui/kernwetten.js";
import { schalteStruktur } from "../../core/prompts/struktur-praeambel.js";

const backend = {
  info: () => ({}), pstate: { get: async () => null, set: async () => {} },
  bstate: { get: async () => null, set: async () => {} },
  chat: { load: async () => null, save: async () => {} },
  handover: { get: async () => null, post: async () => {} },
};

/** Sammelt alle Verstöße gegen das übersetzbare Subset. */
function befunde(knoten, pfad = "", raus = []) {
  if (Array.isArray(knoten)) { knoten.forEach((k, i) => befunde(k, pfad + "[" + i + "]", raus)); return raus; }
  if (!knoten || typeof knoten !== "object") return raus;

  if (knoten.type === "object" && !knoten.properties)
    raus.push(pfad + ": object OHNE properties (freies Wörterbuch ist nicht übersetzbar)");
  if (knoten.type === "object" && knoten.properties && !("additionalProperties" in knoten))
    raus.push(pfad + ": object ohne additionalProperties:false");
  if (knoten.anyOf && knoten.anyOf.some(z => !z.type && !z.anyOf && !z.enum && !z.const))
    raus.push(pfad + ": anyOf-Zweig ohne eigenen Typ");
  if (knoten.anyOf && ["type", "properties", "required"].some(k => k in knoten))
    raus.push(pfad + ": anyOf mit Struktur-Geschwistern");
  for (const zaehler of ["minItems", "maxItems", "minimum", "maximum", "minLength", "maxLength"])
    if (zaehler in knoten) raus.push(pfad + ": " + zaehler + " wird nicht unterstützt");

  for (const [k, v] of Object.entries(knoten)) befunde(v, pfad + "/" + k, raus);
  return raus;
}

describe("Turn-Schemata sind für output_config übersetzbar", () => {
  // solo und moment laufen im Strukturmodus (ST4); einzel/gemeinsam folgen später.
  it.each([["solo", soloDef], ["moment", momentDef]])("%s", (_name, bau) => {
    const schema = baueTurnSchema(schalteStruktur(bau(backend))).schema;
    expect(befunde(anthropicSoDialekt(schema))).toEqual([]);
  });

  // Kernwetten sind noch NICHT umgestellt (ST6+). Der Test hält fest, ob ihre
  // Schemata die Übersetzung überstehen würden — Befunde werden berichtet, nicht
  // erzwungen, ein WURF des Dialekts (Pflichtfeld als freies Objekt) aber schon:
  // damit die Migration nicht in dieselbe Falle läuft wie moment.
  it.each([["einzel", einzelDef], ["gemeinsam", gemeinsamDef]])("%s (Vorabprüfung für die Migration)", (_name, bau) => {
    let schema;
    try { schema = baueTurnSchema(schalteStruktur(bau(backend))).schema; }
    catch (e) { console.info("  Turn-Schema noch nicht baubar: " + e.message.slice(0, 120)); return; }
    const f = befunde(anthropicSoDialekt(schema));
    if (f.length) console.info("  offen vor der Migration:\n   - " + f.join("\n   - "));
    expect(Array.isArray(f)).toBe(true);
  });

  it("freies Objekt als PFLICHTFELD wirft — kein stiller Vertragsbruch", () => {
    expect(() => anthropicSoDialekt({
      type: "object", properties: { baseline: { type: "object" } }, required: ["baseline"],
    })).toThrow(/nicht übersetzbar/);
  });

  it("freies Objekt als OPTIONALES Feld entfällt — der JS-Validator bleibt Wahrheit", () => {
    const d = anthropicSoDialekt({
      type: "object", properties: { text: { type: "string" }, baseline: { type: "object" } }, required: ["text"],
    });
    expect(d.properties.baseline).toBeUndefined();
    expect(d.properties.text).toEqual({ type: "string" });
  });

  it("der Wächter selbst greift — ein nacktes object IM ARRAY-ITEM wird erkannt", () => {
    // Solche Stellen kann der Dialekt nicht per Pflichtigkeit auflösen; der
    // Wächter muss sie melden, damit das JSON-Pendant konkretisiert wird.
    const kaputt = { type: "array", items: { type: "object" } };
    expect(befunde(kaputt).join()).toMatch(/OHNE properties/);
  });
});
