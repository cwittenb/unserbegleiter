// S137 · Temperatur — die einzige Stellschraube, die dem Prompt nichts wegnimmt.
//
// ANLASS: `mistral-medium-latest` antwortete in SYC-05 dreimal fast wortgleich
// („Ich empfinde das gerade als einen sehr klaren Moment – stimmt das für
// dich?"). Das ist Varianz, keine Regelfrage.
//
// S135 hat gezeigt, was der andere Weg kostet: Eine zusätzliche Prompt-Regel
// verdrängte bestehende — `medium` ließ die Rücklenkung weg, Sonnet die
// Ich-Rahmung. **Der Prompt hat ein Budget, die Temperatur nicht.**
//
// BEWUSST OHNE VORGABE: `temperature: undefined` heißt, das Feld wird nicht
// mitgesendet — es gilt die Vorgabe des Anbieters (Mistral 0.7, Anthropic 1.0),
// also genau das, was heute in Produktion läuft. Eine Vorgabe zu setzen wäre
// ein stiller Verhaltenswechsel für alle Aufrufer.

import { describe, it, expect } from "vitest";
import { LLM_DEFAULTS, makeAdapter } from "../../core/llm/adapter.js";

/** Fängt den Anfragekörper ab, statt ihn zu senden. */
function koerperVon(cfg, messages = [{ role: "user", content: "hallo" }]) {
  let gesehen = null;
  const fetchMock = async (url, opt) => {
    gesehen = JSON.parse(opt.body);
    return {
      ok: true, status: 200, headers: { get: () => "application/json" },
      json: async () => ({ content: [{ type: "text", text: "ok" }], stop_reason: "end_turn",
        choices: [{ message: { content: "ok" }, finish_reason: "stop" }] }),
    };
  };
  // makeAdapter nimmt den fetch als ZWEITEN Parameter, nicht als cfg-Feld.
  const adapter = makeAdapter({ ...cfg, stream: false }, fetchMock);
  return adapter("System", messages).then(() => gesehen);
}

const MISTRAL = { provider: "mistral", mode: "direct", apiKey: "k", models: { mistral: "m" } };
const ANTHROPIC = { provider: "anthropic", mode: "direct", apiKey: "k", models: { anthropic: "a" }, thinking: "disabled" };

describe("S137 · ohne Angabe ändert sich nichts", () => {
  it("die Vorgabe ist nicht gesetzt", () => {
    expect(LLM_DEFAULTS.temperature).toBeUndefined();
  });

  it("Mistral: kein temperature-Feld im Körper", async () => {
    const b = await koerperVon(MISTRAL);
    expect(b).not.toHaveProperty("temperature");
  });

  it("Anthropic: ebenso", async () => {
    const b = await koerperVon(ANTHROPIC);
    expect(b).not.toHaveProperty("temperature");
  });
});

describe("S137 · mit Angabe wird sie durchgereicht", () => {
  it("Mistral", async () => {
    const b = await koerperVon({ ...MISTRAL, temperature: 0.3 });
    expect(b.temperature).toBe(0.3);
  });

  it("Anthropic bei abgeschaltetem Denkmodus", async () => {
    const b = await koerperVon({ ...ANTHROPIC, temperature: 0.3 });
    expect(b.temperature).toBe(0.3);
  });

  it("auch 0 — das ist ein Wert, keine Abwesenheit", async () => {
    /* Der häufigste Fehler bei solchen Feldern: `if (cfg.temperature)` statt
       eines Typprüfers. Dann fiele ausgerechnet 0 durch — der Wert, mit dem
       man Varianz am stärksten drückt. */
    const b = await koerperVon({ ...MISTRAL, temperature: 0 });
    expect(b.temperature).toBe(0);
  });
});

describe("S137 · die Ausnahme, die der Anbieter erzwingt", () => {
  it("Anthropic mit adaptivem Denkmodus: KEINE Temperatur", async () => {
    /* Anthropic weist temperature zusammen mit aktivem Thinking ab — der
       Aufruf schlüge fehl. Der Judge läuft adaptiv; ohne diese Bedingung
       wäre jeder Lauf mit --temperatur kaputt, sobald jemand sie auch dem
       Judge gibt. */
    const b = await koerperVon({ ...ANTHROPIC, thinking: "adaptiv", temperature: 0.3 });
    expect(b).not.toHaveProperty("temperature");
  });
});
