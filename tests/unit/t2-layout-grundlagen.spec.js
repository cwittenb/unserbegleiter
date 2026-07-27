// @vitest-environment happy-dom
// T2 · Wächter über die Layout-Grundlagen aus dem Turn-40-Handover.
//
// Stufe A der zweistufigen Absicherung: happy-dom hat keine Layout-Engine,
// gemessene Höhen sind dort nicht prüfbar. Diese Tests halten deshalb den
// MECHANISMUS fest — dass das Polster an einem Token hängt, dass min-height:0
// nie allein steht, dass die Regal-Mechanik ausgenommen bleibt. Das gemessene
// Ergebnis bleibt Sichtprüfung (Stufe B, Prüfliste im Protokoll).

import { describe, it, expect, beforeEach } from "vitest";
import { DESIGN_CSS } from "../../core/ui/design.js";
import { THEME_CSS } from "../../core/ui/theme.js";
import { createApp } from "../../core/ui/app.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";

const tick = () => new Promise(r => setTimeout(r, 0));
const ruhe = async (n = 6) => { for (let i = 0; i < n; i++) await tick(); };

function memoryBackend(role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "t2", activeModuleId: "betrieb" });
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
    llm: async () => ({ text: "ok", stop: "end_turn" }),
  };
}

let root;
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app");
});

const KOMPONENTEN_CSS = DESIGN_CSS.slice(DESIGN_CSS.indexOf(THEME_CSS) + THEME_CSS.length);

/** Eine einzelne CSS-Regel am Selektor herausschneiden. */
function regel(css, selektor) {
  const i = css.indexOf(selektor + "{");
  if (i < 0) return "";
  return css.slice(i, css.indexOf("}", i) + 1);
}

describe("T2a · der Screenrand hängt an einem Token", () => {
  it("--rz-rand trägt den Ist-Wert des Layouts", () => {
    expect(THEME_CSS).toContain("--rz-rand:24px;");
  });

  it("die Zonen polstern über den Token, nicht über eine Zahl", () => {
    expect(regel(KOMPONENTEN_CSS, ".rz-half")).toContain("padding:30px var(--rz-rand)");
    expect(regel(KOMPONENTEN_CSS, ".rz-weg-panel")).toContain("padding:30px var(--rz-rand)");
  });

  it("die Schreibkante rechnet ihre negativen Ränder aus demselben Token", () => {
    const r = regel(KOMPONENTEN_CSS, "#scrChat .rz-chat-unten");
    expect(r).toContain("calc(-1 * var(--rz-rand))");
    expect(r).toContain("var(--rz-rand)");
    // Der eigentliche Befund aus §3.8: ein Literal hier und ein Literal beim
    // Screenpolster können auseinanderlaufen. Kein negatives px mehr.
    expect(r.match(/-\d+px/g) || []).toEqual([]);
  });

  it("das Chat-Screenpolster kommt aus demselben Token", () => {
    const r = regel(KOMPONENTEN_CSS, ".rz-app #scrChat");
    expect(r).toContain("var(--rz-rand)");
    expect(r).not.toContain(" 24px");
  });
});

describe("T2b · Freiraum an der Naht", () => {
  it("--rz-nahtfrei ist angelegt und liegt auf dem 4er-Raster", () => {
    const m = THEME_CSS.match(/--rz-nahtfrei:(\d+)px/);
    expect(m, "--rz-nahtfrei fehlt").toBeTruthy();
    expect(Number(m[1]) % 4).toBe(0);
    // Das Badge ist 32px hoch und sitzt zur Hälfte über der Naht.
    expect(Number(m[1])).toBeGreaterThanOrEqual(32);
  });

  it("das Polster greift nur am Zonenfuß der ERSTEN Hälfte", () => {
    expect(KOMPONENTEN_CSS)
      .toContain(".rz-split>.rz-half:first-child .rz-fuss{padding-bottom:var(--rz-nahtfrei)}");
    expect(KOMPONENTEN_CSS)
      .not.toContain(".rz-split>.rz-half:last-child .rz-fuss{padding-bottom:");
  });

  it("die Bestandsregel für den aufgeklappten Zustand bleibt stehen", () => {
    expect(KOMPONENTEN_CSS).toContain(".rz-regal-offen>.rz-half:last-child .rz-fuss{display:none}");
  });
});

describe("T2c · die obere Zone rollt, statt in die Naht zu laufen", () => {
  const R = ".rz-split:not(.rz-regal-offen)>.rz-half:first-child{";
  const block = KOMPONENTEN_CSS.slice(KOMPONENTEN_CSS.indexOf(R),
    KOMPONENTEN_CSS.indexOf("}", KOMPONENTEN_CSS.indexOf(R)) + 1);

  it("die Regel existiert und ist auf den zugeklappten Zustand eingeschränkt", () => {
    expect(KOMPONENTEN_CSS).toContain(R);
    expect(block).toContain("overflow:auto");
    expect(block).toContain("overscroll-behavior:contain");
  });

  it("min-height:0 steht nie ohne overflow", () => {
    // Der Fehler, den der Handover ausdrücklich benennt: min-height:0 allein
    // lässt die Zone still unter ihren Inhalt schrumpfen.
    for (const r of KOMPONENTEN_CSS.match(/\.rz-half[^{}]*\{[^}]*min-height:0[^}]*\}/g) || [])
      expect(r, r).toMatch(/overflow:/);
  });

  it("die Regal-Mechanik behält ihr overflow:hidden", () => {
    expect(KOMPONENTEN_CSS).toContain(".rz-screen .rz-half:first-child{overflow:hidden}");
  });
});

describe("T2b/T2c · die Naht-Aufbauten hängen in der zweiten Hälfte", () => {
  // Voraussetzung dafür, dass der Rollbereich der ersten Hälfte Badge, Panel
  // und Kulisse nicht wegklippt. Stünden sie in der ersten Hälfte, wäre
  // "scrollen" (K1) die falsche Entscheidung gewesen.
  it("Badge, Wegweiser-Panel und Naht-Kulisse liegen im rz-naht-anker", async () => {
    const app = createApp({ doc: document, backend: memoryBackend(), root });
    await app.boot();
    await ruhe();
    for (const id of ["scrStart", "scrMyRoom", "scrShared"]) {
      const screen = root.querySelector("#" + id);
      const haelften = screen.querySelectorAll(":scope > .rz-half");
      expect(haelften.length, id).toBe(2);
      const [erste, zweite] = haelften;
      expect(zweite.classList.contains("rz-naht-anker"), id).toBe(true);
      for (const sel of [".rz-auf-naht", ".rz-weg-panel"]) {
        expect(zweite.querySelector(sel), id + " " + sel).toBeTruthy();
        expect(erste.querySelector(sel), id + " " + sel + " gehoert nicht in die erste Haelfte").toBeNull();
      }
    }
  });
});
