// @vitest-environment happy-dom
// T2e · Kontrast-Wächter (Handover Turn 40 §3.4).
//
// Der einzige Wächter im T2-Track, der nicht Text vergleicht, sondern RECHNET:
// er löst die Farbtoken aus theme.js auf und misst den WCAG-2.1-Kontrast der
// Paare, die tatsächlich zusammen auf dem Schirm stehen.
//
// Zwei Stufen, mit Absicht:
//
//   HART        Rollen, die laufenden Text tragen. Sie müssen 4.5:1 halten
//               (bzw. 3.0:1, wo die Rolle als dekorativ ausgewiesen ist).
//               Reißt eine, ist das ein Fehler.
//
//   SPERRKLINKE Rollen, die HEUTE unter der Schwelle liegen. Sie werden nicht
//               erzwungen — der Turn-40-Beschluss lautet "eine Palette", und
//               ihre Werte zu heben hieße, die Palette zu ändern. Festgehalten
//               wird stattdessen der Ist-Wert: sie dürfen nicht SCHLECHTER
//               werden. Die Liste ist zugleich die Merkposten-Liste für einen
//               künftigen Paletten-Turn.

import { describe, it, expect } from "vitest";
import { THEME_CSS } from "../../core/ui/theme.js";
import { DESIGN_CSS } from "../../core/ui/design.js";

/* ---- Token auflösen ------------------------------------------------------ */

function block(css, von, bis) {
  const a = css.indexOf(von);
  const b = bis ? css.indexOf(bis) : css.length;
  return css.slice(a, b < 0 ? css.length : b);
}

function tokenAus(text) {
  const map = {};
  for (const [, name, wert] of text.matchAll(/(--rz-[a-z0-9-]+)\s*:\s*([^;]+);/g))
    map[name] = wert.trim();
  return map;
}

const ROOT = tokenAus(block(THEME_CSS, ":root{", "html[data-theme=dark]"));
const DARK = { ...ROOT, ...tokenAus(block(THEME_CSS, "html[data-theme=dark]")) };
const THEMEN = { hell: ROOT, dunkel: DARK };

/* ---- WCAG 2.1 ------------------------------------------------------------ */

function rgb(hex) {
  const h = hex.trim().replace("#", "");
  const voll = h.length === 3 ? [...h].map(c => c + c).join("") : h;
  return [0, 2, 4].map(i => parseInt(voll.slice(i, i + 2), 16) / 255);
}

function luminanz(hex) {
  const f = c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = rgb(hex).map(f);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function kontrast(a, b) {
  const [la, lb] = [luminanz(a), luminanz(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Kontrast eines Token-Paars in einem Theme, auf zwei Stellen gerundet. */
function messe(theme, vorne, hinten) {
  const t = THEMEN[theme];
  expect(t[vorne], `${vorne} fehlt im Theme "${theme}"`).toBeTruthy();
  expect(t[hinten], `${hinten} fehlt im Theme "${theme}"`).toBeTruthy();
  return Math.round(kontrast(t[vorne], t[hinten]) * 100) / 100;
}

/* ---- Stufe 1 · harte Schwellen ------------------------------------------- */

// [Vordergrund, Hintergrund, Mindestwert, Rolle]
const HART = [
  ["--rz-ink",             "--rz-papier",    4.5, "Fliesstext auf Papier"],
  ["--rz-sek",             "--rz-papier",    4.5, "Zustandstext, Kopf-Signatur (T2e)"],
  ["--rz-marke",           "--rz-papier",    4.5, "Wegweiser-Zeichen"],
  ["--rz-nutzer",          "--rz-papier",    4.5, "eigene Antwort im Verlauf"],
  ["--rz-ink-auf-gruen",   "--rz-tiefgruen", 4.5, "Fliesstext auf Tiefgruen"],
  ["--rz-ink2-auf-gruen",  "--rz-tiefgruen", 4.5, "zweite Tinte auf Tiefgruen"],
  ["--rz-sek-auf-gruen",   "--rz-tiefgruen", 4.5, "Zustandstext in der gruenen Zone (T2e)"],
  ["--rz-sek2-auf-gruen",  "--rz-tiefgruen", 4.5, "Kopf-Signatur in der gruenen Zone"],
  ["--rz-label-auf-gruen", "--rz-tiefgruen", 4.5, "Caps-Label auf Tiefgruen"],
  ["--rz-pfeil-auf-gruen", "--rz-tiefgruen", 4.5, "Pfeil-Suffix auf Tiefgruen"],
  ["--rz-marke-auf-gruen", "--rz-tiefgruen", 3.0, "Wortmarke am Fuss — dekorativ"],
];

describe("T2e · tragende Rollen halten die Schwelle", () => {
  for (const theme of ["hell", "dunkel"])
    for (const [v, h, min, rolle] of HART)
      it(`${theme}: ${v} auf ${h} ≥ ${min}:1 — ${rolle}`, () => {
        expect(messe(theme, v, h)).toBeGreaterThanOrEqual(min);
      });
});

/* ---- Stufe 2 · Sperrklinke ----------------------------------------------- */

// Ist-Werte, gemessen auf 34d805a. Sie dürfen steigen, nicht fallen.
// Jede Zeile ist zugleich ein Merkposten für einen künftigen Paletten-Turn.
const SPERRKLINKE = [
  ["hell",   "--rz-gedimmt",        "--rz-papier",    2.30, "gesperrte Zeile, Platzhalter, Wortmarke"],
  ["dunkel", "--rz-gedimmt",        "--rz-papier",    3.85, "dito"],
  ["hell",   "--rz-sek2",           "--rz-papier",    3.07, "Sprecher-Marke, Echo-Pille"],
  ["dunkel", "--rz-sek2",           "--rz-papier",    5.54, "dito"],
  ["hell",   "--rz-label",          "--rz-papier",    2.94, "Caps-Label auf Papier"],
  ["dunkel", "--rz-label",          "--rz-papier",    8.06, "dito"],
  ["hell",   "--rz-akzent-hell",    "--rz-papier",    2.94, "Sende-Quadrat, Mikrofon, Balken"],
  ["dunkel", "--rz-akzent-hell",    "--rz-papier",    5.87, "dito"],
];

describe("T2e · Sperrklinke — bekannte Schwachstellen werden nicht schlechter", () => {
  for (const [theme, v, h, ist, rolle] of SPERRKLINKE)
    it(`${theme}: ${v} auf ${h} bleibt ≥ ${ist}:1 — ${rolle}`, () => {
      expect(messe(theme, v, h)).toBeGreaterThanOrEqual(ist);
    });
});

/* ---- Stufe 3 · --rz-gedimmt faerbt keinen tragenden Text mehr ------------ */

describe("T2e · --rz-gedimmt bleibt dekorativ", () => {
  const KOMPONENTEN = DESIGN_CSS.slice(DESIGN_CSS.indexOf(THEME_CSS) + THEME_CSS.length);

  it("Zustandstext und Kopf-Signatur ziehen --rz-sek, nicht --rz-gedimmt", () => {
    const zustand = KOMPONENTEN.slice(KOMPONENTEN.indexOf(".rz-zeile .rz-zustand{"));
    expect(zustand.slice(0, zustand.indexOf("}"))).toContain("color:var(--rz-sek)");
    const sig = KOMPONENTEN.slice(KOMPONENTEN.indexOf(".rz-signatur{"));
    expect(sig.slice(0, sig.indexOf("}"))).toContain("color:var(--rz-sek)");
    // T2e-Nachzug · "tippen zum Schliessen" ist eine Anweisung, keine Zier.
    const fuss = KOMPONENTEN.slice(KOMPONENTEN.indexOf(".rz-weg-fuss{"));
    expect(fuss.slice(0, fuss.indexOf("}"))).toContain("color:var(--rz-sek)");
  });

  it("--rz-gedimmt faerbt nur noch benannte Zier-Rollen", () => {
    // Was uebrig bleibt, ist bewusst dekorativ: die gesperrte Zeile selbst,
    // die Wortmarke, der Platzhalter. Wer eine weitere Textrolle darauf legt,
    // soll hier vorbeikommen und begruenden.
    const ZIER = [".rz-zeile:disabled", ".rz-gedimmt", ".rz-fussmarke", "::placeholder"];
    for (const m of KOMPONENTEN.matchAll(/([^{}]+)\{[^}]*color:var\(--rz-gedimmt\)[^}]*\}/g))
      expect(ZIER.some(z => m[1].includes(z)), "unbenannte Rolle: " + m[1].trim()).toBe(true);
  });

  it("in der gruenen Zone gilt die Gegenregel", () => {
    // --rz-sek ist eine Papier-Rolle; auf Tiefgruen faellt sie im hellen
    // Theme unter das, was sie ersetzt hat. Ohne diese Regel waere T2e
    // dort eine Verschlechterung.
    expect(KOMPONENTEN).toContain(".rz-tiefgruen .rz-zeile .rz-zustand{color:var(--rz-sek-auf-gruen)}");
    expect(messe("hell", "--rz-sek", "--rz-tiefgruen")).toBeLessThan(4.5);   // die Falle ist echt
    expect(messe("hell", "--rz-sek-auf-gruen", "--rz-tiefgruen")).toBeGreaterThanOrEqual(4.5);
  });
});
