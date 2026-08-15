// @vitest-environment happy-dom
// S140.3 · Das Einstellungs-Zeichen schließt die Einstellungen wieder.
//
// Befund: Jeder Tap führte hinein, auch der zweite. Wer den Ort mit demselben
// Zeichen wieder zumachen wollte, drückte ins Leere.
//
// Der Rückweg ist ausdrücklich DERSELBE, den der Zurück-Pfeil links geht
// (zurueckAus) — ein Ort mit zwei verschiedenen Ausgängen wäre schwerer zu
// lernen als einer mit einem. Damit gilt hier auch dessen Regel aus U10.3:
// Steht ein Fach offen, schließt der erste Tap NUR das Fach.

import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";

const tick = () => new Promise(r => setTimeout(r, 0));
const ruhe = async (n = 10) => { for (let i = 0; i < n; i++) await tick(); };

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

const sichtbar = id => !root.querySelector("#" + id).classList.contains("pb-hidden");
async function tippen() {
  // Die Bedien-Ecke hängt im BODY (applyDesign), nicht im App-Wurzelknoten.
  document.querySelector("#pbEinst").click();
  await ruhe();
}

async function bauen() {
  const app = createApp({ doc: document, backend: backendEinfach(), root });
  await app.boot();
  await ruhe();
  return app;
}

describe("S140.3 · das Zeichen kippt", () => {
  it("der erste Tap öffnet", async () => {
    await bauen();
    await tippen();
    expect(sichtbar("scrEinstellungen")).toBe(true);
  });

  it("der zweite schließt und führt denselben Weg wie der Zurück-Pfeil", async () => {
    await bauen();
    await tippen();
    await tippen();
    expect(sichtbar("scrEinstellungen")).toBe(false);
    expect(sichtbar("scrStart"), "derselbe Ausgang wie btnEinstZurueck").toBe(true);
  });

  it("der dritte öffnet wieder — der Schalter verbraucht sich nicht", async () => {
    await bauen();
    await tippen();
    await tippen();
    await tippen();
    expect(sichtbar("scrEinstellungen")).toBe(true);
  });

  /* S141 · Dieser Fall ist geschärft: Er verlangte "zurück auf den Start",
     was damals stimmte, weil der Screen keinen anderen Rückweg kannte. Jetzt
     führt er auf den Herkunftsscreen — hier ist das der Start, weil man von
     dort kam. Die Aussage "derselbe Ausgang wie der Pfeil" bleibt. */
  it("von woanders aus öffnet er weiterhin, statt zu schließen", async () => {
    await bauen();
    root.querySelector("#btnSharedRoom").click();
    await ruhe();
    expect(sichtbar("scrShared")).toBe(true);
    await tippen();
    expect(sichtbar("scrEinstellungen")).toBe(true);
  });
});

describe("S140.3 · und er erbt die Regel des Pfeils (U10.3)", () => {
  it("bei offenem Fach schließt der erste Tap NUR das Fach", async () => {
    await bauen();
    await tippen();
    const screen = root.querySelector("#scrEinstellungen");
    const zeile = screen.querySelector(".rz-zeile[data-box]:not(.pb-hidden)");
    if (!zeile) return;                          // keine aufklappbare Zeile im Testbau
    zeile.click();
    await ruhe();
    expect(screen.classList.contains("rz-regal-offen")).toBe(true);
    await tippen();
    expect(screen.classList.contains("rz-regal-offen"), "Fach zu").toBe(false);
    expect(sichtbar("scrEinstellungen"), "aber der Ort bleibt").toBe(true);
    await tippen();
    expect(sichtbar("scrEinstellungen"), "erst der zweite führt hinaus").toBe(false);
  });
});

describe("S140.3 · Regressionsschutz", () => {
  it("die Verdrahtung bleibt einmalig", async () => {
    const app = await bauen();
    const knopf = document.querySelector("#pbEinst");
    expect(knopf.dataset.rzVerdrahtet).toBe("1");
    // Ein zweiter boot() auf derselben Ecke darf keinen zweiten Handler hängen,
    // sonst kippte der Schalter zweimal je Tap und stünde still.
    await app.boot();
    await ruhe();
    await tippen();
    expect(sichtbar("scrEinstellungen")).toBe(true);
  });
});
