// ST1.2/ST1.3 · Engine im Struktur-Modus: Dispatch aus Feldern, Vertrag 2,
// Wächter-Schatten, Persistenz-Meta, resume, Statistik — und die Garantie,
// dass der Textpfad ohne Flag unangetastet bleibt.

import { describe, it, expect, vi } from "vitest";
import { Engine } from "../../core/engine/engine.js";
import { BLOECKE } from "../../core/contracts/registry.js";

function bauDef(extra = {}) {
  return {
    sysPrompt: () => "SYS",
    markerOrder: ["[[PING]]"],
    markers: { "[[PING]]": vi.fn() },
    blocks: [{ ...BLOECKE.note, handle: vi.fn() }],
    canAct: c => c.status === "running",
    strukturTurn: true,
    ...extra,
  };
}
const chatNeu = () => ({ messages: [{ role: "user", content: "Hallo" }], status: "running" });
const antwortVon = (data, quelle = "tool") => async () => ({ text: "", data, stop: "tool_use", strukturQuelle: quelle });

describe("Engine · Struktur-Modus", () => {
  it("ruft den Adapter mit dem memoisierten Turn-Schema (Optionen-Objekt)", async () => {
    const def = bauDef();
    const llm = vi.fn(antwortVon({ antwort: "Hallo zurück.", marker: null, block: null }));
    const e = new Engine({ def, chat: chatNeu(), llm });
    await e.requestAssistant();
    const opts = llm.mock.calls[0][2];
    expect(opts && typeof opts).toBe("object");
    expect(opts.structured).toBe(e._turnSchema);
    expect(opts.structured.name).toBe("turn");
    expect(e.chat.messages.at(-1)).toMatchObject({ role: "assistant", content: "Hallo zurück.", strukturQuelle: "tool" });
    expect(e.chat.struktur.tool).toBe(1);
  });

  it("Marke aus dem Feld: nackter Name → Handler unter [[NAME]]", async () => {
    const def = bauDef();
    const e = new Engine({ def, chat: chatNeu(), llm: antwortVon({ antwort: "Gleich öffnet sich etwas.", marker: "PING", block: null }) });
    await e.requestAssistant();
    expect(def.markers["[[PING]]"]).toHaveBeenCalledTimes(1);
    expect(e.chat.messages.at(-1).marker).toBe("PING");
  });

  it("Block aus dem Feld: JS-Validator (semantische Wahrheit) → Handler", async () => {
    const def = bauDef();
    const e = new Engine({ def, chat: chatNeu(), llm: antwortVon({ antwort: "Ich merke mir das.", marker: null, block: { typ: "note", daten: { note: "Selbstvertrauen", origin: null } } }) });
    await e.requestAssistant();
    expect(def.blocks[0].handle).toHaveBeenCalledWith({ note: "Selbstvertrauen", origin: null }, e);
    expect(e.chat.blockFix).toBe(false);
  });

  it("Marke gewinnt vor Block (bestehende Semantik, jetzt explizit)", async () => {
    const def = bauDef();
    const e = new Engine({ def, chat: chatNeu(), llm: antwortVon({ antwort: "x", marker: "PING", block: { typ: "note", daten: { note: "n" } } }) });
    await e.requestAssistant();
    expect(def.markers["[[PING]]"]).toHaveBeenCalledTimes(1);
    expect(def.blocks[0].handle).not.toHaveBeenCalled();
  });

  it("Vertrag 2: semantischer Fehler → GENAU EINE feldbezogene Korrektur-Runde, dann Personen-Fehler", async () => {
    const def = bauDef();
    const kaputt = { antwort: "x", marker: null, block: { typ: "note", daten: { note: "" } } };
    const llm = vi.fn(antwortVon(kaputt));
    const fehler = [];
    const e = new Engine({ def, chat: chatNeu(), llm, hooks: { onPersonError: m => fehler.push(m) } });
    await e.requestAssistant();
    expect(llm).toHaveBeenCalledTimes(2);                      // Erstzug + eine Korrektur-Runde
    const korrektur = e.chat.messages.find(m => m.hidden && m.role === "user");
    expect(korrektur.content).toContain("SYSTEM-REVISION");
    expect(korrektur.content).toContain('typ "note"');
    expect(korrektur.content).toContain("turn tool");
    expect(fehler.length).toBe(1);                             // KEIN dritter Versuch
    expect(def.blocks[0].handle).not.toHaveBeenCalled();
  });

  it("Wächter-Schatten: pruefeUebergabe sieht die synthetisierte Legacy-Form; Verweigerung stoppt Marke UND Block", async () => {
    let gesehen = null;
    const def = bauDef({ pruefeUebergabe: t => { gesehen = t; return "verworfen"; } });
    const e = new Engine({ def, chat: chatNeu(), llm: antwortVon({ antwort: "Magst du noch etwas sagen?", marker: "PING", block: { typ: "note", daten: { note: "n", origin: null } } }) });
    await e.requestAssistant();
    expect(gesehen).toContain("Magst du noch etwas sagen?");
    expect(gesehen).toContain("NOTE-BLOCK");                   // Block zwischen seinen Marken
    expect(gesehen.trim().split("\n").at(-1)).toBe("[[PING]]"); // Marke allein in der letzten Zeile
    expect(e.chat.letzteVerweigerung).toBe("verworfen");
    expect(def.markers["[[PING]]"]).not.toHaveBeenCalled();
    expect(def.blocks[0].handle).not.toHaveBeenCalled();
  });

  it("resume: Struktur-Meta an der letzten Assistant-Nachricht wird aus Feldern dispatcht", async () => {
    const def = bauDef();
    const chat = chatNeu();
    chat.messages.push({ role: "assistant", content: "…", block: { typ: "note", daten: { note: "n", origin: null } }, strukturQuelle: "tool" });
    const e = new Engine({ def, chat, llm: vi.fn() });
    await e.resume();
    expect(def.blocks[0].handle).toHaveBeenCalledTimes(1);
  });

  it("Statistik: Rettung zählt gerettet, Adapter-Wurf zählt fehlgeschlagen und wirft weiter", async () => {
    const def = bauDef();
    const e1 = new Engine({ def, chat: chatNeu(), llm: antwortVon({ antwort: "x", marker: null, block: null }, "text") });
    await e1.requestAssistant();
    expect(e1.chat.struktur).toMatchObject({ tool: 0, gerettet: 1 });

    const e2 = new Engine({ def, chat: chatNeu(), llm: async () => { throw new Error("kaputt"); } });
    await expect(e2.requestAssistant()).rejects.toThrow("kaputt");
    expect(e2.chat.struktur.fehlgeschlagen).toBe(1);
  });

  it("struktur_korrektur über onStatus wird gezählt UND an die UI weitergereicht", async () => {
    const def = bauDef();
    const stati = [];
    const llm = async (sys, msgs, opts) => { opts.onStatus("struktur_korrektur"); return { text: "", data: { antwort: "x", marker: null, block: null }, strukturQuelle: "text" }; };
    const e = new Engine({ def, chat: chatNeu(), llm, hooks: { onStatus: s => stati.push(s) } });
    await e.requestAssistant();
    expect(e.chat.struktur.korrigiert).toBe(1);
    expect(stati).toContain("struktur_korrektur");
  });

  it("ohne Flag: Textpfad byte-identisch — Adapter wird POSITIONAL gerufen, kein Optionen-Objekt", async () => {
    const def = bauDef({ strukturTurn: false });
    const llm = vi.fn(async () => ({ text: "Nur Text.", stop: "end_turn" }));
    const e = new Engine({ def, chat: chatNeu(), llm });
    await e.requestAssistant();
    const drittes = llm.mock.calls[0][2];
    expect(drittes === undefined || typeof drittes === "function").toBe(true);
    expect(e.chat.struktur).toBeUndefined();
    expect(e.chat.messages.at(-1)).toEqual({ role: "assistant", content: "Nur Text." });
  });
});
