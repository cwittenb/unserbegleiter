// S103 · Was der Eval-Lauf vom 30.07.2026 gezeigt hat.
//
// 37 Szenarien, 148 Samples, 20 Verletzungen, keine rote Linie. Drei der 20
// waren Fehlurteile des Judges — deshalb steht j8 hier an erster Stelle und
// nicht am Ende: Solange der Richter irrt, korrigiert man Prompts gegen
// Rauschen.
//
// Auffällig an den echten Verletzungen: In DREI von vier Fällen stand die Regel
// bereits im Korpus und wurde trotzdem gerissen (Gleichgewicht der drei Türen
// seit S96, Platz der Meta-Marke seit S89, Krisen-Reihenfolge seit Langem).
// Eine Regel ohne Wächter ist eine Bitte.

import { describe, it, expect } from "vitest";
import { JUDGE_PROMPT_VERSION, baueJudgePrompt } from "../../evals/judge/judge.js";
import { GOLDEN } from "../../evals/judge/golden.js";
import { pruefeMetaMarke, META_PLATZ_REVISION } from "../../core/engine/abschluss-waechter.js";
import { KRISENHILFE, EINZELRAUM } from "../../core/engine/krisen-waechter.js";
import { momentDef } from "../../core/ui/sessions.js";
import { gemeinsamDef } from "../../core/ui/kernwetten.js";
import { bausteine, reflexionsPrompt, momentPrompt, aufloesungsPrompt, steuerTexte } from "../../core/prompts/prompts.de.js";
import {
  bausteine as bausteineEn, reflexionsPrompt as reflexionsPromptEn,
  momentPrompt as momentPromptEn, aufloesungsPrompt as aufloesungsPromptEn,
  steuerTexte as steuerTexteEn,
} from "../../core/prompts/prompts.en.js";

const backendStumm = () => ({
  pstate: { get: async () => null, set: async () => true },
  bstate: { get: async () => null, set: async () => true },
});

/* ═══════════ S103.1 · j8 · Urteil und Beleg müssen zusammenpassen ═══════════ */

describe("S103.1 · Der Judge trägt drei neue Regeln", () => {
  it("Version ist mindestens j8 — die drei S103-Regeln gelten fort (aktuell j9)", () => {
    // Diese Spec prüft die S103-REGELN, nicht die Versionsnummer; j9 ergänzt sie.
    expect(Number(JUDGE_PROMPT_VERSION.slice(1))).toBeGreaterThanOrEqual(8);
  });

  it("DE: Beleg trägt Urteil · keine Zusatzforderung · Fehlendes benennen", () => {
    const p = baueJudgePrompt("de");
    expect(p).toContain("BELEG TRÄGT URTEIL");
    expect(p).toContain("KEINE ZUSATZFORDERUNG");
    expect(p).toContain("FEHLENDES BENENNEN");
  });

  it("EN: dieselben drei", () => {
    const p = baueJudgePrompt("en");
    expect(p).toContain("EVIDENCE CARRIES THE VERDICT");
    expect(p).toContain("NO ADDED REQUIREMENT");
    expect(p).toContain("NAME WHAT IS MISSING");
  });

  it("«kein Beleg» bleibt ausdrücklich zulässig", () => {
    // Bei POSITIV gestellten Fragen ist das Fehlen die Verletzung — dort gibt
    // es nichts zu zitieren. Die Regel darf «kein Beleg» nicht verbieten,
    // sondern verlangt, das Vermisste zu BENENNEN.
    expect(baueJudgePrompt("de")).toContain("»kein Beleg« bleibt zulässig");
    expect(baueJudgePrompt("en")).toContain("»kein Beleg« stays admissible");
  });

  it("die alten Härtungen stehen weiterhin", () => {
    const p = baueJudgePrompt("de");
    expect(p).toContain("in dubio contra machina");
    expect(p).toContain("SYSTEM(Begleitung):");
  });

  it("GOLD-ZUSATZ friert den beobachteten Fehlurteilsfall ein", () => {
    const g = GOLDEN.find(x => x.id === "GOLD-ZUSATZ");
    expect(g, "Fixture muss existieren").toBeTruthy();
    // Landung UND Block sind vorhanden — das Soll-Urteil ist "erfüllt".
    expect(g.erwartet.C1).toBe("ja");
    const antwort = g.transkript.find(m => m.role === "assistant").content;
    expect(antwort).toContain("Das freut mich sehr");
    expect(antwort).toContain("MOMENT-BLOCK");
  });
});

/* ═══════════ S103.2 · Der Steuertext ist nie mehrdeutig ═══════════ */

describe("S103.2 · Die Klärungsfrage gilt nur für gesprochene Signale", () => {
  it("der Baustein nennt die Ausnahme und beide Steuertexte (de+en)", () => {
    const de = bausteine.endSignal(`"Magst du schließen?"`);
    const en = bausteineEn.endSignal(`"Would you like to close?"`);
    expect(de).toContain("NUR FÜR GESPROCHENE SIGNALE");
    expect(de).toContain("[CLOSE SESSION]");
    expect(de).toContain("[CLOSE MOMENT]");
    expect(en).toContain("FOR SPOKEN SIGNALS ONLY");
  });

  it("die Ausnahme steht in BEIDEN Abschluss-Sessions", () => {
    // Der Fehler trat im Reflexionsgespräch auf (AUS-04/3); über den
    // S102-Baustein war er in der Qualitätszeit genauso erreichbar.
    for (const p of [reflexionsPrompt("Anna", "Bernd"), momentPrompt("Anna", "Bernd")])
      expect(p).toContain("NUR FÜR GESPROCHENE SIGNALE");
    for (const p of [reflexionsPromptEn("Anna", "Bernd"), momentPromptEn("Anna", "Bernd")])
      expect(p).toContain("FOR SPOKEN SIGNALS ONLY");
  });

  it("die Klärungsfrage für gesprochene Signale bleibt erhalten", () => {
    const p = reflexionsPrompt("Anna", "Bernd");
    expect(p).toContain("Magst du hier für heute schließen");
    expect(p).toContain("genau EINE Klärungsfrage");
  });
});

/* ═══════════ S103.3 · [[META-REVEALED]] ═══════════ */

describe("S103.3 · Die vierte Regie-Übergabe ist bewacht", () => {
  const ERZAEHLT = "Anna, du hast Bernds Nähe-Erleben nah geschätzt — ihr lest euch da gut.";

  it("Marke allein in der letzten Zeile ⇒ frei", () => {
    expect(pruefeMetaMarke(ERZAEHLT + "\n[[META-REVEALED]]")).toBeNull();
  });

  it("nachfolgender Leerraum stört nicht", () => {
    expect(pruefeMetaMarke(ERZAEHLT + "\n[[META-REVEALED]]\n\n  ")).toBeNull();
  });

  it("Marke VOR der Erzählung ⇒ Revision (der beobachtete Fall MRV-01/1)", () => {
    expect(pruefeMetaMarke("[[META-REVEALED]]\nAnna, ich würde gern kurz bei dir bleiben."))
      .toBe(META_PLATZ_REVISION);
  });

  it("Marke mitten in der Zeile ⇒ Revision", () => {
    expect(pruefeMetaMarke(ERZAEHLT + "\nSo weit. [[META-REVEALED]] Und nun weiter."))
      .toBe(META_PLATZ_REVISION);
  });

  it("zweimal gesetzt ⇒ Revision", () => {
    expect(pruefeMetaMarke("[[META-REVEALED]]\n" + ERZAEHLT + "\n[[META-REVEALED]]"))
      .toBe(META_PLATZ_REVISION);
  });

  it("Frage UND Marke ⇒ die gemeinsame Invariante greift zuerst", () => {
    const revision = pruefeMetaMarke("Was fällt euch auf?\n[[META-REVEALED]]",
      { frageRevision: "[FRAGE]" });
    expect(revision).toBe("[FRAGE]");
  });

  it("ohne Marke schweigt der Wächter", () => {
    expect(pruefeMetaMarke(ERZAEHLT)).toBeNull();
    expect(pruefeMetaMarke("Mögt ihr weitermachen?")).toBeNull();
  });

  it("verdrahtet in der Qualitätszeit — und nur dort", () => {
    // S105.3 · Die Marke wird jetzt VERWEIGERT statt revidiert: Der Text bleibt
    // stehen, nur die Aufdeckung unterbleibt.
    const eng = { chat: { messages: [] }, ctx: {} };
    expect(momentDef(backendStumm(), {}).pruefeUebergabe("[[META-REVEALED]]\nText danach.", eng))
      .toBe("meta-marke-platz");
    // Die Auflösung kennt diese Marke nicht — dort bleibt sie folgenlos.
    expect(gemeinsamDef(backendStumm(), {}).pruefeUebergabe("[[META-REVEALED]]\nText danach.", eng))
      .toBeNull();
  });

  it("[[CHOICE-CONNECT]] bleibt unberührt", () => {
    const eng = { chat: { messages: [] }, ctx: {} };
    expect(momentDef(backendStumm(), {}).pruefeUebergabe("Mögt ihr?\n[[CHOICE-CONNECT]]", eng))
      .toBeNull();
  });
});

/* ═══════════ S103.4 · Die drei Türen ═══════════ */

describe("S103.4 · Der Zweck-Kontrast wird nicht halbiert", () => {
  it("die Regel benennt das Paar und die Restkategorie (de+en)", () => {
    const de = reflexionsPrompt("Anna", "Bernd");
    expect(de).toContain("PAARIG (S103");
    expect(de).toContain("keine Restkategorie");
    expect(reflexionsPromptEn("Anna", "Bernd")).toContain("PAIRED (S103");
  });

  it("die Gleichgewichts-Regel aus S96 steht weiterhin", () => {
    // S103 ersetzt sie nicht — sie war da und wurde trotzdem gerissen. Neu ist
    // die Diagnose, WORAN es lag: Der Zweck-Kontrast im Prompt lieferte den
    // Zusatz, den das Modell dann nur an Tür (a) hängte.
    expect(reflexionsPrompt("Anna", "Bernd")).toContain("GLEICHGEWICHT (S96, hart)");
  });
});

/* ═══════════ S103.5 · Krisen-Reihenfolge im geteilten Raum ═══════════ */

const eng0 = { chat: { messages: [] }, ctx: { nameA: "Anna", nameB: "Bernd" } };

/* S113 · Aus dem Wächter wurden zwei Erkenner.
   `pruefeKrisenReihenfolge` prüfte die fertige Antwort und ließ sie neu
   schreiben — beides passt seit S105.3 nicht mehr. Verweigern ließe sich hier
   ohnehin nichts: Der Fehler steckt im gesprochenen Text (die Nummer ohne den
   vorangehenden Verweis in den eigenen Raum), nicht in einer Übergabe.
   Was bleibt und weiter geprüft wird, sind die ERKENNER: Woran ist die Lage
   überhaupt zu erkennen? Sie tragen jetzt die Schärfung. */
describe("S103.5 · Woran die Krisenlage erkannt wird", () => {
  const RAUM = "Dafür ist dein eigener Raum da — dort bin ich ganz für dich.";
  const HILFE = "Ein nächster Schritt kann die Telefonseelsorge sein: 0800 111 0 111.";

  it("die Krisenhilfe wird erkannt — auch mit abweichenden Abständen", () => {
    expect(KRISENHILFE.test(HILFE)).toBe(true);
    expect(KRISENHILFE.test("Ruf dort an: 0800 111 0 111")).toBe(true);
    expect(KRISENHILFE.test("Der Krisendienst ist erreichbar.")).toBe(true);
    expect(KRISENHILFE.test("Was beschäftigt euch gerade?")).toBe(false);
  });

  it("der Verweis in den eigenen Raum ebenso", () => {
    expect(EINZELRAUM.test(RAUM)).toBe(true);
    expect(EINZELRAUM.test("dort bin ich in deinem eigenen Raum für dich")).toBe(true);
    expect(EINZELRAUM.test("Wir sprechen hier gemeinsam.")).toBe(false);
  });

  /* NICHT übernommen: die Reihenfolge-Prüfung (»Einzelraum ZU SPÄT ⇒
     Revision«). Sie war die Logik des Wächters. Die Reihenfolge selbst gilt
     unverändert — sie steht jetzt in der Schärfung und im Korpus, und der
     nächste Test prüft, dass sie dort ankommt. */

  it("S105.3 · beide geteilten Räume schärfen jetzt VORWÄRTS statt zu revidieren", () => {
    /* Der Fehler steckt im gesprochenen Text (die Nummer ohne den Verweis in
       den eigenen Raum) — verweigern lässt sich da nichts, und zurückgenommen
       wird nichts mehr. Also bekommt das Modell die Regel VORHER mit, wenn die
       Nachricht der Person Krisensignale trägt. */
    const krise = [{ role: "user", content: "Ich will nicht mehr leben." }];
    const harmlos = [{ role: "user", content: "Wir hatten einen schönen Abend." }];
    for (const def of [momentDef(backendStumm(), {}), gemeinsamDef(backendStumm(), {})]) {
      expect(typeof def.schaerfe).toBe("function");
      expect(def.schaerfe(krise, {})).toContain("ZUERST der Verweis in den eigenen Raum");
      expect(def.schaerfe(harmlos, {})).toBeNull();
      // Und nichts wird mehr zurückgenommen.
      expect(def.pruefeUebergabe ? def.pruefeUebergabe("Ich höre dich. " + HILFE, eng0) : null).toBeNull();
    }
  });

  it("der Prompt trägt das Gegenbeispiel (de+en)", () => {
    expect(aufloesungsPrompt("Anna", "Bernd")).toContain("Die Nummer allein");
    expect(aufloesungsPromptEn("Anna", "Bernd")).toContain("The number alone");
  });

  it("beide Revisionstexte leben im Korpus", () => {
    for (const st of [steuerTexte, steuerTexteEn]) {
      expect(st.metaPlatzRevision).toContain("SYSTEM-REVISION");
      expect(st.krisenReihenfolgeRevision).toContain("SYSTEM-REVISION");
    }
  });
});
