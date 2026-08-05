// @vitest-environment happy-dom
// L1.4/L1.5 · Das Emblem "Ein geschlossener Kreis" (44a Desktop, 44b mobil).
//
// Der aufwendigste Teil des Pakets — und der mit den meisten harten
// Bedingungen. Turn 44 §3.5 nennt fuenf technische Fallen, die ALLE einmal
// aufgetreten sind. Dieser Test rechnet sie nach, statt Strings zu vergleichen:
//
//   1. Jeder Ring ist ein STROKE, keine gestapelte Scheibe. Konzentrische
//      fill-Scheiben mit Teildeckkraft addieren sich (0,10 -> 0,478 -> 0,541);
//      das innere "blass" kaeme dann kraeftiger heraus als das kraeftige Band.
//   2. Der kraeftige Ring traegt die Aussage der Ueberschrift allein. Eine
//      Vorversion hatte ihn bei 7 % — 1,07:1 auf Papier, praktisch unsichtbar.
//   3. Jeder Punktmittelpunkt liegt in einer Ringluecke UND die Luecke an
//      einem SICHTBAREN Ring. An dieser Bedingung ist eine mobile Fassung mit
//      r = 100,8 gescheitert (korrigiert auf 94).
//   4. Schriftfamilien im SVG muessen gequotet sein: font-family="Source Serif
//      4,…" ist ungueltig (Bestandteil "4" beginnt mit einer Ziffer), die
//      Deklaration wird still verworfen und der Text erbt die Sans.
//   5. clipPath-IDs muessen dokumentweit eindeutig sein.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

// Wie u10-designfehler: unter happy-dom liest der Test relativ zur Wurzel.
const HTML = readFileSync("platforms/cloudflare/landing/index.html", "utf8");

// Ohne <link> parsen: happy-dom wuerde sonst das Google-Fonts-Stylesheet
// tatsaechlich holen — eine Netzanfrage mitten im Unit-Test.
const ohneLinks = html => html.replace(/<link\b[^>]*>/g, "");
const doc = new DOMParser().parseFromString(ohneLinks(HTML), "text/html");
const embleme = {
  desktop: doc.querySelector(".rz-emblem-desktop"),
  mobil: doc.querySelector(".rz-emblem-mobil"),
};

/** Ringe = alle Kreise auf dem Mittelpunkt mit fill="none". */
function ringe(svg, cx, cy) {
  return [...svg.querySelectorAll("circle")]
    .filter(c => c.getAttribute("fill") === "none"
      && +c.getAttribute("cx") === cx && +c.getAttribute("cy") === cy)
    .map(c => ({
      r: +c.getAttribute("r"),
      breite: +c.getAttribute("stroke-width"),
      deckung: parseFloat(c.getAttribute("opacity")),
    }));
}
/** Referenzpunkte = alle uebrigen Kreise. */
function punkte(svg, cx, cy) {
  return [...svg.querySelectorAll("circle")]
    .filter(c => c.getAttribute("fill") !== "none")
    .map(c => {
      const x = +c.getAttribute("cx"), y = +c.getAttribute("cy");
      return { x, y, r: Math.hypot(x - cx, y - cy), radius: +c.getAttribute("r") };
    });
}

const SOLL = {
  desktop: {
    viewBox: "0 0 1000 410", cx: 500, cy: 205,
    ringe: [[178, 4.5, .05], [167, 6.5, .07], [150, 20, .42],
            [127, 13, .12], [106, 15, .3], [86, 11, .14], [70, 8, .09]],
    punkte: [162, 137, 117, 95], punktRadius: 6,
    kern: 57, fokus: 30, clip: ["rz44-kern-links", "rz44-kern-rechts"],
  },
  mobil: {
    viewBox: "0 0 390 320", cx: 195, cy: 170,
    ringe: [[104, 2.6, .05], [97, 3.8, .07], [87, 11.6, .42],
            [74, 7.6, .12], [62, 8.7, .3], [50, 6.4, .14]],
    punkte: [94, 79.5, 68.3, 55.4], punktRadius: 5,
    kern: 41, fokus: 24, clip: ["rz44b-kern-oben", "rz44b-kern-unten"],
  },
};

describe.each(Object.keys(SOLL))("L1.4/L1.5 · Emblem %s", fassung => {
  const svg = embleme[fassung], soll = SOLL[fassung];

  it("existiert mit dem vermessenen viewBox und laeuft randlos", () => {
    expect(svg, `Emblem ${fassung} fehlt`).toBeTruthy();
    expect(svg.getAttribute("viewBox")).toBe(soll.viewBox);
    // Randlos: das Emblem ist das einzige Kind des Abschnitts ohne Seitenrand.
    expect(HTML).toContain(".rz-kreis>:not(.rz-emblem){padding:0 var(--rz-rand)}");
  });

  it("Falle 1 · jeder Ring ist ein stroke auf dem Mittelradius, keine Scheibe", () => {
    const ist = ringe(svg, soll.cx, soll.cy);
    expect(ist.map(r => [r.r, r.breite, r.deckung])).toEqual(soll.ringe);
    // Keine gefuellte Scheibe auf dem Mittelpunkt.
    for (const c of svg.querySelectorAll("circle")) {
      const auf = +c.getAttribute("cx") === soll.cx && +c.getAttribute("cy") === soll.cy;
      if (auf) expect(c.getAttribute("fill"), "gestapelte Scheibe statt stroke").toBe("none");
    }
  });

  it("Falle 2 · der kraeftige Ring traegt 42 % und ist der drittaeusserste", () => {
    const ist = ringe(svg, soll.cx, soll.cy);
    const kraeftig = ist.filter(r => r.deckung >= .4);
    expect(kraeftig, "genau ein kraeftiger Ring").toHaveLength(1);
    expect(kraeftig[0].deckung).toBe(.42);
    expect(ist.indexOf(kraeftig[0])).toBe(2);
  });

  it("Falle 3 · jeder Punkt liegt in einer Ringluecke an einem sichtbaren Ring", () => {
    const ist = ringe(svg, soll.cx, soll.cy);
    const gemessen = punkte(svg, soll.cx, soll.cy);
    expect(gemessen).toHaveLength(4);
    expect(gemessen.map(p => Math.round(p.r * 10) / 10)).toEqual(soll.punkte);
    for (const p of gemessen) expect(p.radius).toBe(soll.punktRadius);

    for (const p of gemessen) {
      // In keinem Ring drin (Ring belegt r ± breite/2).
      for (const ring of ist)
        expect(Math.abs(p.r - ring.r) >= ring.breite / 2 - 1e-9,
          `Punkt r=${p.r} liegt IM Ring r=${ring.r}`).toBe(true);
      // Und an einem sichtbaren Ring (>= 12 %) — sonst schwebt er frei.
      const nachbar = ist
        .filter(r => r.deckung >= .12)
        .some(r => Math.abs(p.r - r.r) <= r.breite / 2 + 6);
      expect(nachbar, `Punkt r=${p.r} haengt an keinem sichtbaren Ring`).toBe(true);
    }
  });

  it("Falle 3b · die Radien nehmen von aussen nach innen ab (Spirale)", () => {
    const r = punkte(svg, soll.cx, soll.cy).map(p => p.r);
    for (let i = 1; i < r.length; i++) expect(r[i]).toBeLessThan(r[i - 1]);
  });

  it("Falle 4 · jede Schriftfamilie im SVG ist gequotet", () => {
    const texte = [...svg.querySelectorAll("text")];
    expect(texte.length).toBeGreaterThan(0);
    for (const t of texte) {
      const ff = t.getAttribute("font-family");
      expect(ff, "text ohne font-family").toBeTruthy();
      if (ff.includes("Source Serif 4"))
        expect(ff, `unquotiert: ${ff}`).toContain("'Source Serif 4'");
    }
  });

  it("Falle 5 · eigene clipPath-IDs, kein mask, invertiert durch zwei <text>", () => {
    const ids = [...svg.querySelectorAll("clipPath")].map(c => c.id);
    expect(ids.sort()).toEqual([...soll.clip].sort());
    expect(svg.querySelector("mask"), "mask statt clipPath").toBeNull();
    const fokus = [...svg.querySelectorAll("text")].filter(t => t.textContent === "Fokus");
    expect(fokus, "Fokus muss doppelt gesetzt sein").toHaveLength(2);
    expect(fokus[0].getAttribute("font-size")).toBe(String(soll.fokus));
    expect(fokus[1].getAttribute("font-size")).toBe(String(soll.fokus));
    // Invertiert: zwei verschiedene Tinten, dieselbe Groesse.
    expect(fokus[0].getAttribute("fill")).not.toBe(fokus[1].getAttribute("fill"));
  });

  it("die vier Schritte stehen im Wortlaut in der Grafik", () => {
    const texte = [...svg.querySelectorAll("text")].map(t => t.textContent);
    for (const schritt of ["Einzelreflexion", "Erfahrungen teilen",
      "Gemeinsame Session", "Standortbestimmung"]) expect(texte).toContain(schritt);
  });
});

describe("L1.4 · Desktop-Besonderheiten", () => {
  const svg = embleme.desktop;

  it("§3.1 · der Kernschnitt liegt auf der Hero-Naht (beide bei x = 500)", () => {
    expect(svg.getAttribute("data-naht")).toBe("mitte");
    const [, , breite] = svg.getAttribute("viewBox").split(" ").map(Number);
    expect(SOLL.desktop.cx).toBe(breite / 2);          // Naht bei 1fr 1fr
    // Der Kern teilt SENKRECHT: beide clip-Rechtecke sind halb so breit wie
    // hoch und stossen bei x = 500 aneinander.
    const [links, rechts] = [...svg.querySelectorAll("clipPath rect")];
    expect(+links.getAttribute("x") + +links.getAttribute("width")).toBe(500);
    expect(+rechts.getAttribute("x")).toBe(500);
  });

  it("§3.4 · Label-Grundlinie sitzt direkt auf ihrem Punkt (Delta ca. -5)", () => {
    const zuordnung = [
      ["Einzelreflexion", 90.45], ["Erfahrungen teilen", 108.13],
      ["Gemeinsame Session", 287.73], ["Standortbestimmung", 272.18],
    ];
    for (const [name, punktY] of zuordnung) {
      const t = [...svg.querySelectorAll("text")].find(t => t.textContent === name);
      const delta = +t.getAttribute("y") - punktY;
      expect(delta, `${name}: Delta ${delta}`).toBeGreaterThan(-7);
      expect(delta, `${name}: Delta ${delta}`).toBeLessThan(-4);
    }
  });

  it("Desktop traegt die Rollen-Zusaetze in 15 px Sans", () => {
    const zusaetze = [...svg.querySelectorAll("text")]
      .filter(t => t.getAttribute("font-size") === "15");
    expect(zusaetze).toHaveLength(4);
    expect(zusaetze.map(t => t.textContent)).toEqual([
      "für dich, in deinem Raum", "wenn du magst",
      "zu zweit, mit Begleitung", "einzeln, dann aufdecken"]);
  });
});

describe("L1.5 · Mobile Besonderheiten", () => {
  const svg = embleme.mobil;

  it("§3.3 · der Kern teilt WAAGERECHT — die Grafik folgt der Naht des Screens", () => {
    expect(svg.getAttribute("data-naht")).toBe("quer");
    const [oben, unten] = [...svg.querySelectorAll("clipPath rect")];
    expect(+oben.getAttribute("y") + +oben.getAttribute("height")).toBe(170);
    expect(+unten.getAttribute("y")).toBe(170);
    expect(+oben.getAttribute("width")).toBeGreaterThan(+oben.getAttribute("height"));
  });

  it("§3.5 · der NW-Punkt sitzt bei r = 94, nicht bei 100,8", () => {
    const r = punkte(svg, SOLL.mobil.cx, SOLL.mobil.cy).map(p => Math.round(p.r * 10) / 10);
    expect(r).toContain(94);
    expect(r).not.toContain(100.8);
  });

  it("§3.4 · je Haelfte folgen die Labels der Hoehe ihrer Punkte", () => {
    const y = name => +[...svg.querySelectorAll("text")]
      .find(t => t.textContent === name).getAttribute("y");
    // Oben: NW (Einzelreflexion, y=103.5) ueber NO (Erfahrungen, y=113.8).
    expect(y("Einzelreflexion")).toBeLessThan(y("Erfahrungen teilen"));
    // Unten: SW (Standortbestimmung, y=209.2) ueber SO (Session, y=218.3).
    expect(y("Standortbestimmung")).toBeLessThan(y("Gemeinsame Session"));
  });

  it("§3.3 · mobil ohne Rollen-Zusaetze; die frueher darunter stehende Liste entfaellt", () => {
    const groessen = [...svg.querySelectorAll("text")].map(t => t.getAttribute("font-size"));
    expect(groessen).not.toContain("15");
    for (const zusatz of ["für dich, in deinem Raum", "wenn du magst",
      "zu zweit, mit Begleitung", "einzeln, dann aufdecken"])
      expect(svg.textContent).not.toContain(zusatz);
    // Keine Schritt-Liste als Text im Kreis-Abschnitt ausserhalb der Grafik.
    const abschnitt = doc.querySelector(".rz-kreis");
    const ausserhalb = [...abschnitt.children]
      .filter(k => !k.classList.contains("rz-emblem"))
      .map(k => k.textContent).join(" ");
    expect(ausserhalb).not.toContain("Einzelreflexion");
  });
});
