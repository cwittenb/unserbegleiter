// @vitest-environment happy-dom
// Regal-Heben, Gelesen-Markierung, Agenda und MOMENT-KONTEXT (Sprint 11).

import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";
import { baueMomentKontext, hebeInAgenda, markiereGelesen, raeumeAgendaAb } from "../../core/ui/sessions.js";
import { MockLLM } from "../../core/engine/mock-llm.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";

function memoryBackend(mock, { role = "B", name = "Bernd", partner = "Anna" } = {}) {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "s11", activeModuleId: "betrieb" });
  const bstate = new Bstate(repo), pstate = new Pstate(repo);
  return {
    async info() { return { role, name, partner, nameA: "Anna", nameB: "Bernd" }; },
    bstate: { get: f => bstate.get(f), set: (f, v) => bstate.set(f, v) },
    pstate: { get: f => pstate.get(role, f), set: (f, v) => pstate.set(role, f, v) },
    chat: { load: () => null, save: () => true },
    uebergabe: { post: () => {}, get: () => null },
    llm: mock ? mock.fn() : async () => ({ text: "ok" }),
  };
}

const tick = () => new Promise(r => setTimeout(r, 0));
async function klick(el) { el.click(); await tick(); await tick(); await tick(); }
let root;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app");
});

describe("baueMomentKontext (Modell-Kontrakt: app-interne erste Nachricht)", () => {
  it("voller Kontext: Aufträge/Agenda/frühere Momente/Freigaben, Namen am Ende", () => {
    const k = baueMomentKontext({
      auftraege: { items: [
        { id: "AG1", art: "gemeinsam", status: "aktiv", text: "Wöchentlicher Abend" },
        { id: "AI2", art: "individuell", owner: "B", status: "ruhend", text: "Früher offline" },
        { id: "AG3", art: "gemeinsam", status: "abgeschlossen", text: "Alt" },
      ]},
      agenda: { items: [
        { von: "Anna", text: "Mehr gemeinsame Abende", wunsch: "2/Woche", zustand: "offen" },
        { von: "Bernd", text: "Erledigt", zustand: "besprochen" },
      ]},
      momentprotokoll: { eintraege: [{ at: "2026-06-20T10:00:00Z", zusammenfassung: "Gut verbunden.", zwischenzeitImpuls: "Spaziergang" }] },
      messrunde: null,
      freigaben: [{ name: "Anna", items: [{ id: "S1", text: "Nähe zentral" }] }],
    }, "Anna", "Bernd");
    expect(k).toContain("MOMENT-KONTEXT");
    expect(k).toContain("AG1 (gemeinsam, aktiv): Wöchentlicher Abend");
    expect(k).toContain("AI2 (individuell, B, ruhend)");
    expect(k).not.toContain("AG3");                                 // abgeschlossene raus
    expect(k).toContain("von Anna: Mehr gemeinsame Abende (Wunsch: 2/Woche)");
    expect(k).not.toContain("Erledigt");                            // nur offene Agenda
    expect(k).toContain("2026-06-20: Gut verbunden. · Zwischenzeit-Impuls war: Spaziergang");
    expect(k).toContain("von Anna: Nähe zentral");
    expect(k).toContain("Namen: Anna (A), Bernd (B).");
  });

  it("Erst-Termin: leere Quellen werden ehrlich benannt (keine offene Tür)", () => {
    const k = baueMomentKontext({ auftraege: null, agenda: null, momentprotokoll: null, messrunde: null, freigaben: [] }, "Anna", "Bernd");
    expect(k).toContain("AUFTRÄGE: noch keine.");
    expect(k).toContain("AGENDA: leer.");
    expect(k).toContain("erste Termin (keine offene Tür)");
    expect(k).toContain("ZWISCHENZEIT-MATERIAL: keines.");
  });
});

describe("UI · Regal-Heben und Gelesen (Pull-Prinzip)", () => {
  it("Bernd sieht bei Annas Eintrag Gelesen/Heben; eigener Eintrag hat keine Knöpfe; Heben erzeugt Agenda-Item mit Herkunft", async () => {
    const backend = memoryBackend(null);   // Bernd
    await backend.bstate.set("regal", { items: [
      { id: "RG1", text: "Annas Fassung", wunsch: "Mehr Zeit", von: "Anna", gelesen: false },
      { id: "RG2", text: "Bernds eigene", von: "Bernd", gelesen: false },
    ]});
    const app = createApp({ doc: document, backend, root });
    await app.boot();
    await klick(root.querySelector("#btnSharedRoom"));
    await klick(root.querySelector("#btnRegal"));

    expect(root.querySelector('[data-gelesen="RG1"]')).toBeTruthy();
    expect(root.querySelector('[data-heben="RG1"]')).toBeTruthy();
    expect(root.querySelector('[data-gelesen="RG2"]')).toBeNull();   // eigener Eintrag: keine Knöpfe

    await klick(root.querySelector('[data-gelesen="RG1"]'));
    expect((await backend.bstate.get("regal")).items[0].gelesen).toBe(true);
    expect(root.querySelector("#regalItems").textContent).toContain("gelesen");

    await klick(root.querySelector('[data-heben="RG1"]'));
    const agenda = await backend.bstate.get("agenda");
    expect(agenda.items).toHaveLength(1);
    expect(agenda.items[0]).toMatchObject({ text: "Annas Fassung", wunsch: "Mehr Zeit", von: "Anna", herkunft: "regal", zustand: "offen" });
    expect((await backend.bstate.get("regal")).items[0].gehoben).toBe(true);
    expect(root.querySelector('[data-heben="RG1"]')).toBeNull();     // kein Doppel-Heben
    await hebeInAgenda(backend, "RG1");                              // auch mechanisch idempotent
    expect((await backend.bstate.get("agenda")).items).toHaveLength(1);
  });

  it("Agenda-Ansicht: offene Punkte lassen sich als „selbst geklärt\" abräumen", async () => {
    const backend = memoryBackend(null);
    await backend.bstate.set("agenda", { items: [
      { id: "AGD1", text: "Mehr Abende", von: "Anna", zustand: "offen" },
    ]});
    const app = createApp({ doc: document, backend, root });
    await app.boot();
    await klick(root.querySelector("#btnSharedRoom"));
    await klick(root.querySelector("#btnAgenda"));
    expect(root.querySelector("#agendaItems").textContent).toContain("offen");
    await klick(root.querySelector('[data-abr="AGD1"]'));
    expect((await backend.bstate.get("agenda")).items[0].zustand).toBe("selbstGeklaert");
    expect(root.querySelector('[data-abr="AGD1"]')).toBeNull();
  });
});

describe("UI · MOMENT-KONTEXT fließt in die gemeinsame Session", () => {
  it("neue Session: Kontext geht als VERSTECKTE erste Nachricht ans Modell, erscheint aber nicht im Chat", async () => {
    const mock = new MockLLM(["Schön, dass ihr da seid."]);
    const backend = memoryBackend(mock);
    await backend.bstate.set("agenda", { items: [{ id: "AGD1", text: "GEHOBENES-THEMA", von: "Anna", zustand: "offen" }] });
    const app = createApp({ doc: document, backend, root });
    await app.boot();
    await app.startChat("moment");
    await tick();

    const anModell = mock.calls[0].messages;
    expect(anModell[0].hidden).toBe(true);
    expect(anModell[0].content).toContain("MOMENT-KONTEXT");
    expect(anModell[0].content).toContain("GEHOBENES-THEMA");
    expect(anModell[1].content).toContain("Wir sind beide da");
    expect(root.querySelector("#pbMsgs").textContent).not.toContain("MOMENT-KONTEXT");   // versteckt
  });
});
