// @vitest-environment happy-dom
// R0 · Die Naht zwischen Kontingent-Wächter und Anzeige.
//
// Beide Seiten waren einzeln getestet und grün: der Worker lehnt korrekt mit
// 429 und warmer Meldung ab (tests/worker/quota.spec.js), die Anzeige zeigt
// bei Auslastung korrekt die freundliche Meldung samt „Erneut senden"
// (tests/unit/s70-overload-ui.spec.js). Ungetestet war die STELLE DAZWISCHEN,
// an der ein und derselbe Status 429 zwei völlig verschiedene Dinge bedeutet:
//
//   · Auslastung  — vorübergehend, Wiederholen ist der richtige Rat
//   · Kontingent  — eine bewusste Grenze, Wiederholen ist der falsche Rat
//
// Ohne Unterscheidung verschwand die Kontingent-Meldung hinter der
// Auslastungs-Meldung, und die App bot ausgerechnet die Wiederholung an, die
// Ratenlimit und Duplikat-Wächter verhindern sollen — der Wächter erzeugte
// das Verhalten, gegen das er gebaut ist.

import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";
import { de } from "../../core/i18n/de.js";
import { setLocale } from "../../core/i18n/index.js";

const tick = () => new Promise(r => setTimeout(r, 0));
const ruhe = async (n = 6) => { for (let i = 0; i < n; i++) await tick(); };

/** LLM-Fassade, deren offener Zug von außen abgelehnt werden kann — genau so,
 *  wie der Pages-Client einen Worker-Fehler aufbereitet:
 *  `Object.assign(new Error(data.error), { status, code: data.code })`. */
function steuerbaresLlm() {
  const offen = [];
  const fn = async () => new Promise((res, rej) => offen.push({ res, rej }));
  fn.antworte = text => { const o = offen.shift(); if (o) o.res({ text, stop: "end_turn" }); };
  fn.lehneAb = (meldung, status, code) => {
    const o = offen.shift();
    if (!o) return;
    o.rej(Object.assign(new Error(meldung), code ? { status, code } : { status }));
  };
  return fn;
}

const backendMit = llm => ({
  async info() { return { role: "A", name: "Anna", partner: "Bernd", nameA: "Anna", nameB: "Bernd" }; },
  bstate: { get: async () => null, set: async () => true },
  pstate: { get: async () => null, set: async () => true },
  chat: { load: async () => null, save: async () => true },
  handover: { post: async () => {}, get: async () => null },
  llm,
});

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

/* Die drei Ablehnungen des Wächters, jeweils mit ihrem stabilen Code. */
const FAELLE = [
  ["quota_limit", "fehler.code.quota_limit"],
  ["quota_rate", "fehler.code.quota_rate"],
  ["quota_duplikat", "fehler.code.quota_duplikat"],
];

describe("R0 · Kontingent-Ablehnung erreicht die Person unverfälscht", () => {
  for (const [code, schluessel] of FAELLE) {
    it(code + ": zeigt den eigenen Text, NICHT die Auslastungs-Meldung", async () => {
      await sende("Mich beschäftigt unser Wochenende.");
      llm.lehneAb("Serverseitige Wächter-Meldung", 429, code);
      await ruhe();
      expect(fehlerBox().textContent).toContain(de[schluessel]);
      expect(fehlerBox().textContent).not.toContain(de["fehler.code.llm_overloaded"]);
    });

    it(code + ": bietet KEIN Wiederholen an — der Rat wäre falsch", async () => {
      await sende("Mich beschäftigt unser Wochenende.");
      llm.lehneAb("Serverseitige Wächter-Meldung", 429, code);
      await ruhe();
      expect(knopf()).toBeFalsy();
    });
  }
});

describe("R0 · Auslastung bleibt unverändert Auslastung", () => {
  it("llm_overloaded zeigt weiterhin die Auslastungs-Meldung samt Wiederholen", async () => {
    await sende("Mich beschäftigt unser Wochenende.");
    llm.lehneAb("LLM HTTP 529", 529, "llm_overloaded");
    await ruhe();
    expect(fehlerBox().textContent).toContain(de["fehler.code.llm_overloaded"]);
    expect(knopf()).toBeTruthy();
  });

  it("F5 · eine 429 OHNE Code gilt nicht mehr blind als Auslastung", async () => {
    // Nach R0.2 trägt jede Wächter-Ablehnung ihren Code. Die code-lose 429 ist
    // damit kein bekannter Fall mehr — sie zeigt ihre Meldung und bietet keine
    // Wiederholung an, statt sich als Auslastung auszugeben.
    await sende("Mich beschäftigt unser Wochenende.");
    llm.lehneAb("Zu viele Anfragen.", 429);
    await ruhe();
    expect(fehlerBox().textContent).toContain("Zu viele Anfragen.");
    expect(fehlerBox().textContent).not.toContain(de["fehler.code.llm_overloaded"]);
    expect(knopf()).toBeFalsy();
  });
});
