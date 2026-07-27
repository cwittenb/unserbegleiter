// @vitest-environment happy-dom
// T2 · Wächter über die drei kleinen Chat-Findings aus dem Turn-40-Handover.
//
//   T2f · Tapziele — Senden und Mikrofon lagen unter dem Mindestmaß.
//   T2g · Sprecher-Marke — hing über einen negativen Rand am Listen-Gap.
//   T2j · Echo-Pille — war ein kompletter Inline-Style mit rohen Werten.
//
// Zwei der drei sind Negativ-Wächter: sie halten fest, dass eine Zahl NICHT
// mehr dasteht. Das ist die eigentliche Aussage der Findings.

import { describe, it, expect, beforeEach } from "vitest";
import { DESIGN_CSS } from "../../core/ui/design.js";
import { THEME_CSS } from "../../core/ui/theme.js";
import { zeichneReplay } from "../../core/ui/replay-ansicht.js";

const KOMPONENTEN = DESIGN_CSS.slice(DESIGN_CSS.indexOf(THEME_CSS) + THEME_CSS.length);

/** Eine einzelne CSS-Regel am Selektor herausschneiden. */
function regel(selektor) {
  const i = KOMPONENTEN.indexOf(selektor + "{");
  if (i < 0) return "";
  return KOMPONENTEN.slice(i, KOMPONENTEN.indexOf("}", i) + 1);
}

/* ------------------------------------------------------------------ T2f */

describe("T2f · Tapziele im Chat", () => {
  it("--rz-tapziel-finger ist angelegt und trägt das Mindestmaß", () => {
    expect(THEME_CSS).toContain("--rz-tapziel-finger:44px;");
  });

  it("die leise Bedien-Ecke behält ihre 36px", () => {
    // Zwei verschiedene Maße mit zwei verschiedenen Aufgaben — der neue
    // Token darf den alten nicht mitziehen.
    expect(THEME_CSS).toContain("--rz-tapziel:36px;");
    expect(regel(".rz-ecke button")).toContain("var(--rz-tapziel)");
  });

  it("Senden und Mikrofon ziehen das Finger-Maß", () => {
    for (const sel of ["#scrChat #btnSend", "#scrChat #btnMic"])
      expect(regel(sel), sel).toContain("min-height:var(--rz-tapziel-finger)");
  });

  it("kein 34px-Tapziel mehr im Chat", () => {
    const chat = KOMPONENTEN.slice(KOMPONENTEN.indexOf("#scrChat"));
    expect(chat.match(/min-height:34px/g) || []).toEqual([]);
    expect(chat.match(/(width|height):34px/g) || []).toEqual([]);
  });

  it("das sichtbare Quadrat bleibt 34px — Polster statt kleinerer Fläche", () => {
    // Ohne background-clip:content-box würde die Akzentfläche auf 44px
    // mitwachsen; dann wäre aus einer Trefferflächen-Korrektur eine
    // Gestaltungsänderung geworden.
    const r = regel("#scrChat #btnSend");
    expect(r).toContain("padding:5px");
    expect(r).toContain("background-clip:content-box");
    expect(r).toContain("box-sizing:border-box");
  });
});

/* ------------------------------------------------------------------ T2g */

describe("T2g · die Sprecher-Marke hängt nicht mehr am Listen-Gap", () => {
  it("kein negativer Rand mehr auf .rz-sprecher", () => {
    expect(regel("#scrChat .rz-sprecher")).not.toMatch(/margin-bottom:-/);
    expect(regel("#scrChat .rz-sprecher")).toContain("margin-bottom:var(--rz-r-1)");
  });

  it("die Gruppe trägt die Breitenbegrenzung, nicht zusätzlich die Nachricht", () => {
    // 88% von 88% wären 77% — die Antwort würde beim Umbau schmaler.
    expect(regel("#scrChat .rz-sprechgruppe")).toContain("max-width:88%");
    expect(regel("#scrChat .rz-sprechgruppe .pb-msg.ai")).toContain("max-width:none");
  });

  it("die Leseansicht gruppiert genauso wie der lebende Verlauf", () => {
    const wirt = document.createElement("div");
    const el = (tag, cls) => {
      const n = document.createElement(tag);
      if (cls) n.className = cls;
      return n;
    };
    zeichneReplay(wirt, {
      at: "2026-07-01T10:00:00Z",
      messages: [
        { role: "user", content: "Mich beschäftigt das Wochenende." },
        { role: "assistant", content: "Erzähl gern." },
        { role: "assistant", content: "Was war zuerst da?" },
      ],
    }, el);

    const gruppen = wirt.querySelectorAll(".rz-sprechgruppe");
    expect(gruppen).toHaveLength(1);
    // Genau die erste Antwort einer Passage steht mit dem Label zusammen;
    // die Folgeantwort bleibt Geschwister und behält den Listenabstand.
    expect(gruppen[0].querySelectorAll(".rz-sprecher")).toHaveLength(1);
    expect(gruppen[0].querySelectorAll(".pb-msg")).toHaveLength(1);
    expect(wirt.querySelectorAll(".pb-msg")).toHaveLength(3);
  });
});

/* ------------------------------------------------------------------ T2j */

describe("T2j · die Echo-Pille lebt im Stylesheet", () => {
  it("die Regel steht in design.js und zieht nur Skalenwerte", () => {
    const r = regel("#scrChat .rz-echo");
    expect(r).toContain("font-size:var(--rz-fs-caps)");
    expect(r).toContain("border-radius:var(--rz-rund-pille)");
    // Kein roher Wert mehr — bis auf die Haarlinie des Rahmens, die im ganzen
    // Stylesheet als "1px solid" geschrieben wird.
    expect(r.replace("1px solid", "")).not.toMatch(/\d+px/);
  });

  it("die fremden .pb-echo-Orte bleiben unberührt", () => {
    // Leseansicht und Auswahl-Screen tragen dieselbe Klasse, dort ist sie
    // heute ungestylt. Eine Regel auf .pb-echo wäre eine stille Änderung
    // an zwei Orten, die niemand bestellt hat.
    expect(KOMPONENTEN).not.toContain(".pb-echo{");
    expect(regel("#scrChat .rz-echo")).toBeTruthy();
  });
});
