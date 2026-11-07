// PRV-0 · Sperrklinke ueber die Masse der Systemprompte.
//
// Der Golden-Snapshot (MOD-0) sagt, DASS sich ein Prompt geaendert hat. Diese
// Sperrklinke sagt, WAS sich bewegt hat — Zeichen, Betonungen, Wiederholungen,
// Block-Vorlagen — und in welche Richtung. Sie haelt den Stand aus
// tests/fixtures/golden/prompt-masse-<sprache>.json und meldet beides:
//
//   gewachsen  → ein Sprint hat Masse hinzugefuegt; das ist in der PRV-Serie
//                begruendungspflichtig (jede neue Regel verdraengt eine alte —
//                IFScale/ManyIFEval, docs/REVIEW-PRV-prompt-verdichtung.md)
//   gesunken   → ein Sprint hat verdichtet, ohne es festzuschreiben; der Wert
//                wird mit `node scripts/prompt-masse.js --schreibe` uebernommen
//                und im Protokoll als Vorher/Nachher genannt
//
// Das ist das T1b-Muster (Ausnahmelisten duerfen schrumpfen, nicht wachsen,
// und der Test merkt beides) auf Kennzahlen uebertragen.

import { describe, it, expect } from "vitest";
import { baueMasse, liesMasse, messePrompt, SESSION_ARTEN, SPERRKLINKE, LEITPHRASEN } from "../../scripts/prompt-masse.js";

describe("PRV-0 · messePrompt (reine Funktion)", () => {
  const text = [
    "Du bist hier als Begleiter. Beende die Nachricht GENAU so, die Marke allein in der letzten Zeile.",
    "NOTE-BLOCK",
    '{"note":"…"}',
    "END NOTE-BLOCK",
    "Regeln: keine Richterposition (S103, aus dem Lauf gelernt); Ich-Rahmung; Hypothese statt Etikett. [[CHAPTER-1]] SLIDERS-RESULT COMPANION-CONTEXT NIE",
    "x".repeat(601),
  ].join("\n");
  const m = messePrompt(text, "de");

  it("zaehlt Zeichen, Zeilen und lange Zeilen", () => {
    expect(m.zeichen).toBe(text.length);
    expect(m.zeilen).toBe(6);
    expect(m.langeZeilen).toBe(1);
    expect(m.tokenSchaetzung).toBe(Math.round(text.length / 3.4));
  });

  it("Protokoll-Tokens (X-BLOCK, END, [[MARKE]], X-RESULT, X-CONTEXT) sind keine Betonung", () => {
    // Betonungen im Text: GENAU, NIE — sonst nichts.
    expect(m.capsWoerter).toBe(2);
    expect(m.genauWoerter).toBe(1);
    expect(m.verstossWoerter).toBe(0);
  });

  it("Sprint-Referenzen und Block-Vorlagen werden erkannt", () => {
    expect(m.sprintRefs).toBe(1);
    expect(m.blockSpezZeichen).toBe("NOTE-BLOCK\n".length + '{"note":"…"}\n'.length + "END NOTE-BLOCK\n".length);
  });

  it("Leitphrasen werden je Sprache gezaehlt", () => {
    expect(m.wiederholungen).toEqual({ markeLetzteZeile: 1, richterposition: 1, ichRahmung: 1, hypothese: 1, notFrage: 0, erfinden: 0 });
    const en = messePrompt("End with the marker alone on the last line. No judge. Do not invent anything; a hypothesis is fine.", "en");
    expect(en.wiederholungen).toEqual({ markeLetzteZeile: 1, richterposition: 1, ichRahmung: 0, hypothese: 1, notFrage: 0, erfinden: 1 });
  });

  it("DE und EN kennen dieselben Leitphrasen", () => {
    expect(Object.keys(LEITPHRASEN.de)).toEqual(Object.keys(LEITPHRASEN.en));
  });
});

for (const sprache of ["de", "en"]) {
  describe("PRV-0 · Sperrklinke Prompt-Masse · " + sprache, async () => {
    const soll = liesMasse(sprache);
    const ist = await baueMasse(sprache);

    it("Sperrklinke kennt genau die Session-Arten", () => {
      expect(Object.keys(soll.sessions).sort()).toEqual([...SESSION_ARTEN].sort());
    });

    for (const art of SESSION_ARTEN) {
      it(art + " · keine Kennzahl gewachsen, keine still gesunken", () => {
        const abweichungen = [];
        for (const k of SPERRKLINKE) {
          const a = ist.sessions[art][k], b = soll.sessions[art][k];
          if (a > b) abweichungen.push(k + " GEWACHSEN " + b + " → " + a + " (begruenden oder zuruecknehmen)");
          if (a < b) abweichungen.push(k + " gesunken " + b + " → " + a + " (mit --schreibe festschreiben)");
        }
        for (const [name, b] of Object.entries(soll.sessions[art].wiederholungen)) {
          const a = ist.sessions[art].wiederholungen[name];
          if (a > b) abweichungen.push("wiederholungen." + name + " GEWACHSEN " + b + " → " + a);
          if (a < b) abweichungen.push("wiederholungen." + name + " gesunken " + b + " → " + a + " (mit --schreibe festschreiben)");
        }
        expect(abweichungen, "node scripts/prompt-masse.js --schreibe").toEqual([]);
      });
    }
  });
}
