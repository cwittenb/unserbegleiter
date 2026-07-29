// @vitest-environment happy-dom
// U7 · Wächter über die Einstellungen als Ort (Turn 41 · Nachtrag).
//
// Zwei Sorten Aussage:
//   · was verschwunden ist — das Panel war der letzte schwebende Behälter
//     der App und der letzte Ort mit Radius UND Schatten;
//   · wo was steht — die Naht trennt hier nach REICHWEITE, nicht nach Thema.
//
// Dazu 3.6: die Zeilendichte. Der Nachtrag vermutete zwei verschiedene
// Dichten im Repo; nachgerechnet gibt es genau eine.

import { describe, it, expect, beforeEach } from "vitest";
import { DESIGN_CSS, CHROME_HTML } from "../../core/ui/design.js";
import { THEME_CSS } from "../../core/ui/theme.js";
import { createApp } from "../../core/ui/app.js";

const KOMPONENTEN = DESIGN_CSS.slice(DESIGN_CSS.indexOf(THEME_CSS) + THEME_CSS.length);
const tick = () => new Promise(r => setTimeout(r, 0));
const ruhe = async (n = 8) => { for (let i = 0; i < n; i++) await tick(); };

function regel(selektor) {
  const i = KOMPONENTEN.indexOf(selektor + "{");
  if (i < 0) return "";
  return KOMPONENTEN.slice(i, KOMPONENTEN.indexOf("}", i) + 1);
}

function backendEinfach() {
  return {
    async info() { return { role: "A", name: "Anna", partner: "Bernd", nameA: "Anna", nameB: "Bernd" }; },
    bstate: { get: async () => null, set: async () => true },
    pstate: { get: async () => null, set: async () => true },
    chat: { load: async () => null, save: async () => true },
    llm: async () => ({ text: "ok", stop: "end_turn" }),
    language: { request: async () => ({}), withdraw: async () => ({}) },
  };
}

let root;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app");
});

describe("U7 · das Panel ist verschwunden (1.1)", () => {
  it("die Bedien-Ecke trägt kein Blatt mehr — und verspricht auch keins", () => {
    expect(CHROME_HTML).not.toContain("rz-einst-blatt");
    // aria-haspopup="dialog" hätte weiter ein Panel angekündigt.
    expect(CHROME_HTML).not.toContain("aria-haspopup");
  });

  it("keine Regel für das Blatt mehr, und der Schatten-Token ist weg", () => {
    expect(KOMPONENTEN).not.toContain(".rz-einst-blatt");
    // Der letzte Ort mit Radius UND Schatten. Das Token trug nur er.
    expect(THEME_CSS).not.toContain("--rz-blatt-schatten");
  });
});

describe("U7 · die Naht trennt nach Reichweite (1.2)", () => {
  it("die eigene Wahl steht oben, der Vorschlag an den Partner unten", async () => {
    const app = createApp({ doc: document, backend: backendEinfach(), root });
    await app.boot();
    document.getElementById("pbEinst").click();
    await ruhe();

    const oben = root.querySelector("#einstOben");
    const unten = root.querySelector("#einstGemeinsam");
    expect(oben.closest(".rz-papier"), "Wahl gehört auf Papier").toBeTruthy();
    expect(unten.closest(".rz-tiefgruen"), "Vorschlag gehört in die grüne Zone").toBeTruthy();

    // Sprachwahl und Sprachvorschlag haben dasselbe Thema und stehen trotzdem
    // in verschiedenen Zonen — das ist die Aussage von 1.2.
    expect(oben.querySelector('[data-ui="de"]')).toBeTruthy();
    expect(unten.querySelector("#einstSprachAntrag")).toBeTruthy();
    expect(oben.querySelector("#einstSprachAntrag"), "nicht oben").toBeNull();
  });

  it("Wiedereinstieg und Löschen stehen unten, nicht mehr im Raum-Regal", async () => {
    const app = createApp({ doc: document, backend: backendEinfach(), root });
    await app.boot();
    await ruhe();
    for (const id of ["#btnRecovery", "#btnVerlaeufeWeg"]) {
      const z = root.querySelector(id);
      expect(z, id).toBeTruthy();
      expect(z.closest("#scrEinstellungen"), id + " gehört in die Einstellungen").toBeTruthy();
    }
    expect(root.querySelector("#scrMyRoom #btnRecovery"), "nicht mehr im Raum").toBeNull();
  });

  it("das Badge nennt den Ort, an dem man ist", async () => {
    const app = createApp({ doc: document, backend: backendEinfach(), root });
    await app.boot();
    await ruhe();
    // Regel aus K5: überall der Ort, an dem man steht — nicht der Rückweg.
    expect(root.querySelector("#wegBadgeEinst").textContent).toContain("Einstellungen");
  });
});

describe("U7 · Gruppen und Hinweise (3.1–3.3)", () => {
  it("das Caps-Label ist ein Gruppen-Label, keine Zeile", () => {
    const r = regel(".rz-einst-gruppe .rz-caps");
    expect(r).toContain("min-height:0");     // nicht antippbar
    expect(r).toContain("margin:0 0 4px");
  });

  it("jede Gruppe schließt unten mit einer Haarlinie ab", () => {
    // Sonst beginnt der Hinweistext darunter optisch wie eine weitere Option.
    expect(regel(".rz-einst-gruppe .rz-zeile:last-of-type"))
      .toContain("border-bottom:1px solid var(--rz-karte-rand)");
  });

  it("der Hinweis hängt an der Zeile darüber, nicht zwischen zwei Knöpfen", () => {
    expect(regel(".rz-einst-fuss")).toContain("margin:var(--rz-r-2) 0 0");
    expect(regel(".rz-einst-gruppe+.rz-einst-gruppe")).toContain("margin-top:26px");
  });
});

describe("U7 · die Kulisse bekommt Freiraum (3.5)", () => {
  it("ein eigenes Maß, nicht --rz-nahtfrei", () => {
    // Das Badge ist 32 px hoch, die Naht-Kulisse 84. --rz-nahtfrei auf 96 zu
    // heben hätte jeden Screen verändert.
    const m = THEME_CSS.match(/--rz-kulissenfrei:(\d+)px/);
    expect(m).toBeTruthy();
    expect(Number(m[1])).toBeGreaterThanOrEqual(96);
    expect(THEME_CSS).toContain("--rz-nahtfrei:32px");
    expect(regel(".rz-einst-oben")).toContain("padding-bottom:var(--rz-kulissenfrei)");
  });
});

describe("3.6 · es gibt genau EINE Zeilendichte", () => {
  it(".rz-zeile setzt Polster und Zeilenhöhe an genau einer Stelle", () => {
    /* Der Nachtrag vermutete zwei Dichten (44 px in 41g/41h, 75 px sonst).
       Nachgerechnet: 17 px × 1.3 = 22,1 + 2 × 15 Polster = 52 px, und
       min-height:44px greift dabei gar nicht. Es gibt nur eine Regel — dieser
       Test hält fest, dass niemand sie screenweise übersteuert. */
    const grund = regel(".rz-zeile");
    expect(grund).toContain("box-sizing:border-box");
    expect(grund).toContain("min-height:44px");
    expect(grund).toContain("padding:15px 0");
    expect(grund).toContain("font-size:var(--rz-fs-zeile)");

    // Keine zweite Regel darf Polster oder Zeilenhöhe von .rz-zeile setzen —
    // ausgenommen die aufgeklappte Regal-Zeile, die bewusst anders ist.
    // Kommentare vorher raus: sie stehen zwischen den Regeln und würden als
    // Teil des Selektors gelesen.
    const ohneKommentar = KOMPONENTEN.replace(/\/\*[\s\S]*?\*\//g, "");
    for (const m of ohneKommentar.matchAll(/([^{}]*\.rz-zeile[^{}]*)\{([^}]*)\}/g)) {
      if (m[1].includes(".rz-auf")) continue;
      if (m[1].trim() === ".rz-zeile") continue;
      expect(m[2], "übersteuert Dichte: " + m[1].trim()).not.toMatch(/(^|;)\s*padding:/);
      expect(m[2], "übersteuert Dichte: " + m[1].trim()).not.toMatch(/min-height:/);
    }
  });
});
