// @vitest-environment happy-dom
// Entwickler-Panel — Dump/Restore-Roundtrip, Szenen-Zustände, Panel-UI.
// Läuft gegen einen Fake-window.storage (dieselbe Schnittstelle wie im Artefakt)
// und prüft die Szenen über die ECHTEN Bausteine (Bstate/Pstate/Repo/qzStufe).

import { describe, it, expect, beforeEach } from "vitest";
import { ArtifactStore } from "../../platforms/artifact/artifact-store.js";
import {
  dumpZustand, ladeZustand, wipeZustand, baueMockdaten, SZENEN, createDevPanel, MOCK_META,
} from "../../platforms/artifact/dev-panel.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { qzStufe } from "../../core/ui/prozess.js";
import { uebergabeTeilKey } from "../../core/contracts/uebergabe.js";

/** Fake für window.storage — zwei Welten, gleiche Schnittstelle wie im Artefakt. */
function fakeStorage() {
  const w = { true: new Map(), false: new Map() };
  return {
    async get(k, shared) { const v = w[!!shared].get(k); return v === undefined ? null : { value: v }; },
    async set(k, v, shared) { w[!!shared].set(k, v); return { ok: true }; },
    async delete(k, shared) { w[!!shared].delete(k); },
    async list(prefix, shared) { return { keys: [...w[!!shared].keys()].filter(k => k.startsWith(prefix || "")) }; },
  };
}

function bausteine(store, meta) {
  const repo = new Repo({ store, ns: "PBDEV", code: meta.code, activeModuleId: "betrieb" });
  return { repo, bstate: new Bstate(repo), pstate: new Pstate(repo) };
}

const szene = id => SZENEN.find(s => s.id === id);
let store;
beforeEach(() => { store = new ArtifactStore(fakeStorage()); });

describe("Dev-Panel · Zustand speichern & laden", () => {
  it("Roundtrip: Dump → Wipe → Laden stellt beide Welten exakt wieder her (inkl. Welt-Trennung)", async () => {
    const mock = baueMockdaten();
    await szene("betrieb").wende(store);
    const vorher = await dumpZustand(store);
    expect(Object.keys(vorher.shared).length).toBeGreaterThan(2);   // meta + bstate + 2 übergaben
    expect(Object.keys(vorher.privat)).toHaveLength(2);             // pstate:A + pstate:B

    await wipeZustand(store);
    expect((await dumpZustand(store)).shared).toEqual({});

    await ladeZustand(store, vorher);
    const nachher = await dumpZustand(store);
    expect(nachher.shared).toEqual(vorher.shared);
    expect(nachher.privat).toEqual(vorher.privat);

    // Welt-Trennung: pstate liegt privat, NICHT geteilt
    const pKey = Object.keys(nachher.privat).find(k => k.endsWith("pstate:A"));
    expect(pKey).toBeTruthy();
    expect(nachher.shared[pKey]).toBeUndefined();
    // Und die echten Bausteine lesen den wiederhergestellten Zustand
    const { bstate } = bausteine(store, mock.meta);
    expect((await bstate.get("regal")).items[0].von).toBe("Anna");
  });

  it("ungültiger Dump wird abgewiesen, ohne den Bestand anzufassen", async () => {
    await szene("onboarding-fertig").wende(store);
    await expect(ladeZustand(store, { kaputt: true })).rejects.toThrow(/gültiger Zustands-Dump/);
    expect(await store.get("PBDEV:meta", true)).toMatchObject({ nameA: "Anna" });
  });
});

describe("Dev-Panel · Szenen", () => {
  it("frisch: alles leer → Onboarding-Pfad; onboarding-fertig: nur Meta", async () => {
    await szene("betrieb").wende(store);
    await szene("frisch").wende(store);
    expect(await store.get("PBDEV:meta", true)).toBeNull();

    await szene("onboarding-fertig").wende(store);
    expect(await store.get("PBDEV:meta", true)).toMatchObject({ nameA: "Anna", nameB: "Bernd" });
    const d = await dumpZustand(store);
    expect(Object.keys(d.shared)).toEqual(["PBDEV:meta"]);          // sonst nichts
  });

  it("freigaben-da: beide Übergaben lesbar über das echte Repo, aber kein Betriebszustand", async () => {
    await szene("freigaben-da").wende(store);
    const { repo, bstate } = bausteine(store, MOCK_META);
    const uA = await repo.get(uebergabeTeilKey("A"), true, "kernwetten");
    const uB = await repo.get(uebergabeTeilKey("B"), true, "kernwetten");
    expect(uA.items.length).toBeGreaterThan(0);
    expect(uB.name).toBe("Bernd");
    expect(await bstate.get("auftraege")).toBeNull();               // Betrieb noch leer
  });

  it("aufdecken-bereit: genau eine bereite Runde mit beiden Beiträgen", async () => {
    await szene("aufdecken-bereit").wende(store);
    const { bstate } = bausteine(store, MOCK_META);
    const mr = await bstate.get("messrunden");
    const bereit = mr.items.filter(r => r.status === "bereit");
    expect(bereit).toHaveLength(1);
    expect(bereit[0].werte.A.naehe).toBe(4);
    expect(bereit[0].werte.B.zweit).toBe(5);
  });

  it("qz-stufe2: die echte Leiter-Logik ergibt Stufe 2; betrieb ergibt Stufe 1", async () => {
    await szene("qz-stufe2").wende(store);
    const { bstate } = bausteine(store, MOCK_META);
    expect(qzStufe(await bstate.get("qz"))).toBe(2);

    await szene("betrieb").wende(store);
    const { bstate: b2 } = bausteine(store, MOCK_META);
    expect(qzStufe(await b2.get("qz"))).toBe(1);
  });

  it("regal-ungelesen: die Fassung liegt mit gelesen:false im Regal", async () => {
    await szene("regal-ungelesen").wende(store);
    const { bstate } = bausteine(store, MOCK_META);
    const regal = await bstate.get("regal");
    expect(regal.items[0]).toMatchObject({ von: "Anna", gelesen: false });
  });
});

describe("Dev-Panel · UI", () => {
  const tick = () => new Promise(r => setTimeout(r, 0));
  async function klick(el) { el.click(); for (let i = 0; i < 6; i++) await tick(); }

  it("Szenen-Knopf setzt den Zustand und ruft reboot; Speichern füllt das Textfeld; Laden stellt her", async () => {
    document.body.innerHTML = '<div id="host"></div>';
    let reboots = 0;
    createDevPanel({ doc: document, host: document.getElementById("host"), store, reboot: async () => { reboots++; } });

    for (const s of SZENEN) expect(document.body.textContent).toContain(s.titel);

    await klick(document.querySelector('[data-szene="betrieb"]'));
    expect(reboots).toBe(1);
    expect(document.querySelector("#devMsg").textContent).toContain("Betrieb");

    await klick(document.querySelector("#devSave"));
    const text = document.querySelector("#devDump").value;
    expect(JSON.parse(text).shared["PBDEV:meta"].nameA).toBe("Anna");

    await klick(document.querySelector("#devWipe"));
    expect(await store.get("PBDEV:meta", true)).toBeNull();
    expect(reboots).toBe(2);

    await klick(document.querySelector("#devLoad"));               // Textfeld enthält noch den Dump
    expect(await store.get("PBDEV:meta", true)).toMatchObject({ nameA: "Anna" });
    expect(reboots).toBe(3);
  });

  it("kaputtes Textfeld beim Laden: Fehlermeldung, kein Reboot, Bestand unangetastet", async () => {
    document.body.innerHTML = '<div id="host"></div>';
    let reboots = 0;
    createDevPanel({ doc: document, host: document.getElementById("host"), store, reboot: async () => { reboots++; } });
    await szene("onboarding-fertig").wende(store);
    document.querySelector("#devDump").value = "kein json";
    await klick(document.querySelector("#devLoad"));
    expect(document.querySelector("#devMsg").textContent).toContain("Laden fehlgeschlagen");
    expect(reboots).toBe(0);
    expect(await store.get("PBDEV:meta", true)).toMatchObject({ nameA: "Anna" });
  });
});
