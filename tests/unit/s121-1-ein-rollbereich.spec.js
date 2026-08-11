// S121.1 · Eine Bildlaufleiste, nie zwei (Turn 48 §2.1 und §2.2).
//
// Vorher: Ab 900px bekam jede Hälfte ihre eigene Höhe und, sobald der Inhalt
// länger war als das Fenster, ihren eigenen Rollbereich. Zwei Balken
// nebeneinander, die unterschiedlich weit liefen — die Hälften verschoben sich
// gegeneinander, die Naht war keine Naht mehr, und das Rad rollte je nach
// Zeigerposition mal die eine, mal die andere Spalte.
//
// Am Gerät kam dasselbe als Touch-Befund an: In der oberen Zone ließ sich nur
// die Bildlaufleiste ziehen, nicht wischen, während die zweite Zone (die über
// das Dokument rollt) normal reagierte.
//
// Jetzt: kein overflow auf den Hälften, keine feste Höhe, gerollt wird das
// Dokument. Und weil die kurze Hälfte damit vor der langen endet, trägt der
// Rahmen die Farbe als Verlauf — sonst risse der Grund mittendrin ab.

import { describe, it, expect } from "vitest";
import { DESIGN_CSS } from "../../core/ui/design.js";

/** Kommentare weg: Ein Greifer über den CSS-Text liest sie sonst mit. */
const CSS = DESIGN_CSS.replace(/\/\*[\s\S]*?\*\//g, "");

/** Der Block einer @media-Klammer als Text (ohne die Klammer selbst). */
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

describe("S121.1 · gerollt wird das Dokument", () => {
  it("die Zweiteilung ist nicht mehr höhenfest", () => {
    expect(CSS).not.toContain(".rz-split:not(.rz-regal-offen){height:100dvh}");
  });

  it("sie trägt weiterhin min-height:100dvh — sonst endet die Naht vor dem Fensterrand", () => {
    expect(CSS).toMatch(/\.rz-split\{[^}]*min-height:100dvh/);
  });

  it("dvh statt vh — sonst springt es auf iOS mit der Browserleiste", () => {
    expect(CSS).not.toMatch(/\.rz-split\{[^}]*min-height:100vh/);
  });

  it("keine Hälfte eröffnet einen eigenen Rollbereich", () => {
    for (const r of CSS.match(/\.rz-(half|split)[^{}]*\{[^}]*\}/g) || [])
      expect(r, r).not.toMatch(/overflow(-y|-x)?:\s*auto/);
  });

  it("Test des Tests: der Greifer erkennt einen konstruierten Rollbereich", () => {
    const probe = ".rz-half.rz-probe{min-height:0;overflow:auto}";
    const treffer = (probe.match(/\.rz-(half|split)[^{}]*\{[^}]*\}/g) || [])
      .filter(r => /overflow(-y|-x)?:\s*auto/.test(r));
    expect(treffer.length).toBe(1);
  });
});

describe("S121.1 · die Naht hängt am Rahmen", () => {
  it("der Tiefgrün-Grund liegt ab 900px als Verlauf auf dem Rahmen", () => {
    expect(DESKTOP).toMatch(/\.rz-split\{background:linear-gradient\(90deg,\s*var\(--rz-papier\) 0 50%,var\(--rz-tiefgruen\) 50% 100%\)\}/);
  });

  it("die Farbtrennung sitzt genau auf der Naht, nicht daneben", () => {
    const verlauf = DESKTOP.match(/linear-gradient\(90deg,[^)]*\)[^}]*\}/);
    expect(verlauf[0]).toContain("0 50%");
    expect(verlauf[0]).toContain("50% 100%");
  });

  it("die Hälften behalten ihren eigenen Grund — mobil gibt es keinen Verlauf", () => {
    // Gestapelt liegt die Naht waagerecht; ein senkrechter Verlauf wäre dort
    // falsch. Die Hälften decken den Verlauf deckungsgleich ab, solange sie
    // reichen, und färben mobil allein.
    expect(CSS).toContain(".rz-half.rz-papier{background:var(--rz-papier)");
    expect(CSS).toContain(".rz-half.rz-tiefgruen{background:var(--rz-tiefgruen)");
  });

  it("der Verlauf gilt nur ab 900px", () => {
    const vorDesktop = CSS.slice(0, CSS.indexOf("@media(min-width:900px){"));
    expect(vorDesktop).not.toContain("linear-gradient(90deg");
  });
});

describe("S121.1 · was bewusst stehen bleibt", () => {
  it("S121.6 · auch die Regal-Mechanik ist inzwischen umgestellt", () => {
    // In S121.1 stand hier bewusst der Ist-Zustand: Das Regal war noch
    // höhenfest, damit die Verschiebung sichtbar blieb. S121.6 hat sie
    // eingelöst — das Regal ist ein Akkordeon im Fluss.
    expect(CSS).not.toContain(".rz-regal-offen{position:relative;height:100dvh;overflow:hidden}");
  });

  it("der Chat behält vorerst seinen Aufbau — S121.4 stellt ihn um", () => {
    expect(CSS).toMatch(/\.rz-app #scrChat\{[^}]*height:100dvh/);
  });
});
