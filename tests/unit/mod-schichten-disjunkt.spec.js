// MOD-3 · Der Korpus in Schichten — und die Schichten sind disjunkt.
//
// core/korpus/<sprache>/ traegt den Inhalt in wissen (Haltung, Methoden,
// Lebensbereiche), policies (Regeln + Waechter-Inhalt), format (technische
// Vorgaben), sessions (Dramaturgie), steuer (Wire) — und grundsaetze als Blatt
// fuer die fuenf Saetze, die mehr als eine Schicht zitiert. prompts.<l>.js ist
// nur noch Fassade.
//
// Was dieser Test festhaelt:
//   1. wissen, policies, format haben paarweise disjunkte Schluessel; ihre
//      Vereinigung ist genau `bausteine` — in der historischen Reihenfolge.
//   2. DE und EN haben je Schicht dieselben Schluessel und Typen.
//   3. grundsaetze.js importiert nichts (Blatt); sessions.js importiert nur
//      aus dem Korpus; keine Korpus-Datei importiert eine andere Sprache.
//   4. Die Fassade exportiert genau die 15 Namen von vor MOD-3 — nicht mehr.
//      (Byte-Identitaet der Texte: mod-golden-prompts.spec.js.)

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as deFassade from "../../core/prompts/prompts.de.js";
import * as enFassade from "../../core/prompts/prompts.en.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCHICHTEN = ["wissen", "policies", "format"];
const DATEIEN = ["grundsaetze", "wissen", "policies", "format", "bausteine", "sessions", "steuer"];
const lade = (l, datei) => import("../../core/korpus/" + l + "/" + datei + ".js");

describe("MOD-3 · Disjunkte Schichten", () => {
  for (const l of ["de", "en"]) {
    it(l + ": wissen ∩ policies ∩ format = ∅ und ∪ = bausteine (gleiche Reihenfolge)", async () => {
      const [w, p, f, b] = await Promise.all([lade(l, "wissen"), lade(l, "policies"), lade(l, "format"), lade(l, "bausteine")]);
      const kw = Object.keys(w.wissen), kp = Object.keys(p.policies), kf = Object.keys(f.format);
      expect(kw.filter(k => kp.includes(k) || kf.includes(k))).toEqual([]);
      expect(kp.filter(k => kf.includes(k))).toEqual([]);
      expect([...kw, ...kp, ...kf].sort()).toEqual(Object.keys(b.bausteine).sort());
      for (const k of Object.keys(b.bausteine)) {
        const quelle = kw.includes(k) ? w.wissen : kp.includes(k) ? p.policies : f.format;
        expect(b.bausteine[k], k).toBe(quelle[k]);
      }
    });
  }
  it("die Reihenfolge von bausteine ist die historische (S33a ff.)", async () => {
    const b = await lade("de", "bausteine");
    expect(Object.keys(b.bausteine).slice(0, 4)).toEqual(["sprecherKlarheit", "urteilsGrammatik", "kiBegleiter", "kiTransparenz"]);
    expect(Object.keys(b.bausteine).at(-1)).toBe("abschlussPflichten");
  });
});

describe("MOD-3 · Paritaet DE ≡ EN je Schicht", () => {
  for (const datei of DATEIEN) {
    it(datei + ".js: gleiche Exporte, gleiche Typen", async () => {
      const [de, en] = await Promise.all([lade("de", datei), lade("en", datei)]);
      const form = m => Object.fromEntries(Object.entries(m).map(([k, v]) => [k,
        v instanceof RegExp ? "regexp" : Array.isArray(v) ? "array" : typeof v === "object" && v ? Object.keys(v).sort().join(",") : typeof v]));
      expect(form(en)).toEqual(form(de));
    });
  }
});

describe("MOD-3 · Importe", () => {
  const importe = datei => {
    const q = readFileSync(path.join(ROOT, datei), "utf8");
    return [...q.matchAll(/^\s*(?:import|export)[^;]*?\bfrom\s*["']([^"']+)["']/gm)].map(m => m[1]);
  };
  for (const l of ["de", "en"]) {
    it(l + ": grundsaetze.js ist ein Blatt", () => {
      expect(importe("core/korpus/" + l + "/grundsaetze.js")).toEqual([]);
    });
    it(l + ": jede Korpus-Datei importiert nur aus dem eigenen Sprachordner", () => {
      for (const d of DATEIEN)
        for (const z of importe("core/korpus/" + l + "/" + d + ".js"))
          expect(z, d).toMatch(/^\.\/(sessions\/)?[a-z]+\.js$/);   // MOD-4: ./sessions/slots.js
    });
    it(l + ": die Fassade reicht nur aus core/korpus/" + l + " durch", () => {
      for (const z of importe("core/prompts/prompts." + l + ".js"))
        expect(z).toMatch(new RegExp("^\\.\\./korpus/" + l + "/[a-z]+\\.js$"));
    });
  }
});

describe("MOD-3 · Die Fassade ist die alte Oberflaeche", () => {
  const ALT = ["DOMAENEN", "DOMAINS", "KAPITEL_TITEL", "THEMEN_RAHMEN", "aufloesungsPrompt", "bausteine",
    "aufloesungsTeile", "klaerungsPrompt", "klaerungsTeile", "korpusTexte", "momentPrompt", "qzMenuePrompt", "reflexionsPrompt", "reflexionsTeile", "steuerTexte", "strukturTexte", "waechter"];
  it("DE und EN exportieren genau die 14 Namen von vor MOD-3 (ohne QZ_STUFEN_TEXT, MOD-7) + klaerungsTeile (PRV-5)", () => {
    expect(Object.keys(deFassade).sort()).toEqual([...ALT].sort());   // + aufloesungsTeile (PRV-6)
    expect(Object.keys(enFassade).sort()).toEqual([...ALT].sort());
  });
});
