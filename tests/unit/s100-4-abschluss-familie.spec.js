// @vitest-environment happy-dom
// S100.4 · Die Abschluss-Familie, tabellengetrieben.
//
// Warum dieser Test existiert: Dieselbe Regel wurde dreimal gefunden — in der
// Auflösung (S72), in der Qualitätszeit (S98), im Reflexionsgespräch (S99) —
// und jedes Mal erst, nachdem ein echter Verlauf danebengegangen war. Nach S99
// war die Qualitätszeit zwar prompt-seitig gewarnt, aber unbewacht; niemand
// hätte das gemerkt, weil jede Session ihre eigenen Tests hat und jeder davon
// grün war.
//
// Ein Test je Session prüft, ob DIESE Session in Ordnung ist. Er kann nicht
// prüfen, ob eine Session FEHLT. Genau das tut dieser hier: Er läuft über eine
// Liste und fällt rot aus, sobald ein Mitglied dazukommt, das die Familien-
// eigenschaften nicht erfüllt.
//
// WER GEHÖRT DAZU: Sessions, die über einen Knopf und einen Block schließen.
// Auftragsklärung (Freigabe) und Auflösung (Befund) enden über eigene Rituale
// und gehören ausdrücklich NICHT dazu — sie hier aufzunehmen hieße, Felder mit
// "gibt es hier nicht" zu füllen, und das ist das sichere Zeichen für eine
// Abstraktion, die nicht passt.

import { describe, it, expect, beforeEach } from "vitest";
import { soloDef, momentDef } from "../../core/ui/sessions.js";
import { einzelDef, gemeinsamDef } from "../../core/ui/kernwetten.js";
import { pruefeAbschlussAntwort } from "../../core/engine/abschluss-waechter.js";
import { createApp } from "../../core/ui/app.js";
import { MockLLM } from "../../core/engine/mock-llm.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { reflexionsPrompt, momentPrompt, steuerTexte } from "../../core/prompts/prompts.de.js";
import {
  reflexionsPrompt as reflexionsPromptEn, momentPrompt as momentPromptEn,
  steuerTexte as steuerTexteEn,
} from "../../core/prompts/prompts.en.js";

/* ─────────────────────────── Die Familie ─────────────────────────── */

const FAMILIE = [
  {
    id: "solo",
    titel: "Reflexionsgespräch",
    block: "TIMELINE-BLOCK",
    token: "[CLOSE SESSION]",
    // Der TIMELINE-BLOCK hat einen ZWEITEN Anlass ([CHECKPOINT]), bei dem die
    // Anknüpfungsfrage NACH dem Block richtig ist — deshalb urteilt der
    // Wächter dort nur nach einem Abschluss-Anlass.
    anlassNoetig: true,
    def: () => soloDef(backendStumm(), {}),
    prompt: () => reflexionsPrompt("Anna", "Bernd"),
    promptEn: () => reflexionsPromptEn("Anna", "Bernd"),
    blockJson: { summary: "Anna hat über die Abende gesprochen.", topics: ["Abende"], recurrenceNote: null, goals: [] },
  },
  {
    id: "moment",
    titel: "Qualitätszeit",
    block: "MOMENT-BLOCK",
    token: "[CLOSE MOMENT]",
    // Der MOMENT-BLOCK kennt nur den Abschluss — und der kommt auch VERBAL,
    // ganz ohne Steuertext. Eine Anlass-Prüfung ließe genau die Fälle durch.
    anlassNoetig: false,
    def: () => momentDef(backendStumm(), {}),
    prompt: () => momentPrompt("Anna", "Bernd"),
    promptEn: () => momentPromptEn("Anna", "Bernd"),
    blockJson: { summary: "Ein ruhiger Abend.", topics: ["Abend"], addressed: [], deferred: [], selfResolved: [], shift: null, gentleInvitation: null },
  },
];

const backendStumm = () => ({
  pstate: { get: async () => null, set: async () => true },
  bstate: { get: async () => null, set: async () => true },
});

const baueBlock = f => f.block + "\n" + JSON.stringify(f.blockJson) + "\nEND " + f.block;

/* ───────────────── 1 · Prompt: die Regie-Übergabe steht da ───────────────── */

describe("S100.4 · Jedes Familienmitglied kennt die Regie-Übergabe", () => {
  for (const f of FAMILIE) {
    it(`${f.titel}: DE nennt Regel, Block und die drei Pflichten`, () => {
      const p = f.prompt();
      expect(p).toContain("REGIE-ÜBERGABE");
      expect(p).toContain("NIE einen " + f.block);
      expect(p).toContain("LANDUNGS-PFLICHT");
      expect(p).toContain("KEINE SPEICHER-BEHAUPTUNG");
    });

    it(`${f.titel}: EN trägt dieselbe Regel`, () => {
      const p = f.promptEn();
      expect(p).toContain("HANDING OVER CONTROL");
      expect(p).toContain("NEVER carries a " + f.block);
      expect(p).toContain("LANDING OBLIGATION");
      expect(p).toContain("NO SAVE CLAIM");
    });
  }
});

/* ───────────────── 2 · Der Wächter hängt wirklich dran ───────────────── */

/* S105.3 · Aus "Revision" wurde "Uebergabe verweigert".
   Die Prueffragen bleiben dieselben — was sich aendert, ist die FOLGE: Der Text
   bleibt stehen, nur die Handlung faellt aus. Deshalb liefert pruefeUebergabe
   auch keinen Revisionstext mehr, sondern einen kurzen Grund; er wandert nie
   ins Gespraech, sondern nur in den Chat-Zustand. */
describe("S100.4 · Jedes Familienmitglied ist bewacht, nicht nur gewarnt", () => {
  for (const f of FAMILIE) {
    const anlass = [{ role: "user", hidden: true, content: f.token }];

    it(`${f.titel}: Frage + Block ⇒ Übergabe verweigert`, () => {
      const grund = f.def().pruefeUebergabe(
        "Und was davon nehmt ihr mit?\n" + baueBlock(f),
        { chat: { messages: anlass } });
      expect(grund).toBe("abschluss-mit-frage");
    });

    it(`${f.titel}: Landung ohne Frage ⇒ frei`, () => {
      const grund = f.def().pruefeUebergabe(
        "Alles Gute für heute.\n" + baueBlock(f),
        { chat: { messages: anlass } });
      expect(grund).toBeNull();
    });

    it(`${f.titel}: Frage ohne Block ⇒ frei`, () => {
      const grund = f.def().pruefeUebergabe(
        "Was nehmt ihr mit?", { chat: { messages: anlass } });
      expect(grund).toBeNull();
    });

    it(`${f.titel}: Fragezeichen IM Block ist Chronik, keine Frage`, () => {
      const mitFrage = { ...f, blockJson: { ...f.blockJson, summary: "Was bleibt?" } };
      const grund = f.def().pruefeUebergabe(
        "Alles Gute.\n" + baueBlock(mitFrage), { chat: { messages: anlass } });
      expect(grund).toBeNull();
    });

    it(`${f.titel}: ein Prädikats-Urteil bleibt STEHEN — Prompt-Klasse (S105.3)`, () => {
      // Es steckt im Text selbst: verweigern liesse sich da nichts, und
      // zurueckgenommen wird nichts mehr. Die Regel traegt der Prompt allein.
      const grund = f.def().pruefeUebergabe("Das ist eine starke Fassung.", { chat: { messages: [] } });
      expect(grund).toBeNull();
      expect(f.prompt()).toContain("URTEILS");
    });
  }

  it("die Anlass-Prüfung ist je Session verschieden — und das ist Absicht", () => {
    const solo = FAMILIE[0], moment = FAMILIE[1];
    // Reflexionsgespräch: OHNE Abschluss-Anlass schweigt der Wächter, denn der
    // [CHECKPOINT]-Fall verlangt den Block VOR der Anknüpfungsfrage.
    expect(pruefeAbschlussAntwort("Magst du weitermachen?\n" + baueBlock(solo),
      { messages: [], block: solo.block, anlassNoetig: solo.anlassNoetig })).toBeNull();
    // Qualitätszeit: OHNE Steuertext urteilt er trotzdem — das verbale Ende
    // ("lass uns Schluss machen") ist dort ein regulärer Abschluss-Anlass.
    expect(pruefeAbschlussAntwort("Was nehmt ihr mit?\n" + baueBlock(moment),
      { messages: [], block: moment.block, anlassNoetig: moment.anlassNoetig })).toBeTruthy();
  });
});

/* ───────────────── 3 · Wer NICHT dazugehört, hat auch keinen ───────────────── */

describe("S100.4 · Die Grenze der Familie", () => {
  it("Auftragsklärung und Auflösung schließen anders — und tragen den Wächter nicht", () => {
    const stumm = backendStumm();
    for (const def of [einzelDef(stumm, {}), gemeinsamDef(stumm, {})]) {
      // Ein Abschluss-Block existiert dort gar nicht; ein Text mit TIMELINE-BLOCK
      // darf trotzdem keine Verweigerung auslösen.
      const grund = def.pruefeUebergabe && def.pruefeUebergabe(
        "Und wie geht es dir damit?\nTIMELINE-BLOCK\n{}\nEND TIMELINE-BLOCK",
        { chat: { messages: [{ role: "user", content: "[CLOSE SESSION]" }] }, ctx: {} });
      expect(grund || null).toBeNull();
    }
  });

  it("die Steuertexte der Familie sind sprachinvariant", () => {
    expect(steuerTexte.soloAbschluss).toBe(steuerTexteEn.soloAbschluss);
    expect(steuerTexte.momentAbschluss).toBe(steuerTexteEn.momentAbschluss);
    for (const f of FAMILIE) {
      const alle = [steuerTexte.soloAbschluss, steuerTexte.momentAbschluss];
      expect(alle).toContain(f.token);
    }
  });
});

/* ───────────────── 4 · Der Knopf schickt den richtigen Text ───────────────── */

function memoryBackend(mock, role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "s1004", activeModuleId: "betrieb" });
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

describe("S100.4 · Der Abschluss-Knopf verhält sich in beiden Räumen gleich", () => {
  for (const f of FAMILIE) {
    it(`${f.titel}: Rückfrage, dann Steuertext, dann Ausgang`, async () => {
      const mock = new MockLLM(["Schön, dass ihr da seid.", "Alles Gute.\n" + baueBlock(f)]);
      const backend = memoryBackend(mock);
      const app = createApp({ doc: document, backend, root });
      await app.boot();
      await ruhe();
      await app.startChat(f.id);
      await ruhe();

      // Ein Klick allein schließt nichts (S99.2) — in BEIDEN Räumen.
      await klick(root.querySelector("#btnChatEnde"));
      expect(app._state.engine.chat.status).toBe("running");
      expect(root.querySelector("#chatEndeFrage").classList.contains("pb-hidden")).toBe(false);

      await klick(root.querySelector("#btnEndeJa"));
      await ruhe(20);

      const zug = app._state.engine.chat.messages.filter(m => m.role === "user").pop();
      expect(zug.content).toContain(f.token);
      expect(zug.hidden).toBe(true);
      expect(app._state.engine.chat.status).toBe("finished");
      expect(root.querySelector("#pbComposer").classList.contains("pb-hidden")).toBe(true);
      expect(root.querySelector("#btnRaumVerlassen").classList.contains("pb-hidden")).toBe(false);
    });
  }
});
