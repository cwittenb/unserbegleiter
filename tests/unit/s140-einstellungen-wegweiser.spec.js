// @vitest-environment happy-dom
// S140.1 · Der Wegweiser auf dem Einstellungs-Screen.
//
// Befund: Auf diesem einen Ort war das Wegweiser-Zeichen unsichtbar. Ursache
// war NICHT das Layout — der Screen steht seit U7 in der boxId-Tabelle von
// aktualisiereWegweiser(). Es gab schlicht keine Kandidaten, und null Zeilen
// blenden Panel UND Zeichen aus (der Zweig ist derselbe wie bei einer leeren
// Lage im Chat).
//
// Inhaltlich ist der Screen ein Sonderfall: Einen "nächsten Schritt" wie in
// den Vorräumen gibt es hier nicht. Stufe 4 sagt deshalb, was die beiden Zonen
// bedeuten; Stufe 2 trägt den einen Zustand, der wirklich wartet.

import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";
import { de } from "../../core/i18n/de.js";
import { en } from "../../core/i18n/en.js";

const tick = () => new Promise(r => setTimeout(r, 0));
const ruhe = async (n = 10) => { for (let i = 0; i < n; i++) await tick(); };

const NEUE_SCHLUESSEL = [
  "weg.einstSprachAntrag", "weg.einstSprachWartet",
  "weg.einstZugang", "weg.einstEndgueltig",
];

function backendEinfach(info = {}) {
  return {
    async info() {
      return { role: "A", name: "Anna", partner: "Bernd", nameA: "Anna", nameB: "Bernd", ...info };
    },
    bstate: { get: async () => null, set: async () => true },
    pstate: { get: async () => null, set: async () => true },
    chat: { load: async () => null, save: async () => true },
    handover: { get: async () => null, post: async () => true },
    llm: async () => ({ text: "ok", stop: "end_turn" }),
    language: { request: async () => ({}), withdraw: async () => ({}) },
    /* S142 · Die Fassade traegt jetzt recovery. Ohne sie faellt die
       Zugangs-Zeile weg (die Regal-Zeile waere dann auch ausgeblendet) — die
       Faelle hier pruefen aber die RUHIGE Lage einer vollstaendigen App, nicht
       den Artefakt-Bau ohne Wiedereinstieg. Der stille Wegfall haette die
       Aussage dieser Datei unbemerkt halbiert. */
    recovery: { beginVerify: async () => ({}), confirm: async () => ({}) },
  };
}

let root;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app");
});

/** Einstellungen betreten und warten, bis der Wegweiser gezeichnet ist. */
async function betreteEinstellungen(info) {
  const app = createApp({ doc: document, backend: backendEinfach(info), root });
  await app.boot();
  await ruhe();
  document.getElementById("pbEinst").click();
  await ruhe();
  return app;
}

const zeilen = () =>
  [...root.querySelectorAll("#wegEinst .rz-option")].map(p => p.textContent);

describe("S140.1 · das Zeichen steht wieder", () => {
  it("nach dem Betreten ist das Wegweiser-Zeichen sichtbar", async () => {
    await betreteEinstellungen();
    const badge = root.querySelector("#wegBadgeEinst");
    expect(badge.classList.contains("pb-hidden"), "das Zeichen war der Befund").toBe(false);
  });

  it("und das Panel trägt Zeilen samt Fußzeile", async () => {
    await betreteEinstellungen();
    const box = root.querySelector("#wegEinst");
    expect(box.classList.contains("pb-hidden")).toBe(false);
    expect(zeilen().length).toBeGreaterThan(0);
    // Dieselbe Form wie überall: Optionen, dann die Fußzeile des Wegweisers.
    expect(box.querySelector(".rz-weg-fuss")).toBeTruthy();
  });
});

describe("S140.1 · was dort steht", () => {
  it("ruhige Lage: die beiden stehenden Zeilen, in Code-Reihenfolge", async () => {
    await betreteEinstellungen();
    expect(zeilen()).toEqual([de["weg.einstZugang"], de["weg.einstEndgueltig"]]);
  });

  it("ein Vorschlag des Partners steht VORN — Stufe 2 vor Stufe 4", async () => {
    await betreteEinstellungen({ languageRequest: { by: "B", target: "en" } });
    const z = zeilen();
    expect(z[0]).toBe(de["weg.einstSprachAntrag"].replace("{partner}", "Bernd"));
    expect(z.length).toBe(3);
  });

  it("der eigene Vorschlag sagt, dass er wartet — nicht, dass jemand fragt", async () => {
    await betreteEinstellungen({ languageRequest: { by: "A", target: "en" } });
    const z = zeilen();
    expect(z[0]).toBe(de["weg.einstSprachWartet"].replace("{partner}", "Bernd"));
    // Die Fremd-Zeile darf daneben NICHT stehen: es ist ein Antrag, nicht zwei.
    expect(z.some(x => x.startsWith("Bernd schlägt"))).toBe(false);
  });

  it("der Deckel von drei gilt auch hier", async () => {
    await betreteEinstellungen({ languageRequest: { by: "B", target: "en" } });
    expect(zeilen().length).toBeLessThanOrEqual(3);
  });
});

describe("S140.1 · die Texte liegen zweisprachig vor", () => {
  for (const k of NEUE_SCHLUESSEL) {
    it(k + " steht in beiden Wörterbüchern", () => {
      expect(de[k], "DE fehlt").toBeTruthy();
      expect(en[k], "EN fehlt").toBeTruthy();
    });
  }

  it("und die Platzhalter stimmen paarweise überein", () => {
    const platz = s => (s.match(/\{\w+\}/g) || []).sort().join(",");
    for (const k of NEUE_SCHLUESSEL) expect(platz(en[k]), k).toBe(platz(de[k]));
  });
});
