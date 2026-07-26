// @vitest-environment happy-dom
// T1b · Wächter über die Theme-Schicht.
//
// Dieselbe Rolle, die der i18n-Kanarientest für Texte spielt: er hält den
// Zustand, statt ihn nur einmal herzustellen. Farbe, Schriftgröße, Radius und
// Übergangskurve gehören nach theme.js — nirgendwo sonst.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { DESIGN_CSS } from "../../core/ui/design.js";
import { THEME_CSS } from "../../core/ui/theme.js";

const lies = rel => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf-8");
const KOMPONENTEN_CSS = DESIGN_CSS.slice(DESIGN_CSS.indexOf(THEME_CSS) + THEME_CSS.length);

describe("T1b · Farbe lebt nur im Theme", () => {
  it("die Komponentenregeln enthalten kein Farbliteral", () => {
    const treffer = KOMPONENTEN_CSS.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
    expect(treffer).toEqual([]);
  });

  it("auch die UI-Module malen nicht selbst", () => {
    for (const rel of ["../../core/ui/kulisse.js", "../../core/ui/html.js", "../../core/ui/sessions.js"]) {
      const quelle = lies(rel).replace(/^\s*\/\/.*$/gm, "");     // Kommentare dürfen Werte nennen
      expect(quelle.match(/#[0-9a-fA-F]{6}\b/g) || [], rel).toEqual([]);
    }
  });

  it("jeder im Dark-Block überschriebene Token ist im Root-Block angelegt", () => {
    const root = THEME_CSS.slice(THEME_CSS.indexOf(":root{"), THEME_CSS.indexOf("html[data-theme=dark]"));
    const dark = THEME_CSS.slice(THEME_CSS.indexOf("html[data-theme=dark]"));
    for (const tok of new Set((dark.match(/--[a-z0-9-]+(?=:)/g) || [])))
      expect(root, tok).toContain(tok + ":");
  });
});

describe("T1b · Skalen statt Streuung", () => {
  it("keine nackte Schriftgröße in den Komponentenregeln", () => {
    // Ausnahme: die iOS-Zoom-Härtung (M3) braucht das Literal in max().
    const ohneM3 = KOMPONENTEN_CSS.replace("font-size:max(16px,1em)", "");
    expect(ohneM3.match(/font-size:\s*[0-9.]+px/g) || []).toEqual([]);
  });

  it("Radien kommen aus der Skala", () => {
    const roh = (KOMPONENTEN_CSS.match(/border-radius:\s*[0-9.]+px/g) || [])
      .filter(r => !/border-radius:\s*0px/.test(r));
    expect(roh).toEqual([]);
  });

  it("die Übergangskurve steht einmal, nicht überall", () => {
    expect(KOMPONENTEN_CSS).not.toContain("cubic-bezier(");
    expect(THEME_CSS).toContain("--rz-kurve:cubic-bezier(");
  });

  it("die Skalen sind vollständig angelegt", () => {
    for (const tok of ["--rz-fs-caps", "--rz-fs-fein", "--rz-fs-text", "--rz-fs-zeile",
      "--rz-fs-sektion", "--rz-fs-titel", "--rz-r-1", "--rz-r-6", "--rz-rand",
      "--rz-rund-knopf", "--rz-rund-blatt", "--rz-rund-pille", "--rz-tapziel"])
      expect(THEME_CSS, tok).toContain(tok + ":");
  });
});

describe("T1c · die Templates malen nicht mehr selbst", () => {
  it("kein Screen-Modul trägt noch ein style-Attribut", () => {
    for (const rel of ["../../core/ui/app.js", "../../core/ui/ansichten-screen.js",
      "../../core/ui/panels.js", "../../core/ui/einstellungen-screen.js",
      "../../core/ui/recovery-screen.js", "../../core/ui/chat-kern.js",
      "../../core/ui/auswahl-screen.js", "../../core/ui/prozess.js",
      "../../core/ui/sessions.js", "../../core/ui/kernwetten.js"])
      expect(lies(rel).match(/style="/g) || [], rel).toEqual([]);
  });

  it("die Hilfsklassen ziehen ihre Werte aus der Skala, nicht aus Zahlen", () => {
    const block = KOMPONENTEN_CSS.slice(KOMPONENTEN_CSS.indexOf(".rz-voll{"),
                                        KOMPONENTEN_CSS.indexOf(".rz-zahlfeld{"));
    expect(block.match(/font-size:\s*[0-9.]+px/g) || []).toEqual([]);
    expect(block).toContain("var(--rz-fs-fein)");
    expect(block).toContain("var(--rz-r-2)");
  });
});

describe("T1b · die Schicht ist wirklich vorangestellt", () => {
  it("DESIGN_CSS enthält den Theme-Block genau einmal und zuerst", () => {
    const i = DESIGN_CSS.indexOf(THEME_CSS);
    expect(i).toBeGreaterThan(-1);
    expect(DESIGN_CSS.indexOf(THEME_CSS, i + 1)).toBe(-1);
    expect(DESIGN_CSS.indexOf(":root{")).toBeLessThan(DESIGN_CSS.indexOf("html{height:100%}"));
  });
});
