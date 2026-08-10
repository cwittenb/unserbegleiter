// S119.3 · Ein Rollbereich im Chat, nicht zwei.
//
// Befund: `.rz-app #scrChat` setzte `height:100dvh` UND ein Polster, ohne
// `box-sizing:border-box`. Im Standard content-box sind die 100dvh die
// INHALTShoehe — das Polster kommt obendrauf. Am Geraet nachgemessen: 54px
// Ueberhang (30px Kopfpolster + 24px --rz-rand). Das Dokument lief ueber, und
// neben der gewollten Leiste in .rz-chat-oben (U10.4: "DIESE Zone rollt, und
// nur sie") stand eine zweite am Body.
//
// Der zweite Test ist der eigentliche Waechter: Er haelt die REGEL fest, nicht
// den Einzelfall. Ein globales box-sizing gibt es hier bewusst (noch) nicht —
// also muss jede Flaeche, die Hoehe und Polster zugleich setzt, es selbst
// mitbringen. Genau diese Bedingung prueft er, fuer alle Regeln im Stylesheet.

import { describe, it, expect } from "vitest";
import { DESIGN_CSS } from "../../core/ui/design.js";

/** Regeln des Stylesheets als {selektor, koerper} — @media-Klammern
 *  interessieren nicht, die Deklarationen darin stehen genauso in der Liste. */
function regeln(css) {
  const aus = [];
  // Kommentare zuerst weg: sie stehen VOR dem Selektor und wuerden sonst mit
  // in ihn hineingelesen (der Selektor ist alles bis zur naechsten Klammer).
  const ohneKommentar = css.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const treffer of ohneKommentar.matchAll(/([^{}@]+)\{([^{}]*)\}/g)) {
    const selektor = treffer[1].trim().replace(/\s+/g, " ");
    if (!selektor || selektor.startsWith("@")) continue;
    aus.push({ selektor, koerper: treffer[2] });
  }
  return aus;
}

describe("S119.3 · der Chat hat genau einen Rollbereich", () => {
  it("#scrChat rechnet sein Polster nach innen — kein Ueberhang, keine Leiste am Body", () => {
    const regel = regeln(DESIGN_CSS).find(r => r.selektor === ".rz-app #scrChat" && r.koerper.includes("height:100dvh"));
    expect(regel, "Grundregel fuer #scrChat nicht gefunden").toBeTruthy();
    expect(regel.koerper).toContain("box-sizing:border-box");
  });

  it("die gewollte Leiste bleibt, wo sie ist: in .rz-chat-oben", () => {
    expect(DESIGN_CSS).toMatch(/#scrChat \.rz-chat-oben\{[^}]*overflow-y:auto/);
    // ... und #scrChat selbst eroeffnet weiterhin KEINEN eigenen senkrechten
    // Rollbereich — sonst haetten wir die zweite Leiste nur verschoben.
    expect(DESIGN_CSS).toMatch(/\.rz-app #scrChat\{[^}]*overflow-y:hidden/);
  });

  it("Waechter: jede Regel mit fester Hoehe UND Polster traegt box-sizing:border-box", () => {
    const suender = regeln(DESIGN_CSS)
      .filter(r => /(^|;)\s*height:\s*100dvh/.test(r.koerper) && /(^|;)\s*padding:/.test(r.koerper))
      .filter(r => !r.koerper.includes("box-sizing:border-box"))
      .map(r => r.selektor);
    expect(suender, "Hoehe plus Polster ohne border-box — der Kasten wird groesser als gedacht").toEqual([]);
  });

  it("Test des Tests: der Waechter erkennt einen konstruierten Verstoss", () => {
    const probe = ".rz-probe{height:100dvh;padding:30px var(--rz-rand)}";
    const suender = regeln(probe)
      .filter(r => /(^|;)\s*height:\s*100dvh/.test(r.koerper) && /(^|;)\s*padding:/.test(r.koerper))
      .filter(r => !r.koerper.includes("box-sizing:border-box"));
    expect(suender.map(r => r.selektor)).toEqual([".rz-probe"]);
  });
});
