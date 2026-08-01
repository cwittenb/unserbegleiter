// @vitest-environment happy-dom
// S106 · Ausschnitt aus einem abgerufenen Gespräch.
//
// Der Weg, an dem im Testlauf viermal alles hängenblieb: In der Zeitleiste
// lesen, "Teilen" klicken — und dann steht die Begleitung vor einem Gespräch,
// das sie nicht kennt, während die Auswahl Paare aus dem LAUFENDEN Chat
// anbietet, der an der Stelle zwei Sätze lang ist.
//
// Der Kern der Reparatur ist eine Zeile: starteAuswahl BEKOMMT die Paarliste,
// war also immer schon quellenunabhängig — nur ausschnittAngebot verdrahtete
// die Quelle fest. Eine Art von Auswahl, an einer Stelle, zwei Quellen.

import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";
import { MockLLM } from "../../core/engine/mock-llm.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { legeVerlaufAb } from "../../core/ui/verlauf-ablage.js";
import { paareAusVerlauf } from "../../core/engine/ausschnitt.js";
import { soloDef } from "../../core/ui/sessions.js";
import { korpusTexte, reflexionsPrompt } from "../../core/prompts/prompts.de.js";
import { korpusTexte as korpusEn, reflexionsPrompt as reflexionsPromptEn } from "../../core/prompts/prompts.en.js";

function memoryBackend(mock, role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "s106", activeModuleId: "betrieb" });
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
const ruhe = async (n = 12) => { for (let i = 0; i < n; i++) await tick(); };

let root;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app");
});

/** Ein früheres Gespräch mit vier Zügen, abgelegt und in der Chronik verankert. */
const ALT = [
  { role: "assistant", content: "Was beschäftigt dich?" },
  { role: "user", content: "Die Absage am Dienstag." },
  { role: "user", hidden: true, content: "SCALE-RESULT 7" },
  { role: "assistant", content: "Und was macht das mit dir?" },
  { role: "user", content: "Ich ziehe mich dann zurück." },
];

async function mitAltemGespraech(antworten) {
  const backend = memoryBackend(new MockLLM(antworten));
  const vid = await legeVerlaufAb(backend, { messages: ALT });
  await backend.pstate.set("timeline", { entries: [
    { at: "2026-07-25T10:00:00Z", topics: ["Absage", "Rückzug"], summary: "Es ging um die Absage.", vid },
  ]});
  const app = createApp({ doc: document, backend, root });
  await app.boot();
  await ruhe();
  return { app, backend, vid };
}

/* ═══════════ S106.1 · Der Wortlaut kommt MIT ═══════════ */

describe("S106.1 · Beim Teilen-Weg bringt die App den Wortlaut mit", () => {
  it("er liegt im Kontext, bevor die Begleitung das erste Wort sagt", async () => {
    const { app, vid } = await mitAltemGespraech(["Du kommst vom 25. Juli. Was beschäftigt dich daran?"]);
    await app.startChat("solo", { vid });
    await ruhe();

    const wire = app.engine().chat.messages.filter(m => m.hidden).map(m => String(m.content));
    const wortlaut = wire.find(c => c.startsWith("RECALL-RESULT"));
    expect(wortlaut, "der Wortlaut muss ohne Anforderung da sein").toBeTruthy();
    expect(wortlaut).toContain("Die Absage am Dienstag.");
    expect(wortlaut).toContain("Und was macht das mit dir?");
    // Versteckte Züge des alten Gesprächs reisen NICHT mit.
    expect(wortlaut).not.toContain("SCALE-RESULT");
  });

  it("er steht NACH dem Anlass — der Anlass führt den Eintrag ein", async () => {
    const { app, vid } = await mitAltemGespraech(["Los geht's."]);
    await app.startChat("solo", { vid });
    await ruhe();
    const wire = app.engine().chat.messages.filter(m => m.hidden).map(m => String(m.content));
    const iAnlass = wire.findIndex(c => c.includes("2026-07-25") || c.includes("Absage · Rückzug"));
    const iWort = wire.findIndex(c => c.startsWith("RECALL-RESULT"));
    expect(iAnlass).toBeGreaterThanOrEqual(0);
    expect(iWort).toBeGreaterThan(iAnlass);
  });

  it("ohne Anlass bleibt alles wie bisher — kein Wortlaut im Kontext", async () => {
    const { app } = await mitAltemGespraech(["Schön, dass du da bist."]);
    await app.startChat("solo");
    await ruhe();
    const wire = app.engine().chat.messages.filter(m => m.hidden).map(m => String(m.content));
    expect(wire.some(c => c.startsWith("RECALL-RESULT"))).toBe(false);
  });
});

/* ═══════════ S106.4/5 · Die Quelle schaltet um ═══════════ */

describe("S106.4/5 · Kennungen und Auswahl kommen aus dem GELESENEN Gespräch", () => {
  it("PAIRS trägt die Paare des alten Gesprächs, nicht des laufenden", async () => {
    const { app, vid } = await mitAltemGespraech([
      "Du kommst vom 25. Juli — der Wortlaut liegt mir vor. Was beschäftigt dich?",
      "Alles Gute.",
    ]);
    await app.startChat("solo", { vid });
    await ruhe();
    root.querySelector("#pbInput").value = "Ich möchte etwas davon zeigen.";
    root.querySelector("#btnSend").click();
    await ruhe();

    await klick(root.querySelector("#btnChatEnde"));
    await klick(root.querySelector("#btnEndeJa"));
    await ruhe(20);

    const zug = app.engine().chat.messages.filter(m => m.role === "user").pop();
    expect(zug.content).toContain("PAIRS");
    // Die Fragen stammen aus dem ALTEN Gespräch.
    expect(zug.content).toContain("Was beschäftigt dich?");
    expect(zug.content).toContain("Und was macht das mit dir?");
    // Und die Ids passen zu paareAusVerlauf ÜBER DAS ALTE GESPRÄCH.
    for (const p of paareAusVerlauf(ALT)) expect(zug.content).toContain(p.id);
  });

  it("der Auswahl-Screen zeigt die Stellen des alten Gesprächs", async () => {
    const { app, vid } = await mitAltemGespraech(["Der Wortlaut liegt mir vor. Was beschäftigt dich?"]);
    await app.startChat("solo", { vid });
    await ruhe();

    const eignung = paareAusVerlauf(ALT).map(p => ({ id: p.id, ownerOk: true, companionOk: true, reason: null }));
    app.testAusschnitt(eignung);
    await ruhe();

    const tuer = root.querySelector("#ausschnittPanel");
    expect(tuer.classList.contains("pb-hidden"), "die Tür muss offen stehen").toBe(false);
    await klick(tuer.querySelector("#btnAuswStart"));
    await ruhe();

    const txt = root.querySelector("#pbMsgs").textContent;
    expect(txt, "die Stellen von damals stehen zur Wahl").toContain("Die Absage am Dienstag.");
    expect(txt).toContain("Ich ziehe mich dann zurück.");
  });

  it("ohne Anlass bleibt die Quelle das laufende Gespräch", async () => {
    const { app } = await mitAltemGespraech(["Was beschäftigt dich?", "Und wie geht es dir damit?"]);
    await app.startChat("solo");
    await ruhe();
    root.querySelector("#pbInput").value = "Der Abend gestern.";
    root.querySelector("#btnSend").click();
    await ruhe();

    const paare = paareAusVerlauf(app.engine().chat.messages);
    expect(paare.length).toBeGreaterThan(0);
    app.testAusschnitt(paare.map(p => ({ id: p.id, ownerOk: true, companionOk: true, reason: null })));
    await ruhe();
    expect(root.querySelector("#ausschnittPanel").classList.contains("pb-hidden")).toBe(false);
  });

  it("der Anlass-Verlauf hallt NICHT in die nächste Sitzung nach", async () => {
    // Gemerkter Zustand ohne Aufräumen war der Fehler hinter S99.1 und S99.6.
    const { app, vid } = await mitAltemGespraech(["Erste Sitzung.", "Zweite Sitzung."]);
    await app.startChat("solo", { vid });
    await ruhe();
    expect(app._state.anlassVerlauf).toBeTruthy();

    await app.startChat("solo");        // ohne Anlass
    await ruhe();
    expect(app._state.anlassVerlauf).toBeNull();
  });
});

/* ═══════════ S106.8 · Kein Eintrag ohne Thema ═══════════ */

describe("S106.8 · Eine Sitzung ohne Inhalt hinterlässt keine Spur", () => {
  /* Die gescheiterten Abruf-Versuche aus dem Testlauf erzeugten Einträge, die
     dann selbst zum teilbaren Material wurden — das System protokollierte
     seine eigene Fehlfunktion als Inhalt der Person.
     Ein eigenes Feld statt leerer "topics": Das Schema verlangt seit jeher
     1–4 Themen, leere topics lösten also eine Korrekturrunde aus statt eines
     stillen Verzichts. (Meine Empfehlung im Plan war an dieser Stelle falsch.) */
  const BLOCK_LEER = 'TIMELINE-BLOCK\n{"noContent":true}\nEND TIMELINE-BLOCK';
  const BLOCK_VOLL = 'TIMELINE-BLOCK\n' + JSON.stringify({
    summary: "Es ging um die Abende.", topics: ["Abende"], recurrenceNote: null, goals: [],
  }) + '\nEND TIMELINE-BLOCK';

  async function schliesse(block) {
    const backend = memoryBackend(new MockLLM(["Schön, dass du da bist.", "Alles Gute.\n" + block]));
    const app = createApp({ doc: document, backend, root });
    await app.boot(); await ruhe();
    await app.startChat("solo"); await ruhe();
    await klick(root.querySelector("#btnChatEnde"));
    await klick(root.querySelector("#btnEndeJa"));
    await ruhe(20);
    return { app, backend };
  }

  it("noContent ⇒ kein Chronik-Eintrag, Sitzung schließt trotzdem", async () => {
    const { app, backend } = await schliesse(BLOCK_LEER);
    expect(app._state.engine.chat.status, "kein Eintrag heißt NICHT: bleibt offen").toBe("finished");
    const zl = await backend.pstate.get("timeline");
    expect((zl && zl.entries) || []).toHaveLength(0);
  });

  it("mit Inhalt entsteht der Eintrag wie immer", async () => {
    const { app, backend } = await schliesse(BLOCK_VOLL);
    expect(app._state.engine.chat.status).toBe("finished");
    const zl = await backend.pstate.get("timeline");
    expect(zl.entries).toHaveLength(1);
    expect(zl.entries[0].topics).toEqual(["Abende"]);
  });

  it("noContent steht ALLEIN — sonst ist der Block ungültig", async () => {
    const { zeitSchema } = await import("../../core/contracts/schemas.js");
    expect(zeitSchema({ noContent: true })).toEqual([]);
    expect(zeitSchema({ noContent: true, topics: ["A"] })).not.toEqual([]);
    // Und leere topics bleiben ein Fehler — sie waren nie der Weg dafür.
    expect(zeitSchema({ summary: "x", topics: [], recurrenceNote: null })).not.toEqual([]);
  });
});

/* ═══════════ Prompt-Regeln ═══════════ */

describe("S106 · Was der Prompt jetzt sagt", () => {
  it("die Eröffnung nennt Anker, Zustand und Weg — ohne eine Tür vorwegzunehmen", () => {
    const t = korpusTexte["ak.teilenAusVerlauf"];
    expect(t).toContain("ERÖFFNUNG (S106)");
    expect(t).toContain("ANKER");
    expect(t).toContain("ZUSTAND");
    expect(t).toContain("WEG");
    expect(t).toMatch(/KEINE der drei Türen vorweg/);
    expect(t, "und der Wortlaut liegt vor").toMatch(/liegt dir bereits vor/);
  });

  it("die Bedien-Ausnahme ist ausdrücklich festgeschrieben", () => {
    // Sonst nimmt sie in drei Sprints jemand zu Recht wieder heraus:
    // "die Bedienung trägt die Oberfläche" steht als Regel im Haus.
    expect(korpusTexte["ak.teilenAusVerlauf"]).toContain("AUSNAHME zur Regel");
    expect(korpusEn["ak.teilenAusVerlauf"]).toContain("EXCEPTION to the rule");
  });

  it("Kennungen werden nie ausgesprochen (de+en)", () => {
    expect(reflexionsPrompt("Anna", "Bernd")).toContain("NIE AUSSPRECHEN");
    expect(reflexionsPromptEn("Anna", "Bernd")).toContain("NEVER SAY THEM ALOUD");
  });

  it("ist nichts geeignet, wird es gesagt statt geschwiegen (de+en)", () => {
    expect(reflexionsPrompt("Anna", "Bernd")).toContain("NICHTS GEEIGNET");
    expect(reflexionsPromptEn("Anna", "Bernd")).toContain("NOTHING SUITABLE");
  });

  it("auf die Frage nach den Stellen kommt der Weg, keine Begründung", () => {
    expect(reflexionsPrompt("Anna", "Bernd")).toContain("WEG STATT BEGRÜNDUNG");
    expect(reflexionsPromptEn("Anna", "Bernd")).toContain("THE WAY, NOT THE REASON");
  });

  it("ohne Thema kein Eintrag — auch als Regel, nicht nur als Code", () => {
    expect(reflexionsPrompt("Anna", "Bernd")).toContain("OHNE THEMA KEIN EINTRAG");
    expect(reflexionsPromptEn("Anna", "Bernd")).toContain("NO TOPIC, NO ENTRY");
  });
});
