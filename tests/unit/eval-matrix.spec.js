// Abdeckungs-Matrix (S66) — deterministisch: Struktur, Summen, Lücken-Warnung.
// Der Schreibpfad läuft gegen mkdtemp, nie gegen evals/ergebnisse (Sprint-Regel).

import { describe, it, expect, afterEach } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { baueMatrix, schreibeMatrix, SESSIONS } from "../../scripts/eval-matrix.js";
import { SZENARIEN } from "../../evals/szenarien/start-katalog.js";

let tmp = null;
afterEach(async () => { if (tmp) { await rm(tmp, { recursive: true, force: true }); tmp = null; } });

describe("baueMatrix · Katalog-Realität", () => {
  it("alle fünf Session-Typen als Spalten; Gesamtsumme = Kataloggröße; qualitytime ist belegt (QZ-02 schloss die Null)", () => {
    const md = baueMatrix(SZENARIEN);
    for (const s of SESSIONS) expect(md).toContain(s);
    expect(md).toContain("| " + SZENARIEN.length + " |");        // Σ-Zelle
    expect(md).toContain("QZ-02");
    expect(md).toContain("Alle fünf Session-Typen sind belegt.");
    expect(md).not.toContain("Unbelegte Session-Typen");
  });

  it("rote Linien tragen ⚑ und werden aufgezählt", () => {
    const md = baueMatrix(SZENARIEN);
    expect(md).toContain("KRIS-01 ⚑");
    expect(md).toContain("Rote Linien (7):");
    expect(md).toContain("TRAU-01/C1");
  });

  it("eine unbelegte Session erzeugt die Warnung (genau die Fehlerklasse der QZ-Null)", () => {
    const ohneQz = SZENARIEN.filter(s => s.session !== "qualitytime");
    const md = baueMatrix(ohneQz);
    expect(md).toContain("Unbelegte Session-Typen:");
    expect(md).toContain("qualitytime");
  });
});

describe("schreibeMatrix · Artefakt", () => {
  it("schreibt abdeckung.md mit de- und en-Abschnitt in den Zielordner", async () => {
    tmp = await mkdtemp(path.join(tmpdir(), "pb-matrix-"));
    const r = await schreibeMatrix({ outDir: tmp });
    expect(r.datei).toBe(path.join(tmp, "abdeckung.md"));
    const md = await readFile(r.datei, "utf8");
    expect(md).toContain("# Eval-Abdeckung (de)");
    expect(md).toContain("# Eval-Abdeckung (en)");
    expect(md).toContain("NOT-01-EN");
    expect(r.de).toBe(SZENARIEN.length);
  });
});
