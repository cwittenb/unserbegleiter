// Block-Schemas — portierte v0.29-Fälle (mit ihren Test-IDs) + Neuzugänge.

import { describe, it, expect } from "vitest";
import {
  zeitSchema, momentSchema, auftragBlockSchema, gateArtSchema,
  gateSchema, befundSchema, qzSchema,
} from "../../core/contracts/schemas.js";

describe("zeitSchema", () => {
  it("gültig + ziele optional (v0.29)", () => {
    expect(zeitSchema({ summary: "a b c.", topics: ["x"], recurrenceNote: null })).toEqual([]);
    expect(zeitSchema({ summary: "a.", topics: ["x"], recurrenceNote: null, goals: ["z"] })).toEqual([]);
  });
  it("leere Themen ungültig (v0.29)", () => {
    expect(zeitSchema({ summary: "a.", topics: [], recurrenceNote: null }).length).toBeGreaterThan(0);
  });
  it("recurrenceNote muss vorhanden sein (null zählt als vorhanden)", () => {
    expect(zeitSchema({ summary: "a.", topics: ["x"] }).join(" ")).toContain("recurrenceNote");
  });
  it("Nicht-Objekt-Wurzel wird abgefangen", () => {
    expect(zeitSchema(null)).toEqual(["root is not an object"]);
    expect(zeitSchema([1, 2])).toEqual(["root is not an object"]);
  });
});

describe("momentSchema", () => {
  it("gültig inkl. gentleInvitation (v0.29)", () => {
    expect(momentSchema({
      summary: "a.", topics: ["x"], addressed: [], deferred: [],
      selfResolved: [], shift: null, gentleInvitation: "Spaziergang",
    })).toEqual([]);
  });
  it("Agenda-Listen müssen String-Listen sein", () => {
    expect(momentSchema({ summary: "a.", topics: ["x"], addressed: [1] }).join(" ")).toContain("addressed");
  });
});

describe("auftragBlockSchema (Konsens-Regeln sind hart)", () => {
  it("gemeinsame Änderung braucht beide Okays (v0.29)", () => {
    expect(auftragBlockSchema({ changes: [{ op: "revise", id: "AG1", art: "shared", text: "t" }] }).length).toBeGreaterThan(0);
  });
  it("individuelle braucht Owner-Okay (v0.29)", () => {
    expect(auftragBlockSchema({ changes: [{ op: "close", id: "AI1", art: "individual", owner: "X" }] }).length).toBeGreaterThan(0);
  });
  it("gültig: neu gemeinsam + Startwerte (v0.29)", () => {
    expect(auftragBlockSchema({
      changes: [{ op: "new", art: "shared", text: "t", confirmedByBoth: true, baseline: { A: 3 } }],
    })).toEqual([]);
  });
  it("op außerhalb der Liste ungültig; revidieren ohne id ungültig", () => {
    expect(auftragBlockSchema({ changes: [{ op: "loeschen", art: "shared", confirmedByBoth: true, text: "t" }] }).length).toBeGreaterThan(0);
    expect(auftragBlockSchema({ changes: [{ op: "revise", art: "shared", confirmedByBoth: true, text: "t" }] }).join(" ")).toContain('"id"');
  });
  it("leere changes ungültig", () => {
    expect(auftragBlockSchema({ changes: [] }).length).toBeGreaterThan(0);
  });
});

describe("gateArtSchema (Querung / Sicherheits-Weiche-Ausgang)", () => {
  it("I10: nicht bestandener Kriterien-Check ungültig (v0.29)", () => {
    expect(gateArtSchema({
      wording: "x", wish: null, reasoning: "y",
      criteria: { characterJudgment: true, generalization: false, situationSpecific: true, ownShare: true },
      paths: ["shelf"],
    }).length).toBeGreaterThan(0);
  });
  it("gültig mit Wegen (v0.29)", () => {
    expect(gateArtSchema({
      wording: "x", wish: null, reasoning: "y",
      criteria: { characterJudgment: false, generalization: false, situationSpecific: true, ownShare: true },
      paths: ["self", "shelf"],
    })).toEqual([]);
  });
  it("unbekannter Weg ungültig; leere Wege ungültig", () => {
    const basis = {
      wording: "x", wish: null, reasoning: "y",
      criteria: { characterJudgment: false, generalization: false, situationSpecific: true, ownShare: true },
    };
    expect(gateArtSchema({ ...basis, paths: ["melden"] }).length).toBeGreaterThan(0);
    expect(gateArtSchema({ ...basis, paths: [] }).length).toBeGreaterThan(0);
  });
  it("fehlende kriterien insgesamt ungültig (kein stillschweigendes Durchwinken)", () => {
    expect(gateArtSchema({ wording: "x", wish: null, reasoning: "y", paths: ["self"] }).length).toBeGreaterThan(0);
  });
});

describe("gateSchema (Abschluss-Block der Auftragsklärung)", () => {
  const item = (id, extra = {}) => ({ id, text: "t", ...extra });
  it("gültige Item-Mischung", () => {
    expect(gateSchema({ items: [item("CS1"), item("CG2"), item("S1", { tag: "Ranking" }), item("G1")] })).toEqual([]);
  });
  it("S-Item ohne tag ungültig; G-Item mit tag ungültig; BS/BV mit tag ungültig", () => {
    expect(gateSchema({ items: [item("S1")] }).length).toBeGreaterThan(0);
    expect(gateSchema({ items: [item("G1", { tag: "Ranking" })] }).length).toBeGreaterThan(0);
    expect(gateSchema({ items: [item("CS1", { tag: "Ranking" })] }).length).toBeGreaterThan(0);
  });
  it("ungültige id-Präfixe werden gemeldet", () => {
    expect(gateSchema({ items: [item("X1")] }).join(" ")).toContain("invalid id");
  });
  it("leere items ungültig", () => {
    expect(gateSchema({ items: [] }).length).toBeGreaterThan(0);
  });
});

describe("befundSchema", () => {
  const gueltig = () => ({
    findings: [], triangulation: { proposed: 1, confirmed: 1, adjusted: 0, declined: 0 },
    sharedGoal: null, individualGoals: [],
    misalignedAssumptions: { present: false },
    closingCheck: [{ person: "A", value: 4 }, { person: "B", value: 5 }],
  });
  it("gültiger Minimal-Befund", () => {
    expect(befundSchema(gueltig())).toEqual([]);
  });
  it("AUF-01 (rote Linie): gemeinsamer Auftrag ohne beidseitige Bestätigung ungültig (v0.29)", () => {
    const d = gueltig();
    d.sharedGoal = { text: "x", confirmedByBoth: false, baseline: {} };
    expect(befundSchema(d).join(" ")).toContain("confirmedByBoth");
  });
  it("sorgen-Objekt: Notbremse und Zählwerte Pflicht, wenn vorhanden", () => {
    const d = gueltig();
    d.concerns = { raised: 1, confirmed: 0, dispelled: 1, adjusted: 0, leftUntouched: 0, goalAdditions: [] };
    expect(befundSchema(d).join(" ")).toContain("emergencyBrake");
    d.concerns.emergencyBrake = false;
    expect(befundSchema(d)).toEqual([]);
  });
  it("closingCheck ist Pflicht und braucht person+wert", () => {
    const d = gueltig();
    d.closingCheck = [];
    expect(befundSchema(d).length).toBeGreaterThan(0);
    d.closingCheck = [{ person: "A" }];
    expect(befundSchema(d).length).toBeGreaterThan(0);
  });
});

describe("qzSchema (Qualitätszeit-Fächer)", () => {
  it("Fächer braucht Resonanz (v0.29)", () => {
    expect(qzSchema({
      invitations: [
        { text: "a", domain: "x", source: "negativeSpace" },
        { text: "b", domain: "y", source: "negativeSpace" },
      ],
    }).join(" ")).toContain("resonance");
  });
  it("gültig: 2–3 Einladungen, mind. eine Resonanz", () => {
    expect(qzSchema({
      invitations: [
        { text: "a", domain: "x", source: "resonance" },
        { text: "b", domain: "y", source: "negativeSpace" },
      ],
    })).toEqual([]);
  });
  it("1 oder 4 Einladungen ungültig", () => {
    const e1 = qzSchema({ invitations: [{ text: "a", domain: "x", source: "resonance" }] });
    expect(e1.length).toBeGreaterThan(0);
    const vier = Array.from({ length: 4 }, (_, i) => ({ text: "t" + i, domain: "d", source: "resonance" }));
    expect(qzSchema({ invitations: vier }).length).toBeGreaterThan(0);
  });
});
