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
    if ([].concat(system).join("").startsWith("Du bist ein strenger")) {
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
    root.querySelector("#evRpm").value = "0";   // Tests ohne Takt
    const an = [...root.querySelectorAll("[data-sz]:checked")].map(x => x.getAttribute("data-sz"));
    expect(an).toEqual(["SYC-05"]);
    expect(root.querySelector("#evJm").value).toBe("judge-x");
    expect(root.querySelector("#evWaechter").checked).toBe(true);
    expect(root.textContent).toContain("Test-Paket");
  });

  it("ein Knopf fährt alle Arme nacheinander, ein Bericht je Arm", async () => {
    const { mach, pms } = fake();
    createEvalApp({ doc: document, root, szenarien: SZENARIEN, machAdapter: mach, vorgabe: vg });
    root.querySelector("#evRpm").value = "0";   // Tests ohne Takt
    root.querySelector("#evVorgabe").click();
    for (let i = 0; i < 200 && !/Alle 2 Läufe fertig/.test(root.querySelector("#evVgStatus").textContent); i++) await tick();
    expect(root.querySelector("#evVgStatus").textContent).toMatch(/Alle 2 Läufe fertig/);
    expect(new Set(pms)).toEqual(new Set(["modell-a", "modell-b"]));
    const knoepfe = [...root.querySelectorAll("[data-vg-dl]")].map(b => b.textContent);
    expect(knoepfe.some(t => t.includes("a-n1"))).toBe(true);
    expect(knoepfe.some(t => t.includes("b-n1"))).toBe(true);
    expect(knoepfe.some(t => t.includes("Alle 2"))).toBe(true);
    expect(root.querySelector("#evVgListe").textContent).toContain("Alle 2 Läufe fertig");
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

describe("PRV · Zwischenstand ist als solcher erkennbar", () => {
  it("nach dem ersten von zwei Läufen: Warnung, keine Sammeldatei", async () => {
    let freigabe; const halt = new Promise(r => (freigabe = r));
    const { mach } = fake();
    const vg2 = { id: "t", titel: "T", szenarien: ["SYC-05"], judge: "j", waechter: true,
      arme: [{ label: "a", pm: "m-a", n: 1 }, { label: "b", pm: "m-b", n: 1 }] };
    const langsam = m => { const f = mach(m); return async (s, msgs) => { if (m === "m-b" && ![].concat(s).join("").startsWith("Du bist ein strenger")) await halt; return f(s, msgs); }; };
    createEvalApp({ doc: document, root, szenarien: SZENARIEN, machAdapter: langsam, vorgabe: vg2 });
    root.querySelector("#evRpm").value = "0";   // Tests ohne Takt
    root.querySelector("#evVorgabe").click();
    for (let i = 0; i < 200 && !root.querySelector('[data-vg-dl="0"]'); i++) await tick();
    const t = root.querySelector("#evVgListe").textContent;
    expect(t).toContain("1 von 2 Läufen fertig");
    expect(root.querySelector('[data-vg-dl="alle"]')).toBeNull();
    freigabe();
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
    expect(new Set(c.map(x => JSON.stringify(x.system))).size).toBe(1);   // String oder Blöcke (PRV-7m)
  });
  it("alt: Hinweis am Systemtext, keine Regie", async () => {
    const c = await spiele("system");
    expect(c.every(x => x.regie === null)).toBe(true);
    expect(new Set(c.map(x => JSON.stringify(x.system))).size).toBeGreaterThan(1);   // geschärfter Zug: Systemtext + Zusatz
  });
});

describe("Eval-Artefakt · gleichzeitige Szenarien", () => {
  it("höchstens `gleichzeitig` Gespräche parallel, Ergebnis in Auswahl-Reihenfolge", async () => {
    const ids = ["SYC-05", "SYC-06", "GATE-S1", "MOM-01"];
    let aktiv = 0, spitze = 0;
    const mach = modell => async (system, messages) => {
      if ([].concat(system).join("").startsWith("Du bist ein strenger")) {
        const id = /Szenario (\S+) v/.exec(messages.at(-1).content)[1];
        const sz = SZENARIEN.find(s => s.id === id);
        return { data: { checks: sz.checks.map(c => ({ id: c.id, verdict: (c.verletztWenn || "ja") === "ja" ? "no" : "yes", evidence: "«x»" })) } };
      }
      aktiv++; spitze = Math.max(spitze, aktiv);
      await new Promise(r => setTimeout(r, 5));
      aktiv--;
      return { text: "Antwort." };
    };
    const vg = { id: "p", titel: "P", szenarien: ids, judge: "j", waechter: true, arme: [{ label: "a", pm: "m", n: 1 }] };
    createEvalApp({ doc: document, root, szenarien: SZENARIEN, machAdapter: mach, vorgabe: vg });
    expect(root.querySelector("#evPar").value).toBe("3");
    expect(root.querySelector("#evRpm").value).toBe("30");
    root.querySelector("#evRpm").value = "0";   // im Test ohne Takt (Zeit)
    root.querySelector("#evVorgabe").click();
    for (let i = 0; i < 400 && !/Alle 1 Läufe fertig/.test(root.querySelector("#evVgStatus").textContent); i++) await new Promise(r => setTimeout(r, 5));
    expect(spitze).toBeGreaterThan(1);
    expect(spitze).toBeLessThanOrEqual(3);
    expect(JSON.parse(root.querySelector("#evJson").value).szenarien.map(s => s.id)).toEqual(SZENARIEN.filter(s => ids.includes(s.id)).map(s => s.id));
  });
});

describe("Eval-Artefakt · RPM-Takt", () => {
  it("verteilt Aufrufe gleichmäßig (geteilt von Pipeline und Judge)", async () => {
    const zeiten = [];
    const mach = modell => async (system, messages) => {
      zeiten.push(Date.now());
      if ([].concat(system).join("").startsWith("Du bist ein strenger")) {
        const id = /Szenario (\S+) v/.exec(messages.at(-1).content)[1];
        const sz = SZENARIEN.find(s => s.id === id);
        return { data: { checks: sz.checks.map(c => ({ id: c.id, verdict: (c.verletztWenn || "ja") === "ja" ? "no" : "yes", evidence: "«x»" })) } };
      }
      return { text: "Antwort." };
    };
    const vg = { id: "r", titel: "R", szenarien: ["SYC-05"], judge: "j", waechter: true, arme: [{ label: "a", pm: "m", n: 1 }] };
    createEvalApp({ doc: document, root, szenarien: SZENARIEN, machAdapter: mach, vorgabe: vg });
    root.querySelector("#evRpm").value = "1200";   // 50 ms Abstand
    root.querySelector("#evVorgabe").click();
    for (let i = 0; i < 400 && !/Alle 1 Läufe fertig/.test(root.querySelector("#evVgStatus").textContent); i++) await new Promise(r => setTimeout(r, 5));
    expect(zeiten.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < zeiten.length; i++) expect(zeiten[i] - zeiten[i - 1]).toBeGreaterThanOrEqual(40);
  });
});

describe("Eval-Artefakt · Fortsetzen nach Abbruch", () => {
  it("der zweite Klick fährt nur die fehlenden Szenarien nach; Bericht vollständig", async () => {
    const ids = ["SYC-05", "SYC-06", "GATE-S1"];
    let pipe = 0, einmalFehler = true;
    const gespielt = [];
    const mach = modell => async (system, messages) => {
      if ([].concat(system).join("").startsWith("Du bist ein strenger")) {
        const id = /Szenario (\S+) v/.exec(messages.at(-1).content)[1];
        const sz = SZENARIEN.find(s => s.id === id);
        return { data: { checks: sz.checks.map(c => ({ id: c.id, verdict: (c.verletztWenn || "ja") === "ja" ? "no" : "yes", evidence: "«x»" })) } };
      }
      pipe++;
      const erste = messages[0].content;
      gespielt.push(erste);
      if (einmalFehler && SZENARIEN.find(s => s.id === "GATE-S1").eingaben[0] === erste) { einmalFehler = false; throw new Error("Permission denied"); }
      return { text: "Antwort." };
    };
    const vg = { id: "f", titel: "F", szenarien: ids, judge: "j", waechter: true, arme: [{ label: "a", pm: "m", n: 1 }] };
    createEvalApp({ doc: document, root, szenarien: SZENARIEN, machAdapter: mach, vorgabe: vg });
    root.querySelector("#evRpm").value = "0";
    root.querySelector("#evPar").value = "1";
    root.querySelector("#evAuto").checked = false;   // EVAL-R1: hier geht es um das Fortsetzen von Hand
    const warte = async re => { for (let i = 0; i < 400 && !re.test(root.querySelector("#evVgStatus").textContent); i++) await new Promise(r => setTimeout(r, 5)); };
    root.querySelector("#evVorgabe").click();
    await warte(/Angehalten/);
    expect(root.querySelector("#evVgStatus").textContent).toMatch(/2 Szenarien, 2 Samples fertig/);
    const vorher = gespielt.length;
    root.querySelector("#evVorgabe").click();
    await warte(/Alle 1 Läufe fertig/);
    const nachgefahren = gespielt.slice(vorher);
    const gate = SZENARIEN.find(s => s.id === "GATE-S1").eingaben[0];
    expect(nachgefahren.every(e => e === gate)).toBe(true);
    expect(JSON.parse(root.querySelector("#evJson").value).szenarien.map(s => s.id)).toEqual(SZENARIEN.filter(s => ids.includes(s.id)).map(s => s.id));
  });
});
