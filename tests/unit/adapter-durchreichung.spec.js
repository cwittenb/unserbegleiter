// S76b · Kanarie gegen argumentverschluckende Adapter-Umhüllungen.
//
// Befund aus dem ersten echten Eval-Lauf über das Artefakt: der Judge-Wrapper
// im Eval-Artefakt hatte feste Stelligkeit `(sys, msgs)` und verschluckte das
// dritte Argument — seit S76 stehen dort die Aufruf-Optionen ({ structured }).
// Folge: der Judge fiel lautlos auf den Textpfad zurück, lieferte kein data,
// und ALLE 30 Samples wurden als „checks fehlt" unbewertet geführt. Kein Test
// hat das gemerkt, weil die Unit-Tests den Wrapper nicht durchlaufen.
//
// Diese Kanarie prüft zwei Dinge:
//   1. strukturell: keine Adapter-Umhüllung im Quellcode mit fester Stelligkeit
//   2. verhaltensmäßig: der Wrapper des Eval-Artefakts reicht Optionen durch

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));

describe("Adapter-Umhüllungen reichen ALLE Argumente durch (S76b)", () => {
  it("Eval-Artefakt: pipelineCall/judgeCall sind Rest-Parameter-Wrapper", () => {
    const quelle = readFileSync(path.join(ROOT, "platforms/artifact/eval-app.js"), "utf8");
    // Die Wrapper müssen (...a) => roh.x(...a) sein — feste Stelligkeit
    // verschluckt das Optionen-Argument.
    expect(quelle).toMatch(/const pipelineCall = async \(\.\.\.\w+\) =>/);
    expect(quelle).toMatch(/const judgeCall = async \(\.\.\.\w+\) =>/);
    expect(quelle).not.toMatch(/roh\.[pj]\(sys, msgs\)/);
  });

  it("verhaltensmäßig: ein Wrapper nach diesem Muster trägt { structured } bis zum Adapter", async () => {
    // Muster exakt wie im Artefakt (Zähler + Statusanzeige + Durchreichung).
    let calls = 0;
    const gesehen = [];
    const roh = async (...a) => { gesehen.push(a); return { text: "", data: { checks: [] } }; };
    const judgeCall = async (...a) => { calls++; return roh(...a); };

    await judgeCall("SYS", [{ role: "user", content: "u" }], { structured: { name: "n", schema: {} } });
    expect(calls).toBe(1);
    expect(gesehen[0]).toHaveLength(3);
    expect(gesehen[0][2].structured.name).toBe("n");
  });

  it("Gegenprobe: feste Stelligkeit verschluckt die Optionen (das war der Fehler)", async () => {
    const gesehen = [];
    const roh = async (...a) => { gesehen.push(a); return {}; };
    const kaputt = async (sys, msgs) => roh(sys, msgs);
    await kaputt("SYS", [], { structured: { name: "n", schema: {} } });
    expect(gesehen[0]).toHaveLength(2);   // genau so ging data verloren
  });

  it("Node-Runner: der Telemetrie-Wrapper nutzt bereits Rest-Parameter", () => {
    const quelle = readFileSync(path.join(ROOT, "evals/runner.js"), "utf8");
    expect(quelle).toMatch(/const zaehl = \(fn, akk\) => async \(\.\.\.\w+\) =>/);
  });
});
