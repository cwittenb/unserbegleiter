// L1.1 · Landing-Paket Turn 44 — Grundgeruest, Palette, Typo-Skala.
//
// Dies ist der EINZIGE Landing-Test, der den Build laeuft: er belegt, dass die
// drei Seiten als eigenes Artefakt entstehen (landing/, nicht public/). Die
// uebrigen L1-Tests lesen die Quelldateien direkt — sonst kostet jede
// Testdatei einen vollen esbuild-Lauf.
//
// Waechter-Rolle wie t1b: KEIN Farbliteral ausserhalb des :root-Blocks und
// KEINE Schriftgroesse ausserhalb der Skala. Die Landing importiert theme.js
// bewusst nicht (self-contained, eigenes Deploy-Ziel) — der Waechter ersetzt
// den Import durch eine Pruefung.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildPages } from "../../scripts/build-pages.js";
import { THEME_CSS } from "../../core/ui/theme.js";

const quelle = rel =>
  readFileSync(fileURLToPath(new URL("../../platforms/cloudflare/landing/" + rel, import.meta.url)), "utf-8");

const SEITEN = ["index.html", "impressum/index.html", "datenschutz/index.html"];

/** Der :root-Block einer Landing-Seite — der einzige erlaubte Ort fuer Farbe. */
function rootBlock(html) {
  const i = html.indexOf(":root{");
  const j = html.indexOf("\n}", i);
  expect(i, "kein :root-Block gefunden").toBeGreaterThan(-1);
  return html.slice(i, j);
}

let tmp;
beforeAll(async () => {
  tmp = await mkdtemp(path.join(tmpdir(), "ub-l1-"));
  await buildPages({ outDir: tmp });
});
afterAll(async () => { await rm(tmp, { recursive: true, force: true }); });

describe("L1.1 · Landing-Artefakt", () => {
  it("liefert drei Seiten unter landing/, nicht unter public/", async () => {
    for (const seite of SEITEN) {
      const html = await readFile(path.join(tmp, "landing", seite), "utf-8");
      expect(html, seite).toContain("<!doctype html>");
      expect(html, seite).toContain('<html lang="de">');
    }
    await expect(readFile(path.join(tmp, "public/landing/index.html"), "utf-8")).rejects.toThrow();
    await expect(readFile(path.join(tmp, "public/impressum/index.html"), "utf-8")).rejects.toThrow();
  });

  it("ist self-contained: keine relativen Skripte, keine App-Bundles", () => {
    for (const seite of SEITEN) {
      const html = quelle(seite);
      // Kein einziges externes Skript — auch nicht das App-Bundle.
      expect(html, seite).not.toMatch(/<script[^>]*\ssrc=/);
      expect(html, seite).not.toMatch(/src="\.?\//);
      expect(html, seite).toContain("Source+Serif+4");
      expect(html, seite).toContain("Instrument+Sans");
    }
  });
});

describe("L1.1 · Farbe lebt nur im :root-Block", () => {
  it("kein Farbliteral ausserhalb von :root", () => {
    for (const seite of SEITEN) {
      const html = quelle(seite);
      const ohneRoot = html.replace(rootBlock(html), "");
      // Kommentare duerfen Toene NENNEN (Herleitung), aber nichts setzen.
      const ohneKommentare = ohneRoot
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/<!--[\s\S]*?-->/g, "");
      const treffer = ohneKommentare.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
      expect(treffer, `${seite}: Farbliteral ausserhalb :root — ${treffer.join(", ")}`).toEqual([]);
      expect(ohneKommentare, seite).not.toMatch(/\brgba?\(/);
    }
  });

  it("jeder Ton im :root-Block steht so auch in theme.js", () => {
    // --rz-fuss ist die einzige bewusste Ausnahme: die Fussflaeche traegt in
    // 44a/44b #141f18, das theme.js nicht kennt; §2.1 verbietet neue Toene,
    // deshalb faellt sie auf --rz-akzent-text #14201a.
    const ausnahmen = new Set(["--rz-fuss"]);
    const themeToene = new Set((THEME_CSS.match(/#[0-9a-fA-F]{3,8}\b/g) || []).map(t => t.toLowerCase()));
    for (const seite of SEITEN) {
      const block = rootBlock(quelle(seite));
      for (const m of block.matchAll(/(--rz-[\w-]+)\s*:\s*([^;]+);/g)) {
        const [, name, wert] = m;
        if (ausnahmen.has(name)) continue;
        for (const ton of wert.match(/#[0-9a-fA-F]{3,8}\b/g) || [])
          expect(themeToene, `${seite} ${name}: ${ton} steht nicht in theme.js`)
            .toContain(ton.toLowerCase());
      }
    }
  });

  it("--rz-sek traegt den Wert aus theme.js (Entscheidung F2a), nicht die Markenfarbe", () => {
    for (const seite of SEITEN) {
      const block = rootBlock(quelle(seite));
      expect(block, seite).toMatch(/--rz-sek:\s*#6b7261/);
      expect(block, seite).not.toMatch(/--rz-sek:\s*#5c6653/);
    }
    // #5c6653 ist --rz-marke und bleibt der Wortmarke vorbehalten.
    expect(rootBlock(quelle("index.html"))).toMatch(/--rz-marke:\s*#5c6653/);
  });
});

describe("L1.1 · Typo nur auf der Skala", () => {
  const SKALA = new Set(["11px", "13px", "15px", "17px", "24px", "30px"]);

  it("keine Schriftgroesse ausserhalb 11/13/15/17/24/30", () => {
    for (const seite of SEITEN) {
      const html = quelle(seite);
      const streuner = [];
      // CSS-Deklarationen ausserhalb des :root-Blocks duerfen nur Variablen
      // benutzen; im :root-Block stehen die Stufen selbst.
      for (const m of html.matchAll(/font-size:\s*([^;}"']+)/g)) {
        const wert = m[1].trim();
        if (wert.startsWith("var(")) continue;
        if (SKALA.has(wert)) continue;
        streuner.push(wert);
      }
      expect(streuner, `${seite}: Typo-Streuner ${streuner.join(", ")}`).toEqual([]);
    }
  });

  it("F3b · keine Display-Stufe: 44px kommt als Schriftgroesse nicht vor", () => {
    for (const seite of SEITEN) {
      expect(quelle(seite), seite).not.toMatch(/font-size:\s*44px/);
      expect(quelle(seite), seite).not.toContain("--rz-display");
    }
  });
});

describe("L1.1 · Rhythmus und Form", () => {
  it("Abschnittsfolge Hero -> Kreis -> Struktur -> Einladung -> Fuss", () => {
    const html = quelle("index.html");
    const folge = ["rz-hero", "rz-kreis", "rz-struktur", "rz-einladung", "rz-fuss"];
    let pos = -1;
    for (const klasse of folge) {
      const i = html.indexOf(`class="${klasse}`, pos + 1);
      expect(i, `Abschnitt ${klasse} fehlt oder steht falsch`).toBeGreaterThan(pos);
      pos = i;
    }
  });

  it("keine Karten: Radien 0, keine Schatten", () => {
    for (const seite of SEITEN) {
      const html = quelle(seite);
      expect(html, seite).not.toMatch(/border-radius:\s*(?!0)/);
      expect(html, seite).not.toContain("box-shadow");
    }
  });

  it("F8a · kein Dark-Mode: alle Kontraste in Turn 44 sind auf Papier gemessen", () => {
    for (const seite of SEITEN) {
      expect(quelle(seite), seite).not.toContain("prefers-color-scheme");
      expect(quelle(seite), seite).not.toContain("data-theme");
    }
  });
});
