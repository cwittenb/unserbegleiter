// MOD-2a · Waechter textfrei und sprachfaehig.
//
// Review K1: Die Schaerfungs-Waechter trugen deutschen Prompt-Text und
// deutsche Signal-Muster im Engine-Code — eine EN-Session bekam bei einem
// Krisensignal einen deutschen [APP-HINWEIS …] in den Systemtext. Seit MOD-2a
// liegt der Inhalt im Korpus (waechter.*), die Waechter sind Fabriken.
//
// Vier Dinge haelt dieser Test fest:
//   1. Die deutschen Texte sind BYTE-IDENTISCH zu den alten Konstanten
//      (SHA-256, gerechnet vor dem Umzug) — kein Prompt hat sich geaendert.
//   2. Eine EN-Session bekommt den englischen Hinweis; die DE-Session den
//      deutschen; die Mechanik ist dieselbe Funktion.
//   3. DE und EN sind paritaetisch (Schluessel, Typen) und das Krisen-Signal
//      ist in beiden Sprachen dasselbe (Union — eine Krise darf nicht an der
//      Paarsprache scheitern).
//   4. Die Fabriken sind laut, wenn der Inhalt fehlt — kein stiller Deutsch-
//      Rueckfall mehr, denn den gibt es in der Engine nicht mehr.

import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import * as de from "../../core/prompts/prompts.de.js";
import * as en from "../../core/prompts/prompts.en.js";
import { setKorpusSprache } from "../../core/prompts/prompts.js";
import { baueKrisenSchaerfung } from "../../core/engine/krisen-waechter.js";
import { baueZweiseitigkeitsSchaerfung } from "../../core/engine/zweiseitigkeit-waechter.js";
import { baueAufdeckSchaerfung } from "../../core/engine/aufdeck-waechter.js";
import { baueSessionDef } from "../../core/komposition.js";

const sha = s => createHash("sha256").update(s, "utf8").digest("hex");

describe("MOD-2a · Die deutschen Schaerfungstexte sind die alten (byte-identisch)", () => {
  it("krise / zweiseitigkeit / aufdeck", () => {
    expect(sha(de.waechter.krise.text)).toBe("a9b6cd65e4778208347e30be1abc62bac0d9ad235cf331ce51dcfe7db37a464a");
    expect(sha(de.waechter.zweiseitigkeit.text)).toBe("c6bf6b07cd4cb595d2bc9843716fa8d8c10f66fd3bb03c184537310ccb3ec0d9");
    expect(sha(de.waechter.aufdeck.text)).toBe("6d48e83ff81fb43b9caaf7958bbefef89e06ff7c32a1346e06885ffeb9feaef1");
  });
});

describe("MOD-2a · Paritaet DE ≡ EN", () => {
  const form = w => ({
    keys: Object.keys(w).sort(),
    krise: Object.keys(w.krise).sort(), zweiseitigkeit: Object.keys(w.zweiseitigkeit).sort(), aufdeck: Object.keys(w.aufdeck).sort(),
  });
  it("gleiche Schluessel, gleiche Typen", () => {
    expect(form(en.waechter)).toEqual(form(de.waechter));
    for (const w of [de.waechter, en.waechter]) {
      expect(w.krise.signal).toBeInstanceOf(RegExp);
      expect(w.krisenhilfe).toBeInstanceOf(RegExp);
      expect(w.einzelraum).toBeInstanceOf(RegExp);
      expect(w.zweiseitigkeit.eigeneSache).toBeInstanceOf(RegExp);
      expect(w.zweiseitigkeit.verfuegung).toBeInstanceOf(RegExp);
      for (const t of [w.krise.text, w.zweiseitigkeit.text, w.aufdeck.text]) expect(t).toMatch(/^\[APP[ -]/);
    }
  });
  it("das Krisen-Signal und die Erkenner sind in beiden Sprachen dieselbe Union", () => {
    expect(en.waechter.krise.signal.source).toBe(de.waechter.krise.signal.source);
    expect(en.waechter.krisenhilfe.source).toBe(de.waechter.krisenhilfe.source);
    expect(en.waechter.einzelraum.source).toBe(de.waechter.einzelraum.source);
    expect(de.waechter.krise.signal.test("I want to kill myself")).toBe(true);
    expect(en.waechter.krise.signal.test("Ich will nicht mehr leben.")).toBe(true);
  });
  it("die englischen Texte sind englisch, die deutschen deutsch", () => {
    expect(en.waechter.krise.text).toMatch(/^\[APP NOTE/);
    expect(en.waechter.krise.text).not.toMatch(/[äöüß]/);
    expect(de.waechter.krise.text).toMatch(/^\[APP-HINWEIS/);
  });
});

describe("MOD-2a · Eine EN-Session bekommt den englischen Hinweis", () => {
  const krise = [{ role: "user", content: "Anna: I just want to end it all." }];
  it("ueber die Komposition mit sprache:'en' — moment und gemeinsam", () => {
    for (const art of ["moment", "gemeinsam"]) {
      const enDef = baueSessionDef(art, { sprache: "en" });
      const deDef = baueSessionDef(art, { sprache: "de" });
      expect(enDef.schaerfe(krise, {}), art).toBe(en.waechter.krise.text);
      expect(deDef.schaerfe(krise, {}), art).toBe(de.waechter.krise.text);
    }
  });
  it("ueber den globalen Schnappschuss (App-Pfad): K() entscheidet je Zug, nicht beim Def-Bau", () => {
    setKorpusSprache("de");
    const def = baueSessionDef("moment");       // gebaut unter DE
    setKorpusSprache("en");
    try {
      expect(def.schaerfe(krise, {})).toBe(en.waechter.krise.text);   // gelesen unter EN
    } finally { setKorpusSprache("de"); }
    expect(def.schaerfe(krise, {})).toBe(de.waechter.krise.text);
  });
  it("die Aufloesung schaerft die Aufdeckung in der Session-Sprache", () => {
    const erste = [{ role: "user", content: "REVEAL PENDING\nHANDOVER-BLOCK …" }];
    expect(baueSessionDef("gemeinsam", { sprache: "en" }).schaerfe(erste, {})).toBe(en.waechter.aufdeck.text);
    expect(baueSessionDef("gemeinsam", { sprache: "de" }).schaerfe(erste, {})).toBe(de.waechter.aufdeck.text);
  });
});

describe("MOD-2a · Fabriken sind laut ohne Inhalt", () => {
  it("Krise", () => {
    expect(() => baueKrisenSchaerfung(null)([{ role: "user", content: "x" }])).toThrow(/Korpus/);
    expect(() => baueKrisenSchaerfung({ signal: /x/, text: 1 })([])).toThrow(/Korpus/);
  });
  it("Zweiseitigkeit", () => {
    expect(() => baueZweiseitigkeitsSchaerfung({})([{ role: "user", content: "a" }, { role: "user", content: "b" }])).toThrow(/Korpus/);
  });
  it("Aufdeckung", () => {
    expect(() => baueAufdeckSchaerfung(undefined)([])).toThrow(/Korpus/);
  });
  it("ctx.text ueberstimmt den Korpus-Text (Eval, Sonden)", () => {
    const s = baueKrisenSchaerfung(de.waechter.krise);
    expect(s([{ role: "user", content: "suizid" }], { text: "SONDE" })).toBe("SONDE");
  });
});
