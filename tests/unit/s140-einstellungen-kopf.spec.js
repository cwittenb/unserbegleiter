// @vitest-environment happy-dom
// S140.2 · Kopf der Einstellungen: kein Titel, gleiche Höhe.
//
// Zwei Befunde, ein Ort:
//   1. "Einstellungen" stand doppelt — als h1 in der Papier-Zone und im
//      Wegweiser-Zeichen an der Naht. Nach K5 nennt das Zeichen den Ort; die
//      Überschrift war die Wiederholung, also geht sie.
//   2. Die beiden Zonenüberschriften ("Nur auf diesem Gerät." /
//      "Gerät und Zugang.") standen zweispaltig versetzt. Ursache war NICHT
//      der Titel allein: Die erste Hälfte trägt zusätzlich die Kopfzeile, die
//      zweite beginnt sofort. Ohne Ausgleich bliebe der Versatz bestehen.
//
// Der Ausgleich ist ein blinder Spiegel, kein gerechnetes Polster — die
// Kopfhöhe hängt an Schriftgrad und Zeilenhöhe.

import { describe, it, expect, beforeEach } from "vitest";
import { DESIGN_CSS } from "../../core/ui/design.js";
import { createApp } from "../../core/ui/app.js";
import { de } from "../../core/i18n/de.js";

const tick = () => new Promise(r => setTimeout(r, 0));
const ruhe = async (n = 10) => { for (let i = 0; i < n; i++) await tick(); };
const CSS = DESIGN_CSS.replace(/\/\*[\s\S]*?\*\//g, "");

/** Der Block einer @media-Klammer als Text. */
function medienBlock(css, bedingung) {
  const start = css.indexOf("@media(" + bedingung + "){");
  if (start < 0) return "";
  let i = css.indexOf("{", start), tiefe = 0, j = i;
  for (; j < css.length; j++) {
    if (css[j] === "{") tiefe++;
    else if (css[j] === "}" && --tiefe === 0) break;
  }
  return css.slice(i + 1, j);
}
const DESKTOP = medienBlock(CSS, "min-width:900px");

function backendEinfach() {
  return {
    async info() { return { role: "A", name: "Anna", partner: "Bernd", nameA: "Anna", nameB: "Bernd" }; },
    bstate: { get: async () => null, set: async () => true },
    pstate: { get: async () => null, set: async () => true },
    chat: { load: async () => null, save: async () => true },
    handover: { get: async () => null, post: async () => true },
    llm: async () => ({ text: "ok", stop: "end_turn" }),
    language: { request: async () => ({}), withdraw: async () => ({}) },
  };
}

let root;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app");
});

async function bauen() {
  const app = createApp({ doc: document, backend: backendEinfach(), root });
  await app.boot();
  await ruhe();
  return root.querySelector("#scrEinstellungen");
}

describe("S140.2 · der Titel ist fort", () => {
  it("der Screen trägt keine h1 mehr", async () => {
    const screen = await bauen();
    expect(screen.querySelector(".rz-h1")).toBeNull();
  });

  it("aber der Ort verschwindet nicht mit ihm — das Zeichen trägt ihn weiter", async () => {
    const screen = await bauen();
    // Die Kopplung ist der Grund, warum die h1 gehen DARF. Fiele der
    // Badge-Text weg, hätte der Screen gar keinen Namen mehr.
    expect(screen.querySelector("#wegBadgeEinst").textContent).toContain(de["einst.titel"]);
  });

  it("beide Zonenüberschriften stehen weiterhin da", async () => {
    const screen = await bauen();
    const h2 = [...screen.querySelectorAll(".rz-h2")].map(e => e.textContent);
    expect(h2).toContain(de["einst.zoneGeraet"]);
    expect(h2).toContain(de["einst.zoneFolgen"]);
  });
});

describe("S140.2 · der blinde Spiegel gleicht die Kopfzeile aus", () => {
  it("er steht in der zweiten Hälfte und ist ein Kopf wie der linke", async () => {
    const screen = await bauen();
    const spiegel = screen.querySelector(".rz-kopf-spiegel");
    expect(spiegel, "Spiegel fehlt").toBeTruthy();
    expect(spiegel.closest(".rz-tiefgruen"), "gehört in die grüne Zone").toBeTruthy();
    expect(spiegel.classList.contains("rz-kopf"), "sonst misst er nicht dieselbe Höhe").toBe(true);
  });

  it("und ist für Vorlesen und Tastatur nicht vorhanden", async () => {
    const screen = await bauen();
    const spiegel = screen.querySelector(".rz-kopf-spiegel");
    expect(spiegel.getAttribute("aria-hidden")).toBe("true");
    expect(spiegel.querySelector("button"), "hier ist nichts zu bedienen").toBeNull();
  });

  it("beide Zonenüberschriften tragen denselben Abstand nach oben", async () => {
    const screen = await bauen();
    for (const zone of [".rz-einst-oben", ".rz-einst-unten"]) {
      const h = screen.querySelector(zone + " .rz-h2-oben");
      expect(h, zone + " ohne rz-h2-oben").toBeTruthy();
    }
    expect(CSS).toContain(".rz-einst-oben .rz-h2-oben{margin-top:var(--rz-r-6)}");
    expect(DESKTOP).toContain(".rz-einst-unten .rz-h2-oben{margin-top:var(--rz-r-6)}");
  });
});

describe("S140.2 · und nur dort, wo er etwas ausgleicht", () => {
  it("gestapelt ist er weg — untereinander gibt es keine gemeinsame Höhe", () => {
    // Die Grundstellung steht breitenunabhängig, NICHT in der Desktop-Klammer:
    // Sonst wäre der Spiegel mobil sichtbar und die Regel griffe genau falsch
    // herum. Dass die Ausnahme trotzdem gewinnt, entscheidet die Spezifität
    // (eine Kennung) und nicht die Reihenfolge im Stylesheet.
    expect(CSS).toContain(".rz-kopf-spiegel{display:none}");
    expect(DESKTOP).not.toContain(".rz-kopf-spiegel{display:none}");
  });

  it("zweispaltig steht er — aber nicht im aufgeklappten Regal", () => {
    expect(DESKTOP).toContain(
      "#scrEinstellungen.rz-split:not(.rz-regal-offen)>.rz-half:last-child>.rz-kopf-spiegel{display:flex}");
  });

  it("Regressionsschutz: kein anderer Screen bekommt einen Kopf in der zweiten Hälfte", async () => {
    await bauen();
    for (const id of ["scrStart", "scrMyRoom", "scrShared"]) {
      const screen = root.querySelector("#" + id);
      const zweite = screen.querySelector(".rz-tiefgruen");
      if (!zweite) continue;
      expect(zweite.querySelector(".rz-kopf"), id + " hat einen Kopf bekommen").toBeNull();
    }
  });
});
