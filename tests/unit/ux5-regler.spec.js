// @vitest-environment happy-dom
// UX-5 · Prozessreflexion-Regler (Code-Review U8): kein Wert ohne Berührung.
import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../core/ui/app.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { DESIGN_CSS } from "../../core/ui/design.js";
import { de } from "../../core/i18n/de.js";
import { en } from "../../core/i18n/en.js";

const tick = () => new Promise(r => setTimeout(r, 0));
const ruhe = async (n = 10) => { for (let i = 0; i < n; i++) await tick(); };

describe("UX-5 · Regler der Prozessreflexion", () => {
  let root, gesendet;
  const $id = id => root.querySelector("#" + id);
  beforeEach(async () => {
    document.body.innerHTML = '<div id="app"></div>'; root = document.getElementById("app");
    const repo = new Repo({ store: new MemoryStore(), ns: "T", code: "ux5", activeModuleId: "betrieb" });
    const bstate = new Bstate(repo), pstate = new Pstate(repo);
    gesendet = [];
    const backend = {
      async info() { return { role: "A", name: "Anna", partner: "Bernd", nameA: "Anna", nameB: "Bernd" }; },
      bstate: { get: f => bstate.get(f), set: (f, v) => bstate.set(f, v) },
      pstate: { get: f => pstate.get("A", f), set: (f, v) => pstate.set("A", f, v) },
      chat: { load: async () => null, save: async () => true }, handover: { post: async () => ({}), get: async () => null },
      mess: { beitrag: async b => { gesendet.push(b); return { id: "MR1", status: "open", values: { A: b, B: null } }; } },
      llm: async () => ({ text: "ok" }),
    };
    await backend.bstate.set("findings", { at: new Date().toISOString() });
    await backend.bstate.set("goals", { items: [{ id: "AG1", art: "shared", status: "active", text: "Ein Abend pro Woche." }] });
    await createApp({ doc: document, backend, root }).boot(); await ruhe();
    $id("btnMyRoom").click(); await ruhe(); $id("btnMess").click(); await ruhe();
  });
  const regler = () => [...root.querySelectorAll("input.rz-regler")];
  const zahl = r => r.parentElement.querySelector(".rz-regler-zahl").textContent;
  const fasse = (r, wert) => { if (wert !== undefined) r.value = String(wert); r.dispatchEvent(new Event("input", { bubbles: true })); };

  it("drei Regler (Wesen, Passung, Wirksamkeit), jeder mit Zahl daneben — zu Beginn ohne Wert", () => {
    expect(regler()).toHaveLength(3);
    for (const r of regler()) { expect(zahl(r)).toBe("–"); expect(r.hasAttribute("data-beruehrt")).toBe(false); }
  });

  it("»Abgeben« ist gesperrt, bis JEDER Regler einmal angefasst wurde; der Hinweis sagt, warum", async () => {
    expect($id("msOk").disabled).toBe(true);
    expect($id("msOffen").textContent).toBe(de["mess.alleRegler"]);
    const [a, b, c] = regler();
    fasse(a, 7); fasse(b, 3);
    expect($id("msOk").disabled).toBe(true);
    expect(zahl(a)).toBe("7"); expect(zahl(c)).toBe("–");
    fasse(c);                                   // die 5 meinen: antippen genügt
    expect($id("msOk").disabled).toBe(false);
    expect(zahl(c)).toBe("5");
    expect($id("msOffen").classList.contains("pb-hidden")).toBe(true);
  });

  it("ein Klick auf den (noch) gesperrten Knopf sendet nichts — auch nicht am Attribut vorbei", async () => {
    $id("msOk").disabled = false;
    $id("msOk").click(); await ruhe();
    expect(gesendet).toEqual([]);
    expect($id("msOk")).toBeTruthy();
  });

  it("nach Berührung aller Regler geht genau das Eingestellte hinaus", async () => {
    const [a, b, c] = regler();
    fasse(a, 8); fasse(b, 2); fasse(c, 9);
    $id("msOk").click(); await ruhe();
    expect(gesendet).toEqual([{ wesen: 8, fit: { AG1: 2 }, wirksamkeit: { AG1: 9 } }]);
  });

  it("Tastatur und Zeiger zählen als Berührung", () => {
    const [a, b] = regler();
    a.dispatchEvent(new Event("keydown", { bubbles: true }));
    b.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(a.hasAttribute("data-beruehrt")).toBe(true); expect(b.hasAttribute("data-beruehrt")).toBe(true);
  });

  it("Stil: Akzent aus den Tokens, kein Griff vor der ersten Berührung, Fingerhöhe", () => {
    expect(DESIGN_CSS).toContain(".rz-regler{flex:1;accent-color:var(--rz-akzent);min-height:var(--rz-tapziel-finger)}");
    expect(DESIGN_CSS).toContain(".rz-regler:not([data-beruehrt])::-webkit-slider-thumb{opacity:0}");
    expect(DESIGN_CSS).toContain(".rz-regler:not([data-beruehrt])::-moz-range-thumb{opacity:0}");
    expect(en["mess.alleRegler"]).toBeTruthy();
  });
});
