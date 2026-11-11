// UX-3 · Lesbar und treffbar (Code-Review U6, U7).
import { describe, it, expect } from "vitest";
import { THEME_CSS } from "../../core/ui/theme.js";
import { DESIGN_CSS } from "../../core/ui/design.js";

const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => (v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
const kontrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };

/** Tokens der hellen und der dunklen Fassung (dunkel erbt, was es nicht neu setzt). */
function tokens() {
  const css = typeof THEME_CSS === "string" ? THEME_CSS : "";
  const i = css.indexOf("html[data-theme=dark]");
  const lies = teil => Object.fromEntries([...teil.matchAll(/(--rz-[a-z0-9-]+):(#[0-9a-fA-F]{6})\b/g)].map(m => [m[1], m[2]]));
  const hell = lies(css.slice(0, i)), dunkel = { ...hell, ...lies(css.slice(i)) };
  return { hell, dunkel };
}

// [Token, Grund-Token, Mindestkontrast, Rolle]
const TEXT = [
  ["--rz-ink", "--rz-papier"], ["--rz-sek", "--rz-papier"], ["--rz-sek", "--rz-flaeche-hoch"],
  ["--rz-sek2", "--rz-papier"], ["--rz-sek2", "--rz-flaeche-hoch"],
  ["--rz-marke", "--rz-papier"], ["--rz-label", "--rz-papier"], ["--rz-label", "--rz-flaeche-hoch"],
  ["--rz-nutzer", "--rz-papier"], ["--rz-link", "--rz-papier"], ["--rz-warn", "--rz-papier"], ["--rz-warn", "--rz-flaeche-hoch"],
  ["--rz-ink-auf-gruen", "--rz-tiefgruen"], ["--rz-sek-auf-gruen", "--rz-tiefgruen"], ["--rz-sek2-auf-gruen", "--rz-tiefgruen"],
  ["--rz-marke-auf-gruen", "--rz-tiefgruen"], ["--rz-label-auf-gruen", "--rz-tiefgruen"], ["--rz-link-auf-gruen", "--rz-tiefgruen"],
];
const ZEICHEN = [["--rz-pfeil", "--rz-papier"], ["--rz-pfeil", "--rz-flaeche-hoch"], ["--rz-akzent-hell", "--rz-papier"], ["--rz-pfeil-auf-gruen", "--rz-tiefgruen"]];

describe("UX-3 · Kontrast der Tokens (WCAG 1.4.3 / 1.4.11)", () => {
  const { hell, dunkel } = tokens();
  it("die Tokens lassen sich lesen (sonst prüft dieser Test nichts)", () => {
    expect(Object.keys(hell).length).toBeGreaterThan(25);
    expect(dunkel["--rz-papier"]).not.toBe(hell["--rz-papier"]);
  });
  for (const [name, t] of [["hell", hell], ["dunkel", dunkel]]) {
    for (const [f, g] of TEXT)
      it(`${name}: Text ${f} auf ${g} ≥ 4,5:1`, () => {
        expect(t[f], f).toBeTruthy(); expect(t[g], g).toBeTruthy();
        expect(kontrast(t[f], t[g]), `${t[f]} auf ${t[g]}`).toBeGreaterThanOrEqual(4.5);
      });
    for (const [f, g] of ZEICHEN)
      it(`${name}: Zeichen ${f} auf ${g} ≥ 3:1`, () => {
        expect(kontrast(t[f], t[g]), `${t[f]} auf ${t[g]}`).toBeGreaterThanOrEqual(3);
      });
  }
  it("--rz-gedimmt bleibt bewusst darunter — es zeigt Gesperrtes (WCAG nimmt inaktive Elemente aus)", () => {
    expect(kontrast(hell["--rz-gedimmt"], hell["--rz-papier"])).toBeLessThan(4.5);
  });
});

describe("UX-3 · Trefferflächen 44×44 (WCAG 2.5.8)", () => {
  it("Zurück-Pfeil, Einstellungs-Zeichen und Wegweiser-Badge tragen die unsichtbare Fläche", () => {
    const i = DESIGN_CSS.indexOf(".rz-zurueck::after,.rz-ecke button::after,.rz-weg-badge::after{");
    expect(i).toBeGreaterThan(-1);
    const regel = DESIGN_CSS.slice(i, DESIGN_CSS.indexOf("}", i));
    expect(regel).toContain("width:max(100%,var(--rz-tapziel-finger))");
    expect(regel).toContain("height:max(100%,var(--rz-tapziel-finger))");
    expect(regel).toContain('content:""');
    expect(THEME_CSS).toContain("--rz-tapziel-finger:44px");
  });
  it("die Elemente sind Bezugspunkt der Fläche (position), das unsichtbare Zurück nimmt keinen Finger an", () => {
    expect(DESIGN_CSS).toContain(".rz-zurueck,.rz-ecke button{position:relative}");
    // Mikrofon: echte Breite (20 px Zeichen + 2×12), keine Überlagerung über Feld und Sende-Knopf.
    expect(DESIGN_CSS).toMatch(/#scrChat #btnMic\{[^}]*padding:0 12px;\s*min-height:var\(--rz-tapziel-finger\)/);
    expect(DESIGN_CSS).toMatch(/\.rz-auf-naht\{position:absolute/);          // das Badge ist schon positioniert
    expect(DESIGN_CSS).toContain(".rz-zurueck.rz-blind::after{display:none}");
  });
});
