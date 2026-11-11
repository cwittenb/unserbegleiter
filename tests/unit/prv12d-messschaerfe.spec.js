// PRV-12d · Messschärfe vor PRV-11 — Prüffragen SYC-05/C2 und INT-L/C1.
// Anlass: rev-pruef und rev-int vom 11.11. (claude/eval-auswertung-review-2026-11-11.md).
import { describe, it, expect } from "vitest";
import { SZENARIEN } from "../../evals/szenarien/start-katalog.js";
import { SZENARIEN_EN } from "../../evals/szenarien/start-katalog.en.js";
import { VORGABEN } from "../../platforms/artifact/eval-vorgaben.js";

const von = (k, id) => k.find(s => s.id === id);
const frage = (k, id, c) => von(k, id).checks.find(x => x.id === c).frage;

describe("PRV-12d · SYC-05/C2 widerspricht C1 nicht mehr", () => {
  for (const [k, id] of [[SZENARIEN, "SYC-05"], [SZENARIEN_EN, "SYC-05-EN"]]) {
    it(id + ": Resonanz in Ich-Form ist ausdrücklich keine Deutung", () => {
      const f = frage(k, id, "C2");
      expect(f).toMatch(/KEINE Deutung ist Resonanz in Ich-Form|Resonance in I-form is NOT an interpretation/);
      expect(f).toMatch(/braucht keine Passungsfrage|needs no fit check/);
      expect(f).not.toMatch(/Deutung oder Resonanz anbietet|interpretation or resonance of its own/);
    });
    it(id + ": was eine Deutung ist, steht mit Beispiel da", () => {
      expect(frage(k, id, "C2")).toMatch(/Eine DEUTUNG ist eine Aussage darüber|An INTERPRETATION is a statement about/);
    });
    it(id + ": die Form, die C1 empfiehlt, ist in C2 als zulässig genannt", () => {
      expect(frage(k, id, "C1")).toMatch(/Mich berührt|I am moved|moves me|touches me/i);
      expect(frage(k, id, "C2")).toMatch(/Mich berührt|I am moved/);
    });
    it(id + ": Version 6, Polarität unverändert", () => {
      expect(von(k, id).version).toBe(6);
      expect(von(k, id).checks.find(x => x.id === "C2").verletztWenn).toBe("nein");
    });
  }
});

describe("PRV-12d · INT-L/C1 nennt die Abgrenzung der Erlebensfrage", () => {
  for (const [k, suffix] of [[SZENARIEN, ""], [SZENARIEN_EN, "-EN"]])
    for (const n of ["1", "2", "3"]) {
      const id = "INT-L" + n + suffix;
      it(id + ": v2, mit Gegenbeispielen und Belegpflicht", () => {
        const f = frage(k, id, "C1");
        expect(von(k, id).version).toBe(2);
        expect(f).toMatch(/KEINE Erlebensfragen sind|NOT experience questions are/);
        expect(f).toMatch(/Wunsch|wish/); expect(f).toMatch(/Bedeutung|meaning/);
        expect(f).toMatch(/Befürchtung|fear/); expect(f).toMatch(/Gedanken|thoughts/);
        expect(f).toMatch(/LETZTE Frage|LAST question/);
        expect(von(k, id).checks.find(x => x.id === "C1").verletztWenn).toBe("ja");
      });
    }
});

describe("PRV-12d · Vorgabe rev-nach", () => {
  it("fährt genau die vier Szenarien mit neuer Prüffrage, beide Arme", () => {
    const v = VORGABEN["rev-nach"];
    expect(v.szenarien).toEqual(["SYC-05", "INT-L1", "INT-L2", "INT-L3"]);
    expect(v.arme.map(a => a.label)).toEqual(["haiku-n5", "sonnet-n5"]);
    for (const id of v.szenarien) expect(von(SZENARIEN, id), id).toBeTruthy();
  });
});
