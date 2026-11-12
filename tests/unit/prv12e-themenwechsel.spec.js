// PRV-12e · MRV-04/C4 nach Entscheidung K12 (12.11.): Dem Themenwechsel folgen
// heißt nicht schweigen. Erlaubnis und Aufnehmen der eigenen Markierung sind
// in Ordnung; verletzt sind das Urteil von außen und die verfrühte Brücke.
import { describe, it, expect } from "vitest";
import { SZENARIEN } from "../../evals/szenarien/start-katalog.js";
import { SZENARIEN_EN } from "../../evals/szenarien/start-katalog.en.js";
import { VORGABEN } from "../../platforms/artifact/eval-vorgaben.js";

const von = (k, id) => k.find(s => s.id === id);
const c4 = (k, id) => von(k, id).checks.find(x => x.id === "C4");

describe("PRV-12e · MRV-04/C4", () => {
  for (const [k, id, v] of [[SZENARIEN, "MRV-04", 6], [SZENARIEN_EN, "MRV-04-EN", 5]]) {
    const f = c4(k, id).frage;
    it(id + ": verlangt nicht mehr »ohne Kommentar«", () => {
      expect(f).not.toMatch(/ohne Kommentar|without comment/);
    });
    it(id + ": Erlaubnis ist angebracht", () => {
      expect(f).toMatch(/Eine Erlaubnis .* ist angebracht und erfüllt die Frage|a permission .* is appropriate and meets the question/);
    });
    it(id + ": Aufnehmen der eigenen Markierung und Ich-Aussage erfüllen die Frage", () => {
      expect(f).toMatch(/was Bernd selbst markiert hat|what Bernd himself marked/);
      expect(f).toMatch(/Ich-Aussage|I-statement/);
    });
    it(id + ": Urteil ohne Ich-Perspektive ist verletzt, mit Beispiel", () => {
      expect(f).toMatch(/ohne Ich-Perspektive|without an I-perspective/);
      expect(f).toMatch(/Du springst da gerade|You are jumping/);
    });
    it(id + ": die Brücke zur Beziehung ist nur als ERSTE Reaktion verletzt — später nicht", () => {
      expect(f).toMatch(/als ERSTE Reaktion|as the FIRST reaction/);
      expect(f).toMatch(/später, nachdem er ausgeführt hat|later, after he has elaborated/);
    });
    it(id + ": Version " + v + ", Polarität unverändert", () => {
      expect(von(k, id).version).toBe(v);
      expect(c4(k, id).verletztWenn).toBe("nein");
    });
  }
  it("die Beschreibung sagt nicht mehr »unkommentiert«", () => {
    expect(von(SZENARIEN, "MRV-04").beschreibung).not.toMatch(/unkommentiert/);
  });
  it("Vorgabe rev-mrv4 fährt MRV-04 in beiden Armen", () => {
    expect(VORGABEN["rev-mrv4"].szenarien).toEqual(["MRV-04"]);
    expect(VORGABEN["rev-mrv4"].arme.map(a => a.label)).toEqual(["haiku-n5", "sonnet-n5"]);
  });
});
