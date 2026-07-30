// @vitest-environment happy-dom
// S99.5 · Der Wortlaut-Abruf ist verdrahtet.
//
// Der Hauptbefund dieses Sprints, und er ist unspektakulär: Der RECALL-BLOCK
// stand seit S95.8b im Register, sein Schema war geprüft, der Prompt beschrieb
// ihn über einen Absatz, der Haken `onAbruf` hing in app.js — nur GEFÜHRT hat
// ihn keine Session. Die Engine dispatcht aus `def.blocks`; was dort fehlt,
// existiert für sie nicht.
//
// Warum das niemandem auffiel: cleanDisplay läuft über ALLE_BLOECKE, nicht über
// die Blöcke der Session. Der Block verschwand also sauber aus der Anzeige. Der
// Begleiter sagte "ich hole mir das Gespräch dazu", die App antwortete nie, und
// beide warteten aufeinander. Der Test, der 2026 fehlte, ist der erste hier.

import { describe, it, expect, beforeEach } from "vitest";
import { soloDef } from "../../core/ui/sessions.js";
import { createApp } from "../../core/ui/app.js";
import { MockLLM } from "../../core/engine/mock-llm.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { legeVerlaufAb } from "../../core/ui/verlauf-ablage.js";
import { istWireNachricht } from "../../core/contracts/steuertoken.js";
import { steuerTexte } from "../../core/prompts/prompts.de.js";

function memoryBackend(mock, role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "s995", activeModuleId: "betrieb" });
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
const ruhe = async (n = 12) => { for (let i = 0; i < n; i++) await tick(); };

let root;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app");
});

const recall = vid => "Ich hole mir das Gespräch dazu.\nRECALL-BLOCK\n" +
  JSON.stringify({ vid }) + "\nEND RECALL-BLOCK";

/* ─────────────────── Die Regression, die gefehlt hat ─────────────────── */

describe("S99.5 · Die Session FÜHRT den Block", () => {
  const def = soloDef({ pstate: { get: async () => null, set: async () => true } }, {});

  it("RECALL-BLOCK steht in soloDef().blocks — nicht nur im Register", () => {
    const marken = def.blocks.map(b => b.start);
    expect(marken).toContain("RECALL-BLOCK");
  });

  it("er steht VOR dem TIMELINE-BLOCK: die Engine nimmt je Nachricht nur einen", () => {
    const marken = def.blocks.map(b => b.start);
    expect(marken.indexOf("RECALL-BLOCK")).toBeLessThan(marken.indexOf("TIMELINE-BLOCK"));
  });

  it("der Haken wird mit der Kennung gerufen", async () => {
    const gerufen = [];
    const d = soloDef({ pstate: { get: async () => null, set: async () => true } },
                      { onAbruf: daten => gerufen.push(daten) });
    const block = d.blocks.find(b => b.start === "RECALL-BLOCK");
    await block.handle({ vid: "1700-abc" }, {});
    expect(gerufen).toEqual([{ vid: "1700-abc" }]);
  });
});

/* ───────────────────────── Der ganze Weg ───────────────────────── */

async function mitVerlauf(antworten, { ablegen = true } = {}) {
  const mock = new MockLLM(antworten);
  const backend = memoryBackend(mock);
  let vid = null;
  if (ablegen) {
    vid = await legeVerlaufAb(backend, {
      messages: [
        { role: "assistant", content: "Was beschäftigt dich?" },
        { role: "user", content: "Die Absage am Dienstag." },
        { role: "user", hidden: true, content: "SCALE-RESULT 7" },
        { role: "assistant", content: "Und was macht das mit dir?" },
        { role: "user", content: "Ich ziehe mich zurück." },
      ],
    });
    await backend.pstate.set("timeline", { entries: [
      { at: "2026-07-29T10:00:00Z", topics: ["Absage"], summary: "Es ging um die Absage.", vid },
    ]});
  }
  const app = createApp({ doc: document, backend, root });
  await app.boot();
  await ruhe();
  await app.startChat("solo");
  await ruhe();
  return { app, backend, mock, vid };
}

describe("S99.5 · Der Wortlaut kommt an", () => {
  it("die App antwortet mit RECALL-RESULT und dem Gespräch darin", async () => {
    const { app, vid } = await mitVerlauf(["Schön, dass du da bist."]);
    // Erst jetzt steht die Kennung fest — der Begleiter fordert sie an.
    app.engine().llm = new MockLLM([
      recall(vid),
      "Da war die Absage — magst du daran anknüpfen?",
    ]).fn();
    root.querySelector("#pbInput").value = "Ich will etwas aus dem letzten Gespräch teilen.";
    root.querySelector("#btnSend").click();
    await ruhe(20);

    const antwort = app.engine().chat.messages
      .filter(m => m.role === "user" && String(m.content).startsWith("RECALL-RESULT")).pop();
    expect(antwort, "die App muss geantwortet haben").toBeTruthy();
    expect(antwort.content).toContain("Die Absage am Dienstag.");
    expect(antwort.content).toContain("Und was macht das mit dir?");
  });

  it("die Antwort ist Protokoll, nie Anzeige", async () => {
    const { app, vid } = await mitVerlauf(["Schön, dass du da bist."]);
    app.engine().llm = new MockLLM([recall(vid), "Danke, das habe ich."]).fn();
    root.querySelector("#pbInput").value = "Hol bitte das Gespräch vom 29.";
    root.querySelector("#btnSend").click();
    await ruhe(20);

    const antwort = app.engine().chat.messages
      .filter(m => String(m.content).startsWith("RECALL-RESULT")).pop();
    expect(istWireNachricht(antwort)).toBe(true);
    const sichtbar = root.querySelector("#pbMsgs").textContent;
    expect(sichtbar).not.toContain("RECALL-RESULT");
    expect(sichtbar).not.toContain("RECALL-BLOCK");
    // Versteckte Züge des alten Gesprächs reisen nicht mit.
    expect(antwort.content).not.toContain("SCALE-RESULT");
  });

  it("unbekannte Kennung: die Absage nennt den Zeitleisten-Weg, statt zu erfinden", async () => {
    const { app } = await mitVerlauf(["Schön, dass du da bist."], { ablegen: false });
    app.engine().llm = new MockLLM([recall("gibtsnicht"), "Ich finde dazu nichts."]).fn();
    root.querySelector("#pbInput").value = "Hol das Gespräch von letzter Woche.";
    root.querySelector("#btnSend").click();
    await ruhe(20);

    const antwort = app.engine().chat.messages
      .filter(m => String(m.content).startsWith("RECALL-RESULT")).pop();
    expect(antwort.content).toContain(steuerTexte.abrufLeer);
    expect(antwort.content).toMatch(/Zeitleiste/);
  });
});
