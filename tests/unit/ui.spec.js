// @vitest-environment happy-dom
// UI-Smoke — die echte App (createApp) headless in happy-dom, mit
// Memory-Backend und Mock-LLM: komplette Klick-Drehbücher.

import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";
import { MockLLM } from "../../core/engine/mock-llm.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { freigebeUebergabe } from "../../core/engine/freigabe.js";

function memoryBackend(mock, role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "ui", activeModuleId: "betrieb" });
  const bstate = new Bstate(repo);
  const pstate = new Pstate(repo);
  return {
    store,
    async info() {
      return { role, name: role === "A" ? "Anna" : "Bernd", partner: role === "A" ? "Bernd" : "Anna", nameA: "Anna", nameB: "Bernd" };
    },
    bstate: { get: f => bstate.get(f), set: (f, v) => bstate.set(f, v) },
    pstate: { get: f => pstate.get(role, f), set: (f, v) => pstate.set(role, f, v) },
    chat: {
      load: (art, id) => repo.get("chat:" + (art === "shared" ? id : role + ":" + id), art === "shared"),
      save: (art, id, c) => repo.set("chat:" + (art === "shared" ? id : role + ":" + id), c, art === "shared"),
    },
    handover: { post: d => freigebeUebergabe(repo, role, d), get: () => null },
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

describe("UI · Grundgerüst", () => {
  it("boot zeigt „Hallo Anna\" und die beiden Räume", async () => {
    const app = createApp({ doc: document, backend: memoryBackend(new MockLLM([])), root });
    await app.boot();
    expect(root.querySelector("#pbHallo").textContent).toBe("Hallo Anna");
    expect(root.querySelector("#scrStart").classList.contains("pb-hidden")).toBe(false);
    await klick(root.querySelector("#btnMyRoom"));
    expect(root.querySelector("#scrMyRoom").classList.contains("pb-hidden")).toBe(false);
  });
});

describe("UI · Reflexionsgespräch-Drehbuch", () => {
  it("Start → Assistant antwortet → Block schließt ab → Zeitleiste gefüllt, Block-Rohform NIE sichtbar", async () => {
    const mock = new MockLLM([
      "Schön, dass du da bist. Was beschäftigt dich?",
      'Danke dir.\nTIMELINE-BLOCK\n{"summary":"Kurze Reflexion über Nähe.","topics":["Nähe"],"recurrenceNote":null}\nEND TIMELINE-BLOCK',
    ]);
    const backend = memoryBackend(mock);
    const app = createApp({ doc: document, backend, root });
    await app.boot();
    await klick(root.querySelector("#btnMyRoom"));
    await klick(root.querySelector("#btnSolo"));
    expect(root.querySelector("#scrChat").classList.contains("pb-hidden")).toBe(false);
    expect(root.querySelector("#pbMsgs").textContent).toContain("Was beschäftigt dich?");

    root.querySelector("#pbInput").value = "Mich beschäftigt Nähe.";
    await klick(root.querySelector("#btnSend"));

    // Anzeige-Hygiene: Rohform durch Platzhalter ersetzt
    const anzeige = root.querySelector("#pbMsgs").textContent;
    expect(anzeige).not.toContain("TIMELINE-BLOCK");
    expect(anzeige).toContain("Dein Zeitleisten-Eintrag");

    // Persistenz: Eintrag in der Zeitleiste, Chat abgeschlossen
    const zl = await backend.pstate.get("timeline");
    expect(zl.entries).toHaveLength(1);
    expect(zl.entries[0].topics).toEqual(["Nähe"]);
    await klick(root.querySelector("#btnChatZurueck"));
    await klick(root.querySelector("#btnMyRoom"));
    await klick(root.querySelector("#btnZeitleiste"));
    expect(root.querySelector("#zlItems").textContent).toContain("Nähe");
  });
});

describe("UI · Gate-Drehbuch (Vertrag 1 + Querung)", () => {
  it("GATE-BLOCK öffnet Panel; Freigabe ins Regal quert und antwortet mit GENAU EINER User-Nachricht", async () => {
    const gate = JSON.stringify({
      wording: "Ich wünsche mir mehr gemeinsame Abende.",
      wish: "Zwei Abende pro Woche.",
      reasoning: "Situationsbezogen, mit Selbstanteil.",
      criteria: { characterJudgment: false, generalization: false, situationSpecific: true, ownShare: true },
      paths: ["self", "shelf", "moment"],
    });
    const mock = new MockLLM([
      "Magst du eine Fassung zur Freigabe sehen?\nGATE-BLOCK\n" + gate + "\nEND GATE-BLOCK",
      "Gut — sie liegt jetzt im Regal.",
    ]);
    const backend = memoryBackend(mock);
    const app = createApp({ doc: document, backend, root });
    await app.boot();
    await klick(root.querySelector("#btnMyRoom"));
    await klick(root.querySelector("#btnSolo"));

    const panel = root.querySelector("#gatePanel");
    expect(panel.classList.contains("pb-hidden")).toBe(false);
    expect(panel.textContent).toContain("mehr gemeinsame Abende");

    panel.querySelector('input[data-weg="shelf"]').checked = true;
    await klick(panel.querySelector("#btnGateOk"));

    const regal = await backend.bstate.get("shelf");
    expect(regal.items).toHaveLength(1);
    expect(regal.items[0].read).toBe(false);           // merken statt melden
    expect(regal.items[0].by).toBe("Anna");

    // Rückkanal: genau EINE user-Nachricht mit SHARING-RESULT in Runde 2
    const r2 = mock.calls[1].messages.filter(m => m.role === "user");
    expect(r2[r2.length - 1].content).toContain("SHARING-RESULT");
    expect(panel.classList.contains("pb-hidden")).toBe(true);
  });

  it("„Noch nicht\" quert NICHTS und meldet das dem Gespräch", async () => {
    const gate = JSON.stringify({
      wording: "F", wish: null, reasoning: "B",
      criteria: { characterJudgment: false, generalization: false, situationSpecific: true, ownShare: true },
      paths: ["shelf"],
    });
    const mock = new MockLLM([
      "GATE-BLOCK\n" + gate + "\nEND GATE-BLOCK",
      "Alles gut, wir bleiben dran.",
    ]);
    const backend = memoryBackend(mock);
    const app = createApp({ doc: document, backend, root });
    await app.boot();
    await klick(root.querySelector("#btnMyRoom"));
    await klick(root.querySelector("#btnSolo"));
    await klick(root.querySelector("#gatePanel").querySelector("#btnGateNein"));
    expect((await backend.bstate.get("shelf")).items).toHaveLength(0);
    const r2 = mock.calls[1].messages.filter(m => m.role === "user");
    expect(r2[r2.length - 1].content).toContain("weiter daran arbeiten");
  });
});

describe("UI · Gemeinsame Session & Regal", () => {
  it("GOAL-BLOCK legt Aufträge mit AG/AI-Kennung an; MOMENT-BLOCK schließt ab", async () => {
    const auftrag = JSON.stringify({ changes: [
      { op: "new", art: "shared", text: "Wöchentlicher Spaziergang", confirmedByBoth: true, baseline: { closeness: 6 } },
      { op: "new", art: "individual", owner: "B", ownerConfirmed: true, text: "Abends früher offline" },
    ]});
    const moment = JSON.stringify({ summary: "Verbunden gestartet, Zeit-Thema besprochen, Spaziergang vereinbart.", topics: ["Zeit"], gentleInvitation: "Kurzer Blick am Mittwoch" });
    const mock = new MockLLM([
      "Schön, dass ihr beide da seid.",
      "GOAL-BLOCK\n" + auftrag + "\nEND GOAL-BLOCK",
      "MOMENT-BLOCK\n" + moment + "\nEND MOMENT-BLOCK",
    ]);
    const backend = memoryBackend(mock);
    const app = createApp({ doc: document, backend, root });
    await app.boot();
    await klick(root.querySelector("#btnSharedRoom"));
    await app.startChat("moment");
    await tick();
    root.querySelector("#pbInput").value = "Wir möchten über Zeit sprechen.";
    await klick(root.querySelector("#btnSend"));
    const auf = await backend.bstate.get("goals");
    expect(auf.items.map(i => i.id)).toEqual(["AG1", "AI2"]);
    expect(auf.items[1].owner).toBe("B");
    root.querySelector("#pbInput").value = "Danke, wir schließen ab.";
    await klick(root.querySelector("#btnSend"));
    expect((await backend.bstate.get("momentLog")).entries).toHaveLength(1);
    expect(app._state.engine.chat.status).toBe("finished");
  });

  it("Regal-Ansicht zeigt gequerte Einträge (Pull-Prinzip, keine Notification-Mechanik)", async () => {
    const backend = memoryBackend(new MockLLM([]));
    await backend.bstate.set("shelf", { items: [{ id: "RG1", text: "Eine Fassung", by: "Bernd", read: false }] });
    const app = createApp({ doc: document, backend, root });
    await app.boot();
    await klick(root.querySelector("#btnSharedRoom"));
    await klick(root.querySelector("#btnRegal"));
    expect(root.querySelector("#regalItems").textContent).toContain("Eine Fassung");
    expect(root.querySelector("#regalItems").textContent).toContain("von Bernd");
  });
});
