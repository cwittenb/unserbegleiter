// @vitest-environment happy-dom
// U2 · Wächter über den aufgeklappten Wegweiser (Handover Turn 41 §3).
//
// §3 ist zum größten Teil eine BESTÄTIGUNG des Ist-Standes gegen eine ältere
// Designidee („maßgeblich ist der Ist-Stand, nicht das Band aus 25d"). Dieser
// Test hält deshalb vor allem fest, was schon stimmt — damit es stimmen
// bleibt. Zwei Werte haben sich geändert, die stehen weiter unten.

import { describe, it, expect } from "vitest";
import { DESIGN_CSS } from "../../core/ui/design.js";
import { THEME_CSS } from "../../core/ui/theme.js";

const KOMPONENTEN = DESIGN_CSS.slice(DESIGN_CSS.indexOf(THEME_CSS) + THEME_CSS.length);

function regel(selektor) {
  const i = KOMPONENTEN.indexOf(selektor + "{");
  if (i < 0) return "";
  return KOMPONENTEN.slice(i, KOMPONENTEN.indexOf("}", i) + 1);
}

describe("U2 · was §3 bestätigt, bleibt so", () => {
  const panel = regel(".rz-weg-panel");

  it("aufgeklappt ist der Wegweiser eine Zone über die volle Breite", () => {
    expect(panel).toContain("position:absolute");
    expect(panel).toContain("left:0");
    expect(panel).toContain("right:0");
  });

  it("das Badge weicht dem Text — das Panel liegt darüber", () => {
    const badgeZ = Number((regel(".rz-weg-badge").match(/z-index:(\d+)/) || [])[1]);
    const panelZ = Number((panel.match(/z-index:(\d+)/) || [])[1]);
    expect(panelZ).toBeGreaterThan(badgeZ);
  });

  it("Absätze sind Serif 17 auf 1.5", () => {
    const o = regel(".rz-weg-panel .rz-option");
    expect(o).toContain("font-family:var(--rz-serif)");
    expect(o).toContain("font-size:var(--rz-fs-zeile)");
    expect(o).toContain("line-height:var(--rz-lh-fein)");
  });

  it("die Fußzeile steht zentriert darunter", () => {
    expect(regel(".rz-weg-fuss")).toContain("text-align:center");
  });

  it("kein Band, kein Kreuz, kein abgedunkelter Hintergrund", () => {
    // §3 nennt drei Dinge ausdrücklich, die es NICHT geben soll. Sie haben
    // nie existiert — dieser Test hält fest, dass das so bleibt.
    expect(panel).not.toContain("box-shadow");
    expect(panel).not.toContain("backdrop-filter");
    expect(KOMPONENTEN).not.toContain(".rz-weg-panel .rz-schliessen");
    expect(KOMPONENTEN).not.toMatch(/\.rz-weg-schleier|\.rz-weg-overlay/);
  });
});

describe("U2 · die zwei Werte, die sich geändert haben", () => {
  it("die Fläche hebt sich vom Boden ab, statt Papier zu sein", () => {
    expect(regel(".rz-weg-panel")).toContain("background:var(--rz-weg-flaeche)");
    for (const block of [THEME_CSS.slice(THEME_CSS.indexOf(":root{"), THEME_CSS.indexOf("html[data-theme=dark]")),
                         THEME_CSS.slice(THEME_CSS.indexOf("html[data-theme=dark]"))])
      expect(block).toMatch(/--rz-weg-flaeche:#[0-9a-f]{6}/);
  });

  it("der Absatzabstand liegt auf dem Raster", () => {
    // §3 nennt 22px; das Raster kennt 4/8/12/16/24/32. Entschieden: 24.
    expect(regel(".rz-weg-panel .rz-option")).toContain("margin:0 0 var(--rz-r-5)");
  });
});
