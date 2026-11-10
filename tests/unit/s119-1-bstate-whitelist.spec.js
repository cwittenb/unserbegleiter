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
import { EINST_VERLAUF } from "../../core/ui/verlauf-ablage.js";

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
 * Nur Stringliterale.
 *
 * CR-1.5 · Hier stand bis CR-1: "ein berechneter Schluessel … ist im Kern
 * nirgends im Gebrauch". Das stimmte nicht — verlauf-ablage.js reicht eine
 * Konstante (EINST_VERLAUF) und einen zusammengesetzten Schluessel
 * (VERLAUF_PRAEFIX + id), und beide liefen an diesem Waechter vorbei ins 404.
 * Nicht-literale Schluessel greift jetzt `berechneteSchluessel` (unten); jeder
 * muss dort ausdruecklich eingeordnet sein.
 */
export function benutzteFelder(quelltext, buendel) {
  const re = new RegExp("\\b" + buendel + "\\.(?:get|set)\\(\\s*\"([^\"]+)\"", "g");
  const aus = new Set();
  for (const treffer of quelltext.matchAll(re)) aus.add(treffer[1]);
  return aus;
}

/** Kommentare entfernen — sonst zaehlt ein Beispiel im Fliesstext als Aufruf. */
function ohneKommentare(quelltext) {
  return quelltext.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

/**
 * Erste Argumente von bstate/pstate.get|set, die KEIN Stringliteral sind —
 * also Konstanten, Variablen, zusammengesetzte Ausdruecke.
 */
export function berechneteSchluessel(quelltext, buendel) {
  const re = new RegExp("\\b" + buendel + "\\.(?:get|set)\\(\\s*([^\"\\s),][^,)]*)", "g");
  const aus = new Set();
  for (const treffer of ohneKommentare(quelltext).matchAll(re)) aus.add(treffer[1].trim());
  return aus;
}

function berechnetImKern(buendel) {
  const alle = new Set();
  for (const datei of jsDateien(join(WURZEL, "core"))) {
    // Die Buendel selbst reichen den Feldnamen durch (get(feld) / set(feld, …)).
    if (datei.endsWith("core/store/bundles.js")) continue;
    for (const f of berechneteSchluessel(readFileSync(datei, "utf8"), buendel)) alle.add(f);
  }
  return alle;
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

  /* CR-1.5 · Jeder nicht-literale Schluessel ist hier EINGEORDNET: entweder
     als Konstante mit Whitelist-Eintrag oder als Schluesselfamilie mit eigener
     Route. Ein neuer berechneter Schluessel laesst diesen Test rot werden —
     und zwingt die Frage, die bei "verlauf:<id>" niemand gestellt hat: Kennt
     der Worker das? */
  it("CR-1.5 · berechnete pstate-Schlüssel: Konstanten stehen in der Whitelist, Familien haben eine Route", () => {
    const erlaubt = pstateWhitelist();
    const worker = readFileSync(join(WURZEL, "platforms/cloudflare/worker/index.js"), "utf8");
    const fassade = readFileSync(join(WURZEL, "platforms/cloudflare/pages/remote-backend.js"), "utf8");
    const EINORDNUNG = {
      // Konstante → ihr Wert muss in PSTATE_FELDER stehen.
      "EINST_VERLAUF": () => expect(erlaubt.has(EINST_VERLAUF), "EINST_VERLAUF fehlt in PSTATE_FELDER").toBe(true),
      // Familie → eigene Route im Worker UND Abbildung in der Fassade.
      "VERLAUF_PRAEFIX + id": () => {
        expect(worker, "Route /api/verlauf fehlt im Worker").toMatch(/\/api\\\/verlauf\\\//);
        expect(fassade, "Fassade bildet verlauf:<id> nicht ab").toContain("/api/verlauf/");
        expect(fassade).toContain("VERLAUF_PRAEFIX");
      },
    };
    const gefunden = [...berechnetImKern("pstate")];
    const uneingeordnet = gefunden.filter(f => !EINORDNUNG[f]);
    expect(uneingeordnet, "berechnete pstate-Schlüssel ohne Einordnung").toEqual([]);
    for (const f of gefunden) EINORDNUNG[f]();
    // Die Einordnung selbst darf nicht verwaisen (sonst prueft sie nichts mehr).
    expect(Object.keys(EINORDNUNG).filter(k => !gefunden.includes(k)), "verwaiste Einordnung").toEqual([]);
  });

  it("CR-1.5 · berechnete bstate-Schlüssel gibt es im Kern nicht", () => {
    expect([...berechnetImKern("bstate")]).toEqual([]);
  });

  it("CR-1.5 · der Greifer für berechnete Schlüssel greift — und übersieht Kommentare", () => {
    const probe = `// pstate.get(session.role, x)\nawait backend.pstate.set(PRAEFIX + id, v);\nbackend.pstate.get(KONST);\nbackend.pstate.get("fest");`;
    expect([...berechneteSchluessel(probe, "pstate")].sort()).toEqual(["KONST", "PRAEFIX + id"]);
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
