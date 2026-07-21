// E2E · Selbstfahrt gegen das GEBAUTE Artefakt-Bundle (S67, Ebene C).
//
// Schließt die E2E-Lücke der Analyse: kein anderer Test fuhr bisher das
// gebündelte Produkt hoch. Muster wie die Worker-Tests: esbuild in mkdtemp,
// dann das IIFE-Bundle im happy-dom-Fenster ausführen — main.js-Boot-Wiring,
// Einrichtung, Rollenwahl und die Selbstfahrt-Journeys laufen damit gegen
// exakt das, was ausgeliefert wird (inkl. __CORE_HASH__-Ersetzung).

// @vitest-environment happy-dom

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { coreHash } from "../../scripts/core-hash.js";
import { speicherImSpeicher, drehbuchFetch, warteAuf } from "../../platforms/artifact/selbstfahrt.js";
import { CORE_VERSION } from "../../core/index.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
let tmp, bundleCode, hash;

beforeAll(async () => {
  tmp = await mkdtemp(path.join(tmpdir(), "pb-e2e-"));
  hash = await coreHash();
  const r = await build({
    entryPoints: [path.join(ROOT, "platforms/artifact/main.js")],
    bundle: true, format: "iife", write: false, target: "es2021",
    external: ["cloudflare:sockets"],
  });
  // Dieselbe Ersetzung wie scripts/build-artifact.js — der Stempel-Check
  // im Selbsttest beweist damit die intakte Build-Kette.
  bundleCode = r.outputFiles[0].text.replace(/__CORE_HASH__/g, hash);
}, 30000);

afterAll(async () => { if (tmp) await rm(tmp, { recursive: true, force: true }); });

/** Frisches Fenster je Test: #app-Wurzel, Storage-Fake, Drehbuch-fetch, Hash. */
function frischeWelt({ drehbuch = [], hashFragment = "" } = {}) {
  document.body.innerHTML = '<div id="app"></div>';
  location.hash = hashFragment;
  delete window.__PB_SELBSTFAHRT__;
  window.storage = speicherImSpeicher();
  const fetchFn = drehbuchFetch(drehbuch, null);
  globalThis.fetch = fetchFn;
  window.fetch = fetchFn;
  // Bundle im Fensterkontext ausführen (IIFE) — exakt der Auslieferungs-Weg.
  new Function(bundleCode)();
  return { fetchFn };
}

describe("E2E · gebautes Artefakt-Bundle", () => {
  it("bootet in die Einrichtung; Loslegen führt zur Rollenwahl; der Kern-Hash ist eingestempelt", async () => {
    frischeWelt();
    await warteAuf(() => document.getElementById("btnStart"), "Einrichtung erscheint (Bundle-Boot)");
    expect(window.PAARBEGLEITUNG.core).toBe(CORE_VERSION);
    expect(window.PAARBEGLEITUNG.coreHash).toBe(hash);         // Platzhalter ersetzt — Build-Kette intakt
    document.getElementById("inA").value = "Anna";
    document.getElementById("inB").value = "Bernd";
    document.getElementById("btnStart").click();
    await warteAuf(() => document.getElementById("asA"), "Rollenwahl erscheint");
    expect(document.getElementById("btnSelftest")).toBeTruthy();
  }, 20000);

  it("#selbstfahrt fährt die Journeys automatisch — Bericht maschinenlesbar, alle grün", async () => {
    frischeWelt({ hashFragment: "#selbstfahrt" });
    const bericht = await warteAuf(() => window.__PB_SELBSTFAHRT__, "Selbstfahrt-Bericht liegt vor", { timeoutMs: 15000 });
    expect(bericht.kern).toBe(CORE_VERSION);
    expect(bericht.journeys.map(j => j.id)).toEqual(["solo-smoke", "aufdeckung", "raumwechsel"]);
    for (const j of bericht.journeys)
      expect(j.ok, j.id + (j.fehler ? " — " + j.fehler : "") + "\n" +
        j.schritte.filter(s => !s.ok && !s.detail).map(s => "✗ " + s.name).join("\n")).toBe(true);
    expect(bericht.fail).toBe(0);
  }, 30000);
});
