// Stufe D — englische Evals + Vor-Session-Sprache, deterministisch bewiesen.
// (a) EN-Katalog strukturell paritätisch zum de-Katalog (Familien, Checks,
//     rote Linien); (b) Runner wählt den Korpus je Szenario-Sprache;
// (c) Judge-Prompt/Korrektur sprachfähig bei UNVERÄNDERTEM ja/nein-Kontrakt;
// (d) vorSessionSprache: gespeicherte Wahl → Browser-Sprache → de.

import { describe, it, expect } from "vitest";
import { sysPromptFuer, szenarioSprache, laufeSzenario } from "../../evals/runner-kern.js";
import { baueJudgePrompt, baueJudgeUser } from "../../evals/judge/judge.js";
import { SZENARIEN } from "../../evals/szenarien/start-katalog.js";
import { SZENARIEN_EN } from "../../evals/szenarien/start-katalog.en.js";
import { vorSessionSprache } from "../../core/i18n/index.js";

describe("EN-Katalog · strukturelle Parität", () => {
  it("jedes de-Szenario hat ein -EN-Gegenstück: gleiche Familie, gleiche Check-IDs, gleiche rote Linien", () => {
    expect(SZENARIEN_EN).toHaveLength(SZENARIEN.length);
    for (const de of SZENARIEN) {
      const en = SZENARIEN_EN.find(s => s.id === de.id + "-EN");
      expect(en, de.id + "-EN fehlt").toBeTruthy();
      expect(en.familie).toBe(de.familie);
      expect(en.session).toBe(de.session);
      expect(en.sprache).toBe("en");
      expect(en.checks.map(c => c.id)).toEqual(de.checks.map(c => c.id));
      expect(en.checks.map(c => !!c.roteLinie)).toEqual(de.checks.map(c => !!c.roteLinie));
      expect(en.checks.map(c => c.verletztWenn || "ja")).toEqual(de.checks.map(c => c.verletztWenn || "ja"));
    }
  });

  it("Protokoll-Token bleiben auch im EN-Katalog invariant (SPA-01-EN)", () => {
    const spa = SZENARIEN_EN.find(s => s.id === "SPA-01-EN");
    expect(spa.eingaben.some(e => e.startsWith("SLIDERS-RESULT:"))).toBe(true);
    expect(spa.eingaben.some(e => e.startsWith("RANKING-RESULT:"))).toBe(true);
  });

  it("SPRA-Familie prüft die Sprachdisziplin in beiden Richtungen", () => {
    const de = SZENARIEN.find(s => s.id === "SPRA-01");
    const en = SZENARIEN_EN.find(s => s.id === "SPRA-01-EN");
    expect(de && en).toBeTruthy();
    expect(de.eingaben.some(e => /switching to English/.test(e))).toBe(true);
    expect(en.eingaben.some(e => /kurz auf Deutsch/.test(e))).toBe(true);
  });
});

describe("Runner · Korpuswahl je Szenario", () => {
  it("de-Szenario → deutscher Systemprompt; EN-Szenario → englischer (Sprachdisziplin-Zeile)", () => {
    const de = SZENARIEN.find(s => s.id === "SYC-05");
    const en = SZENARIEN_EN.find(s => s.id === "SYC-05-EN");
    expect(szenarioSprache(de)).toBe("de");
    expect(szenarioSprache(en)).toBe("en");
    expect(sysPromptFuer(de)).toContain("Du antwortest ausschließlich auf Deutsch");
    expect(sysPromptFuer(en)).toContain("You respond exclusively in English");
    expect(sysPromptFuer(en)).not.toContain("Du antwortest ausschließlich auf Deutsch");
  });

  it("Ergebnis-Datensatz trägt die Szenario-Sprache; EN-Lauf funktioniert Ende-zu-Ende mit ja/nein-Judge", async () => {
    const en = SZENARIEN_EN.find(s => s.id === "SYC-05-EN");
    const judgeSysteme = [];
    const pipelineCall = async () => ({ text: "To me this sounds like a lot of self-trust growing — does that ring true for you?", stop: "end_turn" });
    const judgeCall = async system => {
      judgeSysteme.push(system);
      return { text: '{"checks":[{"id":"C1","antwort":"nein","beleg":"kein Beleg"},{"id":"C2","antwort":"ja","beleg":"does that ring true"}]}', stop: "end_turn" };
    };
    const r = await laufeSzenario(en, { pipelineCall, judgeCall, n: 1 });
    expect(r.sprache).toBe("en");
    expect(r.status).toBe("gruen");
    expect(judgeSysteme[0]).toContain("independent examiner");        // EN-Judge-Prompt
    expect(judgeSysteme[0]).toContain('"antwort":"ja"');              // Kontrakt bleibt ja/nein
  });
});

describe("Judge · Sprachvarianten, ein Kontrakt", () => {
  it("baueJudgePrompt: de default, en auf Anforderung — beide fordern ja/nein-JSON", () => {
    const de = baueJudgePrompt();
    const en = baueJudgePrompt("en");
    expect(de).toContain("unabhängiger Prüfer");
    expect(en).toContain("independent examiner");
    for (const p of [de, en]) expect(p).toContain('{"checks":[{"id":"C1","antwort":"ja"');
  });

  it("baueJudgeUser: EN-Szenario bekommt englische Kopfzeilen und Companion-Label", () => {
    const en = SZENARIEN_EN.find(s => s.id === "KOR-01-EN");
    const u = baueJudgeUser(en, [
      { role: "user", content: "input" },
      { role: "assistant", content: "reply" },
    ]);
    expect(u).toContain("TRANSCRIPT (scenario KOR-01-EN");
    expect(u).toContain("AUDIT QUESTIONS (each: ja/nein):");
    expect(u).toContain("SYSTEM(Companion): reply");
  });
});

describe("Vor-Session-Sprache (Wiedereinstiegs-Screen)", () => {
  it("gespeicherte Wahl gewinnt; sonst Browser-Sprache; sonst de; Unbekanntes fällt durch", () => {
    expect(vorSessionSprache("en", "de-DE")).toBe("en");
    expect(vorSessionSprache(null, "en-GB")).toBe("en");
    expect(vorSessionSprache(null, "EN")).toBe("en");
    expect(vorSessionSprache(null, "fr-FR")).toBe("de");
    expect(vorSessionSprache(null, undefined)).toBe("de");
    expect(vorSessionSprache("fr", "fr-FR")).toBe("de");   // unbekannte gespeicherte Wahl zählt nicht
  });
});
