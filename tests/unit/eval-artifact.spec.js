// @vitest-environment happy-dom
// Eval-Runner im Artefakt — Drehbücher mit Fake-Adaptern (echter Eval-Kern,
// echte Judge-Parserei) + Ein-Datei-Build-Beweis.

import { describe, it, expect, beforeEach } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createEvalApp } from "../../platforms/artifact/eval-app.js";
import { SZENARIEN } from "../../evals/szenarien/start-katalog.js";
import { JUDGE_PROMPT_VERSION } from "../../evals/judge/judge.js";
import { buildEvalArtifact } from "../../scripts/build-eval-artifact.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const tick = () => new Promise(r => setTimeout(r, 0));
async function klick(el, ticks = 6) { el.click(); for (let i = 0; i < ticks; i++) await tick(); }

let root;
beforeEach(() => {
  document.body.innerHTML = '<div id="app" data-core-hash="testhash"></div>';
  root = document.getElementById("app");
});

/** Fake-Adapter-Fabrik: unterscheidet Judge (am Judge-System-Prompt) von der
 *  Pipeline; der Judge liest die Szenario-ID aus der Anfrage und antwortet je
 *  Check mit `plan[id]` oder — ohne Plan — mit dem Gegenteil von verletztWenn
 *  (= alles grün). Die echte parseJudge-Strenge bleibt im Spiel. */
function fakeMachAdapter(plaene = {}) {
  const fabrik = modell => async (system, messages) => {
    if (system.startsWith("Du bist ein strenger")) {
      const user = messages[messages.length - 1].content;
      const id = /Szenario (\S+) v/.exec(user)[1];
      const sz = SZENARIEN.find(s => s.id === id);
      const plan = plaene[id] || {};
      const checks = sz.checks.map(c => ({
        id: c.id,
        antwort: plan[c.id] || ((c.verletztWenn || "ja") === "ja" ? "nein" : "ja"),
        beleg: "«Testbeleg»",
      }));
      return { text: JSON.stringify({ checks }) };
    }
    return { text: "Begleitungs-Antwort von " + modell + "." };
  };
  fabrik.aufrufe = [];
  return m => { fabrik.aufrufe.push(m); return fabrik(m); };
}

function nurSzenario(id) {
  for (const cb of root.querySelectorAll("[data-sz]")) cb.checked = cb.getAttribute("data-sz") === id;
}

describe("Eval-Artefakt · Oberfläche", () => {
  it("zeigt alle Szenarien des Katalogs; rote-Linie-Szenarien tragen das Abzeichen", () => {
    createEvalApp({ doc: document, root, szenarien: SZENARIEN, machAdapter: fakeMachAdapter() });
    for (const s of SZENARIEN) expect(root.textContent).toContain(s.id);
    const aufKarte = id => root.querySelector(`[data-sz="${id}"]`).closest("label").textContent;
    expect(aufKarte("AUF-01")).toContain("rote Linie");
    expect(aufKarte("LEAK-S1")).toContain("rote Linie");
    expect(aufKarte("SYC-05")).not.toContain("rote Linie");
  });

  it("Judge-Trennung: gleiches Modell ohne Haken wird verweigert, mit Haken läuft es", async () => {
    const app = createEvalApp({ doc: document, root, szenarien: SZENARIEN, machAdapter: fakeMachAdapter() });
    nurSzenario("KOR-01");
    root.querySelector("#evN").value = "1";
    root.querySelector("#evPm").value = "gleiches-modell";
    root.querySelector("#evJm").value = "gleiches-modell";
    await klick(root.querySelector("#evStart"));
    expect(root.querySelector("#evStatus").textContent).toContain("Judge-Trennung");
    expect(app._state.bericht).toBeNull();

    root.querySelector("#evGleich").checked = true;
    await klick(root.querySelector("#evStart"), 12);
    expect(app._state.bericht).not.toBeNull();
  });
});

describe("Eval-Artefakt · Läufe (echter Eval-Kern)", () => {
  it("grüner Lauf: Quote je Familie, Bericht mit Stand (Kern-Hash, Modelle, Judge-Version), kein Gesamt-Score", async () => {
    const app = createEvalApp({ doc: document, root, szenarien: SZENARIEN, machAdapter: fakeMachAdapter() });
    nurSzenario("KOR-01");
    root.querySelector("#evN").value = "2";
    await klick(root.querySelector("#evStart"), 14);

    const b = app._state.bericht;
    expect(b.quotenJeFamilie.KOR).toEqual({ gesamt: 1, gruen: 1, rot: 0, verletzt: 0, unbewertet: 0 });
    expect(b.szenarien[0].n).toBe(2);
    expect(b.stand).toMatchObject({
      coreHash: "testhash",
      pipelineModell: "claude-sonnet-4-6",
      judgeModell: "claude-opus-4-8",
      judgePromptVersion: JUDGE_PROMPT_VERSION,
    });
    expect(JSON.stringify(b)).not.toContain("gesamtScore");
    expect(root.querySelector("#evFam").textContent).toContain("grün 1/1");
    expect(root.querySelector("#evSzErg").textContent).toContain("✓ KOR-01 grün");
  });

  it("rote Linie: EIN Treffer macht das Szenario ROT — sichtbar mit Warnung und Beleg", async () => {
    const app = createEvalApp({
      doc: document, root, szenarien: SZENARIEN,
      machAdapter: fakeMachAdapter({ "AUF-01": { C1: "ja" } }),   // C1 verletztWenn ja + roteLinie
    });
    nurSzenario("AUF-01");
    root.querySelector("#evN").value = "1";
    await klick(root.querySelector("#evStart"), 14);

    const b = app._state.bericht;
    expect(b.szenarien[0].status).toContain("ROT");
    expect(b.quotenJeFamilie.AUF.rot).toBe(1);
    expect(root.querySelector("#evFam").textContent).toContain("ROTE LINIE");
    expect(root.querySelector("#evSzErg").textContent).toContain("rote Linie");
    expect(root.querySelector("#evSzErg").textContent).toContain("Testbeleg");
  });
});

describe("Eval-Artefakt · Build", () => {
  it("Ein-Datei-Artefakt: Katalog + Judge-Version inliniert, keine externen Skripte, Hash gestempelt", async () => {
    const { out, hash } = await buildEvalArtifact();
    const html = await readFile(out, "utf8");
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).not.toMatch(/<script[^>]*src=/i);
    expect(html).toContain("AUF-01");
    expect(html).toContain("LEAK-S1");
    expect(html).toContain('"' + JUDGE_PROMPT_VERSION + '"');
    expect(html).toContain('data-core-hash="' + hash + '"');
    expect(out).toMatch(/paarbegleitung-eval_\d{4}-\d{2}-\d{2}_\d{4}_[0-9a-f]{8}\.html$/);
  });
});

describe("Eval-Artefakt · Abbruch-Rettung", () => {
  it("Abbruch nach dem ersten Szenario: Teilbericht mit dem Fertigen, als abgebrochen markiert", async () => {
    let calls = 0;
    const fabrik = () => async (system, messages) => {
      if (system.startsWith("Du bist ein strenger")) {
        const id = /Szenario (\S+) v/.exec(messages[messages.length - 1].content)[1];
        const sz = SZENARIEN.find(s => s.id === id);
        return { text: JSON.stringify({ checks: sz.checks.map(c => ({ id: c.id, antwort: (c.verletztWenn || "ja") === "ja" ? "nein" : "ja", beleg: "b" })) }) };
      }
      if (++calls > 2) throw new Error('{"type":"exceeded_limit","resetsAt":1783296000}');
      return { text: "ok" };
    };
    document.body.innerHTML = '<div id="app" data-core-hash="h"></div>';
    const root = document.getElementById("app");
    const app = createEvalApp({ doc: document, root, szenarien: SZENARIEN, machAdapter: fabrik });
    for (const cb of root.querySelectorAll("[data-sz]"))
      cb.checked = ["ESK-07", "KOR-01"].includes(cb.getAttribute("data-sz"));
    root.querySelector("#evN").value = "1";
    root.querySelector("#evStart").click();
    for (let i = 0; i < 20; i++) await new Promise(r => setTimeout(r, 0));

    const b = app._state.bericht;
    expect(b.szenarien).toHaveLength(1);                        // ESK-07 fertig, KOR-01 brach ab
    expect(b.abgebrochen).toContain("Nutzungslimit");
    expect(root.querySelector("#evStatus").textContent).toContain("Teilbericht");
    expect(root.querySelector("#evErgebnis .ev-sub").textContent).toContain("Teilergebnis");
    expect(JSON.parse(root.querySelector("#evJson").value).abgebrochen).toBeTruthy();
  });
});
