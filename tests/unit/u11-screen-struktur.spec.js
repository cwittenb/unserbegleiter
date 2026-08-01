// @vitest-environment happy-dom
// U11 · Strukturtests für das, was die Suite doch sehen kann.
//
// happy-dom rechnet kein Layout — Abstände, Bildlaufleisten und Ausrichtung
// sind hier unsichtbar. Was sie SEHEN kann, ist Struktur: welche Elemente da
// sind, und ob ein Screen sich verhält wie seine Geschwister.
//
// U11.1 war genau so ein Fall: scrProzess war der einzige Screen mit Fußmarke,
// aber ohne den rz-fuss, der sie nach unten schiebt. Kein Test hätte das
// bemerkt — dieser hätte es.

import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";
import { MemoryStore } from "../../core/store/store.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { de } from "../../core/i18n/de.js";
import { en } from "../../core/i18n/en.js";

function backend(role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "u11", activeModuleId: "betrieb" });
  const bstate = new Bstate(repo), pstate = new Pstate(repo);
  return {
    async info() { return { role, name: "Anna", partner: "Bernd", nameA: "Anna", nameB: "Bernd" }; },
    bstate: { get: f => bstate.get(f), set: (f, v) => bstate.set(f, v) },
    pstate: { get: f => pstate.get(role, f), set: (f, v) => pstate.set(role, f, v) },
    chat: { load: async () => null, save: async () => true },
    handover: { post: async () => {}, get: async () => null },
    llm: async () => ({ text: "ok", stop: "end_turn" }),
  };
}
const tick = () => new Promise(r => setTimeout(r, 0));
const ruhe = async (n = 8) => { for (let i = 0; i < n; i++) await tick(); };

let root;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app");
});

describe("U11.1 · Jeder Screen mit Fußmarke schiebt sie auch nach unten", () => {
  it("keine Fußmarke ohne rz-fuss im selben Behälter", async () => {
    /* Der rz-fuss trägt margin-top:auto — er ist das Element, das den Fuß an
       den unteren Rand drückt. Eine Fußmarke ohne ihn klebt am Text.
       scrProzess war der einzige Screen ohne; das ist der Fund U11.1. */
    const app = createApp({ doc: document, backend: backend(), root });
    await app.boot();
    await ruhe();

    const ohneFuss = [];
    for (const marke of root.querySelectorAll(".rz-fussmarke")) {
      const behaelter = marke.parentElement;
      const screen = marke.closest(".rz-screen");
      if (!behaelter.querySelector(".rz-fuss"))
        ohneFuss.push((screen && screen.id) || "?");
    }
    expect(ohneFuss, "Screens mit Fußmarke, aber ohne rz-fuss").toEqual([]);
  });

  it("und es gibt überhaupt Fußmarken zu prüfen", async () => {
    // Ein Test, der nichts findet, ist immer grün. Diese Zeile hält fest,
    // dass die Prüfung oben etwas zu tun hatte.
    const app = createApp({ doc: document, backend: backend(), root });
    await app.boot();
    await ruhe();
    expect(root.querySelectorAll(".rz-fussmarke").length).toBeGreaterThan(3);
  });
});

describe("U11.5 · Platzhalter werden gefüllt, nicht angezeigt", () => {
  it("kein i18n-Text mit {…} landet ungefüllt im gerenderten Haus", async () => {
    /* "Stellen aussuchen, die {partner} lesen darf" stand seit S96 wörtlich in
       der Oberfläche — t() holt den Rohtext, gefüllt wird mit fuelle().
       Diese Prüfung fängt die Klasse: geschweifte Klammern gehören nie in
       sichtbaren Text. */
    const app = createApp({ doc: document, backend: backend(), root });
    await app.boot();
    await ruhe();
    const treffer = (root.textContent || "").match(/\{[a-zA-Z][a-zA-Z0-9]*\}/g);
    expect(treffer, "ungefüllte Platzhalter im Text").toBeNull();
  });

  it("der Zugangstext trägt einen Platzhalter — er MUSS also gefüllt werden", () => {
    /* Der Boot-Test oben findet die Ausschnitt-Tür nicht: Sie entsteht erst am
       Abschluss. Was hier bleibt, ist der Vertrag — und der ist der eigentliche
       Punkt: Ein Text mit {partner} darf nie über t() allein in die Oberfläche,
       sondern nur über fuelle(). Genau das war der Fehler seit S96. */
    expect(de["ausschnitt.zugang"]).toContain("{partner}");
    expect(en["ausschnitt.zugang"]).toContain("{partner}");
  });

  it("die Texte MIT Platzhalter sind bekannt — und in beiden Sprachen gleich viele", () => {
    // Wandert ein Platzhalter beim Übersetzen verloren, füllt fuelle() ins
    // Leere und der Name fehlt still. Beide Wörterbücher müssen dieselben
    // Schlüssel mit Platzhaltern führen.
    const mitPlatz = k => Object.entries(k)
      .filter(([, v]) => typeof v === "string" && /\{[a-zA-Z]/.test(v))
      .map(([schluessel]) => schluessel).sort();
    expect(mitPlatz(en)).toEqual(mitPlatz(de));
  });
});
