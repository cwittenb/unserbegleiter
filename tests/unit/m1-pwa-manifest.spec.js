// Sprint M1 — PWA-Fundament: Manifest, Icons, Shell-Metas.
// Prüft den echten Build-Output (temporäres Verzeichnis, afterAll räumt auf):
// das Manifest ist valide und vollständig, jede Icon-Referenz löst auf eine
// echte PNG-Datei mit passenden Abmessungen auf, die Shell trägt die
// Install-Metas — und die Manifest-Strings kommen aus den i18n-Wörterbüchern
// (kein hartkodierter Drift).

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildPages } from "../../scripts/build-pages.js";
import { erzeugeManifest, THEME_COLOR, BACKGROUND_COLOR } from "../../platforms/cloudflare/pages/manifest.js";
import { de } from "../../core/i18n/de.js";
import { en } from "../../core/i18n/en.js";

let outDir, manifest, index;

beforeAll(async () => {
  outDir = await mkdtemp(path.join(tmpdir(), "ub-m1-pwa-"));
  await buildPages({ outDir });
  manifest = JSON.parse(await readFile(path.join(outDir, "public/manifest.webmanifest"), "utf8"));
  index = await readFile(path.join(outDir, "public/index.html"), "utf8");
}, 60000);

afterAll(async () => { await rm(outDir, { recursive: true, force: true }); });

/** PNG-Abmessungen aus dem IHDR-Chunk (Bytes 16–23) lesen. */
function pngMasse(buf) {
  expect(buf.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return { breite: buf.readUInt32BE(16), hoehe: buf.readUInt32BE(20) };
}

describe("M1 · Manifest", () => {
  it("ist valides JSON mit den Pflichtfeldern für Installierbarkeit", () => {
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBe("/");
    expect(manifest.scope).toBe("/");
    expect(manifest.display).toBe("standalone");
    expect(manifest.theme_color).toBe(THEME_COLOR);
    expect(manifest.background_color).toBe(BACKGROUND_COLOR);
    expect(manifest.lang).toBe("de");
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
  });

  it("Strings kommen aus dem i18n-Wörterbuch (Referenzsprache de), en hält Parität", () => {
    expect(manifest.name).toBe(de["pwa.name"]);
    expect(manifest.short_name).toBe(de["pwa.kurzname"]);
    expect(manifest.description).toBe(de["pwa.beschreibung"]);
    for (const k of ["pwa.name", "pwa.kurzname", "pwa.beschreibung"]) {
      expect(de[k], "de: " + k).toBeTruthy();
      expect(en[k], "en: " + k).toBeTruthy();
    }
  });

  it("Generator und Build-Output sind identisch (eine Quelle der Wahrheit)", () => {
    expect(manifest).toEqual(erzeugeManifest());
  });
});

describe("M1 · Icons", () => {
  it("jede Manifest-Referenz löst auf eine echte PNG mit passender Größe auf", async () => {
    for (const eintrag of manifest.icons) {
      const buf = await readFile(path.join(outDir, "public", eintrag.src));
      const { breite, hoehe } = pngMasse(buf);
      expect(`${breite}x${hoehe}`, eintrag.src).toBe(eintrag.sizes);
      expect(eintrag.type).toBe("image/png");
      expect(eintrag.purpose).toContain("maskable");
    }
  });

  it("Apple-Touch-Icon liegt als 180×180-PNG im Output", async () => {
    const buf = await readFile(path.join(outDir, "public/icons/apple-touch-icon.png"));
    expect(pngMasse(buf)).toEqual({ breite: 180, hoehe: 180 });
  });
});

describe("M1 · Shell-Metas", () => {
  it("die Shell verweist auf Manifest, Theme-Farbe und Icons", () => {
    expect(index).toContain('<link rel="manifest" href="/manifest.webmanifest">');
    expect(index).toContain(`<meta name="theme-color" content="${THEME_COLOR}">`);
    expect(index).toContain('<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">');
    expect(index).toContain('<link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png">');
  });

  it("Standalone-Metas für iOS/Android sind gesetzt, Titel aus i18n", () => {
    expect(index).toContain('<meta name="mobile-web-app-capable" content="yes">');
    expect(index).toContain('<meta name="apple-mobile-web-app-capable" content="yes">');
    expect(index).toContain(`<meta name="apple-mobile-web-app-title" content="${de["pwa.kurzname"]}">`);
  });
});
