// S85 — Judge-Struktur-Rettung (deklariert, KEIN stiller Fallback) und
// QZ-Schrittglättung. Anlass: keyless-Artefakt-Lauf 2026-07-19T13:35 —
// 15/15 Samples unbewertet („kein tool_use-Block"), obwohl der Judge valide
// Verdikte als Freitext/```json lieferte.

import { describe, it, expect } from "vitest";
import { makeAdapter, extrahiereStrukturAusText } from "../../core/llm/adapter.js";
import { richte, pruefeJudgeDaten } from "../../evals/judge/judge.js";
import { sampleAusUrteil, szenarioAusSamples } from "../../evals/runner-kern.js";
import { SZENARIEN } from "../../evals/szenarien/start-katalog.js";
import * as DE from "../../core/prompts/prompts.de.js";
import * as EN from "../../core/prompts/prompts.en.js";

const SYC = SZENARIEN.find(s => s.id === "SYC-05");
const KEYLESS = { provider: "anthropic", mode: "keyless", models: { anthropic: "test-modell" } };
const STRUKTUR = { name: "judge_bewertung", schema: { type: "object" } };
const mockFetch = payload => async () => ({ status: 200, json: async () => payload, headers: { get: () => null } });
const antwort = bloecke => ({ content: bloecke, stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 2 } });

describe("S85 · extrahiereStrukturAusText", () => {
  it("schält ein Objekt aus einem ```json-Zaun", () => {
    expect(extrahiereStrukturAusText('Hier sind die Bewertungen:\n```json\n{"checks":[{"id":"C1"}]}\n```'))
      .toEqual({ checks: [{ id: "C1" }] });
  });

  it("schält das real beobachtete NACKTE Array aus dem Zaun", () => {
    expect(extrahiereStrukturAusText('```json\n[ { "id": "C1", "verdict": "no", "evidence": "kein Beleg" } ]\n```'))
      .toEqual([{ id: "C1", verdict: "no", evidence: "kein Beleg" }]);
  });

  it("schält ein Objekt aus Freitext mit Präambel (äußere Klammern)", () => {
    expect(extrahiereStrukturAusText('Ich bewerte wie folgt. {"checks":[]} Danke.'))
      .toEqual({ checks: [] });
  });

  it("rät nie: Müll oder fehlendes JSON ⇒ null", () => {
    expect(extrahiereStrukturAusText("**C1** — verdict: no — evidence: kein Beleg")).toBe(null);
    expect(extrahiereStrukturAusText("")).toBe(null);
    expect(extrahiereStrukturAusText(null)).toBe(null);
  });
});

describe("S85 · Anthropic parseStructured: deklarierter Rettungspfad", () => {
  it("Normalpfad (tool_use) trägt strukturQuelle:'tool'", async () => {
    const call = makeAdapter(KEYLESS, mockFetch(antwort([
      { type: "tool_use", name: "judge_bewertung", input: { checks: [] } },
    ])));
    const r = await call("sys", [{ role: "user", content: "x" }], { structured: STRUKTUR });
    expect(r.data).toEqual({ checks: [] });
    expect(r.strukturQuelle).toBe("tool");
  });

  it("fehlt tool_use, aber der Text trägt JSON ⇒ Rettung mit strukturQuelle:'text' (real beobachteter Fall)", async () => {
    const call = makeAdapter(KEYLESS, mockFetch(antwort([
      { type: "text", text: 'Hier sind die Bewertungen der drei Prüffragen:\n```json\n{"checks":[{"id":"C1","verdict":"no","evidence":"kein Beleg"}]}\n```' },
    ])));
    const r = await call("sys", [{ role: "user", content: "x" }], { structured: STRUKTUR });
    expect(r.strukturQuelle).toBe("text");
    expect(r.data.checks[0].verdict).toBe("no");
  });

  it("fehlt tool_use UND rettbares JSON ⇒ unverändert harter Fehler", async () => {
    const call = makeAdapter({ ...KEYLESS, versuche: 1 }, mockFetch(antwort([
      { type: "text", text: "**C1** — Behandelt die Begleitung den Auftrag als beschlossen …" },
    ])));
    await expect(call("sys", [{ role: "user", content: "x" }], { structured: STRUKTUR }))
      .rejects.toThrow(/kein tool_use-Block/);
  });
});

describe("S85 · Judge nimmt die Rettung fachlich an", () => {
  it("nacktes checks-Array wird normalisiert (pruefeJudgeDaten)", () => {
    const p = pruefeJudgeDaten([
      { id: "C1", verdict: "no", evidence: "«a»" },
      { id: "C2", verdict: "yes", evidence: "«b»" },
    ], SYC);
    expect(p.ok).toBe(true);
    expect(p.antworten.C1.antwort).toBe("nein");
  });

  it("richte reicht strukturQuelle:'text' sichtbar ins Urteil durch", async () => {
    const judgeCall = async () => ({
      data: { checks: [
        { id: "C1", verdict: "no", evidence: "«a»" },
        { id: "C2", verdict: "yes", evidence: "«b»" },
      ] },
      strukturQuelle: "text",
    });
    const u = await richte(judgeCall, SYC, [], { versuche: 1, schlaf: async () => {} });
    expect(u.bewertet).toBe(true);
    expect(u.strukturQuelle).toBe("text");
  });

  it("ohne Quelle (ältere Aufrufer) gilt 'tool' — kein Verhaltensbruch", async () => {
    const judgeCall = async () => ({ data: { checks: [
      { id: "C1", verdict: "no", evidence: "«a»" },
      { id: "C2", verdict: "no", evidence: "«b»" },
    ] } });
    const u = await richte(judgeCall, SYC, [], { versuche: 1, schlaf: async () => {} });
    expect(u.strukturQuelle).toBe("tool");
  });
});

describe("S85 · Sichtbarkeit in Sample und Szenario", () => {
  const urteilText = {
    bewertet: true, strukturQuelle: "text",
    // SYC-05: C1 verletzt bei "ja", C2 bei "nein" — beides hier unverletzt.
    antworten: { C1: { antwort: "nein", beleg: "«a»" }, C2: { antwort: "ja", beleg: "«b»" } },
  };
  const urteilTool = { ...urteilText, strukturQuelle: "tool" };

  it("sampleAusUrteil trägt strukturQuelle; szenarioAusSamples zählt textStrukturSamples", () => {
    const s1 = sampleAusUrteil(SYC, [], urteilText, 1);
    const s2 = sampleAusUrteil(SYC, [], urteilTool, 2);
    expect(s1.strukturQuelle).toBe("text");
    expect(s2.strukturQuelle).toBe("tool");
    const sz = szenarioAusSamples(SYC, [s1, s2], 2);
    expect(sz.textStrukturSamples).toBe(1);
    expect(sz.status).toBe("gruen");   // grün bleibt grün — deklariert, nicht degradiert
  });

  it("ohne Text-Rettung erscheint das Feld nicht (Berichte bleiben byte-stabil)", () => {
    const s2 = sampleAusUrteil(SYC, [], urteilTool, 1);
    const sz = szenarioAusSamples(SYC, [s2], 1);
    expect("textStrukturSamples" in sz).toBe(false);
  });
});

describe("S85 · QZ-Schrittglättung (Kanarie)", () => {
  it("de/en: bei Direkt-zu-Schritt-2 entfällt die Prozess-Schau-Frage ersatzlos; Schritte nie mischen", () => {
    const de = DE.momentPrompt("Anna", "Bernd");
    expect(de).toContain("entfällt die Prozess-Schau-Frage ERSATZLOS");
    expect(de).toContain("NIE in einer Nachricht vermischt");
    const en = EN.momentPrompt("Anna", "Bernd");
    expect(en).toContain("dropped WITHOUT replacement");
    expect(en).toContain("NEVER mixed in one message");
  });
});
