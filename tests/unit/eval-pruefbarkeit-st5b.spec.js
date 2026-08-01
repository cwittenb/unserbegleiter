// ST5b · Prüffragen müssen AUS DEM TRANSKRIPT entscheidbar sein.
//
// Der Judge sieht ausschließlich Transkript + Prüffragen (baueJudgeUser); der
// Judge-Systemprompt erklärt keine Block-Konventionen. Eine Frage, die
// Systemwissen voraussetzt ("der vorgesehene Abschluss-Weg der Session"), ist
// deshalb nicht beantwortbar — der Judge benennt j8-konform das nicht
// auffindbare Element und verurteilt. Sonde: 5/5 dieselbe Begründung.

import { describe, it, expect } from "vitest";
import { SZENARIEN } from "../../evals/szenarien/start-katalog.js";
import { SZENARIEN_EN } from "../../evals/szenarien/start-katalog.en.js";
import { GOLDEN } from "../../evals/judge/golden.js";
import { baueJudgeUser, baueJudgePrompt } from "../../evals/judge/judge.js";

const qz = SZENARIEN.find(s => s.id === "QZ-01");
const qzEn = SZENARIEN_EN.find(s => s.id === "QZ-01-EN");
const gold = GOLDEN.find(g => g.id === "GOLD-ZUSATZ");

describe("Prüfbarkeit ohne Systemwissen", () => {
  it("QZ-01/C2 benennt den Abschluss-Block, statt ihn zu umschreiben", () => {
    const c2 = qz.checks.find(c => c.id === "C2");
    expect(c2.frage).toContain("MOMENT-BLOCK");
    expect(c2.frage).not.toContain("vorgesehene Abschluss-Weg");
  });

  it("EN-Parität: gleiche Version, Block ebenfalls benannt", () => {
    const c2 = qzEn.checks.find(c => c.id === "C2");
    expect(c2.frage).toContain("MOMENT-BLOCK");
    expect(c2.frage).not.toContain("intended closing path");
    expect(qzEn.version).toBe(qz.version);
  });

  it("Versionssprung ist vollzogen (Altläufe sind bewusst nicht mehr vergleichbar)", () => {
    expect(qz.version).toBe(3);
  });

  it("GOLD-ZUSATZ: die Frage nennt den Block — der Fall ist wieder entscheidbar", () => {
    const c1 = gold.szenario.checks.find(c => c.id === "C1");
    expect(c1.frage).toContain("MOMENT-BLOCK");
    // Der Prüfgegenstand steht wörtlich im Transkript des Falls:
    const transkriptText = gold.transkript.map(m => m.content).join("\n");
    expect(transkriptText).toContain("MOMENT-BLOCK");
    expect(gold.erwartet.C1).toBe("ja");
  });

  it("Begründung der Regel: der Judge bekommt Blockwissen NIRGENDS geliefert", () => {
    // Wäre das anders, wäre die Umschreibung zulässig gewesen.
    const system = baueJudgePrompt("de");
    expect(system).not.toContain("MOMENT-BLOCK");
    const user = baueJudgeUser(gold.szenario, gold.transkript);
    expect(user).toContain("MOMENT-BLOCK");        // nur, weil es im Transkript steht
  });
});
