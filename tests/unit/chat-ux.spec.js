// @vitest-environment happy-dom
// Chat-UX: Sofort-Anzeige der eigenen Nachricht + Tipp-Indikator, Enter sendet,
// Markdown wird gerendert (sicher escaped), Skalenfragen zeigen den Slider.

import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";

const tick = () => new Promise(r => setTimeout(r, 0));
const ruhe = async (n = 6) => { for (let i = 0; i < n; i++) await tick(); };

/** LLM, dessen Antworten von außen aufgelöst werden (steuerbar langsam). */
function steuerbaresLlm() {
  const offen = [];
  const fn = async () => new Promise(res => offen.push(res));
  fn.antworte = text => { const r = offen.shift(); if (r) r({ text, stop: "end_turn" }); };
  return fn;
}

function backendMit(llm) {
  return {
    async info() { return { role: "A", name: "Anna", partner: "Bernd", nameA: "Anna", nameB: "Bernd" }; },
    bstate: { get: async () => null, set: async () => true },
    pstate: { get: async () => null, set: async () => true },
    chat: { load: async () => null, save: async () => true },
    uebergabe: { post: async () => {}, get: async () => null },
    llm,
  };
}

let root, llm, app;
beforeEach(async () => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app");
  llm = steuerbaresLlm();
  app = createApp({ doc: document, backend: backendMit(llm), root });
  await app.boot();
  const start = app.startChat("solo");          // Initialnachricht läuft an …
  await ruhe();
  llm.antworte("Willkommen. Erzähl gern, was dich beschäftigt.");
  await start; await ruhe();
});

const sichtbar = () => [...root.querySelectorAll(".pb-msg")].map(d => d.textContent);
const tippt = () => !!root.querySelector(".pb-typing");

describe("Chat-UX · Sofort-Anzeige & Ladezustand", () => {
  it("eigener Text erscheint SOFORT, Indikator läuft, Antwort ersetzt ihn", async () => {
    root.querySelector("#pbInput").value = "Mich beschäftigt unser Wochenende.";
    root.querySelector("#btnSend").click();
    await tick();                                              // noch KEINE Modell-Antwort
    expect(sichtbar().join(" ")).toContain("Mich beschäftigt unser Wochenende.");
    expect(tippt()).toBe(true);
    expect(root.querySelector("#btnSend").disabled).toBe(true);

    llm.antworte("Magst du mehr erzählen?");
    await ruhe();
    expect(tippt()).toBe(false);
    expect(root.querySelector("#btnSend").disabled).toBe(false);
    expect(sichtbar().join(" ")).toContain("Magst du mehr erzählen?");
  });

  it("Enter sendet; Shift+Enter sendet nicht", async () => {
    const inp = root.querySelector("#pbInput");
    inp.value = "Zeile eins";
    inp.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", shiftKey: true, bubbles: true, cancelable: true }));
    await tick();
    expect(tippt()).toBe(false);                               // nichts gesendet
    inp.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await tick();
    expect(tippt()).toBe(true);
    expect(sichtbar().join(" ")).toContain("Zeile eins");
    llm.antworte("Okay."); await ruhe();
  });
});

describe("Chat-UX · Markdown", () => {
  it("**fett** wird gerendert statt Sternchen zu zeigen; HTML bleibt escaped", async () => {
    root.querySelector("#pbInput").value = "weiter";
    root.querySelector("#btnSend").click(); await tick();
    llm.antworte("Eine Frage vorab: **Wie sicher fühlst du dich bei Bernd** – und zwar *ehrlich*. <script>alert(1)</script>");
    await ruhe();
    const ai = [...root.querySelectorAll(".pb-msg.ai")].pop();
    expect(ai.innerHTML).toContain("<strong>Wie sicher fühlst du dich bei Bernd</strong>");
    expect(ai.innerHTML).toContain("<em>ehrlich</em>");
    expect(ai.textContent).not.toContain("**");
    expect(ai.innerHTML).not.toContain("<script>");            // escaped, nicht ausgeführt
    expect(ai.textContent).toContain("<script>alert(1)</script>");
  });

  it("eigene Nachrichten bleiben reiner Text (kein Markdown-Parsing der User-Seite)", async () => {
    root.querySelector("#pbInput").value = "Ich meine **wirklich** dich";
    root.querySelector("#btnSend").click(); await tick();
    const me = [...root.querySelectorAll(".pb-msg.me")].pop();
    expect(me.textContent).toContain("**wirklich**");
    llm.antworte("Verstanden."); await ruhe();
  });
});

describe("Chat-UX · Skalenfragen", () => {
  it("Skala-Frage blendet den Slider ein; Senden schickt die Zahl; normale Antwort blendet aus", async () => {
    root.querySelector("#pbInput").value = "bereit";
    root.querySelector("#btnSend").click(); await tick();
    llm.antworte("Wie sicher fühlst du dich bei Bernd – auf einer Skala von 1 bis 10?");
    await ruhe();
    expect(root.querySelector("#pbSkala").classList.contains("offen")).toBe(true);

    root.querySelector("#pbSkalaRange").value = "9";
    root.querySelector("#pbSkalaRange").dispatchEvent(new Event("input", { bubbles: true }));
    expect(root.querySelector("#pbSkalaWert").textContent).toBe("9");
    root.querySelector("#pbSkalaSend").click();
    await tick();
    expect(sichtbar().join(" ")).toMatch(/\b9\b/);             // Zahl sofort als eigene Nachricht
    expect(root.querySelector("#pbSkala").classList.contains("offen")).toBe(false);   // während des Wartens zu

    llm.antworte("Danke. Magst du sagen, was dir diesen Wert gibt?");
    await ruhe();
    expect(root.querySelector("#pbSkala").classList.contains("offen")).toBe(false);   // keine Skala-Frage mehr
  });
});

describe("Nutzerführung · Begrüßung, Raum-Erklärungen, System eröffnet (Sprint 26)", () => {
  it("Hauptübersicht begrüßt mit Namen und erklärt beide Räume; Mein-Raum-Intro nennt die Vertraulichkeit", async () => {
    expect(root.querySelector("#startHallo").textContent).toContain("Anna");
    expect(root.querySelector("#startIntro").textContent).toContain("ausdrücklich freigibst");
    expect(root.querySelector("#startMeinSub").textContent).toContain("Bernd");     // Partner namentlich
    expect(root.querySelector("#startTeilSub").textContent).toContain("euch beide");
    expect(root.querySelector("#meinIntro").textContent).toContain("nur für dich");
    expect(root.querySelector("#sharedIntro").textContent).toContain("freigegeben");
  });

  it("Session-Start: KEINE fingierte User-Nachricht sichtbar — die Begleitung eröffnet von sich aus", async () => {
    // beforeEach hat bereits gestartet und die Begleitung geantwortet:
    expect(root.querySelectorAll(".pb-msg.me")).toHaveLength(0);                    // nichts, was Anna nie sagte
    expect(sichtbar().join(" ")).toContain("Willkommen");                          // Eröffnung der Begleitung
    // Der Steuerungs-Text existiert im Verlauf, aber versteckt:
    const msgs = app._state.engine.chat.messages;
    expect(msgs[0].hidden).toBe(true);
    expect(msgs[0].content).toContain("Eröffne");
  });
});
