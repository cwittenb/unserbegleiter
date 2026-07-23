// @vitest-environment happy-dom
// Design-Track D3 — Vorraeume als Zwei-Zonen-Layout (Design 17c/d):
// oben "Der Raum." (Sessions als Zeilen an der Zonengrenze, Fortschrittsbalken
// ohne Kapitel-Label), unten "Das Regal." (Zeilen unter der Grenze, Titel
// unten aussen), Wegweiser als Badge+Panel auf der Zonengrenze, gesperrte
// Zeilen gedimmt mit Zustandstext statt Fehler.

import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { freigebeUebergabe } from "../../core/engine/freigabe.js";
import { uebergabeTeilKey } from "../../core/contracts/uebergabe.js";
import { K } from "../../core/prompts/prompts.js";

function memoryBackend(role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "d3", activeModuleId: "betrieb" });
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

describe("D3 · Zwei Zonen", () => {
  it("mich: Papier-Zone (Der Raum) ueber Regal-Zone (Das Regal), Titel unten aussen", async () => {
    await bootApp(memoryBackend());
    const raum = root.querySelector("#scrMyRoom");
    expect(raum.classList.contains("rz-split")).toBe(true);
    const zonen = raum.querySelectorAll(":scope > .rz-half");
    expect(zonen[0].classList.contains("rz-papier")).toBe(true);
    expect(zonen[1].classList.contains("rz-regal")).toBe(true);
    expect(zonen[0].querySelector(".rz-h1").textContent).toBe("Der Raum.");
    expect(zonen[1].querySelector(".rz-fuss .rz-h2").textContent).toBe("Das Regal.");
  });

  it("uns: Tiefgruen-Zone ueber Dunkel-Regal-Zone; Intro klein unter dem Titel (K1c)", async () => {
    await bootApp(memoryBackend());
    const raum = root.querySelector("#scrShared");
    const zonen = raum.querySelectorAll(":scope > .rz-half");
    expect(zonen[0].classList.contains("rz-tiefgruen")).toBe(true);
    expect(zonen[1].classList.contains("rz-regal-dunkel")).toBe(true);
    const intro = zonen[0].querySelector("#sharedIntro");
    expect(intro.classList.contains("rz-intro")).toBe(true);
    expect(intro.textContent).toContain("Für alles, was ihr zu zweit macht");
  });
});

describe("D3 · Fortschrittsbalken (17c)", () => {
  it("pausiert bei Kapitel n → Balken sichtbar, Breite = Anteil, kein Kapitel-Label", async () => {
    const backend = memoryBackend();
    await backend.chat.save("mine", "einzel", { status: "running", kapitel: 2, messages: [{ role: "user", content: "…" }] });
    await bootApp(backend);
    await klick(root.querySelector("#btnMyRoom"));
    const balken = root.querySelector("#einzelBalken");
    expect(balken.classList.contains("pb-hidden")).toBe(false);
    const anteil = Math.round(200 / ((K().KAPITEL_TITEL || []).length || 1));
    expect(balken.querySelector("i").style.width).toBe(anteil + "%");
    expect(root.querySelector("#btnEinzel").textContent).not.toContain("Kapitel");
  });

  it("ohne Pause bleibt der Balken verborgen", async () => {
    await bootApp(memoryBackend());
    await klick(root.querySelector("#btnMyRoom"));
    expect(root.querySelector("#einzelBalken").classList.contains("pb-hidden")).toBe(true);
  });
});

describe("D3 · Sperrzustand als gedimmte Zeile", () => {
  it("Gemeinsames Aufdecken gesperrt: rz-gedimmt + Zustandstext in der Zeile", async () => {
    await bootApp(memoryBackend());
    await klick(root.querySelector("#btnSharedRoom"));
    const zeile = root.querySelector("#btnGemeinsam");
    expect(zeile.disabled).toBe(true);
    expect(zeile.classList.contains("rz-gedimmt")).toBe(true);
    const hinweis = root.querySelector("#gemeinsamHinweis");
    expect(hinweis.classList.contains("rz-zustand")).toBe(true);
    expect(hinweis.classList.contains("pb-hidden")).toBe(false);
  });
});

describe("D3 · Wegweiser auf der Zonengrenze", () => {
  it("beide Vorraeume tragen Badge+Panel an der Regal-Zone; Tap oeffnet/schliesst", async () => {
    await bootApp(memoryBackend());
    await klick(root.querySelector("#btnMyRoom"));
    const badge = root.querySelector("#wegBadgeMein"), panel = root.querySelector("#wegMein");
    expect(badge.closest(".rz-half").classList.contains("rz-regal")).toBe(true);
    badge.click();
    expect(panel.classList.contains("rz-offen")).toBe(true);
    root.querySelector("#scrMyRoom .rz-papier").click();
    expect(panel.classList.contains("rz-offen")).toBe(false);
  });
});
