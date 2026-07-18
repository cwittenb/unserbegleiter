// Judge-Prompt-Härtung (S52) gegen die Fehlurteile aus den ersten echten Läufen:
//  - SPA-01 C2: der Judge schrieb Zahlen aus PERSON-RANKING-RESULT der Begleitung zu.
//  - AUF-01 C1: der Judge las eine Prozess-/Rahmung als Auftrags-Bestätigung.
// Die Regeln stecken im Judge-SYSTEM-Prompt (baueJudgePrompt), nicht in den Szenarien.
// Der Kontrakt (ja/nein-JSON) bleibt unverändert — siehe stufe-d.spec.js.

import { describe, it, expect } from "vitest";
import { baueJudgePrompt, JUDGE_PROMPT_VERSION } from "../../evals/judge/judge.js";
import { richte } from "../../evals/judge/judge.js";
import { SZENARIEN } from "../../evals/szenarien/start-katalog.js";

describe("Judge-Prompt-Härtung (j4)", () => {
  it("Version ist auf j4 angehoben", () => {
    expect(JUDGE_PROMPT_VERSION).toBe("j5");   // S76: Strukturausgabe
  });

  it("DE-Prompt: nur SYSTEM(Begleitung); PERSON-RESULT-Zahlen zählen nicht; Rahmung ≠ Bestätigung", () => {
    const de = baueJudgePrompt();
    expect(de).toContain("SYSTEM(Begleitung)");
    expect(de).toContain("PERSON");
    expect(de).toContain("RANKING-RESULT");
    expect(de).toContain("NIE als Aussage der Begleitung");
    expect(de).toContain("KEINE Bestätigung eines Auftrags");
    // Kontrakt unangetastet:
    expect(de).toContain("unabhängiger Prüfer");
    expect(de).toContain('{"checks":[{"id":"C1","antwort":"ja"');
  });

  it("EN-Prompt: only SYSTEM(Companion); PERSON-result numbers don't count; framing ≠ confirmation", () => {
    const en = baueJudgePrompt("en");
    expect(en).toContain("SYSTEM(Companion)");
    expect(en).toContain("PERSON");
    expect(en).toContain("RANKING-RESULT");
    expect(en).toContain("NEVER count as something the companion said");
    expect(en).toContain("NOT confirmation of a shared task");
    expect(en).toContain("independent examiner");
  });

  it("die Härtungsregeln erreichen den echten Judge-Aufruf (via richte)", async () => {
    let gesehenerPrompt = "";
    const judgeCall = async (system) => {
      gesehenerPrompt = system;
      return { data: { checks: [{ id: "C1", verdict: "no", evidence: "«Beleg»" }, { id: "C2", verdict: "no", evidence: "«Beleg»" }] }, stop: "end_turn" };
    };
    const SPA = SZENARIEN.find(s => s.id === "SPA-01");
    await richte(judgeCall, SPA, [
      { role: "user", content: "RANKING-RESULT: Nähe wichtig 9 / zufrieden 3" },
      { role: "assistant", content: "Du willst beides. Erzähl mir davon." },
    ], { schlaf: async () => {} });
    expect(gesehenerPrompt).toContain("SYSTEM(Begleitung)");
    expect(gesehenerPrompt).toContain("NIE als Aussage der Begleitung");
  });
});
