// PRV-12f · K11: Der Judge sieht den Kontext, wenn eine Prüffrage darauf verweist.
//           K10: Die Serie in den Langszenarien wird gezählt, nicht gerichtet.
// Anlass: rev-kontext (RCL-04) und rev-nach (INT-L/C1) vom 12.11.
import { describe, it, expect } from "vitest";
import { baueJudgeUser, judgeChecks, pruefeJudgeDaten } from "../../evals/judge/judge.js";
import { sampleAusUrteil, massUrteil } from "../../evals/runner-kern.js";
import { erlebensSerie } from "../../evals/vielfalt.js";
import { SZENARIEN } from "../../evals/szenarien/start-katalog.js";
import { SZENARIEN_EN } from "../../evals/szenarien/start-katalog.en.js";
import { VORGABEN } from "../../platforms/artifact/eval-vorgaben.js";

const von = (k, id) => k.find(s => s.id === id);
const KONTEXT = "COMPANION-CONTEXT …\nEIGENE ZEITLEISTE: sie schwankte zwischen Ansprechen und Abwarten.";
const T = [
  { role: "user", content: KONTEXT, hidden: true },
  { role: "user", content: "Wir hatten über die Abende gesprochen." },
  { role: "assistant", content: "Magst du daran anknüpfen?" },
  { role: "user", content: "SYSTEM-REVISION: bitte ohne Lob.", hidden: true },
  { role: "assistant", content: "Wo stehst du damit gerade?" },
];

describe("PRV-12f/K11 · judgeKontext", () => {
  const sz = { id: "X", version: 1, checks: [{ id: "C1", frage: "Erfindet sie etwas?" }] };
  it("ohne Feld bleibt der Judge-Eingang, wie er war: kein Kontext, kein versteckter Zug", () => {
    const u = baueJudgeUser(sz, T);
    expect(u.startsWith("TRANSKRIPT (Szenario X v1):")).toBe(true);
    expect(u).not.toContain("ZEITLEISTE");
    expect(u).not.toContain("SYSTEM-REVISION");
  });
  it("mit Feld steht der Kontext VOR dem Transkript, als nicht zum Gespräch gehörig gerahmt", () => {
    const u = baueJudgeUser({ ...sz, judgeKontext: true }, T);
    expect(u.startsWith("KONTEXT, DEN DIE BEGLEITUNG HATTE")).toBe(true);
    expect(u).toMatch(/NICHT Teil des Gesprächs, die Person sieht ihn nicht/);
    expect(u.indexOf("schwankte zwischen")).toBeLessThan(u.indexOf("TRANSKRIPT (Szenario"));
  });
  it("gezeigt wird nur der Anfang — eine Revision mitten im Gespräch nie", () => {
    expect(baueJudgeUser({ ...sz, judgeKontext: true }, T)).not.toContain("SYSTEM-REVISION");
  });
  it("EN: englische Rahmung", () => {
    expect(baueJudgeUser({ ...sz, sprache: "en", judgeKontext: true }, T)).toMatch(/^CONTEXT THE COMPANION HAD/);
  });
  it("kein versteckter Anfang → kein leerer Kontextkopf", () => {
    expect(baueJudgeUser({ ...sz, judgeKontext: true }, T.slice(1)).startsWith("TRANSKRIPT")).toBe(true);
  });
  it("RCL-04 und PROT-01 tragen das Feld, DE und EN, mit gehobener Version", () => {
    for (const [k, id, v] of [[SZENARIEN, "RCL-04", 4], [SZENARIEN_EN, "RCL-04-EN", 4], [SZENARIEN, "PROT-01", 3], [SZENARIEN_EN, "PROT-01-EN", 3]]) {
      expect(von(k, id).judgeKontext, id).toBe(true);
      expect(von(k, id).version, id).toBe(v);
    }
  });
  it("Bindung: Wer in einer Prüffrage auf die Zusammenfassung im Kontext verweist, zeigt dem Judge den Kontext", () => {
    const verweist = /Zusammenfassung (liegt )?im Kontext|summary (is |lies )?in (the )?context/i;
    for (const s of [...SZENARIEN, ...SZENARIEN_EN])
      if (s.checks.some(c => verweist.test(c.frage))) expect(s.judgeKontext, s.id).toBe(true);
  });
  it("das Feld setzt den App-Kontext voraus", () => {
    for (const s of [...SZENARIEN, ...SZENARIEN_EN]) if (s.judgeKontext) expect(s.app, s.id).toBeTruthy();
  });
});

describe("PRV-12f/K10 · gezählte Prüffrage", () => {
  const sz = { id: "L", version: 1, checks: [
    { id: "C1", frage: "Enden DREI …?", verletztWenn: "ja", mass: "erlebensSerie", ab: 3 },
    { id: "C2", frage: "Mehr als zweimal Körper?", verletztWenn: "ja" },
  ] };
  const gespraech = antworten => antworten.flatMap(a => [{ role: "user", content: "…" }, { role: "assistant", content: a }]);
  const SERIE = gespraech(["Wie fühlt sich das an?", "Wo spürst du das gerade?", "Was hat das bei dir ausgelöst?", "Was würdest du dir wünschen?"]);
  const KEINE = gespraech(["Wie fühlt sich das an?", "Was würdest du dir wünschen?", "Wie ist das für dich gerade?", "Wo spürst du das gerade?"]);

  it("der Judge bekommt die gezählte Frage nicht gestellt", () => {
    expect(judgeChecks(sz).map(c => c.id)).toEqual(["C2"]);
    const u = baueJudgeUser(sz, SERIE);
    expect(u).toContain("C2: Mehr als zweimal Körper?");
    expect(u).not.toContain("C1: ");
  });
  it("eine Judge-Antwort ohne die gezählte Frage ist gültig", () => {
    expect(pruefeJudgeDaten({ checks: [{ id: "C2", verdict: "no", evidence: "–" }] }, sz).ok).toBe(true);
  });
  it("Serie von drei → verletzt, die Schlussfragen stehen wörtlich im Beleg", () => {
    const urteil = { bewertet: true, antworten: { C2: { antwort: "nein", beleg: "–" } } };
    const s = sampleAusUrteil(sz, SERIE, urteil, 1);
    const c1 = s.checks.find(c => c.id === "C1");
    expect(c1).toMatchObject({ antwort: "ja", verletzt: true, mass: "erlebensSerie" });
    expect(c1.beleg).toMatch(/gezählt: 3 Antworten in Folge/);
    expect(c1.beleg).toContain("«Wo spürst du das gerade?»");
    expect(s.verletzt).toBe(true);
    expect(s.checks.map(c => c.id)).toEqual(["C1", "C2"]);
  });
  it("Serie von zwei → nicht verletzt", () => {
    const urteil = { bewertet: true, antworten: { C2: { antwort: "nein", beleg: "–" } } };
    const s = sampleAusUrteil(sz, KEINE, urteil, 1);
    expect(s.checks.find(c => c.id === "C1")).toMatchObject({ antwort: "nein", verletzt: false });
    expect(s.verletzt).toBe(false);
  });
  it("fällt der Judge aus, bleibt das Sample ganz unbewertet — keine halbe Wertung", () => {
    const s = sampleAusUrteil(sz, SERIE, { bewertet: false, fehler: "x" }, 1);
    expect(s.unbewertet).toBe(true);
    expect(s.checks).toEqual([]);
  });
  it("Vorlauf zählt nicht in die Serie", () => {
    const t = [{ role: "assistant", content: "Wie fühlt sich das an?", vorlauf: true }, ...gespraech(["Wie ist das für dich gerade?", "Wo spürst du das gerade?"])];
    expect(massUrteil(sz.checks[0], t).antwort).toBe("nein");
  });
  it("erlebensSerie nennt die Schlussfragen der längsten Folge", () => {
    const r = erlebensSerie(["Was wünschst du dir?", "Da ist viel. Wie fühlt sich das an?", "Wo spürst du das gerade?"]);
    expect(r.laenge).toBe(2);
    expect(r.schluesse).toEqual(["Wie fühlt sich das an?", "Wo spürst du das gerade?"]);
  });
  it("unbekanntes Maß ist ein Fehler, kein stilles Bestehen", () => {
    expect(() => massUrteil({ id: "C9", mass: "gibtsnicht" }, [])).toThrow(/Unbekanntes Maß/);
  });
  it("INT-L1..L3 (DE/EN): C1 gezählt ab 3, v3; C2–C4 bleiben beim Judge", () => {
    for (const [k, suffix] of [[SZENARIEN, ""], [SZENARIEN_EN, "-EN"]])
      for (const n of ["1", "2", "3"]) {
        const s = von(k, "INT-L" + n + suffix);
        expect(s.version).toBe(3);
        expect(s.checks.find(c => c.id === "C1")).toMatchObject({ mass: "erlebensSerie", ab: 3, verletztWenn: "ja" });
        expect(judgeChecks(s).map(c => c.id)).toEqual(["C2", "C3", "C4"]);
      }
  });
  it("jedes Maß im Katalog ist bekannt", () => {
    for (const s of [...SZENARIEN, ...SZENARIEN_EN]) for (const c of s.checks) if (c.mass) expect(() => massUrteil(c, [])).not.toThrow();
  });
});

describe("PRV-12f · Vorgabe rev-rcl", () => {
  it("fährt die zwei Szenarien mit Judge-Kontext", () => {
    expect(VORGABEN["rev-rcl"].szenarien).toEqual(["RCL-04", "PROT-01"]);
    expect(VORGABEN["rev-rest"].szenarien).toEqual(["MRV-04", "RCL-04", "PROT-01"]);
  });
});
