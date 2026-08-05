// L1.2/L1.3 · Hero (44a/44b) und die Kulisse auf der Landing (§4).
//
// Zwei Dinge, die im Entwurf teuer erkauft und leicht wieder kaputt sind:
//   · das Naht-Badge nennt hier eine BEDINGUNG statt eines Orts und traegt
//     KEIN Wegweiser-Zeichen (§5a) — es ist die einzige Abweichung von der
//     App-Fassung, und sie verschwindet still, wenn jemand "vereinheitlicht";
//   · die Kulisse haelt --rz-kulissenfrei (96px) frei, NICHT --rz-nahtfrei
//     (32px, das Badge-Mass). Zwei Aufbauten an derselben Naht, zwei Masse.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const HTML = readFileSync(
  fileURLToPath(new URL("../../platforms/cloudflare/landing/index.html", import.meta.url)), "utf-8");

/* Fuer Abwesenheits-Pruefungen: Kommentare duerfen einen Begriff NENNEN
   (Herleitung, Warnung), nur der Code darf ihn nicht benutzen. */
const CODE = HTML.replace(/<!--[\s\S]*?-->/g, "").replace(/\/\*[\s\S]*?\*\//g, "");

/** Der CSS-Regelsatz zu einem Selektor (erstes Vorkommen ab Position). */
function regel(selektor, ab = 0) {
  const i = HTML.indexOf(selektor + "{", ab);
  expect(i, `Regelsatz ${selektor} fehlt`).toBeGreaterThan(-1);
  return HTML.slice(i, HTML.indexOf("}", i));
}
const DESKTOP = HTML.indexOf("@media (min-width:900px)");

describe("L1.2 · Hero", () => {
  it("traegt beide Haelften der Zweiteilung im Wortlaut", () => {
    expect(HTML).toContain("Ein Raum,<br>der dir gehört.");
    expect(HTML).toContain("Ein Raum,<br>der euch gehört.");
    expect(HTML).toContain("Raum für mich");
    expect(HTML).toContain("Raum für uns");
  });

  it("§5a · das Badge nennt eine Bedingung, ohne Wegweiser-Zeichen", () => {
    expect(HTML).toContain('class="rz-badge">Nur mit Einladung<');
    // Die alte Fassung 11a hiess "Nur auf Einladung".
    expect(HTML).not.toContain("Nur auf Einladung");
    const badge = HTML.slice(HTML.indexOf('class="rz-badge"'));
    const inhalt = badge.slice(0, badge.indexOf("</span>"));
    for (const zeichen of ["→", "↓", "›", "»"])
      expect(inhalt, `Badge traegt ${zeichen}`).not.toContain(zeichen);
  });

  it("§2.3 · Marken-Spur .34em, Badge-Spur .16em — nicht verwechselt", () => {
    expect(regel(".rz-marke")).toContain("letter-spacing:.34em");
    expect(regel(".rz-badge")).toContain("letter-spacing:.16em");
    expect(regel(".rz-marke")).not.toContain(".16em");
  });

  it("Desktop 1fr 1fr / 560px, mobil gestapelt 400px / 360px", () => {
    expect(regel(".rz-hero", DESKTOP)).toContain("grid-template-columns:1fr 1fr");
    expect(regel(".rz-hero", DESKTOP)).toContain("min-height:560px");
    expect(regel(".rz-hero-papier")).toContain("min-height:400px");
    expect(regel(".rz-hero-tief")).toContain("min-height:360px");
  });

  it("Raender: mobil 24px, Desktop 44px", () => {
    expect(regel(".rz-hero-papier")).toContain("padding:30px var(--rz-rand)");
    expect(regel(".rz-hero-tief")).toContain("padding:40px var(--rz-rand) 30px");
    expect(HTML.slice(DESKTOP)).toContain("padding:40px var(--rz-rand-weit)");
    expect(HTML).toMatch(/--rz-rand:\s*24px/);
    expect(HTML).toMatch(/--rz-rand-weit:\s*44px/);
  });

  it("die Landing ist kein App-Screen: keine Zonen-Navigation, kein Wegweiser", () => {
    for (const begriff of ["rz-wegweiser", "rz-split", "data-zone", "Wegweiser"])
      expect(CODE, begriff).not.toContain(begriff);
  });
});

describe("L1.3 · Kulisse", () => {
  it("§4.4 · haelt --rz-kulissenfrei (96px) frei, nicht --rz-nahtfrei (32px)", () => {
    expect(HTML).toMatch(/--rz-kulissenfrei:\s*96px/);
    expect(CODE).not.toContain("--rz-nahtfrei");
    // Die Papier-Haelfte reserviert den Boden fuer das Band an der Naht.
    expect(regel(".rz-hero-papier")).toContain("var(--rz-kulissenfrei)");
  });

  it("mobil an der Naht wie in der App: translateY(-100%) ueber der Tiefgruen-Zone", () => {
    const k = regel(".rz-kulisse");
    expect(k).toContain("transform:translateY(-100%)");
    expect(k).toContain("top:0");
    expect(k).toContain("pointer-events:none");
  });

  it("§4.1 · Desktop waagerecht als Boden, nie auf der senkrechten Naht", () => {
    const k = regel(".rz-kulisse", DESKTOP);
    expect(k).toContain("bottom:0");
    expect(k).toContain("height:var(--rz-kulissenfrei)");
    expect(k).toContain("transform:none");
    expect(k, "Kulisse auf der senkrechten Naht").not.toContain("left:50%");
  });

  it("§4.2 · auf dunklem Grund .85 — sonst tragen die Eigen-Deckkraefte nicht", () => {
    expect(regel(".rz-kulisse-figuren", DESKTOP)).toContain("opacity:.85");
    // Mobil steht das Band ueber der PAPIER-Haelfte: dort keine Korrektur.
    expect(HTML.slice(0, DESKTOP)).not.toContain("rz-kulisse-figuren{opacity");
    // Die Wasserlinie bleibt bei .07.
    expect(HTML).toContain('opacity=".07"');
  });

  it("§4.3 · in den unteren 96px der Tiefgruen-Haelfte steht kein Text", () => {
    expect(regel(".rz-runter", DESKTOP)).toContain("margin-bottom:56px");
    expect(HTML).toContain("Informiert werden ↓");
  });
});
