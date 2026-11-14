// @vitest-environment happy-dom
// EVAL-R1 · Fortsetzen innerhalb eines Laufs.
// Anlass (14.11.): Die Familie INT braucht so viele Aufrufe, dass ein Lauf oft
// mittendrin abbricht. Bisher ging dabei jedes angefangene Szenario ganz
// verloren, und weiter ging es nur auf Klick.
import { describe, it, expect, beforeEach } from "vitest";
import { createEvalApp } from "../../platforms/artifact/eval-app.js";
import { laufeSzenario } from "../../evals/runner-kern.js";
import { SZENARIEN } from "../../evals/szenarien/start-katalog.js";

const istJudge = system => [].concat(system).join("").startsWith("Du bist ein strenger");
const gruen = messages => {
  const id = /Szenario (\S+) v/.exec(messages.at(-1).content)[1];
  const sz = SZENARIEN.find(s => s.id === id);
  return { data: { checks: sz.checks.filter(c => !c.mass).map(c => ({ id: c.id, verdict: (c.verletztWenn || "ja") === "ja" ? "no" : "yes", evidence: "«x»" })) } };
};
const SZ = SZENARIEN.find(s => s.id === "SYC-05");
const ZUEGE = SZ.eingaben.length;   // Pipeline-Aufrufe je Sample

describe("EVAL-R1 · laufeSzenario mit Sample-Speicher", () => {
  const baue = stoerungBei => {
    let p = 0, j = 0;
    return {
      zaehler: () => ({ p, j }),
      pipelineCall: async () => { if (++p === stoerungBei) throw new Error("Permission denied"); return { text: "Antwort " + p + "." }; },
      judgeCall: async (system, messages) => { j++; return gruen(messages); },
    };
  };

  it("Abbruch im dritten Sample: zwei bleiben im Speicher, der zweite Aufruf spielt nur den Rest", async () => {
    const speicher = [];
    const a = baue(2 * ZUEGE + 1);
    await expect(laufeSzenario(SZ, { pipelineCall: a.pipelineCall, judgeCall: a.judgeCall, n: 5, sampleSpeicher: speicher })).rejects.toThrow("Permission denied");
    expect(speicher.map(s => s.nr)).toEqual([1, 2]);

    const b = baue(0);
    const r = await laufeSzenario(SZ, { pipelineCall: b.pipelineCall, judgeCall: b.judgeCall, n: 5, sampleSpeicher: speicher });
    expect(b.zaehler()).toEqual({ p: 3 * ZUEGE, j: 3 });          // nur Samples 3–5
    expect(r.samples.map(s => s.nr)).toEqual([1, 2, 3, 4, 5]);
    expect(r.n).toBe(5);
    expect(r.status).toBe("gruen");
  });

  it("ein Sample, dessen Judge ausfiel, wird beim Fortsetzen neu gespielt — es bleibt nicht »unbewertet« stehen", async () => {
    const speicher = [];
    let j = 0, p = 0;
    const opt = {
      pipelineCall: async () => { p++; return { text: "Antwort." }; },
      judgeCall: async (s, m) => { if (++j === 2) throw new Error("Permission denied"); return gruen(m); },
      n: 3, sampleSpeicher: speicher, judgeOpts: { versuche: 1, backoffMs: 0 },
    };
    const r1 = await laufeSzenario(SZ, opt);                      // der Judge-Ausfall bricht nicht ab: Sample 2 ist unbewertet
    expect(r1.unbewerteteSamples).toBe(1);
    const pVorher = p;
    const r2 = await laufeSzenario(SZ, opt);
    expect(p - pVorher).toBe(ZUEGE);                              // genau ein Sample nachgespielt
    expect(r2.unbewerteteSamples).toBe(0);
    expect(r2.samples.map(s => s.nr)).toEqual([1, 2, 3]);
  });

  it("ohne Speicher wie bisher: jeder Aufruf spielt alle Samples", async () => {
    const a = baue(0);
    const r1 = await laufeSzenario(SZ, { pipelineCall: a.pipelineCall, judgeCall: a.judgeCall, n: 2 });
    const r2 = await laufeSzenario(SZ, { pipelineCall: a.pipelineCall, judgeCall: a.judgeCall, n: 2 });
    expect(a.zaehler()).toEqual({ p: 4 * ZUEGE, j: 4 });
    expect(r1.samples).toHaveLength(2); expect(r2.samples).toHaveLength(2);
  });

  it("voller Speicher: kein einziger Aufruf mehr; ein kleineres n schneidet ab, statt zu überzählen", async () => {
    const speicher = [];
    const a = baue(0);
    await laufeSzenario(SZ, { pipelineCall: a.pipelineCall, judgeCall: a.judgeCall, n: 3, sampleSpeicher: speicher });
    const b = baue(0);
    const r = await laufeSzenario(SZ, { pipelineCall: b.pipelineCall, judgeCall: b.judgeCall, n: 2, sampleSpeicher: speicher });
    expect(b.zaehler()).toEqual({ p: 0, j: 0 });
    expect(r.samples).toHaveLength(2);
  });
});

describe("EVAL-R1 · Artefakt: Fortsetzen ab dem Sample, von selbst", () => {
  let root, t;
  const uhr = { jetzt: () => new Date(t), schlaf: async ms => { t += ms; } };   // künstliche Uhr: Warten kostet keine echte Zeit
  beforeEach(() => {
    document.body.innerHTML = '<div id="app" data-core-hash="h"></div>';
    root = document.getElementById("app");
    t = Date.UTC(2026, 10, 14, 9, 0, 0);
  });
  const vg = { id: "r1", titel: "R1", szenarien: ["SYC-05"], judge: "j", waechter: true, arme: [{ label: "a-n4", pm: "m", n: 4 }] };
  const stand = () => root.querySelector("#evVgStatus").textContent;
  const bis = async re => { for (let i = 0; i < 2000 && !re.test(stand()); i++) await new Promise(r => setTimeout(r, 0)); };
  const starte = (mach, v = vg) => {
    const app = createEvalApp({ doc: document, root, szenarien: SZENARIEN, machAdapter: mach, vorgabe: v, jetzt: uhr.jetzt, schlaf: uhr.schlaf });
    root.querySelector("#evRpm").value = "0";
    root.querySelector("#evPar").value = "1";
    return app;
  };

  it("zwei Abbrüche, kein Klick dazwischen: das Paket wird fertig, und kein Sample wird doppelt gespielt", async () => {
    let p = 0;
    const stoerungen = new Set([ZUEGE + 1, 3 * ZUEGE + 2]);   // im 2. und im 4. Sample (Zählung über alle Versuche)
    const mach = () => async (system, messages) => {
      if (istJudge(system)) return gruen(messages);
      if (stoerungen.has(++p)) throw new Error("Permission denied");
      return { text: "Antwort." };
    };
    const app = starte(mach);
    const t0 = t;
    root.querySelector("#evVorgabe").click();
    await bis(/Alle 1 Läufe fertig/);
    expect(stand()).toMatch(/Alle 1 Läufe fertig/);
    expect(p).toBe(4 * ZUEGE + 2);                               // 4 Samples + die zwei gescheiterten Aufrufe
    expect(app._state.berichte[0].szenarien[0].samples.map(s => s.nr)).toEqual([1, 2, 3, 4]);
    expect(app._state.berichte[0].abgebrochen).toBeUndefined();
    expect(t - t0).toBeGreaterThanOrEqual(60000);                 // zweimal 30 s gewartet
    expect(root.querySelector("#evHalt").style.display).toBe("none");
  });

  it("Nutzungslimit: wartet bis zur gemeldeten Rücksetzzeit, nicht nur 30 Sekunden", async () => {
    let p = 0;
    const reset = Math.floor(t / 1000) + 2 * 3600;
    const mach = () => async (system, messages) => {
      if (istJudge(system)) return gruen(messages);
      if (++p === 2) throw new Error(JSON.stringify({ type: "exceeded_limit", resetsAt: reset }));
      return { text: "Antwort." };
    };
    starte(mach);
    const t0 = t;
    root.querySelector("#evVorgabe").click();
    await bis(/Alle 1 Läufe fertig/);
    expect(stand()).toMatch(/Alle 1 Läufe fertig/);
    expect(t - t0).toBeGreaterThanOrEqual(2 * 3600 * 1000);
  });

  it("»Anhalten« beendet das Warten; der nächste Klick macht dort weiter", async () => {
    let p = 0, fehler = true;
    const mach = () => async (system, messages) => {
      if (istJudge(system)) return gruen(messages);
      p++;
      if (fehler && p === ZUEGE + 1) { fehler = false; throw new Error("Permission denied"); }
      return { text: "Antwort." };
    };
    const langsam = { jetzt: uhr.jetzt, schlaf: async () => { await new Promise(r => setTimeout(r, 0)); } };   // die Uhr steht: das Warten endet nie von selbst
    createEvalApp({ doc: document, root, szenarien: SZENARIEN, machAdapter: mach, vorgabe: vg, jetzt: langsam.jetzt, schlaf: langsam.schlaf });
    root.querySelector("#evRpm").value = "0";
    root.querySelector("#evVorgabe").click();
    await bis(/Macht von selbst weiter in/);
    expect(stand()).toMatch(/0 Szenarien, 1 Samples fertig/);
    expect(root.querySelector("#evHalt").style.display).toBe("");
    root.querySelector("#evHalt").click();
    await bis(/Angehalten/);
    expect(stand()).toMatch(/Angehalten/);
    const vorher = p;
    root.querySelector("#evVorgabe").click();
    await bis(/Alle 1 Läufe fertig/);
    expect(p - vorher).toBe(3 * ZUEGE);                           // nur die drei fehlenden Samples
  });

  it("acht Versuche ohne ein neues Sample: hört auf und sagt, warum", async () => {
    let p = 0;
    const mach = () => async (system, messages) => {
      if (istJudge(system)) return gruen(messages);
      p++;
      throw new Error("Permission denied");
    };
    starte(mach);
    root.querySelector("#evVorgabe").click();
    await bis(/Aufgegeben/);
    expect(stand()).toMatch(/8 Versuche ohne ein neues Sample/);
    expect(stand()).toMatch(/Permission denied/);
    expect(p).toBe(8);
    expect(root.querySelector("#evVorgabe").disabled).toBe(false);
  });

  it("ohne den Haken bleibt es beim Fortsetzen auf Klick", async () => {
    let p = 0, fehler = true;
    const mach = () => async (system, messages) => {
      if (istJudge(system)) return gruen(messages);
      if (++p === 2 && fehler) { fehler = false; throw new Error("Permission denied"); }
      return { text: "Antwort." };
    };
    starte(mach);
    root.querySelector("#evAuto").checked = false;
    const t0 = t;
    root.querySelector("#evVorgabe").click();
    await bis(/Angehalten/);
    expect(stand()).toMatch(/erneut klicken fährt nur die fehlenden Samples nach/);
    expect(t).toBe(t0);
  });

  it("ein Eingabefehler löst kein Warten aus", async () => {
    const mach = () => async () => ({ text: "x" });
    starte(mach, { ...vg, judge: "m" });                          // Judge = Pipeline, ohne Haken
    const t0 = t;
    root.querySelector("#evVorgabe").click();
    await bis(/Angehalten/);
    expect(stand()).toMatch(/Angehalten/);
    expect(t).toBe(t0);
    expect(root.querySelector("#evStatus").textContent).toMatch(/Judge-Trennung/);
  });

  it("ein unbewertetes Sample wird einmal nachgespielt, bevor das Szenario als fertig gilt", async () => {
    let j = 0, p = 0;
    const mach = () => async (system, messages) => {
      if (istJudge(system)) { if (++j <= 3) throw new Error("Permission denied"); return gruen(messages); }   // erster Judge-Aufruf scheitert in allen drei Versuchen
      p++;
      return { text: "Antwort." };
    };
    const app = starte(mach);
    root.querySelector("#evVorgabe").click();
    // Der Judge wiederholt mit echter Wartezeit (richte: Backoff) — hier wird wirklich gewartet.
    for (let i = 0; i < 900 && !/Alle 1 Läufe fertig/.test(stand()); i++) await new Promise(r => setTimeout(r, 20));
    const sz = app._state.berichte[0].szenarien[0];
    expect(sz.unbewerteteSamples).toBe(0);
    expect(sz.samples.map(s => s.nr)).toEqual([1, 2, 3, 4]);
    expect(p).toBe(5 * ZUEGE);                                    // vier Samples + das eine nachgespielte
  }, 20000);

  it("der Abbruch-Status nennt die geretteten Samples", async () => {
    let p = 0;
    const mach = () => async (system, messages) => {
      if (istJudge(system)) return gruen(messages);
      if (++p === 2 * ZUEGE + 1) throw new Error("Permission denied");
      return { text: "Antwort." };
    };
    starte(mach);
    root.querySelector("#evAuto").checked = false;
    root.querySelector("#evVorgabe").click();
    await bis(/Angehalten/);
    expect(root.querySelector("#evStatus").textContent).toMatch(/2 fertige Samples aus angefangenen Szenarien gerettet/);
  });
});
