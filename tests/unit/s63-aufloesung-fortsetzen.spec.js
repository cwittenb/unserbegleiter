// @vitest-environment happy-dom
// S63 · Fortsetzen-Zustand der Gemeinsamen Auflösung: Ist die Session
// begonnen und pausiert (Nachrichten liegen, status running, kein Befund),
// spiegelt der Vorraum das — Wegweiser-Zeile Stufe 1 ("fortsetzen"), die
// Start-Zeile weicht, Button und Subtext wechseln (Muster S53:
// btnEinzel/btnMoment). Nach dem Befund verschwindet alles wie gehabt.

import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { freigebeUebergabe } from "../../core/engine/freigabe.js";
import { uebergabeTeilKey } from "../../core/contracts/uebergabe.js";

function memoryBackend(role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "s63", activeModuleId: "betrieb" });
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
    llm: async () => ({ text: "ok", stop: "end_turn" }),
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

/** Pausierte Auflösung säen: begonnen, running, kein Befund. */
async function pausierteAufloesung(backend) {
  await backend.chat.save("shared", "gemeinsam", {
    status: "running",
    messages: [
      { role: "user", content: "Wir sind beide da.", hidden: true },
      { role: "assistant", content: "Schön, dass ihr da seid — dann pausieren wir hier." },
    ],
  });
}

describe("S63 · Vorraum spiegelt die pausierte Gemeinsame Auflösung", () => {
  it("Startseite: Stufe-1-Zeile 'fortsetzen' statt der Start-Zeile", async () => {
    const backend = memoryBackend();
    await beideFreigaben(backend);
    await pausierteAufloesung(backend);
    await bootApp(backend);
    const weg = root.querySelector("#wegStart").textContent;
    expect(weg).toContain("Eure Gemeinsame Auflösung im gemeinsamen Raum ist offen");
    expect(weg).not.toContain("Startet eure Gemeinsame Auflösung");
  });

  it("Gemeinsamer Raum: Wegweiser 'fortsetzen', Button und Subtext wechseln", async () => {
    const backend = memoryBackend();
    await beideFreigaben(backend);
    await pausierteAufloesung(backend);
    await bootApp(backend);
    await klick(root.querySelector("#btnSharedRoom"));
    await ruhe();
    const weg = root.querySelector("#wegTeil").textContent;
    expect(weg).toContain("ist offen — ihr könnt genau dort weitermachen");
    expect(weg).not.toContain("Startet eure Gemeinsame Auflösung");
    expect(root.querySelector("#btnGemeinsam").textContent).toBe("Gemeinsame Auflösung fortsetzen");
    expect(root.querySelector("#btnGemeinsam").disabled).toBe(false);
    const sub = root.querySelector("#gemeinsamSub");
    expect(sub.classList.contains("pb-hidden")).toBe(false);
    expect(sub.textContent).toContain("genau dort weiter, wo ihr pausiert habt");
  });

  it("nicht begonnen: unverändert Start-Zeile, 'beginnen' und Start-Subtext (S62-Verhalten)", async () => {
    const backend = memoryBackend();
    await beideFreigaben(backend);
    await bootApp(backend);
    await klick(root.querySelector("#btnSharedRoom"));
    await ruhe();
    expect(root.querySelector("#wegTeil").textContent).toContain("Startet eure Gemeinsame Auflösung");
    expect(root.querySelector("#btnGemeinsam").textContent).toBe("Gemeinsame Auflösung beginnen");
    expect(root.querySelector("#gemeinsamSub").textContent).toContain("Auflösung eurer Spekulationen");
  });

  it("nach dem Befund: weder Fortsetzen- noch Start-Zeile; Karte gemäß S44-Verhalten", async () => {
    const backend = memoryBackend();
    await beideFreigaben(backend);
    // Befund liegt — auch wenn der Chat (noch) running gespeichert wäre, zählt der Befund.
    await pausierteAufloesung(backend);
    await backend.bstate.set("findings", { at: "2026-07-15T10:00:00Z" });
    await bootApp(backend);
    const wegStart = root.querySelector("#wegStart").textContent;
    expect(wegStart).not.toContain("Gemeinsame Auflösung im gemeinsamen Raum ist offen");
    expect(wegStart).not.toContain("Startet eure Gemeinsame Auflösung");
    await klick(root.querySelector("#btnSharedRoom"));
    await ruhe();
    const wegTeil = root.querySelector("#wegTeil").textContent;
    expect(wegTeil).not.toContain("Gemeinsame Auflösung");
  });

  it("Wiedereintritt über den Button führt in die pausierte Session (Verlauf steht)", async () => {
    const backend = memoryBackend();
    await beideFreigaben(backend);
    await pausierteAufloesung(backend);
    await bootApp(backend);
    await klick(root.querySelector("#btnSharedRoom"));
    await klick(root.querySelector("#btnGemeinsam"));
    await ruhe(12);
    expect(root.querySelector("#pbMsgs").textContent).toContain("dann pausieren wir hier");
  });
});
