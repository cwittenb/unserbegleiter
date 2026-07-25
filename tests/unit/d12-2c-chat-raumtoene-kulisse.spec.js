// @vitest-environment happy-dom
// Design-Track D12-2c — der gemeinsame Chat traegt die Toene seines Raums, und
// beide Chats bekommen eine Kulisse.
//
// D6 hatte dem Chat die Kulisse verwehrt ("Chat: keine"). Mit D12-2b hat er
// eine Naht bekommen — damit auch den Ort, an dem die Kulisse in dieser
// Sprache sitzt. Sie waechst nicht als dritter Garten, sondern aus dem
// Zaehler des Raums, in dem die Session stattfindet.

import { describe, it, expect, beforeEach } from "vitest";
import { DESIGN_CSS } from "../../core/ui/design.js";
import { createApp } from "../../core/ui/app.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { freigebeUebergabe } from "../../core/engine/freigabe.js";
import { uebergabeTeilKey } from "../../core/contracts/uebergabe.js";

const tick = () => new Promise(r => setTimeout(r, 0));
const ruhe = async (n = 10) => { for (let i = 0; i < n; i++) await tick(); };

function memoryBackend(role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "d122c", activeModuleId: "betrieb" });
  const bstate = new Bstate(repo), pstate = new Pstate(repo);
  const gelesen = { pstate: 0, bstate: 0 };
  return {
    store, repo, gelesen,
    async info() { return { role, name: "Anna", partner: "Bernd", nameA: "Anna", nameB: "Bernd" }; },
    bstate: {
      get: f => { if (f === "kulisse") gelesen.bstate++; return bstate.get(f); },
      set: (f, v) => bstate.set(f, v),
    },
    pstate: {
      get: f => { if (f === "kulisse") gelesen.pstate++; return pstate.get(role, f); },
      set: (f, v) => pstate.set(role, f, v),
    },
    chat: {
      load: (art, id) => repo.get("chat:" + (art === "shared" ? id : role + ":" + id), art === "shared"),
      save: (art, id, c) => repo.set("chat:" + (art === "shared" ? id : role + ":" + id), c, art === "shared"),
    },
    handover: { post: d => freigebeUebergabe(repo, role, d), get: r => repo.get(uebergabeTeilKey(r), true, "kernwetten") },
    llm: async () => ({ text: "ok", stop: "end_turn" }),
  };
}

let root, backend, app;
beforeEach(async () => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app");
  backend = memoryBackend();
  app = createApp({ doc: document, backend, root });
  await app.boot();
  await ruhe();
});

async function inDenChat(art) {
  const p = app.startChat(art);
  await ruhe(14);
  p.catch(() => {});
}

describe("D12-2c/e · Raumtoene im Chat", () => {
  it("oben ist ueberall Papier — auch im gemeinsamen Raum", async () => {
    await inDenChat("solo");
    expect(root.querySelector("#scrChat .rz-chat-oben").classList.contains("rz-papier")).toBe(true);
    await inDenChat("moment");
    expect(root.querySelector("#scrChat .rz-chat-oben").classList.contains("rz-papier")).toBe(true);
    expect(root.querySelector("#scrChat .rz-chat-oben").classList.contains("rz-tiefgruen")).toBe(false);
  });

  it("nur die Schreibkante folgt dem Raum", async () => {
    await inDenChat("solo");
    expect(root.querySelector("#scrChat .rz-chat-unten").classList.contains("rz-regal")).toBe(true);
    await inDenChat("moment");
    const unten = root.querySelector("#scrChat .rz-chat-unten");
    expect(unten.classList.contains("rz-regal-dunkel")).toBe(true);
    expect(unten.classList.contains("rz-regal")).toBe(false);
  });

  it("kein Screen faerbt sich als Ganzes ein", async () => {
    await inDenChat("moment");
    expect(root.querySelector("#scrChat").className).not.toContain("gemeinsam");
    expect(DESIGN_CSS).not.toContain("rz-chat-gemeinsam");
  });

  it("die Zonen erben die bestehenden Regeln statt sie zu verdoppeln", async () => {
    await inDenChat("moment");
    expect(DESIGN_CSS).toContain(".rz-tiefgruen .rz-signatur,.rz-regal-dunkel .rz-signatur");
    expect(root.querySelector("#scrChat .rz-regal-dunkel .rz-fussmarke")).toBeTruthy();
  });
});

describe("D12-2c · Kulisse im Chat", () => {
  it("beide Chats tragen einen Kulissen-Halter auf der Naht", async () => {
    await inDenChat("solo");
    let halter = root.querySelector("#scrChat #kulisseChat");
    expect(halter).toBeTruthy();
    expect(halter.classList.contains("rz-kulisse-naht")).toBe(true);
    expect(halter.parentElement.classList.contains("rz-chat-unten")).toBe(true);
    await inDenChat("moment");
    expect(root.querySelector("#scrChat #kulisseChat")).toBeTruthy();
  });

  it("sie wird tatsaechlich gezeichnet — beide Theme-Fassungen, nie klickbar", async () => {
    await inDenChat("solo");
    const halter = root.querySelector("#kulisseChat");
    expect(halter.querySelector("svg.rz-kulisse-hell")).toBeTruthy();
    expect(halter.querySelector("svg.rz-kulisse-dunkel")).toBeTruthy();
    expect(DESIGN_CSS).toMatch(/\.rz-kulisse-naht,\.rz-kulisse-fuss\{[^}]*pointer-events:none/);
  });

  it("die Einzelsession waechst aus dem persoenlichen Zaehler", async () => {
    const vorher = { ...backend.gelesen };
    await inDenChat("solo");
    expect(backend.gelesen.pstate).toBeGreaterThan(vorher.pstate);
    expect(backend.gelesen.bstate).toBe(vorher.bstate);
  });

  it("die gemeinsame Session waechst aus dem geteilten Zaehler", async () => {
    const vorher = { ...backend.gelesen };
    await inDenChat("moment");
    expect(backend.gelesen.bstate).toBeGreaterThan(vorher.bstate);
    expect(backend.gelesen.pstate).toBe(vorher.pstate);
  });

  it("kein dritter Garten: der Chat legt keinen eigenen Zaehler an", async () => {
    await inDenChat("solo");
    const schluessel = [...backend.store.map ? backend.store.map.keys() : []].join(" ");
    expect(schluessel).not.toMatch(/kulisseChat|chat.*kulisse/i);
  });

  it("der Abbau nimmt sie mit (S87)", async () => {
    await inDenChat("solo");
    expect(root.querySelector("#kulisseChat")).toBeTruthy();
    app.show("scrStart");
    expect(root.querySelector("#kulisseChat")).toBeFalsy();
  });
});
