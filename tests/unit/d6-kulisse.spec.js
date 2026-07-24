// @vitest-environment happy-dom
// Design-Track D6 — Kulisse + Wachstumslogik (Design Turn 15/16, K4:
// Startzeitpunkte serverseitig im Bstate/Pstate). Deterministisch: Meilen-
// steine + logarithmische Zeitreihe, Deckel 7, kein sichtbarer Zaehler.

import { describe, it, expect, beforeEach } from "vitest";
import { kulisseAnzahl, baueKulisse, WOCHE_MS, KULISSE_DECKEL } from "../../core/ui/kulisse.js";
import { createApp } from "../../core/ui/app.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { freigebeUebergabe } from "../../core/engine/freigabe.js";
import { uebergabeTeilKey } from "../../core/contracts/uebergabe.js";

describe("D6 · Wachstumsfunktion", () => {
  it("D11 · der Raum startet nicht kahl: ein Element ist von Anfang an da", () => {
    const jetzt = Date.now();
    expect(kulisseAnzahl({ meilensteine: 0, startTs: jetzt, jetzt })).toBe(1);
    // Die Basis wird ADDIERT — sonst bliebe der erste Meilenstein unsichtbar:
    expect(kulisseAnzahl({ meilensteine: 1, startTs: jetzt, jetzt })).toBe(2);
    expect(kulisseAnzahl({ meilensteine: 2, startTs: jetzt, jetzt })).toBe(3);
  });

  it("Zeitreihe logarithmisch: Woche 1, 2, 4, 8, 16 schalten je ein Element frei", () => {
    const start = 0;
    const bei = wochen => kulisseAnzahl({ meilensteine: 0, startTs: start, jetzt: start + wochen * WOCHE_MS });
    expect(bei(0.9)).toBe(1);      // Basis
    expect(bei(1)).toBe(2);
    expect(bei(2)).toBe(3);
    expect(bei(3.9)).toBe(3);
    expect(bei(4)).toBe(4);
    expect(bei(8)).toBe(5);
    expect(bei(16)).toBe(6);
  });

  it("Deckel bei 7 — die Kulisse kippt nie ins Laut-Werden", () => {
    expect(kulisseAnzahl({ meilensteine: 3, startTs: 0, jetzt: 512 * WOCHE_MS })).toBe(KULISSE_DECKEL);
  });

  it("determinstisch: gleiche Eingabe, gleiches SVG", () => {
    expect(baueKulisse(4, "x")).toBe(baueKulisse(4, "x"));
  });

  it("D11 · der geschwungene Untergrund ist IMMER da, auch ohne ein einziges Element", () => {
    const leer = baueKulisse(0, "u");
    expect(leer).not.toBe("");
    expect(leer).toContain("M0 60 Q100 48 195 58 T390 54 V84 H0Z");   // Huegellinie (hell)
    expect(leer).toContain("M0 66 Q100 60 195 66 T390 64 V84 H0Z");   // Wasserlinie (dunkel)
    expect(leer).not.toContain("polygon");                            // aber keine Baeume
    expect(leer).not.toContain("rotate(15) scale(.62)");              // und keine Bluete
  });

  it("Teich-Fassung: zwei Blatt-Lagen im Kelch (innere 62 %, 15 Grad versetzt), Ringe unter Blaettern per Maske", () => {
    const voll = baueKulisse(7, "m");
    expect(voll).toContain('rotate(15) scale(.62)');
    expect(voll).toContain('mask id="rzTeichMaske-m"');
    expect(voll).toContain('mask="url(#rzTeichMaske-m)"');
    // Schwimmblatt mit Kerbe (Handoff-Pfad-Form) und Baeume in der Hell-Fassung
    expect(voll).toContain("A11 11 0 1 0");
    expect(voll).toContain("rz-kulisse-hell");
    expect(voll).toContain("polygon");
  });
});

/* ---- App-Verdrahtung: Halter je Screen, serverseitiger Startzeitpunkt ---- */

function memoryBackend(role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "d6", activeModuleId: "betrieb" });
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

describe("D6 · App-Verdrahtung", () => {
  it("D11a · Teich und Baeume sitzen an derselben Stelle — beide ueber der Naht", async () => {
    const { DESIGN_CSS } = await import("../../core/ui/design.js");
    expect(DESIGN_CSS).toContain(".rz-kulisse-naht{top:0;transform:translateY(-100%)}");
    // die alte Ausnahme, die den Teich unter die Naht haengte, ist weg:
    expect(DESIGN_CSS).not.toContain("html[data-theme=dark] .rz-kulisse-naht{transform:none}");
  });

  it("Halter sitzen an ihren Orten: Start auf der Naht, Vorraeume im Regal-Fuss, Chat keiner", async () => {
    await bootApp(memoryBackend());
    expect(root.querySelector("#scrStart .rz-tiefgruen > .rz-kulisse-naht#kulisseStart")).toBeTruthy();
    expect(root.querySelector("#scrMyRoom .rz-regal .rz-kulisse-fuss#kulisseMein")).toBeTruthy();
    expect(root.querySelector("#scrShared .rz-regal-dunkel .rz-kulisse-fuss#kulisseTeil")).toBeTruthy();
    expect(root.querySelector("#scrChat .rz-kulisse-naht, #scrChat .rz-kulisse-fuss")).toBeFalsy();
  });

  it("erster Besuch setzt den geteilten Startzeitpunkt SERVERSEITIG (Bstate) — einmalig", async () => {
    const backend = memoryBackend();
    await bootApp(backend);
    await ruhe(10);
    const k1 = await backend.bstate.get("kulisse");
    expect(k1 && typeof k1.start).toBe("number");
    await klick(root.querySelector("#btnSharedRoom"));
    await ruhe(10);
    const k2 = await backend.bstate.get("kulisse");
    expect(k2.start).toBe(k1.start);                       // nie ueberschrieben
  });

  it("Vorraum mich nutzt den PERSOENLICHEN Zaehler (Pstate) getrennt vom geteilten", async () => {
    const backend = memoryBackend();
    await bootApp(backend);
    await klick(root.querySelector("#btnMyRoom"));
    await ruhe(10);
    const p = await backend.pstate.get("kulisse");
    expect(p && typeof p.start).toBe("number");
  });

  it("Meilenstein sichtbar: begonnene Auftragsklaerung laesst die Knospe wachsen", async () => {
    const backend = memoryBackend();
    await backend.chat.save("mine", "einzel", { status: "running", kapitel: 1, messages: [{ role: "user", content: "…" }] });
    await bootApp(backend);
    await klick(root.querySelector("#btnMyRoom"));
    await ruhe(10);
    const halter = root.querySelector("#kulisseMein");
    expect(halter.querySelector("svg.rz-kulisse-hell")).toBeTruthy();
    expect(halter.querySelector("svg.rz-kulisse-dunkel")).toBeTruthy();
  });
});
