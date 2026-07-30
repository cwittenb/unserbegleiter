// @vitest-environment happy-dom
// S99.1 · Eine laufende Reflexion heißt "fortsetzen".
//
// Die Zeile im Vorraum hieß auch mitten in einer offenen Sitzung
// "Reflexionsgespräch beginnen" — sie versprach einen Neuanfang, den der Klick
// gar nicht einlöst (die Sitzung wird fortgesetzt, nicht neu eröffnet). Für die
// drei anderen Sessions gibt es dieses Versprechen seit S53/S63 nicht mehr;
// das Reflexionsgespräch war die letzte Zeile ohne Zustand.

import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { de } from "../../core/i18n/de.js";
import { en } from "../../core/i18n/en.js";

function memoryBackend(role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "s991", activeModuleId: "betrieb" });
  const bstate = new Bstate(repo), pstate = new Pstate(repo);
  return {
    async info() { return { role, name: "Anna", partner: "Bernd", nameA: "Anna", nameB: "Bernd" }; },
    bstate: { get: f => bstate.get(f), set: (f, v) => bstate.set(f, v) },
    pstate: { get: f => pstate.get(role, f), set: (f, v) => pstate.set(role, f, v) },
    chat: {
      load: (art, id) => repo.get("chat:" + (art === "shared" ? id : role + ":" + id), art === "shared"),
      save: (art, id, c) => repo.set("chat:" + (art === "shared" ? id : role + ":" + id), c, art === "shared"),
    },
    handover: { post: async () => {}, get: async () => null },
    llm: async () => ({ text: "ok", stop: "end_turn" }),
  };
}

const tick = () => new Promise(r => setTimeout(r, 0));
const ruhe = async (n = 10) => { for (let i = 0; i < n; i++) await tick(); };
async function klick(el) { el.click(); await tick(); await tick(); await tick(); }

let root;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app");
});

/** Vorraum "Mein Raum" wirklich BETRETEN — nur der Weg über den Knopf lädt die
 *  Lage (show() schaltet bloß Screens um; wendeLageAn hängt an betrete). */
async function imRaum(soloChat) {
  const backend = memoryBackend();
  if (soloChat) await backend.chat.save("mine", "solo", soloChat);
  const app = createApp({ doc: document, backend, root });
  await app.boot();
  await ruhe();
  await klick(root.querySelector("#btnMyRoom"));
  await ruhe();
  return { app, backend };
}

const label = () => root.querySelector("#soloLabel").textContent;

describe("S99.1 · Die Zeile kennt ihren Zustand", () => {
  it("ohne Sitzung: 'beginnen'", async () => {
    await imRaum(null);
    expect(label()).toBe(de["mein.solo"]);
  });

  it("leere laufende Sitzung ist keine begonnene — 'beginnen' bleibt", async () => {
    await imRaum({ status: "running", messages: [] });
    expect(label()).toBe(de["mein.solo"]);
  });

  it("laufende Sitzung mit Zügen: 'fortsetzen'", async () => {
    await imRaum({ status: "running", messages: [{ role: "assistant", content: "Schön, dass du da bist." }] });
    expect(label()).toBe(de["mein.soloWeiter"]);
  });

  it("abgeschlossene Sitzung: wieder 'beginnen' — der nächste Klick beginnt frisch", async () => {
    await imRaum({ status: "finished", messages: [{ role: "assistant", content: "Alles Gute." }] });
    expect(label()).toBe(de["mein.solo"]);
  });
});

describe("S99.1 · Der Text steht in beiden Sprachen", () => {
  it("DE und EN kennen den Weiter-Text und unterscheiden ihn vom Start-Text", () => {
    expect(de["mein.soloWeiter"]).toBeTruthy();
    expect(en["mein.soloWeiter"]).toBeTruthy();
    expect(de["mein.soloWeiter"]).not.toBe(de["mein.solo"]);
    expect(en["mein.soloWeiter"]).not.toBe(en["mein.solo"]);
  });

  it("er folgt dem Muster der anderen drei Sessions", () => {
    expect(de["mein.soloWeiter"]).toContain("fortsetzen");
    expect(de["mein.einzelWeiter"]).toContain("fortsetzen");
    expect(de["teil.momentWeiter"]).toContain("fortsetzen");
  });
});
