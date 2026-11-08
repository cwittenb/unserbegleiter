// @vitest-environment happy-dom
// PRV · Eval-Pakete: Vorgabe-Modus des Eval-Artefakts (Arme nacheinander,
// ein Bericht je Arm, ohne Eingangsfrage) und der A/B-Schalter des
// Regie-Transports im Eval-Kern.

import { describe, it, expect, beforeEach } from "vitest";
import { createEvalApp } from "../../platforms/artifact/eval-app.js";
import { SZENARIEN } from "../../evals/szenarien/start-katalog.js";
import { spieleSample } from "../../evals/runner-kern.js";
import { VORGABEN } from "../../platforms/artifact/eval-vorgaben.js";
import { SZENARIEN_EN } from "../../evals/szenarien/start-katalog.en.js";

const tick = () => new Promise(r => setTimeout(r, 0));
let root;
beforeEach(() => {
  document.body.innerHTML = '<div id="app" data-core-hash="testhash"></div>';
  root = document.getElementById("app");
});

function fake() {
  const pms = [];
  const mach = modell => async (system, messages) => {
    if (system.startsWith("Du bist ein strenger")) {
      const id = /Szenario (\S+) v/.exec(messages.at(-1).content)[1];
      const sz = SZENARIEN.find(s => s.id === id);
      return { data: { checks: sz.checks.map(c => ({ id: c.id, verdict: (c.verletztWenn || "ja") === "ja" ? "no" : "yes", evidence: "«x»" })) } };
    }
    pms.push(modell);
    return { text: "Antwort." };
  };
  return { pms, mach };
}

describe("PRV · Eval-Vorgabe im Artefakt", () => {
  const vg = { id: "t", titel: "Test-Paket", beschreibung: "b", szenarien: ["SYC-05"], judge: "judge-x", waechter: true,
    arme: [{ label: "a-n1", pm: "modell-a", n: 1 }, { label: "b-n1", pm: "modell-b", n: 1, regieTransport: "system" }] };

  it("wählt nur die Vorgabe-Szenarien, setzt Judge und Wächter", () => {
    const { mach } = fake();
    createEvalApp({ doc: document, root, szenarien: SZENARIEN, machAdapter: mach, vorgabe: vg });
    const an = [...root.querySelectorAll("[data-sz]:checked")].map(x => x.getAttribute("data-sz"));
    expect(an).toEqual(["SYC-05"]);
    expect(root.querySelector("#evJm").value).toBe("judge-x");
    expect(root.querySelector("#evWaechter").checked).toBe(true);
    expect(root.textContent).toContain("Test-Paket");
  });

  it("ein Knopf fährt alle Arme nacheinander, ein Bericht je Arm", async () => {
    const { mach, pms } = fake();
    createEvalApp({ doc: document, root, szenarien: SZENARIEN, machAdapter: mach, vorgabe: vg });
    root.querySelector("#evVorgabe").click();
    for (let i = 0; i < 200 && !/Alle 2 Läufe fertig/.test(root.querySelector("#evVgStatus").textContent); i++) await tick();
    expect(root.querySelector("#evVgStatus").textContent).toMatch(/Alle 2 Läufe fertig/);
    expect(new Set(pms)).toEqual(new Set(["modell-a", "modell-b"]));
    const knoepfe = [...root.querySelectorAll("[data-vg-dl]")].map(b => b.textContent);
    expect(knoepfe.some(t => t.includes("a-n1"))).toBe(true);
    expect(knoepfe.some(t => t.includes("b-n1"))).toBe(true);
    expect(knoepfe.some(t => t.includes("Alle 2"))).toBe(true);
  });

  it("die PRV-Vorgaben zeigen auf existierende Szenarien und Judge ≠ Pipeline", () => {
    const ids = new Set([...SZENARIEN, ...SZENARIEN_EN].map(s => s.id));
    for (const v of Object.values(VORGABEN)) {
      for (const id of v.szenarien) expect(ids.has(id), v.id + ": " + id).toBe(true);
      for (const a of v.arme) expect(a.pm).not.toBe(v.judge);
      expect(v.waechter).toBe(true);
    }
  });
});

describe("PRV · Regie-Transport A/B im Eval-Kern", () => {
  async function spiele(regieTransport) {
    const sz = SZENARIEN.find(s => s.id === "MRV-02");
    const calls = [];
    await spieleSample(async (system, msgs) => { calls.push({ system, regie: msgs.at(-1).regie || null }); return { text: "Ich höre dich." }; },
      sz, { waechter: true, regieTransport });
    return calls;
  }
  it("neu: Hinweis als Regie, Systemtext je Zug gleich", async () => {
    const c = await spiele(undefined);
    expect(c.some(x => x.regie)).toBe(true);
    expect(new Set(c.map(x => x.system)).size).toBe(1);
  });
  it("alt: Hinweis am Systemtext, keine Regie", async () => {
    const c = await spiele("system");
    expect(c.every(x => x.regie === null)).toBe(true);
    expect(new Set(c.map(x => x.system)).size).toBeGreaterThan(1);   // geschärfter Zug: Systemtext + Zusatz
  });
});
