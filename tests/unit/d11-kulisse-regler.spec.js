// @vitest-environment happy-dom
// Design-Track D11 — Kulisse ab Stufe 1, Untergrund immer sichtbar, und ein
// Regler im Entwickler-Panel, der die Stufen vorfuehrt.

import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { baueKulisse, kulisseAnzahl, KULISSE_BASIS, KULISSE_DECKEL } from "../../core/ui/kulisse.js";

const WURZEL = path.resolve(process.cwd());
const lies = p => readFileSync(path.join(WURZEL, p), "utf-8");
const DEV = lies("platforms/artifact/dev-panel.js");

describe("D11 · Basis und Untergrund", () => {
  it("Basis ist 1 und wird addiert, der Deckel bleibt 7", () => {
    expect(KULISSE_BASIS).toBe(1);
    expect(KULISSE_DECKEL).toBe(7);
    const jetzt = Date.now();
    expect(kulisseAnzahl({ meilensteine: 0, startTs: jetzt, jetzt })).toBe(1);
    expect(kulisseAnzahl({ meilensteine: 3, startTs: 0, jetzt: 512 * 7 * 24 * 3600 * 1000 })).toBe(7);
  });

  it("negative oder absurde Vorgaben biegt baueKulisse gerade — ohne zu brechen", () => {
    expect(baueKulisse(-5, "a")).toBe(baueKulisse(0, "a"));
    expect(baueKulisse(99, "a")).toBe(baueKulisse(KULISSE_DECKEL, "a"));
  });

  it("D11a · der Untergrund laeuft DURCHGEHEND — eigene Lage, die sich dehnen darf", () => {
    const g = baueKulisse(0, "d");
    // Die Untergrund-Lage darf sich in die Breite ziehen ...
    expect(g).toMatch(/<svg class="rz-kulisse-hell" viewBox="0 0 390 84" preserveAspectRatio="none"[^>]*><path d="M0 60/);
    expect(g).toMatch(/<svg class="rz-kulisse-dunkel" viewBox="0 0 390 84" preserveAspectRatio="none"[^>]*><path d="M0 66/);
    // ... die Silhouetten behalten ihr Seitenverhaeltnis:
    const voll = baueKulisse(3, "d");
    expect(voll).toMatch(/preserveAspectRatio="xMaxYMax meet"/);
    // je Fassung genau zwei Lagen (Untergrund + Figuren):
    expect(voll.match(/class="rz-kulisse-hell"/g)).toHaveLength(2);
    expect(voll.match(/class="rz-kulisse-dunkel"/g)).toHaveLength(2);
  });

  it("Untergrund ohne Elemente, Elemente kommen obendrauf", () => {
    const grund = baueKulisse(0, "g"), eins = baueKulisse(1, "g");
    expect(grund.length).toBeGreaterThan(0);
    expect(eins.length).toBeGreaterThan(grund.length);
    // beide Theme-Fassungen sind auch ohne Elemente vorhanden:
    expect(grund).toContain("rz-kulisse-hell");
    expect(grund).toContain("rz-kulisse-dunkel");
  });
});

describe("D11 · Regler im Entwickler-Panel", () => {
  it("hat einen Schieber von 0 bis zum Deckel und einen Weg zurueck zu echt", () => {
    expect(DEV).toContain('id="devKulisse" type="range" min="0"');
    expect(DEV).toContain("max=\"${KULISSE_DECKEL}\"");
    expect(DEV).toContain('id="devKulisseAus"');
  });

  it("setzt den Vorschau-Haken und malt die Halter sofort neu", () => {
    expect(DEV).toContain("__rzKulisseVorschau");
    expect(DEV).toMatch(/for \(const id of \["kulisseStart", "kulisseMein", "kulisseTeil"\]\)/);
    expect(DEV).toContain("baueKulisse(n, id)");
  });

  it("der Haken ist ein reiner Lese-Haken in der App — im Betrieb setzt ihn niemand", () => {
    const app = lies("core/ui/app.js");
    expect(app).toContain("Number.isFinite(vorschau) ? vorschau : kulisseAnzahl(");
    // die App SETZT ihn nirgends:
    expect(app).not.toMatch(/__rzKulisseVorschau\s*=/);
  });
});
