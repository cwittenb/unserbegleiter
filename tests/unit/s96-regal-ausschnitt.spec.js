// @vitest-environment happy-dom
// S96.3 · Regal-Seite des Dialogausschnitts.
//
// Zwei Dinge, die erst hier sichtbar werden:
//   (1) Ein Ausschnitt ist eine SZENE, keine Aussage. Als Fließtext gelesen
//       verlöre er genau das, was ihn wertvoll macht — dass man dem Denken
//       beim Arbeiten zusieht.
//   (2) „Noch zurückziehbar" ist ein RUHIGER Zustand, kein Countdown. Ein
//       tickender Timer erzeugt die Anspannung, gegen die die Karenz gedacht ist.

import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { DESIGN_CSS } from "../../core/ui/design.js";
import { KARENZ_MS } from "../../core/engine/regal.js";

let root;
const ruhe = async (n = 12) => { for (let i = 0; i < n; i++) await new Promise(r => setTimeout(r, 0)); };

function backendMit(items, role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "s963", activeModuleId: "betrieb" });
  const bstate = new Bstate(repo), pstate = new Pstate(repo);
  const namen = { A: "Anna", B: "Bernd" };
  return {
    _bstate: bstate,
    info: async () => ({ role, name: namen[role], partner: namen[role === "A" ? "B" : "A"], nameA: "Anna", nameB: "Bernd", locale: "de" }),
    bstate: { get: f => (f === "shelf" ? Promise.resolve({ items }) : bstate.get(f)), set: (f, v) => bstate.set(f, v) },
    pstate: { get: f => pstate.get(role, f), set: (f, v) => pstate.set(role, f, v) },
    chat: { load: async () => null, save: async () => {} },
    handover: { post: async () => {}, get: async () => null },
    llm: async () => ({ text: "ok", stop: "end_turn" }),
  };
}

const AUSSCHNITT = (over = {}) => ({
  id: "RG1", freigabe: "FG1", kind: "excerpt", by: "Anna", role: "A",
  text: null, frame: "Ein Stück von neulich.",
  pairs: [
    { question: "Was macht das mit dir?", answer: "Es wird eng in der Brust.", gapBefore: false },
    { question: "Was wünschst du dir?", answer: "Dass wir wieder reden.", gapBefore: true },
  ],
  at: new Date().toISOString(), read: false,
  visibleFrom: new Date(Date.now() - 1000).toISOString(),   // Karenz vorbei
  ...over,
});

const NACHRICHT = (over = {}) => ({
  id: "RG2", freigabe: "FG2", kind: "message", by: "Anna", role: "A",
  text: "Ich vermisse gemeinsame Abende.", wish: null,
  at: new Date().toISOString(), read: false,
  visibleFrom: new Date(Date.now() - 1000).toISOString(),
  ...over,
});

beforeEach(() => {
  document.body.innerHTML = "<div id='app'></div>";
  const st = document.createElement("style"); st.textContent = DESIGN_CSS; document.head.appendChild(st);
  root = document.querySelector("#app");
});

async function regalZeigen(items, role = "A") {
  const backend = backendMit(items, role);
  const app = createApp({ doc: document, backend, root });
  await app.boot();
  await ruhe();
  const knopf = root.querySelector("[data-regal]") || root.querySelector("#btnRegal");
  if (knopf) { knopf.click(); await ruhe(); }
  return { app, backend, box: root.querySelector("#regalItems") };
}

describe("S96.3 · Darstellung", () => {
  it("ein Ausschnitt erscheint als Dialog, nicht als Fließtext", async () => {
    const { box } = await regalZeigen([AUSSCHNITT()], "B");
    expect(box.querySelectorAll(".rz-paar-lesen")).toHaveLength(2);
    expect(box.textContent).toContain("Was macht das mit dir?");
    expect(box.textContent).toContain("Es wird eng in der Brust.");
  });

  it("die Rahmung nennt es Denkarbeit, nicht ein Gespräch", async () => {
    const { box } = await regalZeigen([AUSSCHNITT()], "B");
    expect(box.textContent).toContain("Ein Stück Denkarbeit von Anna");
  });

  it("der Rahmensatz steht außen, nicht zwischen den Zügen", async () => {
    const { box } = await regalZeigen([AUSSCHNITT()], "B");
    const rahmen = box.querySelector(".rz-rahmensatz");
    expect(rahmen.textContent).toBe("Ein Stück von neulich.");
    expect(box.querySelector(".rz-ausschnitt").firstElementChild.className).toContain("rz-denkarbeit");
  });

  it("die Auslassung erscheint auch beim Empfänger als „…“", async () => {
    const { box } = await regalZeigen([AUSSCHNITT()], "B");
    const l = box.querySelectorAll(".rz-luecke");
    expect(l).toHaveLength(1);
    expect(l[0].textContent).toBe("…");
  });

  it("ohne Rahmensatz fehlt die Zeile ganz", async () => {
    const { box } = await regalZeigen([AUSSCHNITT({ frame: null })], "B");
    expect(box.querySelector(".rz-rahmensatz")).toBe(null);
  });

  it("eine Selbstmitteilung bleibt Fließtext", async () => {
    const { box } = await regalZeigen([NACHRICHT()], "B");
    expect(box.querySelectorAll(".rz-paar-lesen")).toHaveLength(0);
    expect(box.textContent).toContain("Ich vermisse gemeinsame Abende.");
  });
});

describe("S96.3 · Rücknahme", () => {
  const inKarenz = over => AUSSCHNITT({ visibleFrom: new Date(Date.now() + KARENZ_MS).toISOString(), ...over });

  it("der Owner sieht einen ruhigen Zustand — keinen Countdown", async () => {
    const { box } = await regalZeigen([inKarenz()], "A");
    expect(box.textContent).toContain("Noch zurückziehbar");
    expect(box.querySelector("[data-zurueck]")).toBeTruthy();
    // Keine Zeitangabe, keine laufende Zahl.
    expect(box.textContent).not.toMatch(/\d+\s*(Minuten|min|Sekunden)/);
  });

  it("nach Ablauf der Karenz ist der Knopf weg — endgültig ist endgültig", async () => {
    const { box } = await regalZeigen([AUSSCHNITT()], "A");
    expect(box.querySelector("[data-zurueck]")).toBe(null);
    expect(box.textContent).not.toContain("Noch zurückziehbar");
  });

  it("der Knopf trägt die FREIGABE, nicht die Item-Kennung — er räumt beide Fächer", async () => {
    const { box } = await regalZeigen([inKarenz()], "A");
    expect(box.querySelector("[data-zurueck]").getAttribute("data-zurueck")).toBe("FG1");
  });

  it("der Empfänger bekommt keinen Rücknahme-Knopf", async () => {
    // (In der Karenz sieht er das Item ohnehin nicht — hier der Fall danach.)
    const { box } = await regalZeigen([AUSSCHNITT()], "B");
    expect(box.querySelector("[data-zurueck]")).toBe(null);
  });
});
