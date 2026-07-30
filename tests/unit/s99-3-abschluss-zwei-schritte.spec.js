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
  hatZeitleistenBlock, ohneZeitleistenBlock, ABSCHLUSS_REVISION,
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
    expect(ohneZeitleistenBlock(text)).not.toContain("Was bleibt?");
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
    expect(hatZeitleistenBlock(BLOCK)).toBe(true);
    expect(hatZeitleistenBlock("MOMENT-BLOCK\n{}\nEND MOMENT-BLOCK")).toBe(false);
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

describe("S99.3 · Beide Wächter hängen am Reflexionsgespräch", () => {
  const def = () => soloDef({ pstate: { get: async () => null, set: async () => true } }, {});

  it("das Prädikats-Urteil aus S93 wird weiterhin erkannt", () => {
    const revision = def().validiereAntwort("Das ist eine starke Fassung.", null);
    expect(revision).toBe(steuerTexte.urteilsRevision);
  });

  it("die Frage mit Block wird erkannt — und mit dem Korpus-Wortlaut", () => {
    const engine = { chat: { messages: ABSCHLUSS } };
    const text = "Was davon soll Bernd erreichen?\n" + BLOCK;
    expect(def().validiereAntwort(text, engine)).toBe(steuerTexte.abschlussRevision);
  });

  it("ohne Engine wirft nichts — der Wächter schweigt dann einfach", () => {
    const text = "Was davon soll Bernd erreichen?\n" + BLOCK;
    expect(def().validiereAntwort(text, undefined)).toBeNull();
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
  it("die Gabelung überlebt: genau eine Revisionsrunde, Composer bleibt offen", async () => {
    const mock = new MockLLM([
      "Schön, dass du da bist.",
      // Der Fehlfall: fragen UND schließen.
      "Magst du das für dich behalten, oder soll etwas davon Bernd erreichen?\n" + BLOCK,
      // Nach der Revision: nur die Frage.
      "Magst du das für dich behalten, oder soll etwas davon Bernd erreichen?",
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
    // Die beanstandete Fassung ist aus der Anzeige verschwunden (S73-Grammatik).
    const sichtbar = root.querySelector("#pbMsgs").textContent;
    expect(sichtbar).not.toContain("Zeitleisten-Eintrag");
    expect(sichtbar).toContain("Bernd erreichen");
    // Und die Revision ist genau EINMAL gelaufen.
    const revisionen = app._state.engine.chat.messages
      .filter(m => m.role === "user" && String(m.content).includes("SYSTEM-REVISION"));
    expect(revisionen).toHaveLength(1);
    expect(revisionen[0].hidden).toBe(true);
  });

  it("die zweite Fassung schließt dann wirklich ab", async () => {
    const mock = new MockLLM([
      "Schön, dass du da bist.",
      "Magst du das für dich behalten?\n" + BLOCK,
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
    await ruhe(20);

    expect(app._state.engine.chat.status).toBe("finished");
    const zl = await backend.pstate.get("timeline");
    expect(zl.entries).toHaveLength(1);          // genau EIN Eintrag, kein Doppel
  });
});

/* ───────────────────────── Korpus-Kanarien ───────────────────────── */

describe("S99.3 · Die Regel steht im Prompt (erste Verteidigung)", () => {
  it("DE: die Zwei-Schritt-Regel am Abschluss-Anlass", () => {
    const p = reflexionsPrompt("Anna", "Bernd");
    expect(p).toContain("ZWEI SCHRITTE");
    expect(p).toMatch(/nie einen TIMELINE-BLOCK|NIE einen TIMELINE-BLOCK/);
  });

  it("EN: dieselbe Regel", () => {
    const p = reflexionsPromptEn("Anna", "Bernd");
    expect(p).toContain("TWO STEPS");
    expect(p).toMatch(/NEVER carries a TIMELINE-BLOCK/);
  });

  it("der Revisionstext lebt im Korpus, nicht nur im Wächter (de+en)", () => {
    for (const st of [steuerTexte, steuerTexteEn]) {
      expect(st.abschlussRevision).toContain("SYSTEM-REVISION");
      expect(st.abschlussRevision).toContain("TIMELINE-BLOCK");
    }
  });
});
