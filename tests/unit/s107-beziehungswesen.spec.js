// @vitest-environment happy-dom
// S107 · Beziehungswesen statt Empathie-Signal.
//
// Ersetzt s92-verlauf-lesemarker: Der Musterleser (`pruefeLeserichtung`) und
// der Lese-Marker im Einzelkanal sind ersatzlos entfallen. Sie waren die
// reinste Form dessen, was mit dem Empathie-Signal verworfen wurde — eine
// Aussage über eine PERSON, abgeleitet aus einer Trefferquote.
//
// Was an ihre Stelle tritt: Beide bewerten dasselbe Dritte. Damit gibt es
// keinen wahren Wert mehr, an dem jemand falsch liegen könnte, keine Rollen
// (Ratender / Geratener) — und nichts zu vergleichen.
// Siehe docs/designnotiz-beziehungswesen.md.

import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { formatiereVerlauf, formatiereMessrunde, trageMessbeitragEin } from "../../core/ui/prozess.js";
import * as prozess from "../../core/ui/prozess.js";
import { setKorpusSprache } from "../../core/prompts/prompts.js";
import { de } from "../../core/i18n/de.js";
import { en } from "../../core/i18n/en.js";

function memoryBackend(role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "s107", activeModuleId: "betrieb" });
  const bstate = new Bstate(repo), pstate = new Pstate(repo);
  return {
    store, repo,
    async info() { return { role, name: role === "A" ? "Anna" : "Bernd", partner: role === "A" ? "Bernd" : "Anna", nameA: "Anna", nameB: "Bernd" }; },
    bstate: { get: f => bstate.get(f), set: (f, v) => bstate.set(f, v) },
    pstate: { get: f => pstate.get(role, f), set: (f, v) => pstate.set(role, f, v) },
    chat: { load: async () => null, save: async () => true },
    handover: { post: async () => {}, get: async () => null },
    llm: async () => ({ text: "ok", stop: "end_turn" }),
  };
}
const tick = () => new Promise(r => setTimeout(r, 0));
const ruhe = async (n = 8) => { for (let i = 0; i < n; i++) await tick(); };
let root;
beforeEach(() => {
  setKorpusSprache("de");
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app");
});

/** Aufgedeckte Runde: beide bewerten DASSELBE — das Wesen. */
const runde = (id, at, { wA, wB, fit = {}, wirk = {} }) => ({
  id, startAt: at, revealedAt: at, status: "revealed",
  values: {
    A: { wesen: wA, fit, wirksamkeit: wirk, at },
    B: { wesen: wB, fit, wirksamkeit: wirk, at },
  },
});

/* ═══════════ Was verschwunden ist ═══════════ */

describe("S107 · Das Empathie-Signal ist fort", () => {
  it("der Musterleser existiert nicht mehr", () => {
    // `pruefeLeserichtung` las aus drei Runden ein Muster ("du überliest ihre
    // Not") und machte daraus ein Angebot. Sauber gebaut — und eine Aussage
    // über eine Person, abgeleitet aus einer Trefferquote.
    expect(prozess.pruefeLeserichtung).toBeUndefined();
    expect(prozess.formatiereLeseMarker).toBeUndefined();
  });

  it("die Oberfläche fragt nicht mehr nach der Fremdvermutung", () => {
    expect(de["mess.guess"]).toBeUndefined();
    expect(de["mess.closeness"]).toBeUndefined();
    expect(en["mess.guess"]).toBeUndefined();
    expect(en["mess.closeness"]).toBeUndefined();
  });

  it("der Korpus kennt keine Lese-Genauigkeit mehr", async () => {
    const { korpusTexte } = await import("../../core/prompts/prompts.de.js");
    expect(korpusTexte["mess.lese"]).toBeUndefined();
  });
});

/* ═══════════ Was an seine Stelle tritt ═══════════ */

describe("S107 · Das Beziehungswesen", () => {
  it("die Frage steht in beiden Sprachen — mit der Erläuterung dabei", () => {
    for (const [name, k] of [["DE", de], ["EN", en]]) {
      expect(k["mess.wesen"], name).toBeTruthy();
      expect(k["mess.wesenHilfe"], name).toBeTruthy();
    }
    // Die Metapher trägt nur, wenn sie im Moment des Antwortens da ist.
    expect(de["mess.wesenHilfe"]).toMatch(/eigenständiges Wesen/);
  });

  it("die Mess-Runde nimmt Wesen, Passung und Wirksamkeit auf", async () => {
    const backend = memoryBackend();
    await trageMessbeitragEin(backend, "A", { wesen: 7, fit: { AG1: 8 }, wirksamkeit: { AG1: 4 } });
    const mr = await backend.bstate.get("measurements");
    const werte = mr.items[0].values.A;
    expect(werte.wesen).toBe(7);
    expect(werte.fit).toEqual({ AG1: 8 });
    expect(werte.wirksamkeit).toEqual({ AG1: 4 });
    expect(werte.closeness).toBeUndefined();
    expect(werte.guess).toBeUndefined();
  });

  it("der Kontext nennt den Abstand als zwei Sichten, nicht als Fehler", () => {
    const r = runde("MR1", "2026-06-01T10:00:00Z", { wA: 8, wB: 3 });
    const text = formatiereMessrunde(r, "Anna", "Bernd");
    expect(text).toContain("Beziehungswesen: Anna 8 · Bernd 3");
    expect(text).toContain("Abstand 5");
    expect(text).toMatch(/kein Fehler, kein Mittelwert/);
    // Nichts über Genauigkeit — es gibt keine.
    expect(text).not.toMatch(/schätzte|Lese-Genauigkeit|Abstand \d.*tatsächlich/);
  });

  it("Passung UND Wirksamkeit stehen je Thema im Kontext", () => {
    const r = runde("MR1", "2026-06-01T10:00:00Z", {
      wA: 6, wB: 6, fit: { AG1: 9 }, wirk: { AG1: 3 },
    });
    const text = formatiereMessrunde(r, "Anna", "Bernd");
    expect(text).toMatch(/Passung.*AG1: Anna 9/s);
    expect(text).toMatch(/Wirksamkeit je Thema.*AG1: Anna 3/s);
  });

  it("die Trajektorie zeigt beide Kurven, nichts Verrechnetes", () => {
    const mr = { items: [
      runde("MR1", "2026-05-01T10:00:00Z", { wA: 4, wB: 7 }),
      runde("MR2", "2026-06-01T10:00:00Z", { wA: 6, wB: 7 }),
      { id: "MR3", status: "ready", values: { A: { wesen: 8 }, B: { wesen: 8 } } },
    ] };
    const v = formatiereVerlauf(mr, "Anna", "Bernd");
    expect(v).toContain("2026-05-01: Beziehungswesen Anna 4 · Bernd 7 (Abstand 3)");
    expect(v).toContain("2026-06-01: Beziehungswesen Anna 6 · Bernd 7 (Abstand 1)");
    expect(v).not.toContain("MR3");            // ready zählt nicht zum Verlauf
    expect(formatiereVerlauf({ items: [] }, "Anna", "Bernd")).toBeNull();
  });
});

/* ═══════════ Die Oberfläche ═══════════ */

describe("S107 · Die Mess-Runde im Vorraum", () => {
  /* Der Raum wird BETRETEN, nicht per show() umgeschaltet — nur der Weg über
     den Knopf lädt die Runde (dieselbe Lektion wie in S99.1). `findings`
     schaltet den Knopf frei. */
  async function imProzessraum(ziele = []) {
    const backend = memoryBackend();
    await backend.bstate.set("goals", { items: ziele });
    await backend.bstate.set("findings", { at: new Date().toISOString() });
    const app = createApp({ doc: document, backend, root });
    await app.boot(); await ruhe();
    root.querySelector("#btnMyRoom").click(); await ruhe();
    root.querySelector("#btnMess").click(); await ruhe(14);
    return { app, backend };
  }

  it("ein Wesen-Regler, kein Fremdvermutungs-Regler", async () => {
    await imProzessraum();
    expect(root.querySelector("#msWesen"), "Wesen-Regler fehlt").toBeTruthy();
    expect(root.querySelector("#msZweit"), "Fremdvermutung muss weg sein").toBeNull();
    expect(root.querySelector("#msNaehe")).toBeNull();
  });

  it("zwei Regler je Thema — Passung und Wirksamkeit", async () => {
    await imProzessraum([
      { id: "AG1", text: "Ein fester gemeinsamer Abend", status: "active", art: "shared", confirmedByBoth: true },
    ]);
    expect(root.querySelectorAll("[data-pass]")).toHaveLength(1);
    expect(root.querySelectorAll("[data-wirk]")).toHaveLength(1);
  });

  it("bei einem Thema sind es drei Regler — weniger als vorher", async () => {
    // Die Auflösung erzeugt genau EIN gemeinsames Ziel. Der Normalfall ist
    // also 1 + 2 = drei; vorher waren es 2 + 1. Eine Obergrenze für die
    // Mess-Runde wäre die falsche Antwort auf die falsche Frage.
    await imProzessraum([
      { id: "AG1", text: "Ein fester gemeinsamer Abend", status: "active", art: "shared", confirmedByBoth: true },
    ]);
    expect(root.querySelectorAll('input[type="range"]')).toHaveLength(3);
  });
});

/* ═══════════ S109 · Kontext und Prompt sagen dasselbe ═══════════ */

describe("S109 · Kein Rest der alten Sprache", () => {
  it("die Kontext-Kopftexte tragen die neue Regel (de+en)", async () => {
    /* Gefunden beim Nachsehen, nicht durch einen Lauf: `mk.prozessKopf` sagte
       weiterhin "einzelne Zahlen darfst du häppchenweise aussprechen, Treffer
       zuerst" — das Gegenteil des Prompts seit S107. Der Kontext steht NÄHER an
       den Daten als der Prompt; ein Widerspruch dort wiegt schwerer.
       Derselbe Fehlertyp wie MRV-01 in S108, nur zwischen Kontext und Prompt
       statt innerhalb des Prompts. */
    const de = await import("../../core/prompts/prompts.de.js");
    const en = await import("../../core/prompts/prompts.en.js");
    expect(de.korpusTexte["mk.prozessKopf"]).toContain("sprich KEINE Zahlen aus");
    expect(en.korpusTexte["mk.prozessKopf"]).toContain("do NOT speak out numbers");
  });

  it("der Nachtrag nennt auch die fragefreie Nachricht (S108)", async () => {
    const de = await import("../../core/prompts/prompts.de.js");
    expect(de.korpusTexte["mk.prozessNachtrag"]).toContain("OHNE Frage");
  });

  it("die verwaisten Lese-Marker-Texte sind entfernt", async () => {
    // Sie gehörten zu pruefeLeserichtung — ohne Aufrufer, aber im Korpus.
    const de = await import("../../core/prompts/prompts.de.js");
    const en = await import("../../core/prompts/prompts.en.js");
    for (const k of ["mess.markerDistanz", "mess.markerUeber", "mess.markerUnter"]) {
      expect(de.korpusTexte[k], k).toBeUndefined();
      expect(en.korpusTexte[k], k).toBeUndefined();
    }
  });

  it("der sichtbare Untertitel verspricht nicht mehr die alte Frage", async () => {
    const { de } = await import("../../core/i18n/de.js");
    const { en } = await import("../../core/i18n/en.js");
    expect(de["mein.messSub"]).toContain("Beziehungswesen");
    expect(de["mein.messSub"]).not.toContain("Nähe");
    expect(en["mein.messSub"]).toContain("relationship being");
    expect(en["mein.messSub"]).not.toContain("closeness");
  });
});
