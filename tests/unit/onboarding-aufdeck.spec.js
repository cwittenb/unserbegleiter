// Sprint „Aufdeck" — Onboarding-Kapitel, Mini-Gate & Aufdeck-Runde.
// Kanarien + Vertrags- und Datenpfad-Tests.

import { describe, it, expect } from "vitest";
import { klaerungsPrompt, aufloesungsPrompt, aufdeckPrompt } from "../../core/prompts/prompts.js";
import { aufdeckSchema } from "../../core/contracts/schemas.js";
import { BLOECKE } from "../../core/contracts/registry.js";
import { pruefeMarkerOrder } from "../../core/contracts/marker.js";
import { Bstate } from "../../core/store/bundles.js";
import {
  einzelDef, aufdeckDef, KAPITEL_TITEL,
  beruehrungen, baueAufdeckung, baueAufdeckKontext, baueKlaerungsKontext,
} from "../../core/ui/kernwetten.js";

describe("Kanarien · klaerungsPrompt (vier Kapitel)", () => {
  const p = klaerungsPrompt("Anna", "Bernd");
  it("Kapitel-Marken 1–3 vorhanden und in Reihenfolge", () => {
    for (const m of ["[[CHAPTER-1]]", "[[CHAPTER-2]]", "[[CHAPTER-3]]"]) expect(p).toContain(m);
    expect(p.indexOf("KAPITEL 1")).toBeLessThan(p.indexOf("KAPITEL 2"));
    expect(p.indexOf("KAPITEL 2")).toBeLessThan(p.indexOf("KAPITEL 3"));
    expect(p.indexOf("KAPITEL 3")).toBeLessThan(p.indexOf("KAPITEL 4"));
  });
  it("Sicherheitsfrage bleibt das Tor (vor Kapitel 2)", () => {
    expect(p.indexOf("Sicherheitsfrage")).toBeLessThan(p.indexOf("KAPITEL 2"));
  });
  it("Stützmodus erzeugt keine Kapitel-Marken", () => expect(p).toContain("KEINE Kapitel-Marken"));
  it("Vertiefung auf 2 Stellen gekürzt", () => {
    expect(p).toContain("die 2 auffälligsten Stellen");
    expect(p).not.toContain("3–4 auffälligsten");
  });
  it("Rate-Runde erhebt keine Sorgen; BV wandert nach Kapitel 4", () => {
    expect(p).toContain("KEINE Sorgen und keine vermuteten Sorgen");
    expect(p.indexOf("Vermutete Sorge,")).toBeGreaterThan(p.indexOf("KAPITEL 4"));
  });
  it("2d/2e liegen NACH der Rate-Runde (BV-Verschiebung, Zieldramaturgie)", () => {
    expect(p.indexOf("nicht verhandelbar")).toBeGreaterThan(p.indexOf("RATE-RUNDE"));
  });
  it("Mini-Gate ist reine App-Sache — nie kommentieren", () => expect(p).toContain("reine App-Sache"));
  it("Weiche und Umformung bleiben intakt", () => {
    expect(p).toContain("SORGEN-WEICHE (gilt in Kapitel 4");
    expect(p).toContain("WEICHEN-DISZIPLIN (binär)");
    expect(p).toContain("trifft das noch den Kern dessen");   // S37: neue hörende Einleitung, Kleinschreibung nach Gedankenstrich
  });
});

describe("Kanarien · aufloesungsPrompt (Protokoll & Pausenmarke)", () => {
  const p = aufloesungsPrompt("Anna", "Bernd", true);
  it("REVEAL-PROTOCOL wird respektiert (nicht wiederholen, Vormerkungen aufgreifen)", () => {
    expect(p).toContain("REVEAL-PROTOCOL");
    expect(p).toContain("wiederhole diese Aufdeckung nicht");
  });
  it("PAUSENMARKE liegt vor der Ergänzungsfrage", () => {
    expect(p.indexOf("PAUSENMARKE")).toBeGreaterThan(0);
    expect(p.indexOf("PAUSENMARKE")).toBeLessThan(p.indexOf("Phase 3 – Ergänzungsfrage"));
  });
});

describe("Kanarien · aufdeckPrompt", () => {
  const p = aufdeckPrompt("Anna", "Bernd");
  it("kein richtig/falsch, Berührungspunkte statt Quote", () => {
    expect(p).toContain("kein richtig und kein falsch");
    expect(p).toContain("Berührungspunkt");
  });
  it("Marker- und Block-Vertrag benannt", () => {
    expect(p).toContain("[[REVEAL]] allein in der letzten Zeile");
    expect(p).toContain("REVEAL-BLOCK");
  });
  it("keine Themen-Vertiefung — Vormerken für die Klärung", () => expect(p).toContain("KEINE Themen-Vertiefung"));
  it("keine Sicherheitsdiagnosen im gemeinsamen Raum", () => expect(p).toContain("Keine Sicherheitsdiagnosen"));
});

describe("Vertrag · aufdeckSchema (REVEAL-BLOCK)", () => {
  it("gültig, leere Arrays erlaubt", () =>
    expect(aufdeckSchema({ summary: "a.", touchingPoints: [], forClarification: [] })).toHaveLength(0));
  it("fehlende Zusammenfassung ungültig", () =>
    expect(aufdeckSchema({ touchingPoints: [], forClarification: [] }).length).toBeGreaterThan(0));
  it("Quoten/Scores sind strukturell verboten — Berührungspunkte statt Zählen", () =>
    expect(aufdeckSchema({ summary: "a.", touchingPoints: [], forClarification: [], trefferquote: 2 }).join(" "))
      .toContain("no quotas"));
  it("Registry trägt den REVEAL-BLOCK", () => {
    expect(BLOECKE.aufdeck.start).toBe("REVEAL-BLOCK");
    expect(BLOECKE.aufdeck.schema).toBe(aufdeckSchema);
  });
});

describe("Kernwetten · Kapitel-Marker & Aufdeck-Def", () => {
  it("einzelDef: Kapitel-Marker registriert, markerOrder besteht den Wächter", () => {
    const d = einzelDef({}, {});
    for (const m of ["[[CHAPTER-1]]", "[[CHAPTER-2]]", "[[CHAPTER-3]]"]) expect(typeof d.markers[m]).toBe("function");
    expect(pruefeMarkerOrder(d.markerOrder)).toEqual([]);
  });
  it("einzelDef: Kapitel-Marker reicht Nummer an den Hook", () => {
    const rufe = [];
    const d = einzelDef({}, { onKapitel: (n) => rufe.push(n) });
    d.markers["[[CHAPTER-3]]"]({});
    expect(rufe).toEqual([3]);
  });
  it("aufdeckDef: geteilte Session, [[REVEAL]] registriert, Block persistiert Protokoll und beendet", async () => {
    const gesetzt = [];
    const backend = { bstate: { set: async (f, v) => gesetzt.push([f, v]) } };
    const d = aufdeckDef(backend, {});
    expect(d.shared).toBe(true);
    expect(typeof d.markers["[[REVEAL]]"]).toBe("function");
    const engine = { chat: { status: "running" } };
    await d.blocks[0].handle({ summary: "Warm.", touchingPoints: ["Nähe"], forClarification: [] }, engine);
    expect(engine.chat.status).toBe("finished");
    expect(gesetzt[0][0]).toBe("revealLog");
    expect(gesetzt[0][1].summary).toBe("Warm.");
    expect(gesetzt[0][1].at).toBeTruthy();
  });
  it("KAPITEL_TITEL trägt vier Kapitel", () => expect(KAPITEL_TITEL).toHaveLength(4));
});

describe("Kernwetten · Datenpfade der Aufdeck-Runde", () => {
  const ranks = {
    self: ["Nähe", "Ehrlichkeit", "Wertschätzung", "Autonomie", "Harmonie"],
    pwichtig: ["Autonomie", "Beständigkeit", "Nähe"],
    pchange: ["Sexualität & körperliche Nähe"],   // wird bewusst NICHT gequert (erst G2)
    geheim: "Rohform",
  };
  it("baueAufdeckung: nur name/top5/tipp3/releasedAt queren — Fremdfelder nie", () => {
    const g = baueAufdeckung("Anna", ranks);
    expect(Object.keys(g).sort()).toEqual(["guess3", "name", "releasedAt", "top5"]);
    expect(g.top5).toHaveLength(5);
    expect(g.guess3).toHaveLength(3);
  });
  it("baueAufdeckung: ohne vollständige Stapel wird geworfen (Korrektur-Runde statt Lücke)", () => {
    expect(() => baueAufdeckung("Anna", { self: ["x"], pwichtig: [] })).toThrow(/Korrektur-Runde/);
  });
  it("beruehrungen: Schnittmenge in Tipp-Reihenfolge, keine Quote", () => {
    expect(beruehrungen(ranks.pwichtig, ranks.self)).toEqual(["Autonomie", "Nähe"]);
    expect(beruehrungen(["Abenteuer"], ranks.self)).toEqual([]);
  });
  it("REVEAL-CONTEXT: beide Namen, keine Unzufriedenheits-Vermutung", () => {
    const gA = baueAufdeckung("Anna", ranks);
    const gB = baueAufdeckung("Bernd", { self: ["Autonomie", "Nähe", "Ehrlichkeit", "Abenteuer", "Wertschätzung"], pwichtig: ["Nähe", "Wertschätzung", "Harmonie"] });
    const k = baueAufdeckKontext(gA, gB);
    expect(k).toContain("Anna – Top 5");
    expect(k).toContain("Bernd – Tipp");
    expect(k).not.toContain("Sexualität");   // Unzufriedenheits-Tipp quert erst mit der Klärung
  });
  it("Klärungs-Kontext: zwei HANDOVER-BLOCKS, Protokoll-Zeile optional", () => {
    const uA = { name: "Anna", items: [{ id: "S1", text: "Nähe sehr wichtig, dort unzufrieden" }] };
    const uB = { name: "Bernd", items: [{ id: "G1", text: "Vermutet, dass Anna mehr Zweisamkeit wünscht" }] };
    const ohne = baueKlaerungsKontext(uA, uB, null);
    expect(ohne.match(/HANDOVER-BLOCK – /g)).toHaveLength(2);
    expect(ohne).not.toContain("REVEAL-PROTOCOL");
    const mit = baueKlaerungsKontext(uA, uB, { summary: "Warm gespielt.", touchingPoints: ["Nähe"], forClarification: ["Wochenend-Rituale"] });
    expect(mit).toContain("REVEAL-PROTOCOL");
    expect(mit).toContain("Wochenend-Rituale");
  });
});

describe("Store · Bstate-Felder (Worker-Whitelist folgt aus FIELDS)", () => {
  it("aufdeckung + aufdeckprotokoll sind Bündel-Felder mit Defaults", () => {
    expect(Bstate.FIELDS).toContain("reveal");
    expect(Bstate.FIELDS).toContain("revealLog");
    expect(Bstate.DEFAULTS.reveal).toEqual({ A: null, B: null });
    expect(Bstate.DEFAULTS.revealLog).toBeNull();
  });
});
