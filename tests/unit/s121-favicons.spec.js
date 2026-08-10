// S121 · Zeichensatz (Favicon, Kacheln) in Build und Deployment.
//
// Vor diesem Sprint hat die App gar kein Favicon getragen: der Tab war leer,
// die Landing kannte nicht einmal eine Icon-Zeile. Was hier geprueft wird, ist
// deshalb weniger "sieht richtig aus" als "kommt ueberhaupt an" — an BEIDEN
// Deploy-Zielen, die getrennt ausgeliefert werden (Worker-Assets und Landing
// auf eigenem Host) und sich nichts voneinander borgen koennen.
//
// Der Test laeuft den echten Build in ein mkdtemp-Verzeichnis (niemals nach
// dist/ — Testartefakte sind schon einmal in einen echten Deploy geraten).

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFile, mkdtemp, rm, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildPages, ICON_DATEIEN, ICON_HEAD } from "../../scripts/build-pages.js";
import { SHELL_PFADE } from "../../platforms/cloudflare/pages/sw-routing.js";
import { THEME_COLOR, BACKGROUND_COLOR } from "../../platforms/cloudflare/pages/manifest.js";
import { ton } from "../../core/ui/theme.js";

const WURZEL = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const QUELLE = path.join(WURZEL, "platforms/cloudflare/pages/icons");

/** PNG-Abmessungen aus dem IHDR-Chunk (Bytes 16-23). */
function pngMasse(buf) {
  expect(buf.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return { breite: buf.readUInt32BE(16), hoehe: buf.readUInt32BE(20) };
}

const MASSE = {
  "favicon-16.png": 16,
  "favicon-32.png": 32,
  "apple-touch-icon.png": 180,
  "icon-192.png": 192,
  "icon-512.png": 512,
};

let outDir, index;

beforeAll(async () => {
  outDir = await mkdtemp(path.join(tmpdir(), "ub-s121-"));
  await buildPages({ outDir });
  index = await readFile(path.join(outDir, "public/index.html"), "utf8");
}, 60000);

afterAll(async () => { await rm(outDir, { recursive: true, force: true }); });

describe("S121 · Quelle", () => {
  it("jede ausgelieferte Datei liegt eingecheckt unter pages/icons/", async () => {
    for (const f of ICON_DATEIEN) await access(path.join(QUELLE, f));
  });

  it("die PNGs haben genau die Kantenlaenge, die ihr Name verspricht", async () => {
    for (const [f, kante] of Object.entries(MASSE)) {
      const { breite, hoehe } = pngMasse(await readFile(path.join(QUELLE, f)));
      expect({ f, breite, hoehe }).toEqual({ f, breite: kante, hoehe: kante });
    }
  });

  it("die SVG traegt nur die drei Toene der Palette, keinen vierten", async () => {
    const svg = await readFile(path.join(QUELLE, "favicon.svg"), "utf8");
    const erlaubt = [ton("--rz-papier"), ton("--rz-tiefgruen"), ton("--rz-akzent")].map(t => t.toLowerCase());
    const gefunden = [...new Set((svg.match(/#[0-9a-fA-F]{3,8}\b/g) || []).map(t => t.toLowerCase()))];
    expect(gefunden.sort()).toEqual([...erlaubt].sort());
  });
});

describe("S121 · App-Ziel (public/)", () => {
  it("der ganze Satz liegt in der Wurzel, bytegleich zur Quelle", async () => {
    for (const f of ICON_DATEIEN) {
      const a = await readFile(path.join(QUELLE, f));
      const b = await readFile(path.join(outDir, "public", f));
      expect(b.equals(a), f).toBe(true);
    }
  });

  it("NEGATIV: der alte Unterordner /icons/ entsteht nicht mehr", async () => {
    await expect(access(path.join(outDir, "public/icons"))).rejects.toThrow();
  });

  it("die Vektor-QUELLEN werden nicht mit ausgeliefert", async () => {
    for (const f of ["favicon-16.svg", "icon-maskable.svg"])
      await expect(access(path.join(outDir, "public", f))).rejects.toThrow();
  });

  it("die Shell traegt den Head-Schnipsel vollstaendig, inkl. 16x16-Zeile", () => {
    expect(index).toContain(ICON_HEAD);
    expect(index).toContain('sizes="16x16"');
  });

  it("jeder Icon-href der Shell loest auf eine wirklich vorhandene Datei auf", async () => {
    const hrefs = [...index.matchAll(/<link rel="(?:icon|apple-touch-icon)"[^>]*href="([^"]+)"/g)].map(m => m[1]);
    expect(hrefs.length).toBeGreaterThanOrEqual(4);
    for (const h of hrefs) await access(path.join(outDir, "public", h.replace(/^\//, "")));
  });
});

describe("S121 · Landing-Ziel (eigener Host)", () => {
  it("bringt denselben Satz in der eigenen Wurzel mit", async () => {
    for (const f of ICON_DATEIEN) await access(path.join(outDir, "landing", f));
  });

  it("alle drei Seiten tragen die Icon-Zeilen", async () => {
    for (const seite of ["index.html", "impressum/index.html", "datenschutz/index.html"]) {
      const html = await readFile(path.join(outDir, "landing", seite), "utf8");
      expect(html, seite).toContain(ICON_HEAD);
      expect(html, seite).toContain(`<meta name="theme-color" content="${THEME_COLOR}">`);
    }
  });
});

describe("S121 · Kein Pfad zeigt ins Leere", () => {
  it("jeder Precache-Eintrag des Service Workers existiert im Build-Output", async () => {
    // Dieser Test hat bisher gefehlt: SHELL_PFADE ist eine addAll-Liste — ein
    // toter Eintrag laesst die INSTALLATION scheitern, nicht nur ein Bild.
    for (const p of SHELL_PFADE) {
      const rel = p === "/" ? "index.html" : p.replace(/^\//, "");
      await access(path.join(outDir, "public", rel));
    }
  });

  it("jede Manifest-Referenz liegt im Output", async () => {
    const manifest = JSON.parse(await readFile(path.join(outDir, "public/manifest.webmanifest"), "utf8"));
    for (const e of manifest.icons)
      await access(path.join(outDir, "public", e.src.replace(/^\//, "")));
  });
});

describe("S121 · Farben kommen aus theme.js", () => {
  it("Manifest-Farben sind Tiefgruen und Papier, nicht der M1-Altbestand", () => {
    expect(THEME_COLOR).toBe(ton("--rz-tiefgruen"));
    expect(BACKGROUND_COLOR).toBe(ton("--rz-papier"));
    expect(THEME_COLOR).not.toBe("#0f766e");
    expect(BACKGROUND_COLOR).not.toBe("#f5f7f9");
  });

  it("die Vor-Boot-Flaeche der Shell zeigt Papier, nicht mehr das alte Grau", () => {
    expect(index).toContain(`--bg:${ton("--rz-papier")}`);
    expect(index).toContain(`--accent:${ton("--rz-akzent")}`);
    expect(index).not.toContain("#f5f7f9");
    expect(index).not.toContain("#0f766e");
  });
});
