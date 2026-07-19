// Sprint M3 — Mobile-UX-Härtung: Safe-Areas, Eingabe-Ergonomie, Standalone.
// Kanarien-Stil: die Regeln werden dort geprüft, wo sie leben (DESIGN_CSS,
// beide Shells im Build-Output), plus reine Funktionstests für istStandalone.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildPages } from "../../scripts/build-pages.js";
import { buildArtifact } from "../../scripts/build-artifact.js";
import { DESIGN_CSS, istStandalone } from "../../core/ui/design.js";

describe("M3 · Safe-Areas im Design", () => {
  it("alle vier Insets sind verdrahtet (Notch, Ränder, Home-Indicator)", () => {
    for (const seite of ["top", "right", "bottom", "left"])
      expect(DESIGN_CSS).toContain(`env(safe-area-inset-${seite}`);
  });

  it("fixierte Chrome-Elemente (Theme, Busy) weichen der oberen Safe-Area aus", () => {
    expect(DESIGN_CSS).toMatch(/\.pb-theme\{position:fixed;top:calc\(18px \+ env\(safe-area-inset-top/);
    expect(DESIGN_CSS).toMatch(/\.pb-busy\{position:fixed;top:calc\(18px \+ env\(safe-area-inset-top/);
  });
});

describe("M3 · Eingabe-Ergonomie", () => {
  it("Textfelder fallen nie unter 16px (iOS-Zoom-Falle)", () => {
    expect(DESIGN_CSS).toContain("input,select,textarea{font-size:max(16px,1em)}");
  });

  it("Haupt-Aktionen haben mindestens 44px Touch-Höhe", () => {
    expect(DESIGN_CSS).toContain(".pb-btn{min-height:44px;box-sizing:border-box}");
  });

  it("der Composer hält beim Fokus Abstand zur Kante (Tastatur-Sicht)", () => {
    expect(DESIGN_CSS).toContain(".pb-composer textarea{scroll-margin-block:80px 40vh}");
  });
});

describe("M3 · Standalone-Erkennung (rein)", () => {
  const win = (matches, navStandalone) => ({
    matchMedia: (q) => ({ matches: q === "(display-mode: standalone)" ? matches : false }),
    navigator: navStandalone === undefined ? {} : { standalone: navStandalone },
  });

  it("erkennt display-mode: standalone (installierte PWA)", () => {
    expect(istStandalone(win(true))).toBe(true);
  });

  it("erkennt das ältere iOS-Signal navigator.standalone", () => {
    expect(istStandalone(win(false, true))).toBe(true);
  });

  it("Browser-Tab ist KEIN Standalone; fehlendes window auch nicht", () => {
    expect(istStandalone(win(false))).toBe(false);
    expect(istStandalone(win(false, false))).toBe(false);
    expect(istStandalone(undefined)).toBe(false);
    expect(istStandalone({})).toBe(false);   // weder matchMedia noch navigator
  });
});

describe("M3 · beide Shells tragen das Mobile-Viewport", () => {
  let outDir, artDir, index, artefakt, appJs;
  beforeAll(async () => {
    outDir = await mkdtemp(path.join(tmpdir(), "ub-m3-pages-"));
    artDir = await mkdtemp(path.join(tmpdir(), "ub-m3-art-"));
    await buildPages({ outDir });
    const a = await buildArtifact({ outDir: artDir });
    index = await readFile(path.join(outDir, "public/index.html"), "utf8");
    appJs = await readFile(path.join(outDir, "public/app.js"), "utf8");
    artefakt = await readFile(a.out, "utf8");
  }, 60000);
  afterAll(async () => {
    await rm(outDir, { recursive: true, force: true });
    await rm(artDir, { recursive: true, force: true });
  });

  it("Pages-Shell und Artefakt-Shell: viewport-fit=cover + Tastatur-Verhalten", () => {
    const meta = 'content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content"';
    expect(index).toContain(meta);
    expect(artefakt).toContain(meta);
  });

  it("der Update-Chip im Client respektiert die untere Safe-Area", () => {
    expect(appJs).toContain("safe-area-inset-bottom");
  });

  it("der Standalone-Haken ist im Client-Bundle verdrahtet", () => {
    expect(appJs).toContain("data-standalone");
    expect(appJs).toContain("display-mode: standalone");
  });
});
