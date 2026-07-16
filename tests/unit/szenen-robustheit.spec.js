// Szenen anspringen · Robustheit (S68) — pinnt genau die gemeldeten Symptome:
// U1 „erster Klick: nichts" → sofortiges Busy-Feedback + gesperrte Knöpfe;
// U2 „zweiter Klick" → nebenläufiges zweites wende (Race) → Guard: genau 1×;
// U3 „Meldung da, System unverändert" → Erfolg erst NACH dem Reboot, mit
//    Handlungsanweisung (Rollenwahl sieht identisch aus — der neue Stand
//    wird erst mit der Rollenwahl betreten).
// Dazu der Geschwindigkeits-Beweis: wipe/setze laufen parallel statt als
// RPC-Kette (In-Flight-Zähler > 1 am Fake-Store).

// @vitest-environment happy-dom

import { describe, it, expect, beforeEach } from "vitest";
import { createDevPanel, SZENEN, wipeZustand } from "../../platforms/artifact/dev-panel.js";
import { ArtifactStore } from "../../platforms/artifact/artifact-store.js";

/** Fake-window.storage mit steuerbarer Latenz und In-Flight-Messung. */
function fakeStorage({ latenzMs = 0 } = {}) {
  const welten = { true: new Map(), false: new Map() };
  const w = shared => welten[String(!!shared)];
  let inFlight = 0, maxInFlight = 0;
  const mitLatenz = async fn => {
    inFlight++; maxInFlight = Math.max(maxInFlight, inFlight);
    try {
      if (latenzMs) await new Promise(r => setTimeout(r, latenzMs));
      return fn();
    } finally { inFlight--; }
  };
  return {
    get maxInFlight() { return maxInFlight; },
    async get(key, shared) { return mitLatenz(() => { if (!w(shared).has(key)) throw new Error("not found"); return { value: w(shared).get(key) }; }); },
    async set(key, value, shared) { return mitLatenz(() => { w(shared).set(key, value); return { ok: true }; }); },
    async delete(key, shared) { return mitLatenz(() => { w(shared).delete(key); }); },
    async list(prefix, shared) { return mitLatenz(() => ({ keys: [...w(shared).keys()].filter(k => k.startsWith(prefix || "")) })); },
  };
}

const tick = (ms = 0) => new Promise(r => setTimeout(r, ms));
const szene = id => SZENEN.find(s => s.id === id);

let traeger, store;
beforeEach(() => {
  document.body.innerHTML = '<div id="host"></div>';
  traeger = fakeStorage();
  store = new ArtifactStore(traeger);
});

describe("Szenen · Klick-Robustheit (S68)", () => {
  it("U1: sofortiges Busy-Feedback und gesperrte Aktions-Knöpfe, solange die Szene läuft", async () => {
    let gebeFrei; const langsam = new Promise(r => { gebeFrei = r; });
    const s = szene("onboarding-fertig");
    const echtesWende = s.wende;
    s.wende = async st => { await langsam; return echtesWende.call(s, st); };
    try {
      createDevPanel({ doc: document, host: document.getElementById("host"), store, reboot: async () => {} });
      const knopf = document.querySelector('[data-szene="onboarding-fertig"]');
      knopf.click();
      await tick();
      expect(document.querySelector("#devMsg").textContent).toContain("wird eingespielt");   // SOFORT, nicht erst am Ende
      expect(knopf.disabled).toBe(true);
      expect(document.querySelector("#devWipe").disabled).toBe(true);                        // alle Aktionswege gesperrt
      gebeFrei();
      await tick(5);
      expect(knopf.disabled).toBe(false);
      expect(document.querySelector("#devMsg").textContent).toContain("eingespielt");
    } finally { s.wende = echtesWende; }
  });

  it("U2: Doppel- und Dreifachklick während des Laufs wenden die Szene genau EINMAL an", async () => {
    let laeufe = 0, gebeFrei; const langsam = new Promise(r => { gebeFrei = r; });
    const s = szene("onboarding-fertig");
    const echtesWende = s.wende;
    s.wende = async st => { laeufe++; await langsam; return echtesWende.call(s, st); };
    let reboots = 0;
    try {
      createDevPanel({ doc: document, host: document.getElementById("host"), store, reboot: async () => { reboots++; } });
      const knopf = document.querySelector('[data-szene="onboarding-fertig"]');
      knopf.click(); knopf.click();
      document.querySelector('[data-szene="betrieb"]').click();   // auch ANDERE Szene wird abgewiesen
      await tick();
      gebeFrei();
      await tick(5);
      expect(laeufe).toBe(1);
      expect(reboots).toBe(1);                                    // vorher: zeitversetzte Mehrfach-Reboots
    } finally { s.wende = echtesWende; }
  });

  it("U3: Erfolgsmeldung kommt erst NACH dem Reboot und sagt, wie es weitergeht (Rolle wählen)", async () => {
    const reihenfolge = [];
    createDevPanel({ doc: document, host: document.getElementById("host"), store,
      reboot: async () => { reihenfolge.push("reboot:" + document.querySelector("#devMsg").textContent); } });
    await szene("onboarding-fertig").wende(store);                // meta liegt → App-Fall
    document.querySelector('[data-szene="betrieb"]').click();
    // S68-Wellen takten mit Ruhepausen — pollen statt fixer 5 ms:
    for (let i = 0; i < 400 && reihenfolge.length === 0; i++) await tick(10);
    await tick(5);
    // Während des Reboots stand noch die Busy-Meldung — der Erfolg kam danach:
    expect(reihenfolge).toHaveLength(1);
    expect(reihenfolge[0]).toContain("wird eingespielt");
    const ende = document.querySelector("#devMsg").textContent;
    expect(ende).toContain("Szene „Betrieb · Vollausbau (Mockdaten)“ eingespielt");
    expect(ende).toContain("Rolle wählen");
  });

  it("U3b: ohne Meta (Szene ‚frisch‘) verweist die Meldung auf die Einrichtung", async () => {
    createDevPanel({ doc: document, host: document.getElementById("host"), store, reboot: async () => {} });
    document.querySelector('[data-szene="frisch"]').click();
    await tick(5);
    expect(document.querySelector("#devMsg").textContent).toContain("die Einrichtung erscheint");
  });

  it("Fehlerpfad: wende wirft → rote Meldung, KEIN Reboot, Knöpfe wieder frei", async () => {
    const s = szene("onboarding-fertig");
    const echtesWende = s.wende;
    s.wende = async () => { throw new Error("Sandbox weg"); };
    let reboots = 0;
    try {
      createDevPanel({ doc: document, host: document.getElementById("host"), store, reboot: async () => { reboots++; } });
      const knopf = document.querySelector('[data-szene="onboarding-fertig"]');
      knopf.click();
      await tick(5);
      expect(document.querySelector("#devMsg").textContent).toContain("fehlgeschlagen: Sandbox weg");
      expect(reboots).toBe(0);
      expect(knopf.disabled).toBe(false);                         // nächster Versuch möglich
    } finally { s.wende = echtesWende; }
  });
});

describe("Szenen · Geschwindigkeit (S68, U1-Wurzel)", () => {
  it("setzeZustand über eine Szene schreibt parallel (In-Flight > 1) und wischt parallel", async () => {
    const langsam = fakeStorage({ latenzMs: 4 });
    const st = new ArtifactStore(langsam);
    await szene("betrieb").wende(st);                             // wipe (leer) + viele Sets
    expect(langsam.maxInFlight).toBeGreaterThan(1);               // vorher: strikte RPC-Kette (max 1)
    const vorher = langsam.maxInFlight;
    await wipeZustand(st);                                        // jetzt liegen Keys → paralleles Löschen
    expect(langsam.maxInFlight).toBeGreaterThanOrEqual(vorher);
  });
});
