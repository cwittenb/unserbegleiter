// Ebene 1.5 — Aufdeck-Wächter-Korrekturrunde (S72, E2) durch die ECHTE Engine:
// Ein Stapel-Leck ohne Marke löst genau EINE SYSTEM-REVISION aus; die
// Wiederholung mit Marke läuft normal weiter. Bleibt das Leck, wird die
// Antwort angenommen (Vertrag 2 — kein Endlos-Kreisen; Prompt bleibt die
// erste Verteidigung). Def-Aufbau wie gemeinsamDef (validiereAntwort-Hook).

import { describe, it, expect } from "vitest";
import { Engine } from "../../core/engine/engine.js";
import { MockLLM } from "../../core/engine/mock-llm.js";
import { pruefeAufdeckAntwort, AUFDECK_REVISION } from "../../core/engine/aufdeck-waechter.js";

const ERSTE = `HANDOVER-BLOCK – Anna
S1: Ich wünsche mir mehr gemeinsame Unternehmungen.
G1: Bernd wünscht sich vermutlich mehr Ruhe.
END HANDOVER-BLOCK

HANDOVER-BLOCK – Bernd
S1: Ich vermisse gemeinsame Erlebnisse.
G1: Anna wünscht sich vermutlich mehr Gespräche.
END HANDOVER-BLOCK

AUFDECKUNG STEHT AUS — beginne mit dem AUFTAKT. REVEAL-CONTEXT:
REVEAL-CONTEXT (app-intern; nicht als Block zitieren)
Anna – Top 5 (eigener Stapel): 1. Gemeinsame Unternehmungen · 2. Verlässlichkeit
Anna – Tipp (vermutete Top 3 des Partners): 1. Ruhe · 2. Anerkennung
Bernd – Top 5 (eigener Stapel): 1. Gemeinsame Erlebnisse · 2. Nähe
Bernd – Tipp (vermutete Top 3 des Partners): 1. Gespräche · 2. Leichtigkeit
END REVEAL-CONTEXT

Anna: Wir sind beide da und möchten mit der Auflösung beginnen.`;

const LECK = "Ich beginne mit dem, was Bernd mitgebracht hat: Du vermisst gemeinsame Erlebnisse. Anna, deine Vermutung war: Bernd wünscht sich mehr Ruhe.";

function gemeinsamArtigeDef(aufgedeckt) {
  return {
    sysPrompt: () => "GEMEINSAM-SYSTEMPROMPT",
    markerOrder: ["[[REVEAL-A]]", "[[REVEAL-B]]"],
    markers: {
      "[[REVEAL-A]]": () => aufgedeckt.push("A"),
      "[[REVEAL-B]]": () => aufgedeckt.push("B"),
    },
    canAct: c => c.status === "running",
    blocks: [],
    validiereAntwort: (text, eng) => pruefeAufdeckAntwort(text, {
      messages: eng.chat.messages, nameA: eng.ctx && eng.ctx.nameA, nameB: eng.ctx && eng.ctx.nameB,
    }),
  };
}

const neuerChat = () => ({ messages: [], status: "running" });

describe("Engine · Aufdeck-Wächter, Vertrag 2", () => {
  it("Leck ohne Marke → genau EINE versteckte SYSTEM-REVISION → Wiederholung mit Marke wird ausgeführt", async () => {
    const aufgedeckt = [];
    const mock = new MockLLM([
      LECK,                                                        // 1. Antwort: das sonnet-5-Leck
      "Dann schauen wir zuerst auf Bernds Stapel.\n[[REVEAL-B]]",  // 2. Antwort: korrekt
    ]);
    const e = new Engine({ def: gemeinsamArtigeDef(aufgedeckt), ctx: { nameA: "Anna", nameB: "Bernd" }, chat: neuerChat(), llm: mock.fn() });
    await e.sendUser(ERSTE);
    expect(mock.calls).toHaveLength(2);
    const revisionen = e.chat.messages.filter(m => m.hidden && m.content === AUFDECK_REVISION);
    expect(revisionen).toHaveLength(1);
    expect(aufgedeckt).toEqual(["B"]);                             // Marke der Wiederholung feuerte
    expect(e.chat.textFix).toBe(false);
    // S73 · hidden-Fix: die beanstandete Antwort verschwindet aus der Anzeige;
    // sichtbar bleibt nur die korrigierte Fassung.
    const sichtbare = e.chat.messages.filter(m => m.role === "assistant" && !m.hidden);
    expect(sichtbare).toHaveLength(1);
    expect(sichtbare[0].content).toContain("[[REVEAL-B]]");
    const beanstandete = e.chat.messages.find(m => m.role === "assistant" && m.hidden);
    expect(beanstandete && beanstandete.content).toContain("mitgebracht");
  });

  it("Leck bleibt in der Wiederholung → Antwort wird angenommen, KEINE dritte Runde", async () => {
    const aufgedeckt = [];
    const mock = new MockLLM([LECK, LECK]);
    const e = new Engine({ def: gemeinsamArtigeDef(aufgedeckt), ctx: { nameA: "Anna", nameB: "Bernd" }, chat: neuerChat(), llm: mock.fn() });
    await e.sendUser(ERSTE);
    expect(mock.calls).toHaveLength(2);                            // exakt zwei — Vertrag 2
    expect(e.chat.textFix).toBe(false);
    expect(aufgedeckt).toEqual([]);
  });

  it("saubere AUFTAKT-Antwort (Rahmen + Okay-Frage) läuft OHNE Revision durch", async () => {
    const mock = new MockLLM(["Willkommen zu eurer gemeinsamen Auflösung — ein spielerisches Aufdecken, kein Test. Seid ihr beide bereit?"]);
    const e = new Engine({ def: gemeinsamArtigeDef([]), ctx: { nameA: "Anna", nameB: "Bernd" }, chat: neuerChat(), llm: mock.fn() });
    await e.sendUser(ERSTE);
    expect(mock.calls).toHaveLength(1);
    expect(e.chat.messages.some(m => m.hidden)).toBe(false);
  });

  it("S73 · kollabierter Pfad (ohne AUFDECKUNG STEHT AUS): Phase-1-Arbeit mit Inhalten läuft OHNE Revision", async () => {
    const ohneKopf = ERSTE.replace(/AUFDECKUNG STEHT AUS[\s\S]*END REVEAL-CONTEXT\n\n/, "");
    const mock = new MockLLM(["Anna hat vermutet: Bernd wünscht sich vermutlich mehr Ruhe. Bernd, wie trifft das für dich zu?"]);
    const e = new Engine({ def: gemeinsamArtigeDef([]), ctx: { nameA: "Anna", nameB: "Bernd" }, chat: neuerChat(), llm: mock.fn() });
    await e.sendUser(ohneKopf);
    expect(mock.calls).toHaveLength(1);                            // keine Revision, keine Doppel-Calls
    expect(e.chat.messages.some(m => m.hidden)).toBe(false);
  });

  it("nach gezeigter Tafel darf über Inhalte gesprochen werden — Wächter still", async () => {
    const mock = new MockLLM(["Mir fällt auf, wie nah »gemeinsame Unternehmungen« und »gemeinsame Erlebnisse« beieinander liegen."]);
    const e = new Engine({ def: gemeinsamArtigeDef([]), ctx: { nameA: "Anna", nameB: "Bernd" }, chat: neuerChat(), llm: mock.fn() });
    e.chat.messages.push({ role: "user", content: ERSTE }, { role: "assistant", content: "Dann zuerst Bernds Stapel.\n[[REVEAL-B]]" });
    await e.sendUser("REVEAL-SHOWN: Die App hat beiden die Richtung Bernd gezeigt. Stelle zuerst die offene Frage.");
    expect(mock.calls).toHaveLength(1);
    expect(e.chat.messages.filter(m => m.hidden)).toHaveLength(0);
  });
});
