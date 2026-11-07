// S144a · Judge-Nachbewertung — reine Logik plus Trockenlauf des Skripts.
// Negativfälle zuerst: Was NICHT in den Abgleich darf, ist die eigentliche
// Absicht (sonst misst er Prompt, Szenario-Version oder Format statt Judge).

import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sammleFaelle, vergleiche, fasseZusammen, einseitigeChecks } from "../../evals/nachbewertung.js";

const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));

const SZ = { id: "T-01", version: 2, checks: [{ id: "C1" }, { id: "C2", verletztWenn: "nein", roteLinie: true }] };
const sample = (nr, c1, c2, extra = {}) => ({
  nr, transkript: [{ role: "user", content: "x" }],
  checks: [{ id: "C1", antwort: c1, beleg: "b1" }, { id: "C2", antwort: c2, beleg: "b2" }], ...extra,
});
const bericht = (szenarien, stand = {}) => ({
  stand: { judgeModell: "REF", judgePromptVersion: "jX", pipelineModell: "P", coreHash: "h", ...stand }, szenarien,
});

describe("S144a · sammleFaelle", () => {
  it("nimmt bewertete Samples passender Version auf", () => {
    const r = sammleFaelle([{ datei: "a.json", bericht: bericht([{ id: "T-01", version: 2, samples: [sample(1, "nein", "ja")] }]) }], [SZ]);
    expect(r.faelle).toHaveLength(1);
    expect(r.faelle[0].alt.C2).toEqual({ antwort: "ja", beleg: "b2" });
    expect(r.faelle[0].pipelineModell).toBe("P");
  });

  it("überspringt fremden Judge, fremden Prompt, unbekanntes Szenario, andere Version, Altformat, unbewertet", () => {
    const B = [
      { datei: "judge.json", bericht: bericht([{ id: "T-01", version: 2, samples: [sample(1, "ja", "ja")] }], { judgeModell: "ANDERS" }) },
      { datei: "prompt.json", bericht: bericht([{ id: "T-01", version: 2, samples: [sample(1, "ja", "ja")] }], { judgePromptVersion: "jALT" }) },
      { datei: "rest.json", bericht: bericht([
        { id: "WEG-01", version: 1, samples: [sample(1, "ja", "ja")] },
        { id: "T-01", version: 1, samples: [sample(1, "ja", "ja")] },
        { id: "T-01", version: 2, samples: [{ nr: 2, transkript: [] }, sample(3, "ja", "ja", { unbewertet: true })] },
      ]) },
    ];
    const r = sammleFaelle(B, [SZ], { referenzModell: "REF", promptVersion: "jX" });
    expect(r.faelle).toEqual([]);
    expect(r.uebersprungen.map(u => u.grund).sort()).toEqual(["format", "judge", "prompt", "unbekannt", "unbewertet", "version"]);
  });

  it("ohne Filter keine Judge-/Prompt-Sperre (Default: alle)", () => {
    const r = sammleFaelle([{ datei: "a", bericht: bericht([{ id: "T-01", version: 2, samples: [sample(1, "ja", "ja")] }], { judgeModell: "X", judgePromptVersion: "jY" }) }], [SZ]);
    expect(r.faelle).toHaveLength(1);
    expect(r.promptVersionen).toEqual(["jY"]);
  });
});

describe("S144a · vergleiche", () => {
  const fall = sammleFaelle([{ datei: "a", bericht: bericht([{ id: "T-01", version: 2, samples: [sample(1, "nein", "ja")] }]) }], [SZ]).faelle[0];

  it("eine Zeile je Check, Verletzung nach verletztWenn des Checks", () => {
    const z = vergleiche(fall, { bewertet: true, antworten: { C1: { antwort: "ja", beleg: "n1" }, C2: { antwort: "nein", beleg: "n2" } } });
    expect(z).toHaveLength(2);
    expect(z[0]).toMatchObject({ check: "C1", alt: "nein", neu: "ja", verletztAlt: false, verletztNeu: true, abweichung: true });
    expect(z[1]).toMatchObject({ check: "C2", alt: "ja", neu: "nein", verletztAlt: false, verletztNeu: true, roteLinie: true });
  });

  it("kein Urteil → eine unbewertete Zeile, keine Abweichung", () => {
    const z = vergleiche(fall, { bewertet: false, fehler: "form" });
    expect(z).toEqual([expect.objectContaining({ check: "*", unbewertet: true, fehler: "form" })]);
    expect(z[0].abweichung).toBeUndefined();
  });
});

describe("S144a · fasseZusammen + einseitigeChecks", () => {
  const z = (check, verletztAlt, verletztNeu) => ({
    szenario: "T-01", check, verletztAlt, verletztNeu, abweichung: verletztAlt !== verletztNeu,
  });

  it("zählt gleich/abweichend und die Richtung; unbewertet getrennt", () => {
    const s = fasseZusammen([z("C1", false, false), z("C1", false, true), z("C1", true, false), { unbewertet: true }]);
    expect(s).toMatchObject({ gesamt: 3, gleich: 1, abweichend: 2, strenger: 1, milder: 1, unbewertet: 1 });
    expect(s.quote).toBeCloseTo(1 / 3);
    expect(s.jeCheck["T-01/C1"]).toEqual({ gesamt: 3, gleich: 1, abweichend: 2, strenger: 1, milder: 1 });
  });

  it("beidseitige Streuung ist KEIN Stoppsignal", () => {
    const s = fasseZusammen([z("C1", false, true), z("C1", true, false), z("C1", false, true), z("C1", true, false)]);
    expect(einseitigeChecks(s)).toEqual([]);
  });

  it("≥3 Abweichungen in eine Richtung sind das Stoppsignal", () => {
    const s = fasseZusammen([z("C2", true, false), z("C2", true, false), z("C2", true, false), z("C2", true, true)]);
    expect(einseitigeChecks(s)).toEqual([{ check: "T-01/C2", richtung: "milder", anzahl: 3, von: 4 }]);
  });

  it("unter der Schwelle schweigt es", () => {
    const s = fasseZusammen([z("C1", false, true), z("C1", false, true)]);
    expect(einseitigeChecks(s)).toEqual([]);
  });

  it("leere Eingabe: Quote null statt Division durch null", () => {
    expect(fasseZusammen([]).quote).toBeNull();
  });
});

describe("S144a · Konfiguration und Skript", () => {
  const konfig = JSON.parse(readFileSync(path.join(ROOT, "evals/judge-kalibrierung.json"), "utf8"));

  it("Referenz und Kandidat sind verschiedene Modelle, beide mit Preis", () => {
    const preise = JSON.parse(readFileSync(path.join(ROOT, "evals/preise.json"), "utf8")).modelle;
    expect(konfig.referenz.modell).not.toBe(konfig.kandidat.modell);
    expect(preise[konfig.referenz.modell]).toBeTruthy();
    expect(preise[konfig.kandidat.modell]).toBeTruthy();
  });

  it("Trockenlauf braucht keinen Schlüssel und ruft nichts auf", () => {
    const r = spawnSync("node", ["scripts/judge-nachbewertung.js", "--trocken", "--max", "3"], {
      cwd: ROOT, encoding: "utf8", env: { PATH: process.env.PATH },
    });
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toMatch(/Trockenlauf — es wurde nichts aufgerufen/);
    expect(r.stdout).toMatch(/3 Fälle/);
  });

  it("S145 · --referenz-modell überschreibt die Referenz (Trockenlauf meldet sie)", () => {
    const r = spawnSync("node", ["scripts/judge-nachbewertung.js", "--trocken", "--referenz-modell", "test-referenz",
      "--judge-modell", "test-referenz", "--erlaube-gleiches-modell"], { cwd: ROOT, encoding: "utf8", env: { PATH: process.env.PATH } });
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toMatch(/Referenz test-referenz → Kandidat test-referenz/);
  });

  it("Ergebnisse gehen NICHT nach evals/ergebnisse/ (modellvergleich greift dort die neueste Datei)", () => {
    const quelle = readFileSync(path.join(ROOT, "scripts/judge-nachbewertung.js"), "utf8");
    expect(quelle).toMatch(/"evals\/nachbewertungen"/);
  });
});
