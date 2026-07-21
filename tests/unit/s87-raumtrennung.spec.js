// @vitest-environment happy-dom
// S87 · Raumtrennung der Chat-Oberfläche (harte Variante): scrChat ist eine
// leere Hülle, die Oberfläche wird beim Betreten aus der Vorlage gebaut und
// beim Verlassen restlos abgebaut. Entwürfe leben nur im Arbeitsspeicher
// (K3 b), das Diktat stirbt mit dem Raum, die Pausen-Semantik gehört dem
// Abbau. Die Kanarien liegen in s87-panel-hygiene.spec.js.

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
  const repo = new Repo({ store, ns: "T", code: "s87a", activeModuleId: "betrieb" });
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

const CHAT_ELEMENTE = ["chatTitel", "pbMsgs", "gatePanel", "kwPanel", "pbSkala",
  "pbSkalaRange", "pbSkalaSend", "pbComposer", "pbInput", "btnMic", "btnSend",
  "btnChatEnde", "btnChatZurueck"];

describe("S87 · T1 — Vorlage, Abbau, Aufbau", () => {
  it("außerhalb des Chats ist scrChat eine LEERE Hülle; Betreten baut alle Bedienelemente", async () => {
    const app = await bootApp(memoryBackend(new MockLLM(["Hallo Anna.", "Weiter."])));
    expect($id("scrChat").childElementCount).toBe(0);            // nach boot()
    await app.startChat("solo");
    await ruhe();
    for (const el of CHAT_ELEMENTE) expect($id(el), el).toBeTruthy();
    await klick($id("btnChatZurueck"));
    expect($id("scrChat").childElementCount).toBe(0);            // nach dem Verlassen
    for (const el of CHAT_ELEMENTE) expect($id(el), el).toBeNull();
  });

  it("Verdrahtung nach Neubau: Senden, Enter und Raum-Verlassen wirken in der ZWEITEN Session", async () => {
    const mock = new MockLLM(["Erste Runde.", "Antwort A.", "Zweite Runde.", "Antwort B.", "Antwort C."]);
    const app = await bootApp(memoryBackend(mock));
    await app.startChat("solo"); await ruhe();
    await klick($id("btnChatZurueck"));
    await app.startChat("solo"); await ruhe();                   // zweiter Aufbau — frische Bindungen
    $id("pbInput").value = "Hallo nochmal";
    await klick($id("btnSend")); await ruhe();
    expect($id("pbMsgs").textContent).toContain("Hallo nochmal");
    // Enter sendet auch nach dem Neubau
    $id("pbInput").value = "Per Enter";
    $id("pbInput").dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await ruhe();
    expect($id("pbMsgs").textContent).toContain("Per Enter");
    // Raum-Verlassen wirkt (dritte Bindung derselben Sorte)
    await klick($id("btnChatZurueck"));
    expect($id("scrChat").childElementCount).toBe(0);
    expect($id("scrMyRoom").classList.contains("pb-hidden")).toBe(false);
  });

  it("pbErr aus der Session ist nach dem Raumwechsel leer und verborgen (R3)", async () => {
    const app = await bootApp(memoryBackend(new MockLLM(["Hallo."])));
    await app.startChat("solo"); await ruhe();
    app._err("Fehler aus der Solositzung");
    expect($id("pbErr").classList.contains("pb-hidden")).toBe(false);
    await klick($id("btnChatZurueck"));
    expect($id("pbErr").classList.contains("pb-hidden")).toBe(true);
    expect($id("pbErr").textContent).toBe("");
  });

  it("G4 · Abbau OHNE pausiereChat() stempelt pausedAt (Wiedereinstiegs-Ritual rechnet korrekt)", async () => {
    const backend = memoryBackend(new MockLLM(["Hallo Anna."]));
    const app = await bootApp(backend);
    await app.startChat("solo"); await ruhe();
    // Verlassen über die rohe Navigation — NICHT über btnChatZurueck:
    app.show("scrMyRoom");
    await ruhe();
    const chat = await backend.chat.load("mine", "solo");
    expect(chat && typeof chat.pausedAt).toBe("number");
  });

  it("G1 · direkter startChat→startChat (ohne Vorraum) sichert den Entwurf der ersten Session", async () => {
    const mock = new MockLLM(["Solo eins.", "Moment eins."]);
    const app = await bootApp(memoryBackend(mock));
    await app.startChat("solo"); await ruhe();
    $id("pbInput").value = "halber Gedanke";
    await app.startChat("moment"); await ruhe();                 // kein Vorraum dazwischen
    expect($id("pbInput").value).toBe("");                       // nichts quert
    expect(app._state.entwuerfe.solo).toBe("halber Gedanke");    // aber nichts geht verloren
  });
});

describe("S87 · T3 — Entwurf im Arbeitsspeicher (K3 b)", () => {
  it("Entwurf quert den Raum nicht, kommt aber beim Wiederbetreten zurück", async () => {
    const mock = new MockLLM(["Solo.", "Qualitätszeit.", "Solo wieder."]);
    const app = await bootApp(memoryBackend(mock));
    await app.startChat("solo"); await ruhe();
    $id("pbInput").value = "Ich habe Angst, dass er mich verlässt.";
    await klick($id("btnChatZurueck"));
    await app.startChat("moment"); await ruhe();
    expect($id("pbInput").value).toBe("");                       // R2: der gemeinsame Schirm bleibt frei
    await klick($id("btnChatZurueck"));
    await app.startChat("solo"); await ruhe();
    expect($id("pbInput").value).toBe("Ich habe Angst, dass er mich verlässt.");
  });

  it("der Entwurf wird NIRGENDS persistiert (Store-Inhalt, nicht Fassade)", async () => {
    const backend = memoryBackend(new MockLLM(["Solo.", "Moment."]));
    const app = await bootApp(backend);
    await app.startChat("solo"); await ruhe();
    $id("pbInput").value = "GEHEIMER ENTWURF 4711";
    await klick($id("btnChatZurueck"));
    await app.startChat("moment"); await ruhe();
    await klick($id("btnChatZurueck"));
    const alles = JSON.stringify([...backend.store._shared.entries()]) +
                  JSON.stringify([...backend.store._priv.entries()]);
    expect(alles).not.toContain("GEHEIMER ENTWURF 4711");
  });

  it("relaunch/Paarwechsel: neue App-Instanz ⇒ kein Entwurf quert", async () => {
    const b1 = memoryBackend(new MockLLM(["Solo eins."]));
    const app1 = await bootApp(b1);
    await app1.startChat("solo"); await ruhe();
    $id("pbInput").value = "privater Halbsatz";
    await klick($id("btnChatZurueck"));
    // neues Paar, neue Instanz — wie nach relaunch()/Code-Wechsel
    document.body.innerHTML = '<div id="app"></div>';
    root = document.getElementById("app");
    const app2 = await bootApp(memoryBackend(new MockLLM(["Solo zwei."])));
    await app2.startChat("solo"); await ruhe();
    expect($id("pbInput").value).toBe("");
    expect(app2._state.entwuerfe.solo).toBeUndefined();
  });
});

describe("S87 · T4 — Diktat stirbt mit dem Raum (R5/G2)", () => {
  function baueSRMock() {
    const instanzen = [];
    class SR {
      constructor() { this.stopped = false; instanzen.push(this); }
      start() {}
      stop() { this.stopped = true; }
    }
    return { SR, instanzen };
  }

  it("Raumwechsel stoppt das Diktat; ein spätes onresult schreibt NICHT ins neue Eingabefeld", async () => {
    const { SR, instanzen } = baueSRMock();
    const backend = memoryBackend(new MockLLM(["Solo.", "Moment."]));
    const app = createApp({ doc: document, backend, root, diktat: { SR, ua: "TestUA" } });
    await app.boot(); await ruhe();
    await app.startChat("solo"); await ruhe();
    await klick($id("btnMic"));
    expect(instanzen.length).toBe(1);
    const rec = instanzen[0];
    const spaetesResult = rec.onresult;                          // Handler festhalten wie der Browser
    await klick($id("btnChatZurueck"));
    expect(rec.stopped).toBe(true);                              // Abbau hat gestoppt
    expect(rec.onresult).toBeNull();                             // G2: Handler genullt, nicht nur gestoppt
    await app.startChat("moment"); await ruhe();
    // Der Browser feuert das gequeute Ereignis über die ALTE Referenz:
    if (typeof spaetesResult === "function")
      spaetesResult({ resultIndex: 0, results: [Object.assign([{ transcript: "privates Diktat" }], { isFinal: true })] });
    expect($id("pbInput").value).not.toContain("privates Diktat");
  });
});
