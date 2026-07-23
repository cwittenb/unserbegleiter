// @vitest-environment happy-dom
// Design-Track D9 — Regal-Vollbild: das Oeffnen eines Regal-Eintrags soll das
// Bild nicht mehr durchruetteln. Die Regal-Zone uebernimmt den Schirm, die
// Zonen-Ueberschrift faehrt nach oben, der Inhalt rollt in der Zone.

import { describe, it, expect, beforeEach } from "vitest";
import { DESIGN_CSS } from "../../core/ui/design.js";
import { createApp } from "../../core/ui/app.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { freigebeUebergabe } from "../../core/engine/freigabe.js";
import { uebergabeTeilKey } from "../../core/contracts/uebergabe.js";

describe("D9 · Ruhe-Vertraege im CSS", () => {
  it("Vollbild-Zustand pinnt die Hoehe — das Dokument waechst nicht mehr", () => {
    expect(DESIGN_CSS).toContain(".rz-regal-offen{position:relative;height:100dvh;overflow:hidden}");
  });

  it("der obere Teil bleibt EXAKT stehen: festgesetzt auf sein gemessenes Mass", () => {
    expect(DESIGN_CSS).toContain(".rz-regal-offen>.rz-half:first-child{position:absolute;top:0;left:0;right:0;height:var(--rz-oben-h,50%)}");
    // ... und wird NICHT mehr zusammengefaltet oder ausgeblendet:
    expect(DESIGN_CSS).not.toMatch(/\.rz-regal-offen \.rz-half:first-child\{flex-grow:0/);
  });

  it("die Regal-Zone faehrt hoch bis unter den Kopf", () => {
    expect(DESIGN_CSS).toMatch(/\.rz-regal-offen>\.rz-half:last-child\{[^}]*top:var\(--rz-regal-top,0px\)/);
    expect(DESIGN_CSS).toMatch(/\.rz-half\{transition:transform \.36s/);
  });

  it("Akkordeon: der Inhalt waechst aus dem Trennstrich hervor (clip-path, ohne Verzerrung)", () => {
    expect(DESIGN_CSS).toContain(".rz-regal-inhalt:not(.pb-hidden){animation:rzAufklappen");
    expect(DESIGN_CSS).toMatch(/@keyframes rzAufklappen\{\s*from\{clip-path:inset\(0 0 100% 0\)/);
  });

  it("die offene Zeile verliert ihren Pfeil, die Zonen-Ueberschrift bekommt einen", () => {
    expect(DESIGN_CSS).toContain(".rz-zeile.rz-auf .rz-pfeil{display:none}");
    expect(DESIGN_CSS).toContain(".rz-regal-offen .rz-zone-zu{opacity:1;pointer-events:auto}");
  });

  it("Inhalt rollt INNERHALB der Zone statt die Seite zu verlaengern", () => {
    expect(DESIGN_CSS).toMatch(/\.rz-regal-offen \.rz-regal-inhalt:not\(\.pb-hidden\)\{[^}]*overflow-y:auto/);
    expect(DESIGN_CSS).toMatch(/\.rz-regal-offen \.rz-regal-inhalt:not\(\.pb-hidden\)\{[^}]*min-height:0/);
  });

  it("Ueberschrift wandert nach oben, Naht-Badge und Kulisse treten leise ab", () => {
    expect(DESIGN_CSS).toContain(".rz-regal-offen>.rz-half:last-child .rz-fuss{order:-1;margin-top:0");
    expect(DESIGN_CSS).toMatch(/\.rz-regal-offen \.rz-weg-badge,\.rz-regal-offen \.rz-kulisse-fuss\{\s*opacity:0/);
  });

  it("Bewegung ist abschaltbar (prefers-reduced-motion)", () => {
    expect(DESIGN_CSS).toMatch(/@media\(prefers-reduced-motion:reduce\)\{\s*\.rz-half\{transition:none\}/);
    expect(DESIGN_CSS).toMatch(/@media\(prefers-reduced-motion:reduce\)\{[^@]*animation:none/);
  });
});

/* ---- Verhalten ---- */

function memoryBackend(role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "d9", activeModuleId: "betrieb" });
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

describe("D9 · Vollbild im Betrieb (beide Raeume)", () => {
  it("mich: Zeitleiste oeffnen setzt den Vollbild-Zustand, erneuter Tap nimmt ihn zurueck", async () => {
    await bootApp(memoryBackend());
    await klick(root.querySelector("#btnMyRoom"));
    const screen = root.querySelector("#scrMyRoom");
    expect(screen.classList.contains("rz-regal-offen")).toBe(false);

    await klick(root.querySelector("#btnZeitleiste"));
    expect(root.querySelector("#boxZeitleiste").classList.contains("pb-hidden")).toBe(false);
    expect(screen.classList.contains("rz-regal-offen")).toBe(true);

    await klick(root.querySelector("#btnZeitleiste"));
    expect(screen.classList.contains("rz-regal-offen")).toBe(false);
  });

  it("uns: immer nur EINE Box offen — sonst springen die Hoehen wieder", async () => {
    await bootApp(memoryBackend());
    await klick(root.querySelector("#btnSharedRoom"));
    await klick(root.querySelector("#btnRegal"));
    expect(root.querySelector("#boxRegal").classList.contains("pb-hidden")).toBe(false);

    await klick(root.querySelector("#btnAgenda"));
    expect(root.querySelector("#boxAgenda").classList.contains("pb-hidden")).toBe(false);
    expect(root.querySelector("#boxRegal").classList.contains("pb-hidden")).toBe(true);
    expect(root.querySelector("#scrShared").classList.contains("rz-regal-offen")).toBe(true);

    await klick(root.querySelector("#btnAgenda"));
    expect(root.querySelector("#scrShared").classList.contains("rz-regal-offen")).toBe(false);
  });

  it("Zu-Pfeil auf Hoehe der Zonen-Ueberschrift faehrt das Regal herunter", async () => {
    await bootApp(memoryBackend());
    await klick(root.querySelector("#btnSharedRoom"));
    await klick(root.querySelector("#btnRegal"));
    const screen = root.querySelector("#scrShared");
    expect(screen.classList.contains("rz-regal-offen")).toBe(true);
    // der Pfeil sitzt in der Zeile der Ueberschrift "Das Regal."
    const kopf = screen.querySelector(".rz-regal-dunkel .rz-fuss .rz-fuss-kopf");
    expect(kopf.querySelector(".rz-h2")).toBeTruthy();
    await klick(kopf.querySelector(".rz-zone-zu"));
    expect(screen.classList.contains("rz-regal-offen")).toBe(false);
    expect(root.querySelector("#boxRegal").classList.contains("pb-hidden")).toBe(true);
  });

  it("Klick OBERHALB des Regals schliesst es ebenfalls", async () => {
    await bootApp(memoryBackend());
    await klick(root.querySelector("#btnMyRoom"));
    await klick(root.querySelector("#btnZeitleiste"));
    const screen = root.querySelector("#scrMyRoom");
    expect(screen.classList.contains("rz-regal-offen")).toBe(true);
    await klick(screen.querySelector(".rz-papier"));
    expect(screen.classList.contains("rz-regal-offen")).toBe(false);
  });

  it("nur die OFFENE Zeile verliert ihren Pfeil", async () => {
    await bootApp(memoryBackend());
    await klick(root.querySelector("#btnSharedRoom"));
    await klick(root.querySelector("#btnAgenda"));
    expect(root.querySelector("#btnAgenda").classList.contains("rz-auf")).toBe(true);
    expect(root.querySelector("#btnRegal").classList.contains("rz-auf")).toBe(false);
    expect(root.querySelector("#btnQz").classList.contains("rz-auf")).toBe(false);
    await klick(root.querySelector("#btnAgenda"));
    expect(root.querySelector("#btnAgenda").classList.contains("rz-auf")).toBe(false);
  });

  it("der Wiedereinstiegs-Hinweis zwingt den Raum NICHT ins Vollbild", async () => {
    await bootApp(memoryBackend());
    await klick(root.querySelector("#btnMyRoom"));
    const recovery = root.querySelector("#boxRecovery");
    recovery.classList.remove("pb-hidden");
    await klick(root.querySelector("#btnZeitleiste"));
    await klick(root.querySelector("#btnZeitleiste"));
    expect(root.querySelector("#scrMyRoom").classList.contains("rz-regal-offen")).toBe(false);
    expect(recovery.classList.contains("pb-hidden")).toBe(false);   // bleibt stehen
  });
});
