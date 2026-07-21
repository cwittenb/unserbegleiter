// @vitest-environment happy-dom
// S39 · Kontextbewusstes Reflexionsgespräch (COMPANION-CONTEXT wird jetzt
// wirklich gebaut; kalter vs. Wiederkehrer-Einstieg kanonisch) und
// Prozessreflexions-Rhythmus (geteilter Vertrag, Default wöchentlich,
// Fenster-Gating, Fragetext bezieht den Abstand ein).

import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";
import { MockLLM } from "../../core/engine/mock-llm.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { freigebeUebergabe } from "../../core/engine/freigabe.js";
import { uebergabeTeilKey } from "../../core/contracts/uebergabe.js";
import { baueSoloKontext } from "../../core/ui/sessions.js";
import {
  holeMessIntervall, schlageMessIntervallVor, antworteMessIntervall,
  messFenster, trageMessbeitragEin, MESS_INTERVALL_TAGE,
} from "../../core/ui/prozess.js";
import { reflexionsPrompt } from "../../core/prompts/prompts.de.js";
import { reflexionsPrompt as reflexionsPromptEn } from "../../core/prompts/prompts.en.js";

function memoryBackend(mock, role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "s39", activeModuleId: "betrieb" });
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

describe("S39 · COMPANION-CONTEXT fürs Reflexionsgespräch", () => {
  it("baueSoloKontext: null bei leerem Material — kalter Start", () => {
    expect(baueSoloKontext({ goals: null, sharings: [], timeline: null, momentLog: null })).toBeNull();
  });

  it("baueSoloKontext: enthält Aufträge, freigegebenes Material, Zeitleiste und Sessions", () => {
    const k = baueSoloKontext({
      goals: { items: [{ id: "AG1", art: "shared", status: "active", text: "Mehr echte Zeit zu zweit" }] },
      sharings: [{ name: "Anna", items: [{ id: "S1", text: "Nähe sehr wichtig" }] }],
      timeline: { entries: [{ at: "2026-07-01T10:00:00Z", topics: ["Nähe"], summary: "Es ging um Nähe im Alltag." }] },
      momentLog: { entries: [{ at: "2026-07-05T18:00:00Z", summary: "Verbindender Einstieg, Thema Wochenenden." }] },
    });
    expect(k).toContain("COMPANION-CONTEXT");
    expect(k).toContain("AG1");
    expect(k).toContain("Nähe sehr wichtig");
    expect(k).toContain("Es ging um Nähe im Alltag.");
    expect(k).toContain("Thema Wochenenden");
  });

  it("kalter Start: ohne Material geht KEIN Kontext über den Draht", async () => {
    const mock = new MockLLM(["Schön, dass du da bist, Anna."]);
    const backend = memoryBackend(mock);
    const app = await bootApp(backend);
    await app.startChat("solo");
    await ruhe();
    const user = mock.calls[0].messages.filter(m => m.role === "user");
    expect(user.some(m => m.content.includes("COMPANION-CONTEXT"))).toBe(false);
  });

  it("Wiederkehr: freigegebenes Material speist einen versteckten COMPANION-CONTEXT", async () => {
    const mock = new MockLLM(["Schön, dass du wieder da bist, Anna."]);
    const backend = memoryBackend(mock);
    await freigebeUebergabe(backend.repo, "A", { module: "kernwetten", name: "Anna", items: [{ id: "S1", text: "Verlässlichkeit", tag: "FirstTake" }] });
    const app = await bootApp(backend);
    await app.startChat("solo");
    await ruhe();
    const kontext = app._state.engine.chat.messages.find(m => m.role === "user" && m.content.includes("COMPANION-CONTEXT"));
    expect(kontext).toBeTruthy();
    expect(kontext.hidden).toBe(true);
    expect(kontext.content).toContain("Verlässlichkeit");
    expect(root.querySelector("#pbMsgs").textContent).not.toContain("COMPANION-CONTEXT");   // nie sichtbar
  });

  it("Korpus-Kanarien: beide Einstiegsvarianten kanonisch (de/en)", () => {
    const p = reflexionsPrompt("Anna", "Bernd"), pe = reflexionsPromptEn("Anna", "Bernd");
    expect(p).toContain("starten wir einfach gemeinsam bei null");
    expect(p).toContain("Schön, dass du wieder da bist");
    expect(p).toContain("Wollen wir an <Anknüpf-Anker> anknüpfen?");
    expect(p).toContain('Behaupte nie "wir kennen uns noch nicht", wenn Kontext vorliegt');
    expect(pe).toContain("we simply start from zero together");
    expect(pe).toContain("It's good to have you back");
  });
});

describe("S39 · Prozessreflexions-Rhythmus (geteilter Vertrag)", () => {
  it("Default ist wöchentlich; Vorschlag wird erst mit Bestätigung der anderen Person wirksam", async () => {
    const backend = memoryBackend(null);
    expect((await holeMessIntervall(backend)).days).toBe(MESS_INTERVALL_TAGE);
    await schlageMessIntervallVor(backend, "A", 14);
    expect((await holeMessIntervall(backend)).days).toBe(7);            // noch nicht wirksam
    const nachB = await antworteMessIntervall(backend, "B", true);
    expect(nachB.days).toBe(14);                                        // beidseitig bestätigt
    expect(nachB.vorschlag).toBeNull();
  });

  it("Ablehnen verwirft; eigene Vorschläge lassen sich zurückziehen", async () => {
    const backend = memoryBackend(null);
    await schlageMessIntervallVor(backend, "A", 3);
    expect((await antworteMessIntervall(backend, "B", false)).days).toBe(7);
    await schlageMessIntervallVor(backend, "A", 3);
    const zurueck = await antworteMessIntervall(backend, "A", false);   // Zurückziehen
    expect(zurueck.days).toBe(7);
    expect(zurueck.vorschlag).toBeNull();
  });

  it("Fenster: frischer eigener Beitrag sperrt eine NEUE Runde bis zum Ablauf des Abstands", async () => {
    const backend = memoryBackend(null);
    const runde = await trageMessbeitragEin(backend, "A", { closeness: 5, guess: 5, fit: {} });
    expect(runde.values.A.at).toBeTruthy();
    const mr = await backend.bstate.get("measurements");
    const jetzt = () => Date.parse(runde.values.A.at) + 2 * 86400000;   // 2 Tage später
    expect(messFenster(mr, "A", 7, jetzt).offen).toBe(false);
    const spaeter = () => Date.parse(runde.values.A.at) + 8 * 86400000; // 8 Tage später
    expect(messFenster(mr, "A", 7, spaeter).offen).toBe(true);
    expect(messFenster(mr, "B", 7, jetzt).offen).toBe(true);            // Bernd hat noch nicht abgegeben
  });

  it("Fragetext bezieht den Abstand ein; frische Abgabe zeigt die Sperre mit Datum", async () => {
    const backend = memoryBackend(null);
    await backend.bstate.set("findings", { at: new Date().toISOString() });   // S44: erst nach Auflösung sichtbar
    await bootApp(backend);
    await klick(root.querySelector("#btnMyRoom"));
    await ruhe();
    expect(root.querySelector("#btnMess").classList.contains("pb-hidden")).toBe(false);
    await klick(root.querySelector("#btnMess"));
    await ruhe();
    expect(root.querySelector("#boxMess").textContent).toContain("in der letzten Woche");
    await klick(root.querySelector("#boxMess").querySelector("#msOk"));
    await ruhe();
    // Runde ist offen und eigener Beitrag da → "abgegeben"-Ansicht
    await klick(root.querySelector("#btnZurueck3"));   // S88: Raum verlassen …
    await klick(root.querySelector("#btnMess"));       // … und frisch betreten
    await ruhe();
    expect(root.querySelector("#boxMess").textContent).toContain("abgegeben");
  });

  it("Rhythmus in der Agenda (Weitere Absprachen): Vorschlags-/Bestätigungs-Drehbuch", async () => {
    const backend = memoryBackend(null);
    await bootApp(backend);
    await klick(root.querySelector("#btnSharedRoom"));
    await ruhe();
    await klick(root.querySelector("#btnAgenda"));
    await ruhe();
    const box = root.querySelector("#agendaAbsprachen");
    expect(box.textContent).toContain("Weitere Absprachen");
    box.querySelector("#miTage").value = "14";
    await klick(box.querySelector("#miVorschlag"));
    await ruhe();
    expect(root.querySelector("#agendaAbsprachen").textContent).toContain("wartet auf Bernd");
    expect((await holeMessIntervall(backend)).days).toBe(7);            // App zeigt Vertrag, nicht Wunsch
  });
});
