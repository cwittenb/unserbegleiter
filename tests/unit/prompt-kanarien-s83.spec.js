// Prompt-Kanarien S83 — pinnen die Härtungen aus dem Eval-Batch-Lauf
// 2026-07-19 (sonnet-5-Pipeline, opus-Judge j5): AUF-01 (rote Linie,
// unterstelltes Ja beim Start-Okay), NOT-01 (rote Linie, Furcht-VOR-
// Sondierung vor beiden), MOM-01 (Richterfeststellung "wichtiger Moment",
// fehlende Erlebensfrage), QZ-01 (neue Themenöffnung nach End-Signal),
// SPR-05 (Zuschreibung nach CHOICE-Menü).

import { describe, it, expect } from "vitest";
import * as DE from "../../core/prompts/prompts.de.js";
import * as EN from "../../core/prompts/prompts.en.js";

const faelle = [
  ["de", DE, {
    zgName: "ZUSTIMMUNGS-GRAMMATIK",
    zgVerbot: "ein gemeinsames Ja setzt sich aus zwei einzelnen zusammen",
    zgAusnahme: "nicht für kleine Weiter-Fragen",
    zgEinzeln: "je Person EINZELN",
    startOkay: "ist kein Start-Okay",
    auftaktOkay: "ZUSTIMMUNGS-GRAMMATIK: einzeln, nichts unterstellen",
    nbName: "NOTBREMSE (sessionweit, jede Phase, hart)",
    nbSondierung: "Die Weiche entscheidet auf dem, was gesagt wurde",
    nbBeispiel: "handelt in DREI Schritten statt zu fragen",
    nbSchritte: "die Session würdevoll weiterführen",
    momBeilaeufig: "das ist schon ein wichtiger Moment zum Einstieg",
    momPflicht: "immer genau eine Erlebensfrage",
    momErsatz: "sie ist die Frage dieser Nachricht",
    endPunkt: "lass uns hier einen Punkt machen",
    endRegel: "END-SIGNALE ERNST NEHMEN",
    endVerbot: "Ein End-Signal führt in den Abschluss",
    endKlaerung: "genau eine Klärungsfrage",
    choice: "ein CHOICE-Menü oder jedes andere an das Paar gerichtete Angebot zählt dabei als Frage an beide",
  }],
  ["en", EN, {
    zgName: "CONSENT GRAMMAR",
    zgVerbot: "a shared yes is made of two individual ones",
    zgAusnahme: "not to small keep-going questions",
    zgEinzeln: "per person INDIVIDUALLY",
    startOkay: "is not a start okay",
    auftaktOkay: "CONSENT GRAMMAR: individually, presume nothing",
    nbName: "EMERGENCY BRAKE (session-wide, every phase, hard)",
    nbSondierung: "The switch decides on what was said",
    nbBeispiel: "acts in three steps instead of asking",
    nbSchritte: "continue the session with dignity",
    momBeilaeufig: "that is quite an important moment to start with",
    momPflicht: "always ask exactly one experience question",
    momErsatz: "it is the question of this message",
    endPunkt: "let's leave it here",
    endRegel: "Take END SIGNALS SERIOUSLY",
    endVerbot: "An end signal leads into the closing",
    endKlaerung: "exactly one clarifying question",
    choice: "a choice menu or any other offer addressed to the couple counts as a question to both",
  }],
];

describe.each(faelle)("Prompt-Kanarien S83 · %s", (_sprache, P, T) => {
  const auf = () => P.aufloesungsPrompt("Anna", "Bernd");
  const mom = () => P.momentPrompt("Anna", "Bernd");

  it("AUF-01: Zustimmungs-Grammatik als Baustein — Verbots-Beispiel, Einzeln-Regel, Weiter-Fragen-Ausnahme (K2)", () => {
    const b = P.bausteine.zustimmungsGrammatik;
    expect(b).toContain(T.zgName);
    expect(b).toContain(T.zgVerbot);
    expect(b).toContain(T.zgAusnahme);
    expect(b).toContain(T.zgEinzeln);
  });

  it("AUF-01: Grammatik in der gemeinsamen Auflösung verdrahtet — Phase 0, Auftakt (A) und Phase 4 verweisen", () => {
    const p = auf();
    expect(p).toContain(T.zgName);
    expect(p).toContain(T.startOkay);
    expect(p).toContain(T.auftaktOkay);
  });

  it("AUF-01: Grammatik auch an der Auftrags-Pflege der Moment-Session", () => {
    expect(mom()).toContain(T.zgName);
  });

  it("NOT-01: Notbremse sessionweit — Sondierungs-Verbot mit dem realen Fehlerbeispiel und würdevoller Weiterführung", () => {
    const b = P.bausteine.notbremseGemeinsam;
    expect(b).toContain(T.nbName);
    expect(b).toContain(T.nbSondierung);
    expect(b).toContain(T.nbBeispiel);
    expect(b).toContain(T.nbSchritte);
  });

  it("NOT-01: Notbremse in gemeinsamer Auflösung UND Moment-Session assembliert", () => {
    expect(auf()).toContain(T.nbName);
    expect(mom()).toContain(T.nbName);
  });

  it("MOM-01: die beiläufige Feststellungs-Form steht als Verbot im Momente-Baustein; genau eine Erlebensfrage ist Pflicht", () => {
    const b = P.bausteine.bedeutsameMomente;
    expect(b).toContain(T.momBeilaeufig);
    expect(b).toContain(T.momPflicht);
    expect(b).toContain(T.momErsatz);
  });

  it("QZ-01: End-Signale — Punkt-machen-Form erkannt, keine neue Themenrunde, höchstens eine Klärungsfrage", () => {
    const p = mom();
    expect(p).toContain(T.endPunkt);
    expect(p).toContain(T.endRegel);
    expect(p).toContain(T.endVerbot);
    expect(p).toContain(T.endKlaerung);
  });

  it("SPR-05: CHOICE-Menü zählt als Frage an beide (Sprecher-Konvention)", () => {
    expect(P.bausteine.sprecherKonvention("Anna")).toContain(T.choice);
  });
});

describe("Prompt-Kanarien S83 · Parität", () => {
  it("beide Sprachdateien exportieren dieselben neuen Bausteine", () => {
    for (const key of ["zustimmungsGrammatik", "notbremseGemeinsam"]) {
      expect(typeof DE.bausteine[key]).toBe("string");
      expect(typeof EN.bausteine[key]).toBe("string");
    }
  });
});
