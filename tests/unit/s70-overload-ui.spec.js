// @vitest-environment happy-dom
// S70 · Overload-Härtung — UI-Ebene.
// (1) onStatus("overloaded_retry") zeigt die ZAHLENLOSE Warteanzeige in der
//     Tipp-Blase (kein „Versuch n/m" irgendwo);
// (2) ein finaler llm_overloaded-Fehler zeigt die freundliche Meldung (statt
//     Roh-JSON) plus den „Erneut senden"-Knopf;
// (3) der Knopf feuert den offenen Zug erneut (resume) — die Person tippt
//     nichts neu; nach Erfolg verschwinden Meldung und Knopf.

import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";
import { de } from "../../core/i18n/de.js";
import { setLocale } from "../../core/i18n/index.js";

const tick = () => new Promise(r => setTimeout(r, 0));
const ruhe = async (n = 6) => { for (let i = 0; i < n; i++) await tick(); };

/** LLM, dessen Ausgänge (Antwort / Overload-Fehler / Status-Event) von außen
 *  gesteuert werden. Signatur wie der echte Adapter: (sys, msgs, onDelta, onStatus). */
function steuerbaresLlm() {
  const offen = [];
  const fn = async (sys, msgs, onDelta, onStatus) =>
    new Promise((res, rej) => offen.push({ res, rej, onStatus }));
  fn.antworte = text => { const o = offen.shift(); if (o) o.res({ text, stop: "end_turn" }); };
  fn.ueberlaste = () => {
    const o = offen.shift();
    if (!o) return;
    const e = new Error('LLM HTTP 529 — {"type":"error","error":{"type":"overloaded_error"}}');
    e.code = "llm_overloaded";
    o.rej(e);
  };
  fn.melde = () => { const o = offen[0]; if (o && typeof o.onStatus === "function") o.onStatus("overloaded_retry"); };
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

let root, llm;
beforeEach(async () => {
  setLocale("de");
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app");
  llm = steuerbaresLlm();
  const app = createApp({ doc: document, backend: backendMit(llm), root });
  await app.boot();
  const start = app.startChat("solo");
  await ruhe();
  llm.antworte("Willkommen. Erzähl gern, was dich beschäftigt.");
  await start; await ruhe();
});

const sende = async text => {
  root.querySelector("#pbInput").value = text;
  root.querySelector("#btnSend").click();
  await ruhe();
};
const fehlerBox = () => root.querySelector("#pbErr");
const knopf = () => root.querySelector("#btnErneutSenden");
const streamBlase = () => root.querySelector("#pbStream");

describe("S70 · Warteanzeige bei Auslastungs-Retries", () => {
  it("onStatus zeigt die zahlenlose Warte-Zeile in der Tipp-Blase", async () => {
    await sende("Mich beschäftigt unser Wochenende.");
    llm.melde();                                    // Worker meldet: Wiederholung läuft
    await ruhe();
    const blase = streamBlase();
    expect(blase).toBeTruthy();
    expect(blase.textContent).toContain(de["chat.ausgelastetWarte"]);
    expect(blase.querySelector(".pb-typing")).toBeTruthy();   // Tipp-Punkte bleiben
    expect(blase.textContent).not.toMatch(/\d\s*\/\s*\d/);    // KEIN „n/m"-Zähler
    llm.antworte("Magst du mehr erzählen?");        // Erfolg räumt die Anzeige weg
    await ruhe();
    expect(root.textContent).toContain("Magst du mehr erzählen?");
    expect(root.textContent).not.toContain(de["chat.ausgelastetWarte"]);
  });
});

describe("S70 · Finaler Overload: freundliche Meldung + Erneut senden", () => {
  it("zeigt die lokalisierte Meldung statt Roh-JSON und einen Knopf", async () => {
    await sende("Mich beschäftigt unser Wochenende.");
    llm.ueberlaste();
    await ruhe();
    expect(fehlerBox().textContent).toContain(de["fehler.code.llm_overloaded"]);
    expect(fehlerBox().textContent).not.toContain("529");
    expect(fehlerBox().textContent).not.toContain('{"type"');
    expect(knopf()).toBeTruthy();
    expect(knopf().textContent).toBe(de["chat.erneutSenden"]);
  });

  it("Klick feuert den offenen Zug erneut — ohne neues Tippen; Erfolg räumt auf", async () => {
    await sende("Mich beschäftigt unser Wochenende.");
    llm.ueberlaste();
    await ruhe();
    knopf().click();
    await ruhe();
    llm.antworte("Danke für deine Geduld. Magst du mehr erzählen?");
    await ruhe();
    expect(root.textContent).toContain("Danke für deine Geduld. Magst du mehr erzählen?");
    // die ursprüngliche Nachricht steht weiter GENAU EINMAL im Verlauf
    const treffer = [...root.querySelectorAll(".pb-msg")]
      .filter(d => d.textContent.includes("Mich beschäftigt unser Wochenende."));
    expect(treffer.length).toBe(1);
    expect(knopf()).toBeFalsy();
    expect(fehlerBox().classList.contains("pb-hidden")).toBe(true);
  });
});

describe("S70 · Negativfall: code-loser Fehler zeigt KEINEN Erneut-Knopf", () => {
  it("err(e.message) bleibt der Weg für gewöhnliche Fehler", async () => {
    // eigenes LLM mit code-losem Reject
    const offen = [];
    const nacktesLlm = async () => new Promise((res, rej) => offen.push({ res, rej }));
    nacktesLlm.kontingent = null;
    document.body.innerHTML = '<div id="app"></div>';
    const wurzel = document.getElementById("app");
    const app = createApp({ doc: document, backend: backendMit(nacktesLlm), root: wurzel });
    await app.boot();
    const start = app.startChat("solo");
    await ruhe();
    offen.shift().res({ text: "Willkommen.", stop: "end_turn" });
    await start; await ruhe();
    wurzel.querySelector("#pbInput").value = "Hallo";
    wurzel.querySelector("#btnSend").click();
    await ruhe();
    offen.shift().rej(new Error("Sitzung abgelaufen – bitte neu anmelden."));
    await ruhe();
    expect(wurzel.querySelector("#pbErr").textContent).toContain("Sitzung abgelaufen");
    expect(wurzel.querySelector("#btnErneutSenden")).toBeFalsy();
  });
});
