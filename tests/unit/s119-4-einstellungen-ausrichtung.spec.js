// @vitest-environment happy-dom
// S119.4 · Einstellungen zweispaltig: links unten buendig, rechts oben buendig.
//
// Befund (Desktop): "Geraet und Zugang." lag ueber "Impressum", die Fussmarke
// ueber "Datenschutz", und an beiden Spalten stand eine Bildlaufleiste.
//
// Zwei Ursachen, die zusammenwirkten:
//   1. Die gespiegelte Flanke um die Naht (T2d/Q3a/S114d) ist fuer KURZE
//      Spalten gebaut. Hier sind beide lang, also lief beides ueber.
//   2. Flex-Items schrumpfen per Vorgabe unter ihre Inhaltshoehe. Steht die
//      Spalte auf festem Mass, laeuft der Text aus seiner Box heraus und legt
//      sich auf den Nachbarn — statt nach unten auszuweichen.
//
// Der Regressionsschutz ist hier so wichtig wie der Fix selbst: Die Flanke
// muss fuer Startseite und Vorraeume EXAKT bleiben, wie sie war.

import { describe, it, expect, beforeEach } from "vitest";
import { DESIGN_CSS } from "../../core/ui/design.js";
import { createApp } from "../../core/ui/app.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { freigebeUebergabe } from "../../core/engine/freigabe.js";
import { uebergabeTeilKey } from "../../core/contracts/uebergabe.js";

describe("S119.4 · die Ausnahme gilt genau einem Screen", () => {
  it("links faellt der 50dvh-Abstand nach unten weg", () => {
    expect(DESIGN_CSS).toContain(
      "#scrEinstellungen.rz-split:not(.rz-regal-offen)>.rz-half:first-child .rz-fuss{margin-bottom:0}");
  });

  it("rechts beginnt der Inhalt oben statt auf halber Hoehe", () => {
    expect(DESIGN_CSS).toMatch(
      /#scrEinstellungen\.rz-split:not\(\.rz-regal-offen\)>\.rz-half:last-child>\.rz-regal-reihen\{margin-top:0\}/);
  });

  it("die Bloecke schrumpfen nicht mehr untereinander", () => {
    expect(DESIGN_CSS).toContain("#scrEinstellungen>.rz-half>*{flex:none}");
  });

  it("Regressionsschutz: die Flanke der uebrigen Screens bleibt unangetastet", () => {
    // Die Grundregeln stehen weiterhin da — die Ausnahme nimmt sie NICHT weg.
    expect(DESIGN_CSS).toContain(
      ".rz-split:not(.rz-regal-offen)>.rz-half:first-child .rz-fuss{margin-bottom:50dvh}");
    expect(DESIGN_CSS).toMatch(
      /\.rz-split:not\(\.rz-regal-offen\)>\.rz-half:last-child>\.rz-regal-reihen\{\s*margin-top:calc\(50dvh \+ var\(--rz-nahtfrei\)\)\}/);
  });

  it("und flex:none bleibt auf diesen Screen begrenzt", () => {
    // Eine Aussage ueber JEDE Flaeche der App waere ein anderer Schritt.
    const global = DESIGN_CSS.match(/(^|[\s}])\.rz-half>\*\{flex:none\}/);
    expect(global).toBeNull();
  });
});

/* ---- Aufbau: die Ausnahme muss den Screen auch wirklich treffen ---- */

function memoryBackend(role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "s1194", activeModuleId: "betrieb" });
  const bstate = new Bstate(repo), pstate = new Pstate(repo);
  return {
    async info() { return { role, name: "Lena", partner: "Jonas", nameA: "Lena", nameB: "Jonas" }; },
    bstate: { get: f => bstate.get(f), set: (f, v) => bstate.set(f, v) },
    pstate: { get: f => pstate.get(role, f), set: (f, v) => pstate.set(role, f, v) },
    chat: {
      load: (art, id) => repo.get("chat:" + (art === "shared" ? id : role + ":" + id), art === "shared"),
      save: (art, id, c) => repo.set("chat:" + (art === "shared" ? id : role + ":" + id), c, art === "shared"),
    },
    handover: { post: d => freigebeUebergabe(repo, role, d), get: r => repo.get(uebergabeTeilKey(r), true, "kernwetten") },
    llm: async () => ({ text: "ok", stop: "end_turn" }),
  };
}
const ruhe = async (n = 8) => { for (let i = 0; i < n; i++) await new Promise(r => setTimeout(r, 0)); };

let root;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app");
});

describe("S119.4 · der Screen traegt die Bauteile, auf die die Regeln zielen", () => {
  it("scrEinstellungen ist ein rz-split mit zwei Haelften, Zonenfuss und Regalreihen", async () => {
    const app = createApp({ doc: document, backend: memoryBackend(), root });
    await app.boot();
    await ruhe();

    const screen = root.querySelector("#scrEinstellungen");
    expect(screen.classList.contains("rz-split")).toBe(true);

    const haelften = screen.querySelectorAll(":scope > .rz-half");
    expect(haelften.length).toBe(2);
    // Links: der Zonenfuss, an dem der 50dvh-Abstand hing.
    expect(haelften[0].querySelector(".rz-fuss")).toBeTruthy();
    // Rechts: die Regalreihen, die den 50dvh-Vorlauf trugen.
    expect(haelften[1].querySelector(":scope > .rz-regal-reihen")).toBeTruthy();
  });
});
