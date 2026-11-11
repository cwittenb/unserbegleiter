// @vitest-environment happy-dom
// CR-1 · Naht Oberfläche/Worker — die Kern-Seite.
// (Die Worker-Seite und der Vertrag selbst: tests/worker/vertrag-oberflaeche.spec.js.)

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createApp } from "../../core/ui/app.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";
import { Engine } from "../../core/engine/engine.js";
import { momentDef } from "../../core/ui/sessions.js";
import { markerOrderFuer } from "../../core/komposition.js";
import { wesenVon, formatiereMessrunde, formatiereVerlauf } from "../../core/ui/prozess.js";
import { baueRemoteBackend } from "../../platforms/cloudflare/pages/remote-backend.js";
import { legeVerlaufAb, holeVerlauf, loescheVerlauf } from "../../core/ui/verlauf-ablage.js";
import { de } from "../../core/i18n/de.js";
import { en } from "../../core/i18n/en.js";
import { t } from "../../core/i18n/index.js";

function memoryBackend(role = "A") {
  const store = new MemoryStore();
  const repo = new Repo({ store, ns: "T", code: "cr1", activeModuleId: "betrieb" });
  const bstate = new Bstate(repo), pstate = new Pstate(repo);
  return {
    store, repo,
    async info() { return { role, name: "Anna", partner: "Bernd", nameA: "Anna", nameB: "Bernd" }; },
    bstate: { get: f => bstate.get(f), set: (f, v) => bstate.set(f, v) },
    pstate: { get: f => pstate.get(role, f), set: (f, v) => pstate.set(role, f, v) },
    chat: { load: async () => null, save: async () => true },
    handover: { post: async () => ({}), get: async () => null },
    llm: async () => ({ text: "ok", stop: "end_turn" }),
  };
}
const tick = () => new Promise(r => setTimeout(r, 0));
const ruhe = async (n = 10) => { for (let i = 0; i < n; i++) await tick(); };
async function klick(el) { el.click(); await ruhe(4); }

describe("CR-1.1 · Alt-Runden (closeness) bleiben lesbar", () => {
  it("wesenVon bildet den Alt-Namen ab; neue Runden gewinnen", () => {
    expect(wesenVon({ wesen: 7 })).toBe(7);
    expect(wesenVon({ closeness: 4, guess: 6 })).toBe(4);
    expect(wesenVon({ wesen: 7, closeness: 4 })).toBe(7);
    expect(wesenVon(null)).toBeUndefined();
  });
  it("Kontext für den Begleiter trägt bei Alt-Runden Zahlen, kein »undefined«", () => {
    const alt = { id: "MR1", status: "revealed", revealedAt: "2026-09-01T10:00:00Z",
                  values: { A: { closeness: 4, guess: 7, fit: { AG1: 6 } }, B: { closeness: 8, guess: 5, fit: { AG1: 3 } } } };
    const zeile = formatiereMessrunde(alt, "Anna", "Bernd");
    expect(zeile).not.toMatch(/undefined|NaN/);
    expect(zeile).toMatch(/4/); expect(zeile).toMatch(/8/);
    const verlauf = formatiereVerlauf({ items: [alt] }, "Anna", "Bernd");
    expect(verlauf).not.toMatch(/undefined|NaN/);
  });
});

describe("CR-1.2 · Abgabe der Prozessreflexion hat einen Fehlerpfad", () => {
  let root;
  beforeEach(() => { document.body.innerHTML = '<div id="app"></div>'; root = document.getElementById("app"); });
  const $id = id => root.querySelector("#" + id);

  const fasseAlleAn = () => { for (const r of root.querySelectorAll("input.rz-regler")) r.dispatchEvent(new Event("input", { bubbles: true })); };
  async function zurAbgabe(backend) {
    await backend.bstate.set("findings", { at: new Date().toISOString() });
    await backend.bstate.set("goals", { items: [{ id: "AG1", art: "shared", status: "active", text: "Ein Abend pro Woche." }] });
    const app = createApp({ doc: document, backend, root });
    await app.boot(); await ruhe();
    await klick($id("btnMyRoom")); await ruhe();
    await klick($id("btnMess")); await ruhe();
    return app;
  }

  it("Server weist ab → Meldung in der Fehlerzeile, Knopf bleibt bedienbar, Regler stehen noch", async () => {
    const backend = memoryBackend();
    let wirft = true; const gesendet = [];
    backend.mess = { beitrag: async b => {
      gesendet.push(b);
      if (wirft) throw Object.assign(new Error("Beitrag unvollständig."), { status: 400, code: "mess_invalid" });
      return { id: "MR1", status: "open", values: { A: b, B: null } };
    } };
    await zurAbgabe(backend);
    $id("msWesen").value = "7";
    fasseAlleAn();                       // UX-5 · Abgabe erst nach Berührung jedes Reglers
    await klick($id("msOk")); await ruhe();

    expect($id("pbErr").classList.contains("pb-hidden")).toBe(false);
    expect($id("pbErr").textContent).toBe(t("fehler.code.mess_invalid"));
    expect([de, en].map(w => w["fehler.code.mess_invalid"])).toContain($id("pbErr").textContent);
    expect($id("msOk"), "die Regler dürfen nicht verschwinden").toBeTruthy();
    expect($id("msOk").disabled).toBe(false);
    expect($id("msWesen").value).toBe("7");

    // Zweiter Versuch gelingt: Quittung steht, Fehlerzeile ist wieder leer.
    wirft = false;
    await klick($id("msOk")); await ruhe();
    expect($id("msOk")).toBeNull();
    expect($id("boxMess").textContent.length).toBeGreaterThan(10);
    expect($id("pbErr").classList.contains("pb-hidden")).toBe(true);
    // Die Nutzlast ist die, die der Worker erwartet (Vertrag, CR-1.1).
    expect(gesendet[1]).toEqual({ wesen: 7, fit: { AG1: 5 }, wirksamkeit: { AG1: 5 } });
  });

  it("während der Abgabe ist der Knopf gesperrt (kein Doppelwurf)", async () => {
    const backend = memoryBackend();
    let loese; let rufe = 0;
    backend.mess = { beitrag: () => { rufe++; return new Promise(r => { loese = () => r({ id: "MR1", status: "open", values: {} }); }); } };
    await zurAbgabe(backend);
    fasseAlleAn();
    $id("msOk").click(); await tick();
    expect($id("msOk").disabled).toBe(true);
    $id("msOk").click(); await tick();
    expect(rufe).toBe(1);
    loese(); await ruhe();
  });

  it("Wörterbuch: mess_invalid in beiden Sprachen, ohne Technik im Text", () => {
    for (const w of [de, en]) {
      expect(w["fehler.code.mess_invalid"]).toBeTruthy();
      expect(w["fehler.code.mess_invalid"]).not.toMatch(/400|invalid|closeness/i);
    }
  });
});

describe("CR-1.4 · [[BASELINE]] in der Qualitätszeit", () => {
  it("die Marke ist registriert — in der Def und in der Komposition", () => {
    expect(momentDef(memoryBackend()).markerOrder).toContain("[[BASELINE]]");
    expect(markerOrderFuer("moment")).toContain("[[BASELINE]]");
  });

  it("der Zug mit der Marke ruft onStartwerte genau einmal; das Ergebnis geht als eine Nachricht zurück", async () => {
    const onStartwerte = vi.fn();
    const antworten = ["Dann frage ich euch verdeckt, wie nah ihr dem neuen Auftrag heute seid.\n[[BASELINE]]", "Danke euch beiden."];
    const llm = async () => ({ text: antworten.shift(), stop: "end_turn" });
    const def = momentDef(memoryBackend(), { onStartwerte });
    const e = new Engine({ def, chat: { messages: [], status: "running" }, llm, ctx: { nameA: "Anna", nameB: "Bernd" } });
    await e.sendUser("Anna: Wir wollen einen neuen Auftrag festhalten.");
    expect(onStartwerte).toHaveBeenCalledTimes(1);
    expect(onStartwerte.mock.calls[0][0]).toBe(e);
    const vorher = e.chat.messages.length;
    await e.submitToolResult("BASELINE-RESULT: Anna=4, Bernd=7", { baseline: true, hidden: true });
    const neu = e.chat.messages.slice(vorher);
    expect(neu.filter(m => m.role === "user")).toHaveLength(1);
    expect(neu[neu.length - 1].content).toBe("Danke euch beiden.");
  });
});

describe("CR-1.3 · Remote-Fassade: Verläufe gehen auf die eigene Route", () => {
  function fassade() {
    const rufe = [];
    const speicher = new Map();
    const api = async (method, pfad, body) => {
      rufe.push(method + " " + pfad);
      if (method === "PUT") { if (body.value === null) speicher.delete(pfad); else speicher.set(pfad, body.value); return { ok: true }; }
      return { value: speicher.get(pfad) ?? null };
    };
    return { b: baueRemoteBackend(api), rufe };
  }

  it("legeVerlaufAb / holeVerlauf / loescheVerlauf sprechen /api/verlauf/<id>, nie /api/pstate/verlauf:…", async () => {
    const { b, rufe } = fassade();
    const id = await legeVerlaufAb(b, { messages: [{ role: "user", content: "x" }], eignung: null }, () => 1700000000000);
    expect(id).toMatch(/^1700000000000-[0-9a-z]+$/);
    expect((await holeVerlauf(b, id)).messages).toHaveLength(1);
    await loescheVerlauf(b, id);
    expect(await holeVerlauf(b, id)).toBeNull();
    expect(rufe.every(r => r.includes("/api/verlauf/" + id))).toBe(true);
    expect(rufe.join(" ")).not.toContain("/api/pstate");
  });

  it("alle anderen Pstate-Felder bleiben auf /api/pstate/<feld>", async () => {
    const { b, rufe } = fassade();
    await b.pstate.set("verlaufAufbewahren", "fragen");
    await b.pstate.get("timeline");
    expect(rufe).toEqual(["PUT /api/pstate/verlaufAufbewahren", "GET /api/pstate/timeline"]);
  });

  it("jede Kennung, die der Kern erzeugt, passt auf das Routenmuster des Workers", async () => {
    const { neueVerlaufId } = await import("../../core/ui/verlauf-ablage.js");
    for (let i = 0; i < 200; i++) expect(neueVerlaufId()).toMatch(/^[0-9a-z-]{1,64}$/);
  });
});
