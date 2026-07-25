// @vitest-environment happy-dom
// S96.1 · Gate-Panel: konstantes Wege-Menü und engine-freie Freigabe.
//
// Zwei Zusicherungen, die sich nicht aus der Logik ergeben, sondern aus der
// Oberfläche:
//   (1) Das Menü zeigt IMMER alle Wege — ein vom Modell kuratiertes Menü war
//       eine unsichtbare Verengung; wer nicht sieht, dass es einen Weg gibt,
//       kann ihn nicht wählen.
//   (2) Die Freigabe läuft ohne Engine. Ohne diese Trennung liesse sich der
//       Replay-Eingang nur mit einer zweiten Freigabestrecke anschliessen.

import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";
import { MockLLM } from "../../core/engine/mock-llm.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { freigebeUebergabe } from "../../core/engine/freigabe.js";
import { uebergabeTeilKey } from "../../core/contracts/uebergabe.js";
import { cleanDisplay } from "../../core/contracts/block.js";
import { entferneSteuerToken, offeneKlammerAbIndex } from "../../core/contracts/steuertoken.js";
import { ALLE_BLOECKE } from "../../core/contracts/registry.js";
import { DESIGN_CSS } from "../../core/ui/design.js";
import { steuerTexte, reflexionsPrompt } from "../../core/prompts/prompts.de.js";
import { steuerTexte as steuerTexteEn, reflexionsPrompt as reflexionsPromptEn } from "../../core/prompts/prompts.en.js";

function memoryBackend(mock, role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "s93", activeModuleId: "betrieb" });
  const bstate = new Bstate(repo), pstate = new Pstate(repo);
  return {
    store, repo,
    async info() { return { role, name: "Anna", partner: "Bernd", nameA: "Anna", nameB: "Bernd" }; },
    bstate: { get: f => bstate.get(f), set: (f, v) => bstate.set(f, v) },
    pstate: { get: f => pstate.get(role, f), set: (f, v) => pstate.set(role, f, v) },
    chat: {
      load: (art, id) => repo.get("chat:" + (art === "shared" ? id : role + ":" + id), art === "shared"),
      save: (art, id, c) => repo.set("chat:" + (art === "shared" ? id : role + ":" + id), c, art === "shared"),
    },
    handover: { post: d => freigebeUebergabe(repo, role, d), get: r => repo.get(uebergabeTeilKey(r), true, "kernwetten") },
    llm: mock ? mock.fn() : (async () => ({ text: "ok", stop: "end_turn" })),
  };
}

const tick = () => new Promise(r => setTimeout(r, 0));
async function klick(el) { el.click(); await tick(); await tick(); await tick(); }
const ruhe = async (n = 8) => { for (let i = 0; i < n; i++) await tick(); };

let root;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app");
});

async function bootApp(backend) {
  const app = createApp({ doc: document, backend, root });
  await app.boot();
  await ruhe();
  return app;
}

const TIMELINE = JSON.stringify({
  summary: "Anna hat über die Abende gesprochen.", topics: ["Abende"],
  recurrenceNote: null, goals: [],
});
const MOMENT = JSON.stringify({
  summary: "Ein ruhiger Abend.", topics: ["Abend"], addressed: [], deferred: [],
  selfResolved: [], shift: null, gentleInvitation: null,
});

/* ─────────────────────── A1 · Steuer-Token ─────────────────────── */

const GATE_OHNE_PATHS = JSON.stringify({
  wording: "Ich vermisse gemeinsame Abende.",
  wish: null, reasoning: "Gewissheit herausgenommen.",
  criteria: { characterJudgment: false, generalization: false, situationSpecific: true, ownShare: true },
});

const GATE_MIT_ENGEM_PATHS = JSON.stringify({
  wording: "Ich vermisse gemeinsame Abende.",
  wish: null, reasoning: "Gewissheit herausgenommen.",
  criteria: { characterJudgment: false, generalization: false, situationSpecific: true, ownShare: true },
  paths: ["shelf"],
});

const wege = panel => [...panel.querySelectorAll("input[data-weg]")].map(x => x.getAttribute("data-weg"));

describe("S96.1 · konstantes Wege-Menü", () => {
  it("zeigt alle drei Wege, auch wenn der Block gar keine nennt", async () => {
    const app = await bootApp(memoryBackend(new MockLLM(["Fassung.\nGATE-BLOCK\n" + GATE_OHNE_PATHS + "\nEND GATE-BLOCK"])));
    await app.startChat("solo");
    await ruhe();
    expect(wege(root.querySelector("#gatePanel"))).toEqual(["selbst", "shelf", "moment"]);
  });

  it("ein mitgeschicktes, engeres paths verengt das Menü NICHT", async () => {
    // Genau der Fall, der bis S95.3b unsichtbar blieb: Das Modell schlug nur
    // "shelf" vor, und der Moment-Weg existierte für die Person nicht.
    const app = await bootApp(memoryBackend(new MockLLM(["Fassung.\nGATE-BLOCK\n" + GATE_MIT_ENGEM_PATHS + "\nEND GATE-BLOCK"])));
    await app.startChat("solo");
    await ruhe();
    expect(wege(root.querySelector("#gatePanel"))).toEqual(["selbst", "shelf", "moment"]);
  });

  it("die Beschriftungen nennen die FOLGE und den Partner beim Namen", async () => {
    const app = await bootApp(memoryBackend(new MockLLM(["Fassung.\nGATE-BLOCK\n" + GATE_OHNE_PATHS + "\nEND GATE-BLOCK"])));
    await app.startChat("solo");
    await ruhe();
    const txt = root.querySelector("#gatePanel").textContent;
    expect(txt).toContain("lesen");                 // Regal: Angebot
    expect(txt).toContain("Gespräch");              // Moment: kommt zur Sprache
    expect(txt).not.toContain("{partner}");         // Platzhalter aufgelöst
    expect(txt).not.toContain("Agenda");            // Ort statt Folge — abgeschafft
  });
});

describe("S96.1 · Freigabe legt eine Freigabe mit Karenz an", () => {
  it("gequertes Material liegt beim Partner erst nach der Karenz", async () => {
    const backend = memoryBackend(new MockLLM(["Fassung.\nGATE-BLOCK\n" + GATE_OHNE_PATHS + "\nEND GATE-BLOCK", "Gut."]));
    const app = await bootApp(backend);
    await app.startChat("solo");
    await ruhe();
    const panel = root.querySelector("#gatePanel");
    const Ev = document.defaultView.Event;
    const box = panel.querySelector('input[data-weg="shelf"]');
    box.checked = true; box.dispatchEvent(new Ev("change"));
    panel.querySelector("#btnGateOk").click();
    await ruhe();

    const regal = (await backend.bstate.get("shelf")) || { items: [] };
    expect(regal.items).toHaveLength(1);
    expect(regal.items[0].visibleFrom).toBeTruthy();          // Karenz gesetzt
    expect(regal.items[0].freigabe).toBeTruthy();             // Klammer gesetzt
    expect(Date.parse(regal.items[0].visibleFrom)).toBeGreaterThan(Date.now());
  });

  it("beide Fächer tragen dieselbe Klammer — ein Klick, eine Freigabe", async () => {
    const backend = memoryBackend(new MockLLM(["Fassung.\nGATE-BLOCK\n" + GATE_OHNE_PATHS + "\nEND GATE-BLOCK", "Gut."]));
    const app = await bootApp(backend);
    await app.startChat("solo");
    await ruhe();
    const panel = root.querySelector("#gatePanel");
    const Ev = document.defaultView.Event;
    for (const w of ["shelf", "moment"]) {
      const b = panel.querySelector(`input[data-weg="${w}"]`);
      b.checked = true; b.dispatchEvent(new Ev("change"));
    }
    panel.querySelector("#btnGateOk").click();
    await ruhe();

    const regal = await backend.bstate.get("shelf");
    const agenda = await backend.bstate.get("agenda");
    expect(regal.items).toHaveLength(1);
    expect(agenda.items).toHaveLength(1);
    expect(agenda.items[0].freigabe).toBe(regal.items[0].freigabe);
    expect(agenda.items[0].visibleFrom).toBeTruthy();
  });
});
