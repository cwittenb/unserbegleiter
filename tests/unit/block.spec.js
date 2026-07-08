// Vertrag 2 · BLOCK — Parsing, Zaun-Toleranz, Anzeige-Säuberung, Korrektur.

import { describe, it, expect } from "vitest";
import { blockDef, parseBlock, findeBlock, cleanDisplay, korrekturNachricht } from "../../core/contracts/block.js";
import { zeitSchema } from "../../core/contracts/schemas.js";
import { BLOECKE, ALLE_BLOECKE } from "../../core/contracts/registry.js";

const GUELTIG = '{"summary":"a.","topics":["x"],"recurrenceNote":null}';

describe("Block · parseBlock", () => {
  it("reines JSON + Schema-Durchlauf (v0.29-Fall)", () => {
    const r = parseBlock({ schema: zeitSchema }, [null, GUELTIG]);
    expect(r.ok).toBe(true);
    expect(r.data.topics[0]).toBe("x");
  });

  it("BEIBEHALTENE TOLERANZ: Markdown-Zaun wird entfernt (dokumentierender Test, Ballast-Register §1.4)", () => {
    const r = parseBlock({ schema: zeitSchema }, [null, "```json\n" + GUELTIG + "\n```"]);
    expect(r.ok).toBe(true);
  });

  it("kaputtes JSON → ok:false mit Fehlertext (v0.29-Fall)", () => {
    const r = parseBlock({ schema: null }, [null, "{nope"]);
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toContain("kein gültiges JSON");
  });

  it("gültiges JSON, aber Schema-Verstoß → Fehlertexte des Schemas", () => {
    const r = parseBlock({ schema: zeitSchema }, [null, '{"topics":[]}']);
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toContain("summary");
  });

  it("KEINE Reparatur kaputten JSONs über den Zaun hinaus (bewusste Grenze)", () => {
    // Einzelne Anführungszeichen, trailing commas o. ä. werden NICHT geflickt —
    // dafür ist die Korrektur-Runde da, nicht ein Parser-Heuristik-Geflecht.
    const r = parseBlock({ schema: null }, [null, "{'a': 1,}"]);
    expect(r.ok).toBe(false);
  });
});

describe("Block · findeBlock & Regex", () => {
  it("findet den Block im Fließtext und liefert den Körper", () => {
    const text = "Vorspann.\nTIMELINE-BLOCK\n" + GUELTIG + "\nEND TIMELINE-BLOCK\nNachlauf.";
    const f = findeBlock(text, ALLE_BLOECKE);
    expect(f).not.toBeNull();
    expect(f.block.dataset).toBe("zeit");
    expect(parseBlock(f.block, f.match).ok).toBe(true);
  });

  it("kein Block → null", () => {
    expect(findeBlock("nur Text", ALLE_BLOECKE)).toBeNull();
  });

  it("blockDef ohne start/end wird abgewiesen", () => {
    expect(() => blockDef({ start: "X" })).toThrow();
  });
});

describe("Block · Registry", () => {
  it("alle sieben Blocktypen sind registriert (v0.29 vervollständigt + QUALITYTIME aus Sprint 12)", () => {
    const starts = ALLE_BLOECKE.map(b => b.start);
    for (const s of ["CLOSURE-BLOCK", "CLARIFICATION-BLOCK", "TIMELINE-BLOCK", "GATE-BLOCK", "MOMENT-BLOCK", "GOAL-BLOCK", "QUALITYTIME-BLOCK"])
      expect(starts).toContain(s);
  });

  it("jeder Block trägt Schema, Platzhalter und dataset", () => {
    for (const b of ALLE_BLOECKE) {
      expect(typeof b.schema).toBe("function");
      expect(b.placeholder).toBeTruthy();
      expect(b.dataset).toBeTruthy();
    }
  });
});

describe("Block · cleanDisplay", () => {
  it("ersetzt Block durch Platzhalter und entfernt Marker", () => {
    const text = "Hier dein Eintrag.\nTIMELINE-BLOCK\n" + GUELTIG + "\nEND TIMELINE-BLOCK\n[[RANKING]]";
    const out = cleanDisplay(text, ["[[RANKING]]"], [BLOECKE.zeitleiste]);
    expect(out).toContain("[Dein Zeitleisten-Eintrag wurde gespeichert.]");
    expect(out).not.toContain("TIMELINE-BLOCK");
    expect(out).not.toContain("[[RANKING]]");
    expect(out).not.toContain('"summary"');
  });

  it("kollabiert Mehrfach-Leerzeilen", () => {
    expect(cleanDisplay("a\n\n\n\nb", [], [])).toBe("a\n\nb");
  });
});

describe("Block · Korrektur-Nachricht (Vertragsform der einen Korrektur-Runde)", () => {
  it("nennt Marke, Fehler und die Nur-Block-Anweisung", () => {
    const n = korrekturNachricht(BLOECKE.zeitleiste, ['"topics" braucht 1–4 Schlagworte']);
    expect(n).toContain("SYSTEM-REVISION");
    expect(n).toContain("TIMELINE-BLOCK");
    expect(n).toContain('"topics" braucht 1–4 Schlagworte');
    expect(n).toContain("ONLY the block");
  });
});
