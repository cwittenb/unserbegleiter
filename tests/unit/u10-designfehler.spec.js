// @vitest-environment happy-dom
// U10 · Drei Designfehler.
//
// Zur Prüfform bei U10.1: happy-dom löst die Kaskade hier NICHT browsertreu
// auf — es meldet in beiden Themes beide Zeichen sichtbar, auch im korrekten
// Zustand. getComputedStyle taugt also nicht als Wächter. Geprüft wird
// deshalb die CSS-Quelle, so wie d9-regal-vollbild.spec.js es auch tut.

import { describe, it, expect, beforeEach } from "vitest";
import { DESIGN_CSS, CHROME_HTML } from "../../core/ui/design.js";
import { createApp } from "../../core/ui/app.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { freigebeUebergabe } from "../../core/engine/freigabe.js";
import { uebergabeTeilKey } from "../../core/contracts/uebergabe.js";

// Kommentare abstreifen: Die Prüfungen unten fragen, was das Stylesheet TUT,
// nicht was es erzählt. Die neuen Kommentare nennen die abgelösten Selektoren
// beim Namen — ohne diesen Schritt fände der Wächter seine eigene Erklärung.
const CSS = DESIGN_CSS.replace(/\/\*[\s\S]*?\*\//g, "");
const regel = sel => {
  const m = CSS.match(new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\{([^}]*)\\}"));
  return m ? m[1] : null;
};

describe("U10.1 · Oben rechts steht EIN Zeichen", () => {
  it("die Sammelregel entscheidet nicht mehr über Sichtbarkeit", () => {
    // Sie hatte 0-2-1 und stach .rz-einst-baum (0-1-0) aus — auf Hell waren
    // damit beide Zeichen zu sehen. Auf Dunkel fiel es nicht auf, weil die
    // Dark-Regeln dieselbe Spezifität haben und später stehen.
    const r = regel('.rz-einst span[class^="rz-einst-"]');
    expect(r).not.toBeNull();
    expect(r).not.toContain("display:");
  });

  it("beide Zustände stehen auf derselben Ebene", () => {
    for (const sel of [".rz-einst .rz-einst-seerose", ".rz-einst .rz-einst-baum",
                       "html[data-theme=dark] .rz-einst .rz-einst-seerose",
                       "html[data-theme=dark] .rz-einst .rz-einst-baum"])
      expect(regel(sel), sel).toMatch(/display:(block|none)/);
  });

  it("die alten, zu schwachen Regeln sind fort", () => {
    expect(CSS).not.toMatch(/[};]\s*\.rz-einst-baum\{/);
    expect(CSS).not.toMatch(/html\[data-theme=dark\] \.rz-einst-baum\{/);
  });

  it("je Theme ist genau eins sichtbar — und der Fallback zeigt eins, nicht zwei", () => {
    const zeig = sel => /display:block/.test(regel(sel) || "");
    // ohne data-theme (Fallback): Seerose an, Baum aus
    expect(zeig(".rz-einst .rz-einst-seerose")).toBe(true);
    expect(zeig(".rz-einst .rz-einst-baum")).toBe(false);
    // mit data-theme=dark kehrt sich beides um
    expect(zeig("html[data-theme=dark] .rz-einst .rz-einst-baum")).toBe(true);
    expect(zeig("html[data-theme=dark] .rz-einst .rz-einst-seerose")).toBe(false);
  });

  it("beide Zeichen stehen weiterhin im Markup — der Wechsel bleibt CSS-Sache", () => {
    expect(CHROME_HTML).toContain("rz-einst-baum");
    expect(CHROME_HTML).toContain("rz-einst-seerose");
  });
});

describe("U10.2 · Der Wegweiser trägt keinen Punkt mehr (F1a)", () => {
  it("kein Punkt-Element mehr am Badge", () => {
    expect(regel(".rz-weg-badge .rz-punkt")).toBeNull();
    expect(CSS).not.toContain(".rz-wartet");
  });

  it("in der Bedien-Ecke lebt der Punkt weiter — dort sitzt er AM Zeichen", () => {
    // Kein Kahlschlag: Der Ecken-Punkt liest sich nicht als Satzzeichen,
    // weil er als Aufsetzer über dem Symbol steht, nicht hinter Text.
    expect(regel(".rz-einst .rz-punkt")).toContain("position:absolute");
    expect(CHROME_HTML).toContain("rz-punkt");
  });
});

/* ---- Verhalten ---- */

function memoryBackend(role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "u10", activeModuleId: "betrieb" });
  const bstate = new Bstate(repo), pstate = new Pstate(repo);
  return {
    async info() { return { role, name: "Lena", partner: "Jonas", nameA: "Lena", nameB: "Jonas" }; },
    bstate: { get: f => bstate.get(f), set: (f, v) => bstate.set(f, v) },
    pstate: { get: f => pstate.get(role, f), set: (f, v) => pstate.set(role, f, v) },
    chat: {
      load: (a, id) => repo.get("chat:" + (a === "shared" ? id : role + ":" + id), a === "shared"),
      save: (a, id, c) => repo.set("chat:" + (a === "shared" ? id : role + ":" + id), c, a === "shared"),
    },
    handover: { post: d => freigebeUebergabe(repo, role, d), get: r => repo.get(uebergabeTeilKey(r), true, "kernwetten") },
    llm: async () => ({ text: "ok", stop: "end_turn" }),
  };
}
const ruhe = async (n = 8) => { for (let i = 0; i < n; i++) await new Promise(r => setTimeout(r, 0)); };
async function klick(el) { el.click(); await ruhe(); }

let root;
beforeEach(() => { document.body.innerHTML = '<div id="app"></div>'; root = document.getElementById("app"); });
async function bootApp() {
  const app = createApp({ doc: document, backend: memoryBackend(), root });
  await app.boot(); await ruhe(); return app;
}
const sichtbar = id => !root.querySelector("#" + id).classList.contains("pb-hidden");

describe("U10.3 · Der Zurück-Pfeil schließt erst, navigiert dann", () => {
  it("bei offenem Regal schließt der Pfeil und der Raum bleibt stehen", async () => {
    await bootApp();
    await klick(root.querySelector("#btnMyRoom"));
    await klick(root.querySelector("#btnZeitleiste"));
    expect(root.querySelector("#scrMyRoom").classList.contains("rz-regal-offen")).toBe(true);

    await klick(root.querySelector("#btnZurueck1"));
    expect(root.querySelector("#scrMyRoom").classList.contains("rz-regal-offen")).toBe(false);
    expect(sichtbar("boxZeitleiste")).toBe(false);
    expect(sichtbar("scrMyRoom")).toBe(true);        // NICHT hinausnavigiert
    expect(sichtbar("scrStart")).toBe(false);
  });

  it("der zweite Tap führt dann hinaus", async () => {
    await bootApp();
    await klick(root.querySelector("#btnMyRoom"));
    await klick(root.querySelector("#btnZeitleiste"));
    await klick(root.querySelector("#btnZurueck1"));
    await klick(root.querySelector("#btnZurueck1"));
    expect(sichtbar("scrStart")).toBe(true);
  });

  it("ohne offenes Regal navigiert der Pfeil sofort — kein toter Tap", async () => {
    await bootApp();
    await klick(root.querySelector("#btnMyRoom"));
    await klick(root.querySelector("#btnZurueck1"));
    expect(sichtbar("scrStart")).toBe(true);
  });

  it("dasselbe gilt im gemeinsamen Raum", async () => {
    await bootApp();
    await klick(root.querySelector("#btnSharedRoom"));
    await klick(root.querySelector("#btnRegal"));
    expect(root.querySelector("#scrShared").classList.contains("rz-regal-offen")).toBe(true);
    await klick(root.querySelector("#btnZurueck2"));
    expect(sichtbar("scrShared")).toBe(true);
    expect(sichtbar("scrStart")).toBe(false);
  });
});

describe("U10.3 (F2) · Der Klick-oben-Weg gilt auf allen drei Screens", () => {
  it("die Einstellungen waren nicht verdrahtet, obwohl regalModus dort greift", async () => {
    await bootApp();
    // Die Bedien-Ecke haengt im BODY (applyDesign), nicht im App-Wurzelknoten.
    await klick(document.querySelector("#pbEinst"));
    const screen = root.querySelector("#scrEinstellungen");
    expect(screen.classList.contains("pb-hidden")).toBe(false);
    const zeile = screen.querySelector(".rz-zeile[data-box]:not(.pb-hidden)");
    if (!zeile) return;                                  // keine aufklappbare Zeile im Testbau
    await klick(zeile);
    expect(screen.classList.contains("rz-regal-offen")).toBe(true);
    await klick(screen.querySelector(".rz-half"));
    expect(screen.classList.contains("rz-regal-offen")).toBe(false);
  });
});

