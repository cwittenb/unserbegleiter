// @vitest-environment happy-dom
// Design-Track D1 — Tokens + drei Grundbausteine (Zweiteilung/Naht,
// Hairline-Zeile, Wegweiser-Badge/Panel). Kanarien-Stil wie M3: geprüft wird
// dort, wo die Regeln leben (DESIGN_CSS), plus Verhaltens-Test der
// Panel-Verdrahtung in happy-dom.

import { describe, it, expect } from "vitest";
import { Window } from "happy-dom";
import { DESIGN_CSS, verdrahteWegweiser } from "../../core/ui/design.js";

describe("D1 · Fonts", () => {
  it("lädt Source Serif 4 und Instrument Sans — Newsreader ist Geschichte", () => {
    expect(DESIGN_CSS).toContain("family=Source+Serif+4");
    expect(DESIGN_CSS).toContain("family=Instrument+Sans");
    expect(DESIGN_CSS).not.toContain("Newsreader");
  });

  it("Basis ist Sans, Titel sind Serif (Token-Variablen)", () => {
    expect(DESIGN_CSS).toContain("--rz-serif:'Source Serif 4'");
    expect(DESIGN_CSS).toContain("--rz-sans:'Instrument Sans'");
    expect(DESIGN_CSS).toMatch(/#app\{[^}]*font-family:var\(--rz-sans\)/);
    expect(DESIGN_CSS).toMatch(/\.pb-h1\{[^}]*font-family:var\(--rz-serif\)/);
  });
});

describe("D1 · Farb-Tokens (Handoff Turn 17)", () => {
  it("Light-Palette vollständig: Papier, Regal, Hairlines, Tiefgrün, Akzent", () => {
    for (const wert of ["#faf8f2", "#f0ece0", "#e3dfd0", "#ddd8c6", "#1e2a22",
      "#141f18", "#8fae74", "#14201a", "#7d9b62", "#a9c88b", "#23291f", "#a3a894", "#41562c"])
      expect(DESIGN_CSS).toContain(wert);
  });

  it("Dark-Palette vollständig: Dark-Papier, Dark-Tiefgrün, Dark-Hairline, helle Labels", () => {
    for (const wert of ["#242b21", "#101b14", "#39412f", "#ece9da", "#aeca8d"])
      expect(DESIGN_CSS).toContain(wert);
  });

  it("beide Themes definieren den rz-Namensraum (Light in :root, Dark im data-theme-Block)", () => {
    const dunkel = DESIGN_CSS.indexOf("html[data-theme=dark]");
    expect(DESIGN_CSS.slice(0, dunkel)).toContain("--rz-papier:#faf8f2");
    expect(DESIGN_CSS.slice(dunkel)).toContain("--rz-papier:#242b21");
    expect(DESIGN_CSS.slice(dunkel)).toContain("--rz-tiefgruen:#101b14");
  });
});

describe("D1 · Grundbaustein A — Zweiteilung/Naht", () => {
  it("zwei Hälften je flex:1, mobil gestapelt, ab 900px vertikale Naht", () => {
    expect(DESIGN_CSS).toMatch(/\.rz-split\{display:flex;flex-direction:column;min-height:100dvh\}/);
    expect(DESIGN_CSS).toMatch(/\.rz-half\{flex:1;/);
    expect(DESIGN_CSS).toMatch(/@media\(min-width:900px\)\{\s*\.rz-split\{flex-direction:row\}/);
  });

  it("Auf-der-Naht-Anker: an der zweiten Hälfte, translate(-50%,-50%)", () => {
    expect(DESIGN_CSS).toContain(".rz-auf-naht{position:absolute;left:50%;top:0;transform:translate(-50%,-50%)");
  });
});

describe("D1 · Grundbaustein B — Hairline-Zeile", () => {
  it("Serif 20px, 1px-Linie, mindestens 44px Hitziel — keine Karte, kein Radius", () => {
    expect(DESIGN_CSS).toMatch(/\.rz-zeile\{[^}]*min-height:44px/);
    expect(DESIGN_CSS).toMatch(/\.rz-zeile\{[^}]*border-top:1px solid var\(--rz-hairline\)/);
    expect(DESIGN_CSS).toMatch(/\.rz-zeile\{[^}]*font-family:var\(--rz-serif\)/);
    expect(DESIGN_CSS).toMatch(/\.rz-zeile\{[^}]*border-radius:0/);
  });

  it("Varianten: gedimmt mit Zustandstext, 2px-Fortschrittsbalken, runde 22px-Initial-Badge", () => {
    expect(DESIGN_CSS).toContain(".rz-zeile.rz-gedimmt{color:var(--rz-gedimmt);cursor:default}");
    expect(DESIGN_CSS).toMatch(/\.rz-balken\{height:2px/);
    expect(DESIGN_CSS).toMatch(/\.rz-initial\{width:22px;height:22px;[^}]*border-radius:50%/);
  });
});

describe("D1 · Grundbaustein C — Wegweiser-Badge/Panel", () => {
  it("Badge: grün, UPPERCASE, eckig, mit Warte-Punkt", () => {
    expect(DESIGN_CSS).toMatch(/\.rz-weg-badge\{[^}]*background:var\(--rz-akzent\);[^}]*text-transform:uppercase/);
    expect(DESIGN_CSS).toContain(".rz-weg-badge.rz-wartet .rz-punkt{display:block}");
  });

  it("Panel klappt aus der MITTE der Naht auf — nach oben und unten gleichermassen (D8)", () => {
    // Verankert auf der Nahtlinie (top:0 + translateY(-50%)), Ursprung Mitte:
    // die Flaeche waechst symmetrisch in beide Haelften.
    expect(DESIGN_CSS).toMatch(/\.rz-weg-panel\{[^}]*transform:translateY\(-50%\) scaleY\(0\);transform-origin:center center/);
    expect(DESIGN_CSS).toContain("transition:transform .3s cubic-bezier(.2,.8,.2,1),opacity .3s cubic-bezier(.2,.8,.2,1)");
    expect(DESIGN_CSS).toContain(".rz-weg-panel.rz-offen{transform:translateY(-50%) scaleY(1);opacity:1;pointer-events:auto}");
  });

  it("Verdrahtung: Badge-Tap öffnet, Tap irgendwohin (auch aufs Panel) schließt", () => {
    const win = new Window();
    const doc = win.document;
    doc.body.innerHTML = `<div class="rz-naht-anker">
      <button class="rz-weg-badge" id="b"><span>Wegweiser</span><span class="rz-punkt"></span></button>
      <div class="rz-weg-panel" id="p"><p class="rz-option">…</p></div>
    </div><main id="m">Inhalt</main>`;
    const badge = doc.getElementById("b"), panel = doc.getElementById("p");
    verdrahteWegweiser(doc, badge, panel);

    badge.click();
    expect(panel.classList.contains("rz-offen")).toBe(true);
    doc.getElementById("m").click();                       // Klick irgendwohin schließt
    expect(panel.classList.contains("rz-offen")).toBe(false);

    badge.click();
    expect(panel.classList.contains("rz-offen")).toBe(true);
    panel.click();                                         // auch das Panel selbst schließt
    expect(panel.classList.contains("rz-offen")).toBe(false);

    badge.click(); badge.click();                          // Badge toggelt (öffnet/schließt)
    expect(panel.classList.contains("rz-offen")).toBe(false);
  });
});

describe("D1 · Bestandsschutz (M3-Invarianten leben weiter)", () => {
  it("44px-Hitziel, iOS-Zoom-Schutz und scroll-margin bleiben unangetastet", () => {
    expect(DESIGN_CSS).toContain(".pb-btn{min-height:44px;box-sizing:border-box}");
    expect(DESIGN_CSS).toContain("input,select,textarea{font-size:max(16px,1em)}");
    expect(DESIGN_CSS).toContain(".pb-composer textarea{scroll-margin-block:80px 40vh}");
  });
});
