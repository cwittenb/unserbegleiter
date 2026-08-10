// @vitest-environment happy-dom
// S119.2 · Ein gescheiterter Öffner darf keine kaputte Fläche hinterlassen.
//
// Herkunft: S119.1. Dort wies der Worker das Feld "messIntervall" mit 404 ab;
// der Fehler flog aus zeigeAgenda(), und weil regalModus allein am
// Erfolgszweig von infoToggle hing, blieb der Kasten sichtbar stehen, ohne
// dass der Screen je in den Vollbild-Zustand ging. Das sah aus wie ein
// Layout-Fehler ("öffnet als Akkordeon") und war ein abgerissener Ablauf.
//
// Der Weg im Test ist derselbe wie damals: zeigeAgenda() faengt das Lesen von
// "agenda" und "goals" selbst ab (.catch(() => null)) — abgerissen ist der
// Ablauf erst an rhythmusSektion(), das "messIntervall" OHNE Netz liest.
// Deshalb ist genau dieses Feld das kaputte im Test; ein scheiterndes
// "agenda" wuerde gar nichts beweisen.
//
// Der Fehler selbst wird ausdrücklich NICHT geschluckt: Ein stiller
// Fehlschlag wäre nur die nächste Verwirrung. Er landet wie bisher in der
// Fehlerbox, die Fläche bleibt aber ganz.

import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { freigebeUebergabe } from "../../core/engine/freigabe.js";
import { uebergabeTeilKey } from "../../core/contracts/uebergabe.js";

/** Backend wie im D9-Test — nur dass einzelne bstate-Felder auf Wunsch
 *  scheitern, so wie der Worker es bei einem unbekannten Feld tut. */
function memoryBackend({ role = "A", kaputteFelder = [] } = {}) {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "s119", activeModuleId: "betrieb" });
  const bstate = new Bstate(repo), pstate = new Pstate(repo);
  return {
    store, repo,
    async info() { return { role, name: "Lena", partner: "Jonas", nameA: "Lena", nameB: "Jonas" }; },
    bstate: {
      get: f => kaputteFelder.includes(f)
        ? Promise.reject(new Error("Unbekanntes Bstate-Feld: " + f))
        : bstate.get(f),
      set: (f, v) => bstate.set(f, v),
    },
    pstate: { get: f => pstate.get(role, f), set: (f, v) => pstate.set(role, f, v) },
    chat: {
      load: (art, id) => repo.get("chat:" + (art === "shared" ? id : role + ":" + id), art === "shared"),
      save: (art, id, c) => repo.set("chat:" + (art === "shared" ? id : role + ":" + id), c, art === "shared"),
    },
    handover: { post: d => freigebeUebergabe(repo, role, d), get: r => repo.get(uebergabeTeilKey(r), true, "kernwetten") },
    llm: async () => ({ text: "ok", stop: "end_turn" }),
  };
}

const tick = () => new Promise(r => setTimeout(r, 0));
const ruhe = async (n = 8) => { for (let i = 0; i < n; i++) await tick(); };
async function klick(el) { el.click(); await ruhe(); }

let root;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app");
});
async function bootApp(backend) {
  const app = createApp({ doc: document, backend, root });
  await app.boot();
  await ruhe();
  return app;
}

describe("S119.2 · infoToggle hinterlässt keinen Halbzustand", () => {
  it("scheitert der Öffner, verschwindet der Kasten wieder — und der Screen bleibt geschlossen", async () => {
    await bootApp(memoryBackend({ kaputteFelder: ["messIntervall"] }));
    await klick(root.querySelector("#btnSharedRoom"));
    const screen = root.querySelector("#scrShared");

    await klick(root.querySelector("#btnAgenda"));

    expect(root.querySelector("#boxAgenda").classList.contains("pb-hidden")).toBe(true);
    expect(screen.classList.contains("rz-regal-offen")).toBe(false);
  });

  it("der Fehler wird sichtbar, nicht geschluckt", async () => {
    await bootApp(memoryBackend({ kaputteFelder: ["messIntervall"] }));
    await klick(root.querySelector("#btnSharedRoom"));
    await klick(root.querySelector("#btnAgenda"));

    const box = root.querySelector("#pbErr");
    expect(box.classList.contains("pb-hidden")).toBe(false);
    expect(box.textContent).toContain("messIntervall");
  });

  it("nach einem Fehlschlag ist die nächste Zeile wieder normal bedienbar", async () => {
    await bootApp(memoryBackend({ kaputteFelder: ["messIntervall"] }));
    await klick(root.querySelector("#btnSharedRoom"));
    const screen = root.querySelector("#scrShared");

    await klick(root.querySelector("#btnAgenda"));          // scheitert
    await klick(root.querySelector("#btnRegal"));           // muss trotzdem gehen

    expect(root.querySelector("#boxRegal").classList.contains("pb-hidden")).toBe(false);
    expect(screen.classList.contains("rz-regal-offen")).toBe(true);
  });

  it("und dieselbe Zeile lässt sich nach behobenem Fehler öffnen (kein hängengebliebener Zustand)", async () => {
    // Zwei Läufe mit demselben DOM: erst kaputt, dann heil. Der zweite Lauf
    // darf nicht daran scheitern, dass der erste etwas stehen gelassen hat.
    await bootApp(memoryBackend({ kaputteFelder: ["messIntervall"] }));
    await klick(root.querySelector("#btnSharedRoom"));
    await klick(root.querySelector("#btnAgenda"));

    await bootApp(memoryBackend());
    await klick(root.querySelector("#btnSharedRoom"));
    await klick(root.querySelector("#btnAgenda"));

    expect(root.querySelector("#boxAgenda").classList.contains("pb-hidden")).toBe(false);
    expect(root.querySelector("#scrShared").classList.contains("rz-regal-offen")).toBe(true);
  });

  it("der gesunde Weg bleibt unverändert: öffnen, Vollbild, erneuter Tap schließt", async () => {
    await bootApp(memoryBackend());
    await klick(root.querySelector("#btnSharedRoom"));
    const screen = root.querySelector("#scrShared");

    await klick(root.querySelector("#btnAgenda"));
    expect(root.querySelector("#boxAgenda").classList.contains("pb-hidden")).toBe(false);
    expect(screen.classList.contains("rz-regal-offen")).toBe(true);

    await klick(root.querySelector("#btnAgenda"));
    expect(root.querySelector("#boxAgenda").classList.contains("pb-hidden")).toBe(true);
    expect(screen.classList.contains("rz-regal-offen")).toBe(false);
  });
});
