// S121.3 · Die rollende Spalte braucht Luft an der Naht (Turn 48 §2.5).
//
// Seit S121.2 steht das Badge auf JEDER Rollhöhe an der Naht — vorher nur auf
// einer Bildschirmhöhe, an der die Flanke (Q3a) den Text weghielt. Es ist auf
// der Naht zentriert und ragt mit seiner halben Breite in die Papier-Spalte.
// Ohne Freiraum läuft es über die rechtsbündigen Werte der Haarlinien-Zeilen
// und schneidet sie ab.
//
// Das Maß ist HERGELEITET, nicht übernommen: Turn 48 rechnet mit einem 170px
// breiten Badge (88px = 2 × 44 dortiges Randmaß). Unseres ist schmaler.

import { describe, it, expect } from "vitest";
import { DESIGN_CSS } from "../../core/ui/design.js";

const CSS = DESIGN_CSS.replace(/\/\*[\s\S]*?\*\//g, "");

/** Wert eines Tokens aus dem Stylesheet, in px. */
function token(name) {
  const t = CSS.match(new RegExp("--" + name + ":\\s*(\\d+)px"));
  return t ? Number(t[1]) : null;
}

/** Der Block einer @media-Klammer als Text. */
function medienBlock(css, bedingung) {
  const start = css.indexOf("@media(" + bedingung + "){");
  if (start < 0) return "";
  let i = css.indexOf("{", start), tiefe = 0, j = i;
  for (; j < css.length; j++) {
    if (css[j] === "{") tiefe++;
    else if (css[j] === "}" && --tiefe === 0) break;
  }
  return css.slice(i + 1, j);
}
const DESKTOP = medienBlock(CSS, "min-width:900px");

describe("S121.3 · Luft an der Naht", () => {
  it("die Papier-Spalte hält den Freiraum rechts", () => {
    expect(DESKTOP).toMatch(
      /\.rz-split:not\(\.rz-regal-offen\)>\.rz-half:first-child\{\s*padding-right:var\(--rz-nahtfrei-x\)\}/);
  });

  it("das Maß liegt als Token vor, nicht als Zahl in der Regel", () => {
    expect(token("rz-nahtfrei-x")).toBeGreaterThan(0);
  });

  it("es deckt die halbe Badge-Breite plus das reguläre Randmaß", () => {
    // Rechnung: 11px Versalien, .16em gesperrt, 18px Polster je Seite.
    // Längstes der sechs Etiketten beider Sprachen ist "RAUM FÜR MICH":
    // rund 140px, halb also 70. Plus --rz-rand sind das 94.
    const rand = token("rz-rand");
    const badgeHalbMax = 70;
    expect(token("rz-nahtfrei-x")).toBeGreaterThanOrEqual(badgeHalbMax + rand);
  });

  it("und ist ein Vielfaches des Randmaßes — kein krummer Wert im Raster", () => {
    expect(token("rz-nahtfrei-x") % token("rz-rand")).toBe(0);
  });

  it("nur ab 900px — gestapelt liegt die Naht waagerecht", () => {
    const vorDesktop = CSS.slice(0, CSS.indexOf("@media(min-width:900px){"));
    expect(vorDesktop).not.toContain("--rz-nahtfrei-x)");
  });

  it("S121.5 · die zweite Hälfte hält denselben Freiraum", () => {
    // Zuerst bewusst offen gelassen (Turn 48 gibt ihn nur der Papier-Spalte),
    // dann entschieden: Das Badge ist auf der Naht ZENTRIERT und ragt genauso
    // weit nach rechts, wo es den Zeilenanfang der Regalzeilen deckte.
    expect(DESKTOP).toMatch(
      /\.rz-split:not\(\.rz-regal-offen\)>\.rz-half:last-child\{\s*padding-left:var\(--rz-nahtfrei-x\)\}/);
  });

  it("und zwar mit demselben Maß — eine Naht, ein Freiraum", () => {
    const links = DESKTOP.match(/>\.rz-half:first-child\{\s*padding-right:var\(--([\w-]+)\)\}/);
    const rechts = DESKTOP.match(/>\.rz-half:last-child\{\s*padding-left:var\(--([\w-]+)\)\}/);
    expect(links[1]).toBe(rechts[1]);
  });

  it("im aufgeklappten Regal gilt der Freiraum nicht", () => {
    // Dort ist die Hälfte absolut positioniert und das Badge ankert an ihr
    // (Q2/Q3) — eine andere Rechnung, die dieser Schritt nicht anfasst.
    expect(DESKTOP).toContain(".rz-split:not(.rz-regal-offen)>.rz-half:first-child{");
  });

  it("das senkrechte Freimaß bleibt daneben bestehen", () => {
    // --rz-nahtfrei (T2b) hält den Zonenfuß vom Badge weg. Zwei Maße, zwei
    // Richtungen; das neue ersetzt das alte nicht.
    expect(token("rz-nahtfrei")).toBeGreaterThan(0);
    expect(CSS).toContain(".rz-split>.rz-half:first-child .rz-fuss{padding-bottom:var(--rz-nahtfrei)}");
  });
});
