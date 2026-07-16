// Szenen-Sprung-Härtung (S68) — pinnt die vier Ursachen des Feld-Befunds:
// (Iteration 2 nach dem Feld-Befund „Quittung da, Stand leer"): stumm verlorene
// Writes unter Sandbox-Drossel und Quittung ohne Verifikation. Klick-Sperre und
// Busy-Feedback pinnt szenen-robustheit.spec.js. Fake-Storage simuliert die Drossel:
// begrenzte Parallelität + transiente Fehler, wie window.storage im Artefakt.

// @vitest-environment happy-dom

import { describe, it, expect, beforeEach } from "vitest";
import { ArtifactStore } from "../../platforms/artifact/artifact-store.js";
import { createDevPanel, SZENEN, dumpZustand, ladeZustand, pruefeEingespielt, MOCK_META } from "../../platforms/artifact/dev-panel.js";

const tick = () => new Promise(r => setTimeout(r, 0));

/** Fake-window.storage mit Drossel: höchstens `maxParallel` gleichzeitig, jeder
 *  Call darüber schlägt fehl; optional schlagen die ersten `transient` Versuche
 *  je Key fehl (Rate-Limit-Simulation). Zählt den Parallelitäts-Höchststand. */
function drosselStorage({ maxParallel = 4, transient = 0, setLiefertUndefined = false } = {}) {
  const welten = { true: new Map(), false: new Map() };
  const w = s => welten[String(!!s)];
  const fehlversuche = new Map();
  let laufend = 0, spitze = 0;
  const betrete = () => {
    laufend++; spitze = Math.max(spitze, laufend);
    if (laufend > maxParallel) { laufend--; throw new Error("rate limited"); }
  };
  const verlasse = () => { laufend--; };
  const vielleichtTransient = key => {
    const n = fehlversuche.get(key) || 0;
    if (n < transient) { fehlversuche.set(key, n + 1); throw new Error("rate limited"); }
  };
  return {
    spitze: () => spitze,
    async get(key, shared) { betrete(); try { if (!w(shared).has(key)) throw new Error("not found"); return { value: w(shared).get(key) }; } finally { verlasse(); } },
    async set(key, value, shared) { betrete(); try { vielleichtTransient("s:" + key); w(shared).set(key, value); return setLiefertUndefined ? undefined : { ok: true }; } finally { verlasse(); } },
    async delete(key, shared) { betrete(); try { vielleichtTransient("d:" + key); w(shared).delete(key); } finally { verlasse(); } },
    async list(prefix, shared) { betrete(); try { return { keys: [...w(shared).keys()].filter(k => k.startsWith(prefix || "")) }; } finally { verlasse(); } },
  };
}

function baue(store, reboot) {
  document.body.innerHTML = '<div id="host"></div>';
  return createDevPanel({ doc: document, host: document.getElementById("host"), store, reboot });
}

const warteFrei = async () => {
  const frei = () => ![...document.querySelectorAll("[data-szene], #devLoad, #devWipe")].some(b => b.disabled);
  for (let i = 0; i < 1400 && !frei(); i++)   // It.3: Fehlerpfade brauchen das volle Retry-Fenster (~8 s + Jitter) await new Promise(r => setTimeout(r, 10));
  for (let i = 0; i < 6; i++) await tick();
};

describe("S68 · Drossel-Überleben (U1)", () => {
  it("Szene 'betrieb' übersteht transiente Rate-Limits vollständig — verifiziert, Quittung erst danach", async () => {
    const roh = drosselStorage({ maxParallel: 4, transient: 1 });   // JEDER Key scheitert einmal
    const store = new ArtifactStore(roh);
    let reboots = 0;
    baue(store, async () => { reboots++; });
    document.querySelector('[data-szene="betrieb"]').click();
    expect(document.querySelector("#devMsg").textContent).toContain("wird eingespielt");   // U2: sofortiges Feedback
    await warteFrei();
    expect(reboots).toBe(1);
    const erfolg = document.querySelector("#devMsg").textContent;
    expect(erfolg).toContain("eingespielt");
    expect(erfolg).toContain("Rolle wählen");                 // Handlungsanweisung nach dem Reboot (U2-Aufklärung)
    const meta = await store.get("PBDEV:meta", true);
    expect(meta && meta.nameA).toBe("Anna");
    // Vollständigkeit über die eingebaute Verifikation hinaus: Dump nicht leer.
    const dump = await dumpZustand(store);
    expect(Object.keys(dump.shared).length).toBeGreaterThan(3);
    expect(Object.keys(dump.privat).length).toBeGreaterThan(0);
  }, 20000);

  it("die Schreibwellen überschreiten die Sandbox-Parallelität nicht (kein Burst)", async () => {
    const roh = drosselStorage({ maxParallel: 4 });
    const store = new ArtifactStore(roh);
    await SZENEN.find(s => s.id === "betrieb").wende(store);
    expect(roh.spitze()).toBeLessThanOrEqual(4);
  }, 20000);
});

describe("S68 · Vertragsdrift der Sandbox (Iteration 3)", () => {
  it("set() liefert bei ERFOLG undefined (Feld-Befund „immer fehlgeschlagen“) — Rücklesen erkennt den Erfolg, Szene läuft durch", async () => {
    const roh = drosselStorage({ setLiefertUndefined: true });
    const store = new ArtifactStore(roh);
    let reboots = 0;
    baue(store, async () => { reboots++; });
    document.querySelector('[data-szene="freigaben-da"]').click();
    await warteFrei();
    expect(reboots).toBe(1);
    expect(document.querySelector("#devMsg").textContent).toContain("eingespielt");
    expect(document.querySelector("#devMsg").textContent).not.toContain("fehlgeschlagen");
    expect((await store.get("PBDEV:meta", true)).code).toBe(MOCK_META.code);
  }, 20000);

  it("Rücklesen entlarvt einen ECHT verlorenen Write trotz set()-Erfolgsobjekt — sprechende Fehlermeldung", async () => {
    const roh = drosselStorage({});
    const echtesSet = roh.set.bind(roh);
    roh.set = async (k, v, shared) => { if (String(k).includes("handover:A")) return { ok: true }; return echtesSet(k, v, shared); };
    const store = new ArtifactStore(roh);
    let reboots = 0;
    baue(store, async () => { reboots++; });
    document.querySelector('[data-szene="freigaben-da"]').click();
    await warteFrei();
    expect(reboots).toBe(0);
    const m = document.querySelector("#devMsg").textContent;
    expect(m).toContain("fehlgeschlagen");
    expect(m).toContain("Rücklesen fand den Key nicht");
    expect(m).toContain("handover:A");
  }, 30000);
});

describe("S68 · Fehlerpfad ohne falsche Quittung (U4)", () => {
  it("dauerhaft scheiterndes Schreiben: rote Meldung, KEIN Reboot, keine Erfolgs-Quittung", async () => {
    const roh = drosselStorage({});
    roh.set = async () => { throw new Error("kaputt"); };            // ArtifactStore → false, mussSet → wirft
    const store = new ArtifactStore(roh);
    let reboots = 0;
    baue(store, async () => { reboots++; });
    document.querySelector('[data-szene="onboarding-fertig"]').click();
    await warteFrei();
    expect(reboots).toBe(0);
    const m = document.querySelector("#devMsg").textContent;
    expect(m).toContain("fehlgeschlagen");
    expect(m).not.toContain("Rolle wählen");                  // keine Erfolgs-Anweisung im Fehlerfall
  }, 20000);

  it("pruefeEingespielt entlarvt einen Teil-Stand (genau der Feld-Befund: Quittung, Stand leer)", async () => {
    const store = new ArtifactStore(drosselStorage({}));
    await expect(pruefeEingespielt(store, { "PBDEV:meta": MOCK_META }, {}))
      .rejects.toThrow(/unvollständig/);
    await store.set("PBDEV:meta", MOCK_META, true);
    await expect(pruefeEingespielt(store, { "PBDEV:meta": MOCK_META }, {})).resolves.toBeUndefined();
  });
});

describe("S68 · ladeZustand verifiziert wie die Szenen", () => {
  it("Roundtrip unter Drossel: dump → wipe → laden → identisch", async () => {
    const store = new ArtifactStore(drosselStorage({ maxParallel: 4, transient: 1 }));
    await SZENEN.find(s => s.id === "onboarding-fertig").wende(store);
    const dump = await dumpZustand(store);
    await ladeZustand(store, dump);
    expect(await store.get("PBDEV:meta", true)).toEqual(dump.shared["PBDEV:meta"]);
  }, 20000);
});
