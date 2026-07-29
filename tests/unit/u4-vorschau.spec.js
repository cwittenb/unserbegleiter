// @vitest-environment happy-dom
// U4 · Wächter über die Freigabe-Vorschau (Turn 41 §4.8–4.10).
//
// Die Vorschau zeigt, was tatsächlich beim Leser ankommt — samt der
// Auslassung „…", die es NUR hier gibt. Drei Findings:
//   §4.8  · Inhalt auf Papier, Handlungen unten; der dunkle Kasten fällt weg
//   §4.9  · das Entfernen-Zeichen war 15 px ohne Trefferfläche, bei .6 Deckkraft
//   §4.10 · die Wege waren nackte Systemkästchen

import { describe, it, expect } from "vitest";
import { DESIGN_CSS } from "../../core/ui/design.js";
import { THEME_CSS } from "../../core/ui/theme.js";

const KOMPONENTEN = DESIGN_CSS.slice(DESIGN_CSS.indexOf(THEME_CSS) + THEME_CSS.length);

function regel(selektor) {
  const i = KOMPONENTEN.indexOf(selektor + "{");
  if (i < 0) return "";
  return KOMPONENTEN.slice(i, KOMPONENTEN.indexOf("}", i) + 1);
}

describe("§4.8 · Inhalt auf Papier, Handlungen unten", () => {
  it("die Vorschau hat keinen eigenen dunklen Boden", () => {
    // Der Ausschnitt steht auf Papier. Ein Tiefgrün-Block mitten im Blatt
    // wäre eine Zone ohne Naht.
    expect(regel(".rz-vorschau .rz-von")).toContain("color:var(--rz-label)");
    expect(KOMPONENTEN).not.toContain(".rz-vorschau{background");
  });

  it("die Klasse des Teilen-Blocks bleibt — panels.js braucht sie", () => {
    // Nicht gelöscht, nur in der Vorschau nicht mehr benutzt: die
    // Selbstmitteilung im Gate-Panel ist dort richtig aufgehoben.
    expect(regel(".rz-teilen-block")).toContain("background:var(--rz-tiefgruen)");
  });
});

describe('§4.9 · das Entfernen-Zeichen ist die einzige wegnehmende Handlung', () => {
  const weg = regel(".rz-vorschau-weg");

  it("volle Trefferfläche statt 15 px neben dem Text", () => {
    expect(weg).toContain("width:var(--rz-tapziel-finger)");
    expect(weg).toContain("height:var(--rz-tapziel-finger)");
  });

  it("es steht rechts, mit Abstand zum Text", () => {
    const zeile = regel(".rz-vorschau-zeile");
    expect(zeile).toContain("display:flex");
    expect(zeile).toContain("gap:var(--rz-r-3)");
    expect(weg).toContain("flex:none");
  });

  it("nicht mehr auf .6 heruntergedimmt", () => {
    // Eine Handlung, die etwas wegnimmt, darf nicht die leiseste auf dem
    // Schirm sein.
    expect(weg).not.toContain("opacity");
    expect(weg).toContain("color:var(--rz-sek)");
  });
});

describe("§4.10 · die Wege sind Haarlinien-Zeilen", () => {
  const wahl = regel(".rz-wahl");

  it("44 px hoch, mit dem Kästchen links", () => {
    expect(wahl).toContain("min-height:var(--rz-tapziel-finger)");
    expect(wahl).toContain("display:flex");
    expect(wahl).toContain("border-top:1px solid var(--rz-hairline)");
  });

  it("das Kästchen bleibt ein echtes Steuerelement, nur eingefärbt", () => {
    // Eine nachgebaute Marke müsste den Haken selbst zeichnen — und ein
    // handgezeichneter Haken, der vom System abweicht, ist der schlechtere
    // Tausch als ein eingefärbter echter.
    const box = regel(".rz-wahl input[type=checkbox]");
    expect(box).toContain("accent-color:var(--rz-tiefgruen)");
    expect(box).not.toContain("appearance:none");
  });

  it("in der grünen Zone trägt sie den grünen Ton", () => {
    expect(regel(".rz-tiefgruen .rz-wahl")).toContain("border-top-color:var(--rz-hairline-gruen)");
    expect(regel(".rz-tiefgruen .rz-wahl input[type=checkbox]")).toContain("accent-color:var(--rz-akzent)");
  });
});
