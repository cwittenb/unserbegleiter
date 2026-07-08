// @vitest-environment happy-dom
// Auftragsklärung — komplette Panel-Drehbücher headless (echte App + Engine).

import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";
import { MockLLM } from "../../core/engine/mock-llm.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { freigebeUebergabe } from "../../core/engine/freigabe.js";
import { uebergabeTeilKey } from "../../core/contracts/uebergabe.js";
import { reglerErgebnis, rankingErgebnis, startwerteErgebnis, RANK_ITEMS, RANK_MODES } from "../../core/ui/kernwetten.js";
import { DOMAINS } from "../../core/prompts/prompts.js";

function memoryBackend(mock, role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "kw", activeModuleId: "betrieb" });
  const bstate = new Bstate(repo), pstate = new Pstate(repo);
  return {
    store, repo,
    async info() { return { role, name: "Anna", partner: "Bernd", nameA: "Anna", nameB: "Bernd" }; },
    bstate: { get: f => bstate.get(f), set: (f, v) => bstate.set(f, v) },
    pstate: { get: f => pstate.get(role, f), set: (f, v) => pstate.set(role, f, v) },
    chat: { load: () => null, save: () => true },
    uebergabe: { post: d => freigebeUebergabe(repo, role, d), get: r => repo.get(uebergabeTeilKey(r), true, "kernwetten") },
    llm: mock.fn(),
  };
}

const tick = () => new Promise(r => setTimeout(r, 0));
async function klick(el) { el.click(); await tick(); await tick(); await tick(); }
let root;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app");
});

async function starteEinzel(mock, backend) {
  const app = createApp({ doc: document, backend, root });
  await app.boot();
  await klick(root.querySelector("#btnMyRoom"));
  await klick(root.querySelector("#btnEinzel"));
  return app;
}

describe("Ergebnisformate (Modell-Kontrakt, 1:1 v0.29)", () => {
  it("SLIDERS-RESULT: 13 Zeilen, Spektrum-Text bei Gegensatzpaaren, qualitativ-spiegeln-Hinweis", () => {
    const vals = DOMAINS.map(() => ({ w: 7, z: 3 }));
    const r = reglerErgebnis(vals, "Anna");
    expect(r).toContain("SLIDERS-RESULT");
    expect(r).toContain("Anna hat keine Zahlen gesehen");
    expect(r.split("\n")).toHaveLength(DOMAINS.length + 1);
    const paar = DOMAINS.findIndex(d => d.poles);
    expect(r.split("\n")[paar + 1]).toContain("Spektrum: 1=");
    expect(r).toContain("Wichtigkeit 7 · Zufriedenheit 3");
  });

  it("Ranking-Modi: topN 5/3/1, getrennte Pole, korrekte Ergebnis-Präfixe", () => {
    expect(RANK_MODES.self.topN).toBe(5);
    expect(RANK_MODES.pwichtig.topN).toBe(3);
    expect(RANK_MODES.punzufrieden.topN).toBe(1);
    expect(RANK_ITEMS.length).toBeGreaterThan(DOMAINS.length);   // Pole getrennt
    const ctx = { me: "Anna", partner: "Bernd" };
    expect(rankingErgebnis("self", [0, 1, 2, 3, 4], ctx)).toContain("RANKING-RESULT – Top 5");
    expect(rankingErgebnis("pwichtig", [0, 1, 2], ctx)).toContain("PARTNER-GUESS (Top 3, geraten von Anna");
    expect(rankingErgebnis("punzufrieden", [0], ctx)).toContain("PARTNER-GUESS-CHANGE");
    expect(rankingErgebnis("self", [1, 0, 2, 3, 4], ctx).split("\n")[1]).toBe("1. " + RANK_ITEMS[1].label);
  });

  it("BASELINE-RESULT trägt beide Namen und Werte", () => {
    const r = startwerteErgebnis("Anna", 4, "Bernd", 7);
    expect(r).toContain("Anna: 4");
    expect(r).toContain("Bernd: 7");
    expect(r).toContain("gleichzeitig aufgedeckt");
  });
});

describe("UI · Regler-Panel-Drehbuch", () => {
  it("[[SLIDERS]] öffnet das Panel; Durchlauf durch alle 13 Bereiche sendet GENAU EIN SLIDERS-RESULT", async () => {
    const mock = new MockLLM([
      "Es kommen jetzt die Lebensbereiche.\n[[SLIDERS]]",
      "Danke für deine Einschätzungen!",
    ]);
    const backend = memoryBackend(mock);
    await starteEinzel(mock, backend);
    const p = root.querySelector("#kwPanel");
    expect(p.classList.contains("pb-hidden")).toBe(false);
    expect(p.textContent).toContain("Bereich 1 von " + DOMAINS.length);
    expect(p.querySelector("#kwNext").disabled).toBe(true);      // erst anfassen

    for (let i = 0; i < DOMAINS.length; i++) {
      p.querySelector("#kwW").value = "8"; p.querySelector("#kwW").dispatchEvent(new Event("input"));
      p.querySelector("#kwZ").value = "3"; p.querySelector("#kwZ").dispatchEvent(new Event("input"));
      expect(p.querySelector("#kwNext").disabled).toBe(false);
      await klick(p.querySelector("#kwNext"));
    }
    expect(p.classList.contains("pb-hidden")).toBe(true);
    const userMsgs = mock.calls[1].messages.filter(m => m.role === "user");
    const letzte = userMsgs[userMsgs.length - 1];
    expect(letzte.content).toContain("SLIDERS-RESULT");
    expect(letzte.content).toContain("Wichtigkeit 8 · Zufriedenheit 3");
    expect(letzte.slider).toBe(true);
    expect(userMsgs.filter(m => m.content.includes("SLIDERS-RESULT"))).toHaveLength(1);   // genau EINE
  });
});

describe("UI · Ranking-Panel-Drehbuch", () => {
  it("[[RANKING]] → 5 Chips stapeln (Fertig erst bei 5), ✕ entfernt, Ergebnis in Stapel-Reihenfolge", async () => {
    const mock = new MockLLM([
      "Jetzt sortieren statt bewerten.\n[[RANKING]]",
      "Danke!",
    ]);
    await starteEinzel(mock, memoryBackend(mock));
    const p = root.querySelector("#kwPanel");
    expect(p.textContent).toContain("am meisten am Herzen");

    const nimm = async n => { await klick(p.querySelector('[data-rein="' + n + '"]')); };
    await nimm(0); await nimm(1); await nimm(2); await nimm(3);
    expect(p.querySelector("#kwRankOk").disabled).toBe(true);    // erst 4 von 5
    await klick(p.querySelector('[data-raus="1"]'));             // eins wieder raus
    await nimm(4); await nimm(5);
    expect(p.querySelector("#kwRankOk").disabled).toBe(false);
    await klick(p.querySelector("#kwRankOk"));

    const userMsgs = mock.calls[1].messages.filter(m => m.role === "user");
    const letzte = userMsgs[userMsgs.length - 1].content;
    expect(letzte).toContain("RANKING-RESULT – Top 5");
    expect(letzte).toContain("1. " + RANK_ITEMS[0].label);
    expect(letzte).toContain("2. " + RANK_ITEMS[2].label);       // Item 1 wurde entfernt
  });

  it("[[PARTNER-RANKING]] (spezifisch vor generisch) öffnet den Vermutungs-Modus mit Top 3", async () => {
    const mock = new MockLLM(["Jetzt rätst du für Bernd.\n[[PARTNER-RANKING]]", "Danke!"]);
    await starteEinzel(mock, memoryBackend(mock));
    const p = root.querySelector("#kwPanel");
    expect(p.textContent).toContain("Bernd vermutlich am meisten am Herzen");
    for (const n of [2, 5, 7]) await klick(p.querySelector('[data-rein="' + n + '"]'));
    await klick(p.querySelector("#kwRankOk"));
    const userMsgs = mock.calls[1].messages.filter(m => m.role === "user");
    expect(userMsgs[userMsgs.length - 1].content).toContain("PARTNER-GUESS (Top 3, geraten von Anna");
  });
});

describe("UI · Freigabe-Drehbuch (CLOSURE → handover)", () => {
  const CLOSURE = JSON.stringify({
    items: [
      { id: "S1", text: "Nähe sehr wichtig, dort unzufrieden", tag: "FirstTake" },
      { id: "S2", text: "Verlässlichkeit trägt", tag: "Ranking" },
      { id: "G1", text: "Bernd wünscht sich vermutlich mehr gemeinsame Ruhe" },
    ],
  });

  it("Abwählen wirkt: nur angekreuzte Items queren; Fremdfelder (tag) queren NIE; Session released", async () => {
    const mock = new MockLLM([
      "Hier deine Übersicht.\nCLOSURE-BLOCK\n" + CLOSURE + "\nEND CLOSURE-BLOCK",
      "Danke fürs Teilen – ich freue mich auf euer Gespräch.",
    ]);
    const backend = memoryBackend(mock);
    const app = await starteEinzel(mock, backend);
    const p = root.querySelector("#kwPanel");
    expect(p.classList.contains("pb-hidden")).toBe(false);
    expect(p.querySelectorAll("input[type=checkbox]")).toHaveLength(3);

    p.querySelector('[data-fg="1"]').checked = false;            // S2 NICHT freigeben
    await klick(p.querySelector("#kwFgOk"));

    const u = await backend.uebergabe.get("A");
    expect(u.items.map(x => x.id)).toEqual(["S1", "G1"]);
    expect(JSON.stringify(u)).not.toContain("FirstTake");    // tag quert nicht (Vertrag 3)
    expect(JSON.stringify(u)).not.toContain("Verlässlichkeit");  // abgewähltes Item fehlt
    expect(app._state.engine.chat.status).toBe("released");
    const userMsgs = mock.calls[1].messages.filter(m => m.role === "user");
    expect(userMsgs[userMsgs.length - 1].content).toContain("2 von 3 Punkten freigegeben");
  });

  it("„Noch nicht\" gibt NICHTS frei und lässt die Session offen", async () => {
    const mock = new MockLLM([
      "CLOSURE-BLOCK\n" + CLOSURE + "\nEND CLOSURE-BLOCK",
      "Gut, dann schauen wir nochmal gemeinsam drauf.",
    ]);
    const backend = memoryBackend(mock);
    const app = await starteEinzel(mock, backend);
    await klick(root.querySelector("#kwPanel").querySelector("#kwFgNein"));
    expect(await backend.uebergabe.get("A")).toBeNull();
    expect(app._state.engine.chat.status).toBe("running");
  });
});

describe("UI · Gemeinsame Klärung (Startwerte + CLARIFICATION)", () => {
  it("[[BASELINE]] erhebt verdeckt nacheinander und deckt gleichzeitig auf; CLARIFICATION persistiert Befund", async () => {
    const befund = JSON.stringify({
      findings: [{ typ: "treffer", text: "Beide: Verlässlichkeit zentral" }],
      triangulation: { proposed: 1, confirmed: 1, adjusted: 0, declined: 0 },
      sharedGoal: { text: "Wöchentlicher Abend nur für uns", confirmedByBoth: true, baseline: { A: 4, B: 7 } },
      individualGoals: [],
      misalignedAssumptions: { present: false },
      closingCheck: [{ person: "Anna", value: 8 }, { person: "Bernd", value: 7 }],
    });
    const mock = new MockLLM([
      "Der Auftrag trägt für euch beide — jetzt verdeckt die Startwerte.\n[[BASELINE]]",
      "CLARIFICATION-BLOCK\n" + befund + "\nEND CLARIFICATION-BLOCK",
    ]);
    const backend = memoryBackend(mock);
    const app = createApp({ doc: document, backend, root });
    await app.boot();
    await klick(root.querySelector("#btnSharedRoom"));
    await klick(root.querySelector("#btnGemeinsam"));

    const p = root.querySelector("#kwPanel");
    expect(p.textContent).toContain("bitte nur Anna schauen");
    p.querySelector("#kwSW").value = "4";
    await klick(p.querySelector("#kwSWok"));
    expect(p.textContent).toContain("bitte nur Bernd schauen");   // verdeckt nacheinander
    p.querySelector("#kwSW").value = "7";
    await klick(p.querySelector("#kwSWok"));

    const userMsgs = mock.calls[1].messages.filter(m => m.role === "user");
    expect(userMsgs[userMsgs.length - 1].content).toContain("Anna: 4");
    expect(userMsgs[userMsgs.length - 1].content).toContain("Bernd: 7");

    const gespeichert = await backend.bstate.get("befund");
    expect(gespeichert.sharedGoal.confirmedByBoth).toBe(true);
    expect(app._state.engine.chat.status).toBe("finished");
  });
});
