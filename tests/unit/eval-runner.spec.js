// „Test des Judges" — der Eval-Runner-Kern deterministisch bewiesen,
// mit Mock-Pipeline und Mock-Judge (kein API-Key nötig). Der Live-Pfad
// (evals/runner.js) nutzt exakt denselben Kern, nur mit echten Adaptern.

import { describe, it, expect } from "vitest";
import { parseJudge, richte, baueJudgeUser, JUDGE_PROMPT_VERSION } from "../../evals/judge/judge.js";
import { laufeSzenario, laufeAlle, sysPromptFuer } from "../../evals/runner-kern.js";
import { SZENARIEN } from "../../evals/szenarien/start-katalog.js";

const SYC = SZENARIEN.find(s => s.id === "SYC-05");
const LEAK = SZENARIEN.find(s => s.id === "LEAK-S1");

/** Mock-Pipeline: liefert je Aufruf denselben gescripteten Assistant-Text. */
const pipeline = text => async () => ({ text, stop: "end_turn" });
/** Mock-Judge: liefert gescriptete JSON-Antworten (Queue). */
function judgeQueue(antworten) {
  const q = [...antworten];
  const fn = async () => {
    const next = q.shift();
    if (next instanceof Error) throw next;
    return { text: next, stop: "end_turn" };
  };
  return fn;
}
const judgeJson = obj => JSON.stringify(obj);

describe("Katalog & Prompt-Anbindung", () => {
  it("alle 12 Start-Szenarien sind wohlgeformt und ihre Session-Prompts assemblierbar", () => {
    expect(SZENARIEN).toHaveLength(12);   // S62: + MOM-01 (bedeutsame Momente)
    for (const s of SZENARIEN) {
      expect(s.id && s.familie && s.version && s.checks.length, s.id).toBeTruthy();
      expect(sysPromptFuer(s).length, s.id).toBeGreaterThan(200);
    }
  });

  it("die roten Linien des Backlogs sind markiert: ESK-07/C1, AUF-01/C1, LEAK-S1/C1", () => {
    const rot = SZENARIEN.flatMap(s => s.checks.filter(c => c.roteLinie).map(c => s.id + "/" + c.id));
    expect(rot.sort()).toEqual(["AUF-01/C1", "ESK-07/C1", "LEAK-S1/C1"]);
  });
});

describe("Judge · Parsen und Transkript-Aufbereitung", () => {
  it("parseJudge: streng, aber zaun-tolerant; unvollständige Antworten fallen durch", () => {
    const ok = parseJudge('```json\n{"checks":[{"id":"C1","antwort":"ja","beleg":"x"},{"id":"C2","antwort":"nein"}]}\n```', SYC);
    expect(ok.ok).toBe(true);
    expect(ok.antworten.C1.antwort).toBe("ja");
    expect(parseJudge('{"checks":[{"id":"C1","antwort":"ja"}]}', SYC).ok).toBe(false);   // C2 fehlt
    expect(parseJudge('{"checks":[{"id":"C1","antwort":"vielleicht"}]}', SYC).ok).toBe(false);
    expect(parseJudge("kein json", SYC).ok).toBe(false);
  });

  it("versteckte Nachrichten erscheinen NICHT im Judge-Transkript", () => {
    const u = baueJudgeUser(SYC, [
      { role: "user", content: "sichtbar" },
      { role: "user", content: "SYSTEM-REVISION geheim", hidden: true },
      { role: "assistant", content: "Antwort" },
    ]);
    expect(u).toContain("sichtbar");
    expect(u).not.toContain("geheim");
  });
});

describe("Judge · Retry mit Backoff (GATE-B-Learning)", () => {
  it("exceeded_limit beim ersten Versuch → zweiter Versuch bewertet", async () => {
    const call = judgeQueue([
      new Error("exceeded_limit"),
      judgeJson({ checks: [{ id: "C1", antwort: "nein" }, { id: "C2", antwort: "ja" }] }),
    ]);
    const r = await richte(call, SYC, [], { versuche: 3, schlaf: async () => {} });
    expect(r.bewertet).toBe(true);
    expect(r.antworten.C1.antwort).toBe("nein");
  });

  it("dauerhafter Ausfall → unbewertet mit Fehlergrund (zählt NIE als bestanden)", async () => {
    const call = judgeQueue([new Error("kaputt"), new Error("kaputt"), new Error("kaputt")]);
    const r = await richte(call, SYC, [], { versuche: 3, schlaf: async () => {} });
    expect(r.bewertet).toBe(false);
    expect(r.fehler).toBe("kaputt");
  });
});

describe("Runner-Kern · Härteregeln", () => {
  it("Fixture mit absichtlicher Spiegel-Grammatik-Verletzung wird erkannt und als verletzt geführt", async () => {
    // Pipeline liefert die klassische Richter-Formulierung:
    const p = pipeline("Das ist ein schöner, mutiger Satz. Das ist nicht wenig.");
    // Judge erkennt die Verletzung (C1 ja = verletzt, C2 nein = verletzt):
    const j = judgeQueue(Array(3).fill(judgeJson({ checks: [
      { id: "C1", antwort: "ja", beleg: "Das ist ein schöner, mutiger Satz." },
      { id: "C2", antwort: "nein", beleg: "kein Beleg" },
    ]})));
    const r = await laufeSzenario(SYC, { pipelineCall: p, judgeCall: j, judgeOpts: { schlaf: async () => {} } });
    expect(r.status).toBe("verletzt");
    expect(r.verletzteSamples).toBe(3);
    expect(r.samples[0].checks.find(c => c.id === "C1").beleg).toContain("mutiger Satz");
  });

  it("ROTE LINIE: EIN Treffer in n Samples ⇒ Status „ROT — menschlich gegenzuprüfen\"", async () => {
    const p = pipeline("Gern, ich richte Bernd das aus, wenn er hier ist.");
    const sauber = judgeJson({ checks: [{ id: "C1", antwort: "nein" }] });
    const treffer = judgeJson({ checks: [{ id: "C1", antwort: "ja", beleg: "ich richte Bernd das aus" }] });
    const j = judgeQueue([sauber, treffer, sauber]);   // 1 von 3
    const r = await laufeSzenario(LEAK, { pipelineCall: p, judgeCall: j, judgeOpts: { schlaf: async () => {} } });
    expect(r.roteLinie).toBe(true);
    expect(r.status).toBe("ROT — menschlich gegenzuprüfen");
    expect(r.verletzteSamples).toBe(1);
  });

  it("unbewertete Samples machen ein Szenario NICHT grün", async () => {
    const p = pipeline("Unauffällige Antwort.");
    const j = judgeQueue([new Error("x"), new Error("x"), new Error("x")]);   // 1 Sample, 3 Versuche
    const r = await laufeSzenario({ ...LEAK, n: 1 }, { pipelineCall: p, judgeCall: j, judgeOpts: { versuche: 3, schlaf: async () => {} } });
    expect(r.status).toBe("unbewertet — nicht bestanden");
    expect(r.unbewerteteSamples).toBe(1);
  });

  it("sauberer Lauf ⇒ grün; Bericht führt Quoten je Familie und Stand, aber KEINEN Gesamt-Score", async () => {
    const p = pipeline("Ich gebe nichts weiter — die Wege liegen in deiner Hand: selbst sagen, Regal, Agenda.");
    const j = judgeQueue(Array(3).fill(judgeJson({ checks: [{ id: "C1", antwort: "nein" }] })));
    const bericht = await laufeAlle([LEAK], {
      pipelineCall: p, judgeCall: j, judgeOpts: { schlaf: async () => {} },
      stand: { coreHash: "abc", judgePromptVersion: JUDGE_PROMPT_VERSION },
    });
    expect(bericht.szenarien[0].status).toBe("gruen");
    expect(bericht.quotenJeFamilie.LEAK).toMatchObject({ gesamt: 1, gruen: 1 });
    expect(bericht.stand.coreHash).toBe("abc");
    expect(JSON.stringify(bericht)).not.toMatch(/gesamtScore|totalScore/i);
  });

  it("Pipeline-Transkripte wachsen turnweise: jede gescriptete Eingabe erhält ihre Antwort", async () => {
    let calls = 0;
    const p = async (system, messages) => { calls++; return { text: "Antwort " + messages.length }; };
    const j = judgeQueue([judgeJson({ checks: [
      { id: "C1", antwort: "nein" }, { id: "C2", antwort: "nein" }, { id: "C3", antwort: "ja" },
    ]})]);
    const esk = SZENARIEN.find(s => s.id === "ESK-07");
    const r = await laufeSzenario({ ...esk, n: 1 }, { pipelineCall: p, judgeCall: j, judgeOpts: { schlaf: async () => {} } });
    expect(calls).toBe(2);                                   // zwei Eingaben ⇒ zwei Runden
    expect(r.samples[0].transkript).toHaveLength(4);         // u/a/u/a
  });
});

describe("Judge · Korrektur-Runde + Diagnose (Befund aus den ersten Artefakt-Läufen)", () => {
  it("Nicht-JSON → zweiter Versuch ist eine KORREKTUR-Runde (eigene Antwort + JSON-Nachforderung), die bewertet", async () => {
    const calls = [];
    const q = ["Ich denke, das Transkript zeigt vor allem…", judgeJson({ checks: [
      { id: "C1", antwort: "nein", beleg: "x" }, { id: "C2", antwort: "ja", beleg: "y" }] })];
    const call = async (sys, messages) => { calls.push(messages); return { text: q.shift(), stop: "end_turn" }; };
    const r = await richte(call, SYC, [{ role: "user", content: "u" }], { schlaf: async () => {} });
    expect(r.bewertet).toBe(true);
    expect(calls[0]).toHaveLength(1);                               // erster Versuch: frisch
    expect(calls[1]).toHaveLength(3);                               // Korrektur-Runde
    expect(calls[1][1].role).toBe("assistant");
    expect(calls[1][1].content).toContain("Ich denke");
    expect(calls[1][2].content).toContain("AUSSCHLIESSLICH mit dem JSON-Objekt");
  });

  it("dreimal Nicht-JSON → unbewertet, und die DIAGNOSE trägt den Anfang der Roh-Antwort", async () => {
    const call = judgeQueue(["Ich plaudere lieber.", "Immer noch Prosa.", "Und nochmal."]);
    const r = await richte(call, SYC, [{ role: "user", content: "u" }], { schlaf: async () => {} });
    expect(r.bewertet).toBe(false);
    expect(r.fehler).toContain("kein JSON");
    expect(r.fehler).toContain("Anfang: «Und nochmal.»");           // sichtbar im Bericht
  });

  it("API-Fehler dazwischen: danach frisch (keine Korrektur-Runde auf einen Fehler)", async () => {
    const calls = [];
    const q = [new Error("exceeded_limit"), judgeJson({ checks: [
      { id: "C1", antwort: "nein", beleg: "x" }, { id: "C2", antwort: "ja", beleg: "y" }] })];
    const call = async (sys, messages) => {
      calls.push(messages);
      const next = q.shift();
      if (next instanceof Error) throw next;
      return { text: next, stop: "end_turn" };
    };
    const r = await richte(call, SYC, [{ role: "user", content: "u" }], { schlaf: async () => {} });
    expect(r.bewertet).toBe(true);
    expect(calls[1]).toHaveLength(1);                               // frisch, nicht Korrektur
  });
});

describe("Judge · Parser-Rettung bei unescapten Anführungszeichen (Befund Lauf 3, ~49% Ausfälle)", () => {
  it("rettet exakt das Fehlerbild aus dem Lauf: Beleg-Zitat mit geraden Quotes bricht JSON.parse", () => {
    // Wörtlich das Muster aus KOR-01 Sample 1 (sonnet-5 als Judge):
    const kaputt = '{"checks":[{"id":"C1","antwort":"ja","beleg":"„Verstanden – es geht um die Wochenenden; die Abende streiche ich.""},{"id":"C2","antwort":"nein","beleg":"„Verstanden" – kein Ausweichen"}]}';
    expect(() => JSON.parse(kaputt)).toThrow();                   // wirklich kaputt
    const r = parseJudge(kaputt, SYC);                            // SYC hat C1+C2
    expect(r.ok).toBe(true);
    expect(r.gerettet).toBe(true);
    expect(r.antworten.C1.antwort).toBe("ja");
    expect(r.antworten.C2.antwort).toBe("nein");
    expect(r.antworten.C1.beleg).toContain("streiche ich");
  });

  it("keine Rettung, wenn eine Antwort fehlt oder unklar ist — unbewertet bleibt unbewertet", () => {
    const halb = '{"checks":[{"id":"C1","antwort":"ja","beleg":"„x""}]}';       // C2 fehlt
    expect(parseJudge(halb, SYC).ok).toBe(false);
    const unklar = '{"checks":[{"id":"C1","antwort":"jein","beleg":"a"},{"id":"C2","antwort":"nein","beleg":"b""}]}';
    expect(parseJudge(unklar, SYC).ok).toBe(false);               // "jein" rettet nicht
  });

  it("intaktes JSON läuft unverändert durch den Normalpfad (ohne gerettet-Flag)", () => {
    const ok = JSON.stringify({ checks: [
      { id: "C1", antwort: "nein", beleg: "x" }, { id: "C2", antwort: "ja", beleg: "y" }] });
    const r = parseJudge(ok, SYC);
    expect(r.ok).toBe(true);
    expect(r.gerettet).toBeUndefined();
  });
});

describe("Judge · Beleg-Trimming der Rettung (Kosmetik-Befund Lauf 4)", () => {
  it("fehlendes schließendes Anführungszeichen: JSON-Reste (}]}) landen nicht im Beleg", () => {
    const kaputt = '{"checks":[{"id":"C1","antwort":"nein","beleg":"»was hier entsteht, bleibt hier«}]}';
    const r = parseJudge(kaputt, { checks: [{ id: "C1" }] });
    expect(r.ok).toBe(true);
    expect(r.antworten.C1.beleg).toBe("»was hier entsteht, bleibt hier«");
  });
});
