// @vitest-environment happy-dom
// S99.2 · Die Rückfrage vor dem Abschluss.
//
// "Session abschließen" ist der einzige unumkehrbare Griff im Gespräch: Danach
// ist der Composer weg (S93), die Sitzung steht auf "finished", und das
// nächste Betreten beginnt frisch — der Verlauf wird nicht wieder aufgemacht.
// Ein Fehlgriff kostet also die laufende Sitzung. Bis hierher genügte dafür ein
// einzelner Klick.
//
// Form (Entscheidung K1): eine Zeile an der Stelle des Knopfes, kein
// schwebender Behälter und kein Systemdialog. U7 hat den letzten schwebenden
// Behälter der App bewusst entfernt; ein confirm() wäre unter Capacitor
// zusätzlich ein Fremdkörper aus dem Betriebssystem.

import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";
import { MockLLM } from "../../core/engine/mock-llm.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { de } from "../../core/i18n/de.js";
import { en } from "../../core/i18n/en.js";

function memoryBackend(mock, role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "s992", activeModuleId: "betrieb" });
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
    llm: mock.fn(),
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

const TIMELINE = JSON.stringify({
  summary: "Anna hat über die Abende gesprochen.", topics: ["Abende"],
  recurrenceNote: null, goals: [],
});

async function imGespraech() {
  const mock = new MockLLM([
    "Schön, dass du da bist.",
    "Alles Gute für heute.\nTIMELINE-BLOCK\n" + TIMELINE + "\nEND TIMELINE-BLOCK",
  ]);
  const backend = memoryBackend(mock);
  const app = createApp({ doc: document, backend, root });
  await app.boot();
  await ruhe();
  await app.startChat("solo");
  await ruhe();
  return { app, backend, mock };
}

const frage = () => root.querySelector("#chatEndeFrage");
const knopf = () => root.querySelector("#btnChatEnde");
const versteckt = el => el.classList.contains("pb-hidden");

describe("S99.2 · Die Frage tritt an die Stelle des Knopfes", () => {
  it("vor dem Griff steht nur der Knopf", async () => {
    await imGespraech();
    expect(versteckt(knopf())).toBe(false);
    expect(versteckt(frage())).toBe(true);
  });

  it("nach dem Griff steht nur die Frage — nie beide zugleich", async () => {
    await imGespraech();
    await klick(knopf());
    expect(versteckt(frage())).toBe(false);
    expect(versteckt(knopf())).toBe(true);
    expect(frage().textContent).toContain(de["chat.abschliessenJa"]);
    expect(frage().textContent).toContain(de["chat.abschliessenNein"]);
  });
});

describe("S99.2 · Ohne Ja geschieht nichts", () => {
  it("'Zurück' schickt keinen Steuertext, die Sitzung läuft weiter", async () => {
    const { app, mock } = await imGespraech();
    const zuege = app.engine().chat.messages.length;
    await klick(knopf());
    await klick(root.querySelector("#btnEndeNein"));
    await ruhe();
    expect(app.engine().chat.messages).toHaveLength(zuege);   // kein Zug gesendet
    expect(mock.calls).toHaveLength(1);                       // keine Modellrunde
    expect(app._state.engine.chat.status).toBe("running");
    expect(versteckt(root.querySelector("#pbComposer"))).toBe(false);
    // Der Knopf steht wieder da — die Entscheidung bleibt erreichbar.
    expect(versteckt(knopf())).toBe(false);
    expect(versteckt(frage())).toBe(true);
  });

  it("wer die Frage stehen lässt und weiterschreibt, schließt nichts ab", async () => {
    const { app } = await imGespraech();
    await klick(knopf());
    expect(app._state.engine.chat.status).toBe("running");
    const gespeichert = await app._state.engine.chat;
    expect(gespeichert.status).toBe("running");
  });
});

describe("S99.2 · Mit Ja läuft der Abschluss wie zuvor", () => {
  it("'Abschließen' schickt den Steuertext und beendet die Sitzung", async () => {
    const { app, backend, mock } = await imGespraech();
    await klick(knopf());
    await klick(root.querySelector("#btnEndeJa"));
    await ruhe();
    const gesendet = mock.calls[1].messages.filter(m => m.role === "user").pop();
    expect(gesendet.content).toContain("[CLOSE SESSION]");
    expect(gesendet.hidden).toBe(true);
    expect(app._state.engine.chat.status).toBe("finished");
    expect((await backend.chat.load("mine", "solo")).status).toBe("finished");
    expect(versteckt(root.querySelector("#pbComposer"))).toBe(true);
    expect(versteckt(root.querySelector("#btnRaumVerlassen"))).toBe(false);
  });

  it("nach dem Abschluss bleibt keine Frage stehen", async () => {
    await imGespraech();
    await klick(knopf());
    await klick(root.querySelector("#btnEndeJa"));
    await ruhe();
    expect(versteckt(frage())).toBe(true);
    expect(versteckt(knopf())).toBe(true);
  });
});

describe("S99.2 · Der Text steht in beiden Sprachen", () => {
  for (const [name, k] of [["DE", de], ["EN", en]]) {
    it(name + ": Frage, Ja und Zurück sind gesetzt und unterscheidbar", () => {
      expect(k["chat.abschliessenFrage"]).toBeTruthy();
      expect(k["chat.abschliessenJa"]).toBeTruthy();
      expect(k["chat.abschliessenNein"]).toBeTruthy();
      expect(k["chat.abschliessenJa"]).not.toBe(k["chat.abschliessenNein"]);
    });
  }

  it("die Frage benennt die Folge, statt nur 'sicher?' zu fragen", () => {
    expect(de["chat.abschliessenFrage"]).toMatch(/schreiben/);
    expect(en["chat.abschliessenFrage"]).toMatch(/write/);
  });
});
