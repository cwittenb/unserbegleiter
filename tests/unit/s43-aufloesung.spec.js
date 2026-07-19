// @vitest-environment happy-dom
// S43 · Gemeinsame Auflösung mit integrierter Aufdeckung: ein Button statt
// zwei; die Aufdeck-Tafel ist Auftakt-Kapitel (REVEAL-CONTEXT im Klärungs-
// Kontext), der Pfad kollabiert unsichtbar ohne beidseitige Wahl; die
// Wegweiser-Zeile im Vorraum ist zustandsabhängig; Agenda-Regal v2 trennt
// Aufträge, Gesprächspunkte und Backlog.

import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";
import { MockLLM } from "../../core/engine/mock-llm.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { freigebeUebergabe } from "../../core/engine/freigabe.js";
import { uebergabeTeilKey } from "../../core/contracts/uebergabe.js";
import { baueKlaerungsKontext } from "../../core/ui/kernwetten.js";

function memoryBackend(mock, role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "s43", activeModuleId: "betrieb" });
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

async function beideFreigaben(backend) {
  await freigebeUebergabe(backend.repo, "A", { module: "kernwetten", name: "Anna", items: [{ id: "S1", text: "Nähe", tag: "FirstTake" }] });
  await freigebeUebergabe(backend.repo, "B", { module: "kernwetten", name: "Bernd", items: [{ id: "S1", text: "Ruhe", tag: "FirstTake" }] });
}
const REVEAL = { A: { name: "Anna", top5: ["Nähe"], guess3: ["Ruhe"] }, B: { name: "Bernd", top5: ["Ruhe"], guess3: ["Nähe"] } };

describe("S43 · Integrierter Aufdeck-Auftakt", () => {
  it("beide gewählt, noch nicht gelaufen → REVEAL-CONTEXT wandert in den Klärungs-Kontext", async () => {
    const mock = new MockLLM(["Willkommen zu eurer Auflösung."]);
    const backend = memoryBackend(mock);
    await beideFreigaben(backend);
    await backend.bstate.set("reveal", REVEAL);
    const app = await bootApp(backend);
    await app.startChat("gemeinsam");
    await ruhe();
    const kontext = app._state.engine.chat.messages.find(m => m.hidden && m.content.includes("HANDOVER-BLOCK"));
    expect(kontext.content).toContain("AUFDECKUNG STEHT AUS");
    expect(kontext.content).toContain("REVEAL-CONTEXT");
    expect(root.querySelector("#pbMsgs").textContent).not.toContain("AUFDECKUNG STEHT AUS");
  });

  it("kollabierter Pfad: ohne beidseitige Wahl KEIN Aufdeck-Material im Kontext (unsichtbar, warum)", async () => {
    const mock = new MockLLM(["Willkommen zu eurer Auflösung."]);
    const backend = memoryBackend(mock);
    await beideFreigaben(backend);
    await backend.bstate.set("reveal", { A: REVEAL.A });   // nur Anna hat gewählt
    const app = await bootApp(backend);
    await app.startChat("gemeinsam");
    await ruhe();
    const kontext = app._state.engine.chat.messages.find(m => m.hidden && m.content.includes("HANDOVER-BLOCK"));
    expect(kontext.content).not.toContain("AUFDECKUNG");
    expect(kontext.content).not.toContain("REVEAL-CONTEXT");
  });

  it("gelaufene Aufdeckung → REVEAL-PROTOCOL statt Auftakt", async () => {
    const mock = new MockLLM(["Willkommen zurück."]);
    const backend = memoryBackend(mock);
    await beideFreigaben(backend);
    await backend.bstate.set("reveal", REVEAL);
    await backend.bstate.set("revealLog", { at: "2026-07-10T10:00:00Z", summary: "Warm.", touchingPoints: [], forClarification: ["Wochenenden"] });
    const app = await bootApp(backend);
    await app.startChat("gemeinsam");
    await ruhe();
    const kontext = app._state.engine.chat.messages.find(m => m.hidden && m.content.includes("HANDOVER-BLOCK"));
    expect(kontext.content).toContain("REVEAL-PROTOCOL");
    expect(kontext.content).not.toContain("AUFDECKUNG STEHT AUS");
  });

  it("baueKlaerungsKontext: Auftakt-Abschnitt nur mit übergebenem Aufdeck-Material", () => {
    const uA = { name: "Anna", items: [{ id: "S1", text: "x" }] }, uB = { name: "Bernd", items: [{ id: "S1", text: "y" }] };
    expect(baueKlaerungsKontext(uA, uB, null, null)).not.toContain("AUFDECKUNG STEHT AUS");
    expect(baueKlaerungsKontext(uA, uB, null, "REVEAL-CONTEXT …")).toContain("AUFDECKUNG STEHT AUS");
  });
});

describe("S43 · Vorraum & Wegweiser", () => {
  it("nur noch zwei Session-Karten; Auflösungs-Zeile trägt die Auftakt-Fassung bei ausstehender Aufdeckung", async () => {
    const backend = memoryBackend(null);
    await beideFreigaben(backend);
    await backend.bstate.set("reveal", REVEAL);
    await bootApp(backend);
    await klick(root.querySelector("#btnSharedRoom"));
    await ruhe();
    expect(root.querySelector("#btnAufdeck")).toBeFalsy();
    expect(root.querySelector("#btnGemeinsam").disabled).toBe(false);
    const weg = root.querySelector("#wegTeil").textContent;
    expect(weg).toContain("beginnt mit der Auflösung eurer Rate-Runde");
  });

  it("… und die schlichte Fassung ohne Aufdeck-Wahl; nach dem Befund entfällt die Zeile", async () => {
    const backend = memoryBackend(null);
    await beideFreigaben(backend);
    await bootApp(backend);
    await klick(root.querySelector("#btnSharedRoom"));
    await ruhe();
    let weg = root.querySelector("#wegTeil").textContent;
    expect(weg).toContain("Startet eure Gemeinsame Auflösung");
    expect(weg).not.toContain("Rate-Runde");
    await backend.bstate.set("findings", { at: "2026-07-11T10:00:00Z" });
    await klick(root.querySelector("#btnZurueck2"));
    await klick(root.querySelector("#btnSharedRoom"));
    await ruhe();
    weg = root.querySelector("#wegTeil").textContent;
    expect(weg).not.toContain("Gemeinsame Auflösung");
    expect(weg).toContain("Qualitätszeit");
  });
});

describe("S43 · Agenda-Regal v2", () => {
  it("trennt Ziele-Block (mit Backlog) und Gesprächspunkte-Block", async () => {
    const backend = memoryBackend(null);
    await backend.bstate.set("goals", { items: [
      { id: "AG1", art: "shared", status: "active", text: "Mehr echte Zeit zu zweit" },
      { id: "AI2", art: "individual", owner: "Anna", status: "resting", text: "Eigene Abende pflegen" },   // S60: gespeicherter Status heißt "resting" (Writer), "rest" ist der OP
    ], seq: 2 });
    await backend.bstate.set("agenda", { items: [
      { id: "AGD1", by: "Bernd", text: "Wochenend-Planung", state: "open" },
    ]});
    await bootApp(backend);
    await klick(root.querySelector("#btnSharedRoom"));
    await klick(root.querySelector("#btnAgenda"));
    await ruhe();
    const txt = root.querySelector("#boxAgenda").textContent;
    // S76 · Gruppen heißen "Entwicklungsthemen / Ziele" und "Gesprächspunkte"
    // und leben in eigenen, visuell getrennten Kartenblöcken.
    expect(txt).toContain("Entwicklungsthemen / Ziele");
    expect(txt).toContain("Mehr echte Zeit zu zweit");
    expect(txt).toContain("Gesprächspunkte");
    expect(txt).toContain("Wochenend-Planung");
    expect(txt).toContain("Backlog");
    expect(txt).toContain("Eigene Abende pflegen");
    const ziele = root.querySelector("#boxAgenda .pb-ag-ziele");
    const punkte = root.querySelector("#boxAgenda .pb-ag-punkte");
    expect(ziele).toBeTruthy();
    expect(punkte).toBeTruthy();
    expect(ziele.textContent).toContain("Mehr echte Zeit zu zweit");
    expect(ziele.textContent).toContain("Eigene Abende pflegen");   // Backlog ruht IM Ziele-Block
    expect(punkte.textContent).toContain("Wochenend-Planung");
    expect(punkte.textContent).not.toContain("Backlog");
    expect(txt.indexOf("Entwicklungsthemen / Ziele")).toBeLessThan(txt.indexOf("Gesprächspunkte"));
  });

  it("ohne Aufträge: freundliche Leere je Abschnitt, kein Backlog-Abschnitt", async () => {
    const backend = memoryBackend(null);
    await bootApp(backend);
    await klick(root.querySelector("#btnSharedRoom"));
    await klick(root.querySelector("#btnAgenda"));
    await ruhe();
    const txt = root.querySelector("#boxAgenda").textContent;
    expect(txt).toContain("Noch keine Ziele");
    expect(txt).toContain("Die Agenda ist leer");
    expect(txt).not.toContain("Backlog");
  });
});
