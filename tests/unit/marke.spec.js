// Marken-Wächter — die sichtbare Marke ist überall dieselbe: raumzuzweit (de) /
// roomfortwo (en). allg.marke, APP_NAME und pwa.name dürfen nicht
// auseinanderdriften; die alten Namen sind Geschichte.

import { describe, it, expect } from "vitest";
import { APP_NAME } from "../../core/index.js";
import { de } from "../../core/i18n/de.js";
import { en } from "../../core/i18n/en.js";

describe("Marke · eine Quelle der Wahrheit", () => {
  it("de: raumzuzweit — Marke, APP_NAME und PWA-Name identisch", () => {
    expect(de["allg.marke"]).toBe("raumzuzweit");
    expect(APP_NAME).toBe("raumzuzweit");
    expect(de["pwa.name"]).toBe(de["allg.marke"]);
  });

  it("en: roomfortwo — Marke und PWA-Name identisch", () => {
    expect(en["allg.marke"]).toBe("roomfortwo");
    expect(en["pwa.name"]).toBe(en["allg.marke"]);
  });

  it("NEGATIV: die alten Markennamen kommen in den Wörterbüchern nicht mehr vor", () => {
    for (const [name, dict] of [["de", de], ["en", en]]) {
      const werte = JSON.stringify(Object.values(dict));
      expect(werte, name).not.toContain("Paarbegleitung Neubau");
      expect(werte, name).not.toContain("unserbegleiter");
      expect(werte, name).not.toContain("Couples Companion");
    }
  });
});
