// @vitest-environment happy-dom
// S87 · Panel-Hygiene & Kanarien: Der Nachzügler-Zaun (Generationsmarke) hält
// laufende Antworten und Panel-Öffner der ALTEN Session aus dem neuen Raum;
// die Kanarien machen aus der Konvention eine Invariante — sie prüfen nicht
// sieben bekannte Felder, sondern die Aussage selbst (ganzer #app-Baum),
// damit ein künftig hinzukommendes Feld automatisch auffällt.

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
  const repo = new Repo({ store, ns: "T", code: "s87b", activeModuleId: "betrieb" });
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

/** LLM, dessen NÄCHSTE Antwort von Hand freigegeben wird (Nachzügler-Bau). */
function zoegerlichesLLM(antworten) {
  const tore = [];
  let i = 0;
  const fn = async () => {
    const text = antworten[Math.min(i++, antworten.length - 1)];
    await new Promise(res => tore.push(res));
    return { text, stop: "end_turn" };
  };
  fn.oeffne = () => { const r = tore.shift(); if (r) r(); };
  fn.offen = () => tore.length;
  return fn;
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

const CHOICE = 'Womit mögt ihr ankommen?\nCHOICE-BLOCK\n{"id":"connect","title":"SENTINEL-MENUE Womit ankommen?","options":["SENTINEL-OPTION atmen","Ein guter Gedanke"]}\nEND CHOICE-BLOCK';

describe("S87 · T2 — Nachzügler-Zaun (R6)", () => {
  it("verzögerte Antwort der alten Session erreicht den neuen Raum nicht — wird aber gespeichert", async () => {
    const llm = zoegerlichesLLM(["NACHZUEGLER-TEXT der Solositzung.", "Willkommen in der Qualitätszeit."]);
    const backend = memoryBackend(null);
    backend.llm = llm;
    const app = await bootApp(backend);

    const soloLauf = app.startChat("solo");            // Antwort hängt am Tor
    await ruhe();
    await klick($id("btnChatZurueck"));                // Raum verlassen, Antwort läuft noch
    const momentLauf = app.startChat("moment");        // neuer Raum, hängt am eigenen Tor
    await ruhe();
    llm.oeffne();                                      // JETZT trifft der Solo-Nachzügler ein
    await ruhe();
    expect($id("pbMsgs").textContent).not.toContain("NACHZUEGLER-TEXT");   // kein Token im neuen Raum
    expect(app._state.warten).toBe(true);              // finally des Nachzüglers kippt das Warten NICHT
    llm.oeffne();                                      // Antwort der Qualitätszeit
    await ruhe();
    await Promise.allSettled([soloLauf, momentLauf]);
    expect($id("pbMsgs").textContent).toContain("Willkommen in der Qualitätszeit");
    const solo = await backend.chat.load("mine", "solo");    // onSave blieb ungezäunt
    expect(JSON.stringify(solo.messages)).toContain("NACHZUEGLER-TEXT");
    // Beim Wiederbetreten steht die Antwort da:
    await klick($id("btnChatZurueck"));
    await app.startChat("solo"); await ruhe();
    expect($id("pbMsgs").textContent).toContain("NACHZUEGLER-TEXT");
  });

  it("Panel-Öffner der alten Session (CHOICE-BLOCK im Nachzügler) öffnen im neuen Raum KEIN Panel", async () => {
    const llm = zoegerlichesLLM([CHOICE, "Hallo in der Soloreflexion."]);
    const backend = memoryBackend(null);
    backend.llm = llm;
    const app = await bootApp(backend);

    const momentLauf = app.startChat("moment");        // Qualitätszeit fragt, Antwort hängt
    await ruhe();
    await klick($id("btnChatZurueck"));
    const soloLauf = app.startChat("solo");            // privater Raum
    await ruhe();
    llm.oeffne();                                      // CHOICE-BLOCK der Qualitätszeit trifft ein
    await ruhe();
    const kw = $id("kwPanel");
    expect(kw.classList.contains("pb-hidden")).toBe(true);     // Zaun hielt den Def-Hook
    expect(kw.innerHTML).toBe("");                             // kein Knopf, der in die alte Session schriebe
    llm.oeffne(); await ruhe();
    await Promise.allSettled([momentLauf, soloLauf]);
    // Kein Verlust: Wiederbetreten der Qualitätszeit → resume() öffnet das Menü doch noch
    await klick($id("btnChatZurueck"));
    await app.startChat("moment"); await ruhe();
    expect($id("kwPanel").classList.contains("pb-hidden")).toBe(false);
    expect($id("kwPanel").textContent).toContain("SENTINEL-MENUE");
  });
});

describe("S87 · T5 — Kanarien", () => {
  it("HÜLLENKANARIE: außerhalb des Chats gilt scrChat.childElementCount === 0 — ohne Ausnahmeliste", async () => {
    const app = await bootApp(memoryBackend(new MockLLM(["Hallo.", "Moment."])));
    expect($id("scrChat").childElementCount).toBe(0);
    await app.startChat("solo"); await ruhe();
    await klick($id("btnChatZurueck"));
    expect($id("scrChat").childElementCount).toBe(0);
    await app.startChat("moment"); await ruhe();
    await klick($id("btnChatZurueck"));
    expect($id("scrChat").childElementCount).toBe(0);
    app.show("scrStart");
    expect($id("scrChat").childElementCount).toBe(0);
  });

  it("SPURENKANARIE privat→gemeinsam: Sentinel aus der Solositzung ist im GESAMTEN Baum abwesend", async () => {
    const S = "XSENTINELX";
    const mock = new MockLLM([
      `Ich höre dich, ${S}-ANTWORT.\nGATE-BLOCK\n{"wording":"${S}-GATE Selbstmitteilung","wish":"${S}-WUNSCH","paths":["shelf","moment","self"]}\nEND GATE-BLOCK`,
      "Schön, dass ihr da seid.",
    ]);
    const app = await bootApp(memoryBackend(mock));
    await app.startChat("solo"); await ruhe();
    $id("pbInput").value = S + "-FRAGE an dich";
    await klick($id("btnSend")); await ruhe();          // Antwort + Gate-Panel mit Sentinel
    $id("pbInput").value = S + "-ENTWURF halber Satz";  // ungesendeter Entwurf
    app._err(S + "-FEHLERZEILE");
    expect(root.textContent).toContain(S);              // Vorbedingung: Sentinel ist wirklich im Baum
    await klick($id("btnChatZurueck"));
    await app.startChat("moment"); await ruhe();
    // Der GESAMTE #app-Baum: Textinhalt, values, title/placeholder/aria-label
    const spuren = [];
    const laufe = kn => {
      if (kn.nodeType === 3 && String(kn.textContent).includes(S)) spuren.push("text:" + kn.textContent.trim().slice(0, 40));
      if (kn.nodeType === 1) {
        for (const att of ["value", "title", "placeholder", "aria-label"]) {
          const v = kn.getAttribute && kn.getAttribute(att);
          if (v && v.includes(S)) spuren.push(att + "@" + (kn.id || kn.tagName));
        }
        if ("value" in kn && String(kn.value).includes(S)) spuren.push("prop:value@" + (kn.id || kn.tagName));
        for (const kind of kn.childNodes) laufe(kind);
      }
    };
    laufe(root);
    expect(spuren).toEqual([]);
  });

  it("SPURENKANARIE gemeinsam→privat (Gegenrichtung): Menü-Sentinel der Qualitätszeit bleibt draußen", async () => {
    const mock = new MockLLM([CHOICE, "Willkommen in deiner Soloreflexion."]);
    const app = await bootApp(memoryBackend(mock));
    await app.startChat("moment"); await ruhe();
    expect(root.textContent).toContain("SENTINEL-MENUE");    // Panel steht im gemeinsamen Raum
    $id("pbInput").value = "SENTINEL-GEMEINSAM Entwurf";
    await klick($id("btnChatZurueck"));
    await app.startChat("solo"); await ruhe();
    expect(root.textContent).not.toContain("SENTINEL-MENUE");
    expect(root.textContent).not.toContain("SENTINEL-OPTION");
    const felder = [...root.querySelectorAll("input,textarea")].map(f => f.value).join(" ");
    expect(felder).not.toContain("SENTINEL-GEMEINSAM");
  });

  it("Schnellantwort-Regler der neuen Session wird nicht mehr von einem Fremdpanel unterdrückt", async () => {
    const mock = new MockLLM([CHOICE,
      "Wie geht es dir gerade auf einer Skala von 1 bis 10?"]);
    const app = await bootApp(memoryBackend(mock));
    await app.startChat("moment"); await ruhe();               // Panel offen
    await klick($id("btnChatZurueck"));
    await app.startChat("solo"); await ruhe();                 // Skalenfrage in der Solositzung
    expect($id("kwPanel").classList.contains("pb-hidden")).toBe(true);
    expect($id("pbSkala").classList.contains("offen")).toBe(true);   // aktualisiereSkala: panelOffen ist frei
  });
});
