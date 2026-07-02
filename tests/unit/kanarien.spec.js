// Prompt-Kanarien — Invarianten gegen Regressions-Verlust beim Refactoring.
// v0.29-Kanarien portiert + Neuzugänge (Fokus-Prinzip, Weichen-Disziplin,
// Marker-Konvention in den Prompts selbst).

import { describe, it, expect } from "vitest";
import { einzelSys, gemeinsamSys, momentSys, soloSys, qzSys, DOMAINS } from "../../core/prompts/prompts.js";

describe("Kanarien · soloSys (Reflexionsgespräch)", () => {
  const p = soloSys("Anna", "Bernd");
  it("Sicherheits-Weiche am Gate", () => expect(p).toContain("SICHERHEITS-WEICHE"));
  it("Spiegel-Grammatik", () => expect(p).toContain("SPIEGEL-GRAMMATIK"));
  it("Widerspruchs-Pflicht", () => expect(p).toContain("WIDERSPRUCHS-PFLICHT"));
  it("Namen sind eingewoben", () => { expect(p).toContain("Anna"); expect(p).toContain("Bernd"); });
});

describe("Kanarien · momentSys (Gemeinsame Session)", () => {
  const p = momentSys("Anna", "Bernd");
  it("Not-Frage an beide", () => expect(p).toContain("NOT-FRAGE AN BEIDE"));
  it("keine Sicherheitsdiagnosen im Raum", () => expect(p).toContain("KEINE Sicherheitsdiagnosen"));
  it("offene Tür ab Termin 2", () => expect(p).toContain("OFFENE TÜR (nur ab dem zweiten Termin"));
  it("Zwischenzeit-Impuls ohne Nachhalten", () => expect(p).toContain("NICHT geprüft, ob es stattfand"));
});

describe("Kanarien · qzSys (Qualitätszeit-Einladungen)", () => {
  it("Angebots-Grammatik statt Deutung", () => expect(qzSys()).toContain("NIE eine Diagnose"));
});

describe("Kanarien · einzelSys (Auftragsklärung, v2)", () => {
  const p = einzelSys("Anna", "Bernd", true);
  it("Sorgen-Weiche (Angst UM vs. Angst VOR) vorhanden", () => {
    expect(p).toContain("SORGEN-WEICHE");
    expect(p).toContain("Angst VOR");
  });
  it("Weichen-Disziplin ist binär formuliert", () => expect(p).toContain("WEICHEN-DISZIPLIN (binär)"));
  it("Marker-Konvention: [[REGLER]] allein in der letzten Zeile wird verlangt", () => {
    expect(p).toContain("[[REGLER]] allein in der letzten Zeile");
  });
  it("v2-Weiche ist schaltbar: ohne v2 keine Sorgen-Weiche", () => {
    expect(einzelSys("A", "B", false)).not.toContain("SORGEN-WEICHE");
  });
});

describe("Kanarien · gemeinsamSys (Auflösung)", () => {
  const p = gemeinsamSys("Anna", "Bernd", true);
  it("CLARIFICATION-BLOCK-Format wird verlangt", () => expect(p).toContain("CLARIFICATION-BLOCK"));
  it("beidseitige Bestätigung ist verankert", () => expect(p).toContain("vonBeidenBestaetigt"));
});

describe("Kanarien · Domänen", () => {
  it("13 Lebensbereiche, Sexualität und Finanzen nicht wegredigiert", () => {
    expect(DOMAINS).toHaveLength(13);
    const titel = DOMAINS.map(d => d.t).join(" ");
    expect(titel).toContain("Sexualität");
    expect(titel).toContain("Finanzielle");
  });
});

describe("Kanarien · Themen-Rahmen (Scope, Neubau v1.0)", () => {
  it("solo- und moment-Session tragen den Themen-Rahmen im assemblierten Prompt", async () => {
    const { soloDef, momentDef } = await import("../../core/ui/sessions.js");
    const solo = soloDef({}).sysPrompt({ me: "Anna", partner: "Bernd" });
    const moment = momentDef({}).sysPrompt({ nameA: "Anna", nameB: "Bernd" });
    for (const p of [solo, moment]) {
      expect(p).toContain("THEMEN-RAHMEN");
      expect(p).toContain("frag nach dem Bezug, statt abzuweisen");   // Mehrdeutigkeit → Frage, nicht Abweisung
    }
  });
});
