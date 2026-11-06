// MOD-4/MOD-6 · Der Korpus als Text: Templates, Bausteine, Notation.
//
// Alles, was das Modell liest, liegt als .md unter core/korpus/<l>/ —
// bausteine/<schicht>/<key>.md (wissen, policies, format, grundsaetze,
// waechter) und sessions/<art>.md. Die JS-Module wissen/policies/format/
// grundsaetze/sessions.js sind GENERATE (scripts/build-korpus.js). JS bleibt
// nur, was Code ist: Regexe (signale.js), Daten (domaenen.js, steuer.js), die
// Zusammensetzung (bausteine.js).
//
// Dieser Test haelt fest:
//   1. Jedes committete Generat ist byte-gleich zu dem, was die Quellen ergeben.
//   2. Die Notation: benannte Argumente, Strings mit {{param}}, true/false,
//      drei Listen-Filter — und alles Unbekannte ist laut.
//   3. Die Quellen sind Text (kein ${, kein Backtick-Escape), DE und EN haben
//      dieselben Dateien, slots.js gibt es nicht mehr (F9 ueberholt).
// Byte-Identitaet der Prompte: mod-golden-prompts.spec.js.

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ZIELE, baueQuelle, zielPfad, ladeBausteine, kompiliere, parsePlatzhalter, parseBaustein, escapeTemplate, SESSIONS } from "../../scripts/build-korpus.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const dateienUnter = dir => readdirSync(path.join(ROOT, dir)).filter(f => f.endsWith(".md")).sort();

describe("MOD-6 · Generat ≡ Quellen", () => {
  for (const l of ["de", "en"]) {
    const reg = ladeBausteine(l);
    for (const ziel of ZIELE) {
      it(l + "/" + ziel + ".js ist das Generat seiner .md-Quellen", () => {
        expect(readFileSync(zielPfad(l, ziel), "utf8")).toBe(baueQuelle(l, ziel, reg));
      });
    }
  }
});

describe("MOD-6 · Die Quellen sind Text", () => {
  const ORDNER = ["bausteine/wissen", "bausteine/policies", "bausteine/format", "bausteine/grundsaetze", "bausteine/waechter", "sessions"];
  it("DE und EN haben dieselben Dateien", () => {
    for (const o of ORDNER) expect(dateienUnter("core/korpus/en/" + o), o).toEqual(dateienUnter("core/korpus/de/" + o));
  });
  it("kein ${, kein Backtick-Escape, kein slots in einer .md", () => {
    for (const l of ["de", "en"]) for (const o of ORDNER) for (const f of dateienUnter("core/korpus/" + l + "/" + o)) {
      const t = readFileSync(path.join(ROOT, "core/korpus", l, o, f), "utf8");
      expect(t, l + "/" + o + "/" + f).not.toMatch(/\$\{|\\`|\{\{\s*slots\./);
    }
    expect(existsSync(path.join(ROOT, "core/korpus/de/sessions/slots.js"))).toBe(false);
  });
  it("jede Session hat ein Template; grundsaetze.js importiert nichts", () => {
    expect(dateienUnter("core/korpus/de/sessions")).toEqual([...SESSIONS.map(s => s.art + ".md"), "themen-rahmen.md"].sort());
    expect(readFileSync(zielPfad("de", "grundsaetze"), "utf8")).not.toMatch(/^import /m);
  });
  it("Sprint-Historie aus den .md-Kommentaren steht im Generat (S136 am Haltungskern)", () => {
    expect(readFileSync(zielPfad("de", "wissen"), "utf8")).toContain("HIER STAND EINE REGEL, DIE GEMESSEN GESCHADET HAT");
  });
});

describe("MOD-6 · Die Notation", () => {
  const reg = ladeBausteine("de");
  const ctx = (params = ["name", "partner"]) => ({
    params, reg, wo: "test",
    ref: (s, k) => s + "." + k,
    daten: n => n,
  });
  it("Parameter, Include, Include mit benannten Argumenten, Filter", () => {
    expect(kompiliere("A {{name}} B", ctx())).toBe("A ${name} B");
    expect(kompiliere("{{wissen.anteileSprache}}", ctx())).toBe("${wissen.anteileSprache}");
    expect(kompiliere("{{policies.krisenVorrang subjekt=name}}", ctx())).toBe("${policies.krisenVorrang(name)}");
    expect(kompiliere('{{format.kiBegleiter rollenzusatz="hier als {{name}}s Raum"}}', ctx())).toBe("${format.kiBegleiter(`hier als ${name}s Raum`)}");
    expect(kompiliere("{{policies.notFrage}} / {{policies.notFrage mitEinladung=false}}", ctx())).toBe("${policies.notFrage()} / ${policies.notFrage(false)}");
    expect(kompiliere('{{steuer.KAPITEL_TITEL | join " · "}}', ctx())).toBe('${KAPITEL_TITEL.join(" · ")}');
    expect(kompiliere("{{wissen.DOMAINS | count}}", ctx())).toBe("${DOMAINS.length}");
    expect(kompiliere('{{wissen.DOMAENEN | zeilen " · "}}', ctx())).toBe('${DOMAENEN.split("\\n").join(" · ")}');
  });
  it("Argumente in beliebiger Reihenfolge, Signatur-Reihenfolge im Generat", () => {
    expect(kompiliere('{{policies.regieUebergabe folge="F" element="E" wen=name}}', ctx())).toBe("${policies.regieUebergabe(`E`, name, `F`)}");
  });
  it("Strings: \\\" und \\\\ sind die einzigen Escapes; Backtick und ${ im Text werden escaped", () => {
    expect(kompiliere('{{policies.endSignal klaerungsFrage="\\"Magst du?\\""}}', ctx())).toBe("${policies.endSignal(`\"Magst du?\"`)}");
    expect(escapeTemplate("a`b\\c${d}")).toBe("a\\`b\\\\c\\${d}");
    const fn = new Function("name", "return `" + kompiliere("x`y {{name}} \\n ${z}", ctx()) + "`;");
    expect(fn("N")).toBe("x`y N \\n ${z}");
  });
  it("alles Unbekannte ist laut — nie ein leerer String", () => {
    const faelle = [
      ["{{nirgends}}", /unbekannter Parameter/],
      ["{{nameA}}", /unbekannter Parameter/],
      ["{{eval(1)}}", /unerwarteter Rest|Name erwartet/],
      ["{{wissen.gibtsnicht}}", /unbekannter Baustein/],
      ["{{wissen.anteileSprache x=name}}", /nimmt keine Argumente/],
      ["{{wissen.anteileSprache x=1}}", /Name erwartet/],
      ["{{policies.krisenVorrang}}", /fehlt/],
      ["{{policies.krisenVorrang subjekt=name extra=name}}", /unbekanntes Argument/],
      ["{{policies.krisenVorrang subjekt=nirgends}}", /unbekannter Parameter/],
      ["{{policies.krisenVorrang name}}", /'=' nach name erwartet/],
      ["{{wissen.DOMAINS | nope}}", /unbekannter Filter/],
      ["{{wissen.anteileSprache | count}}", /Filter gibt es nur auf Listen/],
      ["{{name | count}}", /weder Argumente noch Filter/],
      ["{{kein.schicht.hier}}", /unbekannter Platzhalter/],
      ["offen {{name", /offene \{\{ ohne Schluss/],
      ['{{format.kiBegleiter rollenzusatz="offen}}', /nicht geschlossen|ohne Schluss/],
    ];
    for (const [t, re] of faelle) expect(() => kompiliere(t, ctx()), t).toThrow(re);
  });
  it("parsePlatzhalter liefert die Struktur", () => {
    expect(parsePlatzhalter('policies.regieUebergabe wen=name folge="x {{name}}" | join ","', "t")).toEqual({
      pfad: "policies.regieUebergabe",
      args: [{ name: "wen", wert: { typ: "param", wert: "name" } }, { name: "folge", wert: { typ: "string", wert: "x {{name}}" } }],
      filter: { name: "join", arg: "," },
    });
  });
  it("parseBaustein: Kommentare, args, Vorgabe + Zweitfassung", () => {
    const b = parseBaustein("<!-- S99 · Historie -->\n<!-- args: mitEinladung=true; sonst: notFrage.kurz -->\nText", "t");
    expect(b).toEqual({ kommentare: [" S99 · Historie "], args: ["mitEinladung"], defaults: { mitEinladung: true }, sonst: "notFrage.kurz", body: "Text" });
    expect(parseBaustein("Nur Text", "t").body).toBe("Nur Text");
    expect(() => parseBaustein("<!-- args: a; sonst: x -->\nT", "t")).toThrow(/boolesches Argument/);
  });
});
