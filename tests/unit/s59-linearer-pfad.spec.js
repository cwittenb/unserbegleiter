// @vitest-environment happy-dom
// S59 · Linearer Pfad der Auftragsklärung: Klärung → Auflösung →
// Prozessreflexion, KEIN Neustart nach Freigabe.
//   D1: Das eigene Handover schlägt den lokalen Chat (Selbstheilung).
//   D2: Jede freigegebene Session öffnet beim Betreten den NACHKLANG —
//       auch running-Sessions (S44) und geheilte leere Chats (nie Kapitel 1).
//   D4: Dev-Panel seedet zu Handovers die freigegebenen Einzel-Chats.

import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";
import { MockLLM } from "../../core/engine/mock-llm.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { freigebeUebergabe } from "../../core/engine/freigabe.js";
import { uebergabeTeilKey } from "../../core/contracts/uebergabe.js";
import { steuerTexte } from "../../core/prompts/prompts.de.js";
import { baueMockdaten, einzelFertigChats, SZENEN, MOCK_META } from "../../platforms/artifact/dev-panel.js";
import { t } from "../../core/i18n/index.js";

function memoryBackend(mock, role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "s59", activeModuleId: "betrieb" });
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
const ruhe = async (n = 10) => { for (let i = 0; i < n; i++) await tick(); };

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

async function handoverMeins(backend) {
  await freigebeUebergabe(backend.repo, "A", { module: "kernwetten", name: "Anna", items: [{ id: "S1", text: "Nähe", tag: "FirstTake" }] });
}
async function handoverBeide(backend) {
  await handoverMeins(backend);
  await freigebeUebergabe(backend.repo, "B", { module: "kernwetten", name: "Bernd", items: [{ id: "S1", text: "Ruhe", tag: "FirstTake" }] });
}

/** Das Artefakt-Szenario: Handover liegt vor, der lokale Chat trägt KEIN Flag. */
async function inkonsistenterChat(backend) {
  await backend.chat.save("mine", "einzel", {
    status: "running", kapitel: 1, language: "de",
    messages: [
      { role: "user", hidden: true, content: steuerTexte.start.einzel },
      { role: "assistant", content: "Willkommen. Erzähl mir von euch." },
    ],
  });
}

describe("S59 · D1: Handover schlägt lokalen Chat (Wegweiser & Selbstheilung)", () => {
  it("Artefakt-Szenario: KEINE Pause-Zeile mehr, Auflösungs-Zeile steht", async () => {
    const backend = memoryBackend(null);
    await handoverBeide(backend);
    await inkonsistenterChat(backend);
    await bootApp(backend);
    const txt = root.querySelector("#wegStart").textContent;
    expect(txt).not.toContain(t("weg.einzelPause", { n: 1 }));
    expect(txt).toContain("Freigaben liegen bereit");
  });

  it("Selbstheilung: das Flag wird an den gespeicherten Chat zurückgeschrieben", async () => {
    const backend = memoryBackend(null);
    await handoverMeins(backend);
    await inkonsistenterChat(backend);
    await bootApp(backend);
    await ruhe();
    const chat = await backend.chat.load("mine", "einzel");
    expect(chat.freigegeben).toBe(true);
    expect(chat.nachklang).toBe(true);
  });

  it("Label: fertig heißt 'fortsetzen', nie wieder 'beginnen'", async () => {
    const backend = memoryBackend(null);
    await handoverMeins(backend);
    await bootApp(backend);
    await klick(root.querySelector("#btnMyRoom"));
    await ruhe();
    expect(root.querySelector("#btnEinzel").textContent).toBe(t("mein.einzelWeiter"));
  });
});

describe("S59 · D2: Eintritt öffnet den Nachklang — nie wieder Kapitel 1", () => {
  it("leerer Chat + eigenes Handover → Eröffnung ist der NACHKLANG-Steuertext", async () => {
    const mock = new MockLLM(["Deine Auftragsklärung ist abgeschlossen. Möchtest du etwas hinzufügen, richtigstellen — oder eine Zusammenfassung sehen?"]);
    const backend = memoryBackend(mock);
    await handoverMeins(backend);
    const app = await bootApp(backend);
    await app.startChat("einzel");
    await ruhe(14);
    const msgs = app._state.engine.chat.messages;
    expect(msgs.some(m => m.content === steuerTexte.einzelRueckkehr)).toBe(true);
    expect(msgs.some(m => m.content === steuerTexte.start.einzel)).toBe(false);
    expect(app._state.engine.chat.freigegeben).toBe(true);
  });

  it("freigegebene S44-Session (running, mit Verlauf) öffnet beim Wiederbetreten den Nachklang", async () => {
    const mock = new MockLLM(["Schön, dass du noch einmal hereinschaust. Möchtest du etwas hinzufügen oder richtigstellen?"]);
    const backend = memoryBackend(mock);
    await backend.chat.save("mine", "einzel", {
      status: "running", freigegeben: true, nachklang: true, language: "de",
      messages: [{ role: "assistant", content: "Deine Auswahl ist freigegeben — danke für dein Vertrauen." }],
    });
    const app = await bootApp(backend);
    await app.startChat("einzel");
    await ruhe(14);
    const msgs = app._state.engine.chat.messages;
    const steuer = msgs.find(m => m.content === steuerTexte.einzelRueckkehr);
    expect(steuer).toBeTruthy();
    expect(steuer.hidden).toBe(true);
    expect(msgs.some(m => m.content === steuerTexte.einzelWeiter)).toBe(false);
  });

  it("Panel-Wächter gilt auch für den Nachklang: wartender Marker blockiert die Begrüßung", async () => {
    const mock = new MockLLM([]);   // jede Modell-Runde wäre ein Drehbuch-Fehler
    const backend = memoryBackend(mock);
    await backend.chat.save("mine", "einzel", {
      status: "running", freigegeben: true, language: "de",
      messages: [
        { role: "user", content: "Ich bin bereit." },
        { role: "assistant", content: "Jetzt sortieren statt bewerten.\n[[RANKING]]" },
      ],
    });
    const app = await bootApp(backend);
    const start = app.startChat("einzel");
    await ruhe(14);
    start.catch(() => {});
    const msgs = app._state.engine.chat.messages;
    expect(msgs.some(m => m.content === steuerTexte.einzelRueckkehr)).toBe(false);
    expect(root.querySelector("#kwPanel").classList.contains("pb-hidden")).toBe(false);
  });

  it("Legacy-Status 'released' wird weiter auf 'running' geheilt und öffnet den Nachklang", async () => {
    const mock = new MockLLM(["Deine Auftragsklärung ist abgeschlossen. Möchtest du etwas hinzufügen?"]);
    const backend = memoryBackend(mock);
    await backend.chat.save("mine", "einzel", {
      status: "released", freigegeben: true, language: "de",
      messages: [{ role: "assistant", content: "Danke fürs Teilen." }],
    });
    const app = await bootApp(backend);
    await app.startChat("einzel");
    await ruhe(14);
    expect(app._state.engine.chat.status).toBe("running");
    expect(app._state.engine.chat.messages.some(m => m.content === steuerTexte.einzelRueckkehr)).toBe(true);
  });
});

describe("S59 · D4: Dev-Panel seedet konsistente Zustände", () => {
  it("Mockdaten: zu jedem Handover existiert der freigegebene Einzel-Chat", () => {
    const m = baueMockdaten();
    const chats = einzelFertigChats(m.meta);
    for (const k of Object.keys(chats)) {
      expect(m.privat[k]).toBeTruthy();
      expect(m.privat[k].freigegeben).toBe(true);
      expect(m.privat[k].status).toBe("running");
      expect(m.privat[k].nachklang).toBe(true);
    }
  });

  it("Szene 'freigaben-da' schreibt die privaten Chat-Seeds mit", async () => {
    const geschrieben = { shared: {}, privat: {} };
    const store = {
      async set(k, v, shared) { geschrieben[shared ? "shared" : "privat"][k] = v; },
      async get() { return null; },
      async delete() {},
      async list() { return []; },
    };
    const szene = SZENEN.find(s => s.id === "freigaben-da");
    await szene.wende(store);
    const chatKeys = Object.keys(einzelFertigChats({ code: MOCK_META.code }));
    for (const k of chatKeys) {
      expect(geschrieben.privat[k]).toBeTruthy();
      expect(geschrieben.privat[k].freigegeben).toBe(true);
    }
  });
});
