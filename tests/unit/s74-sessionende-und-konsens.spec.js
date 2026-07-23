// @vitest-environment happy-dom
// S74 · Feinschliff zweite Hälfte: Sessionende, Konsens-Sprache, Doppel-Slider.
// Trockenlauf-Befunde:
//   (1) Doppel-Slider: Bei [[BASELINE]] öffnete das verdeckte Startwert-Panel
//       UND die "Deine Zahl"-Text-Heuristik zeigte ihre Leiste — jetzt schweigt
//       die Leiste, sobald eine Marke/ein Block den Zug trägt oder ein Panel
//       offen ist.
//   (2) Konsens-Sprache: Zwei wirklich gegebene Ja SIND die Bestätigung — das
//       Modell kündigt keinen künftigen Bestätigungsschritt mehr an, der nie
//       kommt ("… sobald ich ihn von euch beiden bestätigt habe").
//   (3) Interne Strukturnamen ("Phase 2b") erscheinen nie im Text ans Paar.
//   (4) Befund ohne Etikett: "Euer Befund:" (Klinik-Sprache) entfällt — der
//       Abschieds-Text trägt allein; das Ergebnis lebt in der Agenda.
//   (5) Sessionende: Der Composer weicht dem "Raum verlassen"-Knopf (nichts
//       verschwindet mehr im Nirwana); die Vorraum-Karte der Auflösung
//       verschwindet nach dem Befund ganz (kein erneutes "beginnen").
//   (6) Agenda-Seeding: Der Befund legt den bestätigten gemeinsamen Auftrag
//       und die individuellen Aufträge als aktive Agenda-Einträge an —
//       idempotent, und ausdrücklich OHNE goalAdditions ("das wollen wir
//       nicht"): die bleiben stille Achtsamkeits-Marker im Befund und
//       erreichen die Begleitung über den Moment-Kontext.

import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";
import { MockLLM } from "../../core/engine/mock-llm.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { freigebeUebergabe } from "../../core/engine/freigabe.js";
import { uebergabeTeilKey } from "../../core/contracts/uebergabe.js";
import { gemeinsamDef } from "../../core/ui/kernwetten.js";
import { baueMomentKontext } from "../../core/ui/sessions.js";
import { cleanDisplay } from "../../core/contracts/block.js";
import { BLOECKE } from "../../core/contracts/registry.js";
import { aufloesungsPrompt, momentPrompt } from "../../core/prompts/prompts.de.js";
import { aufloesungsPrompt as aufloesungsPromptEn, momentPrompt as momentPromptEn } from "../../core/prompts/prompts.en.js";

function memoryBackend(mock, role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "s74", activeModuleId: "betrieb" });
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
const ruhe = async (n = 10) => { for (let i = 0; i < n; i++) await tick(); };

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

async function beideFreigaben(backend) {
  await freigebeUebergabe(backend.repo, "A", { module: "kernwetten", name: "Anna", items: [{ id: "S1", text: "Nähe", tag: "FirstTake" }] });
  await freigebeUebergabe(backend.repo, "B", { module: "kernwetten", name: "Bernd", items: [{ id: "S1", text: "Ruhe", tag: "FirstTake" }] });
}

async function betreteAufloesung() {
  await klick(root.querySelector("#btnSharedRoom"));
  await klick(root.querySelector("#btnGemeinsam"));
  await ruhe(14);
}

// Schema-konformer Befund für den Handler-Test.
function befundDaten() {
  return {
    findings: [],
    triangulation: { proposed: 1, confirmed: 1, adjusted: 0, declined: 0 },
    sharedGoal: { text: "Mehr echte Zeit zu zweit", confirmedByBoth: true, baseline: { Anna: 5, Bernd: 7 } },
    individualGoals: [
      { person: "Anna", text: "Ich will Pausen früher ansprechen", wish: "…" },
      { person: "Bernd", text: "Ich will zuhören, bevor ich löse", wish: "…" },
    ],
    compatibility: "gut tragbar",
    misalignedAssumptions: { present: false, status: "" },
    concerns: {
      raised: 1, confirmed: 0, dispelled: 1, adjusted: 0, leftUntouched: 0,
      goalAdditions: ["die Terminplanung wird dabei kein Streitthema"],
      emergencyBrake: false,
    },
    closingCheck: [
      { person: "Anna", value: 7, keySentence: "Wir haben eine Richtung." },
      { person: "Bernd", value: 8, keySentence: "Ich fühle mich gesehen." },
    ],
  };
}

describe("S74 · Doppel-Slider: die Text-Heuristik weicht dem Panel", () => {
  it("[[BASELINE]] öffnet die verdeckten Startwerte — die Deine-Zahl-Leiste bleibt zu", async () => {
    const mock = new MockLLM([
      "Jetzt möchte ich von euch beiden wissen, wie nah ihr dem heute seid — auf einer Skala von 1 bis 10. Ich frage das verdeckt.\n[[BASELINE]]",
    ]);
    const backend = memoryBackend(mock);
    await beideFreigaben(backend);
    await bootApp(backend);
    await betreteAufloesung();
    expect(root.querySelector("#kwPanel").classList.contains("pb-hidden")).toBe(false);   // Startwert-Panel steht
    expect(root.querySelector("#pbSkala").classList.contains("offen")).toBe(false);       // keine zweite Leiste
  });

  it("eine normale Skala-Frage ohne Marke zeigt die Leiste weiterhin", async () => {
    const mock = new MockLLM([
      "Bevor wir weitergehen: Auf einer Skala von 1 bis 10 — wie viel Energie habt ihr gerade noch?",
    ]);
    const backend = memoryBackend(mock);
    await beideFreigaben(backend);
    await bootApp(backend);
    await betreteAufloesung();
    expect(root.querySelector("#pbSkala").classList.contains("offen")).toBe(true);
  });
});

describe("S74 · Sessionende: nichts verschwindet mehr im Nirwana", () => {
  it("abgeschlossene Auflösung: der Composer weicht dem Verlassen-Knopf", async () => {
    const backend = memoryBackend(null);
    await beideFreigaben(backend);
    await backend.chat.save("shared", "gemeinsam", {
      status: "finished",
      messages: [
        { role: "user", content: "Wir sind da.", hidden: true },
        { role: "assistant", content: "Ihr zwei — auf einen guten nächsten Schritt." },
      ],
    });
    await bootApp(backend);
    await betreteAufloesung();
    expect(root.querySelector("#pbComposer").classList.contains("pb-hidden")).toBe(true);
    expect(root.querySelector("#btnChatZurueck").classList.contains("pb-hidden")).toBe(false);
    expect(root.querySelector("#pbSkala").classList.contains("offen")).toBe(false);
  });

  it("laufende Auflösung: der Composer bleibt", async () => {
    const mock = new MockLLM(["Schön, dass ihr wieder da seid."]);
    const backend = memoryBackend(mock);
    await beideFreigaben(backend);
    await backend.chat.save("shared", "gemeinsam", {
      status: "running",
      messages: [
        { role: "user", content: "Wir sind da.", hidden: true },
        { role: "assistant", content: "Dann pausieren wir hier — bis bald, ihr zwei." },
      ],
    });
    await bootApp(backend);
    await betreteAufloesung();
    expect(root.querySelector("#pbComposer").classList.contains("pb-hidden")).toBe(false);
  });

  it("Vorraum nach dem Befund: die Auflösungs-Karte verschwindet ganz", async () => {
    const backend = memoryBackend(null);
    await beideFreigaben(backend);
    await backend.bstate.set("findings", { at: "2026-07-18T10:00:00Z" });
    await bootApp(backend);
    await klick(root.querySelector("#btnSharedRoom"));
    await ruhe();
    // D3: die Aufloesungs-ZEILE verschwindet (Karten gibt es nicht mehr)
    const zeile = root.querySelector("#btnGemeinsam");
    expect(zeile.classList.contains("pb-hidden")).toBe(true);
    expect(root.querySelector("#gemeinsamSub").classList.contains("pb-hidden")).toBe(true);
  });

  it("ohne Befund bleibt die Karte sichtbar (kein Regress)", async () => {
    const backend = memoryBackend(null);
    await beideFreigaben(backend);
    await bootApp(backend);
    await klick(root.querySelector("#btnSharedRoom"));
    await ruhe();
    const zeile = root.querySelector("#btnGemeinsam");
    expect(zeile.classList.contains("pb-hidden")).toBe(false);
    expect(root.querySelector("#gemeinsamLabel").textContent).toBe("Gemeinsame Auflösung beginnen");   // D3: Label-Span
  });
});

describe("S74 · Agenda-Seeding aus dem Befund", () => {
  it("legt AG + AI als aktive Aufträge an — idempotent, ohne goalAdditions", async () => {
    const backend = memoryBackend(null);
    const def = gemeinsamDef(backend, {});
    const blk = def.blocks.find(b => b.start === "CLARIFICATION-BLOCK");
    const engine = { chat: {} };
    await blk.handle(befundDaten(), engine);
    await blk.handle(befundDaten(), engine);   // resume-fest: kein Doppel-Seeding
    const goals = await backend.bstate.get("goals");
    expect(goals.items.length).toBe(3);
    const ag = goals.items.find(a => a.art === "shared");
    expect(ag.id).toBe("AG1");
    expect(ag.text).toBe("Mehr echte Zeit zu zweit");
    expect(ag.status).toBe("active");
    expect(ag.baseline).toEqual({ Anna: 5, Bernd: 7 });
    const ai = goals.items.filter(a => a.art === "individual");
    expect(ai.map(a => a.owner).sort()).toEqual(["Anna", "Bernd"]);
    expect(ai.every(a => a.id.startsWith("AI"))).toBe(true);
    expect(typeof goals.findingsSeededAt).toBe("string");
    expect(JSON.stringify(goals)).not.toContain("Streitthema");   // E2c: Befürchtungen bleiben draußen
    expect(engine.chat.status).toBe("finished");
    const findings = await backend.bstate.get("findings");
    expect(findings.sharedGoal.text).toBe("Mehr echte Zeit zu zweit");
  });

  it("ein unbestätigter Auftrag wird nicht geseedet", async () => {
    const backend = memoryBackend(null);
    const def = gemeinsamDef(backend, {});
    const blk = def.blocks.find(b => b.start === "CLARIFICATION-BLOCK");
    const daten = befundDaten();
    daten.sharedGoal = null;
    daten.individualGoals = [];
    await blk.handle(daten, { chat: {} });
    const goals = await backend.bstate.get("goals");
    expect(((goals && goals.items) || []).length).toBe(0);
  });
});

describe("S74 · ZU-VERMEIDEN-Marker erreichen die Begleitung — nicht die Agenda", () => {
  it("baueMomentKontext trägt die goalAdditions als stillen Kopf", () => {
    const k = baueMomentKontext({
      goals: null, agenda: null, momentLog: null, messrunde: null, sharings: [], qualitytime: null,
      findings: { concerns: { goalAdditions: ["die Terminplanung wird kein Streitthema"] } },
    }, "Anna", "Bernd");
    expect(k).toContain("ZU VERMEIDEN");
    expect(k).toContain("- die Terminplanung wird kein Streitthema");
  });

  it("ohne Befund kein Vermeiden-Kopf", () => {
    const k = baueMomentKontext({
      goals: null, agenda: null, momentLog: null, messrunde: null, sharings: [], qualitytime: null,
    }, "Anna", "Bernd");
    expect(k).not.toContain("ZU VERMEIDEN");
  });
});

describe("S74 · Prompt-Kanarien (de + en)", () => {
  const p = aufloesungsPrompt("Anna", "Bernd");
  const pe = aufloesungsPromptEn("Anna", "Bernd");

  it("Gegebenes Ja zählt sofort — kein angekündigter Bestätigungsschritt, der nie kommt", () => {
    expect(p).toContain("GEGEBENES JA ZÄHLT SOFORT");
    expect(p).toContain("sobald ich ihn von euch beiden bestätigt habe");   // als Verstoß-Beispiel benannt
    expect(pe).toContain("A GIVEN YES COUNTS IMMEDIATELY");
    // Die Panzerung gegen unterstellte Okays bleibt unversehrt:
    expect(p).toContain("ERST nach explizitem Okay von BEIDEN");
    expect(p).toContain("GEGENDRUCK-FEST");
  });

  it("interne Strukturnamen nie zum Paar (mit dem Fund als Verstoß-Beispiel)", () => {
    expect(p).toContain("INTERNE STRUKTURNAMEN");
    expect(p).toContain("ihr wart mitten in Phase 2b");
    expect(pe).toContain("INTERNAL STRUCTURE NAMES");
  });

  it("Moment-Prompt kennt die stillen ZU-VERMEIDEN-Zeilen", () => {
    expect(momentPrompt("Anna", "Bernd")).toContain("ZU-VERMEIDEN-Zeilen");
    expect(momentPromptEn("Anna", "Bernd")).toContain("AVOID lines");
  });
});

describe("S74 · Befund ohne Etikett", () => {
  it("der Platzhalter ist leer — der Abschieds-Text trägt allein", () => {
    expect(BLOECKE.befund.placeholder).toBe("");
    const text = 'Gut — dann halte ich alles fest.CLARIFICATION-BLOCK{"x":1}END CLARIFICATION-BLOCK Ihr zwei — auf einen guten nächsten Schritt.';
    const out = cleanDisplay(text, [], [BLOECKE.befund]);
    expect(out).not.toContain("Befund");
    expect(out).not.toContain("CLARIFICATION");
    expect(out).toContain("Gut — dann halte ich alles fest.");
    expect(out).toContain("Ihr zwei — auf einen guten nächsten Schritt.");
  });
});
