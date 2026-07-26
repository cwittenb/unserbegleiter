// @vitest-environment happy-dom
// T1a · Eine Farbaufteilung für alle Screens.
//
// Oben Papier, unten Tiefgrün — auf Startseite, in beiden Vorräumen und in
// beiden Sessions. Das Regal ist ein Möbel IN der Zone, keine eigene Fläche;
// dunkler wird es ausschließlich über das Dark-Theme. Der Ort spricht über
// Badge und Wegweiser, nicht über die Farbe.

import { describe, it, expect, beforeEach } from "vitest";
import { DESIGN_CSS } from "../../core/ui/design.js";
import { createApp } from "../../core/ui/app.js";

const tick = () => new Promise(r => setTimeout(r, 0));
const ruhe = async (n = 8) => { for (let i = 0; i < n; i++) await tick(); };

function backend() {
  return {
    async info() { return { role: "A", name: "Anna", partner: "Bernd", nameA: "Anna", nameB: "Bernd" }; },
    bstate: { get: async () => null, set: async () => true },
    pstate: { get: async () => null, set: async () => true },
    chat: { load: async () => null, save: async () => true },
    handover: { post: async () => {}, get: async () => null },
    llm: async () => ({ text: "ok", stop: "end_turn" }),
  };
}

let root, app;
beforeEach(async () => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app");
  app = createApp({ doc: document, backend: backend(), root });
  await app.boot();
  await ruhe();
});

const ZWEIGETEILT = ["scrStart", "scrMyRoom", "scrShared"];

describe("T1a · dieselbe Aufteilung auf allen Screens", () => {
  it("stehende Screens: oben Papier, unten Tiefgrün", () => {
    for (const id of ZWEIGETEILT) {
      const zonen = root.querySelectorAll("#" + id + " > .rz-half");
      expect(zonen, id).toHaveLength(2);
      expect(zonen[0].classList.contains("rz-papier"), id + " oben").toBe(true);
      expect(zonen[1].classList.contains("rz-tiefgruen"), id + " unten").toBe(true);
    }
  });

  it("die Session teilt sich genauso", async () => {
    const p = app.startChat("solo");
    await ruhe(12);
    p.catch(() => {});
    expect(root.querySelector("#scrChat .rz-chat-oben").classList.contains("rz-papier")).toBe(true);
    expect(root.querySelector("#scrChat .rz-chat-unten").classList.contains("rz-tiefgruen")).toBe(true);
  });

  it("keine Regal-Flächenklasse ist mehr im Einsatz", () => {
    for (const id of [...ZWEIGETEILT, "scrProzess"])
      expect(root.querySelector("#" + id).outerHTML, id).not.toMatch(/class="[^"]*rz-regal(-dunkel)?[\s"]/);
  });

  it("die Regal-Zeilen leben weiter — als Möbel, nicht als Fläche", () => {
    // Der Begriff bleibt für das Möbel: Reihen, Kästen, Accordion.
    expect(root.querySelector("#scrMyRoom .rz-regal-reihen")).toBeTruthy();
    expect(DESIGN_CSS).toContain(".rz-regal-reihen");
  });
});

describe("T1a · die Palette ist entsprechend kleiner", () => {
  it("keine Flächentoken für das Regal mehr", () => {
    for (const tok of ["--rz-papier-regal", "--rz-regal-dunkel", "--rz-hairline-regal"])
      expect(DESIGN_CSS).not.toContain(tok);
  });

  it("dunkler wird es nur über das Dark-Theme", () => {
    // Der Dark-Block vertieft Papier UND Tiefgrün — das ist der einzige Weg.
    expect(DESIGN_CSS).toMatch(/html\[data-theme=dark\]\{[\s\S]*--rz-papier:#242b21/);
    expect(DESIGN_CSS).toMatch(/html\[data-theme=dark\]\{[\s\S]*--rz-tiefgruen:#101b14/);
  });

  it("keine Auf-Grün-Regel führt den Regal-Selektor doppelt", () => {
    expect(DESIGN_CSS).not.toContain(".rz-regal-dunkel .rz-");
  });
});

describe("T1a/F2 · die Kulissen-Fassung folgt dem Untergrund", () => {
  it("im Zonenfuß gilt immer der Teich — dort ist der Grund in beiden Themes dunkel", () => {
    expect(DESIGN_CSS).toContain(".rz-kulisse-fuss .rz-kulisse-hell{display:none}");
    expect(DESIGN_CSS).toContain(".rz-kulisse-fuss .rz-kulisse-dunkel{display:block}");
  });

  it("auf der Naht bleibt es theme-gebunden — dort ist der Grund Papier", () => {
    expect(DESIGN_CSS).toContain("html[data-theme=dark] .rz-kulisse-hell{display:none}");
    expect(DESIGN_CSS).not.toContain(".rz-kulisse-naht .rz-kulisse-hell{display:none}");
  });

  it("die Vorraum-Halter sind Fuß-Halter, die Startseite hat einen Naht-Halter", () => {
    expect(root.querySelector("#kulisseMein").classList.contains("rz-kulisse-fuss")).toBe(true);
    expect(root.querySelector("#kulisseTeil").classList.contains("rz-kulisse-fuss")).toBe(true);
    expect(root.querySelector("#kulisseStart").classList.contains("rz-kulisse-naht")).toBe(true);
  });
});
