// @vitest-environment happy-dom
// UX-2 · Ausgang aus dem Gespräch (Code-Review U4, U14).
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createApp } from "../../core/ui/app.js";
import { DESIGN_CSS } from "../../core/ui/design.js";
import { de } from "../../core/i18n/de.js";
import { en } from "../../core/i18n/en.js";
import { setLocale } from "../../core/i18n/index.js";

const tick = () => new Promise(r => setTimeout(r, 0));
const ruhe = async (n = 8) => { for (let i = 0; i < n; i++) await tick(); };

describe("UX-2 · im Gespräch", () => {
  let root, app, offen, gespeichert;
  beforeEach(async () => {
    setLocale("de");
    document.body.innerHTML = '<div id="app"></div>'; root = document.getElementById("app");
    offen = []; gespeichert = [];
    app = createApp({ doc: document, root, backend: {
      async info() { return { role: "A", name: "Anna", partner: "Bernd", nameA: "Anna", nameB: "Bernd" }; },
      bstate: { get: async () => null, set: async () => true }, pstate: { get: async () => null, set: async () => true },
      chat: { load: async () => null, save: async (a, i, c) => { gespeichert.push(JSON.parse(JSON.stringify(c))); return true; } },
      handover: { post: async () => {}, get: async () => null },
      llm: async () => new Promise((res, rej) => offen.push({ res, rej })),
    } });
    await app.boot();
    const start = app.startChat("solo"); await ruhe();
    offen.shift().res({ text: "Willkommen.", stop: "end_turn" }); await start; await ruhe();
  });
  const $id = id => root.querySelector("#" + id);

  it("»Pausieren« steht unter dem Feld, über »Session abschließen« — in beiden Sprachen benannt", () => {
    expect($id("btnChatPause").classList.contains("pb-hidden")).toBe(false);
    expect($id("btnChatPause").textContent).toContain(de["chat.pausieren"]);
    expect(en["chat.pausieren"]).toBeTruthy();
    const kinder = [...$id("btnChatPause").parentElement.children];
    expect(kinder.indexOf($id("btnChatPause"))).toBeLessThan(kinder.indexOf($id("btnChatEnde")));
    expect(kinder.indexOf($id("pbComposer"))).toBeLessThan(kinder.indexOf($id("btnChatPause")));
  });

  it("»Pausieren« verlässt den Raum wie der Pfeil: Gespräch bleibt »running«, Pausenstempel gesetzt, kein Abschluss", async () => {
    $id("btnChatPause").click(); await ruhe();
    expect(app._state.screen).not.toBe("scrChat");
    const letzter = gespeichert.at(-1);
    expect(letzter.status).toBe("running");
    expect(typeof letzter.pausedAt).toBe("number");
    expect(offen).toHaveLength(0);                       // kein Modellaufruf
  });

  it("steht die Rückfrage zum Abschluss, treten beide Knöpfe zurück", async () => {
    $id("btnChatEnde").click(); await ruhe();
    expect($id("chatEndeFrage").classList.contains("pb-hidden")).toBe(false);
    expect($id("btnChatPause").classList.contains("pb-hidden")).toBe(true);
    expect($id("btnChatEnde").classList.contains("pb-hidden")).toBe(true);
  });

  it("das Eingabefeld wächst mit dem Text — bis 40 % der Fensterhöhe", () => {
    const f = $id("pbInput");
    Object.defineProperty(f, "scrollHeight", { configurable: true, get: () => 180 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
    f.dispatchEvent(new Event("input", { bubbles: true }));
    expect(f.style.height).toBe("180px");
    Object.defineProperty(f, "scrollHeight", { configurable: true, get: () => 900 });
    f.dispatchEvent(new Event("input", { bubbles: true }));
    expect(f.style.height).toBe("320px");
  });

  it("Anmeldung endgültig fort → »Seite neu laden« an der Meldung, kein »Erneut senden«", async () => {
    $id("pbInput").value = "Hallo?"; $id("btnSend").click(); await ruhe();
    offen.shift().rej(Object.assign(new Error("Sitzung abgelaufen"), { status: 401, code: "sitzung" })); await ruhe();
    expect($id("btnNeuLaden")).toBeTruthy();
    expect($id("btnNeuLaden").textContent).toBe(de["chat.neuLaden"]);
    expect($id("btnErneutSenden")).toBeNull();
  });
});

describe("UX-2 · Zurück-Geste (Browser, Android-Hülle)", () => {
  let root, app, push;
  beforeEach(async () => {
    setLocale("de");
    document.body.innerHTML = '<div id="app"></div>'; root = document.getElementById("app");
    push = vi.spyOn(window.history, "pushState");
    app = createApp({ doc: document, root, backend: {
      async info() { return { role: "A", name: "Anna", partner: "Bernd", nameA: "Anna", nameB: "Bernd" }; },
      bstate: { get: async () => null, set: async () => true }, pstate: { get: async () => null, set: async () => true },
      chat: { load: async () => null, save: async () => true }, handover: { post: async () => {}, get: async () => null },
      llm: async () => ({ text: "Willkommen.", stop: "end_turn" }),
    } });
    await app.boot(); await ruhe();
    push.mockClear();
  });
  const $id = id => root.querySelector("#" + id);
  const geste = async () => { window.dispatchEvent(new PopStateEvent("popstate")); await ruhe(); };

  it("auf dem Start liegt kein Eintrag — die Geste verlässt die App wie bisher", async () => {
    expect(push).not.toHaveBeenCalled();
    await geste();
    expect(app._state.screen).toBe("scrStart");
  });

  it("Raum betreten legt EINEN Eintrag; die Geste führt zurück zum Start", async () => {
    $id("btnMyRoom").click(); await ruhe();
    expect(push).toHaveBeenCalledTimes(1);
    $id("btnMess") && $id("btnMess").click(); await ruhe();
    expect(push).toHaveBeenCalledTimes(1);               // kein Stapel
    await geste();                                        // Prozessreflexion → eigener Raum (neuer Eintrag)
    expect(app._state.screen).toBe("scrMyRoom");
    expect(push).toHaveBeenCalledTimes(2);
    await geste();
    expect(app._state.screen).toBe("scrStart");
    expect(push).toHaveBeenCalledTimes(2);                // am Start: kein neuer Eintrag
  });

  it("im Gespräch: die Geste pausiert und führt in den Raum zurück, aus dem man kam — nicht aus der App", async () => {
    $id("btnMyRoom").click(); await ruhe();
    await app.startChat("solo"); await ruhe();
    expect(app._state.screen).toBe("scrChat");
    await geste();
    expect(app._state.screen).toBe("scrMyRoom");
  });

  it("ein fremdes popstate (kein eigener Eintrag) bewegt nichts", async () => {
    await geste(); await geste();
    expect(app._state.screen).toBe("scrStart");
  });
});

describe("UX-2 · Stil", () => {
  it("der Kopf im Gespräch klebt und trägt seinen Grund", () => {
    const i = DESIGN_CSS.indexOf("#scrChat .rz-chat-oben>.rz-kopf{position:sticky;top:0;");
    expect(i).toBeGreaterThan(-1);
    expect(DESIGN_CSS.slice(i, DESIGN_CSS.indexOf("}", i))).toContain("background:var(--rz-papier)");
  });
  it("Feld ohne Ziehgriff; Abstand vor den Ausgangs-Zeilen; in der Auswahl sind sie weg", () => {
    expect(DESIGN_CSS).toContain("#scrChat .pb-composer textarea{resize:none}");
    expect(DESIGN_CSS).toContain("#scrChat #btnChatPause{font-size:var(--rz-fs-text);margin-top:16px}");
    expect(DESIGN_CSS).toContain("#scrChat.rz-auswahl #btnChatPause{display:none}");
  });
});
