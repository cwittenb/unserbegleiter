// Block-Schemas — portierte v0.29-Fälle (mit ihren Test-IDs) + Neuzugänge.

import { describe, it, expect } from "vitest";
import {
  zeitSchema, momentSchema, auftragBlockSchema, gateArtSchema,
  gateSchema, befundSchema, qzSchema,
} from "../../core/contracts/schemas.js";

describe("zeitSchema", () => {
  it("gültig + ziele optional (v0.29)", () => {
    expect(zeitSchema({ zusammenfassung: "a b c.", themen: ["x"], wiederkehr: null })).toEqual([]);
    expect(zeitSchema({ zusammenfassung: "a.", themen: ["x"], wiederkehr: null, ziele: ["z"] })).toEqual([]);
  });
  it("leere Themen ungültig (v0.29)", () => {
    expect(zeitSchema({ zusammenfassung: "a.", themen: [], wiederkehr: null }).length).toBeGreaterThan(0);
  });
  it("wiederkehr muss vorhanden sein (null zählt als vorhanden)", () => {
    expect(zeitSchema({ zusammenfassung: "a.", themen: ["x"] }).join(" ")).toContain("wiederkehr");
  });
  it("Nicht-Objekt-Wurzel wird abgefangen", () => {
    expect(zeitSchema(null)).toEqual(["Wurzel ist kein Objekt"]);
    expect(zeitSchema([1, 2])).toEqual(["Wurzel ist kein Objekt"]);
  });
});

describe("momentSchema", () => {
  it("gültig inkl. zwischenzeitImpuls (v0.29)", () => {
    expect(momentSchema({
      zusammenfassung: "a.", themen: ["x"], behandelt: [], vertagt: [],
      selbstGeklaert: [], wandel: null, zwischenzeitImpuls: "Spaziergang",
    })).toEqual([]);
  });
  it("Agenda-Listen müssen String-Listen sein", () => {
    expect(momentSchema({ zusammenfassung: "a.", themen: ["x"], behandelt: [1] }).join(" ")).toContain("behandelt");
  });
});

describe("auftragBlockSchema (Konsens-Regeln sind hart)", () => {
  it("gemeinsame Änderung braucht beide Okays (v0.29)", () => {
    expect(auftragBlockSchema({ aenderungen: [{ op: "revidieren", id: "AG1", art: "gemeinsam", text: "t" }] }).length).toBeGreaterThan(0);
  });
  it("individuelle braucht Owner-Okay (v0.29)", () => {
    expect(auftragBlockSchema({ aenderungen: [{ op: "abschliessen", id: "AI1", art: "individuell", owner: "X" }] }).length).toBeGreaterThan(0);
  });
  it("gültig: neu gemeinsam + Startwerte (v0.29)", () => {
    expect(auftragBlockSchema({
      aenderungen: [{ op: "neu", art: "gemeinsam", text: "t", vonBeidenBestaetigt: true, startwerte: { A: 3 } }],
    })).toEqual([]);
  });
  it("op außerhalb der Liste ungültig; revidieren ohne id ungültig", () => {
    expect(auftragBlockSchema({ aenderungen: [{ op: "loeschen", art: "gemeinsam", vonBeidenBestaetigt: true, text: "t" }] }).length).toBeGreaterThan(0);
    expect(auftragBlockSchema({ aenderungen: [{ op: "revidieren", art: "gemeinsam", vonBeidenBestaetigt: true, text: "t" }] }).join(" ")).toContain('"id"');
  });
  it("leere aenderungen ungültig", () => {
    expect(auftragBlockSchema({ aenderungen: [] }).length).toBeGreaterThan(0);
  });
});

describe("gateArtSchema (Querung / Sicherheits-Weiche-Ausgang)", () => {
  it("I10: nicht bestandener Kriterien-Check ungültig (v0.29)", () => {
    expect(gateArtSchema({
      fassung: "x", wunsch: null, begruendung: "y",
      kriterien: { charakterzuschreibung: true, generalisierung: false, situationsbezug: true, selbstanteil: true },
      wege: ["regal"],
    }).length).toBeGreaterThan(0);
  });
  it("gültig mit Wegen (v0.29)", () => {
    expect(gateArtSchema({
      fassung: "x", wunsch: null, begruendung: "y",
      kriterien: { charakterzuschreibung: false, generalisierung: false, situationsbezug: true, selbstanteil: true },
      wege: ["selbst", "regal"],
    })).toEqual([]);
  });
  it("unbekannter Weg ungültig; leere Wege ungültig", () => {
    const basis = {
      fassung: "x", wunsch: null, begruendung: "y",
      kriterien: { charakterzuschreibung: false, generalisierung: false, situationsbezug: true, selbstanteil: true },
    };
    expect(gateArtSchema({ ...basis, wege: ["melden"] }).length).toBeGreaterThan(0);
    expect(gateArtSchema({ ...basis, wege: [] }).length).toBeGreaterThan(0);
  });
  it("fehlende kriterien insgesamt ungültig (kein stillschweigendes Durchwinken)", () => {
    expect(gateArtSchema({ fassung: "x", wunsch: null, begruendung: "y", wege: ["selbst"] }).length).toBeGreaterThan(0);
  });
});

describe("gateSchema (Abschluss-Block der Auftragsklärung)", () => {
  const item = (id, extra = {}) => ({ id, text: "t", ...extra });
  it("gültige Item-Mischung", () => {
    expect(gateSchema({ items: [item("BS1"), item("BV2"), item("S1", { tag: "Ranking" }), item("V1")] })).toEqual([]);
  });
  it("S-Item ohne tag ungültig; V-Item mit tag ungültig; BS/BV mit tag ungültig", () => {
    expect(gateSchema({ items: [item("S1")] }).length).toBeGreaterThan(0);
    expect(gateSchema({ items: [item("V1", { tag: "Ranking" })] }).length).toBeGreaterThan(0);
    expect(gateSchema({ items: [item("BS1", { tag: "Ranking" })] }).length).toBeGreaterThan(0);
  });
  it("ungültige id-Präfixe werden gemeldet", () => {
    expect(gateSchema({ items: [item("X1")] }).join(" ")).toContain("ungültige id");
  });
  it("leere items ungültig", () => {
    expect(gateSchema({ items: [] }).length).toBeGreaterThan(0);
  });
});

describe("befundSchema", () => {
  const gueltig = () => ({
    funde: [], triangulation: { vorschlaege: 1, bestaetigt: 1, justiert: 0, abgelehnt: 0 },
    gemeinsamerAuftrag: null, individuelleAuftraege: [],
    konstitutiveDivergenz: { vorhanden: false },
    nachbefragung: [{ person: "A", wert: 4 }, { person: "B", wert: 5 }],
  });
  it("gültiger Minimal-Befund", () => {
    expect(befundSchema(gueltig())).toEqual([]);
  });
  it("AUF-01 (rote Linie): gemeinsamer Auftrag ohne beidseitige Bestätigung ungültig (v0.29)", () => {
    const d = gueltig();
    d.gemeinsamerAuftrag = { text: "x", vonBeidenBestaetigt: false, startwerte: {} };
    expect(befundSchema(d).join(" ")).toContain("vonBeidenBestaetigt");
  });
  it("sorgen-Objekt: Notbremse und Zählwerte Pflicht, wenn vorhanden", () => {
    const d = gueltig();
    d.sorgen = { vorgelegt: 1, bestaetigt: 0, entkraeftet: 1, justiert: 0, stehenGelassen: 0, auftragsErgaenzungen: [] };
    expect(befundSchema(d).join(" ")).toContain("notbremse");
    d.sorgen.notbremse = false;
    expect(befundSchema(d)).toEqual([]);
  });
  it("nachbefragung ist Pflicht und braucht person+wert", () => {
    const d = gueltig();
    d.nachbefragung = [];
    expect(befundSchema(d).length).toBeGreaterThan(0);
    d.nachbefragung = [{ person: "A" }];
    expect(befundSchema(d).length).toBeGreaterThan(0);
  });
});

describe("qzSchema (Qualitätszeit-Fächer)", () => {
  it("Fächer braucht Resonanz (v0.29)", () => {
    expect(qzSchema({
      einladungen: [
        { text: "a", domaene: "x", quelle: "negativraum" },
        { text: "b", domaene: "y", quelle: "negativraum" },
      ],
    }).join(" ")).toContain("Resonanz");
  });
  it("gültig: 2–3 Einladungen, mind. eine Resonanz", () => {
    expect(qzSchema({
      einladungen: [
        { text: "a", domaene: "x", quelle: "resonanz" },
        { text: "b", domaene: "y", quelle: "negativraum" },
      ],
    })).toEqual([]);
  });
  it("1 oder 4 Einladungen ungültig", () => {
    const e1 = qzSchema({ einladungen: [{ text: "a", domaene: "x", quelle: "resonanz" }] });
    expect(e1.length).toBeGreaterThan(0);
    const vier = Array.from({ length: 4 }, (_, i) => ({ text: "t" + i, domaene: "d", quelle: "resonanz" }));
    expect(qzSchema({ einladungen: vier }).length).toBeGreaterThan(0);
  });
});
