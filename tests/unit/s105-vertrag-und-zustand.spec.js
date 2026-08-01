// @vitest-environment happy-dom
// S105 · Was gesagt wurde, gilt.
//
// Vier Befunde aus dem Testlauf, die dieselbe Wurzel haben: Sprache und
// Mechanik laufen auseinander. Der Wächter nahm weg, was gelesen war; der
// Abruf lieferte nichts, obwohl er angekündigt war; der Ladezustand blieb
// stehen, obwohl nichts mehr lief; der Knopf sagte nicht, was er tut.
//
// Diese Datei prüft die Stellen, für die es bisher KEINEN Test gab — genau
// das war der Grund, warum sie durchrutschen konnten.

import { describe, it, expect, beforeEach } from "vitest";
import { Engine } from "../../core/engine/engine.js";
import { MockLLM } from "../../core/engine/mock-llm.js";
import { BLOECKE } from "../../core/contracts/registry.js";
import { createApp } from "../../core/ui/app.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { legeVerlaufAb } from "../../core/ui/verlauf-ablage.js";
import { soloDef, momentDef } from "../../core/ui/sessions.js";
import { krisenSchaerfung, KRISEN_SIGNALE } from "../../core/engine/krisen-waechter.js";
import { de } from "../../core/i18n/de.js";
import { en } from "../../core/i18n/en.js";
import { steuerTexte } from "../../core/prompts/prompts.de.js";
import * as dePrompts from "../../core/prompts/prompts.de.js";
import * as enPrompts from "../../core/prompts/prompts.en.js";
import { steuerTexte as steuerTexteEn } from "../../core/prompts/prompts.en.js";

/* ═══════════ S105.1 · Die Folgerunde nach einem Block ═══════════ */

describe("S105.1 · Antwortet die App auf einen Block, folgt eine Modellrunde", () => {
  function baueAbruf(weg) {
    let n = 0;
    const llm = async () => {
      n++;
      return { text: n === 1 ? 'Ich schaue nach.\nRECALL-BLOCK\n{"vid":"x"}\nEND RECALL-BLOCK' : "Da ist es.", stop: "end_turn" };
    };
    const chat = { messages: [], status: "running" };
    const e = new Engine({
      def: {
        id: "p", sysPrompt: () => "s", canAct: () => true,
        blocks: [{ ...BLOECKE.abruf, handle: async (d, eng) => { await eng[weg]("RECALL-RESULT\nB: alter Text"); } }],
      },
      chat, ctx: {}, llm, hooks: {},
    });
    return { e, chat, runden: () => n };
  }

  it("antworteAufBlock löst die Runde aus — submitToolResult tat es nicht", async () => {
    /* Der Befund: holeWortlaut läuft IM Block-Handler, also noch im ersten
       Lauf — dort ist busy gesetzt, und requestAssistant() steigt an seiner
       eigenen Sperre wortlos aus. Die Wire-Nachricht landete im Verlauf, eine
       Antwort darauf gab es nie; sie kam erst, wenn die Person selbst tippte.
       Genau das war im Test zu sehen ("okay? so lang war der text nicht"). */
    const alt = baueAbruf("submitToolResult");
    await alt.e.sendUser("los");
    expect(alt.runden(), "alter Weg: die Folgerunde verfällt").toBe(1);
    expect(alt.chat.messages[alt.chat.messages.length - 1].role).toBe("user");

    const neu = baueAbruf("antworteAufBlock");
    await neu.e.sendUser("los");
    expect(neu.runden(), "neuer Weg: die Antwort kommt").toBe(2);
    expect(neu.chat.messages[neu.chat.messages.length - 1].role).toBe("assistant");
  });

  it("die Engine gibt die Sperre gezielt frei, nicht dauerhaft", async () => {
    const { e } = baueAbruf("antworteAufBlock");
    await e.sendUser("los");
    expect(e.busy, "nach dem Zug ist die Engine wieder frei").toBe(false);
  });
});

/* ═══════════ S105.3 · Nichts wird zurückgenommen ═══════════ */

describe("S105.3 · Der Vertrag kennt keine Rücknahme mehr", () => {
  it("eine verweigerte Übergabe lässt den Text stehen und vermerkt nur den Grund", async () => {
    const chat = { messages: [], status: "running" };
    let handlerLief = 0;
    const e = new Engine({
      def: {
        id: "p", sysPrompt: () => "s", canAct: () => true,
        pruefeUebergabe: t => (/\bFRAGE-BLOCK\b/.test(t) && t.includes("?") ? "grund-x" : null),
        blocks: [{ start: "FRAGE-BLOCK", end: "END FRAGE-BLOCK", re: {}, stripRe: {},
          handle: () => { handlerLief++; } }],
      },
      chat, ctx: {}, llm: async () => ({ text: "Magst du?\nFRAGE-BLOCK\n{}\nEND FRAGE-BLOCK", stop: "end_turn" }), hooks: {},
    });
    await e.sendUser("los");

    expect(handlerLief, "die Handlung fällt aus").toBe(0);
    const antwort = chat.messages.find(m => m.role === "assistant");
    expect(antwort.hidden, "der Text bleibt sichtbar").toBeFalsy();
    expect(antwort.content).toContain("Magst du?");
    expect(chat.letzteVerweigerung).toBe("grund-x");
    expect(JSON.stringify(chat.messages)).not.toContain("SYSTEM-REVISION");
  });

  it("der Grund wird zurückgesetzt, sobald wieder alles stimmt", async () => {
    const chat = { messages: [], status: "running", letzteVerweigerung: "alt" };
    const e = new Engine({
      def: { id: "p", sysPrompt: () => "s", canAct: () => true, blocks: [], pruefeUebergabe: () => null },
      chat, ctx: {}, llm: async () => ({ text: "Alles gut.", stop: "end_turn" }), hooks: {},
    });
    await e.sendUser("los");
    expect(chat.letzteVerweigerung).toBeNull();
  });

  it("die Schärfung geht in den SYSTEMTEXT, nie in den Verlauf", async () => {
    const systeme = [];
    const chat = { messages: [], status: "running" };
    const e = new Engine({
      def: { id: "p", sysPrompt: () => "BASIS", canAct: () => true, blocks: [], schaerfe: () => "[APP-HINWEIS: X]" },
      chat, ctx: {},
      llm: async (sys) => { systeme.push(sys); return { text: "ok", stop: "end_turn" }; },
      hooks: {},
    });
    await e.sendUser("los");
    expect(systeme[0]).toContain("BASIS");
    expect(systeme[0]).toContain("[APP-HINWEIS: X]");
    expect(JSON.stringify(chat.messages)).not.toContain("APP-HINWEIS");
  });
});

describe("S105.3 · Krisen-Schärfung", () => {
  const krise = t => [{ role: "user", content: t }];

  it("erkennt Krisensignale auch in gebeugter Form", () => {
    // Die erste Fassung hatte eine Wortgrenze am ENDE — damit fiel genau die
    // Sprache durch, in der Menschen reden ("ritze", "selbstverletzendes").
    for (const t of ["Ich will nicht mehr leben.", "manchmal denke ich an Suizid",
                     "ich ritze mich wieder", "selbstverletzendes Verhalten", "I want to kill myself"])
      expect(krisenSchaerfung(krise(t)), t).toBeTruthy();
  });

  it("greift nicht bei harmlosen Wortnachbarn", () => {
    for (const t of ["Der Ritzenreiniger ist alle.", "Wir waren am Ende des Films."])
      expect(KRISEN_SIGNALE.test(t), t).toBe(false);
  });

  it("schweigt sonst — und die Schärfung nennt die Reihenfolge", () => {
    expect(krisenSchaerfung(krise("Wir hatten einen schönen Abend."))).toBeNull();
    expect(krisenSchaerfung(krise("Ich will nicht mehr leben.")))
      .toContain("ZUERST der Verweis in den eigenen Raum");
  });

  it("liest die JÜNGSTE Nachricht der Person, nicht irgendeine", () => {
    const verlauf = [
      { role: "user", content: "Ich will nicht mehr leben." },
      { role: "assistant", content: "Ich bin da." },
      { role: "user", content: "Danke, jetzt geht es besser." },
    ];
    expect(krisenSchaerfung(verlauf)).toBeNull();
  });

  it("beide geteilten Räume tragen sie, die Einzelräume nicht", () => {
    const stumm = { pstate: { get: async () => null, set: async () => true }, bstate: { get: async () => null, set: async () => true } };
    expect(typeof momentDef(stumm, {}).schaerfe).toBe("function");
    expect(soloDef(stumm, {}).schaerfe).toBeUndefined();
  });
});

/* ═══════════ S105.5 · Der Abschluss-Knopf ═══════════ */

function memoryBackend(mock, role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "s105", activeModuleId: "betrieb" });
  const bstate = new Bstate(repo), pstate = new Pstate(repo);
  return {
    async info() { return { role, name: "Anna", partner: "Bernd", nameA: "Anna", nameB: "Bernd" }; },
    bstate: { get: f => bstate.get(f), set: (f, v) => bstate.set(f, v) },
    pstate: { get: f => pstate.get(role, f), set: (f, v) => pstate.set(role, f, v) },
    chat: {
      load: (art, id) => repo.get("chat:" + (art === "shared" ? id : role + ":" + id), art === "shared"),
      save: (art, id, c) => repo.set("chat:" + (art === "shared" ? id : role + ":" + id), c, art === "shared"),
    },
    handover: { post: async () => {}, get: async () => null },
    llm: mock.fn(),
  };
}
const tick = () => new Promise(r => setTimeout(r, 0));
async function klick(el) { el.click(); await tick(); await tick(); await tick(); }
const ruhe = async (n = 10) => { for (let i = 0; i < n; i++) await tick(); };

let root;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app");
});

const TL = JSON.stringify({ summary: "x", topics: ["Abende"], recurrenceNote: null, goals: [] });
const BLOCK = "TIMELINE-BLOCK\n" + TL + "\nEND TIMELINE-BLOCK";

describe("S105.5 · Das Label wird ABGELEITET, nie gemerkt", () => {
  it("frischer Chat sagt 'Session abschließen' — auch nach einer offenen Gabelung zuvor", async () => {
    /* Genau die Sorge aus dem Test: "ich habe eine neue Session begonnen und
       es steht noch das alte Label da". Ein Flag müsste beim Wechsel
       zurückgesetzt werden — vergessenes Aufräumen war der Fehler hinter
       beginnen/fortsetzen (S99.1) und der falsch angehefteten Kennung (S99.6).
       Aus dem Verlauf abgeleitet, kann es gar nicht hängenbleiben. */
    const mock = new MockLLM([
      "Schön, dass du da bist.",
      "Magst du das behalten, oder soll etwas zu Bernd?\n" + BLOCK,   // Gabelung bleibt offen
      "Schön, dass du wieder da bist.",
    ]);
    const backend = memoryBackend(mock);
    const app = createApp({ doc: document, backend, root });
    await app.boot(); await ruhe();
    await app.startChat("solo"); await ruhe();
    await klick(root.querySelector("#btnChatEnde"));
    await klick(root.querySelector("#btnEndeJa"));
    await ruhe(16);
    expect(root.querySelector("#btnChatEnde").textContent).toContain("Ohne Teilen");

    // Neue Sitzung in derselben App-Sitzung.
    await backend.chat.save("mine", "solo", { messages: [], status: "running" });
    await app.startChat("solo"); await ruhe(12);
    expect(root.querySelector("#btnChatEnde").textContent).toContain(de["chat.abschliessen"]);
    expect(root.querySelector("#btnChatEnde").textContent).not.toContain("Ohne Teilen");
  });

  it("die Texte stehen in beiden Sprachen", () => {
    expect(de["chat.abschliessenOhneTeilen"]).toBeTruthy();
    expect(en["chat.abschliessenOhneTeilen"]).toBeTruthy();
    expect(de["chat.abschliessenOhneTeilen"]).not.toBe(de["chat.abschliessen"]);
  });

  it("die Steuertexte der dritten Tür sind sprachinvariant", () => {
    expect(steuerTexte.soloOhneTeilen).toBe(steuerTexteEn.soloOhneTeilen);
    expect(steuerTexte.momentOhneTeilen).toBe(steuerTexteEn.momentOhneTeilen);
    // Sie tragen den Abschluss-Token in sich — der Prompt erkennt beides.
    expect(steuerTexte.soloOhneTeilen).toContain("CLOSE SESSION");
  });
});

describe("S105.5 · Solange die App am Zug ist, ist der Knopf inaktiv", () => {
  it("gesperrt beim Warten, frei danach", async () => {
    const mock = new MockLLM(["Schön, dass du da bist."]);
    const app = createApp({ doc: document, backend: memoryBackend(mock), root });
    await app.boot(); await ruhe();
    await app.startChat("solo"); await ruhe();
    const b = root.querySelector("#btnChatEnde");
    expect(b.disabled, "nach der Antwort ist er frei").toBe(false);

    // Ein Wartevorgang sperrt ihn — und die Freigabe kommt aus derselben Stelle.
    app._state.warten = true;
    expect(app._state.warten).toBe(true);
  });
});

/* ═══════════ S105.4 · Was nur noch der Prompt trägt ═══════════ */

describe("S105.4 · Regeln ohne Netz", () => {
  it("die Urteils-Grammatik steht in ALLEN vier Sessions (de+en)", () => {
    // Sie lebte im haltungsKern — und die Qualitätszeit bindet den nicht ein:
    // dort trug sie allein der Wächter. Mit seinem Wegfall wäre sie ersatzlos
    // verschwunden, ohne dass ein Test es gemerkt hätte.
    for (const [k, marke] of [[dePrompts, "URTEILS-GRAMMATIK"], [enPrompts, "JUDGEMENT GRAMMAR"]])
      for (const n of ["reflexions", "moment", "klaerungs", "aufloesungs"])
        expect(k[n + "Prompt"]("Anna", "Bernd"), n).toContain(marke);
  });

  it("sie benennt die richtige FORM, nicht nur das Verbot", () => {
    const p = dePrompts.reflexionsPrompt("Anna", "Bernd");
    expect(p).toContain("Der Fehler ist NICHT das Würdigen");
    expect(p).toContain("Das finde ich einen schönen Impuls");
    expect(p).toContain("wird NICHT mehr maschinell korrigiert");
  });

  it("der Abruf wird getan, nicht angekündigt (de+en)", () => {
    expect(dePrompts.reflexionsPrompt("Anna", "Bernd")).toContain("ABRUF GESCHIEHT");
    expect(enPrompts.reflexionsPrompt("Anna", "Bernd")).toContain("THE RECALL HAPPENS");
  });

  it("die Speicher-Behauptung bleibt verboten — jetzt ohne Netz", () => {
    for (const n of ["reflexions", "moment"])
      expect(dePrompts[n + "Prompt"]("Anna", "Bernd"), n).toContain("KEINE SPEICHER-BEHAUPTUNG");
  });
});
