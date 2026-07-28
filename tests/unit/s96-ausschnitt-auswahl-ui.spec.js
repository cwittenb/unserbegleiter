// @vitest-environment happy-dom
// S96.2 · Auswahl-Modus und Vorschau des Dialogausschnitts.
//
// Geprüft wird die OBERFLÄCHE — die Entscheidungen selbst liegen im Kern
// (tests/unit/ausschnitt-auswahl.spec.js). Hier zählt, was die Person sieht,
// was ein Tippen bewirkt, und dass die „…" dort auftauchen, wo sie wirken
// sollen: beim Absender, in der Vorschau.

import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";
import { MockLLM } from "../../core/engine/mock-llm.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { DESIGN_CSS } from "../../core/ui/design.js";

let root;
const ruhe = async (n = 12) => { for (let i = 0; i < n; i++) await new Promise(r => setTimeout(r, 0)); };

function memoryBackend(mock, role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "s96", activeModuleId: "betrieb" });
  const bstate = new Bstate(repo), pstate = new Pstate(repo);
  return {
    info: async () => ({ role, name: "Anna", partner: "Bernd", nameA: "Anna", nameB: "Bernd", locale: "de" }),
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

beforeEach(() => {
  document.body.innerHTML = "<div id='app'></div>";
  const st = document.createElement("style"); st.textContent = DESIGN_CSS; document.head.appendChild(st);
  root = document.querySelector("#app");
});

async function bootApp(backend) {
  const app = createApp({ doc: document, backend, root });
  await app.boot();
  await ruhe();
  return app;
}

// Vier Frage-Antwort-Paare; das dritte reißt die Kriterien.
const VERLAUF = [
  "Was beschäftigt dich?", "Der Streit von Dienstag.",
  "Was macht das mit dir?", "Es wird eng in der Brust.",
  "Und wenn du daran denkst?", "Er ist einfach immer so abweisend.",
  "Was wünschst du dir?", "Dass wir wieder reden.",
];

function eignungBlock(paare) {
  return JSON.stringify({
    pairs: paare.map((p, k) => k === 2
      ? { id: p.id, ownerOk: false, companionOk: true, reason: "Generalisierung statt Situationsbezug" }
      : { id: p.id, ownerOk: true, companionOk: true, reason: null }),
  });
}

/** Fährt eine Solo-Session bis zum Eignungsbericht. */
async function bisAngebot() {
  const antworten = [];
  for (let k = 0; k < VERLAUF.length; k += 2) antworten.push(VERLAUF[k]);
  const backend = memoryBackend(new MockLLM(antworten));
  const app = await bootApp(backend);
  await app.startChat("solo");
  await ruhe();
  for (let k = 1; k < VERLAUF.length; k += 2) {
    root.querySelector("#pbInput").value = VERLAUF[k];
    root.querySelector("#btnSend").click();
    await ruhe();
  }
  const { paareAusVerlauf } = await import("../../core/engine/ausschnitt.js");
  const paare = paareAusVerlauf(app.engine().chat.messages);
  return { backend, app, paare };
}

const paare = box => [...box.querySelectorAll("[data-paar]")];

describe("S96.2 · Auswahl-Modus", () => {
  it("der Zugang wird angeboten, nicht aufgedrängt", async () => {
    const { app, paare: P } = await bisAngebot();
    app.testAusschnitt(JSON.parse(eignungBlock(P)).pairs);
    await ruhe();
    const p = root.querySelector("#ausschnittPanel");
    expect(p.classList.contains("pb-hidden")).toBe(false);
    expect(p.textContent).toContain("Stellen aussuchen");
    // Der Verlauf ist noch unberührt — nichts hat sich aufgedrängt.
    expect(paare(root.querySelector("#pbMsgs"))).toHaveLength(0);
  });

  it("ohne wählbares Paar bleibt die Tür zu", async () => {
    const { app, paare: P } = await bisAngebot();
    app.testAusschnitt(P.map(p => ({ id: p.id, ownerOk: false, companionOk: true, reason: "x" })));
    await ruhe();
    expect(root.querySelector("#ausschnittPanel").classList.contains("pb-hidden")).toBe(true);
  });

  it("startet leer und zeigt alle Paare, auch die nicht wählbaren", async () => {
    const { app, paare: P } = await bisAngebot();
    app.testAusschnitt(JSON.parse(eignungBlock(P)).pairs);
    await ruhe();
    root.querySelector("#btnAuswStart").click();
    await ruhe();
    const bl = paare(root.querySelector("#pbMsgs"));
    expect(bl).toHaveLength(4);
    expect(bl.every(b => b.getAttribute("aria-pressed") === "false")).toBe(true);
    expect(root.querySelector("#btnAuswWeiter").disabled).toBe(true);
    // Kein Häkchen, kein Badge an bestandenen Paaren.
    expect(root.querySelector("#pbMsgs").querySelectorAll("input[type=checkbox]")).toHaveLength(0);
  });

  it("Tippen schaltet an und wieder aus", async () => {
    const { app, paare: P } = await bisAngebot();
    app.testAusschnitt(JSON.parse(eignungBlock(P)).pairs);
    await ruhe();
    root.querySelector("#btnAuswStart").click();
    await ruhe();
    const erstes = () => paare(root.querySelector("#pbMsgs"))[0];
    erstes().click(); await ruhe();
    expect(erstes().getAttribute("aria-pressed")).toBe("true");
    expect(root.querySelector("#auswZaehler").textContent).toContain("1");
    erstes().click(); await ruhe();
    expect(erstes().getAttribute("aria-pressed")).toBe("false");
  });

  // T3b · Der Auswahl-Zustand stand bis dahin als Inline-Style am Element
  // (Rand, Fläche, Deckkraft in einem String). Jetzt tragen ihn Klassen. Das
  // ist die Stelle, an der die Herauslösung still hätte brechen können:
  // aria-pressed käme weiter richtig, aber man SÄHE die Auswahl nicht mehr.
  it("der Auswahl-Zustand steht in Klassen, nicht mehr im style-Attribut", async () => {
    const { app, paare: P } = await bisAngebot();
    app.testAusschnitt(JSON.parse(eignungBlock(P)).pairs);
    await ruhe();
    root.querySelector("#btnAuswStart").click();
    await ruhe();
    const bl = paare(root.querySelector("#pbMsgs"));
    expect(bl.some(b => b.hasAttribute("style")), "kein style-Attribut mehr").toBe(false);
    expect(bl[0].classList.contains("rz-an")).toBe(false);
    expect(bl[2].classList.contains("rz-zu"), "nicht waehlbares Paar").toBe(true);
    bl[0].click(); await ruhe();
    expect(paare(root.querySelector("#pbMsgs"))[0].classList.contains("rz-an")).toBe(true);
  });

  it("ein Kriterien-Verletzer bleibt sichtbar und stumm — der Grund kommt einmal", async () => {
    const { app, paare: P } = await bisAngebot();
    app.testAusschnitt(JSON.parse(eignungBlock(P)).pairs);
    await ruhe();
    root.querySelector("#btnAuswStart").click();
    await ruhe();
    const dritt = () => paare(root.querySelector("#pbMsgs"))[2];
    expect(dritt().getAttribute("aria-disabled")).toBe("true");
    expect(root.querySelector("#pbMsgs").textContent).not.toContain("Generalisierung");
    dritt().click(); await ruhe();
    expect(root.querySelector("#pbMsgs").textContent).toContain("Generalisierung");
    expect(dritt().getAttribute("aria-pressed")).toBe("false");   // trotzdem nicht gewählt
  });

  it("Abbrechen ist lautlos und führt zurück in den Verlauf", async () => {
    const { app, paare: P } = await bisAngebot();
    app.testAusschnitt(JSON.parse(eignungBlock(P)).pairs);
    await ruhe();
    root.querySelector("#btnAuswStart").click();
    await ruhe();
    root.querySelector("#btnAuswAbbruch").click();
    await ruhe();
    expect(paare(root.querySelector("#pbMsgs"))).toHaveLength(0);
    expect(root.querySelector("#btnAuswWeiter")).toBe(null);
  });
});

describe("S96.2 · Vorschau", () => {
  async function bisVorschau(wahl = [0, 1]) {
    const { backend, app, paare: P } = await bisAngebot();
    app.testAusschnitt(JSON.parse(eignungBlock(P)).pairs);
    await ruhe();
    root.querySelector("#btnAuswStart").click();
    await ruhe();
    for (const k of wahl) { paare(root.querySelector("#pbMsgs"))[k].click(); await ruhe(); }
    root.querySelector("#btnAuswWeiter").click();
    await ruhe();
    return { backend, app };
  }

  it("zeigt die Empfängersicht mit der Rahmung", async () => {
    await bisVorschau();
    const txt = root.querySelector("#pbMsgs").textContent;
    expect(txt).toContain("Ein Stück Denkarbeit von Anna");
    expect(root.querySelector("#btnAuswFreigeben")).toBeTruthy();
  });

  it("benachbarte Paare tragen keine Auslassung", async () => {
    await bisVorschau([0, 1]);
    expect(root.querySelector("#pbMsgs").querySelectorAll(".rz-luecke")).toHaveLength(0);
  });

  it("eine Lücke erscheint als „…“ — und NUR hier", async () => {
    await bisVorschau([0, 3]);
    const l = root.querySelector("#pbMsgs").querySelectorAll(".rz-luecke");
    expect(l).toHaveLength(1);
    expect(l[0].textContent).toBe("…");
  });

  it("Entfernen nimmt ein Stück heraus", async () => {
    await bisVorschau([0, 1]);
    root.querySelector("#pbMsgs").querySelector("[data-weg-paar]").click();
    await ruhe();
    expect(root.querySelector("#pbMsgs").querySelectorAll("[data-vorschau]")).toHaveLength(1);
  });

  it("Freigeben ist gesperrt, bis ein Weg gewählt ist", async () => {
    await bisVorschau();
    const frei = root.querySelector("#btnAuswFreigeben");
    expect(frei.disabled).toBe(true);
    const wege = [...root.querySelector("#pbMsgs").querySelectorAll("input[data-weg]")].map(x => x.getAttribute("data-weg"));
    expect(wege).toEqual(["shelf", "moment"]);   // „selbst" entfällt beim Ausschnitt
  });

  it("die Freigabe legt einen Ausschnitt mit Karenz ins Regal", async () => {
    const { backend } = await bisVorschau([0, 3]);
    const box = root.querySelector("#pbMsgs");
    box.querySelector("#auswRahmen").value = "Ein Stück von neulich.";
    box.querySelector("#auswRahmen").dispatchEvent(new document.defaultView.Event("input"));
    const w = box.querySelector('input[data-weg="shelf"]');
    w.checked = true; w.dispatchEvent(new document.defaultView.Event("change"));
    box.querySelector("#btnAuswFreigeben").click();
    await ruhe(30);

    const regal = (await backend.bstate.get("shelf")) || { items: [] };
    expect(regal.items).toHaveLength(1);
    const it = regal.items[0];
    expect(it.kind).toBe("excerpt");
    expect(it.visibleFrom).toBeTruthy();
    expect(it.frame).toBe("Ein Stück von neulich.");
    expect(it.pairs).toHaveLength(2);
    expect(it.pairs[1].gapBefore).toBe(true);        // die Auslassung reist mit
    expect(it.pairs[0].answer).toBe("Der Streit von Dienstag.");   // wörtlich (D1)
  });
});
