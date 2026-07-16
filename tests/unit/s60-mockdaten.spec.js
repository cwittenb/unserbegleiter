// @vitest-environment happy-dom
// S60 · Mockdaten-Wire-Angleichung: Die Dev-Panel-Mockdaten werden gegen die
// ECHTEN Verträge und Leser geprüft (Kanarienvogel gegen künftige Drift),
// dazu die neue Szene "einseitig-frei" und die reboot-feste Szenen-Quittung.

import { describe, it, expect, beforeEach } from "vitest";
import { ArtifactStore } from "../../platforms/artifact/artifact-store.js";
import {
  baueMockdaten, baueReveal, einzelFertigChats, SZENEN, MOCK_META,
  createDevPanel, quittung,
} from "../../platforms/artifact/dev-panel.js";
import { uebergabeSchema, uebergabeTeilKey } from "../../core/contracts/uebergabe.js";
import { befundSchema, aufdeckSchema } from "../../core/contracts/schemas.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { baueSoloKontext, baueMomentKontext } from "../../core/ui/sessions.js";
import { baueAufdeckKontext } from "../../core/ui/kernwetten.js";

function fakeStorage() {
  const w = { true: new Map(), false: new Map() };
  return {
    async get(k, shared) { const v = w[!!shared].get(k); return v === undefined ? null : { value: v }; },
    async set(k, v, shared) { w[!!shared].set(k, v); return { ok: true }; },
    async delete(k, shared) { w[!!shared].delete(k); },
    async list(prefix, shared) { return { keys: [...w[!!shared].keys()].filter(k => k.startsWith(prefix || "")) }; },
  };
}
function bausteine(store, meta = MOCK_META) {
  const repo = new Repo({ store, ns: "PBDEV", code: meta.code, activeModuleId: "betrieb" });
  return { repo, bstate: new Bstate(repo), pstate: new Pstate(repo) };
}
const szene = id => SZENEN.find(s => s.id === id);
const bstateVon = mock => mock.shared[Object.keys(mock.shared).find(k => k.endsWith(":bstate"))];

let store;
beforeEach(() => { store = new ArtifactStore(fakeStorage()); quittung.text = null; });

describe("S60 · Mockdaten entsprechen dem Wire-Schema (Kanarienvogel)", () => {
  const mock = baueMockdaten();
  const b = bstateVon(mock);

  it("Handover: uebergabeSchema grün UND module ist 'kernwetten' (kein Stempel-Überschreiben)", () => {
    for (const rolle of ["A", "B"]) {
      const u = mock.shared[Object.keys(mock.shared).find(k => k.endsWith("handover:" + rolle))];
      expect(uebergabeSchema(u)).toEqual([]);
      expect(u.module).toBe("kernwetten");
    }
  });

  it("findings besteht befundSchema (englisches Wire, S31a)", () => {
    expect(befundSchema(b.findings)).toEqual([]);
    expect(b.findings.sharedGoal.baseline).toEqual({ Anna: 4, Bernd: 6 });
  });

  it("goals: status 'active', art 'shared'/'individual', baseline + seq wie der Writer", () => {
    expect(b.goals.seq).toBe(2);
    const [ag1, ai2] = b.goals.items;
    expect(ag1).toMatchObject({ id: "AG1", art: "shared", status: "active" });
    expect(ag1.baseline).toEqual({ Anna: 4, Bernd: 6 });
    expect(ai2).toMatchObject({ id: "AI2", art: "individual", status: "active", owner: "Bernd" });
    // Die App-Filter (status === "active") finden beide Aufträge:
    expect(b.goals.items.filter(a => a.status === "active")).toHaveLength(2);
  });

  it("momentLog/timeline/shelf/agenda tragen die heutigen Feldnamen (summary/topics/gentleInvitation/wish)", () => {
    expect(b.momentLog.entries[0]).toMatchObject({ summary: expect.any(String), topics: ["gemeinsame Zeit"], gentleInvitation: expect.any(String) });
    expect(b.shelf.items[0].wish).toMatch(/Bescheid/);
    expect(b.agenda.items[0]).toHaveProperty("wish");
    const pA = mock.privat[Object.keys(mock.privat).find(k => k.endsWith("pstate:A"))];
    expect(pA.timeline.entries[0]).toMatchObject({ topics: ["Rückzug"], summary: expect.stringContaining("Absage") });
  });

  it("reveal (beide) im baueAufdeckung-Format; revealLog besteht aufdeckSchema", () => {
    for (const rolle of ["A", "B"]) {
      const g = b.reveal[rolle];
      expect(g.top5).toHaveLength(5);
      expect(g.guess3).toHaveLength(3);
      expect(typeof g.name).toBe("string");
      expect(Date.parse(g.releasedAt)).not.toBeNaN();
    }
    expect(aufdeckSchema(b.revealLog)).toEqual([]);
    // Der echte Kontextbauer kommt mit den Paketen zurecht:
    expect(baueAufdeckKontext(b.reveal.A, b.reveal.B)).toContain("Verlässlichkeit");
  });

  it("Kontextbauer erzeugen mit den Mockdaten keinen 'undefined'-Text", () => {
    const pA = mock.privat[Object.keys(mock.privat).find(k => k.endsWith("pstate:A"))];
    const solo = baueSoloKontext({ goals: b.goals, sharings: [], timeline: pA.timeline, momentLog: b.momentLog, merkposten: null });
    const moment = baueMomentKontext({ goals: b.goals, agenda: b.agenda, momentLog: b.momentLog, messrunde: null, sharings: [], qualitytime: b.qualitytime }, "Anna", "Bernd");
    for (const kontext of [solo, moment]) {
      expect(kontext).not.toContain("undefined");
      expect(kontext).toContain("gemeinsamen Abend");
    }
    expect(moment).toContain("AG1");
  });

  it("Einzel-Chats: freigegeben + minigate 'ja' (konsistent zu den reveal-Paketen)", () => {
    for (const c of Object.values(einzelFertigChats(MOCK_META)))
      expect(c).toMatchObject({ freigegeben: true, nachklang: true, minigate: "ja", status: "running" });
  });
});

describe("S60 · Szenen-Zustandsraum (Aufdeckung)", () => {
  it("freigaben-da: reveal beider Seiten gesetzt, revealLog leer, Betrieb sonst leer", async () => {
    await szene("freigaben-da").wende(store);
    const { bstate } = bausteine(store);
    const reveal = await bstate.get("reveal");
    expect(reveal.A.top5).toHaveLength(5);
    expect(reveal.B.guess3).toHaveLength(3);
    expect(await bstate.get("revealLog")).toBeNull();   // Aufdecken steht erst bevor
    expect(await bstate.get("goals")).toBeNull();       // kein Betriebszustand
    // Lage-Ableitung: aufdeckBereit = reveal.A && reveal.B && !revealLog
    expect(!!(reveal.A && reveal.B)).toBe(true);
  });

  it("betrieb: revealLog vorhanden (aufdeckGelaufen), aufdeckBereit damit false", async () => {
    await szene("betrieb").wende(store);
    const { bstate } = bausteine(store);
    const [reveal, revealLog] = [await bstate.get("reveal"), await bstate.get("revealLog")];
    expect(revealLog.summary).toContain("Verlässlichkeit");
    expect(!!(reveal.A && reveal.B && !revealLog)).toBe(false);
    expect(!!revealLog).toBe(true);
  });
});

describe("S60 · Szene 'einseitig-frei' (meine Klärung fertig, Partner nicht)", () => {
  it("A-Seite komplett (Handover, Chat, reveal.A), B-Seite bewusst leer", async () => {
    await szene("einseitig-frei").wende(store);
    const { repo, bstate } = bausteine(store);
    const [hA, hB] = [
      await repo.get(uebergabeTeilKey("A"), true, "kernwetten"),
      await repo.get(uebergabeTeilKey("B"), true, "kernwetten"),
    ];
    expect(uebergabeSchema(hA)).toEqual([]);
    expect(hB).toBeNull();
    const chatA = await repo.get("chat:A:einzel", false);
    const chatB = await repo.get("chat:B:einzel", false);
    expect(chatA).toMatchObject({ freigegeben: true, minigate: "ja" });
    expect(chatB).toBeNull();
    const reveal = await bstate.get("reveal");
    expect(reveal.A.top5).toHaveLength(5);
    expect(reveal.B).toBeNull();
  });

  it("Lage-Ableitungen je Rolle: als A fertig/wartend, als B unbegonnen", async () => {
    await szene("einseitig-frei").wende(store);
    const { repo } = bausteine(store);
    const hA = await repo.get(uebergabeTeilKey("A"), true, "kernwetten");
    const hB = await repo.get(uebergabeTeilKey("B"), true, "kernwetten");
    const chatB = await repo.get("chat:B:einzel", false);
    // wie ladeLage: handMeins/handPartner + einzelFrei je Rolle
    const alsA = { handMeins: !!hA, handPartner: !!hB, einzelFertig: !!hA };
    const alsB = { handMeins: !!hB, handPartner: !!hA, einzelFertig: !!(chatB && chatB.freigegeben) || !!hB };
    expect(alsA).toEqual({ handMeins: true, handPartner: false, einzelFertig: true });
    expect(alsB).toEqual({ handMeins: false, handPartner: true, einzelFertig: false });
  });
});

describe("S60 · Szenen-Quittung überlebt den reboot", () => {
  const tick = () => new Promise(r => setTimeout(r, 0));
  // S68: Zustands-Läufe haben jetzt echte Wartetakte (Wellen + Backoff) und eine
  // Klick-Sperre — nach dem Klick pollen, bis das Panel wieder frei ist.
  async function klick(el) {
    el.click();
    for (let i = 0; i < 6; i++) await tick();
    const frei = () => ![...document.querySelectorAll("[data-szene], #devLoad, #devWipe")].some(b => b.disabled);
    for (let i = 0; i < 300 && !frei(); i++) await new Promise(r => setTimeout(r, 10));
    for (let i = 0; i < 6; i++) await tick();
  }
  const baue = reboot => createDevPanel({ doc: document, host: document.getElementById("host"), store, reboot });

  it("Szene anwenden → reboot baut Panel neu → Quittung steht im NEUEN Panel; danach verworfen", async () => {
    document.body.innerHTML = '<div id="host"></div>';
    // reboot wie in echt: baut das Panel (und damit devMsg) komplett neu auf
    baue(async () => { baue(async () => {}); });
    await klick(document.querySelector('[data-szene="betrieb"]'));
    expect(document.querySelector("#devMsg").textContent).toContain("eingespielt");
    expect(document.querySelector("#devMsg").textContent).toContain("Betrieb");
    expect(quittung.text).toBeNull();                       // einmalig verbraucht
    // Ein weiterer Neuaufbau OHNE Aktion zeigt nichts mehr:
    baue(async () => {});
    expect(document.querySelector("#devMsg").textContent).toBe("");
  });

  it("auch 'Alles zurücksetzen' und 'Zustand laden' quittieren reboot-fest", async () => {
    document.body.innerHTML = '<div id="host"></div>';
    baue(async () => { baue(async () => {}); });
    await klick(document.querySelector("#devWipe"));
    expect(document.querySelector("#devMsg").textContent).toContain("zurückgesetzt");
    baue(async () => { baue(async () => {}); });
    await klick(document.querySelector('[data-szene="onboarding-fertig"]'));
    await klick(document.querySelector("#devSave"));
    document.body.innerHTML = '<div id="host"></div>';
    baue(async () => { baue(async () => {}); });
    // Save hat das Textfeld des ALTEN Panels gefüllt — hier direkt via Szene + Load-Pfad:
    const dumpFeld = document.querySelector("#devDump");
    dumpFeld.value = JSON.stringify({ version: 1, zeit: "x", shared: { "PBDEV:meta": MOCK_META }, privat: {} });
    await klick(document.querySelector("#devLoad"));
    expect(document.querySelector("#devMsg").textContent).toContain("geladen");
  });
});

describe("S60 · Backlog-Filter (Beifang F1a)", () => {
  it("app.js filtert das Backlog auf 'resting' — den Wert, den der Writer speichert", async () => {
    // Quelle der Wahrheit ist der Writer (sessions.js: op 'rest' → status 'resting');
    // dieser Test bewacht den Gleichklang per Quelltext-Blick (Grep-Wächter-Muster).
    const { readFile } = await import("node:fs/promises");
    const path = await import("node:path");
    // happy-dom überschreibt URL — Auflösung daher über den Vitest-Root (Repo-Wurzel).
    const app = await readFile(path.join(process.cwd(), "core/ui/app.js"), "utf8");
    const sessions = await readFile(path.join(process.cwd(), "core/ui/sessions.js"), "utf8");
    expect(sessions).toContain('it.status = "resting"');
    expect(app).toContain('a.status === "resting"');
    expect(app).not.toContain('a.status === "rest")');
  });
});
