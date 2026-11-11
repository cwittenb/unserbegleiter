// @vitest-environment happy-dom
// UX-1 · Copy (Light-Lane) — Code-Review 10.11.2026: U9, U11, U12, U18, U19.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { de } from "../../core/i18n/de.js";
import { en } from "../../core/i18n/en.js";
import { fuelle } from "../../core/i18n/index.js";
import { KARENZ_MS } from "../../core/engine/regal.js";
import { DESIGN_CSS } from "../../core/ui/design.js";

const lies = p => readFileSync(new URL("../../" + p, import.meta.url), "utf8");

describe("U9 · Karenz steht am Entscheidungspunkt", () => {
  it("Wörterbuch nennt Partner, Minuten und das Zurückziehen — in beiden Sprachen", () => {
    for (const w of [de, en]) {
      const s = fuelle(w["gate.karenz"], { partner: "Bernd", minuten: KARENZ_MS / 60000 });
      expect(s).toContain("Bernd"); expect(s).toContain("30");
      expect(s).toMatch(/zurückziehen|withdraw/);
    }
  });
  it("beide Freigabe-Flächen zeigen den Satz und rechnen aus KARENZ_MS (keine zweite Zahl)", () => {
    for (const p of ["core/ui/panels.js", "core/ui/auswahl-screen.js"]) {
      const q = lies(p);
      expect(q, p).toContain('t("gate.karenz"');
      expect(q, p).toContain("KARENZ_MS / 60000");
    }
  });
  it("Regal bleibt beim ruhigen Zustand ohne Zeitangabe (D5, S96.3) — die Uhrzeit ist eine offene Frage an den Auftraggeber", () => {
    expect(de["regal.stZurueckziehbar"]).not.toMatch(/\{zeit\}|\d/);
  });
});

describe("U11 · »erster Schritt« nur, solange es der erste ist", () => {
  it("Wegweiser im eigenen Raum hängt an soloOffen und zeitleisteLeer", () => {
    const q = lies("core/ui/app.js");
    expect(q).toMatch(/lage\.soloOffen \? t\("weg\.soloOffen"\) : \(lage\.zeitleisteLeer && t\("weg\.soloErster"\)\)/);
    expect(q).not.toMatch(/zeile\(4, "mein", t\("weg\.soloErster"\)\)/);
    expect(de["weg.soloOffen"]).toBeTruthy(); expect(en["weg.soloOffen"]).toBeTruthy();
  });
});

describe("U12 · Einstellungen sagen, wie weit sie reichen", () => {
  it("kein »nur auf diesem Gerät« mehr für Dinge, die im Konto liegen", () => {
    for (const w of [de, en])
      for (const k of ["einst.zoneGeraet", "einst.spracheHinweis"])
        expect(w[k]).not.toMatch(/diesem Gerät|this device/);
    expect(de["einst.spracheHinweis"]).toContain("allen deinen Geräten");
  });
});

describe("U18 · Sprachwahl im Wiedereinstieg", () => {
  it("Sprachen heißen, wie sie sich selbst nennen — in jeder Oberflächensprache gleich", () => {
    for (const w of [de, en]) {
      expect(w["sprache.eigen.de"]).toBe("Deutsch");
      expect(w["sprache.eigen.en"]).toBe("English");
    }
    expect(lies("platforms/cloudflare/pages/client.js")).toContain('t("sprache.eigen." + l)');
  });
  it("CSS: .rz-nur-breit{display:none} steht HINTER .rz-sprachpaar{display:flex} — sonst steht die Wahl auf dem Handy doppelt", () => {
    const css = typeof DESIGN_CSS === "string" ? DESIGN_CSS : lies("core/ui/design.js");
    const flex = css.indexOf(".rz-sprachpaar{display:flex");
    const none = css.indexOf(".rz-nur-breit{display:none}");
    expect(flex).toBeGreaterThan(-1);
    expect(none).toBeGreaterThan(flex);
    expect(css.indexOf(".rz-nur-breit{display:none}", none + 1), "nur eine solche Regel").toBe(-1);
    // Auf breiten Schirmen gewinnt weiter die Medienregel (gleiche Spezifität, später).
    expect(css.indexOf(".rz-nur-breit{display:flex}")).toBeGreaterThan(none);
  });
});

describe("U19 · Anführungszeichen je Sprache einheitlich", () => {
  it("DE: „…“ — kein gerades Schlusszeichen nach „", () => {
    for (const [k, v] of Object.entries(de)) if (typeof v === "string") expect(v, k).not.toMatch(/„[^“"]*"/);
  });
  it("EN: “…” um Platzhalter — keine geraden Zeichen", () => {
    for (const k of ["mess.fit", "mess.wirksam"]) {
      expect(en[k], k).toMatch(/“\{text\}”/);
      expect(de[k], k).toMatch(/„\{text\}“/);
    }
  });
});
