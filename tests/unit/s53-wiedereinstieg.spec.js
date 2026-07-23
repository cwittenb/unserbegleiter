// @vitest-environment happy-dom
// S53 · Wiedereinstieg & Vorraum-Ordnung:
// (1) Kartentausch in "Mein Raum": links Auftragsklärung, rechts Reflexion.
// (2) Dynamisches Label: begonnene Auftragsklärung heißt "fortsetzen".
// (3) Wiedereinstieg in eine LAUFENDE Auftragsklärung: versteckter Steuertext
//     löst die festgelegte Begrüßung aus; ein wartendes Panel (Marker/Block
//     im letzten Assistant-Zug) blockiert die Begrüßung (Vertrag 1).
// (4) Die Seite scrollt beim Rendern des Verlaufs ans Ende (pb-msgs ist
//     kein Scroll-Container).

import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";
import { MockLLM } from "../../core/engine/mock-llm.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { freigebeUebergabe } from "../../core/engine/freigabe.js";
import { uebergabeTeilKey } from "../../core/contracts/uebergabe.js";
import { steuerTexte } from "../../core/prompts/prompts.de.js";
import { steuerTexte as steuerTexteEn } from "../../core/prompts/prompts.en.js";
import { t } from "../../core/i18n/index.js";

function memoryBackend(mock, role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "s53", activeModuleId: "betrieb" });
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

/** Gespeicherte, LAUFENDE Auftragsklärung; letzter Zug wählbar. */
async function speichereEinzel(backend, letzterAssistantText) {
  await backend.chat.save("mine", "einzel", {
    status: "running",
    language: "de",
    messages: [
      { role: "user", hidden: true, content: steuerTexte.start.einzel },
      { role: "assistant", content: "Willkommen. Erzähl mir von euch." },
      { role: "user", content: "Wir sind seit fünf Jahren zusammen." },
      { role: "assistant", content: letzterAssistantText },
    ],
  });
}

describe("S53 · Kartentausch & dynamisches Label in Mein Raum", () => {
  it("links steht die Auftragsklärung, rechts das Reflexionsgespräch", async () => {
    await bootApp(memoryBackend(null));
    // D3: Sessions leben als Hairline-Zeilen unten an der Zonengrenze der
    // Papier-Haelfte — Reflexion zuerst, dann Auftragsklaerung (mit Mess-Slot).
    const zone = root.querySelector("#scrMyRoom .rz-papier .rz-fuss");
    const knoepfe = [...zone.querySelectorAll("button.rz-zeile")].map(b => b.id);
    expect(knoepfe).toEqual(["btnSolo", "btnEinzel", "btnMess"]);
  });

  it("ohne begonnene Auftragsklärung heißt der Knopf 'beginnen'", async () => {
    const app = await bootApp(memoryBackend(null));
    await klick(root.querySelector("#btnMyRoom"));
    await ruhe();
    expect(root.querySelector("#einzelLabel").textContent).toBe(t("mein.einzel"));   // D3: Label-Span
    expect(app._state.screen).toBe("scrMyRoom");
  });

  it("eine begonnene (pausierte) Auftragsklärung heißt 'fortsetzen'", async () => {
    const backend = memoryBackend(null);
    await speichereEinzel(backend, "Magst du mehr erzählen?");
    await bootApp(backend);
    await klick(root.querySelector("#btnMyRoom"));
    await ruhe();
    expect(root.querySelector("#einzelLabel").textContent).toBe(t("mein.einzelWeiter"));   // D3: Label-Span
  });
});

describe("S53 · Wiedereinstieg in die laufende Auftragsklärung", () => {
  it("sendet den versteckten Wiedereinstiegs-Steuertext und zeigt die Begrüßung", async () => {
    const mock = new MockLLM(["Schön, dass du wieder da bist, Anna. Möchtest du dort weitermachen, wo wir waren – oder vorher noch etwas korrigieren oder spezifizieren?"]);
    const backend = memoryBackend(mock);
    await speichereEinzel(backend, "Magst du mehr erzählen?");
    const app = await bootApp(backend);
    await app.startChat("einzel");
    await ruhe(12);
    const msgs = app._state.engine.chat.messages;
    const steuer = msgs.find(m => m.content === steuerTexte.einzelWeiter);
    expect(steuer).toBeTruthy();
    expect(steuer.hidden).toBe(true);
    // Der Steuertext bleibt unsichtbar, die Begrüßung wird gerendert:
    expect(root.querySelector("#pbMsgs").textContent).toContain("Schön, dass du wieder da bist");
    expect(root.querySelector("#pbMsgs").textContent).not.toContain("WIEDEREINSTIEG");
  });

  it("feuert NICHT, wenn der letzte Zug ein wartendes Panel hält (Marker)", async () => {
    const mock = new MockLLM([]);   // jede Modell-Runde wäre ein Drehbuch-Fehler
    const backend = memoryBackend(mock);
    await speichereEinzel(backend, "Jetzt sortieren statt bewerten.\n[[RANKING]]");
    const app = await bootApp(backend);
    const start = app.startChat("einzel");
    await ruhe(12);
    start.catch(() => {});
    const msgs = app._state.engine.chat.messages;
    expect(msgs.some(m => m.content === steuerTexte.einzelWeiter)).toBe(false);
    // Stattdessen öffnet das Panel wieder:
    expect(root.querySelector("#kwPanel").classList.contains("pb-hidden")).toBe(false);
  });

  it("feuert NICHT im Nachklang-Pfad (freigegeben) — dort läuft weiterhin einzelRueckkehr", async () => {
    const mock = new MockLLM(["Deine Auftragsklärung ist abgeschlossen. Möchtest du etwas hinzufügen, etwas richtigstellen – oder eine Zusammenfassung sehen?"]);
    const backend = memoryBackend(mock);
    await backend.chat.save("mine", "einzel", {
      status: "released", freigegeben: true, language: "de",
      messages: [{ role: "assistant", content: "Danke fürs Teilen." }],
    });
    const app = await bootApp(backend);
    await app.startChat("einzel");
    await ruhe(12);
    const msgs = app._state.engine.chat.messages;
    expect(msgs.some(m => m.content === steuerTexte.einzelRueckkehr)).toBe(true);
    expect(msgs.some(m => m.content === steuerTexte.einzelWeiter)).toBe(false);
  });

  it("Steuertext-Parität: einzelWeiter existiert in beiden Sprachfassungen", () => {
    expect(typeof steuerTexte.einzelWeiter).toBe("string");
    expect(typeof steuerTexteEn.einzelWeiter).toBe("string");
  });
});

describe("S53 · Seite scrollt ans Ende des Verlaufs", () => {
  it("ruft window.scrollTo beim Rendern des Wiedereinstiegs", async () => {
    const mock = new MockLLM(["Schön, dass du wieder da bist, Anna."]);
    const backend = memoryBackend(mock);
    await speichereEinzel(backend, "Magst du mehr erzählen?");
    const app = await bootApp(backend);
    const aufrufe = [];
    document.defaultView.scrollTo = (...a) => aufrufe.push(a);
    await app.startChat("einzel");
    await ruhe(12);
    expect(aufrufe.length).toBeGreaterThan(0);
  });
});
