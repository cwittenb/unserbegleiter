// i18n-Wörterbücher: Deutsch und Englisch müssen deckungsgleich sein —
// gleiche Schlüsselmenge, gleiche {Platzhalter} je Schlüssel. Dazu das
// Locale-Verhalten von t(): Umschalten, Parameter-Füllung, Fallback.

import { describe, it, expect, afterEach } from "vitest";
import { de } from "../../core/i18n/de.js";
import { en } from "../../core/i18n/en.js";
import { t, setLocale, getLocale, fehlerText } from "../../core/i18n/index.js";

const platzhalter = s => [...String(s).matchAll(/\{([a-zA-Z0-9]+)\}/g)].map(m => m[1]).sort();

describe("i18n-Wörterbücher de/en", () => {
  afterEach(() => setLocale("de"));

  it("haben dieselbe Schlüsselmenge", () => {
    const nurDe = Object.keys(de).filter(k => !(k in en));
    const nurEn = Object.keys(en).filter(k => !(k in de));
    expect(nurDe, "fehlt in en: " + nurDe.join(", ")).toEqual([]);
    expect(nurEn, "fehlt in de: " + nurEn.join(", ")).toEqual([]);
  });

  it("haben je Schlüssel dieselben Platzhalter", () => {
    const abweichungen = [];
    for (const k of Object.keys(de))
      if (k in en && JSON.stringify(platzhalter(de[k])) !== JSON.stringify(platzhalter(en[k])))
        abweichungen.push(`${k}: de{${platzhalter(de[k])}} vs en{${platzhalter(en[k])}}`);
    expect(abweichungen, abweichungen.join("\n")).toEqual([]);
  });

  it("t() schaltet um, füllt Parameter und fällt auf Deutsch zurück", () => {
    expect(getLocale()).toBe("de");
    expect(t("allg.hallo", { name: "Anna" })).toBe("Hallo Anna");
    setLocale("en");
    expect(t("allg.hallo", { name: "Anna" })).toBe("Hello Anna");
    expect(t("start.meinRaum")).toBe("My Private Space");
    expect(t("sprache.diktat")).toBe("en-US");
    setLocale("xx");                                  // unbekannt → bleibt en
    expect(getLocale()).toBe("en");
  });

  it("fehlerText() bevorzugt den lokalisierten Code, sonst die Server-Meldung", () => {
    const e = Object.assign(new Error("Dieser Zugangslink ist abgelaufen."), { code: "link_expired" });
    setLocale("en");
    expect(fehlerText(e)).toBe("This access link has expired.");
    expect(fehlerText(new Error("Spezialfall ohne Code"))).toBe("Spezialfall ohne Code");
  });
});
