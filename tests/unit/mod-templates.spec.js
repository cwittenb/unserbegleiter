// MOD-4 · Session-Prompts als Templates (.md) + Slots (F9 b).
//
// core/korpus/<l>/sessions/<art>.md traegt den Text einer Session mit einer
// kleinen Platzhalter-Sprache ({{name}}, {{wissen.key}}, {{slots.name}});
// sessions/slots.js die Verknuepfungen mit Argumenten; sessions.js ist das
// GENERAT (scripts/build-korpus.js). Dieser Test haelt fest:
//   1. Das committete Generat ist byte-gleich zu dem, was die Quellen ergeben
//      (Kanarie gegen Handedits im Generat).
//   2. Jeder Platzhalter jedes Templates loest auf: Kontext-Argumente der
//      Funktion, Schicht-Schluessel, Slots der Session. Unbekannte sind laut.
//   3. Die Templates enthalten keine JS-Konstrukte (kein ${, kein Backtick-
//      Escape) — sie sind Text.
//   4. Der Renderer escaped korrekt (Backtick, Backslash, ${ im Text).
// Byte-Identitaet der Prompte selbst: mod-golden-prompts.spec.js.

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { baueSessionsQuelle, zielPfad, kompiliere, escapeTemplate, SESSIONS } from "../../scripts/build-korpus.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCHICHTEN = { wissen: "wissen", policies: "policies", format: "format" };

describe("MOD-4 · Generat ≡ Quellen", () => {
  for (const l of ["de", "en"]) {
    it(l + ": sessions.js ist das Generat seiner Templates", () => {
      expect(readFileSync(zielPfad(l), "utf8")).toBe(baueSessionsQuelle(l));
    });
  }
});

describe("MOD-4 · Jeder Platzhalter loest auf", () => {
  for (const l of ["de", "en"]) {
    it(l + ": Kontext, Schichten, Slots", async () => {
      const dir = path.join(ROOT, "core/korpus", l, "sessions");
      const { SLOTS } = await import("../../core/korpus/" + l + "/sessions/slots.js");
      const schicht = {};
      for (const [name, datei] of Object.entries(SCHICHTEN)) schicht[name] = (await import("../../core/korpus/" + l + "/" + datei + ".js"))[name];
      const { DOMAENEN } = await import("../../core/korpus/" + l + "/wissen.js");
      for (const s of SESSIONS) {
        const md = readFileSync(path.join(dir, s.art + ".md"), "utf8");
        const ctx = Object.fromEntries(s.args.map(a => [a, "X"]));
        const slots = SLOTS[s.art](ctx);
        for (const m of md.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)) {
          const [kopf, ...rest] = m[1].split(".");
          if (rest.length === 0) expect(s.args, s.art + ": " + m[1]).toContain(kopf);
          else if (kopf === "slots") expect(slots, s.art + ": " + m[1]).toHaveProperty(rest[0]);
          else if (kopf === "wissen" && rest[0] === "DOMAENEN") expect(typeof DOMAENEN).toBe("string");
          else expect(schicht[kopf], s.art + ": " + m[1]).toHaveProperty(rest[0]);
        }
        // und das Template ist Text, kein JS
        expect(md, s.art).not.toMatch(/\$\{/);
        expect(md, s.art).not.toMatch(/\\`/);
      }
      // jedes Template existiert, keins zu viel
      const dateien = readdirSync(dir).filter(f => f.endsWith(".md")).sort();
      expect(dateien).toEqual([...SESSIONS.map(s => s.art + ".md"), "themen-rahmen.md"].sort());
    });
  }
});

describe("MOD-4 · Der Renderer", () => {
  const s = { art: "solo", args: ["name", "partner"] };
  it("unbekannter Platzhalter ist laut — nie ein leerer String", () => {
    expect(() => kompiliere("Hallo {{nirgends}}", s)).toThrow(/unbekannter Platzhalter/);
    expect(() => kompiliere("Hallo {{nameA}}", s)).toThrow(/kein Argument/);
    expect(() => kompiliere("{{wissen.a.b}}", s)).toThrow(/unbekannter Platzhalter/);
    expect(() => kompiliere("{{eval(1)}}", s)).toThrow(/unbekannter Platzhalter/);
  });
  it("bekannte Platzhalter werden zu ${…}", () => {
    expect(kompiliere("A {{name}} B {{wissen.haltungsKern}} C {{slots.rolle}}", s)).toBe("A ${name} B ${wissen.haltungsKern} C ${slots.rolle}");
  });
  it("Text wird escaped: Backtick, Backslash, ${", () => {
    expect(escapeTemplate("a`b\\c${d}")).toBe("a\\`b\\\\c\\${d}");
    const quelle = "return `" + kompiliere("x`y {{name}} \\n ${z}", s) + "`;";
    const fn = new Function("name", quelle);
    expect(fn("N")).toBe("x`y N \\n ${z}");
  });
});
