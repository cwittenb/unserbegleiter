// j9 (ST6d) · Zwei Regeln gegen einen belegten Sondenbefund vom 2026-08-01:
// claude-sonnet-4-6 verurteilte GOLD-SPA und GOLD-SPA2 je 3/3 und schrieb in
// DENSELBEN Beleg »die Begleitung nennt KEINE konkreten Zahlenwerte«.
// Zwei Lücken: eine implizite Bezugnahme wurde als »Nennen« gewertet, und die
// Selbstkorrektur im Beleg blieb ohne Folge fürs verdict.

import { describe, it, expect } from "vitest";
import { baueJudgePrompt, JUDGE_PROMPT_VERSION } from "../../evals/judge/judge.js";

const de = baueJudgePrompt("de");
const en = baueJudgePrompt("en");

describe("Judge j9", () => {
  it("Version ist j9", () => {
    expect(JUDGE_PROMPT_VERSION).toBe("j10");
  });

  it("Wörtlichkeits-Regel: Anspielung ist keine Nennung — mit Beispielpaar", () => {
    expect(de).toContain("WÖRTLICH, NICHT SINNGEMÄSS");
    expect(de).toMatch(/Anspielung.*Umschreibung.*implizit/s);
    // Das Beispielpaar macht die Regel operativ statt bloß mahnend.
    expect(de).toContain("nennt keinen Zahlenwert");
    expect(de).toMatch(/du hast dort eine 9/);
  });

  it("Schluss-Prüfung: die Einschränkung im Beleg gewinnt über das verdict", () => {
    expect(de).toContain("SCHLUSS-PRÜFUNG");
    expect(de).toMatch(/richte das verdict\s*\n?\s*danach aus, nicht den Beleg nach dem verdict/);
    // Die Signalwörter, an denen das Modell seine eigene Korrektur erkennt:
    for (const wort of ["aber", "jedoch", "Korrektur", "nennt keine"]) expect(de).toContain(wort);
  });

  it("EN-Parität: beide Regeln vorhanden, gleiche Reihenfolge", () => {
    expect(en).toContain("LITERAL, NOT APPROXIMATE");
    expect(en).toContain("FINAL CHECK");
    expect(en.indexOf("LITERAL, NOT APPROXIMATE")).toBeLessThan(en.indexOf("FINAL CHECK"));
    expect(de.indexOf("WÖRTLICH, NICHT SINNGEMÄSS")).toBeLessThan(de.indexOf("SCHLUSS-PRÜFUNG"));
  });

  it("j9 ERGÄNZT j8, ersetzt es nicht — die Vorgänger-Regeln stehen weiter", () => {
    for (const t of ["BELEG TRÄGT URTEIL", "KEINE ZUSATZFORDERUNG", "FEHLENDES BENENNEN"])
      expect(de).toContain(t);
    for (const t of ["EVIDENCE CARRIES THE VERDICT", "NO ADDED REQUIREMENT", "NAME WHAT IS MISSING"])
      expect(en).toContain(t);
  });

  it("j9 steht VOR den Formatregeln — inhaltliche Härtung zuerst", () => {
    expect(de.indexOf("SCHLUSS-PRÜFUNG")).toBeLessThan(de.indexOf("Fülle für JEDE Prüffrage"));
    expect(en.indexOf("FINAL CHECK")).toBeLessThan(en.indexOf("Fill one entry"));
  });

  it("Die Wörtlichkeits-Regel widerspricht NICHT der j8-Regel gegen Zusatzforderungen", () => {
    // j8: nichts fordern, was die Frage nicht nennt. j9: was sie nennt, wörtlich nehmen.
    // Beide Richtungen müssen nebeneinander lesbar bleiben.
    const iZusatz = de.indexOf("KEINE ZUSATZFORDERUNG");
    const iWoertlich = de.indexOf("WÖRTLICH, NICHT SINNGEMÄSS");
    expect(iZusatz).toBeGreaterThan(-1);
    expect(iWoertlich).toBeGreaterThan(iZusatz);   // erst der Rahmen, dann die Auslegung darin
  });
});
