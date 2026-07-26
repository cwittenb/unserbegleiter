// F4 · Gleichzeitige Erfassung darf keinen Zählschritt verlieren.
//
// Vorher addierte jeder Aufruf auf denselben Schlüssel: lesen — rechnen —
// schreiben. Zwei Aufrufe, die den Stand lesen, bevor der jeweils andere
// geschrieben hat, ergaben zusammen EINEN gezählten Aufruf statt zwei.
//
// Die gemeinsamen Räume laufen an einem Gerät, die privaten Reflexionsräume
// aber je Partner auf dessen eigenem — zwei Menschen, die am selben Abend
// jeder für sich nachdenken, ist der erwartbare Fall. Die Untererfassung war
// deshalb systematisch einseitig und dort am größten, wo am meisten passiert.
// Da diese Zahlen Kostenmodell und Marge tragen, wird sie hier ausgeschlossen.

import { describe, it, expect } from "vitest";
import { erfasseUsage, leseTokenStand, leseTokenHistorie, leseTokenExport, monatsTag, tokenPraefix }
  from "../../platforms/cloudflare/worker/tokenstat.js";

/**
 * KV-Doppelgänger, der die Lücke zwischen Lesen und Schreiben aufreißt:
 * jedes get() gibt der Ereignisschleife nach. Genau in diesem Fenster ging
 * beim Read-Modify-Write der Zählschritt verloren.
 */
function langsamesKv() {
  const speicher = new Map();
  const atme = () => new Promise(r => setTimeout(r, 0));
  return {
    speicher,
    async get(k) { await atme(); return speicher.has(k) ? speicher.get(k) : null; },
    async put(k, v) { await atme(); speicher.set(k, v); },
    async list({ prefix = "", cursor } = {}) {
      const keys = [...speicher.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name }));
      return { keys, list_complete: true, cursor };
    },
  };
}

const usage = { in: 10, out: 3, cacheRead: 2, cacheWrite: 1 };
const JETZT = Date.parse("2026-07-26T10:00:00Z");
const now = () => JETZT;
const MONAT = monatsTag(JETZT);

describe("F4 · Nebenläufigkeit", () => {
  it("zwei gleichzeitige Erfassungen ergeben zwei Aufrufe — nicht einen", async () => {
    const kv = langsamesKv();
    await Promise.all([
      erfasseUsage(kv, "abc", usage, now),
      erfasseUsage(kv, "abc", usage, now),
    ]);
    const { total } = await leseTokenStand(kv, "abc", MONAT);
    expect(total).toMatchObject({ calls: 2, in: 20, out: 6, cacheRead: 4, cacheWrite: 2 });
  });

  it("zwanzig gleichzeitige Erfassungen: nichts geht verloren", async () => {
    const kv = langsamesKv();
    await Promise.all(Array.from({ length: 20 }, () => erfasseUsage(kv, "abc", usage, now)));
    const { total } = await leseTokenStand(kv, "abc", MONAT);
    expect(total.calls).toBe(20);
    expect(total.in).toBe(200);
  });

  it("jeder Aufruf hat einen eigenen Schlüssel — keine Überschreibung möglich", async () => {
    const kv = langsamesKv();
    await Promise.all(Array.from({ length: 5 }, () => erfasseUsage(kv, "abc", usage, now)));
    const { keys } = await kv.list({ prefix: tokenPraefix("abc") });
    expect(keys.length).toBe(5);
  });
});

describe("F4 · Das Prinzip bleibt: keine Rolleninformation", () => {
  it("weder Schlüssel noch Inhalt tragen eine Rolle", async () => {
    const kv = langsamesKv();
    await erfasseUsage(kv, "abc", usage, now);
    const [schluessel] = [...kv.speicher.keys()];
    expect(schluessel).toBe(tokenPraefix("abc", MONAT) + schluessel.split("/").pop());
    expect(schluessel).not.toMatch(/\/[AB](\/|$)/);
    const satz = JSON.parse(kv.speicher.get(schluessel));
    expect(Object.keys(satz).sort())
      .toEqual(["aktualisiert", "cacheRead", "cacheWrite", "calls", "in", "out"]);
  });
});

describe("F4 · Lesewege bleiben formgleich", () => {
  it("Historie: total plus Monatseimer", async () => {
    const kv = langsamesKv();
    await erfasseUsage(kv, "abc", usage, now);
    await erfasseUsage(kv, "abc", usage, () => Date.parse("2026-06-01T00:00:00Z"));
    const h = await leseTokenHistorie(kv, "abc");
    expect(h.total.calls).toBe(2);
    expect(Object.keys(h.monate).sort()).toEqual(["2026-06", "2026-07"]);
    expect(h.monate["2026-07"].calls).toBe(1);
  });

  it("Export: je Paar total und Monate", async () => {
    const kv = langsamesKv();
    await erfasseUsage(kv, "abc", usage, now);
    await erfasseUsage(kv, "xyz", usage, now);
    await erfasseUsage(kv, "xyz", usage, now);
    const e = await leseTokenExport(kv);
    expect(Object.keys(e).sort()).toEqual(["abc", "xyz"]);
    expect(e.abc.total.calls).toBe(1);
    expect(e.xyz.total.calls).toBe(2);
    expect(e.xyz.monate[MONAT].calls).toBe(2);
  });

  it("Paar ohne Aufrufe: total und monat sind null", async () => {
    const kv = langsamesKv();
    const { total, monat } = await leseTokenStand(kv, "leer", MONAT);
    expect(total).toBeNull();
    expect(monat).toBeNull();
  });

  it("ein beschädigter Satz kippt die Auswertung nicht", async () => {
    const kv = langsamesKv();
    await erfasseUsage(kv, "abc", usage, now);
    await kv.put(tokenPraefix("abc", MONAT) + "kaputt", "{kein json");
    const { total } = await leseTokenStand(kv, "abc", MONAT);
    expect(total.calls).toBe(1);
  });
});
