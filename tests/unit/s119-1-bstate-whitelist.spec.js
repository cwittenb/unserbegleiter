// S119.1 · Kanarie gegen Whitelist-Drift.
//
// Der Fehler, den dieser Test verhindert: Der Kern liest oder schreibt ein
// Zustandsfeld, das die Speicher-Whitelist nicht kennt. Auf der Cloudflare-
// Plattform antwortet der Worker dann mit 404 — und je nach Aufrufer landet
// das laut in der Fehlerbox (messIntervall, S119.1) oder still in einem
// catch-Zweig (kulisse, verlaufInfoGezeigt). Beides fiel monatelang nicht auf,
// weil das Speicher-Backend keine Whitelist hat: im Artefakt lief alles.
//
// S92 hat denselben Fehler schon einmal repariert (merkposten, language) —
// ohne die Wiederholung zu verhindern. Das ist der Zweck dieser Datei.
//
// Bewusst statisch statt zur Laufzeit: Die Aufrufe stecken in Pfaden, die ein
// Unit-Test nicht alle durchlaeuft (Kulisse nur mit Lage, Erst-Hinweis nur
// beim ersten Ausgang). Ein Greifer ueber den Quelltext findet sie trotzdem.

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { Repo } from "../../core/store/repo.js";
import { Bstate } from "../../core/store/bundles.js";
import { MemoryStore } from "../../core/store/store.js";

const WURZEL = new URL("../../", import.meta.url).pathname;

/** Alle .js-Dateien unterhalb eines Verzeichnisses. */
function jsDateien(verzeichnis) {
  const aus = [];
  for (const eintrag of readdirSync(verzeichnis)) {
    const pfad = join(verzeichnis, eintrag);
    if (statSync(pfad).isDirectory()) aus.push(...jsDateien(pfad));
    else if (eintrag.endsWith(".js")) aus.push(pfad);
  }
  return aus;
}

/**
 * Feldnamen aus `…bstate.get("x")` / `…bstate.set("x", …)` (bzw. pstate).
 * Nur Stringliterale — ein berechneter Schluessel waere ohnehin nicht
 * statisch pruefbar und ist im Kern nirgends im Gebrauch.
 */
export function benutzteFelder(quelltext, buendel) {
  const re = new RegExp("\\b" + buendel + "\\.(?:get|set)\\(\\s*\"([^\"]+)\"", "g");
  const aus = new Set();
  for (const treffer of quelltext.matchAll(re)) aus.add(treffer[1]);
  return aus;
}

function imKernBenutzt(buendel) {
  const alle = new Set();
  for (const datei of jsDateien(join(WURZEL, "core")))
    for (const f of benutzteFelder(readFileSync(datei, "utf8"), buendel)) alle.add(f);
  return alle;
}

/** PSTATE_FELDER lebt als Literal im Worker — hier aus dem Quelltext gelesen,
 *  damit der Test nicht den Worker importieren (und seine Umgebung stellen) muss. */
function pstateWhitelist() {
  const quelle = readFileSync(join(WURZEL, "platforms/cloudflare/worker/index.js"), "utf8");
  const block = quelle.match(/const PSTATE_FELDER = new Set\(\[([\s\S]*?)\]\)/);
  expect(block, "PSTATE_FELDER nicht gefunden — Wächter blind").toBeTruthy();
  return new Set([...block[1].matchAll(/"([^"]+)"/g)].map(t => t[1]));
}

describe("S119.1 · Kanarie: keine Whitelist-Drift", () => {
  it("jedes im Kern benutzte bstate-Feld steht in Bstate.FIELDS", () => {
    const fehlend = [...imKernBenutzt("bstate")].filter(f => !Bstate.FIELDS.includes(f));
    expect(fehlend, "bstate-Felder ohne Eintrag in Bstate.FIELDS").toEqual([]);
  });

  it("jedes im Kern benutzte pstate-Feld steht in PSTATE_FELDER des Workers", () => {
    const erlaubt = pstateWhitelist();
    const fehlend = [...imKernBenutzt("pstate")].filter(f => !erlaubt.has(f));
    expect(fehlend, "pstate-Felder ohne Eintrag in PSTATE_FELDER").toEqual([]);
  });

  it("jedes Feld in Bstate.FIELDS hat einen Default (sonst liefert get() undefined)", () => {
    const ohne = Bstate.FIELDS.filter(f => !(f in Bstate.DEFAULTS));
    expect(ohne, "Felder ohne Eintrag in Bstate.DEFAULTS").toEqual([]);
  });

  // Test des Tests: Der Greifer muss ueberhaupt greifen koennen.
  it("erkennt einen erfundenen Schlüssel in einem Quelltext-Ausschnitt", () => {
    const probe = `await backend.bstate.get("zukunftsfeld");\nawait backend.bstate.set("zukunftsfeld", 1);`;
    expect([...benutzteFelder(probe, "bstate")]).toEqual(["zukunftsfeld"]);
    expect(Bstate.FIELDS).not.toContain("zukunftsfeld");
  });

  it("verwechselt bstate und pstate nicht", () => {
    const probe = `backend.pstate.get("timeline"); backend.bstate.get("goals");`;
    expect([...benutzteFelder(probe, "bstate")]).toEqual(["goals"]);
    expect([...benutzteFelder(probe, "pstate")]).toEqual(["timeline"]);
  });
});

describe("S119.1 · die beiden nachgetragenen Felder tragen", () => {
  function welt() {
    const store = new MemoryStore();
    const repo = new Repo({ store, ns: "T", code: "paar1", activeModuleId: "betrieb" });
    return { store, b: new Bstate(repo) };
  }

  it("messIntervall: Roundtrip ohne Verlust der Nachbarn", async () => {
    const { b } = welt();
    await b.set("shelf", { items: [{ id: "R1" }] });
    await b.set("messIntervall", { days: 14, vorschlag: null });
    expect(await b.get("messIntervall")).toEqual({ days: 14, vorschlag: null });
    expect(await b.get("shelf")).toEqual({ items: [{ id: "R1" }] });
  });

  it("kulisse: Roundtrip", async () => {
    const { b } = welt();
    await b.set("kulisse", { start: 1234 });
    expect(await b.get("kulisse")).toEqual({ start: 1234 });
  });

  it("beide lesen null auf leerem Speicher — und schreiben dabei nichts", async () => {
    const { store, b } = welt();
    expect(await b.get("messIntervall")).toBeNull();
    expect(await b.get("kulisse")).toBeNull();
    expect(store.ops.set).toBe(0);
  });
});
