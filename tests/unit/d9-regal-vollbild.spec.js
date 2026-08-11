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
/* S121.6 · UMGEKEHRT. Das offene Regal war eine Vollbild-Fläche mit absolut
   positionierten Hälften, gemessenen Maßen und eigenem Rollbereich. Es ist
   jetzt ein Akkordeon im Fluss: Die Zone wächst mit ihrem Inhalt, das Dokument
   rollt (Turn 48 §2.1), die übrigen Zeilen bleiben stehen.
   Die Fälle bleiben mit gedrehtem Vorzeichen stehen — eine Umkehr, die als
   gelöschter Test dasteht, ist später nicht mehr auffindbar. */
  it("S121.6 · der Vollbild-Zustand ist fort — das Dokument waechst wieder", () => {
    expect(DESIGN_CSS).not.toContain(".rz-regal-offen{position:relative;height:100dvh;overflow:hidden}");
  });

  it("S121.6 · der obere Teil wird nicht mehr gemessen, sondern klebt", () => {
    expect(DESIGN_CSS).not.toContain("--rz-oben-h");
    expect(DESIGN_CSS).toMatch(/\.rz-regal-offen>\.rz-half:first-child\{position:sticky/);
  });

  it("S121.6 · die Zone wird nicht mehr verschoben — die Seite rollt dorthin", () => {
    expect(DESIGN_CSS).not.toContain("--rz-regal-top");
  });

  it("Akkordeon: der Inhalt waechst per Rasterhoehe, ohne Messung", () => {
    // clip-path war die alte Fassung; grid-template-rows oeffnet eine
    // UNBEKANNTE Hoehe weich, ohne sie vorher zu messen.
    expect(DESIGN_CSS).toContain(".rz-regal-inhalt{display:grid;grid-template-rows:0fr");
    expect(DESIGN_CSS).toMatch(/@keyframes rzAufklappen\{\s*from\{clip-path:inset\(0 0 100% 0\)/);
  });

  // D12-2b (Turn 27) kehrt diesen D9-Nachtrag um: die geklickte Zeile IST die
  // Sektionsueberschrift und traegt den Weg nach oben; der eigene Zu-Pfeil an
  // der Zonen-Ueberschrift entfaellt, die Geschwisterzeilen treten ab.
  it("S121.6 · die Geschwisterzeilen bleiben stehen — das macht es zum Akkordeon", () => {
    expect(DESIGN_CSS).not.toContain(".rz-zeile.rz-auf .rz-pfeil{display:none}");
    expect(DESIGN_CSS).not.toContain(".rz-zone-zu");
    expect(DESIGN_CSS).not.toContain(".rz-regal-offen .rz-zeile[data-box]:not(.rz-auf){display:none}");
    // Die Sonderform der offenen Zeile ist mit der Vollbild-Mechanik gefallen:
    // Sie bleibt eine Zeile unter Zeilen und braucht keine eigene Typografie.
    // Was sie auszeichnet, ist der gedrehte Pfeil (S114.7, in app.js gesetzt).
    expect(DESIGN_CSS).not.toMatch(/\.rz-regal-offen \.rz-zeile\.rz-auf\{[^}]*font-family:var\(--rz-serif\)/);
  });

  it("Inhalt rollt INNERHALB der Zone statt die Seite zu verlaengern", () => {
    expect(DESIGN_CSS).toMatch(/\.rz-regal-offen \.rz-regal-inhalt:not\(\.pb-hidden\)\{[^}]*overflow-y:auto/);
    expect(DESIGN_CSS).toMatch(/\.rz-regal-offen \.rz-regal-inhalt:not\(\.pb-hidden\)\{[^}]*min-height:0/);
  });

  // D12-2b: der Zonentitel verschwindet im offenen Zustand (statt nach oben zu
  // fahren), und das Badge FAEHRT MIT der Kante, statt abzublenden.
  it("Zonentitel tritt ab, Kulisse blendet aus — das Badge bleibt", () => {
    expect(DESIGN_CSS).toContain(".rz-regal-offen>.rz-half:last-child .rz-fuss{display:none}");
    expect(DESIGN_CSS).toMatch(/\.rz-regal-offen \.rz-kulisse-fuss\{opacity:0/);
    expect(DESIGN_CSS).not.toMatch(/\.rz-regal-offen \.rz-weg-badge[^{]*\{[^}]*opacity:0/);
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

  it("die Sektionszeile selbst faehrt das Regal wieder herunter", async () => {
    await bootApp(memoryBackend());
    await klick(root.querySelector("#btnSharedRoom"));
    await klick(root.querySelector("#btnRegal"));
    const screen = root.querySelector("#scrShared");
    expect(screen.classList.contains("rz-regal-offen")).toBe(true);
    // D12-2b: kein eigener Zu-Pfeil mehr — die geklickte Zeile traegt ihn.
    expect(screen.querySelector(".rz-zone-zu")).toBeFalsy();
    await klick(root.querySelector("#btnRegal"));
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

  it("nur die OFFENE Zeile ist Sektion (rz-auf)", async () => {
    await bootApp(memoryBackend());
    await klick(root.querySelector("#btnSharedRoom"));
    await klick(root.querySelector("#btnAgenda"));
    expect(root.querySelector("#btnAgenda").classList.contains("rz-auf")).toBe(true);
    expect(root.querySelector("#btnRegal").classList.contains("rz-auf")).toBe(false);
    expect(root.querySelector("#btnQz").classList.contains("rz-auf")).toBe(false);
    await klick(root.querySelector("#btnAgenda"));
    expect(root.querySelector("#btnAgenda").classList.contains("rz-auf")).toBe(false);
  });

  /* U5/§1.3 · Hier stand ein Test, der festhielt, dass der Wiedereinstieg
     den Raum NICHT ins Vollbild zwingt — er war von REGAL_OFFEN ausgenommen,
     weil er ohne eigene Zeile von selbst offen dastand. Jetzt hat er eine
     Zeile wie die anderen und verhaelt sich auch so; die Ausnahme ist weg.
     Das Auf- und Zuklappen wird in recovery-ui.spec.js geprueft — dort gibt
     es ein Recovery-Backend, ohne das die Zeile gar nicht erscheint. */
});
