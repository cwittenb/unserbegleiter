// @vitest-environment happy-dom
// S141 · Zwei Nachträge zu S140.
//
// 1. Der Rückweg aus den Einstellungen führte pauschal auf den Start. Für die
//    Vorräume ist das richtig — sie SIND die Ebene unter dem Start. Die
//    Einstellungen betritt man dagegen von überall her (das Zeichen liegt in
//    der festen Bedien-Ecke), also gehört der Rückweg dorthin zurück, wo man
//    herkam. Das gilt für den Pfeil und für das Zeichen gleichermaßen: ein Ort
//    mit zwei verschiedenen Ausgängen wäre schwerer zu lernen als einer.
//
// 2. Klappte rechts eine Sektion auf, rutschte der Inhalt der Papier-Spalte um
//    eine halbe Fensterhöhe nach unten. Ursache war die S125-Regel
//    `.rz-regal-offen>.rz-half:first-child .rz-fuss{margin-bottom:50dvh}`: Sie
//    hält einen Zonenfuß an der Naht, der UNTEN steht. Auf diesem Screen steht
//    er OBEN und trägt die Zonenüberschrift — der Abstand schob dort nicht den
//    Fuß, sondern alles darunter.

import { describe, it, expect, beforeEach } from "vitest";
import { DESIGN_CSS } from "../../core/ui/design.js";
import { createApp } from "../../core/ui/app.js";

const tick = () => new Promise(r => setTimeout(r, 0));
const ruhe = async (n = 10) => { for (let i = 0; i < n; i++) await tick(); };
const CSS = DESIGN_CSS.replace(/\/\*[\s\S]*?\*\//g, "");

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
const klick = async sel => { (root.querySelector(sel) || document.querySelector(sel)).click(); await ruhe(); };

async function bauen() {
  const app = createApp({ doc: document, backend: backendEinfach(), root });
  await app.boot();
  await ruhe();
  return app;
}

/* ---- 1 · Rückweg ---- */

describe("S141 · der Rückweg führt dorthin zurück, wo man herkam", () => {
  for (const [von, oeffner] of [["scrMyRoom", "#btnMyRoom"], ["scrShared", "#btnSharedRoom"]]) {
    it(`aus ${von}: das Zeichen bringt einen dorthin zurück`, async () => {
      await bauen();
      await klick(oeffner);
      expect(sichtbar(von)).toBe(true);
      await klick("#pbEinst");
      expect(sichtbar("scrEinstellungen")).toBe(true);
      await klick("#pbEinst");
      expect(sichtbar(von), "nicht auf den Start abgeworfen").toBe(true);
      expect(sichtbar("scrStart")).toBe(false);
    });

    it(`aus ${von}: und der Pfeil geht denselben Weg`, async () => {
      await bauen();
      await klick(oeffner);
      await klick("#pbEinst");
      await klick("#btnEinstZurueck");
      expect(sichtbar(von)).toBe(true);
    });
  }

  it("vom Start aus bleibt es der Start", async () => {
    await bauen();
    await klick("#pbEinst");
    await klick("#btnEinstZurueck");
    expect(sichtbar("scrStart")).toBe(true);
  });

  it("die Herkunft wird beim Betreten gemerkt, nicht beim Verlassen", async () => {
    // Sonst stünde beim Verlassen längst scrEinstellungen als aktueller Screen
    // und der Merker zeigte auf sich selbst.
    await bauen();
    await klick("#btnSharedRoom");
    await klick("#pbEinst");
    await klick("#pbEinst");
    expect(sichtbar("scrShared")).toBe(true);
    // Und beim nächsten Mal von woanders gilt die neue Herkunft.
    await klick("#btnMyRoom");
    await klick("#pbEinst");
    await klick("#pbEinst");
    expect(sichtbar("scrMyRoom")).toBe(true);
  });

  it("die Vorräume behalten ihren eigenen Rückweg auf den Start", async () => {
    // Regressionsschutz: das neue Ziel gilt NUR den Einstellungen.
    await bauen();
    await klick("#btnSharedRoom");
    await klick("#btnZurueck2");
    expect(sichtbar("scrStart")).toBe(true);
  });
});

/* ---- 2 · Der Fuß der Papier-Spalte im offenen Regal ---- */

describe("S141 · aufklappen verschiebt die andere Spalte nicht mehr", () => {
  it("die Ausnahme steht und sticht die Klassenregel", () => {
    expect(CSS).toContain(
      "#scrEinstellungen.rz-regal-offen>.rz-half:first-child .rz-fuss{margin-bottom:0}");
  });

  it("die Grundregel bleibt für die Vorräume unangetastet", () => {
    // Dort steht der Zonenfuß unten und braucht den Abstand weiterhin.
    expect(CSS).toContain(".rz-regal-offen>.rz-half:first-child .rz-fuss{margin-bottom:50dvh}");
  });

  it("und der Screen kommt in beiden Zuständen ohne Flanke aus", () => {
    // Zugeklappt regelte das S119.4, offen jetzt S141 — zwei Zustände, zwei
    // Regeln, dieselbe Aussage: Auf diesem Screen gibt es keine Flanke.
    expect(CSS).toContain(
      "#scrEinstellungen.rz-split:not(.rz-regal-offen)>.rz-half:first-child .rz-fuss{margin-bottom:0}");
  });

  it("der Zonenfuß dieses Screens steht wirklich oben", async () => {
    // Die Begründung der Ausnahme hängt daran. Kippt das Markup zurück auf
    // einen Fuß am Zonenende, ist die Ausnahme falsch und dieser Fall meldet es.
    await bauen();
    const oben = root.querySelector("#scrEinstellungen .rz-papier");
    const fuss = oben.querySelector(".rz-fuss");
    expect(fuss.classList.contains("rz-fuss-oben")).toBe(true);
    // und es steht Inhalt DARUNTER, den ein margin-bottom verschieben würde
    expect(fuss.nextElementSibling && fuss.nextElementSibling.id).toBe("einstOben");
  });
});
