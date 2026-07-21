// @vitest-environment happy-dom
// S88 · Prozessreflexion: eigener Raum (scrProzess) statt Regalklappe, und die
// Themenfrage ohne Wire-ID mit Herkunfts-Rahmen. Wire bleibt unberührt:
// data-pass/fit tragen die IDs weiter, formatiereMessrunde unverändert.

import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { freigebeUebergabe } from "../../core/engine/freigabe.js";
import { uebergabeTeilKey } from "../../core/contracts/uebergabe.js";

function memoryBackend(mock, role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "s88", activeModuleId: "betrieb" });
  const bstate = new Bstate(repo), pstate = new Pstate(repo);
  return {
    store, repo,
    async info() { return { role, name: "Anna", partner: "Bernd", nameA: "Anna", nameB: "Bernd" }; },
    bstate: { get: f => bstate.get(f), set: (f, v) => bstate.set(f, v) },
    pstate: { get: f => pstate.get(role, f), set: (f, v) => pstate.set(role, f, v) },
    chat: {
      load: (art, id) => repo.get("chat:" + (art === "shared" ? id : role + ":" + id), art === "shared"),
      save: (art, id, c) => repo.set("chat:" + (art === "shared" ? id : role + ":" + id), c, art === "shared"),
    },
    handover: { post: d => freigebeUebergabe(repo, role, d), get: r => repo.get(uebergabeTeilKey(r), true, "kernwetten") },
    llm: mock ? mock.fn() : (async () => ({ text: "ok", stop: "end_turn" })),
  };
}

const tick = () => new Promise(r => setTimeout(r, 0));
async function klick(el) { el.click(); await tick(); await tick(); await tick(); }
const ruhe = async (n = 8) => { for (let i = 0; i < n; i++) await tick(); };

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
const $id = id => root.querySelector("#" + id);

const ZIELE = { items: [
  { id: "AG1", art: "shared", status: "active", text: "Ein fester gemeinsamer Abend pro Woche, nur für uns." },
  { id: "AI2", art: "individual", owner: "A", status: "active", text: "Eigene Auszeit am Sonntag." },
] };

describe("S88 · Eigener Raum für die Prozessreflexion", () => {
  it("btnMess öffnet scrProzess; Mein Raum ist verborgen; Zurück führt nach Mein Raum (nicht Start)", async () => {
    const backend = memoryBackend(null);
    await backend.bstate.set("findings", { at: new Date().toISOString() });
    await bootApp(backend);
    await klick($id("btnMyRoom")); await ruhe();
    await klick($id("btnMess")); await ruhe();
    expect($id("scrProzess").classList.contains("pb-hidden")).toBe(false);
    expect($id("scrMyRoom").classList.contains("pb-hidden")).toBe(true);
    await klick($id("btnZurueck3"));
    expect($id("scrMyRoom").classList.contains("pb-hidden")).toBe(false);
    expect($id("scrStart").classList.contains("pb-hidden")).toBe(true);
  });

  it("zweites Betreten rendert FRISCH (kein Rest der letzten Runde, kein Toggle-Zustand)", async () => {
    const backend = memoryBackend(null);
    await bootApp(backend);
    await klick($id("btnMyRoom"));
    await klick($id("btnMess")); await ruhe();
    $id("boxMess").querySelector("#msNaehe").value = "9";      // Verstellter Regler …
    await klick($id("btnZurueck3"));
    await klick($id("btnMess")); await ruhe();                 // … überlebt das Wiederbetreten nicht
    expect($id("boxMess").querySelector("#msNaehe").value).toBe("5");
  });

  it("boxMess ist KEIN Geschwister der Regal-Reihe mehr; die Zeitleiste verdrängt es nicht", async () => {
    const backend = memoryBackend(null);
    await bootApp(backend);
    expect($id("scrMyRoom").querySelector("#boxMess")).toBeNull();
    expect($id("scrProzess").querySelector("#boxMess")).toBeTruthy();
    // Verdrängungsgruppe: Zeitleiste öffnen fasst boxMess nicht mehr an
    await klick($id("btnMyRoom"));
    await klick($id("btnMess")); await ruhe();                 // Prozessraum gerendert
    const inhaltVorher = $id("boxMess").innerHTML;
    await klick($id("btnZurueck3"));
    await klick($id("btnZeitleiste")); await ruhe();           // Regal auf
    expect($id("boxMess").innerHTML).toBe(inhaltVorher);       // unberührt
  });

  it("Sichtbarkeitsregel unverändert: btnMess bleibt verborgen, solange keine Auflösung gelaufen ist", async () => {
    const backend = memoryBackend(null);                        // kein findings
    await bootApp(backend);
    await klick($id("btnMyRoom")); await ruhe();
    expect($id("btnMess").classList.contains("pb-hidden")).toBe(true);
    expect($id("btnEinzel").classList.contains("pb-hidden")).toBe(false);
  });
});

describe("S88 · Themenfrage: ID raus, Herkunft rein", () => {
  it("Fragetext trägt den Thementext und den Entwicklungsfokus — aber KEINE Wire-ID; Gruppenzeile rahmt", async () => {
    const backend = memoryBackend(null);
    await backend.bstate.set("goals", ZIELE);
    await bootApp(backend);
    await klick($id("btnMyRoom"));
    await klick($id("btnMess")); await ruhe();
    const txt = $id("boxMess").textContent;
    expect(txt).toContain("Ein fester gemeinsamer Abend pro Woche");
    expect(txt).toContain("Entwicklungsfokus");
    expect(txt).not.toContain("AG1");                          // Wire-ID raus aus dem Satz an Menschen
    expect(txt).toContain("Eure gemeinsamen Themen");          // Herkunfts-Zeile
  });

  it("Einleitungssatz steht in der Kopfkarte des Raums (prozess.intro)", async () => {
    await bootApp(memoryBackend(null));
    const kopf = $id("scrProzess").textContent;
    expect(kopf).toContain("verschieben sich Ziele und Themen manchmal unterwegs");
    expect(kopf).toContain("aufgedeckt wird gemeinsam");
  });

  it("ohne aktives gemeinsames Ziel: keine Gruppenzeile, kein Themen-Regler — individuelle Ziele zählen nicht", async () => {
    const backend = memoryBackend(null);
    await backend.bstate.set("goals", { items: [ZIELE.items[1]] });   // nur AI2 (individual)
    await bootApp(backend);
    await klick($id("btnMyRoom"));
    await klick($id("btnMess")); await ruhe();
    const box = $id("boxMess");
    expect(box.querySelectorAll("[data-pass]").length).toBe(0);
    expect(box.textContent).not.toContain("Eure gemeinsamen Themen");
    expect(box.textContent).not.toContain("Eigene Auszeit");
  });

  it("Abgabe schreibt fit weiterhin UNTER DER ID ({ AG1: n }) — der Wire bleibt unberührt", async () => {
    const backend = memoryBackend(null);
    await backend.bstate.set("goals", ZIELE);
    await bootApp(backend);
    await klick($id("btnMyRoom"));
    await klick($id("btnMess")); await ruhe();
    const box = $id("boxMess");
    box.querySelector('[data-pass="AG1"]').value = "7";
    box.querySelector("#msNaehe").value = "4";
    await klick(box.querySelector("#msOk")); await ruhe();
    const mr = await backend.bstate.get("measurements");
    expect(mr.items[0].values.A.fit).toEqual({ AG1: 7 });
    expect(mr.items[0].values.A.closeness).toBe(4);
  });

  it("Sperr- und Abgegeben-Zustände rendern im neuen Raum", async () => {
    const backend = memoryBackend(null);
    // frisch abgegebene, aufgedeckte Runde ⇒ Rhythmus-Sperre für die nächste
    await backend.bstate.set("measurements", { items: [{
      id: "MR1", status: "revealed", startAt: new Date().toISOString(),
      values: { A: { closeness: 5, guess: 5, fit: {}, at: new Date().toISOString() },
                B: { closeness: 6, guess: 6, fit: {}, at: new Date().toISOString() } },
    }] });
    await bootApp(backend);
    await klick($id("btnMyRoom"));
    await klick($id("btnMess")); await ruhe();
    expect($id("scrProzess").classList.contains("pb-hidden")).toBe(false);
    expect($id("boxMess").textContent.length).toBeGreaterThan(0);   // Sperrtext steht
    expect($id("boxMess").querySelector("#msNaehe")).toBeNull();    // keine Regler im Sperrfall
  });
});
