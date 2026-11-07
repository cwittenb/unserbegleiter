// MOD-2c (F7 a) · Englische Zweiseitigkeits-Muster.
//
// Bis MOD-2c standen im EN-Korpus die deutschen Muster — in EN-Sessions
// feuerte die Zweiseitigkeits-Schaerfung nie. Jetzt gibt es englische Muster,
// gespiegelt an den deutschen (mrv-zweiseitigkeit.spec.js): dieselbe Mechanik
// (baueZweiseitigkeitsSchaerfung), derselbe gemessene Fall (MRV-02-EN im
// EN-Katalog), dieselben Grenzen (ueber sich selbst verfuegen → nichts; ohne
// Praefix im Zweifel schaerfen; versteckte Zuege zaehlen nicht).
//
// Lebende Sonde: `node evals/runner.js --szenario MRV-02-EN --waechter --n 8`
// (API-Keys aus .env) — Check C2 misst, ob die Begleitung Bernd einholt.

import { describe, it, expect } from "vitest";
import { baueZweiseitigkeitsSchaerfung } from "../../core/engine/zweiseitigkeit-waechter.js";
import { waechter as en } from "../../core/prompts/prompts.en.js";
import { waechter as de } from "../../core/prompts/prompts.de.js";
import { SZENARIEN_EN as EN_SZENARIEN } from "../../evals/szenarien/start-katalog.en.js";
import { baueSessionDef } from "../../core/komposition.js";

const s = baueZweiseitigkeitsSchaerfung(en.zweiseitigkeit);
const zuege = (...texte) => texte.map(c => ({ role: "user", content: c }));

describe("MOD-2c · Wann in EN geschaerft wird", () => {
  it("der gemessene Fall (MRV-02-EN): Anna decides about Bernd's matter", () => {
    const sz = EN_SZENARIEN.find(x => x.id === "MRV-02-EN");
    expect(sz).toBeTruthy();
    expect(s(zuege(...sz.eingaben))).toBe(en.zweiseitigkeit.text);
    // und ueber die Komposition in der Session-Sprache
    expect(baueSessionDef("moment", { sprache: "en" }).schaerfe(zuege(...sz.eingaben), {})).toBe(en.zweiseitigkeit.text);
  });
  it("Formen, in denen Menschen sprechen: eigene Sache", () => {
    for (const t of ["I haven't done mine yet.", "I forgot to fill in my reflection.", "I never got around to it.",
      "My reflection isn't finished.", "I had no time for my part.", "I didn't get to it this week."])
      expect(en.zweiseitigkeit.eigeneSache.test(t), t).toBe(true);
    for (const t of ["I did my reflection, it was good.", "We had a lovely evening.", "Oh, that is a pity."])
      expect(en.zweiseitigkeit.eigeneSache.test(t), t).toBe(false);
  });
  it("Formen, in denen Menschen sprechen: Verfuegung", () => {
    for (const t of ["Shall we just move on?", "We can do that later.", "Never mind, let's go on.", "Let's skip it.", "Let us carry on anyway."])
      expect(en.zweiseitigkeit.verfuegung.test(t), t).toBe(true);
    for (const t of ["Oh, that is a pity.", "How was your day?", "I'd like to talk about it now."])
      expect(en.zweiseitigkeit.verfuegung.test(t), t).toBe(false);
  });
  it("ueber SICH SELBST verfuegen → nichts", () => {
    expect(s(zuege("Bernd: I didn't do my process reflection.", "Bernd: Let's just continue anyway."))).toBeNull();
  });
  it("ohne Verfuegung, ohne markierte Sache → nichts; ohne Praefix im Zweifel ja", () => {
    expect(s(zuege("Bernd: I didn't do it.", "Anna: Oh, that is a pity."))).toBeNull();
    expect(s(zuege("Anna: Nice to be here.", "Anna: Let's move on."))).toBeNull();
    expect(s(zuege("I didn't do my reflection.", "Let's just continue."))).toBeTruthy();
  });
  it("versteckte Zuege zaehlen nicht; ein Zug reicht nie", () => {
    expect(s([{ role: "user", hidden: true, content: "MOMENT-CONTEXT: I didn't do it" }, { role: "user", content: "Anna: Let's move on." }])).toBeNull();
    expect(s(zuege("Anna: Let's move on."))).toBeNull();
  });
});

describe("MOD-2d · Der EN-Zusatz schliesst die Oder-Tuer (Sonde 2026-11-07: C2 8/8, C1 6/8 verletzt)", () => {
  it("nennt das Oder-Muster, das die Sonde gezeigt hat, und verbietet das zweite Nachhol-Angebot", () => {
    expect(en.zweiseitigkeit.text).toContain("stop there");
    expect(en.zweiseitigkeit.text).toContain("do not re-offer the catch-up");
    expect(en.zweiseitigkeit.text).toMatch(/or would you rather/);
    expect(en.zweiseitigkeit.text).toMatch(/^\[APP NOTE/);
    expect(en.zweiseitigkeit.text).toMatch(/\]$/);
  });
});

describe("MOD-2c · Die deutschen Muster sind unberuehrt", () => {
  it("DE-Regexe unveraendert (Quelle) und EN ≠ DE", () => {
    expect(de.zweiseitigkeit.eigeneSache.source).toMatch(/nicht gemacht/);
    expect(de.zweiseitigkeit.verfuegung.source).toMatch(/lass uns/);
    expect(en.zweiseitigkeit.eigeneSache.source).not.toBe(de.zweiseitigkeit.eigeneSache.source);
    expect(en.zweiseitigkeit.verfuegung.source).not.toBe(de.zweiseitigkeit.verfuegung.source);
  });
});
