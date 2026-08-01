// @vitest-environment happy-dom
// S99.3 · Wer fragt, schließt nicht.
//
// Aus einem echten Verlauf: Auf "[CLOSE SESSION]" kam die Gabelung
// ("Magst du das für dich behalten, oder gibt es etwas davon, das Bernd
// erreichen soll? Ich kann dir drei Wege anbieten …") UND der TIMELINE-BLOCK
// in DERSELBEN Nachricht. Der Block beendet die Sitzung sofort, der Composer
// weicht dem Ausgang — die drei Türen standen da, und es gab kein Feld mehr,
// um eine davon zu wählen. Die Person konnte nur noch beenden.
//
// Zwei Verteidigungen, wie überall im System: die Prompt-Regel (ZWEI SCHRITTE,
// wortgleich zu der, die die gemeinsame Sitzung seit S98 kennt) und der
// Wächter, der sie messbar macht.

import { describe, it, expect, beforeEach } from "vitest";
import {
  pruefeAbschlussAntwort, abschlussAngefordert, findetFrage,
  hatBlock, ohneBlock, ABSCHLUSS_REVISION,
} from "../../core/engine/abschluss-waechter.js";
import { soloDef } from "../../core/ui/sessions.js";
import { createApp } from "../../core/ui/app.js";
import { MockLLM } from "../../core/engine/mock-llm.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { steuerTexte, reflexionsPrompt } from "../../core/prompts/prompts.de.js";
import { steuerTexte as steuerTexteEn, reflexionsPrompt as reflexionsPromptEn } from "../../core/prompts/prompts.en.js";

const TIMELINE = JSON.stringify({
  summary: "Anna hat über die Abende gesprochen. Was bleibt?", topics: ["Abende"],
  recurrenceNote: null, goals: [],
});
const BLOCK = "TIMELINE-BLOCK\n" + TIMELINE + "\nEND TIMELINE-BLOCK";
const ABSCHLUSS = [{ role: "user", hidden: true, content: "[CLOSE SESSION]" }];

/* ─────────────────────────── Der Wächter ─────────────────────────── */

describe("S99.3 · Der Wächter urteilt genau über einen Fall", () => {
  it("Gabelung UND Block in einer Nachricht → Revision", () => {
    const text = "Magst du das für dich behalten, oder soll etwas Bernd erreichen?\n" + BLOCK;
    expect(pruefeAbschlussAntwort(text, { messages: ABSCHLUSS })).toBe(ABSCHLUSS_REVISION);
  });

  it("Landung ohne Frage → frei", () => {
    const text = "Alles Gute für heute, Anna.\n" + BLOCK;
    expect(pruefeAbschlussAntwort(text, { messages: ABSCHLUSS })).toBeNull();
  });

  it("Frage ohne Block → frei; solange nichts endet, darf gefragt werden", () => {
    const text = "Magst du das für dich behalten, oder soll etwas Bernd erreichen?";
    expect(pruefeAbschlussAntwort(text, { messages: ABSCHLUSS })).toBeNull();
  });

  it("Fragezeichen IM Block ist Chronik, keine Frage an die Person", () => {
    const text = "Alles Gute für heute.\n" + BLOCK;
    expect(ohneBlock(text)).not.toContain("Was bleibt?");
    expect(pruefeAbschlussAntwort(text, { messages: ABSCHLUSS })).toBeNull();
  });

  it("[CHECKPOINT] bleibt unberührt — dort ist die Anknüpfungsfrage RICHTIG", () => {
    // Der zweite Anlass des Blocks: erst der Block, dann das Wiederanknüpfen
    // ("wir waren bei … — magst du da weitermachen?"). Ohne diese Engführung
    // würde der Wächter jede Wiederaufnahme revidieren.
    const text = BLOCK + "\nWir waren bei den Abenden — magst du da weitermachen?";
    const messages = [{ role: "user", hidden: true, content: "[CHECKPOINT]" }];
    expect(pruefeAbschlussAntwort(text, { messages })).toBeNull();
  });

  it("der eigene Revisionstext schlägt durch, wenn einer gereicht wird", () => {
    const text = "Und was davon soll Bernd erreichen?\n" + BLOCK;
    expect(pruefeAbschlussAntwort(text, { messages: ABSCHLUSS, revision: "[X]" })).toBe("[X]");
  });
});

describe("S99.3 · Die Bausteine einzeln", () => {
  it("erkennt den Block", () => {
    expect(hatBlock(BLOCK)).toBe(true);
    expect(hatBlock("MOMENT-BLOCK\n{}\nEND MOMENT-BLOCK")).toBe(false);
    // S100.2 · Der Blockname ist jetzt ein Parameter — dieselbe Prüfung trägt
    // beide Mitglieder der Abschluss-Familie.
    expect(hatBlock("MOMENT-BLOCK\n{}\nEND MOMENT-BLOCK", "MOMENT-BLOCK")).toBe(true);
  });

  it("erkennt den Abschluss-Anlass an der App-Nachricht", () => {
    expect(abschlussAngefordert(ABSCHLUSS)).toBe(true);
    expect(abschlussAngefordert([{ role: "user", content: "Mich beschäftigt der Abend." }])).toBe(false);
    expect(abschlussAngefordert([])).toBe(false);
    expect(abschlussAngefordert(null)).toBe(false);
  });

  it("ein Assistant-Echo des Steuertexts zählt NICHT als Anlass", () => {
    // Das Modell spiegelte den Token früher zurück (S93/A1). Ein Echo darf den
    // Wächter nicht scharf machen — nur die App löst den Abschluss aus.
    const echo = [{ role: "assistant", content: "Alles Gute.\n[CLOSE SESSION]" }];
    expect(abschlussAngefordert(echo)).toBe(false);
  });

  it("findet Fragen nur außerhalb des Blocks", () => {
    expect(findetFrage("Wie geht es dir?\n" + BLOCK)).toBe(true);
    expect(findetFrage("Alles Gute.\n" + BLOCK)).toBe(false);
  });
});

/* ────────────────────── Verkettung in der SessionDef ────────────────────── */

/* S105.3 · Aus der Revision wurde die verweigerte Übergabe.
   Die Prüffrage ist dieselbe geblieben — fragen und abschließen in EINER
   Nachricht bleibt ein Verstoß. Was sich ändert, ist die Folge: Der Text bleibt
   stehen, nur der Block wird nicht ausgeführt. Damit endet die Sitzung nicht,
   die Frage ist lesbar, die Person kann antworten. */
describe("S105.3 · Die Übergabe hängt am Reflexionsgespräch", () => {
  const def = () => soloDef({ pstate: { get: async () => null, set: async () => true } }, {});

  it("die Frage mit Block wird erkannt", () => {
    const engine = { chat: { messages: ABSCHLUSS } };
    const text = "Was davon soll Bernd erreichen?\n" + BLOCK;
    expect(def().pruefeUebergabe(text, engine)).toBe("abschluss-mit-frage");
  });

  it("ohne Engine wirft nichts — die Prüfung schweigt dann einfach", () => {
    const text = "Was davon soll Bernd erreichen?\n" + BLOCK;
    expect(def().pruefeUebergabe(text, undefined)).toBeNull();
  });

  it("ein Prädikats-Urteil ist KEINE Übergabe-Frage mehr — es bleibt stehen", () => {
    // S93 hatte dafür einen Wächter. Ein Urteil steckt im Text selbst:
    // verweigern ließe sich da nichts, und zurückgenommen wird nichts mehr.
    // Die Regel trägt seit S105.4 der Prompt allein — samt der Form, die
    // richtig wäre ("Das finde ich …" statt "Das ist …").
    expect(def().pruefeUebergabe("Das ist eine starke Fassung.", null)).toBeNull();
    const p = reflexionsPrompt("Anna", "Bernd");
    expect(p).toContain("URTEILS-GRAMMATIK");
    expect(p).toContain("Das finde ich einen schönen Impuls");
  });
});

/* ───────────────────────── Ende zu Ende ───────────────────────── */

function memoryBackend(mock, role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "s993", activeModuleId: "betrieb" });
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

describe("S99.3 · Im laufenden Gespräch", () => {
  it("die Gabelung ÜBERLEBT — und zwar sichtbar: nichts wird zurückgenommen", async () => {
    /* Der Fall aus dem Testlauf, in der Fassung von S105.3.
       Das Modell fragt UND schließt in einer Nachricht. Bis hierher versteckte
       die Engine diese Antwort und ließ sie neu schreiben — die Person sah, wie
       die Begleitung zurücknahm, was sie gerade gesagt hatte.
       Jetzt wird nur die ÜBERGABE verweigert: Der Block wird nicht ausgeführt,
       der Text bleibt lesbar, die Sitzung läuft weiter. Das Ergebnis ist genau
       das, was die Regel wollte — die Frage steht, und sie ist beantwortbar. */
    const mock = new MockLLM([
      "Schön, dass du da bist.",
      "Magst du das für dich behalten, oder soll etwas davon Bernd erreichen?\n" + BLOCK,
    ]);
    const backend = memoryBackend(mock);
    const app = createApp({ doc: document, backend, root });
    await app.boot();
    await ruhe();
    await app.startChat("solo");
    await ruhe();
    await klick(root.querySelector("#btnChatEnde"));
    await klick(root.querySelector("#btnEndeJa"));
    await ruhe(16);

    // Die Sitzung läuft weiter — die Person kann antworten.
    expect(app._state.engine.chat.status).toBe("running");
    expect(root.querySelector("#pbComposer").classList.contains("pb-hidden")).toBe(false);
    // Die Frage steht sichtbar da. Sie wurde NICHT entfernt.
    expect(root.querySelector("#pbMsgs").textContent).toContain("Bernd erreichen");
    // Keine zweite Runde, keine versteckte Nachricht, keine Revision.
    expect(mock.calls, "genau zwei Runden: Eröffnung und Abschlussversuch").toHaveLength(2);
    const msgs = app._state.engine.chat.messages;
    expect(msgs.some(m => m.role === "assistant" && m.hidden)).toBe(false);
    expect(JSON.stringify(msgs)).not.toContain("SYSTEM-REVISION");
    // Der Grund steht im Zustand — für Oberfläche und Tests, nie im Gespräch.
    expect(app._state.engine.chat.letzteVerweigerung).toBe("abschluss-mit-frage");
  });

  it("der Knopf heißt jetzt 'Ohne Teilen abschließen' — und ein Druck beantwortet die Gabelung", async () => {
    const mock = new MockLLM([
      "Schön, dass du da bist.",
      "Magst du das für dich behalten, oder soll etwas davon Bernd erreichen?\n" + BLOCK,
      "Dann behältst du es. Alles Gute für heute.\n" + BLOCK,
    ]);
    const backend = memoryBackend(mock);
    const app = createApp({ doc: document, backend, root });
    await app.boot();
    await ruhe();
    await app.startChat("solo");
    await ruhe();
    await klick(root.querySelector("#btnChatEnde"));
    await klick(root.querySelector("#btnEndeJa"));
    await ruhe(16);

    // S105.5 · Das Label sagt, was der nächste Druck bewirkt.
    expect(root.querySelector("#btnChatEnde").textContent).toContain("Ohne Teilen");

    await klick(root.querySelector("#btnChatEnde"));
    await klick(root.querySelector("#btnEndeJa"));
    await ruhe(20);

    // Der zweite Druck ist die dritte Tür, kein zweiter Abschlussversuch.
    const zug = app._state.engine.chat.messages.filter(m => m.role === "user").pop();
    expect(zug.content).toContain("[CLOSE SESSION · KEEP]");
    expect(app._state.engine.chat.status).toBe("finished");
    const zl = await backend.pstate.get("timeline");
    expect(zl.entries).toHaveLength(1);          // genau EIN Eintrag, kein Doppel
  });
});

/* ───────────────────────── Korpus-Kanarien ───────────────────────── */

describe("S99.3 · Die Regel steht im Prompt (erste Verteidigung)", () => {
  // S100.1 · Der invariante Kern lebt seit S100 im Baustein regieUebergabe;
  // die session-eigene Choreografie (die Gabelung als Frage) bleibt lokal.
  it("DE: die Regie-Übergabe-Regel am Abschluss-Anlass", () => {
    const p = reflexionsPrompt("Anna", "Bernd");
    expect(p).toContain("REGIE-ÜBERGABE");
    expect(p).toMatch(/NIE einen TIMELINE-BLOCK/);
    expect(p).toContain("Die Gabelung mit den drei Türen IST eine Frage");
  });

  it("EN: dieselbe Regel", () => {
    const p = reflexionsPromptEn("Anna", "Bernd");
    expect(p).toContain("HANDING OVER CONTROL");
    expect(p).toMatch(/NEVER carries a TIMELINE-BLOCK/);
  });

  it("der Revisionstext lebt im Korpus, nicht nur im Wächter (de+en)", () => {
    for (const st of [steuerTexte, steuerTexteEn]) {
      expect(st.abschlussRevision).toContain("SYSTEM-REVISION");
      expect(st.abschlussRevision).toContain("TIMELINE-BLOCK");
    }
  });
});
