// @vitest-environment happy-dom
// S80 · Agenda-Workflow v3 + Abschluss-Fixes:
// (1) Regal mit zwei Übernahme-Wegen ("In der Qualitätszeit besprechen" →
//     Punkt mit Vormerkung; "Als Ziel vorschlagen" → Punkt mit Kandidat-Marke;
//     aus dem Regal wird NIE direkt ein Ziel),
// (2) Vormerkung offener Gesprächspunkte + Etiketten in der Agenda,
// (3) Kontext-Marker (Momentkontext + QZ-Material),
// (4) Wegweiser "erstmal"/"jederzeit",
// (5) Engine persistiert Handler-Statuswechsel (finished nach MOMENT-BLOCK),
//     Heilung hängender Qualitätszeiten, Solo-Abschluss per [CLOSE SESSION],
// (6) Begriffs-Vereinheitlichung (nutzerseitig nur "Qualitätszeit").

import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";
import { MockLLM } from "../../core/engine/mock-llm.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { freigebeUebergabe } from "../../core/engine/freigabe.js";
import { uebergabeTeilKey } from "../../core/contracts/uebergabe.js";
import { hebeInAgenda, merkeVor, baueMomentKontext } from "../../core/ui/sessions.js";
import { baueQzMaterial } from "../../core/ui/prozess.js";
import { de } from "../../core/i18n/de.js";
import { en } from "../../core/i18n/en.js";
import { steuerTexte, momentPrompt, korpusTexte } from "../../core/prompts/prompts.de.js";
import { steuerTexte as steuerTexteEn, momentPrompt as momentPromptEn, korpusTexte as korpusTexteEn } from "../../core/prompts/prompts.en.js";

function memoryBackend(mock, role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "s80", activeModuleId: "betrieb" });
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

const MOMENT_BLOCK = JSON.stringify({
  summary: "Ein ruhiger Abend, ihr habt über die Wochenenden gesprochen.",
  topics: ["Wochenenden"], addressed: [], deferred: [], selfResolved: [],
  shift: null, gentleInvitation: null,
});
const TIMELINE_BLOCK = JSON.stringify({
  summary: "Anna hat über die Arbeitswoche reflektiert und einen eigenen Wunsch benannt.",
  topics: ["Arbeit"], recurrenceNote: null, goals: [],
});

/* ── Regal: zwei Übernahme-Wege ── */
describe("S80 · Regal: besprechen ODER als Ziel vorschlagen", () => {
  async function backendMitFremdemRegal() {
    const backend = memoryBackend(null);
    await backend.bstate.set("shelf", { items: [
      { id: "x1", by: "Bernd", text: "Wochenend-Planung", read: true },
      { id: "x2", by: "Bernd", text: "Mehr Zeit füreinander", read: true },
    ] });
    return backend;
  }

  it("beide Knöpfe stehen an fremden, noch nicht übernommenen Einträgen", async () => {
    const backend = await backendMitFremdemRegal();
    await bootApp(backend);
    await klick(root.querySelector("#btnSharedRoom"));
    await klick(root.querySelector("#btnRegal"));
    await ruhe();
    expect(root.querySelectorAll("#regalItems [data-heben]").length).toBe(2);
    expect(root.querySelectorAll("#regalItems [data-ziel]").length).toBe(2);
    expect(root.querySelector("#regalItems").textContent).toContain("In der Qualitätszeit besprechen");
    expect(root.querySelector("#regalItems").textContent).toContain("Als Ziel vorschlagen");
  });

  it("'besprechen' erzeugt einen VORGEMERKTEN Gesprächspunkt; 'als Ziel' die Kandidat-Marke — NIE ein Ziel", async () => {
    const backend = await backendMitFremdemRegal();
    await hebeInAgenda(backend, "x1");
    await hebeInAgenda(backend, "x2", { alsZiel: true });
    const agenda = await backend.bstate.get("agenda");
    expect(agenda.items).toHaveLength(2);
    const [p1, p2] = agenda.items;
    expect(p1.state).toBe("open");
    expect(p1.vormerkung).toBe(true);          // besprechen = fürs nächste Mal vorgemerkt
    expect(p1.zielKandidat).toBeUndefined();
    expect(p2.state).toBe("open");
    expect(p2.zielKandidat).toBe(true);        // Kandidat, KEIN Ziel
    const goals = await backend.bstate.get("goals");
    expect(goals).toBeFalsy();                 // goals-Speicher bleibt unberührt
    // Regal-Status unterscheidet beide Wege
    const regal = await backend.bstate.get("shelf");
    expect(regal.items[0].gehoben).toBe(true);
    expect(regal.items[0].alsZiel).toBeUndefined();
    expect(regal.items[1].alsZiel).toBe(true);
  });

  it("nach der Übernahme verschwinden beide Knöpfe; der Status benennt den Weg", async () => {
    const backend = await backendMitFremdemRegal();
    await hebeInAgenda(backend, "x1");
    await hebeInAgenda(backend, "x2", { alsZiel: true });
    await bootApp(backend);
    await klick(root.querySelector("#btnSharedRoom"));
    await klick(root.querySelector("#btnRegal"));
    await ruhe();
    expect(root.querySelectorAll("#regalItems [data-heben]").length).toBe(0);
    expect(root.querySelectorAll("#regalItems [data-ziel]").length).toBe(0);
    const txt = root.querySelector("#regalItems").textContent;
    expect(txt).toContain("in der Agenda");
    expect(txt).toContain("als Ziel vorgeschlagen");
  });

  it("Doppel-Übernahme bleibt wirkungslos (Idempotenz)", async () => {
    const backend = await backendMitFremdemRegal();
    await hebeInAgenda(backend, "x1");
    await hebeInAgenda(backend, "x1", { alsZiel: true });
    const agenda = await backend.bstate.get("agenda");
    expect(agenda.items).toHaveLength(1);
    expect(agenda.items[0].zielKandidat).toBeUndefined();
  });
});

/* ── Agenda: Vormerkung + Etiketten ── */
describe("S80 · Agenda: Vormerkung offener Gesprächspunkte", () => {
  it("offener Punkt ohne Vormerkung trägt beide Knöpfe; Vormerken setzt das Etikett und lässt ihn OFFEN", async () => {
    const backend = memoryBackend(null);
    await backend.bstate.set("agenda", { items: [
      { id: "AGD1", by: "Bernd", text: "Wochenend-Planung", state: "open" },
    ]});
    await bootApp(backend);
    await klick(root.querySelector("#btnSharedRoom"));
    await klick(root.querySelector("#btnAgenda"));
    await ruhe();
    expect(root.querySelector("#agendaItems [data-vor]")).toBeTruthy();
    expect(root.querySelector("#agendaItems [data-abr]")).toBeTruthy();
    await klick(root.querySelector("#agendaItems [data-vor]"));
    await ruhe();
    const agenda = await backend.bstate.get("agenda");
    expect(agenda.items[0].vormerkung).toBe(true);
    expect(agenda.items[0].state).toBe("open");                    // Vormerkung räumt nicht ab
    const txt = root.querySelector("#agendaItems").textContent;
    expect(txt).toContain("vorgemerkt für die Qualitätszeit");
    expect(root.querySelector("#agendaItems [data-vor]")).toBeNull();   // Knopf weg
    expect(root.querySelector("#agendaItems [data-abr]")).toBeTruthy(); // selbst geklärt bleibt möglich
  });

  it("Ziel-Kandidat trägt sein Etikett; abgeräumte Punkte tragen keine Knöpfe", async () => {
    const backend = memoryBackend(null);
    await backend.bstate.set("agenda", { items: [
      { id: "AGD1", by: "Bernd", text: "Mehr Zeit füreinander", state: "open", zielKandidat: true },
      { id: "AGD2", by: "Anna", text: "Urlaub", state: "selfResolved" },
    ]});
    await bootApp(backend);
    await klick(root.querySelector("#btnSharedRoom"));
    await klick(root.querySelector("#btnAgenda"));
    await ruhe();
    const txt = root.querySelector("#agendaItems").textContent;
    expect(txt).toContain("Ziel-Kandidat");
    expect(root.querySelectorAll("#agendaItems [data-abr]").length).toBe(1);
    expect(root.querySelectorAll("#agendaItems [data-vor]").length).toBe(1);
  });

  it("merkeVor greift nur bei offenen Punkten", async () => {
    const backend = memoryBackend(null);
    await backend.bstate.set("agenda", { items: [
      { id: "AGD1", by: "Anna", text: "Urlaub", state: "discussed" },
    ]});
    await merkeVor(backend, "AGD1");
    const agenda = await backend.bstate.get("agenda");
    expect(agenda.items[0].vormerkung).toBeUndefined();
  });
});

/* ── Kontext-Marker ── */
describe("S80 · Marker im Momentkontext und QZ-Material", () => {
  it("baueMomentKontext hängt Kandidat- und Vormerkungs-Marker an offene Punkte", () => {
    const kx = baueMomentKontext({ agenda: { items: [
      { id: "AGD1", by: "Bernd", text: "Wochenend-Planung", state: "open", vormerkung: true },
      { id: "AGD2", by: "Bernd", text: "Mehr Zeit füreinander", state: "open", zielKandidat: true },
      { id: "AGD3", by: "Anna", text: "Urlaub", state: "discussed", vormerkung: true },
    ] } }, "Anna", "Bernd");
    expect(kx).toContain("Wochenend-Planung [VORGEMERKT");
    expect(kx).toContain("Mehr Zeit füreinander [ZIEL-KANDIDAT");
    expect(kx).toContain("gemeinsame Beschluss");                 // Ratifizierung zu zweit
    expect(kx).not.toContain("Urlaub [");                         // nicht-offene ohne Marker
  });

  it("baueQzMaterial führt vorgemerkte offene Punkte auf — und bleibt ohne Agenda unverändert", () => {
    const mit = baueQzMaterial({ goals: [], sharings: [], qualitytime: null, agenda: { items: [
      { id: "AGD1", text: "Wochenend-Planung", state: "open", vormerkung: true },
      { id: "AGD2", text: "Urlaub", state: "open" },
      { id: "AGD3", text: "Altes", state: "discussed", vormerkung: true },
    ]}});
    expect(mit).toContain("Vorgemerkte Gesprächspunkte: Wochenend-Planung");
    expect(mit).not.toContain("Urlaub");
    expect(mit).not.toContain("Altes");
    const ohne = baueQzMaterial({ goals: [], sharings: [], qualitytime: null });
    expect(ohne).not.toContain("Vorgemerkte Gesprächspunkte");
  });
});

/* ── Wegweiser ── */
describe("S80 · Wegweiser: 'erstmal' vor, 'jederzeit' nach der Aufdeckung", () => {
  it("ohne revealLog: 'erstmal'; mit revealLog: 'jederzeit'", async () => {
    const backend = memoryBackend(null);
    await bootApp(backend);
    expect(root.textContent).toContain("auch erstmal für ein Reflexionsgespräch");
    await backend.bstate.set("revealLog", { at: "2026-07-10T18:00:00Z", summary: "Top 5 aufgedeckt." });
    document.body.innerHTML = '<div id="app"></div>';
    root = document.getElementById("app");
    await bootApp(backend);
    expect(root.textContent).toContain("jederzeit für ein Reflexionsgespräch");
    expect(root.textContent).not.toContain("auch erstmal für ein Reflexionsgespräch");
  });
});

/* ── Abschluss-Fixes ── */
describe("S80 · Abschluss: Persistenz, Heilung, Solo-Ende", () => {
  it("MOMENT-BLOCK: Status 'finished' liegt im SPEICHER (Engine speichert nach dem Handler); Composer zu", async () => {
    const mock = new MockLLM([
      "Schön, dass ihr da seid.",
      "Dann landen wir.\nMOMENT-BLOCK\n" + MOMENT_BLOCK + "\nEND MOMENT-BLOCK",
    ]);
    const backend = memoryBackend(mock);
    const app = await bootApp(backend);
    await app.startChat("moment");
    await ruhe();
    await klick(root.querySelector("#btnChatEnde"));
    await ruhe();
    const gespeichert = await backend.chat.load("shared", "moment");
    expect(gespeichert.status).toBe("finished");                  // der Kern des Bugs
    expect(root.querySelector("#pbComposer").classList.contains("pb-hidden")).toBe(true);
    expect(root.querySelector("#btnChatEnde").classList.contains("pb-hidden")).toBe(true);
  });

  it("Heilung: hängende Qualitätszeit (running + MOMENT-BLOCK in letzter Nachricht) startet frisch, ohne Doppel-Protokoll", async () => {
    const mock = new MockLLM(["Willkommen zurück, womit mögt ihr beginnen?"]);
    const backend = memoryBackend(mock);
    await backend.bstate.set("momentLog", { entries: [{ at: "2026-07-10T18:00:00Z", summary: "Alt." }] });
    await backend.chat.save("shared", "moment", { status: "running", messages: [
      { role: "user", content: "[CLOSE MOMENT]", hidden: true },
      { role: "assistant", content: "Dann landen wir.\nMOMENT-BLOCK\n" + MOMENT_BLOCK + "\nEND MOMENT-BLOCK" },
    ]});
    const app = await bootApp(backend);
    await app.startChat("moment");
    await ruhe();
    expect(root.querySelector("#pbMsgs").textContent).not.toContain("Dann landen wir");   // frisch
    const log = await backend.bstate.get("momentLog");
    expect(log.entries).toHaveLength(1);                          // kein erneuter Dispatch
    expect(app._state.engine.chat.status).toBe("running");        // neue Session läuft
  });

  it("Solo: 'Session abschließen' schickt [CLOSE SESSION]; TIMELINE-BLOCK beendet persistent; nächster Klick beginnt frisch", async () => {
    const mock = new MockLLM([
      "Schön, dass du da bist, Anna.",
      "Dann runden wir ab.\nTIMELINE-BLOCK\n" + TIMELINE_BLOCK + "\nEND TIMELINE-BLOCK",
      "Neues Gespräch: Willkommen.",
    ]);
    const backend = memoryBackend(mock);
    const app = await bootApp(backend);
    await app.startChat("solo");
    await ruhe();
    const ende = root.querySelector("#btnChatEnde");
    expect(ende.classList.contains("pb-hidden")).toBe(false);     // Abschluss-Knopf auch im Reflexionsgespräch
    await klick(ende);
    await ruhe();
    const gesendet = mock.calls[1].messages.filter(m => m.role === "user").pop();
    expect(gesendet.content).toBe("[CLOSE SESSION]");
    expect(gesendet.hidden).toBe(true);
    const gespeichert = await backend.chat.load("mine", "solo");
    expect(gespeichert.status).toBe("finished");
    expect(root.querySelector("#pbComposer").classList.contains("pb-hidden")).toBe(true);
    const zl = await backend.pstate.get("timeline");
    expect(zl.entries).toHaveLength(1);
    // Frischstart
    await app.startChat("solo");
    await ruhe();
    expect(root.querySelector("#pbMsgs").textContent).not.toContain("Dann runden wir ab");
    expect(app._state.engine.chat.status).toBe("running");
  });

  it("Korpus-Kanarien: zweistufiger Abschluss (Frage abwarten, dann Block) in de und en", () => {
    const p = momentPrompt("Anna", "Bernd"), pe = momentPromptEn("Anna", "Bernd");
    expect(p).toContain("ZWEI SCHRITTE");
    expect(p).toContain("WARTE auf ihre Antwort");
    expect(p).toContain("KEIN Block");
    expect(pe).toContain("TWO STEPS");
    expect(pe).toContain("WAIT for their answer");
    expect(steuerTexte.soloAbschluss).toBe("[CLOSE SESSION]");
    expect(steuerTexteEn.soloAbschluss).toBe("[CLOSE SESSION]");
  });
});

/* ── Begriffs-Vereinheitlichung + Zwei-Modi-Öffnung ── */
describe("S80 · Ein Gefäß 'Qualitätszeit', zwei Modi", () => {
  it("nutzerseitig verschwindet 'Gemeinsame Session': Chat-Titel und Wegweiser sagen Qualitätszeit (de/en)", () => {
    expect(korpusTexte["titel.moment"]).toBe("Qualitätszeit");
    expect(korpusTexteEn["titel.moment"]).toBe("Quality time");
    expect(de["weg.messBereit"]).toContain("Qualitätszeit");
    expect(de["weg.messBereit"]).not.toContain("Gemeinsamen Session");
    expect(de["agenda.gruppeAuftraege"]).toBe("Entwicklungsthemen / Ziele");
    expect(en["agenda.gruppeAuftraege"]).toBe("Development themes / goals");
    expect(de["weg.agendaOffen"]).toContain("vor oder räumt sie");   // Handlungsrichtung
    expect(de["regal.btnBesprechen"]).toBe(de["agenda.btnVor"]);     // EIN Wortlaut für EIN Gefäß
  });

  it("Prompt trägt die Zwei-Modi-Öffnung explizit (de/en)", () => {
    const p = momentPrompt("Anna", "Bernd"), pe = momentPromptEn("Anna", "Bernd");
    expect(p).toContain("ZWEI MODI, EIN GEFÄSS");
    expect(p).toContain("keine Kategorie-Wahl vorab");
    expect(pe).toContain("TWO MODES, ONE VESSEL");
  });
});
