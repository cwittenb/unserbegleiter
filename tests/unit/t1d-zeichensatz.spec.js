// @vitest-environment happy-dom
// T1d · Ein Motiv, einmal gezeichnet.
//
// Die Kulissen-Bausteine (Baum, Blütenkelch, Schwimmblatt, Wasserring) waren
// modulprivat — deshalb trug die Bedien-Ecke einen zweiten, anders gezeichneten
// Baum und eine zweite Seerose. zeichen() gibt dieselben Pfade als Einzelsymbol
// heraus; die Sonderzeichnungen sind entfallen.

import { describe, it, expect } from "vitest";
import { zeichen, baueKulisse } from "../../core/ui/kulisse.js";
import { CHROME_HTML, DESIGN_CSS } from "../../core/ui/design.js";

const parse = html => {
  const d = document.createElement("div");
  d.innerHTML = html;
  return d;
};

describe("T1d · zeichen() gibt einzelne Symbole heraus", () => {
  for (const art of ["baum", "bluete", "knospe", "blatt", "ring"])
    it(art + " ist ein eigenständiges, skalierbares SVG", () => {
      const el = parse(zeichen(art, { groesse: 20 })).firstElementChild;
      expect(el.tagName.toLowerCase()).toBe("svg");
      expect(el.getAttribute("viewBox")).toBe("0 0 40 40");   // Skalierung über width/height
      expect(el.getAttribute("width")).toBe("20");
      expect(el.getAttribute("fill")).toBe("currentColor");   // färbt sich am Kontext
      expect(el.innerHTML.length).toBeGreaterThan(20);
    });

  it("die Größe steuert nur die Kantenlänge, nicht die Geometrie", () => {
    const klein = parse(zeichen("blatt", { groesse: 16 })).firstElementChild;
    const gross = parse(zeichen("blatt", { groesse: 64 })).firstElementChild;
    expect(klein.innerHTML).toBe(gross.innerHTML);
    expect(klein.getAttribute("viewBox")).toBe(gross.getAttribute("viewBox"));
  });

  it("klein wird schlicht: keine innere Blattlage, keine Fruchtstand-Punkte", () => {
    // Unter 28px sind r≈.9-Punkte subpixelig — die Knospen-Fassung lässt sie weg.
    const klein = parse(zeichen("bluete", { groesse: 20 })).firstElementChild;
    const gross = parse(zeichen("bluete", { groesse: 40 })).firstElementChild;
    expect(klein.querySelectorAll("path").length)
      .toBeLessThan(gross.querySelectorAll("path").length);
    expect(zeichen("bluete", { groesse: 20, schlicht: false }))
      .toBe(zeichen("bluete", { groesse: 20, schlicht: false }));
  });

  it("unbekannte Art liefert ein leeres SVG statt eines Fehlers", () => {
    const el = parse(zeichen("einhorn")).firstElementChild;
    expect(el.tagName.toLowerCase()).toBe("svg");
    expect(el.innerHTML).toBe("");
  });
});

describe("T1d · die Bedien-Ecke nutzt denselben Satz", () => {
  it("Baum und Seerose kommen aus zeichen(), nicht aus eigenen Pfaden", () => {
    const ecke = parse(CHROME_HTML);
    const baum = ecke.querySelector(".rz-einst-baum svg");
    const rose = ecke.querySelector(".rz-einst-seerose svg");
    expect(baum).toBeTruthy();
    expect(rose).toBeTruthy();
    expect(baum.innerHTML).toBe(parse(zeichen("baum", { groesse: 20 })).firstElementChild.innerHTML);
    expect(rose.innerHTML).toBe(parse(zeichen("bluete", { groesse: 20 })).firstElementChild.innerHTML);
  });

  it("die Wechselziel-Logik aus D12-2f bleibt unberührt", () => {
    expect(DESIGN_CSS).toContain(".rz-einst-baum{display:none}");
    expect(DESIGN_CSS).toContain("html[data-theme=dark] .rz-einst-baum{display:block}");
  });

  it("die Kulisse selbst zeichnet unverändert weiter", () => {
    const k = parse(baueKulisse(3, "t1d"));
    expect(k.querySelector("svg.rz-kulisse-hell")).toBeTruthy();
    expect(k.querySelector("svg.rz-kulisse-dunkel")).toBeTruthy();
  });
});
