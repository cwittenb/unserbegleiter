// @vitest-environment happy-dom
// Design-Track D8 — drei Korrekturen: (1) Vollbild ohne Rand, (2) Wegweiser
// klappt aus der MITTE der Naht auf (nach oben und unten gleichermassen),
// (3) Sprachwechsel als kleiner DE/EN-Eckknopf mit Aufwaerts-Dialog.
// Der Paarsprache-VORGANG (vorschlagen/bestaetigen) bleibt unangetastet.

import { describe, it, expect, beforeEach } from "vitest";
import { DESIGN_CSS } from "../../core/ui/design.js";
import { createApp } from "../../core/ui/app.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { freigebeUebergabe } from "../../core/engine/freigabe.js";
import { uebergabeTeilKey } from "../../core/contracts/uebergabe.js";

describe("D8 · Vollbild ohne Rand", () => {
  it("keine Spalte mehr um die Vorraeume — die Screens gehen bis an die Kante", () => {
    expect(DESIGN_CSS).toContain(".rz-app{max-width:none;padding:0;width:100%;min-height:100dvh}");
    // die D2-Uebergangsregel (660px-Spalte fuer die Vorraeume) ist weg:
    expect(DESIGN_CSS).not.toMatch(/\.rz-app #scrMyRoom[^{]*\{[^}]*max-width:660px/);
  });

  it("randlos in JEDER Huelle: der Marker sitzt am <html>, nicht an #app", () => {
    // Die App-Wurzel ist je nach Plattform #app (Pages) oder #pbMain
    // (Artefakt-Huelle) — an #app gebundene Regeln greifen dort nicht.
    expect(DESIGN_CSS).toContain("html[data-vollbild],html[data-vollbild] body{margin:0;padding:0;width:100%;height:100%;max-width:none}");
    expect(DESIGN_CSS).toMatch(/html\[data-vollbild\] #app,html\[data-vollbild\] #pbMain\{[^}]*max-width:none/);
  });

  it("applyDesign setzt den Vollbild-Marker", async () => {
    const { applyDesign } = await import("../../core/ui/design.js");
    document.documentElement.removeAttribute("data-vollbild");
    const alt = document.getElementById("pbDesign");
    if (alt) alt.remove();
    applyDesign(document);
    expect(document.documentElement.getAttribute("data-vollbild")).toBe("1");
  });

  it("der Wegweiser-Knopf liegt UNTER dem Textpanel", () => {
    expect(DESIGN_CSS).toMatch(/\.rz-weg-badge\{z-index:3;/);   // Panel liegt auf 4
    expect(DESIGN_CSS).toMatch(/\.rz-weg-panel\{[^}]*z-index:4/);
  });

  it("body traegt Papier statt Verlauf, damit Overscroll nicht aus dem Bild faellt", () => {
    expect(DESIGN_CSS).toContain("body{margin:0;min-height:100%;background:var(--rz-papier)");
    expect(DESIGN_CSS).not.toContain("linear-gradient(172deg");
  });

  it("Sicherheitsabstaende leben in den Zonen (M3-Invariante bleibt erfuellt)", () => {
    for (const seite of ["top", "right", "bottom", "left"])
      expect(DESIGN_CSS).toContain(`env(safe-area-inset-${seite}`);
  });
});

describe("D8 · Wegweiser aus der Mitte", () => {
  it("Ursprung Mitte + translateY(-50%): waechst symmetrisch in beide Haelften", () => {
    expect(DESIGN_CSS).toMatch(/\.rz-weg-panel\{[^}]*transform:translateY\(-50%\) scaleY\(0\);transform-origin:center center/);
    expect(DESIGN_CSS).toContain(".rz-weg-panel.rz-offen{transform:translateY(-50%) scaleY(1)");
    // NICHT mehr an der Oberkante verankert (altes Ausfahren nach unten):
    expect(DESIGN_CSS).not.toContain("transform-origin:top center");
  });
});

describe("D8 · Sprachwechsel", () => {
  it("Eckknopf unten rechts, Dialog faehrt von unten herein — Knopf bleibt darueber", () => {
    expect(DESIGN_CSS).toMatch(/#psZeile\.rz-sprachecke\{position:fixed;z-index:30/);
    expect(DESIGN_CSS).toMatch(/#psZeile\.rz-sprachecke\{[^}]*bottom:calc\(18px \+ env\(safe-area-inset-bottom/);
    expect(DESIGN_CSS).toMatch(/#boxPaarsprache\.rz-sprachdialog\{[^}]*transform:translateY\(100%\)/);
    expect(DESIGN_CSS).toContain("#boxPaarsprache.rz-sprachdialog:not(.pb-hidden){transform:translateY(0)");
    // Der Dialog bleibt im Fluss (display:block trotz pb-hidden), sonst
    // gaebe es keine Bewegung — der Zustandstraeger bleibt die Klasse.
    expect(DESIGN_CSS).toMatch(/#boxPaarsprache\.rz-sprachdialog\{[^}]*display:block/);
  });
});

/* ---- Verhalten: Knopf zeigt Sprache, Tap oeffnet/schliesst den Dialog ---- */

function memoryBackend(role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "d8", activeModuleId: "betrieb" });
  const bstate = new Bstate(repo), pstate = new Pstate(repo);
  let locale = "de", request = null;
  return {
    store, repo,
    async info() { return { role, name: "Lena", partner: "Jonas", nameA: "Lena", nameB: "Jonas", locale, languageRequest: request }; },
    bstate: { get: f => bstate.get(f), set: (f, v) => bstate.set(f, v) },
    pstate: { get: f => pstate.get(role, f), set: (f, v) => pstate.set(role, f, v) },
    chat: {
      load: (art, id) => repo.get("chat:" + (art === "shared" ? id : role + ":" + id), art === "shared"),
      save: (art, id, c) => repo.set("chat:" + (art === "shared" ? id : role + ":" + id), c, art === "shared"),
    },
    handover: { post: d => freigebeUebergabe(repo, role, d), get: r => repo.get(uebergabeTeilKey(r), true, "kernwetten") },
    language: {
      async request(target) { request = { by: role, target }; return { locale, languageRequest: request, status: "pending" }; },
      async confirm() { return { locale, languageRequest: request, status: "pending" }; },
      async withdraw() { request = null; return { locale, languageRequest: null, status: "withdrawn" }; },
    },
    llm: async () => ({ text: "ok", stop: "end_turn" }),
  };
}
const tick = () => new Promise(r => setTimeout(r, 0));
const ruhe = async (n = 8) => { for (let i = 0; i < n; i++) await tick(); };

let root;
beforeEach(async () => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app");
  const app = createApp({ doc: document, backend: memoryBackend(), root });
  await app.boot();
  await ruhe();
});

describe("D8 · Sprachknopf im Betrieb", () => {
  it("sitzt in der Ecke, zeigt beide Kuerzel, hebt die aktuelle Sprache hervor", () => {
    const ecke = root.querySelector("#psZeile");
    expect(ecke.classList.contains("rz-sprachecke")).toBe(true);
    const knopf = ecke.querySelector("#psLink");
    expect(knopf.classList.contains("rz-sprachknopf")).toBe(true);
    const marken = [...knopf.querySelectorAll("span")].map(s => s.textContent);
    expect(marken).toContain("DE");
    expect(marken).toContain("EN");
    expect(knopf.querySelector(".an").textContent).toBe("DE");
  });

  it("Tap faehrt den Dialog aus, erneuter Tap schliesst ihn wieder", async () => {
    const dialog = root.querySelector("#boxPaarsprache");
    expect(dialog.classList.contains("rz-sprachdialog")).toBe(true);
    expect(dialog.classList.contains("pb-hidden")).toBe(true);

    root.querySelector("#psLink").click();
    await ruhe();
    expect(dialog.classList.contains("pb-hidden")).toBe(false);
    expect(dialog.querySelector("#psAntrag")).toBeTruthy();      // Vorgang unveraendert

    root.querySelector("#psLink").click();
    await ruhe();
    expect(dialog.classList.contains("pb-hidden")).toBe(true);
  });

  it("offener Vorschlag setzt Punkt UND Hinweis neben den Knopf", async () => {
    root.querySelector("#psLink").click();
    await ruhe();
    root.querySelector("#psAntrag").click();
    await ruhe();
    const ecke = root.querySelector("#psZeile");
    expect(ecke.querySelector(".rz-punkt")).toBeTruthy();
    expect(ecke.querySelector(".rz-sprach-hinweis")).toBeTruthy();
  });
});
