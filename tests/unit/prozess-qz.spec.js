// @vitest-environment happy-dom
// Prozessreflexion (Mess-Runden) und Qualitätszeit-Leiter (Sprint 12).

import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";
import {
  trageMessbeitragEin, bereiteRunde, formatiereMessrunde,
  qzStufe, baueQzMaterial, waehleEinladung, keineEinladung, vereinbarePause, QZ_STUFEN_TEXT,
} from "../../core/ui/prozess.js";
import { MockLLM } from "../../core/engine/mock-llm.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";

function memoryBackend(mock, role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "s12", activeModuleId: "betrieb" });
  const bstate = new Bstate(repo), pstate = new Pstate(repo);
  return {
    async info() { return { role, name: role === "A" ? "Anna" : "Bernd", partner: role === "A" ? "Bernd" : "Anna", nameA: "Anna", nameB: "Bernd" }; },
    bstate: { get: f => bstate.get(f), set: (f, v) => bstate.set(f, v) },
    pstate: { get: f => pstate.get(role, f), set: (f, v) => pstate.set(role, f, v) },
    chat: { load: () => null, save: () => true },
    handover: { post: () => {}, get: () => null },
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

const TAG = 86400000;
const vor = tage => new Date(Date.now() - tage * TAG).toISOString();

describe("Mess-Runden · Datenzyklus", () => {
  it("erster Beitrag öffnet Runde, zweiter macht sie bereit; Erlebens-Differenz ≠ Lese-Genauigkeit", async () => {
    const backend = memoryBackend(null);
    const r1 = await trageMessbeitragEin(backend, "A", { closeness: 4, guess: 7, fit: { AG1: 6 } });
    expect(r1.status).toBe("open");
    expect(bereiteRunde(await backend.bstate.get("measurements"))).toBeNull();
    const r2 = await trageMessbeitragEin(backend, "B", { closeness: 8, guess: 5, fit: { AG1: 9 } });
    expect(r2.status).toBe("ready");

    const txt = formatiereMessrunde(r2, "Anna", "Bernd");
    expect(txt).toContain("Erlebens-Differenz 4");                       // |4−8|, Beziehungs-Befund
    expect(txt).toContain("Anna schätzte Bernd auf 7 (tatsächlich 8, Abstand 1)");   // Empathie-Signal
    expect(txt).toContain("Bernd schätzte Anna auf 5 (tatsächlich 4, Abstand 1)");
    expect(txt).toContain("AG1: Anna 6 · Bernd 9");
    expect(txt).toContain("kein Fehler, kein Mittelwert");
  });
});

describe("UI · Prozessreflexion-Widget (verdeckt)", () => {
  it("Anna gibt verdeckt ab; erneutes Öffnen zeigt keinen zweiten Eingabeweg; Bernd macht die Runde bereit", async () => {
    const backendA = memoryBackend(null, "A");
    await backendA.bstate.set("goals", { items: [{ id: "AG1", art: "shared", status: "active", text: "Wöchentlicher Abend" }] });
    const app = createApp({ doc: document, backend: backendA, root });
    await app.boot();
    await klick(root.querySelector("#btnMyRoom"));
    await klick(root.querySelector("#btnMess"));

    const box = root.querySelector("#boxMess");
    expect(box.textContent).toContain("verdeckt");
    expect(box.textContent).toContain("Wöchentlicher Abend");            // Passung je aktivem AG
    box.querySelector("#msNaehe").value = "4";
    box.querySelector("#msZweit").value = "7";
    box.querySelector('[data-pass="AG1"]').value = "6";
    await klick(box.querySelector("#msOk"));
    expect(box.textContent).toContain("verdeckt abgelegt");

    await klick(root.querySelector("#btnMess"));                          // erneut öffnen
    expect(box.textContent).toContain("Dein Beitrag ist abgegeben");
    expect(box.querySelector("#msNaehe")).toBeNull();

    const mr = await backendA.bstate.get("measurements");
    expect(mr.items[0].values.A).toEqual({ closeness: 4, guess: 7, fit: { AG1: 6 } });
  });
});

describe("QZ · Leiter-Logik", () => {
  it("Stufen: <4 Wochen sanft · dann Gründe · Terminhilfe · Pausen-Angebot · Pause", () => {
    const now = () => Date.now();
    expect(qzStufe({ choices: [{ at: vor(3) }] }, now)).toBe(1);
    expect(qzStufe({ choices: [{ at: vor(29) }] }, now)).toBe(2);
    expect(qzStufe({ choices: [{ at: vor(29) }], ladder: { stage2At: vor(1) } }, now)).toBe(3);
    expect(qzStufe({ choices: [{ at: vor(40) }], ladder: { stage2At: vor(5), stage3At: vor(2) } }, now)).toBe(4);
    expect(qzStufe({ choices: [], ladder: { pausedUntil: new Date(Date.now() + TAG).toISOString() } }, now)).toBe("pause");
    expect(qzStufe({ startAt: vor(2), choices: [] }, now)).toBe(1);          // frischer Start: sanft
    expect(QZ_STUFEN_TEXT[2]).toContain("ohne Druck");
  });

  it("Wahl setzt die Leiter zurück; zweimal Nicht-Aufgreifen macht eine Domäne ruhend", async () => {
    const backend = memoryBackend(null);
    const einladungen = [{ text: "Lust auf einen Abendspaziergang?", domain: "Gemeinsame Zeit", source: "resonance" }];
    await keineEinladung(backend, einladungen, 2);
    let qz = await backend.bstate.get("qualitytime");
    expect(qz.resting["Gemeinsame Zeit"]).toBeUndefined();                   // erst 1×
    expect(qz.ladder.stage2At).toBeTruthy();                              // Gründe-Frage gestellt
    await keineEinladung(backend, einladungen, 3);
    qz = await backend.bstate.get("qualitytime");
    expect(qz.resting["Gemeinsame Zeit"]).toBe(true);                        // 2× ⇒ ruhend
    expect(qz.ladder.stage3At).toBeTruthy();

    await waehleEinladung(backend, { text: "Kochen?", domain: "Alltag", source: "negativeSpace" });
    qz = await backend.bstate.get("qualitytime");
    expect(qz.ladder).toEqual({});                                        // Leiter zurückgesetzt
    expect(qz.choices[0].text).toBe("Kochen?");
  });

  it("baueQzMaterial: nur AKTIVE Aufträge, RESTING-Liste, Katalog — kein privates Material", () => {
    const m = baueQzMaterial({
      goals: { items: [{ status: "active", text: "Wöchentlicher Abend" }, { status: "resting", text: "Altes" }] },
      sharings: [{ name: "Anna", items: [{ text: "Nähe zentral" }] }],
      qualitytime: { resting: { Sexualität: true }, choices: [{ at: vor(2), text: "Spaziergang" }] },
    });
    expect(m).toContain("Aufträge: Wöchentlicher Abend");
    expect(m).not.toContain("Altes");
    expect(m).toContain("RESTING (nicht vorschlagen): Sexualität");
    expect(m).toContain("Zuletzt gewählt: Spaziergang");
    expect(m).toContain("CATALOG der Lebensbereiche");
  });
});

describe("UI · QZ-Fächer-Drehbuch (echte Engine, QUALITYTIME-BLOCK)", () => {
  const FAECHER = JSON.stringify({ invitations: [
    { text: "Lust, am Sonntag zusammen zu kochen?", domain: "Alltagsgestaltung", source: "resonance" },
    { text: "Lust auf einen kleinen Ausflug ins Grüne?", domain: "Abenteuer", source: "negativeSpace" },
  ]});

  it("Einladungen holen → Karten erscheinen; Wählen persistiert die Wahl", async () => {
    const mock = new MockLLM(["QUALITYTIME-BLOCK\n" + FAECHER + "\nEND QUALITYTIME-BLOCK"]);
    const backend = memoryBackend(mock);
    const app = createApp({ doc: document, backend, root });
    await app.boot();
    await klick(root.querySelector("#btnSharedRoom"));
    await klick(root.querySelector("#btnQz"));
    await klick(root.querySelector("#qzHolen"));

    const karten = root.querySelector("#qzKarten");
    expect(karten.textContent).toContain("zusammen zu kochen");
    expect(karten.textContent).toContain("Ausflug ins Grüne");
    expect(mock.calls[0].messages[0].content).toContain("MATERIAL");       // qzSys arbeitet nur damit

    await klick(karten.querySelector('[data-qzw="0"]'));
    const qz = await backend.bstate.get("qualitytime");
    expect(qz.choices[0].domain).toBe("Alltagsgestaltung");
    expect(karten.textContent).toContain("nichts nachgehalten");
  });

  it("ungültiger Fächer (nur 1 Einladung) läuft durch die Korrektur-Runde der Engine", async () => {
    const kaputt = JSON.stringify({ invitations: [{ text: "x", domain: "y", source: "resonance" }] });
    const mock = new MockLLM([
      "QUALITYTIME-BLOCK\n" + kaputt + "\nEND QUALITYTIME-BLOCK",
      "QUALITYTIME-BLOCK\n" + FAECHER + "\nEND QUALITYTIME-BLOCK",
    ]);
    const backend = memoryBackend(mock);
    const app = createApp({ doc: document, backend, root });
    await app.boot();
    await klick(root.querySelector("#btnSharedRoom"));
    await klick(root.querySelector("#btnQz"));
    await klick(root.querySelector("#qzHolen"));
    expect(mock.calls).toHaveLength(2);                                    // genau eine Korrektur
    expect(mock.calls[1].messages.some(m => m.hidden && m.content.includes("SYSTEM-REVISION"))).toBe(true);
    expect(root.querySelector("#qzKarten").textContent).toContain("zusammen zu kochen");
  });
});

describe("UI · Aufdeckung im Moment", () => {
  it("bereite Runde fließt formatiert in den MOMENT-CONTEXT; MOMENT-BLOCK markiert sie aufgedeckt", async () => {
    const moment = JSON.stringify({ summary: "Aufgedeckt und besprochen.", topics: ["Nähe"], gentleInvitation: null });
    const mock = new MockLLM([
      "Schön, dass ihr da seid.",
      "MOMENT-BLOCK\n" + moment + "\nEND MOMENT-BLOCK",
    ]);
    const backend = memoryBackend(mock);
    await trageMessbeitragEin(backend, "A", { closeness: 4, guess: 7, fit: {} });
    await trageMessbeitragEin(backend, "B", { closeness: 8, guess: 5, fit: {} });
    const app = createApp({ doc: document, backend, root });
    await app.boot();
    await app.startChat("moment");
    await tick();

    expect(mock.calls[0].messages[0].content).toContain("Erlebens-Differenz 4");   // verdeckt im Kontext

    root.querySelector("#pbInput").value = "Wir schließen ab.";
    await klick(root.querySelector("#btnSend"));
    const mr = await backend.bstate.get("measurements");
    expect(mr.items[0].status).toBe("revealed");
  });
});
