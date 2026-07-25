// @vitest-environment happy-dom
// S93 · Abschluss- und Freigabe-Hygiene.
//
// Vier Befunde aus einer privaten Session, hier festgenagelt:
//   A1  "[CLOSE SESSION]" stand am Ende im Verlauf — das Modell spiegelte den
//       Steuertext in die eigene Antwort zurück.
//   A2  "Session abschließen" las sich nicht wie ein Knopf.
//   A3  Nach dem Abschluss verschwand der Composer, und NICHTS trat an seine
//       Stelle — kein Ausgang.
//   C1  Das Gate-Panel verlangte Häkchen UND Freigeben, wobei "Freigeben ohne
//       Häkchen" erreichbar, aber sinnlos war.

import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";
import { MockLLM } from "../../core/engine/mock-llm.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { freigebeUebergabe } from "../../core/engine/freigabe.js";
import { uebergabeTeilKey } from "../../core/contracts/uebergabe.js";
import { cleanDisplay } from "../../core/contracts/block.js";
import { entferneSteuerToken, offeneKlammerAbIndex } from "../../core/contracts/steuertoken.js";
import { ALLE_BLOECKE } from "../../core/contracts/registry.js";
import { DESIGN_CSS } from "../../core/ui/design.js";
import { steuerTexte, reflexionsPrompt } from "../../core/prompts/prompts.de.js";
import { steuerTexte as steuerTexteEn, reflexionsPrompt as reflexionsPromptEn } from "../../core/prompts/prompts.en.js";

function memoryBackend(mock, role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "s93", activeModuleId: "betrieb" });
  const bstate = new Bstate(repo), pstate = new Pstate(repo);
  return {
    store, repo,
    async info() { return { role, name: "Anna", partner: "Bernd", nameA: "Anna", nameB: "Bernd" }; },
    bstate: { get: f => bstate.get(f), set: (f, v) => bstate.set(f, v) },
    pstate: { get: f => pstate.get(role, f), set: (f, v) => pstate.set(role, f, v) },
    chat: {
      load: (art, id) => repo.get("chat:" + (art === "shared" ? id : role + ":" + id), art === "shared"),
      save: (art, id, c) => repo.set("chat:" + (art === "shared" ? id : role + ":" + id), c, art === "shared"),
    },
    handover: { post: d => freigebeUebergabe(repo, role, d), get: r => repo.get(uebergabeTeilKey(r), true, "kernwetten") },
    llm: mock ? mock.fn() : (async () => ({ text: "ok", stop: "end_turn" })),
  };
}

const tick = () => new Promise(r => setTimeout(r, 0));
async function klick(el) { el.click(); await tick(); await tick(); await tick(); }
const ruhe = async (n = 8) => { for (let i = 0; i < n; i++) await tick(); };

let root;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app");
});

async function bootApp(backend) {
  const app = createApp({ doc: document, backend, root });
  await app.boot();
  await ruhe();
  return app;
}

const TIMELINE = JSON.stringify({
  summary: "Anna hat über die Abende gesprochen.", topics: ["Abende"],
  recurrenceNote: null, goals: [],
});
const MOMENT = JSON.stringify({
  summary: "Ein ruhiger Abend.", topics: ["Abend"], addressed: [], deferred: [],
  selfResolved: [], shift: null, gentleInvitation: null,
});

/* ─────────────────────── A1 · Steuer-Token ─────────────────────── */

describe("S93 · A1 Steuer-Token verlassen nie den Draht", () => {
  it("entfernt die Abschluss-Token inline und als eigene Zeile", () => {
    expect(entferneSteuerToken("Danke.\n[CLOSE SESSION]\nUnd tschüss.").trim())
      .toBe("Danke.\n\nUnd tschüss.".trim().replace("\n\n", "\n\n"));
    expect(entferneSteuerToken("Bis dahin. [CLOSE MOMENT]")).toBe("Bis dahin. ");
  });

  it("entfernt jede Zeile, die ganz aus einem geklammerten Ausdruck besteht", () => {
    expect(entferneSteuerToken("Text\n[Weiter mit Kapitel 2.]\nMehr")).toBe("Text\nMehr");
    expect(entferneSteuerToken("Text\n[Rückkehr nach Abschluss: irgendwas]\nMehr")).toBe("Text\nMehr");
  });

  it("lässt gewöhnlichen Text unberührt; nur GANZE Klammerzeilen fallen", () => {
    expect(entferneSteuerToken("Ein Satz ohne Klammern.")).toBe("Ein Satz ohne Klammern.");
    expect(entferneSteuerToken("Er sagte [sinngemäß] das Richtige."))
      .toBe("Er sagte [sinngemäß] das Richtige.");   // inline, nicht ganze Zeile
    // S94 · Auch eine allein stehende Marke ist Protokoll und fällt hier —
    // in cleanDisplay ist sie zu diesem Zeitpunkt ohnehin schon von der
    // Markenliste entfernt; eine FREMDE Marke (andere Session) verschwindet
    // damit ebenfalls, statt roh im Verlauf zu stehen.
    expect(entferneSteuerToken("Nun denn.\n[[RANKING]]")).toBe("Nun denn.");
  });

  it("Kanarie: jeder vollständig geklammerte Steuertext (de+en) wird erfasst", () => {
    for (const korpus of [steuerTexte, steuerTexteEn])
      for (const [schluessel, wert] of Object.entries(korpus)) {
        if (typeof wert !== "string") continue;
        if (!/^\[.*\]$/s.test(wert.trim())) continue;
        expect(entferneSteuerToken(wert).trim(), schluessel + " bleibt sichtbar").toBe("");
      }
  });

  it("der reale Fall: Abschiedstext + echoter Token + TIMELINE-BLOCK", () => {
    const roh = "Ich wünsche dir einen guten Abend.\n\n[CLOSE SESSION]\n\n" +
      "TIMELINE-BLOCK\n" + TIMELINE + "\nEND TIMELINE-BLOCK";
    const sichtbar = cleanDisplay(roh, [], ALLE_BLOECKE);
    expect(sichtbar).not.toContain("CLOSE SESSION");
    expect(sichtbar).not.toContain("[");
    expect(sichtbar).toContain("guten Abend");
    expect(sichtbar).toContain("Zeitleisten-Eintrag");
  });

  it("Stream: ein halb angekommenes Token blitzt nicht auf", () => {
    expect(offeneKlammerAbIndex("Danke. [CLOSE SESS")).toBe(7);
    expect(offeneKlammerAbIndex("Danke. [CLOSE SESSION]")).toBe(-1);
    expect(offeneKlammerAbIndex("Ganz ohne Klammern")).toBe(-1);
  });

  it("Korpus-Kanarie: die Prompts verbieten das Wiedergeben (de+en)", () => {
    expect(reflexionsPrompt("Anna", "Bernd")).toContain("PROTOKOLL-ZEICHEN");
    expect(reflexionsPromptEn("Anna", "Bernd")).toContain("PROTOCOL CHARACTERS");
  });
});

/* ──────────────── A2/A3 · Abschluss-Knopf und Ausgang ──────────────── */

describe("S93 · A2/A3 Abschluss-Knopf und Ausgang", () => {
  it("Design kennt die flache Knopf-Klasse mit Rahmen", () => {
    expect(DESIGN_CSS).toMatch(/\.rz-knopf-flach\{[^}]*border:1px solid var\(--rz-hairline\)/);
  });

  it("Reflexionsgespräch: nach dem TIMELINE-BLOCK tritt der Ausgang an die Stelle des Composers", async () => {
    const mock = new MockLLM([
      "Schön, dass du da bist.",
      "Ich wünsche dir einen guten Abend.\nTIMELINE-BLOCK\n" + TIMELINE + "\nEND TIMELINE-BLOCK",
    ]);
    const backend = memoryBackend(mock);
    const app = await bootApp(backend);
    await app.startChat("solo");
    await ruhe();

    const ende = root.querySelector("#btnChatEnde");
    const raus = root.querySelector("#btnRaumVerlassen");
    // vor dem Abschluss: Abschluss-Knopf da, Ausgang verborgen, Composer offen
    expect(ende.classList.contains("pb-hidden")).toBe(false);
    expect(ende.classList.contains("rz-knopf-flach")).toBe(true);
    expect(raus.classList.contains("pb-hidden")).toBe(true);
    expect(raus.classList.contains("rz-knopf-flach")).toBe(true);
    expect(root.querySelector("#pbComposer").classList.contains("pb-hidden")).toBe(false);

    await klick(ende);
    await ruhe();

    expect(app._state.engine.chat.status).toBe("finished");
    expect(root.querySelector("#pbComposer").classList.contains("pb-hidden")).toBe(true);
    expect(root.querySelector("#btnChatEnde").classList.contains("pb-hidden")).toBe(true);
    expect(root.querySelector("#btnRaumVerlassen").classList.contains("pb-hidden")).toBe(false);

    // und der Steuertext steht nirgends im sichtbaren Verlauf
    expect(root.querySelector("#pbMsgs").textContent).not.toContain("CLOSE SESSION");

    await klick(root.querySelector("#btnRaumVerlassen"));
    await ruhe();
    expect(root.querySelector("#scrMyRoom").classList.contains("pb-hidden")).toBe(false);
  });

  it("Qualitätszeit: derselbe Ausgang führt in den gemeinsamen Vorraum", async () => {
    const mock = new MockLLM([
      "Schön, dass ihr da seid.",
      "Nehmt den Abend mit.\nMOMENT-BLOCK\n" + MOMENT + "\nEND MOMENT-BLOCK",
    ]);
    const backend = memoryBackend(mock);
    const app = await bootApp(backend);
    await app.startChat("moment");
    await ruhe();

    await klick(root.querySelector("#btnChatEnde"));
    await ruhe();

    expect(app._state.engine.chat.status).toBe("finished");
    expect(root.querySelector("#btnRaumVerlassen").classList.contains("pb-hidden")).toBe(false);
    expect(root.querySelector("#pbMsgs").textContent).not.toContain("CLOSE MOMENT");

    await klick(root.querySelector("#btnRaumVerlassen"));
    await ruhe();
    expect(root.querySelector("#scrShared").classList.contains("pb-hidden")).toBe(false);
  });
});

/* ─────────────────────── C1/C2 · Freigabe ─────────────────────── */

const GATE = JSON.stringify({
  wording: "Ich vermisse gemeinsame Abende und erlebe mich abgewiesen.",
  wish: null, reasoning: "Gewissheit herausgenommen.",
  criteria: { characterJudgment: false, generalization: false, situationSpecific: true, ownShare: true },
  paths: ["shelf", "moment"],
});

describe("S93 · C1 Gate-Panel: eine Entscheidung statt zwei", () => {
  it("Freigeben ist gesperrt, solange kein Weg gewählt ist — und quert dann nichts", async () => {
    const mock = new MockLLM(["Hier ist eine Fassung.\nGATE-BLOCK\n" + GATE + "\nEND GATE-BLOCK"]);
    const backend = memoryBackend(mock);
    const app = await bootApp(backend);
    await app.startChat("solo");
    await ruhe();

    const panel = root.querySelector("#gatePanel");
    expect(panel.classList.contains("pb-hidden")).toBe(false);
    const ok = panel.querySelector("#btnGateOk");
    expect(ok.disabled).toBe(true);
    expect(ok.classList.contains("rz-gedimmt")).toBe(true);
    expect(ok.classList.contains("rz-knopf-flach")).toBe(true);
    expect(panel.querySelector("#btnGateNein").classList.contains("rz-knopf-flach")).toBe(true);

    // Das Panel bleibt offen, nichts quert — der Knopf ist wirklich tot.
    ok.click();
    await ruhe();
    expect(panel.classList.contains("pb-hidden")).toBe(false);
    expect(((await backend.bstate.get("shelf")) || { items: [] }).items).toHaveLength(0);
  });

  it("ein Häkchen weckt den Knopf, das Zurücknehmen legt ihn wieder schlafen", async () => {
    const mock = new MockLLM(["Hier ist eine Fassung.\nGATE-BLOCK\n" + GATE + "\nEND GATE-BLOCK"]);
    const app = await bootApp(memoryBackend(mock));
    await app.startChat("solo");
    await ruhe();

    const panel = root.querySelector("#gatePanel");
    const ok = panel.querySelector("#btnGateOk");
    const box = panel.querySelector('input[data-weg="shelf"]');
    const Ev = document.defaultView.Event;

    box.checked = true;
    box.dispatchEvent(new Ev("change"));
    expect(ok.disabled).toBe(false);
    expect(ok.classList.contains("rz-gedimmt")).toBe(false);

    box.checked = false;
    box.dispatchEvent(new Ev("change"));
    expect(ok.disabled).toBe(true);
    expect(ok.classList.contains("rz-gedimmt")).toBe(true);
  });
});

describe("S93 · B1/C2 Korpus-Kanarien (de+en)", () => {
  const de = reflexionsPrompt("Anna", "Bernd");
  const en = reflexionsPromptEn("Anna", "Bernd");

  it("B1: der Kriterien-Check läuft still — bestandene Kriterien werden nie ausgesprochen", () => {
    expect(de).toContain("verpflichtend – und STILL");
    expect(de).toContain("Du prüfst INTERN");
    expect(de).toContain("keine Prüfungs-Sprache");
    expect(en).toContain("mandatory – and SILENT");
    expect(en).toContain("You check INTERNALLY");
  });

  it("C2: die Weg-Wahl gehört der App, nicht dem Gespräch", () => {
    expect(de).toContain("die WAHL GEHÖRT DER APP");
    expect(de).toContain("Frage die Wege NICHT im Gespräch ab");
    expect(de).not.toContain("(5) WEG WÄHLEN (kombinierbar)");
    expect(en).toContain("the CHOICE BELONGS TO THE APP");
    expect(en).not.toContain("(5) CHOOSE A PATH (combinable)");
  });

  it("C2: ein gegebenes Ja zählt sofort — keine weitere Rückversicherung", () => {
    expect(de).toContain("GEGEBENES JA ZÄHLT SOFORT");
    expect(de).toContain("in DERSELBEN nächsten Nachricht");
    expect(en).toContain("A GIVEN YES COUNTS IMMEDIATELY");
  });
});
