// Ebene 1.5 — Aufdeck-Vorbeugung durch die ECHTE Engine (S105.3).
//
// BIS S105 stand hier eine Korrekturrunde: Ein Stapel-Leck ohne Marke löste
// eine SYSTEM-REVISION aus, die beanstandete Antwort verschwand aus der
// Anzeige (S72/S73), die Wiederholung ersetzte sie.
//
// Das half niemandem. Was gestreamt wurde, hatte die Person gelesen — das
// Verstecken räumte das Protokoll auf, nicht ihre Erinnerung. Und der Schaden
// traf hier nicht sie, sondern den PARTNER, dessen Werte vorzeitig sichtbar
// wurden; der war nicht im Raum, um zu widersprechen.
//
// STATTDESSEN wird jetzt vorgebeugt, und zwar aus dem ZUSTAND heraus: Solange
// die Tafel nicht gezeigt ist, bekommt das Modell für genau diesen Zug einen
// Zusatzsatz. Das ist kein Raten an Text — die App weiß sicher, ob aufgedeckt
// wurde. Das verbleibende Restrisiko ist ausdrücklich akzeptiert
// (Produktentscheidung, siehe docs/SPRINT-S105-PROTOKOLL.md).

import { describe, it, expect } from "vitest";
import { Engine } from "../../core/engine/engine.js";
import { MockLLM } from "../../core/engine/mock-llm.js";
import { aufdeckSchaerfung, AUFDECK_SCHAERFUNG } from "../../core/engine/aufdeck-waechter.js";

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

/** Def nach dem Muster von gemeinsamDef — Schärfung statt Validator. */
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
    schaerfe: (messages, ctx) => aufdeckSchaerfung(messages, ctx),
  };
}

const neuerChat = () => ({ messages: [], status: "running" });

/** Merkt sich die Systemtexte, mit denen das Modell gerufen wurde. */
function mitSystemMitschrift(antworten) {
  const mock = new MockLLM(antworten);
  const fn = mock.fn();
  const systeme = [];
  return {
    mock, systeme,
    llm: (system, msgs, onDelta, onStatus) => { systeme.push(system); return fn(system, msgs, onDelta, onStatus); },
  };
}

describe("Engine · Aufdeck-Vorbeugung (S105.3)", () => {
  it("vor der Tafel wird geschärft — und der Zusatz steht NUR im Systemtext", async () => {
    const { systeme, llm } = mitSystemMitschrift(["Willkommen. Seid ihr beide bereit?"]);
    const e = new Engine({ def: gemeinsamArtigeDef([]), ctx: { nameA: "Anna", nameB: "Bernd" }, chat: neuerChat(), llm });
    await e.sendUser(ERSTE);
    expect(systeme[0]).toContain(AUFDECK_SCHAERFUNG);
    // Der Zusatz ist kein Gesprächszug: Er taucht im Verlauf nirgends auf.
    expect(JSON.stringify(e.chat.messages)).not.toContain("APP-HINWEIS");
  });

  it("nach gezeigter Tafel wird NICHT mehr geschärft", async () => {
    const { systeme, llm } = mitSystemMitschrift(["Mir fällt auf, wie nah die beiden Wünsche liegen."]);
    const e = new Engine({ def: gemeinsamArtigeDef([]), ctx: { nameA: "Anna", nameB: "Bernd" }, chat: neuerChat(), llm });
    e.chat.messages.push(
      { role: "user", content: ERSTE },
      { role: "assistant", content: "Dann zuerst Bernds Stapel.\n[[REVEAL-B]]" });
    await e.sendUser("REVEAL-SHOWN: Die App hat beiden die Richtung Bernd gezeigt.");
    expect(systeme[0]).not.toContain("APP-HINWEIS");
  });

  it("außerhalb des Aufdeck-Pfads wird nie geschärft", async () => {
    const ohneKopf = ERSTE.replace(/AUFDECKUNG STEHT AUS[\s\S]*END REVEAL-CONTEXT\n\n/, "");
    const { systeme, llm } = mitSystemMitschrift(["Anna hat vermutet: Bernd wünscht sich mehr Ruhe. Bernd, trifft das zu?"]);
    const e = new Engine({ def: gemeinsamArtigeDef([]), ctx: { nameA: "Anna", nameB: "Bernd" }, chat: neuerChat(), llm });
    await e.sendUser(ohneKopf);
    expect(systeme[0]).not.toContain("APP-HINWEIS");
  });
});

describe("Engine · Ein Leck wird NICHT mehr zurückgenommen", () => {
  it("die Antwort bleibt sichtbar stehen — keine zweite Runde, kein hidden", async () => {
    const aufgedeckt = [];
    const mock = new MockLLM([LECK]);
    const e = new Engine({ def: gemeinsamArtigeDef(aufgedeckt), ctx: { nameA: "Anna", nameB: "Bernd" }, chat: neuerChat(), llm: mock.fn() });
    await e.sendUser(ERSTE);

    expect(mock.calls, "genau EINE Runde — es wird nichts neu geschrieben").toHaveLength(1);
    const sichtbare = e.chat.messages.filter(m => m.role === "assistant" && !m.hidden);
    expect(sichtbare).toHaveLength(1);
    expect(sichtbare[0].content).toContain("mitgebracht");
    // Nichts Verstecktes, nichts Nachgeschobenes.
    expect(e.chat.messages.some(m => m.hidden)).toBe(false);
    expect(JSON.stringify(e.chat.messages)).not.toContain("SYSTEM-REVISION");
  });

  it("der Vertrag kennt kein textFix mehr", async () => {
    const e = new Engine({ def: gemeinsamArtigeDef([]), ctx: {}, chat: neuerChat(), llm: new MockLLM([LECK]).fn() });
    await e.sendUser(ERSTE);
    expect(e.chat.textFix).toBeUndefined();
  });

  it("eine saubere Antwort läuft unverändert durch und ihre Marke feuert", async () => {
    const aufgedeckt = [];
    const mock = new MockLLM(["Dann schauen wir zuerst auf Bernds Stapel.\n[[REVEAL-B]]"]);
    const e = new Engine({ def: gemeinsamArtigeDef(aufgedeckt), ctx: { nameA: "Anna", nameB: "Bernd" }, chat: neuerChat(), llm: mock.fn() });
    await e.sendUser(ERSTE);
    expect(mock.calls).toHaveLength(1);
    expect(aufgedeckt).toEqual(["B"]);
    expect(e.chat.messages.some(m => m.hidden)).toBe(false);
  });
});
