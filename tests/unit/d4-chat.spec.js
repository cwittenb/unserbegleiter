// @vitest-environment happy-dom
// Design-Track D4 — Chat ohne Blasen (Design 17e): Kopf mit Zurueck-Pfeil und
// Caps-Titel, Sprecherlabel "Begleitung" nur beim Rollenwechsel, Nachrichten
// als reiner Text (Rollen-Klassen bleiben), Abschluss als Hairline-Zeile.

import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";

const tick = () => new Promise(r => setTimeout(r, 0));
const ruhe = async (n = 6) => { for (let i = 0; i < n; i++) await tick(); };

function steuerbaresLlm() {
  const offen = [];
  const fn = async () => new Promise(res => offen.push(res));
  fn.antworte = text => { const r = offen.shift(); if (r) r({ text, stop: "end_turn" }); };
  return fn;
}
function backendMit(llm) {
  return {
    async info() { return { role: "A", name: "Anna", partner: "Bernd", nameA: "Anna", nameB: "Bernd" }; },
    bstate: { get: async () => null, set: async () => true },
    pstate: { get: async () => null, set: async () => true },
    chat: { load: async () => null, save: async () => true },
    handover: { post: async () => {}, get: async () => null },
    llm,
  };
}

let root, llm, app;
beforeEach(async () => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app");
  llm = steuerbaresLlm();
  app = createApp({ doc: document, backend: backendMit(llm), root });
  await app.boot();
  const start = app.startChat("solo");
  await ruhe();
  llm.antworte("Willkommen. Erzähl gern, was dich beschäftigt.");
  await start; await ruhe();
});

describe("D4 · Kopf & Rahmen", () => {
  it("Zurueck-Pfeil links im Kopf, Signatur zentriert, Sessionname darunter, keine Karten-Huelle", () => {
    const kopf = root.querySelector("#scrChat .rz-kopf");
    expect(kopf.querySelector("#btnChatZurueck")).toBeTruthy();
    // D12-2 · Turn 27: der Kopf traegt die Paar-Signatur, der Ort steht im Badge,
    // der Sessionname als leise Serif-Zeile ueber der ersten Nachricht.
    expect(kopf.querySelector(".rz-signatur")).toBeTruthy();
    expect(kopf.querySelector("#chatTitel")).toBeFalsy();
    expect(root.querySelector("#scrChat #chatTitel").classList.contains("rz-sessionname")).toBe(true);
    expect(root.querySelector("#scrChat .rz-chat-innen")).toBeTruthy();
    expect(root.querySelector("#scrChat > .pb-card")).toBeFalsy();
  });

  it("Abschluss-Knopf ist eine Hairline-Zeile (statt Pillen-Knopf)", () => {
    expect(root.querySelector("#btnChatEnde").classList.contains("rz-zeile")).toBe(true);
  });
});

describe("D4 · Sprecherlabel", () => {
  it("'Begleitung' steht als Caps-Marke vor der Begleitungs-Antwort — genau einmal pro Wechsel", async () => {
    root.querySelector("#pbInput").value = "Der Streit von gestern geht mir nach.";
    root.querySelector("#btnSend").click();
    await tick();
    llm.antworte("Magst du erzählen, worum es für dich ging?");
    await ruhe();
    const art = k => k.classList.contains("rz-sprechgruppe") ? "G"
      : k.classList.contains("rz-sprecher") ? "L"
      : k.classList.contains("pb-msg") ? (k.classList.contains("ai") ? "ai" : "me") : "?";
    const kinder = [...root.querySelectorAll("#pbMsgs > *")];
    // T2g · Label und Antwort stehen seit T2 in einer .rz-sprechgruppe; auf
    // der obersten Ebene liegt deshalb die Gruppe, nicht mehr das Label.
    expect(kinder.map(art)).toEqual(["G", "me", "G"]);
    // Label vor JEDER zusammenhaengenden Begleitungs-Passage, nie doppelt:
    for (const g of kinder.filter(k => k.classList.contains("rz-sprechgruppe")))
      expect([...g.children].map(art)).toEqual(["L", "ai"]);
    const labels = root.querySelectorAll("#pbMsgs .rz-sprecher");
    for (const l of labels) expect(l.textContent).toBe("Begleitung");
  });
});
