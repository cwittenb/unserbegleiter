// @vitest-environment happy-dom
// CR-6 · Betrieb (Code-Review C17, C26).
import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";
import { Engine } from "../../core/engine/engine.js";
import { ALLE_BLOECKE } from "../../core/contracts/registry.js";
import { bloeckeLokal } from "../../core/ui/block-texte.js";
import { cleanDisplay } from "../../core/contracts/block.js";
import { de } from "../../core/i18n/de.js";
import { en } from "../../core/i18n/en.js";
import { setLocale } from "../../core/i18n/index.js";
import { CHROME_HTML } from "../../core/ui/design.js";

const tick = () => new Promise(r => setTimeout(r, 0));
const ruhe = async (n = 8) => { for (let i = 0; i < n; i++) await tick(); };

describe("C26 · Block-Platzhalter in der Sprache der Oberfläche", () => {
  it("jeder sichtbare Platzhalter hat einen Wörterbucheintrag in DE und EN; DE ist der Text der Registry", () => {
    // "zeit" ist ausgenommen: Sein Platzhalter steht seit S99.4 unter Vorbehalt (offene Entscheidung).
    const sichtbar = ALLE_BLOECKE.filter(b => b.placeholder && b.dataset !== "zeit");
    expect(sichtbar.length).toBeGreaterThanOrEqual(5);
    expect(de["block.zeit"]).toBeUndefined(); expect(en["block.zeit"]).toBeUndefined();
    for (const b of sichtbar) {
      expect(de["block." + b.dataset], b.dataset).toBe(b.placeholder);
      expect(en["block." + b.dataset], b.dataset).toBeTruthy();
      expect(en["block." + b.dataset]).not.toBe(b.placeholder);
    }
  });
  it("englische Oberfläche zeigt den englischen Platzhalter — Alt-Verlauf (Block im Text)", () => {
    const roh = 'Done.\nGOAL-BLOCK {"op":"new","text":"x"} END GOAL-BLOCK';
    setLocale("en");
    expect(cleanDisplay(roh, [], bloeckeLokal())).toContain(en["block.auftrag"]);
    expect(cleanDisplay(roh, [], bloeckeLokal())).not.toContain("Auftrags-Änderung");
    setLocale("de");
    expect(cleanDisplay(roh, [], bloeckeLokal())).toContain("Auftrags-Änderung übernommen.");
  });
  it("unsichtbare Blöcke bleiben unsichtbar; Start/Ende/Schema bleiben dieselben", () => {
    setLocale("en");
    const lokal = bloeckeLokal();
    expect(lokal).toHaveLength(ALLE_BLOECKE.length);
    lokal.forEach((b, i) => {
      expect(b.start).toBe(ALLE_BLOECKE[i].start); expect(b.schema).toBe(ALLE_BLOECKE[i].schema);
      if (!ALLE_BLOECKE[i].placeholder) expect(b.placeholder).toBe("");
    });
    setLocale("de");
  });
});

describe("C26 · Meldungen der Engine tragen einen Code", () => {
  const def = { sysPrompt: () => "S", markers: {}, markerOrder: [], canAct: () => true };
  it("abgeschlossene Sitzung: Code »abgeschlossen« (der deutsche Text bleibt als Rückfall)", async () => {
    const rufe = [];
    const e = new Engine({ def, chat: { messages: [], status: "finished" }, llm: async () => ({ text: "x" }), ctx: {}, hooks: { onPersonError: (...a) => rufe.push(a) } });
    expect(await e.sendUser("Hallo")).toBe(false);
    expect(rufe).toEqual([["Diese Session ist abgeschlossen.", "abgeschlossen", undefined]]);
  });
  it("Wörterbuch: beide Codes in beiden Sprachen, ohne Technik im Text", () => {
    for (const w of [de, en]) for (const c of ["abgeschlossen", "blockUngueltig"]) {
      expect(w["engine." + c], c).toBeTruthy();
      expect(w["engine." + c]).not.toMatch(/Block|block|JSON|schema/);
    }
  });
});

describe("C17 · Einstellungs-Zeichen nach dem Neuaufbau der Oberfläche", () => {
  let root;
  const backend = () => ({
    async info() { return { role: "A", name: "Anna", partner: "Bernd", nameA: "Anna", nameB: "Bernd" }; },
    bstate: { get: async () => null, set: async () => true }, pstate: { get: async () => null, set: async () => true },
    chat: { load: async () => null, save: async () => true }, handover: { post: async () => {}, get: async () => null },
    llm: async () => ({ text: "ok" }),
  });
  beforeEach(() => { setLocale("de"); document.body.innerHTML = '<div id="app"></div>'; root = document.getElementById("app"); });

  it("nach einer zweiten App-Instanz auf derselben Seite öffnet EIN Tippen die Einstellungen — der neuen Instanz", async () => {
    const b = backend();
    const erste = createApp({ doc: document, backend: b, root }); await erste.boot(); await ruhe();
    const zweite = createApp({ doc: document, backend: b, root }); await zweite.boot(); await ruhe();
    const knopf = document.getElementById("pbEinst");
    expect(knopf, "das Zeichen steht im Body").toBeTruthy();
    knopf.click(); await ruhe();
    expect(zweite._state.screen).toBe("scrEinstellungen");
    expect(erste._state.screen, "die alte Instanz bewegt sich nicht mehr").not.toBe("scrEinstellungen");
    knopf.click(); await ruhe();                         // Kippschalter (S140) gilt weiter
    expect(zweite._state.screen).not.toBe("scrEinstellungen");
  });

  it("auch die Zurück-Geste gehört nur der aktuellen Instanz", async () => {
    const b = backend();
    const erste = createApp({ doc: document, backend: b, root }); await erste.boot(); await ruhe();
    root.querySelector("#btnMyRoom").click(); await ruhe();
    const zweite = createApp({ doc: document, backend: b, root }); await zweite.boot(); await ruhe();
    root.querySelector("#btnMyRoom").click(); await ruhe();
    window.dispatchEvent(new PopStateEvent("popstate")); await ruhe();
    expect(zweite._state.screen).toBe("scrStart");
    window.dispatchEvent(new PopStateEvent("popstate")); await ruhe();
    expect(zweite._state.screen).toBe("scrStart");       // kein zweiter Lauscher, der nachtritt
  });
});

import { findeMarker } from "../../core/contracts/marker.js";
describe("C24 · Marke allein in ihrer Zeile, danach noch Text", () => {
  const ORDER = ["[[PARTNER-RANKING]]", "[[RANKING]]", "[[SLIDERS]]"];
  it("feuert — das Panel war angekündigt", () => {
    expect(findeMarker("Dann stell die Regler ein.\n[[SLIDERS]]\nNimm dir Zeit.", ORDER)).toBe("[[SLIDERS]]");
    expect(findeMarker("Text\n  [[RANKING]]  \n\nNoch ein Satz.\n", ORDER)).toBe("[[RANKING]]");
  });
  it("die letzte Zeile behält Vorrang (wie bisher, auch mit Restzeichen)", () => {
    expect(findeMarker("[[RANKING]]\nText\n[[SLIDERS]].", ORDER)).toBe("[[SLIDERS]]");
    expect(findeMarker("Text\n[[PARTNER-RANKING]]", ORDER)).toBe("[[PARTNER-RANKING]]");
  });
  it("eine Marke IM Fließtext feuert weiterhin nicht (Verschärfung gegenüber v0.29 bleibt)", () => {
    expect(findeMarker("Gleich kommt [[SLIDERS]] für dich.\nNimm dir Zeit.", ORDER)).toBeNull();
    expect(findeMarker("Das Zeichen [[SLIDERS]] meine ich.\nOkay?", ORDER)).toBeNull();
  });
  it("fremde Marken und leere Texte: nichts", () => {
    expect(findeMarker("Text\n[[WEITER]]\nMehr.", ORDER)).toBeNull();
    expect(findeMarker("", ORDER)).toBeNull();
    expect(findeMarker("Text\n[[SLIDERS]]\nMehr.", [])).toBeNull();
  });
});

describe("C28 · Korpus-Datei trägt den Kern-Hash", () => {
  it("Pfad mit eingesetztem Hash; ohne Hash (Tests, Dev) der alte Name", async () => {
    const { korpusPfad } = await import("../../platforms/cloudflare/pages/client.js");
    expect(korpusPfad("en", "a51cbcbe4f91bbd8")).toBe("/korpus.en.a51cbcbe4f91bbd8.js");
    expect(korpusPfad("en", "__CORE_" + "HASH__")).toBe("/korpus.en.js");
  });
  it("Bau und Client nennen dieselbe Datei", async () => {
    const { readFileSync } = await import("node:fs");
    const lies = p => readFileSync(new URL("../../" + p, import.meta.url), "utf8");
    expect(lies("scripts/build-pages.js")).toContain('"public/korpus.en." + hash + ".js"');
    expect(lies("platforms/cloudflare/pages/client.js")).toContain('korpusPfad(locale, "__CORE_HASH__")');
  });
});
