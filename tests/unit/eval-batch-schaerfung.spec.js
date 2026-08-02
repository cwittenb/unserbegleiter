// Der Batch-Pfad misst, was die App tut (MRV, ersetzt S95).
//
// S95 hatte eine Revisions-Welle in den Batch gebracht: Griff ein Wächter,
// wurde die Antwort verworfen und in einer zweiten Welle neu geschrieben.
// Seit S105.3 gibt es das nicht mehr — nichts wird zurückgenommen.
//
// An ihre Stelle treten zwei Dinge, die BEIDE ohne zusätzliche Welle
// auskommen:
//   · Die SCHÄRFUNG hängt am Systemtext der Anfrage, je Zug neu entschieden.
//   · Die ÜBERGABE-Prüfung läuft nach der Antwort und vermerkt nur eine Spur.
//
// Das ist auch der Grund, warum der Batch-Pfad jetzt genauso viel misst wie
// der synchrone: Der Unterschied war nie die Wächterlogik, sondern die Frage,
// ob eine zweite Welle nötig ist. Sie ist es nicht mehr.

import { describe, it, expect } from "vitest";
import { laufeAlleBatch } from "../../evals/runner-batch.js";
import { SZENARIEN } from "../../evals/szenarien/start-katalog.js";

const LEAK = SZENARIEN.find(s => s.id === "LEAK-S1");   // solo, ein Check (C1)
const MRV2 = SZENARIEN.find(s => s.id === "MRV-02");    // moment, Zweiseitigkeit

/* MOMENT-BLOCK statt TIMELINE-BLOCK: Die Qualitätszeit prüft OHNE Anlass
   (anlassNoetig: false), das Reflexionsgespräch braucht ein [CLOSE SESSION] im
   Verlauf — das haben die Szenarien hier nicht. */
const MB = JSON.stringify({
  summary: "x", topics: ["A"], addressed: [], deferred: [], selfResolved: [],
  shift: null, gentleInvitation: null,
});
const ABSCHLUSS_MIT_FRAGE = "Magst du das behalten?\nMOMENT-BLOCK\n" + MB + "\nEND MOMENT-BLOCK";
const SAUBER = "Für mich klingt das nach einem Schritt – wie war das für dich?";

const nachricht = (text, usage = { input_tokens: 100, output_tokens: 20 }) =>
  ({ content: [{ type: "text", text }], usage, stop_reason: "end_turn" });
const urteilNachricht = () => ({
  content: [{ type: "tool_use", name: "judge_bewertung", input: { checks: [{ id: "C1", verdict: "no", evidence: "«ok»" }] } }],
  stop_reason: "tool_use", usage: { input_tokens: 1, output_tokens: 1 },
});

/** Batch-Attrappe: schneidet alle Wellen mit. */
function attrappe(antwort) {
  const wellen = [];
  const fn = async requests => {
    wellen.push(requests);
    const map = new Map();
    for (const r of requests)
      map.set(r.custom_id, r.custom_id.startsWith("j_")
        ? { message: urteilNachricht() }
        : { message: nachricht(antwort(r.custom_id, requests)) });
    return map;
  };
  fn.wellen = wellen;
  return fn;
}

const laufe = (szenario, fuehreBatch, mehr = {}) => laufeAlleBatch([szenario], {
  pipelineModell: "claude-sonnet-5", judgeModell: "claude-opus-4-8",
  stand: { coreHash: "x" }, batch: {}, fuehreBatch, ...mehr,
});

/** Systemtexte aller Pipeline-Anfragen, als Strings.
 *  Der Anthropic-Body trägt `system` als Array von Textblöcken (Cache-Marken) —
 *  hier wird es wieder zu Text zusammengezogen. */
const systeme = wellen => wellen.flat()
  .filter(r => r.custom_id.startsWith("p_"))
  .map(r => {
    const sys = r.params.system;
    return typeof sys === "string" ? sys : (sys || []).map(b => b.text || "").join("\n");
  });

describe("Batch · Keine Revisions-Welle mehr", () => {
  it("auch mit Flag entsteht keine r_-Welle", async () => {
    /* Der Kern von S105.3 im Batch: Ein Treffer lässt den Text stehen. Damit
       fällt die zweite Welle weg — und mit ihr die Sonderbehandlung, was
       geschieht, wenn sie scheitert. */
    const f = attrappe(() => ABSCHLUSS_MIT_FRAGE);
    await laufe({ ...MRV2, n: 1 }, f, { waechter: true });
    expect(f.wellen.flat().some(r => r.custom_id.startsWith("r_"))).toBe(false);
  });

  it("die Antwort steht unverändert im Transkript — mit Spur", async () => {
    const f = attrappe(() => ABSCHLUSS_MIT_FRAGE);
    const b = await laufe({ ...MRV2, n: 1 }, f, { waechter: true });
    const zug = b.szenarien[0].samples[0].transkript.find(m => m.role === "assistant");
    expect(zug.content).toBe(ABSCHLUSS_MIT_FRAGE);
    expect(zug.waechterTreffer).toBe("abschluss-mit-frage");
  });

  it("ohne Treffer keine Spur", async () => {
    const f = attrappe(() => SAUBER);
    const b = await laufe({ ...MRV2, n: 1 }, f, { waechter: true });
    const zug = b.szenarien[0].samples[0].transkript.find(m => m.role === "assistant");
    expect(zug.waechterTreffer).toBeUndefined();
  });

  it("ohne Flag wird gar nicht geprüft", async () => {
    const f = attrappe(() => ABSCHLUSS_MIT_FRAGE);
    const b = await laufe({ ...MRV2, n: 1 }, f);
    const zug = b.szenarien[0].samples[0].transkript.find(m => m.role === "assistant");
    expect(zug.waechterTreffer).toBeUndefined();
  });
});

describe("Batch · Die Schärfung hängt am Systemtext des Zuges", () => {
  it("mit Flag trägt der Zug nach der Verfügung den Zusatz — der davor nicht", async () => {
    // MRV-02: Bernd sagt, seine Reflexion fehlt; Anna verfügt darüber.
    const f = attrappe(() => SAUBER);
    await laufe({ ...MRV2, n: 1 }, f, { waechter: true });
    const s = systeme(f.wellen);
    expect(s.length).toBeGreaterThanOrEqual(3);
    expect(s[0]).not.toContain("APP-HINWEIS");
    expect(s[1]).not.toContain("APP-HINWEIS");
    expect(s[2]).toContain("KEINE Leitung");
  });

  it("ohne Flag bleibt der Systemtext in jedem Zug derselbe", async () => {
    const f = attrappe(() => SAUBER);
    await laufe({ ...MRV2, n: 1 }, f);
    const s = systeme(f.wellen);
    expect(new Set(s).size, "alle Züge derselbe Systemtext").toBe(1);
  });

  it("der Zusatz geht NICHT in den Verlauf", async () => {
    const f = attrappe(() => SAUBER);
    const b = await laufe({ ...MRV2, n: 1 }, f, { waechter: true });
    expect(JSON.stringify(b.szenarien[0].samples[0].transkript)).not.toContain("APP-HINWEIS");
  });
});

describe("Batch · Wellen-Reihenfolge und Anomalien", () => {
  it("Pipeline-Turns, dann Judge — dazwischen nichts", async () => {
    const f = attrappe(() => SAUBER);
    await laufe({ ...MRV2, n: 1 }, f, { waechter: true });
    const art = f.wellen.map(w => w[0].custom_id[0]);
    expect(art).toEqual(["p", "p", "p", "j"]);
  });

  it("eine leere Antwort löst keine Prüfung aus (S65 geht vor)", async () => {
    const f = attrappe(() => "");
    const b = await laufe({ ...LEAK, n: 1 }, f, { waechter: true });
    const zug = b.szenarien[0].samples[0].transkript.find(m => m.role === "assistant");
    expect(zug.waechterTreffer).toBeUndefined();
  });
});
