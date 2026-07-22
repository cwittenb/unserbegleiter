// @vitest-environment happy-dom
// S92 · Verlaufs-Verbraucher nach Slice 3: formatiereVerlauf (Trajektorien-
// Material, nur mit bereiter Runde im Kontext), pruefeLeserichtung (Muster
// statt Schwellenwert, Vorzeichen-Bias) und der Lese-Marker im Einzelkanal
// (einmal je Musterlage — merken statt melden).

import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";
import { MockLLM } from "../../core/engine/mock-llm.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { freigebeUebergabe } from "../../core/engine/freigabe.js";
import { uebergabeTeilKey } from "../../core/contracts/uebergabe.js";
import { formatiereVerlauf, pruefeLeserichtung, trageMessbeitragEin, markiereAufgedeckt } from "../../core/ui/prozess.js";
import { setKorpusSprache } from "../../core/prompts/prompts.js";

function memoryBackend(mock, role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "s92", activeModuleId: "betrieb" });
  const bstate = new Bstate(repo), pstate = new Pstate(repo);
  return {
    store, repo,
    async info() { return { role, name: role === "A" ? "Anna" : "Bernd", partner: role === "A" ? "Bernd" : "Anna", nameA: "Anna", nameB: "Bernd" }; },
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
  setKorpusSprache("de");
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app");
});
async function bootApp(backend) {
  const app = createApp({ doc: document, backend, root });
  await app.boot(); await ruhe();
  return app;
}
const $id = id => root.querySelector("#" + id);

/** Aufgedeckte Runde mit gegebenen Werten (guessA rät Bs Nähe, guessB rät As). */
function revealedRunde(id, at, { nA, nB, gA, gB }) {
  return { id, startAt: at, revealedAt: at, status: "revealed",
    values: { A: { closeness: nA, guess: gA, fit: {}, at }, B: { closeness: nB, guess: gB, fit: {}, at } } };
}

describe("S92 · formatiereVerlauf", () => {
  it("letzte k aufgedeckte Runden, Abstände JE RICHTUNG, nichts verrechnet; null ohne Verlauf", () => {
    const mr = { items: [
      revealedRunde("MR1", "2026-05-01T10:00:00Z", { nA: 3, nB: 7, gA: 3, gB: 6 }),
      revealedRunde("MR2", "2026-06-01T10:00:00Z", { nA: 5, nB: 7, gA: 6, gB: 7 }),
      { id: "MR3", status: "ready", values: { A: { closeness: 6, guess: 7, fit: {} }, B: { closeness: 7, guess: 5, fit: {} } } },
    ] };
    const v = formatiereVerlauf(mr, "Anna", "Bernd");
    expect(v).toContain("MESS-VERLAUF");
    expect(v).toContain("2026-05-01: Nähe Anna 3 · Bernd 7 — Lese-Abstand Anna→Bernd: 4 · Bernd→Anna: 3");
    expect(v).toContain("2026-06-01: Nähe Anna 5 · Bernd 7 — Lese-Abstand Anna→Bernd: 1 · Bernd→Anna: 2");
    expect(v).not.toContain("MR3");                       // ready zählt nicht zum Verlauf
    // Datenzeilen tragen nur Rohwerte je Richtung — nichts Verrechnetes
    // (der KOPF darf die Verbote natürlich benennen):
    expect(v.split("\n").slice(1).join("\n")).not.toMatch(/Mittel|Schnitt|Score|Index/);
    expect(formatiereVerlauf({ items: [] }, "Anna", "Bernd")).toBeNull();
    // k begrenzt:
    const viele = { items: [1, 2, 3, 4].map(i => revealedRunde("MR" + i, "2026-0" + i + "-01T10:00:00Z", { nA: i, nB: 5, gA: 5, gB: 5 })) };
    const v2 = formatiereVerlauf(viele, "Anna", "Bernd", 3);
    expect(v2).not.toContain("2026-01-01");
    expect(v2).toContain("2026-04-01");
  });
});

describe("S92 · pruefeLeserichtung (Muster statt Schwellenwert)", () => {
  const basis = (ds /* Richtung A→B: guessA - closenessB */) => ({ items: ds.map((d, i) =>
    revealedRunde("MR" + (i + 1), "2026-0" + (i + 1) + "-01T10:00:00Z", { nA: 5, nB: 5, gA: 5 + d, gB: 5 })) });

  it("Vorzeichen-Bias: dreimal überschätzt bzw. unterschätzt in Folge", () => {
    expect(pruefeLeserichtung(basis([1, 2, 1]), "A").muster).toBe("ueberschaetzt");
    expect(pruefeLeserichtung(basis([-2, -1, -1]), "A").muster).toBe("unterschaetzt");
  });

  it("Distanz-Muster (≥3 dreimal in Folge) schlägt den Bias; gemischte Vorzeichen mit kleinen Abständen sind KEIN Muster", () => {
    expect(pruefeLeserichtung(basis([3, -4, 3]), "A").muster).toBe("distanz");
    expect(pruefeLeserichtung(basis([1, -1, 2]), "A")).toBeNull();
    expect(pruefeLeserichtung(basis([1, 0, 2]), "A")).toBeNull();      // eine Punktlandung bricht den Bias
  });

  it("zu wenige aufgedeckte Runden ⇒ null; nur revealed zählt; Richtung ist getrennt", () => {
    expect(pruefeLeserichtung(basis([2, 2]), "A")).toBeNull();
    const mr = basis([2, 2, 2]);
    mr.items[2].status = "ready";
    expect(pruefeLeserichtung(mr, "A")).toBeNull();
    // Richtung B→A (guessB - closenessA) ist hier neutral:
    expect(pruefeLeserichtung(basis([2, 2, 2]), "B")).toBeNull();
    // Schlüssel trägt Muster + Runden-IDs:
    expect(pruefeLeserichtung(basis([2, 2, 2]), "A").schluessel).toBe("ueberschaetzt:MR1+MR2+MR3");
  });
});

describe("S92 · Momentkontext & Nachtrag", () => {
  it("MESS-VERLAUF steht im Kontext NUR zusammen mit einer bereiten Runde (Kontext entsteht je frischem Chat)", async () => {
    // Szenario a: Verlauf vorhanden, nichts bereit ⇒ kein kaltes Historien-Öffnen
    const b1 = memoryBackend(new MockLLM(["Hallo ihr zwei."]));
    await b1.bstate.set("measurements", { items: [
      revealedRunde("MR1", "2026-05-01T10:00:00Z", { nA: 3, nB: 7, gA: 3, gB: 6 }),
    ] });
    const app1 = await bootApp(b1);
    await app1.startChat("moment"); await ruhe();
    expect(JSON.stringify((await b1.chat.load("shared", "moment")).messages)).not.toContain("MESS-VERLAUF");

    // Szenario b (frischer Chat): Verlauf + bereite Runde ⇒ beides im Kontext
    document.body.innerHTML = '<div id="app"></div>'; root = document.getElementById("app");
    const b2 = memoryBackend(new MockLLM(["Hallo ihr zwei."]));
    await b2.bstate.set("measurements", { items: [
      revealedRunde("MR1", "2026-05-01T10:00:00Z", { nA: 3, nB: 7, gA: 3, gB: 6 }),
    ] });
    await trageMessbeitragEin(b2, "A", { closeness: 6, guess: 7, fit: {} });
    await trageMessbeitragEin(b2, "B", { closeness: 7, guess: 5, fit: {} });
    const app2 = await bootApp(b2);
    await app2.startChat("moment"); await ruhe();
    const inhalt = JSON.stringify((await b2.chat.load("shared", "moment")).messages);
    expect(inhalt).toContain("MESS-VERLAUF");
    expect(inhalt).toContain("META-REFLECTION");
  });

  it("der S89b-Nachtrag führt den Verlauf identisch mit", async () => {
    const backend = memoryBackend(new MockLLM(["Schön, dass ihr da seid.", "Dann schauen wir drauf."]));
    await backend.bstate.set("measurements", { items: [
      revealedRunde("MR1", "2026-05-01T10:00:00Z", { nA: 3, nB: 7, gA: 7, gB: 6 }),
    ] });
    const app = await bootApp(backend);
    await app.startChat("moment"); await ruhe();               // Start: revealed, aber nichts bereit
    await trageMessbeitragEin(backend, "A", { closeness: 6, guess: 7, fit: {} });
    await trageMessbeitragEin(backend, "B", { closeness: 7, guess: 5, fit: {} });
    $id("pbInput").value = "Sie ist drin!";
    await klick($id("btnSend")); await ruhe();
    const chat = await backend.chat.load("shared", "moment");
    const nachtrag = chat.messages.find(m => m.hidden && /jetzt bereit/.test(m.content || ""));
    expect(nachtrag.content).toContain("MESS-VERLAUF");
  });
});

describe("S92 · Lese-Marker im Einzelkanal (merken statt melden)", () => {
  const biasRunden = { items: [1, 2, 3].map(i =>
    revealedRunde("MR" + i, "2026-0" + i + "-01T10:00:00Z", { nA: 5, nB: 4, gA: 4 + 2, gB: 5 })) };   // A überschätzt B dreimal

  it("Muster ⇒ Marker-Block im Solo-Kontext; pstate merkt den Schlüssel; zweiter Start spielt NICHT erneut ein", async () => {
    const backend = memoryBackend(new MockLLM(["Hallo Anna.", "Willkommen zurück."]));
    await backend.bstate.set("measurements", biasRunden);
    const app = await bootApp(backend);
    await app.startChat("solo"); await ruhe();
    let chat = await backend.chat.load("mine", "solo");
    const kontext = chat.messages.find(m => m.hidden);
    expect(kontext.content).toContain("LESE-MARKER");
    expect(kontext.content).toContain("ÜBERSCHÄTZT");
    expect((await backend.pstate.get("leseMarker")).schluessel).toBe("ueberschaetzt:MR1+MR2+MR3");
    // Wiederbetreten: gleiche Musterlage ⇒ kein zweites Einspielen
    await klick($id("btnChatZurueck"));
    await app.startChat("solo"); await ruhe();
    chat = await backend.chat.load("mine", "solo");
    expect(chat.messages.filter(m => /LESE-MARKER/.test(m.content || "")).length).toBe(1);
  });

  it("neue Musterlage (Fenster verschoben) ⇒ neuer Schlüssel feuert wieder; ohne Muster nie", async () => {
    const backend = memoryBackend(new MockLLM(["Hallo.", "Hallo nochmal."]));
    await backend.bstate.set("measurements", biasRunden);
    const app = await bootApp(backend);
    await app.startChat("solo"); await ruhe();
    await klick($id("btnChatZurueck"));
    // Kontext entsteht je frischem Chat: die erste Sitzung gilt als abgeschlossen
    const alt1 = await backend.chat.load("mine", "solo");
    alt1.status = "finished";
    await backend.chat.save("mine", "solo", alt1);
    // vierte Runde, weiter überschätzt → Fenster MR2+MR3+MR4, neuer Schlüssel
    const mr = await backend.bstate.get("measurements");
    mr.items.push(revealedRunde("MR4", "2026-04-01T10:00:00Z", { nA: 5, nB: 4, gA: 6, gB: 5 }));
    await backend.bstate.set("measurements", mr);
    await app.startChat("solo"); await ruhe();
    const chat = await backend.chat.load("mine", "solo");   // frischer Chat ersetzt den abgeschlossenen
    expect(chat.messages.filter(m => /LESE-MARKER/.test(m.content || "")).length).toBe(1);
    expect((await backend.pstate.get("leseMarker")).schluessel).toBe("ueberschaetzt:MR2+MR3+MR4");
  });

  it("die Gegenrolle bekommt aus DIESEM Muster keinen Marker (Richtungen getrennt)", async () => {
    const backend = memoryBackend(new MockLLM(["Hallo Bernd."]), "B");
    await backend.bstate.set("measurements", biasRunden);      // Muster liegt in Richtung A→B
    const app = await bootApp(backend);
    await app.startChat("solo"); await ruhe();
    const chat = await backend.chat.load("mine", "solo");
    expect(JSON.stringify(chat.messages)).not.toContain("LESE-MARKER");
  });
});
