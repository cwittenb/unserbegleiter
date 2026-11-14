// PRV-11.1 · Lagebild im Kern: Die Vertiefung richtet sich nach der Lage.
// Anlass: rev-int (11.11.) — INT-F3 (Skepsis), F5 (benannte Wut), F6a (frische
// Einsicht) je 3/3 verletzt in beiden Modellen, weil der Baustein bei jedem
// bedeutsamen Moment "immer genau eine Erlebensfrage" verlangte.
import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { bausteine } from "../../core/korpus/de/bausteine.js";
import { bausteine as bausteineEn } from "../../core/korpus/en/bausteine.js";
import { VORGABEN } from "../../platforms/artifact/eval-vorgaben.js";
import { SZENARIEN } from "../../evals/szenarien/start-katalog.js";

const DE = bausteine.bedeutsameMomente, EN = bausteineEn.bedeutsameMomente;
const alt = sprache => {
  const quelle = execFileSync("git", ["show", "e2a4d08:core/korpus/" + sprache + "/bausteine/wissen/bedeutsameMomente.md"], { encoding: "utf8" });
  return quelle.replace(/<!--[\s\S]*?-->/g, "").replace(/[ \t]{2,}/g, " ").trim();
};
const teil1 = (t, marke) => t.slice(0, t.indexOf(marke));

describe("PRV-11.1 · was gestrichen ist", () => {
  it("keine Pflicht-Erlebensfrage, kein Vorrang mehr", () => {
    for (const t of [DE, EN]) {
      expect(t).not.toMatch(/immer genau eine Erlebensfrage|always ask exactly one experience question/);
      expect(t).not.toMatch(/VORRANG DER ERLEBENSFRAGE|PRECEDENCE OF THE EXPERIENCE QUESTION/);
    }
  });
  it("keine zitierfähige Beispielfrage in den Teilen (2) und (3) — Echo", () => {
    const de = DE.slice(DE.indexOf("(2) ")), en = EN.slice(EN.indexOf("(2) "));
    expect(de).not.toMatch(/\?/);
    expect(en).not.toMatch(/\?/);
  });
});

describe("PRV-11.1 · was bleibt", () => {
  it("Teil (1) Ich-Perspektive ist wörtlich unverändert", () => {
    let basis;
    try { basis = { de: alt("de"), en: alt("en") }; } catch { return; }   // flacher Klon ohne den Basis-Commit
    const norm = s => s.replace(/\s+/g, " ").trim();
    expect(norm(teil1(DE, "(2) "))).toBe(norm(teil1(basis.de, "(2) ")));
    expect(norm(teil1(EN, "(2) "))).toBe(norm(teil1(basis.en, "(2) ")));
  });
  it("Sicherheit geht vor; eine Prozessfrage ersetzt die Vertiefung nicht", () => {
    expect(DE).toMatch(/geht Sicherheit vor/); expect(EN).toMatch(/safety comes first/);
    expect(DE).toMatch(/Prozess- oder Okay-Frage ersetzt die Vertiefung nicht/);
  });
});

describe("PRV-11.1 · das Lagebild", () => {
  const lagen = [
    ["benanntes Gefühl: weiterführen, nicht erneut fragen, keine Sachfrage", /Gefühl schon benannt[^.]*anerkennen und weiterführen[^.]*nicht erneut danach fragen, nicht in eine Sachfrage ausweichen/, /Feeling already named[^.]*acknowledge it and lead on[^.]*do not ask about it again, do not escape into a factual question/],
    ["frische Einsicht: in den Worten aufnehmen, Folge oder Bedeutung", /Frische Einsicht: in den Worten der Person aufnehmen und fragen, was daraus folgt oder was ihr daran wichtig ist/, /Fresh insight: take it up in the person's words and ask what follows from it or what matters/],
    ["Skepsis: annehmen, Selbstbestimmung ausdrücklich, Frage beim Vorgehen", /Skepsis oder Rückzug: annehmen, ohne zu werben oder zu deuten; ausdrücklich sagen, dass die Person bestimmt[^.]*eine Frage bleibt beim Vorgehen/, /Scepticism or withdrawal: accept it without courting or interpreting; say explicitly that the person decides[^.]*a question stays with how to proceed/],
    ["Wunsch: Wunschbild oder Ausnahme", /Wunsch oder Sehnsucht: nach dem Wunschbild oder einer Ausnahme fragen/, /Wish or longing: ask about the wished-for picture or an exception/],
    ["Vages: Erleben einladen; Körper nur, wenn etwas Unbenennbares da ist", /Vages oder nur Berichtetes: zum Erleben einladen[^.]*nach dem Körper, wenn etwas da ist, das sich nicht benennen lässt/, /Vague or merely reported: invite the experience[^.]*about the body when something is there that cannot be named/],
  ];
  for (const [name, de, en] of lagen)
    it(name, () => { expect(DE).toMatch(de); expect(EN).toMatch(en); });

  it("K2: die Körperfrage ist nicht verboten, aber nie ein Paar mit der Gefühlsfrage", () => {
    expect(DE).toMatch(/nie als Paar mit der Gefühlsfrage/);
    expect(EN).toMatch(/never as a pair with the feeling question/);
  });
  it("Wechsel: nach zwei Erlebens-Schlüssen in Folge eine andere Tür", () => {
    expect(DE).toMatch(/Nach zwei Antworten in Folge, die mit Gefühl oder Körper enden, wählt die dritte eine andere Tür/);
    expect(EN).toMatch(/After two replies in a row that end with feeling or body, the third chooses another door/);
  });
  it("Doppelangebot (E8) zählt als eine Vertiefung", () => {
    expect(DE).toMatch(/zwei Türen derselben Ebene, mit „oder“ verbunden, zählen als eine/);
    expect(EN).toMatch(/two doors on the same level, joined by "or", count as one/);
  });
});

describe("PRV-11.1 · Leitplanken", () => {
  it("der Baustein ist nicht länger als vorher (DE 2303, EN 2300 Zeichen im Prompt)", () => {
    expect(DE.length).toBeLessThanOrEqual(2303);
    expect(EN.length).toBeLessThanOrEqual(2300);
  });
  it("die Lagen stehen in Normalschrift — keine neue Betonung in Großbuchstaben", () => {
    const de2 = DE.slice(DE.indexOf("(2) "));
    expect((de2.match(/\b[A-ZÄÖÜ]{3,}\b/g) || []).sort()).toEqual(["BEZIEHUNGSEBENE", "DOSIERUNG", "LAGE", "NACH", "VERTIEFUNG"].sort());
  });
  it("Quelle und generierter Korpus stimmen überein", () => {
    const quelle = readFileSync("core/korpus/de/bausteine/wissen/bedeutsameMomente.md", "utf8");
    expect(quelle).toContain("VERTIEFUNG NACH LAGE");
    expect(DE).toContain("VERTIEFUNG NACH LAGE");
  });
  it("Vorgabe prv11-1: Ziel- und Wächterszenarien, beide Modelle n = 5", () => {
    const v = VORGABEN["prv11-1"];
    for (const id of ["INT-F3", "INT-F5", "INT-F6a", "INT-L1", "INT-L2", "INT-L3", "SYC-05", "SYC-06", "MOM-01", "GATE-S1", "KRIS-02"]) expect(v.szenarien, id).toContain(id);
    for (const id of v.szenarien) expect(SZENARIEN.find(s => s.id === id), id).toBeTruthy();
    expect(v.arme.map(a => a.n)).toEqual([5, 5]);
  });
});
