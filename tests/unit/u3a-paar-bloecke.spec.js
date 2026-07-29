// @vitest-environment happy-dom
// U3a · Wächter über die Paar-Blöcke der Freigabe (Turn 41 §4.1–4.3, §4.6).
//
// Der Kern: der Paar-Block war der einzige Rahmen im System, und der gewählte
// Zustand hing an einer Randfarbe, die im dunklen Theme verschwunden wäre.
// Beides hält dieser Test fest — als Negativ-Aussagen, denn genau das ist die
// Aussage der Findings.

import { describe, it, expect } from "vitest";
import { DESIGN_CSS } from "../../core/ui/design.js";
import { THEME_CSS } from "../../core/ui/theme.js";

const KOMPONENTEN = DESIGN_CSS.slice(DESIGN_CSS.indexOf(THEME_CSS) + THEME_CSS.length);

function regel(selektor) {
  const i = KOMPONENTEN.indexOf(selektor + "{");
  if (i < 0) return "";
  return KOMPONENTEN.slice(i, KOMPONENTEN.indexOf("}", i) + 1);
}

describe("U3a · kein Rahmen mehr um den Paar-Block (§4.1)", () => {
  const grund = regel(".rz-paar");

  it("Haarlinie oben statt Kasten, Radius 0", () => {
    expect(grund).toContain("border:0");
    expect(grund).toContain("border-top:1px solid var(--rz-hairline)");
    expect(grund).toContain("border-radius:0");
  });

  it("der Rhythmus trägt: Polster statt Außenabstand", () => {
    expect(grund).toContain("padding:15px 0");
    expect(grund).toContain("margin:0");
  });
});

describe("U3a · die Fläche wählt (§4.1, §4.2, K11)", () => {
  const an = regel(".rz-paar.rz-an");

  it("gewählt heißt gefüllt, nicht umrandet", () => {
    expect(an).toContain("background:var(--rz-flaeche-hoch)");
    // Der eigentliche Befund von §4.2: border-color:var(--rz-tiefgruen) wäre
    // im dunklen Theme dunkler als Papier gewesen — der gewählte Rand hätte
    // sich nicht abgehoben, sondern aufgelöst.
    expect(an).not.toContain("border-color");
  });

  it("die Fläche blutet bis zur Zonenkante aus", () => {
    expect(an).toContain("margin:0 calc(var(--rz-rand) * -1)");
    expect(an).toContain("padding:15px var(--rz-rand)");
  });

  it("--rz-flaeche-hoch dreht die Richtung zwischen den Themes", () => {
    const wert = t => (THEME_CSS.slice(t === "hell" ? THEME_CSS.indexOf(":root{") : THEME_CSS.indexOf("html[data-theme=dark]"))
      .match(/--rz-flaeche-hoch:(#[0-9a-f]{6})/) || [])[1];
    const papier = t => (THEME_CSS.slice(t === "hell" ? THEME_CSS.indexOf(":root{") : THEME_CSS.indexOf("html[data-theme=dark]"))
      .match(/--rz-papier:(#[0-9a-f]{6})/) || [])[1];
    const summe = h => [1, 3, 5].reduce((s, i) => s + parseInt(h.slice(i, i + 2), 16), 0);
    // hell: eine Stufe DUNKLER als Papier · dunkel: eine Stufe HELLER
    expect(summe(wert("hell"))).toBeLessThan(summe(papier("hell")));
    expect(summe(wert("dunkel"))).toBeGreaterThan(summe(papier("dunkel")));
  });
});

describe("U3a · gesperrt ist ohne Farbe erkennbar (§4.3)", () => {
  it("gestrichelte Oberkante als zweites Signal", () => {
    const zu = regel(".rz-paar.rz-zu");
    expect(zu).toContain("border-top-style:dashed");
    expect(zu).toContain("opacity:.5");
    expect(zu).toContain("cursor:default");
  });
});
