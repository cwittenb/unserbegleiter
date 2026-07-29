// U8.3 · Der Inline-Link-Stil.
//
// Bis hierher war .pb-link eine gepunktete Unterlinie in Fließtextfarbe — im
// Fließtext praktisch unsichtbar ("Das ganze Gespräch lesen" las sich wie
// kursiver Text), und auf Tiefgrün erst recht.
//
// Entschieden (K3a): EIN Stil, nicht zwei. Ein zweiter Link-Stil daneben
// hätte nur die Frage aufgeworfen, welcher wann gilt.
//
// Der Wächter hier ist schmaler als t1b-theme.spec.js und ergänzt ihn: Dort
// steht die Regel "keine Farbliterale außerhalb theme.js", hier steht, dass
// dieser konkrete Stil sie einhält und in BEIDEN Zonen einen Ton hat — die
// Zeitleiste und die Leseansicht liegen in der grünen Zone.

import { describe, it, expect } from "vitest";
import { THEME_CSS } from "../../core/ui/theme.js";
import { DESIGN_CSS } from "../../core/ui/design.js";

const regel = name => {
  const m = DESIGN_CSS.match(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\{([^}]*)\\}"));
  return m ? m[1] : null;
};

describe("U8.3 · Der Stil hebt sich ab", () => {
  it("die gepunktete Linie ist fort", () => {
    expect(DESIGN_CSS).not.toContain("underline dotted");
  });

  it(".pb-link trägt eine durchgezogene Linie und eigene Farbe", () => {
    const r = regel(".pb-link");
    expect(r).toContain("text-decoration:underline");
    expect(r).toContain("var(--rz-link)");
  });

  it("auf Tiefgrün gilt der eigene Ton", () => {
    expect(regel(".rz-tiefgruen .pb-link")).toContain("var(--rz-link-auf-gruen)");
  });

  it("der leise Zwilling bleibt leise — Haupt- und Nebenweg sind nicht gleich laut", () => {
    // Löschen steht neben Teilen und Schließen. Gleiche Farbe hieße: drei
    // gleichwertige Angebote, darunter das einzige ohne Rückweg.
    expect(DESIGN_CSS).toContain(".pb-link.rz-klein-leise");
    expect(regel(".rz-tiefgruen .pb-link.rz-klein-leise")).toContain("var(--rz-sek-auf-gruen)");
  });
});

describe("U8.3 · Keine Farbliterale, keine Doppelgänger", () => {
  it("die Link-Regeln nennen ausschließlich Tokens", () => {
    for (const name of [".pb-link", ".rz-tiefgruen .pb-link"])
      expect(regel(name), name).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(/i);
  });

  it("beide Tokens sind in hell UND dunkel gesetzt", () => {
    const hell = THEME_CSS.slice(THEME_CSS.indexOf(":root{"), THEME_CSS.indexOf("html[data-theme=dark]"));
    const dunkel = THEME_CSS.slice(THEME_CSS.indexOf("html[data-theme=dark]"));
    for (const tok of ["--rz-link:", "--rz-link-auf-gruen:"]) {
      expect(hell, "hell " + tok).toContain(tok);
      expect(dunkel, "dunkel " + tok).toContain(tok);
    }
  });

  it("der Link hat einen EIGENEN Ton, kein geliehener aus einer anderen Rolle", () => {
    // Der erste Anlauf lieh sich --rz-nutzer und --rz-pfeil-auf-gruen; der
    // Palettenwächter hat das zu Recht abgelehnt. Ein Link ist keine
    // Sprechblase und kein Pfeil.
    const hell = THEME_CSS.slice(THEME_CSS.indexOf(":root{"), THEME_CSS.indexOf("html[data-theme=dark]"));
    const wert = n => (hell.match(new RegExp("--rz-" + n + ":\\s*(#[0-9a-f]{3,8})", "i")) || [])[1];
    expect(wert("link")).not.toBe(wert("nutzer"));
    expect(wert("link-auf-gruen")).not.toBe(wert("pfeil-auf-gruen"));
  });
});

describe("U8.3 · Die Trefferfläche bleibt fingertauglich", () => {
  it("die Wege im Fuß der Leseansicht halten das Tapziel", () => {
    expect(regel(".rz-lesen-fuss .pb-link")).toContain("var(--rz-tapziel)");
  });
});
