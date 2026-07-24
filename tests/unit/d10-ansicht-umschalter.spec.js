// @vitest-environment happy-dom
// Design-Track D10 — der Ansicht-Umschalter (hell/dunkel) muss DA SEIN.
// Genau das fehlte: er steckte im alten KULISSE_HTML und verschwand mit ihm
// in D6, ohne dass ein Test es merkte — die Verdrahtung ist "if (el)"-
// abgesichert und schweigt, wenn die Knoepfe fehlen. Diese Datei ist der
// Waechter dagegen: Existenz, Wirkung, und der Wirt fuer die Push-Glocke.

import { describe, it, expect, beforeEach } from "vitest";
import { applyDesign, DESIGN_CSS } from "../../core/ui/design.js";

beforeEach(() => {
  document.head.innerHTML = "";
  document.body.innerHTML = '<div id="app"></div>';
  document.documentElement.removeAttribute("data-theme");
});

describe("D10 · Der Umschalter existiert", () => {
  it("applyDesign legt die Bedien-Ecke an, wenn die Huelle sie nicht mitbringt", () => {
    expect(document.getElementById("pbHell")).toBeNull();
    applyDesign(document);
    const gruppe = document.querySelector(".pb-theme");
    expect(gruppe).toBeTruthy();
    expect(gruppe.querySelector("#pbHell")).toBeTruthy();
    expect(gruppe.querySelector("#pbDunkel")).toBeTruthy();
  });

  it("beide Knoepfe tragen eine Beschriftung (der sichtbare Text wird per CSS zum Zeichen)", () => {
    applyDesign(document);
    for (const id of ["pbHell", "pbDunkel"]) {
      const k = document.getElementById(id);
      expect(k.getAttribute("aria-label")).toBeTruthy();
      expect(k.textContent.length).toBeGreaterThan(0);
    }
  });

  it("legt NICHT doppelt an, wenn die Huelle die Knoepfe schon mitbringt", () => {
    document.body.insertAdjacentHTML("beforeend",
      '<div class="pb-theme"><button id="pbHell"></button><button id="pbDunkel"></button></div>');
    applyDesign(document);
    expect(document.querySelectorAll(".pb-theme")).toHaveLength(1);
  });
});

describe("D10 · Der Umschalter wirkt", () => {
  it("Start ist hell; Tap auf Dunkel setzt data-theme und tauscht das Wechselziel", () => {
    applyDesign(document);
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    // Sichtbar ist immer nur das ZIEL: der aktive Knopf traegt "an" und wird
    // per CSS ausgeblendet.
    expect(document.getElementById("pbHell").classList.contains("an")).toBe(true);
    expect(document.getElementById("pbDunkel").classList.contains("an")).toBe(false);

    document.getElementById("pbDunkel").click();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(document.getElementById("pbDunkel").classList.contains("an")).toBe(true);
    expect(document.getElementById("pbHell").classList.contains("an")).toBe(false);

    document.getElementById("pbHell").click();
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("CSS zeigt nur das Wechselziel und stellt die Ecke oben rechts", () => {
    expect(DESIGN_CSS).toContain(".pb-theme button.an{display:none}");
    expect(DESIGN_CSS).toMatch(/\.pb-theme\{position:fixed;top:calc\(18px \+ env\(safe-area-inset-top,0px\)\);right:/);
  });
});

describe("D10 · Wirt fuer die Push-Glocke (M7a)", () => {
  it(".pb-theme ist vorhanden — sonst haengt sich die Glocke nirgends ein", () => {
    applyDesign(document);
    // genau diese Abfrage macht client.js: ergaenzePushGlocke() kehrt ohne
    // Wirt sofort zurueck, und die Glocke bliebe unsichtbar.
    expect(document.querySelector(".pb-theme")).toBeTruthy();
  });
});
