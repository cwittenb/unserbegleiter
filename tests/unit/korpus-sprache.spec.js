// @vitest-environment happy-dom
// Sprach-Schnappschuss (S30·C2): Neue Sessions starten in der Paarsprache,
// Resume behält die gespeicherte Session-Sprache — der EN-Korpus läuft dabei
// durch die ECHTE App (createApp + Engine, MockLLM).

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createApp } from "../../core/ui/app.js";
import { MockLLM } from "../../core/engine/mock-llm.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { getPrompts, getKorpusSprache, setKorpusSprache } from "../../core/prompts/prompts.js";

function memoryBackend(mock, { role = "A", locale, chatLoad } = {}) {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "ks", activeModuleId: "betrieb" });
  const bstate = new Bstate(repo), pstate = new Pstate(repo);
  const gespeicherte = {};
  return {
    store, repo, gespeicherte,
    async info() { return { role, name: "Anna", partner: "Bernd", nameA: "Anna", nameB: "Bernd", locale }; },
    bstate: { get: f => bstate.get(f), set: (f, v) => bstate.set(f, v) },
    pstate: { get: f => pstate.get(role, f), set: (f, v) => pstate.set(role, f, v) },
    chat: {
      load: (scope, art) => (chatLoad ? chatLoad(scope, art) : null),
      save: (scope, art, c) => { gespeicherte[scope + ":" + art] = c; return true; },
    },
    llm: mock.fn(),
  };
}

const tick = () => new Promise(r => setTimeout(r, 0));
async function klick(el) { el.click(); await tick(); await tick(); await tick(); }
let root;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app");
});
afterEach(() => setKorpusSprache("de"));

describe("EN-Korpus · Registrierung", () => {
  it("getPrompts('en') liefert den englischen Korpus (Sprachdisziplin-Zeile enthalten)", () => {
    const en = getPrompts("en");
    expect(en).not.toBe(getPrompts("de"));
    expect(en.soloSys("Anna", "Bernd")).toContain("You respond exclusively in English");
    expect(en.korpusTexte["titel.einzel"]).toBe("Clarifying Your Focus");
  });
});

describe("Sprach-Schnappschuss beim Session-Start", () => {
  it("locale:'en' → neue Einzelsession startet englisch (Systemprompt, Titel, chat.sprache)", async () => {
    const mock = new MockLLM(["Hello Anna."]);
    const backend = memoryBackend(mock, { locale: "en" });
    const app = createApp({ doc: document, backend, root });
    await app.boot();
    await klick(root.querySelector("#btnMyRoom"));
    await klick(root.querySelector("#btnEinzel"));

    expect(getKorpusSprache()).toBe("en");
    expect(mock.calls.length).toBeGreaterThan(0);
    expect(mock.calls[0].system).toContain("You respond exclusively in English");
    expect(mock.calls[0].system).not.toContain("Du antwortest ausschließlich auf Deutsch");
    expect(document.getElementById("chatTitel").textContent).toBe("Clarifying Your Focus");
    const chat = backend.gespeicherte["mine:einzel"];
    expect(chat && chat.sprache).toBe("en");
  });

  it("locale:'en', aber gespeicherte Session mit sprache:'de' → Resume bleibt deutsch", async () => {
    const mock = new MockLLM([]);
    const backend = memoryBackend(mock, {
      locale: "en",
      chatLoad: (scope, art) => (scope === "mine" && art === "einzel"
        ? { messages: [{ role: "assistant", content: "Hallo Anna." }], status: "running", sprache: "de" }
        : null),
    });
    const app = createApp({ doc: document, backend, root });
    await app.boot();
    await klick(root.querySelector("#btnMyRoom"));
    await klick(root.querySelector("#btnEinzel"));

    expect(getKorpusSprache()).toBe("de");
    expect(document.getElementById("chatTitel").textContent).toBe("Auftragsklärung");
    expect(mock.calls.length).toBe(0);   // Resume: kein neuer LLM-Aufruf nötig
  });
});
