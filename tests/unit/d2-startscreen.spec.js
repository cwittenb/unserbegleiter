// @vitest-environment happy-dom
// Design-Track D2 — Startscreen als Vollbild-Zweiteilung (Design 17a/b):
// Betreten-Zeilen an der Naht, Wegweiser als Badge+Panel mit Warte-Punkt,
// Initial-Badge (ohne Zaehler) an der Betreten-Zeile, Feature-Subtexte
// zugunsten des "reinen Wegweisers" ausgeblendet (Schluessel bleiben).

import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { freigebeUebergabe } from "../../core/engine/freigabe.js";
import { uebergabeTeilKey } from "../../core/contracts/uebergabe.js";

function memoryBackend(role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "d2", activeModuleId: "betrieb" });
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
const ruhe = async (n = 6) => { for (let i = 0; i < n; i++) await tick(); };

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

describe("D2 · Zweiteilung", () => {
  it("Start ist rz-split: Papier-Haelfte oben, Tiefgruen-Haelfte mit Naht-Anker unten", async () => {
    await bootApp(memoryBackend());
    const start = root.querySelector("#scrStart");
    expect(start.classList.contains("rz-split")).toBe(true);
    const haelften = start.querySelectorAll(":scope > .rz-half");
    expect(haelften).toHaveLength(2);
    expect(haelften[0].classList.contains("rz-papier")).toBe(true);
    expect(haelften[1].classList.contains("rz-tiefgruen")).toBe(true);
    expect(haelften[1].classList.contains("rz-naht-anker")).toBe(true);
  });

  it("Wortmarke im Kopf, H1-Begruessung oben, Titel+Label unten aussen", async () => {
    await bootApp(memoryBackend());
    expect(root.querySelector("#scrStart .rz-kopf #pbKern")).toBeTruthy();
    const h1 = root.querySelector("#scrStart #startHallo");
    expect(h1.classList.contains("rz-h1")).toBe(true);
    expect(h1.textContent).toContain("Lena");
    const fuss = root.querySelector("#scrStart .rz-tiefgruen .rz-fuss");
    expect(fuss.querySelector(".rz-h2")).toBeTruthy();
    expect(fuss.querySelector(".rz-caps")).toBeTruthy();
  });

  it("reiner Wegweiser: Feature-Subtexte ausgeblendet, aber im DOM erhalten", async () => {
    await bootApp(memoryBackend());
    for (const id of ["startIntro", "startMeinSub", "startTeilSub"])
      expect(root.querySelector("#" + id).classList.contains("pb-hidden")).toBe(true);
  });
});

describe("D2 · Wegweiser-Badge", () => {
  it("Badge sitzt auf der Naht (rz-auf-naht, untere Haelfte), Panel daneben", async () => {
    await bootApp(memoryBackend());
    const badge = root.querySelector("#wegBadgeStart");
    expect(badge.classList.contains("rz-auf-naht")).toBe(true);
    expect(badge.closest(".rz-half").classList.contains("rz-tiefgruen")).toBe(true);
    expect(badge.parentElement.querySelector("#wegStart").classList.contains("rz-weg-panel")).toBe(true);
  });

  it("Tap aufs Badge oeffnet das Panel, Tap irgendwohin schliesst; Fusszeile da", async () => {
    await bootApp(memoryBackend());
    const badge = root.querySelector("#wegBadgeStart"), panel = root.querySelector("#wegStart");
    badge.click();
    expect(panel.classList.contains("rz-offen")).toBe(true);
    expect(panel.querySelector(".rz-weg-fuss")).toBeTruthy();
    root.querySelector("#scrStart .rz-papier").click();
    expect(panel.classList.contains("rz-offen")).toBe(false);
  });

  it("frischer Zustand (Auftrags-Einladung = Stufe 2) laesst den Warte-Punkt leuchten", async () => {
    await bootApp(memoryBackend());
    expect(root.querySelector("#wegBadgeStart").classList.contains("rz-wartet")).toBe(true);
  });
});

describe("D2 · Benachrichtigung ohne Zaehler", () => {
  it("ungelesene Freigabe → runde Initial-Badge an der Betreten-Zeile", async () => {
    const backend = memoryBackend();
    await backend.bstate.set("shelf", { items: [
      { id: "s1", by: "Lena", text: "…", read: false },
      { id: "s2", by: "Lena", text: "…", read: false },
    ] });
    await bootApp(backend);
    const leiste = root.querySelector("#lzStart");
    const badges = leiste.querySelectorAll(".rz-initial");
    expect(badges).toHaveLength(1);                    // eine Person soll lesen → EIN Badge
    expect(badges[0].textContent).toBe("J");           // Initial des Empfaengers (Jonas)
    expect(leiste.textContent).not.toMatch(/\d/);      // keine Zaehler
  });
});
