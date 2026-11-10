// @vitest-environment happy-dom
// CR-2 · Sendeweg bei Störung (Code-Review 10.11.2026: C2, C9, C14, C15).
//
// Die Zusage dieses Sprints in einem Satz: Was die Person geschrieben hat, ist
// nach einer Störung entweder gespeichert oder steht wieder im Feld — und jede
// Störung sagt in ihrer Sprache, was jetzt zu tun ist.

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createApp } from "../../core/ui/app.js";
import { Engine } from "../../core/engine/engine.js";
import { de } from "../../core/i18n/de.js";
import { en } from "../../core/i18n/en.js";
import { setLocale, fehlerText, fehlerKlasse, istWiederholbar } from "../../core/i18n/index.js";
import { mitNeuanmeldung, fetchMitNeuanmeldung, macheNeuanmelder } from "../../platforms/cloudflare/pages/remote-backend.js";

const tick = () => new Promise(r => setTimeout(r, 0));
const ruhe = async (n = 8) => { for (let i = 0; i < n; i++) await tick(); };
const f401 = () => Object.assign(new Error("Keine gültige Sitzung."), { status: 401, code: "no_session" });

describe("CR-2.1 · stille Neuanmeldung (Mantel)", () => {
  it("401 → einmal /api/session → dieselbe Anfrage noch einmal, Ergebnis kommt an", async () => {
    const rufe = []; let abgelaufen = true;
    const roh = async (m, p, b) => {
      rufe.push(m + " " + p);
      if (p === "/api/session") { abgelaufen = false; return { ok: true }; }
      if (abgelaufen) throw f401();
      return { ok: true, echo: b };
    };
    const api = mitNeuanmeldung(roh);
    expect(await api("PUT", "/api/chat/mine/einzel", { value: 1 })).toEqual({ ok: true, echo: { value: 1 } });
    expect(rufe).toEqual(["PUT /api/chat/mine/einzel", "POST /api/session", "PUT /api/chat/mine/einzel"]);
  });

  it("gleichzeitige 401 teilen sich EINE Anmeldung", async () => {
    let anmeldungen = 0, abgelaufen = true;
    const roh = async (m, p) => {
      if (p === "/api/session") { anmeldungen++; await tick(); abgelaufen = false; return {}; }
      if (abgelaufen) throw f401();
      return { pfad: p };
    };
    const api = mitNeuanmeldung(roh);
    const r = await Promise.all(["a", "b", "c", "d"].map(x => api("GET", "/api/bstate/" + x)));
    expect(r.map(x => x.pfad)).toEqual(["/api/bstate/a", "/api/bstate/b", "/api/bstate/c", "/api/bstate/d"]);
    expect(anmeldungen).toBe(1);
  });

  it("Credential fort (auch /api/session 401) → Code sitzung, kein dritter Versuch", async () => {
    const rufe = [];
    const api = mitNeuanmeldung(async (m, p) => { rufe.push(p); throw f401(); });
    await expect(api("GET", "/api/me")).rejects.toMatchObject({ status: 401, code: "sitzung" });
    expect(rufe).toEqual(["/api/me", "/api/session"]);
  });

  it("Netz weg während der Anmeldung ist KEIN verlorener Zugang (Fehler bleibt Netzfehler)", async () => {
    const api = mitNeuanmeldung(async (m, p) => { if (p === "/api/session") throw new TypeError("Failed to fetch"); throw f401(); });
    const e = await api("GET", "/api/me").catch(x => x);
    expect(e.code).toBeUndefined();
    expect(fehlerKlasse(e)).toBe("netz");
  });

  it("Zugangs-Routen sind ausgenommen (dort IST 401 die Antwort); andere Fehler laufen durch", async () => {
    const rufe = [];
    const api = mitNeuanmeldung(async (m, p) => { rufe.push(p); throw p === "/api/x" ? Object.assign(new Error("nein"), { status: 403 }) : f401(); });
    for (const p of ["/api/session", "/api/enroll", "/api/recover", "/api/email/confirm"])
      await expect(api("POST", p)).rejects.toMatchObject({ status: 401, code: "no_session" });
    await expect(api("GET", "/api/x")).rejects.toMatchObject({ status: 403 });
    expect(rufe.filter(p => p === "/api/session")).toHaveLength(1);   // nur der direkte Aufruf
  });

  it("LLM-Proxy: 401 → anmelden → derselbe Körper noch einmal", async () => {
    let n = 0; const koerper = [];
    const fetchFn = async (url, init) => { koerper.push(init.body); return { status: ++n === 1 ? 401 : 200 }; };
    const melde = vi.fn(async () => {});
    const f = fetchMitNeuanmeldung(fetchFn, macheNeuanmelder(melde));
    expect((await f("/api/llm", { method: "POST", body: '{"a":1}' })).status).toBe(200);
    expect(melde).toHaveBeenCalledTimes(1);
    expect(koerper).toEqual(['{"a":1}', '{"a":1}']);
    // Anmeldung scheitert → die 401-Antwort geht unverändert zurück (der Adapter macht "sitzung" daraus).
    n = 0;
    const g = fetchMitNeuanmeldung(fetchFn, async () => { throw f401(); });
    expect((await g("/api/llm", { method: "POST", body: "{}" })).status).toBe(401);
  });
});

describe("CR-2.2/2.3 · Engine", () => {
  const def = { sysPrompt: () => "S", markers: {}, markerOrder: [], canAct: () => true };
  it("Speichern der eigenen Nachricht scheitert → Nachricht zurückgenommen, Fehler trägt nichtGesendet, kein LLM-Aufruf", async () => {
    const llm = vi.fn(async () => ({ text: "x" }));
    const chat = { messages: [{ role: "assistant", content: "Hallo." }], status: "running" };
    const e = new Engine({ def, chat, llm, ctx: {}, hooks: { onSave: async () => { throw new TypeError("Failed to fetch"); } } });
    const fehler = await e.sendUser("Das war lang und wichtig.").catch(x => x);
    expect(fehler.nichtGesendet).toBe(true);
    expect(chat.messages).toHaveLength(1);
    expect(llm).not.toHaveBeenCalled();
    expect(e.busy).toBe(false);
  });

  it("leere Antwort → llm_leer, NICHTS wird gespeichert, der Zug bleibt offen und wiederholbar", async () => {
    const antworten = ["", "   ", "Jetzt bin ich da."];
    const gespeichert = [];
    const chat = { messages: [], status: "running" };
    const e = new Engine({ def, chat, llm: async () => ({ text: antworten.shift() }), ctx: {},
      hooks: { onSave: async c => { gespeichert.push(c.messages.map(m => m.content)); } } });
    await expect(e.sendUser("Hallo")).rejects.toMatchObject({ code: "llm_leer" });
    expect(chat.messages.map(m => m.role)).toEqual(["user"]);
    await expect(e.resume()).rejects.toMatchObject({ code: "llm_leer" });
    await e.resume();
    expect(chat.messages.map(m => m.content)).toEqual(["Hallo", "Jetzt bin ich da."]);
    expect(gespeichert.flat().every(c => c.trim())).toBe(true);
  });
});

describe("CR-2.4 · Fehlerklassen und Texte", () => {
  beforeEach(() => setLocale("de"));
  const FAELLE = [
    [new TypeError("Failed to fetch"), "netz"],
    [new TypeError("Load failed"), "netz"],
    [new TypeError("NetworkError when attempting to fetch resource."), "netz"],
    [new SyntaxError("Unexpected token '<', \"<!DOCTYPE \"... is not valid JSON"), "server"],
    [Object.assign(new Error("Fehler 502"), { status: 502 }), "server"],
    [Object.assign(new Error("Keine gültige Sitzung."), { status: 401 }), "sitzung"],
  ];
  for (const [e, klasse] of FAELLE)
    it(klasse + " ← " + e.message.slice(0, 40), () => {
      expect(fehlerKlasse(e)).toBe(klasse);
      expect(fehlerText(e)).toBe(de["fehler.code." + klasse]);
      expect(fehlerText(e)).not.toMatch(/fetch|token|JSON|502|DOCTYPE/i);
    });

  it("Fehler mit eigener Meldung vom Server bleiben, was sie sind", () => {
    const e = Object.assign(new Error("Verlauf braucht messages."), { status: 400, code: "verlauf_invalid" });
    expect(fehlerKlasse(e)).toBeNull();
    expect(fehlerText(e)).toBe("Verlauf braucht messages.");
    expect(fehlerKlasse(new TypeError("x is not a function"))).toBeNull();   // Programmfehler ≠ Netz
  });

  it("ein Code am Fehler gewinnt gegen die Klasse (Kontingent bleibt Kontingent)", () => {
    const e = Object.assign(new Error("…"), { status: 429, code: "quota_rate" });
    expect(fehlerText(e)).toBe(de["fehler.code.quota_rate"]);
    expect(istWiederholbar(e)).toBe(false);
  });

  it("wiederholbar: Netz, Server, Stille, Abriss, leer, Auslastung — nicht: Sitzung, Kontingent, 4xx", () => {
    for (const c of ["netz", "server", "llm_stille", "llm_abbruch", "llm_leer", "llm_overloaded"])
      expect(istWiederholbar({ code: c }), c).toBe(true);
    expect(istWiederholbar(new TypeError("Failed to fetch"))).toBe(true);
    expect(istWiederholbar({ status: 529 })).toBe(true);
    for (const c of ["sitzung", "quota_limit", "quota_duplikat", "mess_invalid"])
      expect(istWiederholbar({ code: c }), c).toBe(false);
    expect(istWiederholbar({ status: 401 })).toBe(false);
  });

  it("Wörterbuch: alle Klassen in beiden Sprachen, jede nennt eine Handlung, die Stille nennt keine Sekunden", () => {
    for (const c of ["netz", "server", "sitzung", "llm_stille", "llm_abbruch", "llm_leer"])
      for (const w of [de, en]) {
        const text = w["fehler.code." + c];
        expect(text, c).toBeTruthy();
        expect(text, c).toMatch(/bitte|please/i);
        expect(text, c).not.toMatch(/\d+\s*s\b/);
      }
    setLocale("en");
    expect(fehlerText({ code: "llm_stille", message: "Die Verbindung ist still geworden (60s ohne Daten)." })).toBe(en["fehler.code.llm_stille"]);
  });
});

describe("CR-2 · im Gespräch (happy-dom)", () => {
  let root, llm, speichern, app;
  function steuerbaresLlm() {
    const offen = [];
    const fn = async () => new Promise((res, rej) => offen.push({ res, rej }));
    fn.antworte = text => { const o = offen.shift(); if (o) o.res({ text, stop: "end_turn" }); };
    fn.lehneAb = e => { const o = offen.shift(); if (o) o.rej(e); };
    fn.offen = () => offen.length;
    return fn;
  }
  beforeEach(async () => {
    setLocale("de");
    document.body.innerHTML = '<div id="app"></div>';
    root = document.getElementById("app");
    llm = steuerbaresLlm();
    speichern = { wirft: null, zahl: 0, letzter: null };
    app = createApp({ doc: document, root, backend: {
      async info() { return { role: "A", name: "Anna", partner: "Bernd", nameA: "Anna", nameB: "Bernd" }; },
      bstate: { get: async () => null, set: async () => true },
      pstate: { get: async () => null, set: async () => true },
      chat: { load: async () => null, save: async (a, i, c) => {
        if (speichern.wirft) throw speichern.wirft;
        speichern.zahl++; speichern.letzter = JSON.parse(JSON.stringify(c)); return true; } },
      handover: { post: async () => {}, get: async () => null },
      llm,
    } });
    await app.boot();
    const start = app.startChat("solo");
    await ruhe();
    llm.antworte("Willkommen. Erzähl gern, was dich beschäftigt.");
    await start; await ruhe();
  });
  const feld = () => root.querySelector("#pbInput");
  const sende = async text => { feld().value = text; root.querySelector("#btnSend").click(); await ruhe(); };
  const blasen = () => [...root.querySelectorAll("#pbMsgs .pb-msg, #pbMsgs [data-rolle]")].map(x => x.textContent);
  const knopf = () => root.querySelector("#btnErneutSenden");
  const fehlerBox = () => root.querySelector("#pbErr");

  it("Speichern scheitert (Netz) → Text steht wieder im Feld, keine Geisternachricht, kein »Erneut senden«, Meldung aus dem Wörterbuch", async () => {
    speichern.wirft = new TypeError("Failed to fetch");
    await sende("Ich habe lange an diesem Satz geschrieben.");
    expect(feld().value).toBe("Ich habe lange an diesem Satz geschrieben.");
    expect(app._state.engine.chat.messages.some(m => m.content.includes("lange an diesem Satz"))).toBe(false);
    expect(root.querySelector("#pbMsgs").textContent).not.toContain("lange an diesem Satz");
    expect(fehlerBox().textContent).toContain(de["fehler.code.netz"]);
    expect(knopf()).toBeNull();
    expect(llm.offen()).toBe(0);
    expect(root.querySelector("#btnSend").disabled).toBe(false);
    // Netz wieder da: derselbe Text geht mit dem Sende-Knopf hinaus.
    speichern.wirft = null;
    root.querySelector("#btnSend").click(); await ruhe();
    llm.antworte("Ich höre dich."); await ruhe();
    expect(feld().value).toBe("");
    expect(speichern.letzter.messages.map(m => m.content)).toContain("Ich habe lange an diesem Satz geschrieben.");
  });

  for (const [name, fehler, schluessel] of [
    ["Netz weg beim Antworten", new TypeError("Failed to fetch"), "netz"],
    ["HTML-Fehlerseite", new SyntaxError("Unexpected token '<', \"<!DOCTYPE \"... is not valid JSON"), "server"],
    ["Stille", Object.assign(new Error("Die Verbindung ist still geworden (60s ohne Daten)."), { code: "llm_stille" }), "llm_stille"],
    ["abgerissene Antwort", Object.assign(new Error("abgerissen"), { code: "llm_abbruch" }), "llm_abbruch"],
  ])
    it(name + " → Wörterbuchtext und »Erneut senden«; der Knopf holt die Antwort, die Nachricht steht einmal im Verlauf", async () => {
      await sende("Wie geht es weiter?");
      llm.lehneAb(fehler); await ruhe();
      expect(fehlerBox().textContent).toContain(de["fehler.code." + schluessel]);
      expect(fehlerBox().textContent).not.toMatch(/fetch|DOCTYPE|60s/);
      expect(knopf(), "Erneut senden fehlt").toBeTruthy();
      expect(feld().value).toBe("");                       // gespeichert → nicht zurückgelegt
      knopf().click(); await ruhe();
      llm.antworte("Schritt für Schritt."); await ruhe();
      const inhalte = app._state.engine.chat.messages.map(m => m.content);
      expect(inhalte.filter(c => c === "Wie geht es weiter?")).toHaveLength(1);
      expect(inhalte[inhalte.length - 1]).toBe("Schritt für Schritt.");
      expect(fehlerBox().classList.contains("pb-hidden")).toBe(true);
    });

  it("Sitzung endgültig fort → Meldung nennt das Neuladen, KEIN »Erneut senden«", async () => {
    await sende("Hallo?");
    llm.lehneAb(Object.assign(new Error("Sitzung abgelaufen"), { status: 401, code: "sitzung" })); await ruhe();
    expect(fehlerBox().textContent).toContain(de["fehler.code.sitzung"]);
    expect(knopf()).toBeNull();
  });

  it("Speichern der ANTWORT scheitert → »Erneut senden« speichert nach, ohne das Modell noch einmal zu fragen", async () => {
    await sende("Sag mir etwas Gutes.");
    speichern.wirft = new TypeError("Failed to fetch");
    llm.antworte("Du gibst dir Mühe — das sehe ich."); await ruhe();
    expect(knopf()).toBeTruthy();
    speichern.wirft = null;
    knopf().click(); await ruhe();
    expect(llm.offen(), "kein zweiter Modellaufruf").toBe(0);
    expect(speichern.letzter.messages.map(m => m.content)).toContain("Du gibst dir Mühe — das sehe ich.");
  });

  it("CR-2.6 · solange eine Antwort aussteht, leert der Sende-Knopf das Feld nicht", async () => {
    await sende("Erste Nachricht.");               // Antwort steht aus
    feld().value = "Zweite, noch während die Antwort läuft.";
    root.querySelector("#btnSend").disabled = false;   // der Fall "Knopf war (fälschlich) frei"
    root.querySelector("#btnSend").click(); await ruhe();
    expect(feld().value).toBe("Zweite, noch während die Antwort läuft.");
    llm.antworte("Da bin ich."); await ruhe();
    expect(app._state.engine.chat.messages.filter(m => m.role === "user" && !m.hidden).map(m => m.content)).not.toContain("Zweite, noch während die Antwort läuft.");
  });
});

describe("CR-2.6 · Wiedereinstieg mitten in einer Antwort", () => {
  it("resume() läuft im Wartezustand: Senden gesperrt, bis die nachgeholte Antwort da ist", async () => {
    setLocale("de");
    document.body.innerHTML = '<div id="app"></div>';
    const root = document.getElementById("app");
    const offen = [];
    const llm = async () => new Promise(res => offen.push(res));
    const gespeichert = { messages: [
      { role: "user", content: "KONTEXT", hidden: true },
      { role: "assistant", content: "Willkommen." },
      { role: "user", content: "Das hier war schon gesendet, als ich neu lud." },
    ], status: "running" };
    const app = createApp({ doc: document, root, backend: {
      async info() { return { role: "A", name: "Anna", partner: "Bernd", nameA: "Anna", nameB: "Bernd" }; },
      bstate: { get: async () => null, set: async () => true },
      pstate: { get: async () => null, set: async () => true },
      chat: { load: async (art, id) => (id === "solo" ? JSON.parse(JSON.stringify(gespeichert)) : null), save: async () => true },
      handover: { post: async () => {}, get: async () => null },
      llm,
    } });
    await app.boot();
    const start = app.startChat("solo");
    await ruhe();
    expect(offen.length, "der offene Zug wird beantwortet").toBe(1);
    expect(app._state.warten).toBe(true);
    expect(root.querySelector("#btnSend").disabled).toBe(true);
    offen.shift()({ text: "Da bin ich wieder.", stop: "end_turn" });
    await start; await ruhe();
    expect(app._state.warten).toBe(false);
    expect(root.querySelector("#btnSend").disabled).toBe(false);
  });
});
