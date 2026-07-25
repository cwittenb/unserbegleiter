// S95.2 · Dialogausschnitt — Eignungsbericht (EXCERPT-BLOCK) und gespeichertes
// Artefakt. Zwei getrennte Objekte, bewusst: Das Modell berichtet EIGNUNG, die
// Person wählt AUS. Der Ausschnitt selbst ist nie Modell-Erzeugnis (D1).

import { describe, it, expect } from "vitest";
import { ausschnittBlockSchema, ausschnittSchema, AUSSCHNITT_RAHMEN_MAX } from "../../core/contracts/schemas.js";
import { BLOECKE, ALLE_BLOECKE } from "../../core/contracts/registry.js";
import { findeBlock, parseBlock, cleanDisplay } from "../../core/contracts/block.js";

const eignung = (over = {}) => ({
  pairs: [{ id: "P1-2", ownerOk: true, companionOk: true, reason: null }],
  ...over,
});

const artefakt = (over = {}) => ({
  pairs: [{ question: "Was macht das mit dir?", answer: "Es wird klarer.", gapBefore: false }],
  frame: null,
  criteriaOwner: { characterJudgment: false, generalization: false, situationSpecific: true, ownShare: true },
  criteriaCompanion: { partisan: false, interpretsAbsent: false, diagnoses: false },
  paths: ["shelf"],
  ...over,
});

describe("Ausschnitt · Eignungsbericht (EXCERPT-BLOCK)", () => {
  it("gültiger Bericht", () => {
    expect(ausschnittBlockSchema(eignung())).toEqual([]);
  });

  it("leere oder fehlende pairs", () => {
    expect(ausschnittBlockSchema({ pairs: [] })[0]).toContain("pairs");
    expect(ausschnittBlockSchema({})[0]).toContain("pairs");
    expect(ausschnittBlockSchema(null)[0]).toContain("root");
  });

  it("nicht bestandenes Paar braucht eine Begründung", () => {
    const f = ausschnittBlockSchema(eignung({
      pairs: [{ id: "P1-2", ownerOk: false, companionOk: true, reason: null }],
    }));
    expect(f.join(" ")).toContain("reason");
  });

  it("Begleiter-Kriterium zählt genauso wie das Owner-Kriterium (D3)", () => {
    expect(ausschnittBlockSchema(eignung({
      pairs: [{ id: "P1-2", ownerOk: true, companionOk: false, reason: "Deutung über den Abwesenden" }],
    }))).toEqual([]);
  });

  it("SCHWEIGEN BEI BESTEHEN: ein bestandenes Paar darf keine Begründung tragen", () => {
    // Charta-Regel strukturell erzwungen — Lob quert am Schema, nicht erst am Prompt.
    const f = ausschnittBlockSchema(eignung({
      pairs: [{ id: "P1-2", ownerOk: true, companionOk: true, reason: "alle Kriterien erfüllt" }],
    }));
    expect(f.join(" ")).toContain("null");
  });

  it("Flags müssen boolesch sein", () => {
    const f = ausschnittBlockSchema(eignung({
      pairs: [{ id: "P1-2", ownerOk: "ja", companionOk: true, reason: null }],
    }));
    expect(f.join(" ")).toContain("ownerOk");
  });

  it("doppelte IDs werden abgewiesen", () => {
    const f = ausschnittBlockSchema(eignung({
      pairs: [
        { id: "P1-2", ownerOk: true, companionOk: true, reason: null },
        { id: "P1-2", ownerOk: true, companionOk: true, reason: null },
      ],
    }));
    expect(f.join(" ")).toContain("duplicate");
  });
});

describe("Ausschnitt · gespeichertes Artefakt", () => {
  it("gültiges Artefakt", () => {
    expect(ausschnittSchema(artefakt())).toEqual([]);
  });

  it("verlangt mindestens ein Paar mit Frage und Antwort", () => {
    expect(ausschnittSchema(artefakt({ pairs: [] }))[0]).toContain("pairs");
    expect(ausschnittSchema(artefakt({ pairs: [{ question: "", answer: "a", gapBefore: false }] }))
      .join(" ")).toContain("question");
  });

  it("gapBefore ist Pflicht und beim ersten Paar nie wahr (D2)", () => {
    expect(ausschnittSchema(artefakt({ pairs: [{ question: "f", answer: "a" }] }))
      .join(" ")).toContain("gapBefore");
    expect(ausschnittSchema(artefakt({ pairs: [{ question: "f", answer: "a", gapBefore: true }] }))
      .join(" ")).toContain("first pair");
  });

  it("Auslassung ab dem zweiten Paar ist zulässig", () => {
    expect(ausschnittSchema(artefakt({
      pairs: [
        { question: "f1", answer: "a1", gapBefore: false },
        { question: "f2", answer: "a2", gapBefore: true },
      ],
    }))).toEqual([]);
  });

  it("beide Kriteriensätze müssen bestanden sein", () => {
    expect(ausschnittSchema(artefakt({ criteriaOwner: { characterJudgment: true, generalization: false, situationSpecific: true, ownShare: true } }))
      .join(" ")).toContain("criteriaOwner");
    expect(ausschnittSchema(artefakt({ criteriaCompanion: { partisan: true, interpretsAbsent: false, diagnoses: false } }))
      .join(" ")).toContain("criteriaCompanion");
    expect(ausschnittSchema(artefakt({ criteriaCompanion: undefined })).join(" ")).toContain("criteriaCompanion");
  });

  it('der Weg "self" ist für Ausschnitte ungültig', () => {
    expect(ausschnittSchema(artefakt({ paths: ["self"] })).join(" ")).toContain("self");
    expect(ausschnittSchema(artefakt({ paths: [] })).join(" ")).toContain("paths");
    expect(ausschnittSchema(artefakt({ paths: ["shelf", "moment"] }))).toEqual([]);
  });

  it("Rahmensatz: null erlaubt, Länge begrenzt (Entweder-oder aus §4)", () => {
    expect(ausschnittSchema(artefakt({ frame: null }))).toEqual([]);
    expect(ausschnittSchema(artefakt({ frame: "Ein Satz dazu." }))).toEqual([]);
    expect(ausschnittSchema(artefakt({ frame: "x".repeat(AUSSCHNITT_RAHMEN_MAX) }))).toEqual([]);
    expect(ausschnittSchema(artefakt({ frame: "x".repeat(AUSSCHNITT_RAHMEN_MAX + 1) }))
      .join(" ")).toContain("frame");
    expect(ausschnittSchema(artefakt({ frame: undefined })).join(" ")).toContain("frame");
  });
});

describe("Ausschnitt · Registry-Anbindung", () => {
  it("EXCERPT-BLOCK ist registriert und trägt das Schema", () => {
    expect(BLOECKE.ausschnitt.dataset).toBe("ausschnitt");
    expect(BLOECKE.ausschnitt.schema).toBe(ausschnittBlockSchema);
  });

  it("Rundlauf: Block im Fließtext wird gefunden und geprüft", () => {
    const text = "Vorspann.\nEXCERPT-BLOCK\n" + JSON.stringify(eignung()) + "\nEND EXCERPT-BLOCK\nNachlauf.";
    const f = findeBlock(text, ALLE_BLOECKE);
    expect(f.block.dataset).toBe("ausschnitt");
    expect(parseBlock(f.block, f.match).ok).toBe(true);
  });

  it("ungültiger Körper geht in die Korrektur-Runde statt durchzurutschen", () => {
    const text = "EXCERPT-BLOCK\n" + JSON.stringify(eignung({ pairs: [] })) + "\nEND EXCERPT-BLOCK";
    const f = findeBlock(text, ALLE_BLOECKE);
    expect(parseBlock(f.block, f.match).ok).toBe(false);
  });

  it("der Block ist unsichtbar — kein Platzhalter im Verlauf", () => {
    const text = "Danke dir.\nEXCERPT-BLOCK\n" + JSON.stringify(eignung()) + "\nEND EXCERPT-BLOCK";
    expect(cleanDisplay(text, [], ALLE_BLOECKE)).toBe("Danke dir.");
  });
});
