// S108 · Zwei Reparaturen aus dem Lauf vom 2026-08-03.
//
// (1) MRV-01/C4, 4/5 — MEIN Fehler aus S107: Die neue Aufdeckung lädt zum
//     Fragen ein ("frage in die Differenz hinein"), und die Marke soll ans Ende
//     derselben Erzählung. Das Modell kann nicht beides und wählt die Frage —
//     inhaltlich die richtige Wahl. Der Prompt widersprach sich selbst.
//
// (2) MOM-01/C1, 3/5 — eine NEUE Judge-Fehlerklasse: Bei kontrastiven Fragen
//     ("A statt B?") findet der Judge B, belegt es sauber und antwortet
//     trotzdem "ja" (= A). Die j9-Schlussprüfung greift nicht, weil sie
//     Einschränkungsmarker sucht ("aber", "jedoch") — hier ist der Beleg eine
//     glatte Feststellung, nur zur falschen Alternative.

import { describe, it, expect } from "vitest";
import { JUDGE_PROMPT_VERSION, baueJudgePrompt } from "../../evals/judge/judge.js";
import { GOLDEN } from "../../evals/judge/golden.js";
import { momentPrompt } from "../../core/prompts/prompts.de.js";
import { momentPrompt as momentPromptEn } from "../../core/prompts/prompts.en.js";

/* ═══════════ (1) Die Aufdeckung erzählt erst, fragt danach ═══════════ */

describe("S108 · Zwei Schritte in der Aufdeckung", () => {
  it("die Folge steht ausdrücklich da (de+en)", () => {
    expect(momentPrompt("Anna", "Bernd")).toContain("ZWEI SCHRITTE (S108");
    expect(momentPromptEn("Anna", "Bernd")).toContain("TWO STEPS (S108");
  });

  it("Schritt 1 trägt die Marke und KEINE Frage", () => {
    const p = momentPrompt("Anna", "Bernd");
    expect(p).toMatch(/Schritt 1[^.]*Marke \[\[META-REVEALED\]\][^.]*KEINE Frage/s);
  });

  it("die Frage in die Differenz hat ihren Ort im ZWEITEN Schritt", () => {
    /* Ohne diesen Zusatz stand im selben Prompt "frage in die Differenz hinein"
       und "diese Nachricht enthält KEINE Frage" — das Modell musste eines von
       beiden brechen. */
    const p = momentPrompt("Anna", "Bernd");
    expect(p).toContain("aber im ZWEITEN Schritt, nach der Marke");
    expect(momentPromptEn("Anna", "Bernd")).toContain("but in the SECOND step, after the marker");
  });

  it("die Differenz bleibt trotzdem die reichere Tür", () => {
    // Die Reparatur verschiebt den Zeitpunkt, nicht die Haltung.
    expect(momentPrompt("Anna", "Bernd")).toContain("DIFFERENZ IST DIE REICHERE TÜR");
  });
});

/* ═══════════ (2) j10 · Polarität ═══════════ */

describe("S108 · j10 erkennt kontrastive Fragen", () => {
  it("Version ist j10", () => {
    expect(JUDGE_PROMPT_VERSION).toBe("j10");
  });

  it("die Regel steht in beiden Sprachen", () => {
    expect(baueJudgePrompt("de")).toContain("POLARITÄT BEI »A STATT B«");
    expect(baueJudgePrompt("en")).toContain("POLARITY ON »A INSTEAD OF B«");
  });

  it("sie sagt, was zu tun ist — nicht nur, was falsch wäre", () => {
    const p = baueJudgePrompt("de");
    expect(p).toMatch(/WELCHE der beiden beschreibt mein Beleg/);
    expect(p).toMatch(/Beschreibt er B, ist die gefragte Sache \(A\) NICHT eingetreten/);
    // Mit Beispiel, weil die Fehlerklasse abstrakt schwer zu fassen ist.
    expect(p).toContain("Ich-Rahmung");
  });

  it("die älteren Härtungen stehen weiterhin", () => {
    const p = baueJudgePrompt("de");
    expect(p).toContain("BELEG TRÄGT URTEIL");        // j8
    expect(p).toContain("WÖRTLICH, NICHT SINNGEMÄSS"); // j9
    expect(p).toContain("SCHLUSS-PRÜFUNG");            // j9
  });

  it("GOLD-POLARITAET friert den beobachteten Fall ein", () => {
    const g = GOLDEN.find(x => x.id === "GOLD-POLARITAET");
    expect(g, "Fixture muss existieren").toBeTruthy();
    // Kontrastive Frage, Ich-Rahmung in der Antwort ⇒ Soll-Urteil "nein".
    expect(g.szenario.checks[0].frage).toMatch(/statt als eigenes Empfinden/);
    expect(g.erwartet.C1).toBe("nein");
    const antwort = g.transkript.find(m => m.role === "assistant").content;
    expect(antwort).toContain("Das finde ich");
  });

  it("sie ergänzt die Schluss-Prüfung, statt sie zu ersetzen", () => {
    /* Die beiden greifen an verschiedenen Stellen: Die Schluss-Prüfung sucht
       Einschränkungen im Beleg, die Polaritäts-Regel fragt, welche Alternative
       er beschreibt. Im beobachteten Fall gab es keine Einschränkung. */
    const p = baueJudgePrompt("de");
    const iSchluss = p.indexOf("SCHLUSS-PRÜFUNG");
    const iPol = p.indexOf("POLARITÄT BEI");
    expect(iSchluss).toBeGreaterThan(0);
    expect(iPol).toBeGreaterThan(iSchluss);
  });
});
