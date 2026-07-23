// @vitest-environment happy-dom
// Design-Track D5 — Teilen-Flow-Optik (Design 17f): Freigabe-Vorschau als
// Tiefgruen-Block mit Von-Zeile und EXAKT dem Text, der im Regal ankommt;
// Optionen als Hairline-Zeilen; Empfang im Regal mit Von-Caps + Initial-Badge.
// Fluss und Logik (Gate, Handover, erst-das-Haekchen) bleiben unangetastet.

import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { freigebeUebergabe } from "../../core/engine/freigabe.js";
import { uebergabeTeilKey } from "../../core/contracts/uebergabe.js";

function memoryBackend(role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "d5", activeModuleId: "betrieb" });
  const bstate = new Bstate(repo), pstate = new Pstate(repo);
  return {
    store, repo,
    async info() { return { role, name: "Lena", partner: "Jonas", nameA: "Lena", nameB: "Jonas" }; },
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
const ruhe = async (n = 8) => { for (let i = 0; i < n; i++) await tick(); };
async function klick(el) { el.click(); await ruhe(); }

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

describe("D5 · Empfang im Regal", () => {
  it("Von-Caps-Zeile über dem Serif-Text; ungelesen fremd → Initial-Badge; genau derselbe String", async () => {
    const backend = memoryBackend();
    await backend.bstate.set("shelf", { items: [
      { id: "s1", by: "Jonas", text: "Beim Streit ums Aufräumen ging es mir eigentlich darum, ob Lena sieht, wie viel ich gerade trage.", read: false },
    ] });
    await bootApp(backend);
    await klick(root.querySelector("#btnSharedRoom"));
    await klick(root.querySelector("#btnRegal"));
    const eintrag = root.querySelector("#regalItems .rz-regal-eintrag");
    const von = eintrag.querySelector(".rz-von");
    expect(von.textContent).toContain("von Jonas");
    expect(von.querySelector(".rz-initial").textContent).toBe("J");
    // EXAKT der freigegebene String — nicht mehr, nicht weniger:
    expect(eintrag.querySelector(".rz-regal-text").textContent)
      .toBe("Beim Streit ums Aufräumen ging es mir eigentlich darum, ob Lena sieht, wie viel ich gerade trage.");
  });

  it("gelesen → keine Initial-Badge mehr, Status leise darunter", async () => {
    const backend = memoryBackend();
    await backend.bstate.set("shelf", { items: [
      { id: "s1", by: "Jonas", text: "…", read: true },
    ] });
    await bootApp(backend);
    await klick(root.querySelector("#btnSharedRoom"));
    await klick(root.querySelector("#btnRegal"));
    const eintrag = root.querySelector("#regalItems .rz-regal-eintrag");
    expect(eintrag.querySelector(".rz-initial")).toBeFalsy();
    expect(eintrag.textContent).toContain("gelesen");
  });
});

describe("D5 · Vorschau-Baustein (CSS-Vertrag)", () => {
  it("Tiefgruen-Block, Serif-Text, typografische Anführung per CSS — keine Textänderung", async () => {
    const { DESIGN_CSS } = await import("../../core/ui/design.js");
    expect(DESIGN_CSS).toMatch(/\.rz-teilen-block\{background:var\(--rz-tiefgruen\)/);
    expect(DESIGN_CSS).toContain(".rz-teilen-text::before{content:'\u201e'}");
    expect(DESIGN_CSS).toContain(".rz-teilen-text::after{content:'\u201c'}");
    expect(DESIGN_CSS).toMatch(/\.rz-wahl\{[^}]*border-top:1px solid var\(--rz-hairline\)/);
  });
});
