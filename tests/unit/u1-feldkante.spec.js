// @vitest-environment happy-dom
// U1 · Wächter über die Feldkante (Handover Turn 41 §2).
//
// Ein Baustein für alle Eingaben außerhalb des Chats. Drei Dinge daran sind
// leicht zu verlieren und deshalb festgehalten:
//   1. Kein Radius — §2 und Entscheidung K15 (eng gelesen: 0 auf 41a–41f).
//   2. Der Systemring ist abgeschaltet. Wer outline:none schreibt, MUSS einen
//      Ersatz mitliefern, sonst ist die Tastaturbedienung blind.
//   3. Die Fokuslinie hält 3:1 — sie ist der einzige Hinweis, der bleibt.

import { describe, it, expect } from "vitest";
import { DESIGN_CSS } from "../../core/ui/design.js";
import { THEME_CSS } from "../../core/ui/theme.js";

const KOMPONENTEN = DESIGN_CSS.slice(DESIGN_CSS.indexOf(THEME_CSS) + THEME_CSS.length);

function regel(selektor) {
  const i = KOMPONENTEN.indexOf(selektor + "{");
  if (i < 0) return "";
  return KOMPONENTEN.slice(i, KOMPONENTEN.indexOf("}", i) + 1);
}

describe("U1 · die Feldkante ist eine Haarlinie, kein Rahmen", () => {
  it("kein Rahmen, kein Radius, keine Fläche — nur die Linie unten", () => {
    const r = regel(".rz-feld");
    expect(r).toContain("border:0");
    expect(r).toContain("border-bottom:1px solid var(--rz-hairline)");
    expect(r).toContain("border-radius:0");
    expect(r).toContain("background:none");
  });

  it("Serif 17 auf dem Maß aus §2", () => {
    const r = regel(".rz-feld");
    expect(r).toContain("font-family:var(--rz-serif)");
    expect(r).toContain("font-size:var(--rz-fs-zeile)");
    expect(r).toContain("min-height:46px");
  });

  it("in der grünen Zone trägt die Haarlinie den grünen Ton", () => {
    expect(regel(".rz-tiefgruen .rz-feld")).toContain("border-bottom-color:var(--rz-hairline-gruen)");
  });

  it("die Code-Eingabe bleibt gesperrt gesetzt", () => {
    expect(regel(".rz-feld-code")).toContain("letter-spacing:.2em");
  });
});

describe("U1 · der Fokus ersetzt den Systemring vollständig", () => {
  const fokus = regel(".rz-feld:focus");

  it("outline:none kommt nie ohne Ersatz", () => {
    expect(fokus).toContain("outline:none");
    expect(fokus).toContain("border-bottom-width:2px");
    expect(fokus).toMatch(/border-bottom-color:var\(--rz-[a-z-]+\)/);
  });

  it("die Höhe springt beim Fokussieren nicht", () => {
    // 1px mehr Linie, 1px weniger Polster — sonst rutscht beim Antippen
    // alles darunter um einen Punkt.
    const grund = regel(".rz-feld");
    expect(grund).toContain("padding:13px 0 12px");
    expect(fokus).toContain("padding-bottom:11px");
  });

  it("auf Papier zieht die Linie NICHT --rz-akzent", () => {
    // Gemessen: --rz-akzent auf Papier trägt im hellen Theme 2.33:1 und
    // reißt die 3:1-Schwelle für nicht-textliche Bedienhinweise. Der
    // Kontrast-Wächter rechnet beide Paare mit; hier steht nur, dass die
    // Rolle bewusst getrennt ist.
    expect(fokus).toContain("border-bottom-color:var(--rz-akzent-ink)");
    expect(regel(".rz-tiefgruen .rz-feld:focus")).toContain("border-bottom-color:var(--rz-akzent)");
  });
});

describe("U1 · erster Nutzer: der Rahmensatz der Vorschau", () => {
  it("er erbt die Feldkante, statt den Browser-Rahmen zu tragen", () => {
    const r = regel(".rz-ausw-rahmen");
    expect(r).not.toContain("border");     // die Kante kommt aus .rz-feld
    expect(r).toContain("min-height:56px");
  });
});
