// S76 · Judge im strukturierten Pfad: der Provider garantiert die FORM, diese
// Schicht prüft weiterhin die fachliche GÜLTIGKEIT (Transportgarantie ≠
// Gültigkeit). Wire-Felder sind englisch (verdict/evidence), die interne
// Wahrheit bleibt ja/nein — Härteregeln, Berichte und Goldens bleiben unberührt.

import { describe, it, expect } from "vitest";
import { SZENARIEN } from "../../evals/szenarien/start-katalog.js";
import { richte, pruefeJudgeDaten, baueJudgePrompt, JUDGE_SCHEMA, JUDGE_PROMPT_VERSION } from "../../evals/judge/judge.js";

const SYC = SZENARIEN.find(s => s.id === "SYC-05");
const daten = checks => ({ data: { checks } });
const ok = [{ id: "C1", verdict: "no", evidence: "«Beleg»" }, { id: "C2", verdict: "yes", evidence: "«Beleg»" }];

describe("Judge · Wire-Schema (S76)", () => {
  it("Schema ist strikt: nur id/verdict/evidence, verdict als yes/no-Enum", () => {
    const item = JUDGE_SCHEMA.schema.properties.checks.items;
    expect(JUDGE_SCHEMA.name).toBe("judge_bewertung");
    expect(item.properties.verdict.enum).toEqual(["yes", "no"]);
    expect(item.required).toEqual(["id", "verdict", "evidence"]);
    expect(item.additionalProperties).toBe(false);
    expect(JUDGE_SCHEMA.schema.additionalProperties).toBe(false);
  });

  it("Prompt j5: strukturiert ohne JSON-Formatregeln, Fallback mit — Härtung in beiden gleich", () => {
    expect(JUDGE_PROMPT_VERSION).toBe("j5");
    const s = baueJudgePrompt("de", { strukturiert: true });
    const f = baueJudgePrompt("de", { strukturiert: false });
    expect(s).not.toContain("Markdown-Zäune");
    expect(s).not.toContain("gerade Anführungszeichen");   // Parser-Krücke entfällt
    expect(s).toContain("verdict");
    expect(f).toContain("Markdown-Zäune");
    for (const p of [s, f]) {
      expect(p).toContain("SYSTEM(Begleitung)");
      expect(p).toContain("in dubio contra machina");
    }
    expect(baueJudgePrompt("en", { strukturiert: true })).toContain("independent examiner");
  });
});

describe("Judge · strukturierte Antwort einlesen", () => {
  it("yes/no wird auf die interne ja/nein-Wahrheit gemappt", () => {
    const p = pruefeJudgeDaten({ checks: ok }, SYC);
    expect(p.ok).toBe(true);
    expect(p.antworten.C1).toEqual({ antwort: "nein", beleg: "«Beleg»" });
    expect(p.antworten.C2.antwort).toBe("ja");
  });

  it("fehlende Check-id ⇒ ungültig (Vollständigkeit ist FACHLICH, nicht Transport)", () => {
    const p = pruefeJudgeDaten({ checks: [ok[0]] }, SYC);
    expect(p.ok).toBe(false);
    expect(p.fehler).toContain("C2");
  });

  it("unbekanntes verdict oder fehlendes checks ⇒ ungültig", () => {
    expect(pruefeJudgeDaten({ checks: [{ id: "C1", verdict: "vielleicht" }] }, SYC).ok).toBe(false);
    expect(pruefeJudgeDaten({}, SYC).ok).toBe(false);
    expect(pruefeJudgeDaten(null, SYC).fehler).toBe("checks fehlt");
  });
});

describe("Judge · richte() im strukturierten Pfad", () => {
  it("ruft mit dem Judge-Schema auf und bewertet aus data — ohne Korrektur-Runde", async () => {
    const gesehen = [];
    const call = async (system, messages, opts) => {
      gesehen.push({ system, messages, opts });
      return daten(ok);
    };
    const r = await richte(call, SYC, [{ role: "user", content: "u" }], { schlaf: async () => {} });
    expect(r.bewertet).toBe(true);
    expect(r.antworten.C1.antwort).toBe("nein");
    expect(gesehen).toHaveLength(1);
    expect(gesehen[0].opts.structured).toBe(JUDGE_SCHEMA);
    expect(gesehen[0].messages).toHaveLength(1);            // keine Korrektur-Runde
    expect(gesehen[0].system).toContain("verdict");
  });

  it("Retry bleibt: exceeded_limit beim ersten Versuch → zweiter Versuch bewertet", async () => {
    const q = [new Error("exceeded_limit"), daten(ok)];
    const call = async () => { const n = q.shift(); if (n instanceof Error) throw n; return n; };
    const r = await richte(call, SYC, [], { versuche: 3, schlaf: async () => {} });
    expect(r.bewertet).toBe(true);
  });

  it("unvollständige Bewertung nach allen Versuchen ⇒ unbewertet (zählt NIE als bestanden)", async () => {
    const call = async () => daten([ok[0]]);               // C2 fehlt dauerhaft
    const r = await richte(call, SYC, [], { versuche: 2, schlaf: async () => {} });
    expect(r.bewertet).toBe(false);
    expect(r.fehler).toContain("C2");
  });

  it("Adapter-Wurf (abgeschnittene Struktur) ⇒ unbewertet mit klarer Ursache", async () => {
    const call = async () => { throw new Error("Strukturausgabe abgeschnitten (stop=length) — max_tokens erhöhen."); };
    const r = await richte(call, SYC, [], { versuche: 2, schlaf: async () => {} });
    expect(r.bewertet).toBe(false);
    expect(r.fehler).toContain("abgeschnitten");
  });

  it("strukturiert:false schaltet den Fallback-Pfad (Text) — bis zum D5-Gate erhalten", async () => {
    const call = async (system, messages) => ({
      text: JSON.stringify({ checks: [{ id: "C1", antwort: "nein" }, { id: "C2", antwort: "ja" }] }),
      stop: "end_turn",
      _messages: messages,
    });
    const r = await richte(call, SYC, [], { schlaf: async () => {}, strukturiert: false });
    expect(r.bewertet).toBe(true);
    expect(r.antworten.C2.antwort).toBe("ja");
  });
});
