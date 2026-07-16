// Block-Parser-Fehlformen (S66, P2.7b) — Modelle produzieren genau diese
// Ränder: unvollständige Blöcke, fehlende Schemas, null-Texte. Ergänzt
// block.spec.js um die offenen Fehlerzweige (Z. 22, 44, 50, 75–77).

import { describe, it, expect } from "vitest";
import { blockDef, parseBlock, findeBlock, cleanDisplay, korrekturNachricht } from "../../core/contracts/block.js";

const def = blockDef({ start: "NOTE-BLOCK", end: "END NOTE-BLOCK", placeholder: "[Notiz]", dataset: "note",
  schema: d => (d && typeof d.note === "string" ? [] : ['"note" fehlt oder ist kein String']) });

describe("blockDef · Vertragsränder", () => {
  it("ohne start oder end: sofortiger Fehler (kein stiller Defekt)", () => {
    expect(() => blockDef(null)).toThrow(/start und end/);
    expect(() => blockDef({ start: "X" })).toThrow(/start und end/);
    expect(() => blockDef({ end: "Y" })).toThrow(/start und end/);
  });

  it("ohne Schema: parseBlock akzeptiert jedes gültige JSON (schema=null-Zweig)", () => {
    const frei = blockDef({ start: "A", end: "B", placeholder: "-", dataset: "d", schema: null });
    const r = parseBlock(frei, [null, ' {"beliebig":1} ']);
    expect(r).toEqual({ ok: true, data: { beliebig: 1 } });
  });
});

describe("parseBlock · kaputte Körper", () => {
  it("kein JSON → ok:false mit Parser-Meldung; Schema-Verstoß → Fehlertexte des Schemas", () => {
    expect(parseBlock(def, [null, "{kaputt"]).ok).toBe(false);
    expect(parseBlock(def, [null, "{kaputt"]).errors[0]).toMatch(/kein gültiges JSON/);
    const s = parseBlock(def, [null, '{"falsch": true}']);
    expect(s.ok).toBe(false);
    expect(s.errors).toEqual(['"note" fehlt oder ist kein String']);
  });

  it("Markdown-Zaun um den Körper wird toleriert (dokumentierte Toleranz §1.4) — auch ohne json-Etikett", () => {
    expect(parseBlock(def, [null, '```\n{"note":"x"}\n```']).ok).toBe(true);
    expect(parseBlock(def, [null, '```json\n{"note":"x"}\n```']).ok).toBe(true);
  });
});

describe("findeBlock · Suchränder", () => {
  it("leere/fehlende Blockliste und Text ohne Treffer → null; erster Treffer gewinnt", () => {
    expect(findeBlock("irgendwas", [])).toBe(null);
    expect(findeBlock("irgendwas", null)).toBe(null);
    expect(findeBlock("nur Text ohne Block", [def])).toBe(null);
    const zweit = blockDef({ start: "Z1", end: "Z2", placeholder: "-", dataset: "z", schema: null });
    const t = 'Z1 {"a":1} Z2 und NOTE-BLOCK {"note":"n"} END NOTE-BLOCK';
    expect(findeBlock(t, [def, zweit]).block.dataset).toBe("note");   // Listen-Reihenfolge zählt
  });

  it("unvollständiger Block (Ende fehlt) wird NICHT gefunden — Korrektur-Runde statt Rate-Reparatur", () => {
    expect(findeBlock('NOTE-BLOCK {"note":"x"}', [def])).toBe(null);
  });
});

describe("cleanDisplay · Anzeige-Säuberung an den Rändern", () => {
  it("null/undefined-Text, fehlende Marker-/Blocklisten: leerer String statt Absturz", () => {
    expect(cleanDisplay(null, null, null)).toBe("");
    expect(cleanDisplay(undefined, [], [])).toBe("");
  });

  it("Marker verschwinden, Blöcke werden zu Platzhaltern, Leerzeilen kollabieren", () => {
    const t = '[[MARKE]]\n\n\n\nNOTE-BLOCK {"note":"x"} END NOTE-BLOCK\n\n\nText';
    const s = cleanDisplay(t, ["[[MARKE]]"], [def]);
    expect(s).not.toContain("[[MARKE]]");
    expect(s).not.toContain("NOTE-BLOCK");
    expect(s).toContain("[Notiz]");
    expect(s).not.toMatch(/\n{3,}/);
  });
});

describe("korrekturNachricht · zitiert Fehler und Marken (Wire, englisch — S31a)", () => {
  it("nennt start/end und die Schema-Fehler wörtlich", () => {
    const n = korrekturNachricht(def, ['"note" fehlt oder ist kein String']);
    expect(n).toContain("NOTE-BLOCK");
    expect(n).toContain("END NOTE-BLOCK");
    expect(n).toContain('"note" fehlt');
    expect(n).toMatch(/^\[SYSTEM-REVISION:/);
  });
});
