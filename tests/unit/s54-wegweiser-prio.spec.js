// @vitest-environment happy-dom
// S54 · Wegweiser-Priorisierung: EINE Rangliste pro Vorraum, Deckel DREI.
//   Stufe 1 Begonnenes · 2 roter Faden (Klärung→Auflösung) · 3 Neues/Offenes ·
//   4 freie Sessions & Stöbern. Invariante: Stufe 4 verdrängt nie 1–3.
//   Start-Balance: mindestens eine Zeile je Bereich (mein/gemeinsam) —
//   bewusste einzige Ausnahme von der Stufen-Invariante.
//   Doppelungen verschmolzen: aufloesungStart(MitAufdeck) ersetzt das Paar
//   "Freigaben bereit" + Auflösungs-Einladung; optRegalTeil weicht dem
//   Regal-Zähler.

import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { freigebeUebergabe } from "../../core/engine/freigabe.js";
import { uebergabeTeilKey } from "../../core/contracts/uebergabe.js";
import { t } from "../../core/i18n/index.js";

function memoryBackend(role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "s54", activeModuleId: "betrieb" });
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
    llm: async () => ({ text: "ok", stop: "end_turn" }),
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
const zeilen = boxId => [...root.querySelectorAll("#" + boxId + " .pb-item")].map(x => x.textContent.replace("‣ ", ""));

async function beideFreigaben(backend) {
  await freigebeUebergabe(backend.repo, "A", { module: "kernwetten", name: "Anna", items: [{ id: "S1", text: "Nähe", tag: "FirstTake" }] });
  await freigebeUebergabe(backend.repo, "B", { module: "kernwetten", name: "Bernd", items: [{ id: "S1", text: "Ruhe", tag: "FirstTake" }] });
}
const REVEAL = { A: { name: "Anna", top5: ["a"], guess3: ["b"] }, B: { name: "Bernd", top5: ["c"], guess3: ["d"] } };

describe("S54 · Deckel DREI über alles", () => {
  it("Gemeinsamer Raum in Volllage zeigt genau drei Zeilen: Begonnenes, roter Faden, Neues", async () => {
    const backend = memoryBackend();
    await beideFreigaben(backend);
    await backend.bstate.set("reveal", REVEAL);
    await backend.chat.save("shared", "moment", { status: "running", messages: [{ role: "assistant", content: "Hallo" }] });
    await backend.bstate.set("shelf", { items: [{ by: "Bernd", text: "x", read: false }] });
    await backend.bstate.set("agenda", { items: [{ state: "open", text: "y" }] });
    await backend.bstate.set("measurements", { items: [{ status: "ready", values: { A: 5, B: 6 } }] });
    await bootApp(backend);
    await klick(root.querySelector("#btnSharedRoom"));
    await ruhe();
    const z = zeilen("wegTeil");
    expect(z).toHaveLength(3);
    expect(z[0]).toBe(t("weg.momentOffen"));
    expect(z[1]).toBe(t("weg.aufloesungStartMitAufdeck"));
    expect(z[2]).toBe(t("weg.messBereit"));   // roter Faden (St. 2) vor Neuem (St. 3)
    // Verdrängt: Regal-Zähler, Agenda UND alle freien Einladungen (Stufe 4):
    const txt = z.join(" ");
    expect(txt).not.toContain(t("weg.regalNeu", { n: 1 }));
    expect(txt).not.toContain(t("weg.agendaOffen", { n: 1 }));
    expect(txt).not.toContain("Qualitätszeit — gestaltet");
  });

  it("Startscreen zeigt nie mehr als drei Zeilen", async () => {
    const backend = memoryBackend();
    await beideFreigaben(backend);
    await backend.chat.save("shared", "moment", { status: "running", messages: [{ role: "assistant", content: "Hallo" }] });
    await backend.bstate.set("shelf", { items: [{ by: "Bernd", text: "x", read: false }] });
    await bootApp(backend);
    expect(zeilen("wegStart")).toHaveLength(3);
  });
});

describe("S54 · Stufen-Invariante: freie Sessions verdrängen nie den roten Faden", () => {
  it("Auflösungs-Zeile (Stufe 2) steht vor Qualitätszeit-Einladung (Stufe 4)", async () => {
    const backend = memoryBackend();
    await beideFreigaben(backend);
    await bootApp(backend);
    await klick(root.querySelector("#btnSharedRoom"));
    await ruhe();
    const z = zeilen("wegTeil");
    expect(z[0]).toBe(t("weg.aufloesungStart"));
    expect(z.indexOf(t("weg.optQzTeil"))).toBeGreaterThan(0);
  });

  it("ruhige Lage füllt mit Stufe 4 auf (Start: Auftrag, Solo, Qualitätszeit)", async () => {
    await bootApp(memoryBackend());
    const z = zeilen("wegStart");
    expect(z).toEqual([t("weg.startAuftrag"), t("weg.startSolo"), t("weg.optQz")]);
  });
});

describe("S54 · Start-Balance: mindestens eine Zeile je Bereich", () => {
  it("lauter Mein-Zeilen: die letzte weicht der besten Gemeinsam-Zeile", async () => {
    const backend = memoryBackend();
    // einzelPause (mein, St.1) + messOffen (mein, St.3) + startSolo (mein, St.4)
    await backend.chat.save("mine", "einzel", { status: "running", kapitel: 2, messages: [{ role: "assistant", content: "…" }] });
    await backend.bstate.set("measurements", { items: [{ status: "open", values: {} }] });
    await bootApp(backend);
    const z = zeilen("wegStart");
    expect(z).toEqual([t("weg.einzelPause", { n: 2 }), t("weg.messOffen"), t("weg.optQz")]);
  });

  it("lauter Gemeinsam-Zeilen: die letzte weicht der besten Mein-Zeile", async () => {
    const backend = memoryBackend();
    // momentOffen (St.1) + aufloesungStart (St.2) + regalNeu (St.3) — alle gemeinsam;
    // einzel begonnen, damit startAuftrag (mein, St.2) entfällt.
    await beideFreigaben(backend);
    await backend.chat.save("mine", "einzel", { status: "running", messages: [{ role: "assistant", content: "…" }] });
    await backend.chat.save("shared", "moment", { status: "running", messages: [{ role: "assistant", content: "Hallo" }] });
    await backend.bstate.set("shelf", { items: [{ by: "Bernd", text: "x", read: false }] });
    await bootApp(backend);
    const z = zeilen("wegStart");
    expect(z).toEqual([t("weg.momentOffen"), t("weg.aufloesungStart"), t("weg.startSolo")]);
  });
});

describe("S54 · Verschmolzene Doppelungen", () => {
  it("mit beiden Freigaben erscheint GENAU EINE Auflösungs-Zeile (Aktionsfassung)", async () => {
    const backend = memoryBackend();
    await beideFreigaben(backend);
    await bootApp(backend);
    await klick(root.querySelector("#btnSharedRoom"));
    await ruhe();
    const z = zeilen("wegTeil");
    expect(z.filter(x => x.includes("Auflösung")).length).toBe(1);
    expect(z[0]).toContain("Freigaben liegen bereit");
    expect(z[0]).toContain("Startet eure Gemeinsame Auflösung");
  });

  it("Regal: Zähler-Zeile verdrängt die stehende Regal-Einladung — und umgekehrt", async () => {
    const backend = memoryBackend();
    await backend.bstate.set("shelf", { items: [{ by: "Bernd", text: "x", read: false }] });
    await bootApp(backend);
    await klick(root.querySelector("#btnSharedRoom"));
    await ruhe();
    let z = zeilen("wegTeil");
    expect(z.join(" ")).toContain(t("weg.regalNeu", { n: 1 }));
    expect(z.join(" ")).not.toContain(t("weg.optRegalTeil"));

    document.body.innerHTML = '<div id="app"></div>';
    root = document.getElementById("app");
    await bootApp(memoryBackend());
    await klick(root.querySelector("#btnSharedRoom"));
    await ruhe();
    z = zeilen("wegTeil");
    expect(z.join(" ")).toContain(t("weg.optRegalTeil"));
  });
});

describe("S54 · Mein Raum bleibt dreizeilig und ruhig", () => {
  it("pausierte Auftragsklärung führt; freie Zeilen füllen auf", async () => {
    const backend = memoryBackend();
    await backend.chat.save("mine", "einzel", { status: "running", kapitel: 3, messages: [{ role: "assistant", content: "…" }] });
    await bootApp(backend);
    await klick(root.querySelector("#btnMyRoom"));
    await ruhe();
    const z = zeilen("wegMein");
    expect(z).toEqual([t("weg.einzelPause", { n: 3 }), t("weg.soloErster"), t("weg.optRueckblickSpaeter")]);
  });
});
