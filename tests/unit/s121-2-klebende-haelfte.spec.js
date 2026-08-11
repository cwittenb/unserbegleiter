// @vitest-environment happy-dom
// S121.2 · Welche Hälfte klebt — gemessen, nicht festgelegt (Turn 48 §2.3/2.4).
//
// Seit S121.1 die Höhen gefallen sind, endet die kurze Hälfte nach ihrem
// Inhalt, während die lange weiterläuft: Man rollt an einer leeren Fläche
// entlang, und was dort stand, ist nach einem Bildschirm fort. `sticky` hält
// sie im Blick.
//
// Der gefährliche Fall ist die Umkehrung: Eine klebende Spalte, die SELBST
// höher ist als das Fenster, friert oben fest — ihr unteres Ende wird nie
// erreichbar. Deshalb misst die Regel beide Seiten, und der Rückfall ist
// immer "klebt nicht". Ein Messfehler kostet Eleganz, nie Inhalt.

import { describe, it, expect, beforeEach } from "vitest";
import { DESIGN_CSS } from "../../core/ui/design.js";
import { bestimmeKleber, messeScreen, beobachteScreen, KLEBT, DESKTOP_AB } from "../../core/ui/kleben.js";

const CSS = DESIGN_CSS.replace(/\/\*[\s\S]*?\*\//g, "");

describe("S121.2 · die Regel", () => {
  const F = 800;   // Fensterhöhe

  it("die kurze Hälfte klebt, wenn die andere überläuft", () => {
    expect(bestimmeKleber(400, 2000, F)).toBe(0);
    expect(bestimmeKleber(2000, 400, F)).toBe(1);
  });

  it("beide kurz: niemand klebt — es gibt nichts zu rollen", () => {
    expect(bestimmeKleber(400, 500, F)).toBe(-1);
  });

  it("beide lang: niemand klebt — sonst verlöre eine ihr eigenes Ende", () => {
    expect(bestimmeKleber(2000, 3000, F)).toBe(-1);
  });

  it("genau fensterhoch zählt als passend", () => {
    expect(bestimmeKleber(F, F + 1, F)).toBe(0);
  });

  it("ohne brauchbare Fensterhöhe klebt nichts", () => {
    expect(bestimmeKleber(100, 5000, 0)).toBe(-1);
  });
});

/* ---- Messung am Element ---- */

function bauScreen({ ersteHoehe, zweiteHoehe, klasse = "rz-split" }) {
  document.body.innerHTML =
    `<div id="s" class="${klasse}"><div class="rz-half"></div><div class="rz-half rz-naht-anker"></div></div>`;
  const screen = document.getElementById("s");
  const [a, b] = screen.querySelectorAll(":scope > .rz-half");
  // happy-dom misst kein Layout — die Höhen werden gestellt.
  Object.defineProperty(a, "scrollHeight", { get: () => ersteHoehe, configurable: true });
  Object.defineProperty(b, "scrollHeight", { get: () => zweiteHoehe, configurable: true });
  return { screen, a, b };
}
const fenster = (breite, hoehe) => ({ innerWidth: breite, innerHeight: hoehe });

beforeEach(() => { document.body.innerHTML = ""; });

describe("S121.2 · die Messung am Screen", () => {
  it("setzt die Klasse an der kurzen Hälfte", () => {
    const { screen, a, b } = bauScreen({ ersteHoehe: 400, zweiteHoehe: 3000 });
    expect(messeScreen(screen, fenster(1440, 800))).toBe(0);
    expect(a.classList.contains(KLEBT)).toBe(true);
    expect(b.classList.contains(KLEBT)).toBe(false);
  });

  it("nimmt sie wieder weg, wenn sich das Verhältnis dreht", () => {
    const { screen, a } = bauScreen({ ersteHoehe: 400, zweiteHoehe: 3000 });
    messeScreen(screen, fenster(1440, 800));
    expect(a.classList.contains(KLEBT)).toBe(true);

    // Fenster wird hoch genug für beide Spalten.
    messeScreen(screen, fenster(1440, 4000));
    expect(a.classList.contains(KLEBT)).toBe(false);
  });

  it("mobil klebt nichts — gestapelt gibt es nur einen Rollweg", () => {
    const { screen, a, b } = bauScreen({ ersteHoehe: 400, zweiteHoehe: 3000 });
    expect(messeScreen(screen, fenster(DESKTOP_AB - 1, 800))).toBe(-1);
    expect(a.classList.contains(KLEBT)).toBe(false);
    expect(b.classList.contains(KLEBT)).toBe(false);
  });

  it("im aufgeklappten Regal klebt nichts — dort ordnet die Zone neu", () => {
    const { screen, a } = bauScreen({ ersteHoehe: 400, zweiteHoehe: 3000, klasse: "rz-split rz-regal-offen" });
    expect(messeScreen(screen, fenster(1440, 800))).toBe(-1);
    expect(a.classList.contains(KLEBT)).toBe(false);
  });

  it("misst OHNE die Klasse — sonst bestätigt die Messung ihr eigenes Ergebnis", () => {
    // Eine klebende Hälfte steht auf 100dvh; ihre Inhaltshöhe wäre nicht mehr
    // ablesbar. Hier gestellt: Die Klasse liegt schon an der FALSCHEN Hälfte.
    const { screen, a, b } = bauScreen({ ersteHoehe: 3000, zweiteHoehe: 400 });
    a.classList.add(KLEBT);
    expect(messeScreen(screen, fenster(1440, 800))).toBe(1);
    expect(a.classList.contains(KLEBT)).toBe(false);
    expect(b.classList.contains(KLEBT)).toBe(true);
  });

  it("ein Screen ohne zwei Hälften wird in Ruhe gelassen", () => {
    document.body.innerHTML = '<div id="s" class="rz-split"><div class="rz-half"></div></div>';
    expect(messeScreen(document.getElementById("s"), fenster(1440, 800))).toBe(-1);
  });
});

describe("S121.2 · die Beobachtung", () => {
  it("misst sofort und meldet sich beim Fenster an", () => {
    const { screen, a } = bauScreen({ ersteHoehe: 400, zweiteHoehe: 3000 });
    const lauscher = [];
    const win = {
      innerWidth: 1440, innerHeight: 800,
      addEventListener: (typ, fn) => lauscher.push([typ, fn]),
      removeEventListener: () => {},
    };
    const ab = beobachteScreen(screen, win);
    expect(a.classList.contains(KLEBT)).toBe(true);
    expect(lauscher.map(l => l[0])).toContain("resize");
    ab();
  });

  it("kommt ohne ResizeObserver aus — Messung ist Komfort, nie Voraussetzung", () => {
    const { screen } = bauScreen({ ersteHoehe: 400, zweiteHoehe: 3000 });
    const win = { innerWidth: 1440, innerHeight: 800, addEventListener() {}, removeEventListener() {} };
    expect(() => beobachteScreen(screen, win)()).not.toThrow();
  });

  it("meldet sich wieder ab", () => {
    const { screen } = bauScreen({ ersteHoehe: 400, zweiteHoehe: 3000 });
    let ab = 0;
    const win = {
      innerWidth: 1440, innerHeight: 800,
      addEventListener() {}, removeEventListener: () => ab++,
    };
    beobachteScreen(screen, win)();
    expect(ab).toBe(1);
  });
});

describe("S121.2 · das Stylesheet", () => {
  it("die klebende Hälfte steht auf sticky, oben, eine Fensterhöhe hoch", () => {
    const regel = CSS.match(/\.rz-split:not\(\.rz-regal-offen\)>\.rz-half\.rz-klebt\{[^}]*\}/);
    expect(regel, "Regel für die klebende Hälfte fehlt").toBeTruthy();
    expect(regel[0]).toContain("position:sticky");
    expect(regel[0]).toContain("top:0");
    expect(regel[0]).toContain("height:100dvh");
  });

  it("align-self:flex-start — ohne das füllt die Hälfte den Rahmen und kann nicht kleben", () => {
    const regel = CSS.match(/\.rz-split:not\(\.rz-regal-offen\)>\.rz-half\.rz-klebt\{[^}]*\}/);
    expect(regel[0]).toContain("align-self:flex-start");
  });

  it("das Badge ist absolute in seiner Hälfte und misst 50dvh — nicht 50%", () => {
    expect(CSS).toContain(".rz-split:not(.rz-regal-offen) .rz-auf-naht{left:0;top:50dvh}");
    expect(CSS).not.toContain(".rz-split:not(.rz-regal-offen) .rz-auf-naht{left:50%}");
  });

  it("die Hälfte gibt ihre Ankerrolle nicht mehr ab", () => {
    // Bis T2d wurde rz-naht-anker static, damit das Badge am .rz-split misst.
    // Seit der Split so hoch ist wie sein Inhalt, wäre das die halbe
    // Dokumenthöhe — das Badge säße auf langen Seiten viel zu tief.
    expect(CSS).not.toContain(".rz-split:not(.rz-regal-offen)>.rz-naht-anker{position:static}");
    expect(CSS).toContain(".rz-naht-anker{position:relative}");
  });

  it("das Badge bleibt absolute — nicht fixed über Fuß, Dialog und Tastatur", () => {
    const grund = CSS.match(/\.rz-auf-naht\{[^}]*\}/);
    expect(grund[0]).toContain("position:absolute");
  });
});
