// @vitest-environment happy-dom
// S121.4 · Der Chat rollt als Seite, die Schreibkante klebt.
//
// Der Befund: Über der dunklen Fläche ließ sich wischen, über der hellen
// nicht. Das war nie ein Touch-Fehler — die helle Zone war ein eigener
// Rollbereich (U10.4: "DIESE Zone rollt, und nur sie"), und was sich über der
// dunklen bewegte, war das Dokument mit seinem 54px-Überhang (S119.3).
//
// Turn 48 §2.1, übertragen auf den Chat: Es rollt die Seite, überall. Damit
// die Schreibkante trotzdem stehen bleibt, klebt sie am Fensterboden —
// dieselbe Bauform wie die klebende Hälfte in §2.3, nur waagerecht.
//
// Die Gegenprobe zum Ziel "eine Geste über der dunklen Fläche rollt die
// Seite" lässt sich nicht in einer Testumgebung ohne Layout führen; sie steht
// auf der Sichtprobe. Prüfbar ist, dass kein Kasten im Chat mehr einen
// eigenen Rollbereich eröffnet — denn nur solche fangen Gesten ab.

import { describe, it, expect } from "vitest";
import { DESIGN_CSS } from "../../core/ui/design.js";

const CSS = DESIGN_CSS.replace(/\/\*[\s\S]*?\*\//g, "");
const regel = sel => {
  const m = CSS.match(new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\{([^}]*)\\}"));
  return m ? m[1] : null;
};

describe("S121.4 · kein eigener Rollbereich mehr im Chat", () => {
  it("der Screen ist mindestens schirmhoch statt darauf genagelt", () => {
    const s = regel(".rz-app #scrChat");
    expect(s).toContain("min-height:100dvh");
    expect(s).not.toMatch(/(^|;)height:100dvh/);
  });

  it("er eröffnet keinen senkrechten Rollbereich", () => {
    // overflow-y:hidden hätte ihn zum Rollbereich gemacht — zu einem, der nie
    // rollt. Der klebende Rand hätte dann an einem stehenden Kasten geklebt,
    // also gar nicht.
    const s = regel(".rz-app #scrChat");
    expect(s).not.toContain("overflow-y:hidden");
    expect(s).not.toContain("overflow-y:auto");
  });

  it("die Gesprächszone auch nicht", () => {
    const o = regel("#scrChat .rz-chat-oben");
    expect(o).not.toContain("overflow-y:auto");
    expect(o).not.toContain("overscroll-behavior");
  });

  it("der waagerechte Abfang bleibt — ein breites Panel darf nichts sprengen", () => {
    expect(regel("#scrChat .rz-chat-oben")).toContain("overflow-x:clip");
  });

  it("keine Regel im Chat trägt noch overflow-y:auto", () => {
    for (const r of CSS.match(/#scrChat[^{}]*\{[^}]*\}/g) || [])
      expect(r, r).not.toMatch(/overflow-y:\s*auto/);
  });
});

describe("S121.4 · die Schreibkante klebt", () => {
  it("am unteren Fensterrand", () => {
    const u = regel("#scrChat .rz-chat-unten");
    expect(u).toContain("position:sticky");
    expect(u).toContain("bottom:0");
  });

  it("mit z-index — der Verlauf zieht unter ihr durch", () => {
    expect(regel("#scrChat .rz-chat-unten")).toMatch(/z-index:\d/);
  });

  it("und behält ihr flex:none — ein langer Composer nimmt dem Verlauf nichts", () => {
    expect(regel("#scrChat .rz-chat-unten")).toContain("flex:none");
  });

  it("die Ausblut-Rechnung der Kante bleibt unangetastet (S114c)", () => {
    const u = regel("#scrChat .rz-chat-unten");
    expect(u).toContain("calc(50% - 50vw)");
    expect(u).toContain("env(safe-area-inset-bottom,0px)");
  });
});

describe("S121.4 · die Innenspalte", () => {
  it("streckt sich als Flex-Kind, statt an einer Prozenthöhe zu hängen", () => {
    // height:100% gegen einen Rahmen ohne feste Höhe wird zu auto — die
    // Schreibkante säße bei kurzem Verlauf mitten im Bild.
    const i = regel(".rz-chat-innen");
    expect(i).not.toContain("height:100%");
    expect(i).toContain("flex:1 1 auto");
  });
});

/* ---- Scroll-Disziplin ---- */

import { macheChatKern } from "../../core/ui/chat-kern.js";

function umgebung({ scrollHeight = 3000, scrollY = 0, innerHeight = 800 } = {}) {
  const gerollt = [];
  const doc = {
    documentElement: { scrollHeight },
    defaultView: { scrollY, innerHeight, scrollTo: (x, y) => gerollt.push([x, y]) },
  };
  return { doc, gerollt };
}

function kern(doc) {
  return macheChatKern({
    doc, $: () => null, el: () => null, state: {}, backend: {},
    err: () => {}, hint: () => {}, aktualisiereBusy: () => {}, hooks: {},
  });
}

describe("S121.4 · die Scroll-Disziplin misst wieder am Fenster", () => {
  it("nah am Ende: das Mitlaufen greift", () => {
    const { doc } = umgebung({ scrollHeight: 3000, scrollY: 2150, innerHeight: 800 });
    expect(kern(doc).nahAmEingabefeld()).toBe(true);   // 50px Rest < 80
  });

  it("weit oben: das Mitlaufen stoppt von selbst", () => {
    const { doc } = umgebung({ scrollHeight: 3000, scrollY: 200, innerHeight: 800 });
    expect(kern(doc).nahAmEingabefeld()).toBe(false);
  });

  it("gerollt wird ans Ende des Dokuments", () => {
    const { doc, gerollt } = umgebung({ scrollHeight: 3000 });
    kern(doc).scrolleZumEingabefeld();
    expect(gerollt).toEqual([[0, 3000]]);
  });

  it("ohne Fenster oder ohne scrollTo bleibt es still, statt zu springen", () => {
    const ohneFenster = { documentElement: { scrollHeight: 3000 }, defaultView: null };
    expect(() => kern(ohneFenster).scrolleZumEingabefeld()).not.toThrow();
    expect(kern(ohneFenster).nahAmEingabefeld()).toBe(true);   // Nullmaße melden "nah"

    const ohneScrollTo = { documentElement: { scrollHeight: 3000 }, defaultView: { scrollY: 0, innerHeight: 800 } };
    expect(() => kern(ohneScrollTo).scrolleZumEingabefeld()).not.toThrow();
  });
});
