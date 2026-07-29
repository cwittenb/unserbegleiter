// @vitest-environment happy-dom
// U3b · Wächter über das Verhalten der Freigabe-Auswahl (Turn 41 §4.4, §4.5, §4.7).
//
// Drei Findings, die nichts mit dem Aussehen zu tun haben:
//   §4.4 · die Bedienanleitung stand über der Liste und scrollte weg
//   §4.5 · Gedrückthalten war 500 ms ohne jede Rückmeldung
//   §4.7 · role="button" auf zwei Absätzen Fließtext, ohne Namen

import { describe, it, expect } from "vitest";
import { DESIGN_CSS } from "../../core/ui/design.js";
import { THEME_CSS } from "../../core/ui/theme.js";
import { de } from "../../core/i18n/de.js";
import { en } from "../../core/i18n/en.js";

const KOMPONENTEN = DESIGN_CSS.slice(DESIGN_CSS.indexOf(THEME_CSS) + THEME_CSS.length);

function regel(selektor) {
  const i = KOMPONENTEN.indexOf(selektor + "{");
  if (i < 0) return "";
  return KOMPONENTEN.slice(i, KOMPONENTEN.indexOf("}", i) + 1);
}

describe("§4.4 · die Anleitung lebt im Wegweiser, nicht über der Liste", () => {
  it("der Schlüssel existiert in beiden Sprachen", () => {
    expect(de["weg.auswahlHalten"]).toBeTruthy();
    expect(en["weg.auswahlHalten"]).toBeTruthy();
  });

  it("er nennt beide Wege — Zeigegerät und Tastatur", () => {
    // Der Tastaturweg (Umschalt+Eingabe) war korrekt gelöst, aber nirgends
    // erklärt. Genau dafür ist der Wegweiser der Ort.
    expect(de["weg.auswahlHalten"]).toMatch(/Gedrückthalten/);
    expect(de["weg.auswahlHalten"]).toMatch(/Umschalt/);
  });
});

describe("§4.5 · Gedrückthalten meldet sich, bevor es zuschlägt", () => {
  it("die Rückmeldung sitzt auf der Linie, die ohnehin da ist", () => {
    const r = regel(".rz-paar.rz-halten");
    expect(r).toContain("border-top-width:2px");
    expect(r).toContain("border-top-color:var(--rz-akzent-ink)");
    // Kein Wachsen, kein Schatten — die Fläche darf sich nicht bewegen,
    // solange der Finger noch nicht entschieden hat.
    expect(r).not.toContain("transform");
    expect(r).not.toContain("box-shadow");
  });

  it("in der grünen Zone trägt sie den grünen Akzent", () => {
    expect(regel(".rz-tiefgruen .rz-paar.rz-halten")).toContain("border-top-color:var(--rz-akzent)");
  });
});

describe("§4.7 · das Paar hat einen Namen", () => {
  it("der Schlüssel für den Namen existiert in beiden Sprachen", () => {
    expect(de["ausschnitt.ariaPaar"]).toContain("{frage}");
    expect(en["ausschnitt.ariaPaar"]).toContain("{frage}");
  });
});
