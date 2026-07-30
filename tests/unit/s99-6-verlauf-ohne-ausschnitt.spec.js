// @vitest-environment happy-dom
// S99.6 · Jede abgeschlossene Reflexion hinterlässt einen abrufbaren Wortlaut.
//
// Bis hierher hing die Ablage AUSSCHLIESSLICH am EXCERPT-BLOCK (S95.7a): Kam
// kein Eignungsbericht — oder war kein Paar wählbar —, wurde nichts aufbewahrt.
// Dann trägt der Zeitleisten-Eintrag keine Kennung, und in der nächsten
// Reflexion ist der Wortlaut-Abruf konstruktionsbedingt unmöglich. Der
// verdrahtete Abruf aus S99.5 liefe in genau diesem Normalfall ins Leere.
//
// Dazu ein zweiter Befund, der beim Umbau auffiel: hefteVerlaufAn hängte die
// Kennung an den jüngsten Zeitleisten-Eintrag ÜBERHAUPT. Kam der
// Eignungsbericht vor dem Abschluss-Eintrag — der Normalfall —, landete der
// frische Verlauf am Eintrag der VORIGEN Sitzung. Ein Abruf hätte dann das
// falsche Gespräch geholt.

import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";
import { MockLLM } from "../../core/engine/mock-llm.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { VERLAUF_PRAEFIX, EINST_VERLAUF, holeVerlauf } from "../../core/ui/verlauf-ablage.js";
import { de } from "../../core/i18n/de.js";

function memoryBackend(mock, role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "s996", activeModuleId: "betrieb" });
  const bstate = new Bstate(repo), pstate = new Pstate(repo);
  return {
    /** Felder des persoenlichen Bundles — fuer die Frage "wie oft wurde
     *  abgelegt?". Pstate haelt alles in EINEM Speicherschluessel; die
     *  "eigenen Schluessel je Verlauf" sind Felder darin. */
    __felder: () => {
      const roh = [...store._priv.entries()].find(([k]) => k.endsWith("pstate:" + role));
      return roh ? Object.keys(JSON.parse(roh[1])) : [];
    },
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
const ruhe = async (n = 14) => { for (let i = 0; i < n; i++) await tick(); };

let root;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app");
});

const TIMELINE = JSON.stringify({
  summary: "Anna hat über die Absage gesprochen.", topics: ["Absage"],
  recurrenceNote: null, goals: [],
});
const ABSCHLUSS = "Alles Gute für heute.\nTIMELINE-BLOCK\n" + TIMELINE + "\nEND TIMELINE-BLOCK";

/** Ein vollständiges Reflexionsgespräch bis zum Abschluss. */
async function bisAbschluss(backend, { eignung = null } = {}) {
  const app = createApp({ doc: document, backend, root });
  await app.boot();
  await ruhe();
  await app.startChat("solo");
  await ruhe();
  root.querySelector("#pbInput").value = "Die Absage am Dienstag.";
  root.querySelector("#btnSend").click();
  await ruhe();
  if (eignung) { app.testAusschnitt(eignung); await ruhe(); }
  await klick(root.querySelector("#btnChatEnde"));
  await klick(root.querySelector("#btnEndeJa"));
  await ruhe(20);
  return app;
}

function mockOhneAusschnitt() {
  return new MockLLM(["Was beschäftigt dich?", "Und was macht das mit dir?", ABSCHLUSS]);
}

const verlaufSchluessel = backend => backend.pstate.get("__nichts__").then(() => null);

describe("S99.6 · Aufbewahren am Sitzungsende", () => {
  it("ohne Eignungsbericht wird trotzdem aufbewahrt — und die Kennung sitzt am Eintrag", async () => {
    const backend = memoryBackend(mockOhneAusschnitt());
    await bisAbschluss(backend);
    const zl = await backend.pstate.get("timeline");
    expect(zl.entries).toHaveLength(1);
    expect(zl.entries[0].vid, "der Eintrag braucht eine Kennung").toBeTruthy();
    const verlauf = await holeVerlauf(backend, zl.entries[0].vid);
    expect(verlauf).toBeTruthy();
    expect(JSON.stringify(verlauf.messages)).toContain("Die Absage am Dienstag.");
  });

  it("der aufbewahrte Verlauf liegt unter eigenem Schlüssel, nicht in der Zeitleiste", async () => {
    const backend = memoryBackend(mockOhneAusschnitt());
    await bisAbschluss(backend);
    const zl = await backend.pstate.get("timeline");
    expect(JSON.stringify(zl)).not.toContain("Die Absage am Dienstag.");
    expect(await backend.pstate.get(VERLAUF_PRAEFIX + zl.entries[0].vid)).toBeTruthy();
  });

  it("die Erst-Information fällt genau einmal, an der Stelle des Composers", async () => {
    const backend = memoryBackend(mockOhneAusschnitt());
    await bisAbschluss(backend);
    const zeile = root.querySelector("#verlaufAusgang");
    expect(zeile.classList.contains("pb-hidden")).toBe(false);
    expect(zeile.textContent).toContain("bleibt in deinem Raum");
    expect(await backend.pstate.get("verlaufInfoGezeigt")).toBe(true);

    // Zweite Sitzung: dieselbe Mitteilung kommt nicht noch einmal.
    const app2 = await bisAbschluss(memoryBackendMit(backend));
    expect(root.querySelector("#verlaufAusgang").classList.contains("pb-hidden")).toBe(true);
    expect(app2).toBeTruthy();
  });

  /** Zweite Sitzung auf DEMSELBEN Speicher. */
  function memoryBackendMit(alt) {
    return Object.assign({}, alt, { llm: mockOhneAusschnitt().fn() });
  }
});

describe("S99.6 · Genau eine Ablage", () => {
  it("mit Eignungsbericht wird nicht doppelt abgelegt — und die Eignung bleibt erhalten", async () => {
    const backend = memoryBackend(new MockLLM(["Was beschäftigt dich?", "Und was macht das mit dir?"]));
    const app = createApp({ doc: document, backend, root });
    await app.boot();
    await ruhe();
    await app.startChat("solo");
    await ruhe();
    root.querySelector("#pbInput").value = "Die Absage am Dienstag.";
    root.querySelector("#btnSend").click();
    await ruhe();

    // Erst jetzt stehen die Paar-Kennungen fest (sie stammen aus den
    // Nachrichten-Indizes) — der Eignungsbericht kann sie nennen.
    const { paareAusVerlauf } = await import("../../core/engine/ausschnitt.js");
    const paare = paareAusVerlauf(app.engine().chat.messages);
    expect(paare.length).toBeGreaterThan(0);
    const eignung = JSON.stringify({
      pairs: paare.map(p => ({ id: p.id, ownerOk: true, companionOk: true, reason: null })),
    });
    app.engine().llm = new MockLLM([
      // Schritt 1: die Gabelung samt Eignungsbericht, ohne Abschluss-Block.
      "Magst du dir Stellen aussuchen, die Bernd lesen darf?\nEXCERPT-BLOCK\n" + eignung + "\nEND EXCERPT-BLOCK",
      // Schritt 2: nach der Antwort die Landung.
      ABSCHLUSS,
    ]).fn();

    await klick(root.querySelector("#btnChatEnde"));
    await klick(root.querySelector("#btnEndeJa"));
    await ruhe(20);
    root.querySelector("#pbInput").value = "Nein, das behalte ich für mich.";
    root.querySelector("#btnSend").click();
    await ruhe(20);

    const zl = await backend.pstate.get("timeline");
    expect(zl.entries).toHaveLength(1);
    expect(zl.entries[0].vid).toBeTruthy();
    // GENAU EINE Ablage — der Abschluss legt nicht noch einmal nach.
    const abgelegte = backend.__felder().filter(k => k.startsWith(VERLAUF_PRAEFIX));
    expect(abgelegte).toHaveLength(1);
    // Und die Eignung des Ausschnitt-Wegs ist erhalten geblieben (das Replay
    // darf kein Modell rufen).
    const verlauf = await holeVerlauf(backend, zl.entries[0].vid);
    expect(verlauf.eignung).toBeTruthy();
  });

  it("die Kennung landet NIE am Eintrag der vorigen Sitzung", async () => {
    const backend = memoryBackend(mockOhneAusschnitt());
    // Eine ältere Sitzung ohne Kennung liegt schon in der Chronik.
    await backend.pstate.set("timeline", { entries: [
      { at: "2020-01-01T10:00:00Z", topics: ["Alt"], summary: "Ein altes Gespräch." },
    ]});
    await bisAbschluss(backend);
    const zl = await backend.pstate.get("timeline");
    expect(zl.entries).toHaveLength(2);
    expect(zl.entries[0].vid, "der alte Eintrag bleibt unberührt").toBeUndefined();
    expect(zl.entries[1].vid).toBeTruthy();
    const verlauf = await holeVerlauf(backend, zl.entries[1].vid);
    expect(JSON.stringify(verlauf.messages)).toContain("Die Absage am Dienstag.");
  });
});

describe("S99.6 · K3 · Bei 'jedes Mal fragen' wird gefragt", () => {
  it("die Frage steht am Ausgang, und ohne Ja bleibt nichts liegen", async () => {
    const backend = memoryBackend(mockOhneAusschnitt());
    await backend.pstate.set(EINST_VERLAUF, "fragen");
    await bisAbschluss(backend);
    const zeile = root.querySelector("#verlaufAusgang");
    expect(zeile.classList.contains("pb-hidden")).toBe(false);
    expect(zeile.textContent).toContain(de["verlauf.frageJa"]);
    // Vorgabe ist NEIN: solange niemand zustimmt, trägt der Eintrag nichts.
    const zl = await backend.pstate.get("timeline");
    expect(zl.entries[0].vid).toBeUndefined();

    await klick(root.querySelector("#vlAusNein"));
    expect(root.querySelector("#verlaufAusgang").classList.contains("pb-hidden")).toBe(true);
    expect((await backend.pstate.get("timeline")).entries[0].vid).toBeUndefined();
  });

  it("ein Ja legt ab und versorgt den Eintrag dieser Sitzung", async () => {
    const backend = memoryBackend(mockOhneAusschnitt());
    await backend.pstate.set(EINST_VERLAUF, "fragen");
    await bisAbschluss(backend);
    await klick(root.querySelector("#vlAusJa"));
    await ruhe();
    const zl = await backend.pstate.get("timeline");
    expect(zl.entries[0].vid).toBeTruthy();
    expect(await holeVerlauf(backend, zl.entries[0].vid)).toBeTruthy();
  });
});

describe("S99.6 · Aufbewahren ist Komfort, kein Muss", () => {
  it("ein Speicherfehler kostet die Teilbarkeit, nie den Abschluss", async () => {
    const backend = memoryBackend(mockOhneAusschnitt());
    const echtesSet = backend.pstate.set;
    backend.pstate.set = (f, v) =>
      String(f).startsWith(VERLAUF_PRAEFIX) ? Promise.reject(new Error("Speicher weg")) : echtesSet(f, v);
    const app = await bisAbschluss(backend);
    expect(app._state.engine.chat.status).toBe("finished");
    const zl = await backend.pstate.get("timeline");
    expect(zl.entries).toHaveLength(1);
    expect(zl.entries[0].vid).toBeUndefined();
    expect(await verlaufSchluessel(backend)).toBeNull();
  });
});
