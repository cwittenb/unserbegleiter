// S146 · Spiegel ohne Lob und Deutung — Würdigung ist Wahrnehmung, nicht Urteil.
//
// Befund (Kurzlauf + S145-Wirkmessung 07.11.): Haiku 5.5 eröffnet in allen
// SYC-05-Samples mit einem Prädikat („Das klingt nach einer wichtigen
// Erkenntnis“) und setzt erst danach einen Ich-Satz. Die Regel existierte —
// sie stand nur mitten im Prompt, während „würdige“ ~20× ohne Form vorkommt.
//
// Entscheid F1 07.11.: Dank ohne Eigenschaftswort ist erlaubt; ein
// Eigenschaftswort nur in Ich-Form („Danke, ich finde es mutig, dass …“).
//
// Testphilosophie wie S145: geprüft wird der ZUSAMMENGESETZTE Prompt; die
// alte Beispielformel steht als Negativ-Assertion.

import { describe, it, expect } from "vitest";
import * as DE from "../../core/prompts/prompts.de.js";
import * as EN from "../../core/prompts/prompts.en.js";
import { SZENARIEN } from "../../evals/szenarien/start-katalog.js";
import { SZENARIEN_EN } from "../../evals/szenarien/start-katalog.en.js";

const SESS = ["reflexions", "moment", "klaerungs", "aufloesungs"];
const de = Object.fromEntries(SESS.map(n => [n, DE[n + "Prompt"]("Anna", "Bernd")]));
const en = Object.fromEntries(SESS.map(n => [n, EN[n + "Prompt"]("Anna", "Bernd")]));

describe("S146 · Zielregel in der Urteils-Grammatik", () => {
  it("DE/EN: Würdigung ist Wahrnehmung — beschreibend oder Ich-Form", () => {
    expect(de.reflexions).toMatch(/URTEILS-GRAMMATIK: Würdigung ist Wahrnehmung\./);
    expect(de.reflexions).toMatch(/beschreibend .* oder als dein eigenes Erleben/);
    expect(en.reflexions).toMatch(/JUDGEMENT GRAMMAR: appreciation is perception\./);
  });
  it("jedes „würdige“ meint diese Form (H1 Salienz)", () => {
    expect(de.reflexions).toMatch(/wo immer hier „würdigen“ steht, ist diese Form gemeint/);
    expect(en.reflexions).toMatch(/wherever "appreciate" appears here, this form is meant/);
  });
  it("Eröffnung vor Ich-Satz zählt als Urteil", () => {
    expect(de.reflexions).toMatch(/auch als Eröffnung, auch wenn danach ein Ich-Satz folgt/);
    expect(en.reflexions).toMatch(/as an opening too, even if an I-sentence follows/);
  });
  it("Dank (F1): ohne Eigenschaftswort ja, Eigenschaftswort nur im Ich", () => {
    expect(de.reflexions).toContain("Dank ohne Eigenschaftswort ist Würdigung („Danke, dass du das teilst“)");
    expect(de.reflexions).toContain("ein Eigenschaftswort darin gehört ebenso zu deinem Erleben");
    expect(de.reflexions).not.toContain("Danke, dass du das so klar aussprichst");   // PRV-1c (F8): Verbots-Beispiel nur noch in der Quelle — Prime-Probe
  });
  it("Motiv-Deutung ist eine Frage, keine Feststellung (H3)", () => {
    expect(de.reflexions).toMatch(/ist eine Vermutung – stell sie als Frage/);
    expect(en.reflexions).toMatch(/is a guess – ask it as a question/);
  });
});

describe("S146 · Regel am Auslöser (H2): Stilzeile jeder Session", () => {
  it("DE: alle vier Sessions", () => {
    for (const n of SESS) expect(de[n], n).toContain("Warm heißt wahrnehmen: Dein erster Satz spricht von dir");
  });
  it("EN: alle vier Sessions", () => {
    for (const n of SESS) expect(en[n], n).toContain("Warm means perceiving: your first sentence speaks from yourself");
  });
});

describe("S146 · Schablone (H4): keine zitierbare Formel in BEDEUTSAME MOMENTE", () => {
  it("alte Beispielformel weg (Negativ)", () => {
    expect(de.moment).not.toContain("Ich empfinde das gerade als wichtigen Moment");
    expect(en.moment).not.toContain("I experience this as an important moment right now");
  });
  it("Sprint-Historie steht nicht mehr im Prompt", () => {
    for (const p of [de.moment, de.reflexions]) expect(p).not.toMatch(/\(S133: Die Fassung davor/);
    for (const p of [en.moment, en.reflexions]) expect(p).not.toMatch(/\(S133: the earlier version/);
  });
});

describe("S146 · Szenarien", () => {
  const by = (k, id) => k.find(s => s.id === id);
  it("SYC-05 v4 / -EN v4 mit Eröffnungs- und Dank-Abgrenzung", () => {
    expect(by(SZENARIEN, "SYC-05").version).toBe(4);
    expect(by(SZENARIEN_EN, "SYC-05-EN").version).toBe(4);
    expect(by(SZENARIEN, "SYC-05").checks[0].frage).toMatch(/Dank ohne Eigenschaftswort/);
  });
  it("SYC-06 (+EN): C1 Lob, C2 Deutung, C3 Würdigung ist da (verletzt bei nein)", () => {
    for (const s of [by(SZENARIEN, "SYC-06"), by(SZENARIEN_EN, "SYC-06-EN")]) {
      expect(s.checks.map(c => c.id)).toEqual(["C1", "C2", "C3"]);
      expect(s.checks.map(c => c.verletztWenn)).toEqual(["ja", "ja", "nein"]);
      expect(s.session).toBe("solo");
    }
  });
});

// S146 · Nachtrag nach der S145b-Messung: auch die DE-Formel wurde geechot
// („Wenn ich meine Perspektive zur Verfügung stellen soll …“, Haiku 4/9, Medium 2/9).
describe("S146 · DE VORSCHLAG_ICH ohne feste Eröffnungsformel", () => {
  it("alte Formel weg (Negativ), Formvorgabe bleibt", () => {
    for (const n of SESS) expect(de[n], n).not.toContain("Wenn ich meine Perspektive zur Verfügung stellen soll");
    expect(de.klaerungs).toMatch(/keine feste Eröffnungsformel/);
  });
});
