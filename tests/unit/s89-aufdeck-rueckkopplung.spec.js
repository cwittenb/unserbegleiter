// @vitest-environment happy-dom
// S89 · Aufdeck-Rückkopplung & Nachzügler-Einspeisung: Der Verbrauch der
// Messrunde hängt an [[META-REVEALED]] (ID-genau), nicht mehr am Sessionende;
// nicht Aufgedecktes bleibt liegen. Wird die Runde erst WÄHREND der laufenden
// Qualitätszeit fertig (Handy des Partners), reicht der Lazy-Check sie einmal
// als versteckten Nachtrag nach — vor der nächsten Nutzernachricht.

import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";
import { MockLLM } from "../../core/engine/mock-llm.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { freigebeUebergabe } from "../../core/engine/freigabe.js";
import { uebergabeTeilKey } from "../../core/contracts/uebergabe.js";
import { trageMessbeitragEin } from "../../core/ui/prozess.js";

function memoryBackend(mock, role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "s89", activeModuleId: "betrieb" });
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

/** Fertige Runde direkt anlegen (beide Beiträge da ⇒ ready). */
async function fertigeRunde(backend) {
  await trageMessbeitragEin(backend, "A", { closeness: 4, guess: 7, fit: { AG1: 6 } });
  return trageMessbeitragEin(backend, "B", { closeness: 8, guess: 5, fit: { AG1: 3 } });
}

const MOMENT_BLOCK = 'Danke für diese Zeit.\nMOMENT-BLOCK\n{"summary":"Ein ruhiger Termin.","topics":["Nähe"]}\nEND MOMENT-BLOCK';

describe("S89a · [[META-REVEALED]] — aufgedeckt heißt aufgedeckt", () => {
  it("Marker ⇒ Runde revealed (ID-genau), revealedAt gesetzt, Zeitstrahl-Eintrag abgeleitet", async () => {
    const backend = memoryBackend(new MockLLM([
      "Ihr lest euch gut — Anna lag mit ihrer Schätzung nah dran.\n[[META-REVEALED]]",
    ]));
    const runde = await fertigeRunde(backend);
    const app = await bootApp(backend);
    await app.startChat("moment"); await ruhe();
    const mr = await backend.bstate.get("measurements");
    expect(mr.items[0].id).toBe(runde.id);
    expect(mr.items[0].status).toBe("revealed");
    expect(typeof mr.items[0].revealedAt).toBe("string");
    // Zeitstrahl: abgeleiteter Eintrag in "Gemeinsame Momente"
    await klick($id("btnChatZurueck"));
    await klick($id("btnQz")); await ruhe();
    expect($id("boxQz").textContent).toContain("Prozessreflexion");
  });

  it("KERNFALL: MOMENT-BLOCK OHNE Marker ⇒ Runde bleibt ready und liegt für die nächste QZ bereit", async () => {
    const backend = memoryBackend(new MockLLM([
      "Wir sind woandershin gegangen heute. " + MOMENT_BLOCK,
      "Neue Qualitätszeit.",
    ]));
    await fertigeRunde(backend);
    const app = await bootApp(backend);
    await app.startChat("moment"); await ruhe();
    let mr = await backend.bstate.get("measurements");
    expect(mr.items[0].status).toBe("ready");                    // NICHT verbrannt
    // Die nächste Qualitätszeit bekommt sie erneut in den Kontext:
    await klick($id("btnChatZurueck"));
    await app.startChat("moment"); await ruhe();
    const chat = await backend.chat.load("shared", "moment");
    expect(chat.messrundeId).toBe(mr.items[0].id);
    expect(JSON.stringify(chat.messages)).toContain("META-REFLECTION");
  });

  it("Resume-Festigkeit: erneut dispatchter Marker verbrennt eine INZWISCHEN neue ready-Runde nicht", async () => {
    const backend = memoryBackend(new MockLLM([
      "Aufgedeckt.\n[[META-REVEALED]]", "Weiter im Gespräch.",
    ]));
    const erste = await fertigeRunde(backend);
    const app = await bootApp(backend);
    await app.startChat("moment"); await ruhe();                 // erste Runde revealed
    // Neue Runde wird ready, während die Session pausiert ist:
    const zweite = await fertigeRunde(backend);
    expect(zweite.id).not.toBe(erste.id);
    await klick($id("btnChatZurueck"));
    await app.startChat("moment"); await ruhe();                 // resume() dispatcht den Marker erneut
    const mr = await backend.bstate.get("measurements");
    expect(mr.items.find(r => r.id === erste.id).status).toBe("revealed");
    expect(mr.items.find(r => r.id === zweite.id).status).toBe("ready");   // unberührt
  });

  it("Marker ohne Kontext-Runde (Modell-Fehlgriff) ⇒ folgenlos, kein Fehler", async () => {
    const backend = memoryBackend(new MockLLM(["Hallo ihr zwei.\n[[META-REVEALED]]"]));
    const app = await bootApp(backend);
    await app.startChat("moment"); await ruhe();
    expect($id("pbErr").classList.contains("pb-hidden")).toBe(true);
    const mr = await backend.bstate.get("measurements");
    expect(((mr && mr.items) || []).length).toBe(0);
  });

  it("Copy-Fix: mess.bereit zeigt auf die Qualitätszeit (de)", async () => {
    const mod = await import("../../core/i18n/de.js");
    const de = mod.de || mod.DE || mod.default;
    expect(de["mess.bereit"]).toContain("Qualitätszeit");
    expect(de["mess.bereit"]).not.toContain("gemeinsamen Moment");
  });
});

describe("S89b · Nachzügler-Einspeisung (Lazy-Check)", () => {
  it("KERNFALL: Abgabe während laufender QZ ⇒ nächster Zug trägt den versteckten Nachtrag VOR der Nutzernachricht", async () => {
    const backend = memoryBackend(new MockLLM([
      "Schön, dass ihr da seid.", "Dann schauen wir gemeinsam drauf.\n[[META-REVEALED]]",
    ]));
    const app = await bootApp(backend);
    await app.startChat("moment"); await ruhe();                 // Start OHNE ready-Runde
    let chat = await backend.chat.load("shared", "moment");
    expect(chat.messrundeId).toBeUndefined();
    const runde = await fertigeRunde(backend);                   // „Handy": Abgabe von außen
    $id("pbInput").value = "So, sie ist drin!";
    await klick($id("btnSend")); await ruhe();
    chat = await backend.chat.load("shared", "moment");
    expect(chat.messrundeId).toBe(runde.id);
    const idxNachtrag = chat.messages.findIndex(m => m.hidden && /META-REFLECTION jetzt bereit/.test(m.content));
    const idxUser = chat.messages.findIndex(m => !m.hidden && m.content === "So, sie ist drin!");
    expect(idxNachtrag).toBeGreaterThan(-1);
    expect(idxNachtrag).toBeLessThan(idxUser);                   // Nachtrag VOR der Nutzernachricht
    // Zusammenspiel mit S89a: der Marker bucht genau diese Runde
    const mr = await backend.bstate.get("measurements");
    expect(mr.items[0].status).toBe("revealed");
  });

  it("Einmaligkeit: weitere Züge speisen nicht erneut ein", async () => {
    const backend = memoryBackend(new MockLLM(["Hallo.", "Eins.", "Zwei."]));
    const app = await bootApp(backend);
    await app.startChat("moment"); await ruhe();
    await fertigeRunde(backend);
    $id("pbInput").value = "erster Zug"; await klick($id("btnSend")); await ruhe();
    $id("pbInput").value = "zweiter Zug"; await klick($id("btnSend")); await ruhe();
    const chat = await backend.chat.load("shared", "moment");
    expect(chat.messages.filter(m => /META-REFLECTION jetzt bereit/.test(m.content || "")).length).toBe(1);
  });

  it("war die Runde schon beim START im Kontext ⇒ kein Doppel durch den Lazy-Check", async () => {
    const backend = memoryBackend(new MockLLM(["Hallo.", "Weiter."]));
    await fertigeRunde(backend);
    const app = await bootApp(backend);
    await app.startChat("moment"); await ruhe();
    $id("pbInput").value = "ein Zug"; await klick($id("btnSend")); await ruhe();
    const chat = await backend.chat.load("shared", "moment");
    expect(chat.messages.filter(m => /META-REFLECTION/.test(m.content || "")).length).toBe(1);   // nur der Startkontext
  });

  it("kein Nachtrag in fremden Sessions (chatId-Gate) und keiner bei halber Runde", async () => {
    const backend = memoryBackend(new MockLLM(["Hallo Anna.", "Weiter."]));
    await trageMessbeitragEin(backend, "A", { closeness: 5, guess: 5, fit: {} });   // halbe Runde (open)
    const app = await bootApp(backend);
    await app.startChat("solo"); await ruhe();
    $id("pbInput").value = "nur ich"; await klick($id("btnSend")); await ruhe();
    const solo = await backend.chat.load("mine", "solo");
    expect(JSON.stringify(solo.messages)).not.toContain("META-REFLECTION");
    // und in der QZ: halbe Runde wird nicht eingespeist
    await klick($id("btnChatZurueck"));
    await app.startChat("moment"); await ruhe();
    $id("pbInput").value = "wir zwei"; await klick($id("btnSend")); await ruhe();
    const chat = await backend.chat.load("shared", "moment");
    expect(chat.messrundeId).toBeUndefined();
    expect(JSON.stringify(chat.messages)).not.toContain("META-REFLECTION jetzt bereit");
  });
});
