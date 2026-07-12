// @vitest-environment happy-dom
// Chat-UX · Streaming: die Antwort wächst live in einer Blase (#pbStream);
// angefangene Marker/Blöcke werden während des Stroms NIE roh sichtbar
// (S34-Lehre, auf Teiltexte übertragen); die fertige Nachricht ersetzt die
// Blase ohne Duplikat.

import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";

const tick = () => new Promise(r => setTimeout(r, 0));
const ruhe = async (n = 6) => { for (let i = 0; i < n; i++) await tick(); };

/** LLM, das onDelta nach außen reicht und von außen aufgelöst wird. */
function streamendesLlm() {
  const offen = [];
  const fn = async (sys, msgs, onDelta) => new Promise(res => offen.push({ res, onDelta }));
  fn.delta = t => { const o = offen[0]; if (o && o.onDelta) o.onDelta(t); };   // INKREMENT — kumuliert wird in der Engine
  fn.antworte = text => { const o = offen.shift(); if (o) o.res({ text, stop: "end_turn" }); };
  return fn;
}

function backendMit(llm) {
  return {
    async info() { return { role: "A", name: "Anna", partner: "Bernd", nameA: "Anna", nameB: "Bernd" }; },
    bstate: { get: async () => null, set: async () => true },
    pstate: { get: async () => null, set: async () => true },
    chat: { load: async () => null, save: async () => true },
    handover: { post: async () => {}, get: async () => null },
    llm,
  };
}

let root, llm;
beforeEach(async () => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app");
  llm = streamendesLlm();
  const app = createApp({ doc: document, backend: backendMit(llm), root });
  await app.boot();
  const start = app.startChat("solo");
  await ruhe();
  llm.antworte("Willkommen.");
  await start; await ruhe();
});

const streamBlase = () => root.querySelector("#pbStream");

async function sende(text) {
  root.querySelector("#pbInput").value = text;
  root.querySelector("#btnSend").click();
  await ruhe(2);
}

describe("Chat-UX · Streaming-Anzeige", () => {
  it("Deltas erscheinen live in der Blase; die fertige Antwort ersetzt sie ohne Duplikat", async () => {
    await sende("Mich beschäftigt etwas.");
    expect(streamBlase()).toBeTruthy();                       // Platzhalter steht schon (Tipp-Punkte)

    llm.delta("Magst du");
    expect(streamBlase().textContent).toContain("Magst du");
    llm.delta("Magst du mehr erzählen?");
    expect(streamBlase().textContent).toContain("mehr erzählen?");

    llm.antworte("Magst du mehr erzählen?");
    await ruhe();
    expect(streamBlase()).toBeFalsy();                        // Voll-Rerender räumt die Blase ab
    const treffer = [...root.querySelectorAll(".pb-msg")].filter(d => /mehr erzählen\?/.test(d.textContent));
    expect(treffer).toHaveLength(1);                          // kein Duplikat
  });

  it("angefangene Marker und Blöcke bleiben im Strom unsichtbar", async () => {
    await sende("weiter");
    llm.delta("Gut. ");
    llm.delta("[[SCALE-SAF");                                 // Marker im Entstehen
    expect(streamBlase().textContent).not.toContain("[[");
    expect(streamBlase().textContent).toContain("Gut.");
    llm.antworte("Gut.");
    await ruhe();

    await sende("und weiter");
    llm.delta("Hier dein Stand.\nGATE-BLOCK\n");              // Block ohne Ende
    llm.delta('{"halb":true');
    const txt = streamBlase().textContent;
    expect(txt).toContain("Hier dein Stand.");
    expect(txt).not.toContain("GATE-BLOCK");
    expect(txt).not.toContain("halb");
    llm.antworte("Hier dein Stand.");
    await ruhe();

    await sende("noch eins");
    llm.delta("Kurz notiert.\nGATE-BLO");                     // angerissenes Start-Token am Ende
    expect(streamBlase().textContent).not.toContain("GATE-BLO");
    expect(streamBlase().textContent).toContain("Kurz notiert.");
    llm.antworte("Kurz notiert.");
    await ruhe();
  });

  it("vollständig gestreamter Marker wird gemäß markerOrder entfernt (cleanDisplay-Pfad)", async () => {
    await sende("noch etwas");
    const mk = "[[SCALE-SAFETY]]";
    llm.delta("Danke dir.\n" + mk);
    expect(streamBlase().textContent).not.toContain("SCALE");
    expect(streamBlase().textContent).toContain("Danke dir.");
    llm.antworte("Danke dir.");
    await ruhe();
  });
});
