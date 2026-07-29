// @vitest-environment happy-dom
// D10/D12-2d · Die Bedien-Ecke traegt ein Zeichen, nicht zwei Pillen.
// Baum bei Hell, Seerose bei Dunkel — dieselbe Paarung wie in der Kulisse.
// Die Ansicht ist dreiwertig (hell/dunkel/automatisch) und wird gemerkt.

import { describe, it, expect, beforeEach } from "vitest";
import { DESIGN_CSS, CHROME_HTML, applyDesign, setzeAnsicht, gemerkteAnsicht, merkeAnsicht } from "../../core/ui/design.js";

function frisch() {
  document.head.innerHTML = "";
  document.body.innerHTML = "";
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-ansicht");
  try { localStorage.clear(); } catch { /* egal */ }
}
beforeEach(frisch);

describe("D10 · Die Bedien-Ecke existiert", () => {
  it("applyDesign legt sie an, wenn die Huelle sie nicht mitbringt", () => {
    expect(document.getElementById("pbEinst")).toBeNull();
    applyDesign(document);
    const ecke = document.querySelector(".rz-ecke");
    expect(ecke).toBeTruthy();
    expect(ecke.querySelector("#pbEinst")).toBeTruthy();
    // U7/1.1 · Die Ecke traegt kein Panel mehr — sie ist der Weg zu einem Ort.
    expect(ecke.querySelector("#pbEinstBlatt")).toBeNull();
  });

  it("das Zeichen traegt beide Fassungen und eine Beschriftung", () => {
    applyDesign(document);
    const k = document.getElementById("pbEinst");
    expect(k.querySelector(".rz-einst-baum")).toBeTruthy();
    expect(k.querySelector(".rz-einst-seerose")).toBeTruthy();
    expect(k.getAttribute("aria-label")).toBeTruthy();
    // D12-2f · Gezeigt wird das WECHSELZIEL: auf Hell die Seerose, auf Dunkel
    // der Baum. CSS tauscht sie am Theme, nicht JavaScript.
    expect(DESIGN_CSS).toContain(".rz-einst-baum{display:none}");
    expect(DESIGN_CSS).toContain("html[data-theme=dark] .rz-einst-baum{display:block}");
    expect(DESIGN_CSS).toContain("html[data-theme=dark] .rz-einst-seerose{display:none}");
  });

  it("legt NICHT doppelt an, wenn die Huelle das Zeichen schon mitbringt", () => {
    document.body.innerHTML = CHROME_HTML;
    applyDesign(document);
    expect(document.querySelectorAll("#pbEinst")).toHaveLength(1);
    expect(document.querySelectorAll(".rz-ecke")).toHaveLength(1);
  });

  it("bleibt Wirt fuer die Push-Glocke (M7a sucht .pb-theme)", () => {
    applyDesign(document);
    expect(document.querySelector(".pb-theme")).toBeTruthy();
  });

  it("die Ecke wird auch dann angelegt, wenn das Stylesheet schon steht", () => {
    applyDesign(document);
    document.body.innerHTML = "";        // Huellenwechsel: Body neu, Head bleibt
    applyDesign(document);
    expect(document.getElementById("pbEinst")).toBeTruthy();
  });
});

describe("D12-2d · Die Ansicht ist dreiwertig", () => {
  it("hell und dunkel setzen data-theme unmittelbar", () => {
    setzeAnsicht(document, "dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(document.documentElement.getAttribute("data-ansicht")).toBe("dark");
    setzeAnsicht(document, "light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("automatisch folgt der Systemvorgabe — in beide Richtungen", () => {
    const echt = globalThis.matchMedia;
    let dunkel = true;
    globalThis.matchMedia = () => ({ matches: dunkel, addEventListener() {}, addListener() {} });
    setzeAnsicht(document, "auto");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    dunkel = false;
    setzeAnsicht(document, "auto");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    globalThis.matchMedia = echt;
  });

  it("eine ausdrueckliche Wahl ueberstimmt die Systemvorgabe", () => {
    const echt = globalThis.matchMedia;
    globalThis.matchMedia = () => ({ matches: true, addEventListener() {}, addListener() {} });
    setzeAnsicht(document, "light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    globalThis.matchMedia = echt;
  });

  it("unbekannte Werte fallen auf automatisch zurueck", () => {
    expect(setzeAnsicht(document, "lila")).toBe("auto");
  });

  it("die Wahl wird gemerkt; Vorgabe ist automatisch", () => {
    expect(gemerkteAnsicht()).toBe("auto");
    merkeAnsicht("dark");
    expect(gemerkteAnsicht()).toBe("dark");
    merkeAnsicht("quatsch");
    expect(gemerkteAnsicht()).toBe("auto");
  });

  it("keine alte Pillen-Regel macht die Zeilen im Blatt unsichtbar", () => {
    // D12-2f · font-size:0 und .an{display:none} stammten aus dem Pillen-Paar
    // und schlugen auf das Blatt durch: anklickbar, aber nicht zu sehen.
    expect(DESIGN_CSS).not.toContain(".pb-theme button");
    expect(DESIGN_CSS).not.toContain("#pbHell::before");
  });

  it("die Ecke steht oben rechts und traegt den Punkt fuer offene Antraege", () => {
    expect(DESIGN_CSS).toMatch(/\.rz-ecke\{position:fixed;top:calc\(18px \+ env\(safe-area-inset-top,0px\)\)/);
    expect(DESIGN_CSS).toContain(".rz-einst .rz-punkt{position:absolute");
  });
});
