// @vitest-environment happy-dom
// S38 · Prioritäten-Board (5 Plätze, Drag & Drop + Tipp-Fallback, Ersetzen,
// Umsortieren), Abschluss-Bewusstsein der Auftragsklärung (Nachklang beim
// Wiederbetreten), Zeitleisten-Einträge für Auftragsklärung & Prozessreflexion.

import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";
import { MockLLM } from "../../core/engine/mock-llm.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { freigebeUebergabe } from "../../core/engine/freigabe.js";
import { uebergabeTeilKey } from "../../core/contracts/uebergabe.js";
import { RANK_ITEMS } from "../../core/ui/kernwetten.js";
import { steuerTexte, klaerungsPrompt } from "../../core/prompts/prompts.de.js";
import { klaerungsPrompt as klaerungsPromptEn } from "../../core/prompts/prompts.en.js";

function memoryBackend(mock, role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "s38", activeModuleId: "betrieb" });
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

async function starteRanking(mock, backend) {
  const app = await bootApp(backend);
  const start = app.startChat("einzel");
  await ruhe(10);
  start.catch(() => {});
  return { app, panel: root.querySelector("#kwPanel") };
}
const RANK_MOCK = () => new MockLLM(["Jetzt sortieren statt bewerten.\n[[RANKING]]", "Danke!"]);

describe("S38 · Prioritäten-Board", () => {
  it("zeigt 5 nummerierte Plätze; leere Plätze sind als frei markiert", async () => {
    const mock = RANK_MOCK();
    const { panel } = await starteRanking(mock, memoryBackend(mock));
    const plaetze = panel.querySelectorAll("[data-platz]");
    expect(plaetze).toHaveLength(5);
    expect(panel.querySelectorAll(".pb-platz.leer")).toHaveLength(5);
    expect(panel.textContent).toContain("frei");
  });

  it("Drag Pool→besetzter Platz ERSETZT; das alte Item fällt in den Pool zurück", async () => {
    const mock = RANK_MOCK();
    const { panel } = await starteRanking(mock, memoryBackend(mock));
    await klick(panel.querySelector('[data-rein="0"]'));   // Platz 1: Item 0
    // Item 3 aus dem Pool auf Platz 1 (Index 0) ziehen:
    panel.querySelector('[data-rein="3"]').dispatchEvent(new Event("dragstart"));
    const platz0 = panel.querySelector('[data-platz="0"]');
    platz0.dispatchEvent(new Event("dragover", { cancelable: true }));
    platz0.dispatchEvent(new Event("drop", { cancelable: true }));
    await tick();
    const neu = root.querySelector("#kwPanel");
    expect(neu.querySelector('[data-platz="0"]').textContent).toContain(RANK_ITEMS[3].label);
    expect(neu.querySelector('[data-rein="0"]')).toBeTruthy();   // Item 0 wieder im Pool
  });

  it("Drag Platz→Platz sortiert um", async () => {
    const mock = RANK_MOCK();
    const { panel } = await starteRanking(mock, memoryBackend(mock));
    await klick(panel.querySelector('[data-rein="0"]'));
    await klick(root.querySelector("#kwPanel").querySelector('[data-rein="1"]'));
    let p = root.querySelector("#kwPanel");
    p.querySelector('[data-platz="1"]').dispatchEvent(new Event("dragstart"));   // Item 1 (Platz 2) …
    p.querySelector('[data-platz="0"]').dispatchEvent(new Event("drop", { cancelable: true }));   // … nach Platz 1
    await tick();
    p = root.querySelector("#kwPanel");
    expect(p.querySelector('[data-platz="0"]').textContent).toContain(RANK_ITEMS[1].label);
    expect(p.querySelector('[data-platz="1"]').textContent).toContain(RANK_ITEMS[0].label);
  });

  it("Tipp-Fallback: Platz antippen (auswählen), zweiten Platz antippen (verschieben)", async () => {
    const mock = RANK_MOCK();
    const { panel } = await starteRanking(mock, memoryBackend(mock));
    await klick(panel.querySelector('[data-rein="0"]'));
    await klick(root.querySelector("#kwPanel").querySelector('[data-rein="1"]'));
    await klick(root.querySelector("#kwPanel").querySelector('[data-rein="2"]'));
    // Platz 3 (Item 2) auswählen …
    await klick(root.querySelector("#kwPanel").querySelector('[data-platz="2"]'));
    expect(root.querySelector("#kwPanel").querySelector('[data-platz="2"]').classList.contains("gewaehlt")).toBe(true);
    // … und auf Platz 1 verschieben
    await klick(root.querySelector("#kwPanel").querySelector('[data-platz="0"]'));
    const p = root.querySelector("#kwPanel");
    expect(p.querySelector('[data-platz="0"]').textContent).toContain(RANK_ITEMS[2].label);
    expect(p.querySelector('[data-platz="1"]').textContent).toContain(RANK_ITEMS[0].label);
    expect(p.querySelector('[data-platz="2"]').textContent).toContain(RANK_ITEMS[1].label);
  });
});

describe("S38 · Abschluss-Bewusstsein (Nachklang)", () => {
  it("Wiederbetreten einer freigegebenen Auftragsklärung öffnet den Nachklang", async () => {
    const mock = new MockLLM([
      "Schön, dass du wieder da bist – deine Auftragsklärung ist abgeschlossen. Möchtest du etwas hinzufügen, richtigstellen oder eine Zusammenfassung sehen?",
    ]);
    const backend = memoryBackend(mock);
    await backend.chat.save("mine", "einzel", {
      status: "released", freigegeben: true, language: "de",
      messages: [
        { role: "user", hidden: true, content: steuerTexte.start.einzel },
        { role: "assistant", content: "Danke fürs Teilen – ich freue mich auf unser gemeinsames Gespräch." },
      ],
    });
    const app = await bootApp(backend);
    await app.startChat("einzel");
    await ruhe();
    const e = app._state.engine;
    expect(e.chat.status).toBe("running");                       // Nachklang ist gesprächsfähig
    const letzteUser = e.chat.messages.filter(m => m.role === "user").pop();
    expect(letzteUser.content).toContain("Rückkehr nach Abschluss");
    expect(letzteUser.hidden).toBe(true);                        // Wire, nicht Chat
    expect(root.querySelector("#pbMsgs").textContent).toContain("hinzufügen");
  });

  it("Korpus-Kanarien: NACHKLANG-Regeln in beiden Sprachfassungen", () => {
    const p = klaerungsPrompt("Anna", "Bernd"), pe = klaerungsPromptEn("Anna", "Bernd");
    expect(p).toContain("NACHKLANG (nach Abschluss)");
    expect(p).toContain("KEINE Kapitel-Marken und KEINEN neuen Abschluss-Block");
    expect(pe).toContain("AFTERGLOW (after completion)");
  });
});

describe("S38 · Zeitleisten-Einträge", () => {
  it("Prozessreflexion: Abgabe erzeugt einen persönlichen Zeitleisten-Eintrag", async () => {
    const backend = memoryBackend(null);
    await bootApp(backend);
    await klick(root.querySelector("#btnMyRoom"));
    await klick(root.querySelector("#btnMess"));
    await ruhe();
    await klick(root.querySelector("#boxMess").querySelector("#msOk"));
    await ruhe();
    const zl = await backend.pstate.get("timeline");
    expect(zl.entries).toHaveLength(1);
    expect(zl.entries[0].topics).toContain("Prozessreflexion");
    expect(zl.entries[0].summary).toContain("Verdeckter Beitrag");
  });
});
