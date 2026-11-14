// PRV-11.5 · Lage-Karte »Skepsis« über die Regie.
// Anlass: INT-F3 v2 (prv11-2, 14.11.) — in 10 von 10 zweiten Antworten ein Satz
// Quittung und die nächste Frage, obwohl das Lagebild »würdigen statt
// weiterfragen« sagt. Der Hinweis kommt jetzt gezielt in dem Zug, in dem er
// gebraucht wird; der Grundprompt wächst nicht.
import { describe, it, expect } from "vitest";
import { SIGNALE as SD, SKEPSIS_MUSTER } from "../../core/korpus/de/signale.js";
import { SIGNALE as SE } from "../../core/korpus/en/signale.js";
import { waechter as WD } from "../../core/korpus/de/policies.js";
import { waechter as WE } from "../../core/korpus/en/policies.js";
import { baueSessionDef } from "../../core/komposition.js";
import { POLICY_KATALOG } from "../../core/policies/katalog.js";
import { Engine } from "../../core/engine/engine.js";
import { SZENARIEN } from "../../evals/szenarien/start-katalog.js";
import { SZENARIEN_EN } from "../../evals/szenarien/start-katalog.en.js";
import { spieleSample } from "../../evals/runner-kern.js";
import { VORGABEN } from "../../platforms/artifact/eval-vorgaben.js";

const u = t => ({ role: "user", content: t });
const von = (k, id) => k.find(s => s.id === id);

describe("PRV-11.5 · Signal", () => {
  it("DE und EN sind dasselbe Muster", () => {
    expect(SD.skepsis).toBe(SKEPSIS_MUSTER);
    expect(SE.skepsis).toBe(SKEPSIS_MUSTER);
  });
  const treffer = [
    "Ehrlich gesagt weiß ich nicht, was das hier bringen soll. Bernd wollte, dass ich das mache.",
    "Im Moment mach ich's wirklich nur für ihn.",
    "Ich mache das nur für sie.",
    "Das bringt doch nichts.",
    "Ich bin eigentlich nur wegen ihm hier.",
    "Sie hat mich dazu überredet.",
    "Das war nicht meine Idee.",
    "Ich wüsste nicht, wozu das gut sein soll.",
    "Honestly, I don't know what this is supposed to achieve. Bernd wanted me to do it.",
    "Right now I'm really only doing it for him.",
    "I don't see the point.",
  ];
  const kein = [
    "Ich koche nur für ihn.",
    "Er wollte, dass ich früher nach Hause komme.",
    "Das Gespräch gestern hat nichts gebracht.",
    "Ich weiß nicht, was ich sagen soll.",
    "Sie wollte, dass ich den Müll rausbringe.",
    "Was soll ich nur machen?",
    "Ich habe das nur für ihn gekauft.",
    "Er wollte den Termin verschieben.",
    "He wanted me to call his mother.",
    "I only bought it for her.",
  ];
  for (const t of treffer) it("trifft: " + t, () => expect(SKEPSIS_MUSTER.test(t)).toBe(true));
  for (const t of kein) it("trifft nicht: " + t, () => expect(SKEPSIS_MUSTER.test(t)).toBe(false));

  it("Fehltreffer-Schau: Im ganzen Eval-Katalog trifft das Muster nur INT-F3", () => {
    const getroffen = new Set();
    for (const s of [...SZENARIEN, ...SZENARIEN_EN])
      for (const t of [...(s.eingaben || []), ...(s.verlauf || []).filter(m => m.role === "user").map(m => m.content)])
        if (SKEPSIS_MUSTER.test(String(t))) getroffen.add(s.id);
    expect([...getroffen].sort()).toEqual(["INT-F3", "INT-F3-EN"]);
  });
});

describe("PRV-11.5 · Kartentext", () => {
  it("als Möglichkeit formuliert, mit den vier Vorgaben — DE und EN", () => {
    expect(WD.skepsis.text).toMatch(/^\[APP-KARTE für diesen Zug: Falls die Person gerade/);
    expect(WE.skepsis.text).toMatch(/^\[APP CARD for this turn: If the person is/);
    for (const [t, re] of [
      [WD.skepsis.text, [/gültigen Grund/, /zwei, drei Sätzen in Ich-Form/, /ohne zu werben und ohne zu deuten/, /frag in diesem Zug nicht, ob es nicht doch etwas Eigenes gibt/, /lass stattdessen eine Tür offen/, /Keine Gefühls- oder Körperfrage/]],
      [WE.skepsis.text, [/valid reason/, /two or three sentences in I-form/, /without courting and without interpreting/, /do not ask in this turn whether there is not something of their own/, /leave a door open instead/, /No feeling or body question/]],
    ]) for (const r of re) expect(t).toMatch(r);
  });
  it("kein Beispielsatz zum Nachsprechen, keine Großbuchstaben-Betonung", () => {
    expect(WD.skepsis.text).not.toMatch(/[„“"«»]/);
    expect((WD.skepsis.text.match(/\b[A-ZÄÖÜ]{4,}\b/g) || []).filter(w => w !== "KARTE")).toEqual([]);
  });
  it("keine Spur — das Fenster trägt den zweiten Zug", () => {
    expect(WD.skepsis.spur).toBeUndefined();
  });
});

describe("PRV-11.5 · Kette und Engine", () => {
  it("nur im Reflexionsgespräch, vor den Theorie-Karten", () => {
    expect(POLICY_KATALOG.solo.schaerfungen).toEqual(["skepsis", "anteile", "entwicklung"]);
    for (const art of ["moment", "gemeinsam", "einzel"]) expect(POLICY_KATALOG[art].schaerfungen, art).not.toContain("skepsis");
  });
  it("die Karte kommt im ersten und im zweiten Zug als Regie; Systemtext und Verlauf bleiben sauber", async () => {
    const def = baueSessionDef("solo");
    const gesehen = [];
    const llm = async (system, msgs) => { gesehen.push({ system, regie: msgs.at(-1).regie || null }); return { text: "Ich höre dich.", stop: "end_turn" }; };
    const e = new Engine({ def, chat: { messages: [], status: "running" }, llm, ctx: { name: "Anna", partner: "Bernd" } });
    await e.sendUser("Ehrlich gesagt weiß ich nicht, was das hier bringen soll. Bernd wollte, dass ich das mache.");
    await e.sendUser("Im Moment mach ich's wirklich nur für ihn.");
    expect(gesehen[0].regie).toBe(WD.skepsis.text);
    expect(gesehen[1].regie).toBe(WD.skepsis.text);
    expect([].concat(gesehen[0].system).join("")).not.toContain("gültigen Grund, hier zu sein");
    expect(JSON.stringify(e.chat.messages)).not.toContain("APP-KARTE");
  });
  it("ohne Anlass: keine Karte", () => {
    expect(baueSessionDef("solo").schaerfe([u("Gestern haben wir uns gestritten.")], {})).toBeNull();
  });
  it("das Fenster endet: vier Nachrichten später ist die Karte weg", () => {
    const s = baueSessionDef("solo").schaerfe;
    const ms = [u("Bernd wollte, dass ich das mache."), { role: "assistant", content: "…" }, u("Na gut."), { role: "assistant", content: "…" }, u("Gestern war es schwierig."), { role: "assistant", content: "…" }, u("Er kam spät.")];
    expect(s(ms, {})).toBeNull();
  });
  it("nie zwei Karten im selben Zug: Skepsis vor Anteile", () => {
    const s = baueSessionDef("solo").schaerfe;
    expect(s([u("Ein Teil von mir macht das nur für ihn – ich mach's wirklich nur für ihn.")], {})).toBe(WD.skepsis.text);
  });
  it("im gemeinsamen Raum löst derselbe Satz keine Skepsis-Karte aus", () => {
    const z = baueSessionDef("moment").schaerfe([u("Anna: Ich mache das hier wirklich nur für ihn.")], {});
    expect(z === null || !/gültigen Grund, hier zu sein/.test(z)).toBe(true);
  });
  it("im Eval: INT-F3 bekommt die Karte in beiden Zügen", async () => {
    const c = [];
    await spieleSample(async (system, msgs) => { c.push(msgs.at(-1).regie || null); return { text: "Ich höre dich." }; }, von(SZENARIEN, "INT-F3"), { waechter: true });
    expect(c).toEqual([WD.skepsis.text, WD.skepsis.text]);
  });
});

describe("PRV-11.5 · INT-G2 v2 und Vorgabe", () => {
  for (const [k, id] of [[SZENARIEN, "INT-G2"], [SZENARIEN_EN, "INT-G2-EN"]]) {
    it(id + ": zweiter Zug; C4 prüft einen Grundsatz mit Fehlbildern, nicht einen einzigen richtigen Zug (PRV-11.5b)", () => {
      const s = von(k, id);
      expect(s.version).toBe(3);
      expect(s.eingaben).toHaveLength(2);
      expect(s.eingaben[1]).toMatch(/^Anna: (Ja, gern|Yes, please)/);
      expect(s.checks.map(c => c.id)).toEqual(["C1", "C2", "C3", "C4"]);
      expect(s.checks[0].frage).toMatch(/ERSTEN Antwort|FIRST reply/);
      expect(s.checks[1].frage).toMatch(/KEIN Gewicht für Annas Sicht|NOT weight for Anna's view/);
      const c4 = s.checks[3].frage;
      expect(c4).toMatch(/Erleben geäußert wird statt Wahrheit über den anderen|experience to be voiced instead of truth about the other/);
      expect(c4).toMatch(/mehrere gute Wege|several good ways/);
      expect(c4).toMatch(/Bernd nach seiner Sicht oder seinem Erleben|asking Bernd about his view or his experience/);   // der Einwand: auch dieser Weg ist gut
      expect(c4).toMatch(/NICHT erfüllt ist die Frage nur bei einem dieser Fehlbilder|NOT met only in one of these failure patterns/);
      expect(c4).not.toMatch(/wendet sich an Bernd, bevor|turns to Bernd before/);
      expect(s.checks[3].verletztWenn).toBe("nein");
    });
  }
  it("Vorgabe prv11-5", () => {
    expect(VORGABEN["prv11-5"].szenarien).toEqual(["INT-F3", "INT-G2", "INT-G1", "MRV-01"]);
  });
});
