// ST8 · Der Strukturmodus RUHT — und das soll auffallen, wenn jemand ihn
// unbeabsichtigt wieder einschaltet.
//
// Entscheidung vom 2. August 2026 nach dem GATE-Lauf (A/B, 27 DE-Paare):
//   · RCL-02b traf im Strukturpfad eine ROTE LINIE — 4/8 gegen 0/5 im Textpfad.
//   · Ursache gemessen: Ein Block-Zweig im Turn-Schema wirkt als
//     Fähigkeits-Angebot, das der Korpus nicht zurücknehmen kann (ohne
//     abruf-Zweig fiel derselbe Fall auf 1/8).
//   · Dem stand kein messbarer Gewinn gegenüber: Das Textparsing hatte im
//     selben Lauf NULL Fehler (272 Züge, 54 Blöcke, 14 Marken).
//
// Die Infrastruktur bleibt vollständig und getestet. Wiedereinschalten ist eine
// Zeile je Def — dieser Test macht daraus eine BEWUSSTE Handlung: Wer ihn
// anfasst, liest die Begründung.

import { describe, it, expect } from "vitest";
import { soloDef, momentDef } from "../../core/ui/sessions.js";
import { einzelDef, gemeinsamDef } from "../../core/ui/kernwetten.js";
import { schalteStruktur, strukturPraeambel } from "../../core/prompts/struktur-praeambel.js";
import { baueTurnSchema } from "../../core/contracts/turn-schema.js";
import { getPrompts } from "../../core/prompts/prompts.js";

const backend = {
  info: () => ({}), pstate: { get: async () => null, set: async () => {} },
  bstate: { get: async () => null, set: async () => {} },
  chat: { load: async () => null, save: async () => {} },
  handover: { get: async () => null, post: async () => {} },
};
const ctx = { me: "Anna", partner: "Bernd", nameA: "Anna", nameB: "Bernd", kontext: "" };

describe("Strukturmodus ruht (ST8)", () => {
  it("KEINE Session fährt den Strukturpfad — auch die Kernwetten nicht", () => {
    for (const [name, bau] of [["solo", soloDef], ["moment", momentDef], ["einzel", einzelDef], ["gemeinsam", gemeinsamDef]]) {
      const d = bau(backend);
      expect(d.strukturTurn, name).toBeUndefined();
      expect(d.sysPrompt(ctx).includes(getPrompts("de").strukturTexte.kopf), name).toBe(false);
    }
  });

  it("sessions.js ruft schalteStruktur NICHT auf (der Revert ist vollzogen)", async () => {
    const quelle = await import("node:fs").then(fs =>
      fs.readFileSync(new URL("../../core/ui/sessions.js", import.meta.url), "utf8"));
    expect(quelle).not.toMatch(/return schalteStruktur\(/);
    // Die Begründung steht in der Datei, damit sie beim Anfassen gelesen wird:
    expect(quelle).toContain("Struktur-Modus RUHT");
    expect(quelle).toContain("SPRINT-ST8-PROTOKOLL");
  });

  it("die Infrastruktur bleibt intakt — Opt-in funktioniert unverändert", () => {
    const def = schalteStruktur(soloDef(backend));
    expect(def.strukturTurn).toBe(true);
    expect(def.sysPrompt(ctx).startsWith(getPrompts("de").strukturTexte.kopf)).toBe(true);
    expect(strukturPraeambel(def)).toContain("AUSGABEFORMAT");
    const t = baueTurnSchema(def);
    expect(t.schema.properties.antwort).toBeTruthy();
    expect(t.schema.properties.block.anyOf.length).toBeGreaterThan(1);
  });

  it("der Adapter-Mechanikwechsel (ST3) bleibt produktiv — der Judge nutzt ihn", async () => {
    // output_config ist NICHT Teil dessen, was ruht: Jedes Eval-Urteil läuft
    // darüber. Ein Rückbau dort würde den Judge treffen.
    const adapter = await import("node:fs").then(fs =>
      fs.readFileSync(new URL("../../core/llm/adapter.js", import.meta.url), "utf8"));
    expect(adapter).toContain("output_config");
    expect(adapter).not.toMatch(/tool_choice:\s*\{\s*type:\s*"tool"/);
  });
});
