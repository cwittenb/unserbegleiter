// @vitest-environment happy-dom
// S35 · Nutzerführung: Vorraum-Rückkehr, exklusiver Info-Bereich, Wegweiser,
// Auflösungs-Gating (nur mit beiden Handover-Blocks), globale Ladeanzeige,
// modell-generierte verbindende Angebote (CHOICE-BLOCK).

import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";
import { MockLLM } from "../../core/engine/mock-llm.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { freigebeUebergabe } from "../../core/engine/freigabe.js";
import { uebergabeTeilKey } from "../../core/contracts/uebergabe.js";

function memoryBackend(mock, role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "s35", activeModuleId: "betrieb" });
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

async function handoverBeide(backend) {
  await freigebeUebergabe(backend.repo, "A", { module: "kernwetten", name: "Anna", items: [{ id: "S1", text: "Verlässlichkeit", tag: "FirstTake" }] });
  await freigebeUebergabe(backend.repo, "B", { module: "kernwetten", name: "Bernd", items: [{ id: "S1", text: "Leichtigkeit", tag: "FirstTake" }] });
}

const tick = () => new Promise(r => setTimeout(r, 0));
async function klick(el) { el.click(); await tick(); await tick(); await tick(); }
const ruhe = async (n = 6) => { for (let i = 0; i < n; i++) await tick(); };

let root;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app");
});

describe("S35 · Vorraum-Navigation", () => {
  it("Raum verlassen führt in den Vorraum zurück, aus dem man kam (geteilt)", async () => {
    const mock = new MockLLM(["Schön, dass ihr da seid."]);
    const backend = memoryBackend(mock);
    const app = createApp({ doc: document, backend, root });
    await app.boot();
    await klick(root.querySelector("#btnSharedRoom"));
    await klick(root.querySelector("#btnMoment"));
    await ruhe();
    expect(root.querySelector("#scrChat").classList.contains("pb-hidden")).toBe(false);
    await klick(root.querySelector("#btnChatZurueck"));
    expect(root.querySelector("#scrShared").classList.contains("pb-hidden")).toBe(false);
    expect(root.querySelector("#scrStart").classList.contains("pb-hidden")).toBe(true);
  });

  it("Raum verlassen führt in den privaten Vorraum zurück (Mein Raum)", async () => {
    const mock = new MockLLM(["Willkommen."]);
    const backend = memoryBackend(mock);
    const app = createApp({ doc: document, backend, root });
    await app.boot();
    await klick(root.querySelector("#btnMyRoom"));
    await klick(root.querySelector("#btnSolo"));
    await ruhe();
    await klick(root.querySelector("#btnChatZurueck"));
    expect(root.querySelector("#scrMyRoom").classList.contains("pb-hidden")).toBe(false);
  });
});

describe("S35 · Ein Info-Bereich pro Vorraum", () => {
  it("Agenda verdrängt das Regal (kein Stapeln); erneuter Klick klappt zu", async () => {
    const backend = memoryBackend(null);
    await backend.bstate.set("shelf", { items: [{ id: "RG1", text: "Einblick", by: "Bernd", read: false }] });
    await backend.bstate.set("agenda", { items: [{ id: "AGD1", text: "Thema", by: "Bernd", state: "open" }] });
    const app = createApp({ doc: document, backend, root });
    await app.boot();
    await klick(root.querySelector("#btnSharedRoom"));
    await klick(root.querySelector("#btnRegal"));
    expect(root.querySelector("#boxRegal").classList.contains("pb-hidden")).toBe(false);
    await klick(root.querySelector("#btnAgenda"));
    expect(root.querySelector("#boxAgenda").classList.contains("pb-hidden")).toBe(false);
    expect(root.querySelector("#boxRegal").classList.contains("pb-hidden")).toBe(true);   // verdrängt
    await klick(root.querySelector("#btnAgenda"));                                        // Toggle
    expect(root.querySelector("#boxAgenda").classList.contains("pb-hidden")).toBe(true);
  });
});

describe("S35 · Gemeinsame Auflösung nur mit beiden Handover-Blocks", () => {
  it("ohne Freigaben: Knopf deaktiviert, Start wirft freundlichen Hinweis", async () => {
    const backend = memoryBackend(new MockLLM([]));
    const app = createApp({ doc: document, backend, root });
    await app.boot();
    await klick(root.querySelector("#btnSharedRoom"));
    expect(root.querySelector("#btnGemeinsam").disabled).toBe(true);
    await app.startChat("gemeinsam").catch(e => app._err(e.message));
    await ruhe();
    expect(root.querySelector("#pbErr").textContent).toContain("Auflösung");
    expect(root.querySelector("#scrChat").classList.contains("pb-hidden")).toBe(true);
  });

  it("mit beiden Freigaben: Knopf aktiv, Session startet mit Klärungs-Kontext", async () => {
    const mock = new MockLLM(["Schön, dass ihr da seid — lasst uns eure Selbstangaben nebeneinanderlegen."]);
    const backend = memoryBackend(mock);
    await handoverBeide(backend);
    const app = createApp({ doc: document, backend, root });
    await app.boot();
    await klick(root.querySelector("#btnSharedRoom"));
    await ruhe();
    expect(root.querySelector("#btnGemeinsam").disabled).toBe(false);
    await klick(root.querySelector("#btnGemeinsam"));
    await ruhe();
    expect(root.querySelector("#scrChat").classList.contains("pb-hidden")).toBe(false);
    const userMsgs = mock.calls[0].messages.filter(m => m.role === "user").map(m => m.content).join("\n");
    expect(userMsgs).toContain("Verlässlichkeit");   // Handover-Material liegt der Session bei
  });
});

describe("S35 · Wegweiser", () => {
  it("Gemeinsamer Raum: fehlende Freigaben werden benannt; mit beiden ist die Auflösung startklar", async () => {
    const backend = memoryBackend(new MockLLM([]));
    const app = createApp({ doc: document, backend, root });
    await app.boot();
    await klick(root.querySelector("#btnSharedRoom"));
    await ruhe();
    expect(root.querySelector("#wegTeil").textContent).toContain("sobald ihr beide");
    await handoverBeide(backend);
    await klick(root.querySelector("#btnZurueck2"));
    await klick(root.querySelector("#btnSharedRoom"));
    await ruhe();
    // S54: "Freigaben bereit" + Auflösungs-Einladung sind EINE Aktionszeile.
    const weg = root.querySelector("#wegTeil").textContent;
    expect(weg).toContain("Freigaben liegen bereit");
    expect(weg).toContain("Startet eure Gemeinsame Auflösung");
  });

  it("Aufdeck-Bereitschaft (beide Freigaben, kein Protokoll) erscheint auf Start und im Gemeinsamen Raum", async () => {
    const backend = memoryBackend(new MockLLM([]));
    await backend.bstate.set("reveal", { A: { name: "Anna", top5: ["a"], guess3: ["b"] }, B: { name: "Bernd", top5: ["c"], guess3: ["d"] } });
    const app = createApp({ doc: document, backend, root });
    await app.boot();
    await ruhe();
    // S43: kein separater Aufdeck-Hinweis mehr; ohne beidseitige Freigabe
    // erscheint auch keine Auflösungs-Options-Zeile (Lage-Hinweise übernehmen).
    expect(root.querySelector("#wegStart").textContent).not.toContain("Aufdeck-Runde");
    await klick(root.querySelector("#btnSharedRoom"));
    await ruhe();
    expect(root.querySelector("#wegTeil").textContent).not.toContain("Aufdeck-Runde");
    expect(root.querySelector("#wegTeil").textContent).toContain("Qualitätszeit");
  });

  it("Mein Raum: pausierte Auftragsklärung wird mit Kapitel benannt", async () => {
    const backend = memoryBackend(new MockLLM([]));
    await backend.chat.save("mine", "einzel", { messages: [{ role: "assistant", content: "…" }], status: "running", kapitel: 2 });
    const app = createApp({ doc: document, backend, root });
    await app.boot();
    await klick(root.querySelector("#btnMyRoom"));
    await ruhe();
    expect(root.querySelector("#wegMein").textContent).toContain("Kapitel 2");
  });
});

describe("S35 · Globale Ladeanzeige", () => {
  it("Pille erscheint während einer laufenden Anfrage und verschwindet danach", async () => {
    // steuerbares LLM: Antwort wird von außen aufgelöst
    const offen = [];
    const llm = async () => new Promise(res => offen.push(res));
    const backend = memoryBackend(null);
    backend.llm = llm;
    const app = createApp({ doc: document, backend, root });
    await app.boot();
    await ruhe();
    expect(root.querySelector("#pbBusy").classList.contains("pb-hidden")).toBe(true);
    const start = app.startChat("solo");
    await ruhe();
    // S36: Im Chat zeigt die Tipp-Blase den Ladezustand IN PLACE — die
    // globale Pille tritt zurück (nie beide zugleich).
    expect(root.querySelector("#pbStream")).toBeTruthy();
    expect(root.querySelector("#pbBusy").classList.contains("pb-hidden")).toBe(true);
    offen.shift()({ text: "Willkommen.", stop: "end_turn" });
    await start; await ruhe();
    expect(root.querySelector("#pbStream")).toBeFalsy();
    expect(root.querySelector("#pbBusy").classList.contains("pb-hidden")).toBe(true);
  });
});

describe("S35 · Verbindendes Angebot aus dem CHOICE-BLOCK (modell-generiert)", () => {
  it("Optionen aus dem Block erscheinen als Karten plus Ohne-Übung; Wahl geht als Wire-Token, nie sichtbar in den Chat", async () => {
    const block = 'Schön, dass ihr da seid – mögt ihr kurz ankommen?\nCHOICE-BLOCK\n{"id":"connect","title":"Womit mögt ihr heute ankommen?","options":["Eine Minute nur atmen, nebeneinander","Erzählt euch je einen Moment der Woche, der gutgetan hat","Wenn es stimmig ist: kurz die Hand des anderen halten"]}\nEND CHOICE-BLOCK';
    const mock = new MockLLM([block, "Alles gut – dann direkt hinein."]);
    const backend = memoryBackend(mock);
    const app = createApp({ doc: document, backend, root });
    await app.boot();
    await klick(root.querySelector("#btnSharedRoom"));
    await klick(root.querySelector("#btnMoment"));
    await ruhe();

    const panel = root.querySelector("#kwPanel");
    expect(panel.classList.contains("pb-hidden")).toBe(false);
    expect(panel.textContent).toContain("Womit mögt ihr heute ankommen?");
    expect(panel.textContent).toContain("Eine Minute nur atmen");
    const karten = panel.querySelectorAll("[data-ch]");
    expect(karten.length).toBe(4);   // 3 Modell-Optionen + Ohne-Übung (App-Invariante)
    expect(panel.textContent).toContain("Ohne Übung weiter");
    // Anzeige-Hygiene: Der Block selbst steht nicht roh im Chat
    expect(root.querySelector("#pbMsgs").textContent).not.toContain("CHOICE-BLOCK");

    await klick(panel.querySelector('[data-ch="0"]'));
    await ruhe();
    const gesendet = mock.calls.flatMap(c => c.messages).filter(m => m.role === "user").map(m => m.content).join("\n");
    expect(gesendet).toContain("CHOICE-RESULT: connect=Eine Minute nur atmen, nebeneinander");
    // Wire-Token bleibt unsichtbar (S35): nie im sichtbaren Chat
    expect(root.querySelector("#pbMsgs").textContent).not.toContain("CHOICE-RESULT");
  });
});
