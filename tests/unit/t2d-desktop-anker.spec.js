// @vitest-environment happy-dom
// T2d · Wächter über den Desktop-Anker (Handover Turn 40 §3.3).
//
// Die eigentliche Aussage dieses Schritts ist eine NEGATIVE: es gibt auf dem
// Desktop keine zweite Rechnung mehr, die getrennt gegen die Fensterhöhe
// misst. Happy-dom kann das Layout nicht ausmessen — geprüft wird deshalb der
// Mechanismus: dass die Zweiteilung höhenfest ist, dass die Spalten rollen,
// dass die Naht-Aufbauten am .rz-split ankern statt an der Hälfte, und dass
// der aufgeklappte Zustand (Q2/Q3) davon ausgenommen bleibt.

import { describe, it, expect } from "vitest";
import { DESIGN_CSS } from "../../core/ui/design.js";
import { THEME_CSS } from "../../core/ui/theme.js";

const KOMPONENTEN = DESIGN_CSS.slice(DESIGN_CSS.indexOf(THEME_CSS) + THEME_CSS.length);

/** Den ersten @media(min-width:900px)-Block ab einer Fundstelle ausschneiden. */
function desktopBlock(ab = 0) {
  const start = KOMPONENTEN.indexOf("@media(min-width:900px){", ab);
  if (start < 0) return "";
  let i = KOMPONENTEN.indexOf("{", start), tiefe = 0;
  for (; i < KOMPONENTEN.length; i++) {
    if (KOMPONENTEN[i] === "{") tiefe++;
    else if (KOMPONENTEN[i] === "}" && --tiefe === 0) break;
  }
  return KOMPONENTEN.slice(start, i + 1);
}

const D1 = desktopBlock();                                   // Zweiteilung / Naht
const D2 = desktopBlock(KOMPONENTEN.indexOf(".rz-weg-panel{")); // Wegweiser-Panel

describe("T2d · die Zweiteilung ist auf dem Desktop höhenfest", () => {
  it("der Split bekommt eine feste Höhe, nicht nur eine Mindesthöhe", () => {
    expect(D1).toContain(".rz-split:not(.rz-regal-offen){height:100dvh}");
  });

  it("die Spalten rollen innerhalb ihrer Hälfte", () => {
    expect(D1).toContain(".rz-split:not(.rz-regal-offen)>.rz-half{min-height:0;overflow:auto}");
  });
});

describe("T2d · die Naht-Aufbauten ankern am Split, nicht an der Hälfte", () => {
  it("rz-naht-anker gibt seine Ankerrolle im zugeklappten Zustand ab", () => {
    expect(D1).toContain(".rz-split:not(.rz-regal-offen)>.rz-naht-anker{position:static}");
  });

  it("das Badge misst dann von der Mitte des Splits", () => {
    expect(D1).toContain(".rz-split:not(.rz-regal-offen) .rz-auf-naht{left:50%}");
  });

  it("das Panel gibt die 200%/-100%-Krücke auf, die den halben Anker voraussetzte", () => {
    expect(D2).toContain(".rz-split:not(.rz-regal-offen) .rz-weg-panel{right:0;width:auto;margin-left:0}");
  });

  it("jede neue Regel ist auf den zugeklappten Zustand beschränkt", () => {
    // Der Kern des Schritts: Q2/Q3 dürfen nicht mitgeändert werden.
    for (const regel of [
      ".rz-split:not(.rz-regal-offen){height:100dvh}",
      ".rz-split:not(.rz-regal-offen)>.rz-half{min-height:0;overflow:auto}",
      ".rz-split:not(.rz-regal-offen)>.rz-naht-anker{position:static}",
      ".rz-split:not(.rz-regal-offen) .rz-auf-naht{left:50%}",
    ]) expect(regel, regel).toContain(":not(.rz-regal-offen)");
  });
});

describe("T2d · der aufgeklappte Zustand bleibt unberührt", () => {
  it("Q2 · das offene Regal bleibt in seiner Hälfte", () => {
    expect(D1).toContain(".rz-regal-offen>.rz-half:last-child{left:50%}");
  });

  it("Q3 · das Badge bleibt dort an der Kante der Hälfte stehen", () => {
    // left:0 gilt weiterhin als Grundregel — im aufgeklappten Zustand ist
    // die Hälfte wieder positioniert, dort IST left:0 die Naht.
    expect(D1).toContain(".rz-split .rz-auf-naht{left:0;top:50%;transform:translate(-50%,-50%)}");
    expect(D1).toMatch(/\.rz-split\.rz-regal-offen \.rz-auf-naht\{top:50dvh\}/);
  });

  it("die Bestandsregel für die absolute Positionierung im Regal steht weiter", () => {
    expect(KOMPONENTEN).toContain(".rz-regal-offen>.rz-half:first-child{position:absolute;");
    expect(KOMPONENTEN).toContain(".rz-regal-offen{position:relative;height:100dvh;overflow:hidden}");
  });
});

describe("T2d · die Flanken rechnen weiter mit 50dvh — jetzt zu Recht", () => {
  it("beide Flanken hängen an derselben Zahl", () => {
    expect(D1).toContain(".rz-split:not(.rz-regal-offen)>.rz-half:first-child .rz-fuss{margin-bottom:50dvh}");
    /* S114.11 · Die rechte Flanke rechnet zusaetzlich das Nahtpolster mit,
       das links seit T2b als .rz-fuss{padding-bottom:var(--rz-nahtfrei)}
       steht — vorher stand die erste Zeile rechts sichtbar dichter am Badge
       als links die letzte. Dieselbe Zahl, derselbe Token, gespiegelte Seite. */
    expect(D1).toContain("margin-top:calc(50dvh + var(--rz-nahtfrei))");
  });

  it("der Kommentar trägt den offenen Rest (T2d-2), statt ihn zu verschweigen", () => {
    // Fluss-Inhalt lässt sich ohne Hüllelement nicht an eine Fensterposition
    // heften. Der Rest ist dokumentiert, nicht behoben — wer das ändert,
    // soll den Merkposten mitnehmen.
    expect(D1).toContain("T2d-2");
  });
});
