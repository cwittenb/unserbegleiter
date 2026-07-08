// Prompt-Kanarien — Invarianten gegen Regressions-Verlust beim Refactoring.
// v0.29-Kanarien portiert + Neuzugänge (Fokus-Prinzip, Weichen-Disziplin,
// Marker-Konvention in den Prompts selbst).

import { describe, it, expect } from "vitest";
import { einzelSys, gemeinsamSys, momentSys, soloSys, qzSys, DOMAINS } from "../../core/prompts/prompts.js";

describe("Kanarien · soloSys (Reflexionsgespräch)", () => {
  const p = soloSys("Anna", "Bernd");
  it("Sicherheits-Weiche am Gate", () => expect(p).toContain("SICHERHEITS-WEICHE"));
  it("Spiegel-Grammatik", () => expect(p).toContain("SPIEGEL-GRAMMATIK"));
  it("Widerspruchs-Pflicht", () => expect(p).toContain("WIDERSPRUCHS-PFLICHT"));
  it("Wort-Klärung bei Gewalt-Nähe (ESK-07-Befund): klären statt vertiefen, Gewalt nie selbst einführen", () => {
    expect(p).toContain("WORT-KLÄRUNG");
    expect(p).toContain("NICHT von dir aus ein");
  });
  it("Versehens-Korrektur wird AUSDRÜCKLICH übernommen (KOR-01, Entscheidung Cars10)", () => {
    expect(p).toContain("VERSEHENS-KORREKTUR");
    expect(p).toContain("die frühere nicht mehr zählt");
  });
  it("Spiegel-Grammatik-Schärfung (SYC-05-Befund): „Das klingt nach/wie“ nur als Ich-Angebot", () => {
    expect(p).toContain("Das klingt nach/wie");
    expect(p).toContain("Das ist ein großer Satz");   // Ausweich-Muster aus Lauf 3
    expect(p).toContain("ERSETZT das Urteil");         // Hybrid-Muster aus Lauf 4: Urteil + nachgeschobene Ich-Rahmung
  });
  it("Ausdrückliche Bitte um Vorschlag schlägt Methoden-Präferenz (GATE-Befund Lauf 4)", () => {
    expect(p).toContain("AUSDRÜCKLICHE BITTE UM VORSCHLAG");
    expect(p).toContain("statt weiter Vorarbeit einzufordern");
  });
  it("Namen sind eingewoben", () => { expect(p).toContain("Anna"); expect(p).toContain("Bernd"); });
});

describe("Kanarien · momentSys (Gemeinsame Session)", () => {
  const p = momentSys("Anna", "Bernd");
  it("Not-Frage an beide", () => expect(p).toContain("NOT-FRAGE AN BEIDE"));
  it("keine Sicherheitsdiagnosen im Raum", () => expect(p).toContain("KEINE Sicherheitsdiagnosen"));
  it("offene Tür ab Termin 2", () => expect(p).toContain("OFFENE TÜR (nur ab dem zweiten Termin"));
  it("Zwischenzeit-Impuls ohne Nachhalten", () => expect(p).toContain("NICHT geprüft, ob es stattfand"));
  it("Sprecher-Klärung bei unklarer Absenderschaft (SPR-05-Befund): nachfragen statt raten", () => {
    expect(p).toContain("SPRECHER-KLÄRUNG");
    expect(p).toContain("nie ratend");
    expect(p).toContain("IST eine Zuschreibung");      // Lauf 5: beiläufiges namentliches Danken
  });
});

describe("Kanarien · qzSys (Qualitätszeit-Einladungen)", () => {
  it("Angebots-Grammatik statt Deutung", () => expect(qzSys()).toContain("NIE eine Diagnose"));
});

describe("Kanarien · einzelSys (Auftragsklärung, v2)", () => {
  const p = einzelSys("Anna", "Bernd", true);
  it("Sorgen-Weiche (Angst UM vs. Angst VOR) vorhanden", () => {
    expect(p).toContain("SORGEN-WEICHE");
    expect(p).toContain("Angst VOR");
  });
  it("Weichen-Disziplin ist binär formuliert", () => expect(p).toContain("WEICHEN-DISZIPLIN (binär)"));
  it("Beide-Pole-Würdigung ist PFLICHT, nicht Kandidat (SPA-01-Befund)", () => {
    expect(p).toContain('IMMER kurz als "du willst beides"');
  });
  it("Korrektur-Übernahme auch hier ausdrücklich (KOR)", () => {
    expect(p).toContain("übernimm die Korrektur AUSDRÜCKLICH");
  });
  it("Marker-Konvention: [[SLIDERS]] allein in der letzten Zeile wird verlangt", () => {
    expect(p).toContain("[[SLIDERS]] allein in der letzten Zeile");
  });
  it("v2-Weiche ist schaltbar: ohne v2 keine Sorgen-Weiche", () => {
    expect(einzelSys("A", "B", false)).not.toContain("SORGEN-WEICHE");
  });
});

describe("Kanarien · gemeinsamSys (Auflösung)", () => {
  const p = gemeinsamSys("Anna", "Bernd", true);
  it("CLARIFICATION-BLOCK-Format wird verlangt", () => expect(p).toContain("CLARIFICATION-BLOCK"));
  it("beidseitige Bestätigung ist verankert", () => expect(p).toContain("confirmedByBoth"));
  it("Gegendruck-fest (AUF-01-Befund): Drängen einer Person macht nichts vereinbart", () => {
    expect(p).toContain("GEGENDRUCK-FEST");
    expect(p).toContain("hol es aktiv ein");
    expect(p).toContain("Unterstelle nie ein Okay");   // AUF-Klasse aus Lauf 4: "ich nehme das als Okay"
    expect(p).toContain("in KEINER Formulierung");     // Lauf 5: Wortlaut-Umgehung ("… für den Start")
    expect(p).toContain("mach daraus eine FRAGE");     // Positiv-Ersatz (SYC-Muster)
  });
});

describe("Kanarien · Domänen", () => {
  it("13 Lebensbereiche, Sexualität und Finanzen nicht wegredigiert", () => {
    expect(DOMAINS).toHaveLength(13);
    const titel = DOMAINS.map(d => d.t).join(" ");
    expect(titel).toContain("Sexualität");
    expect(titel).toContain("Finanzielle");
  });
});

describe("Kanarien · Themen-Rahmen (Scope, Neubau v1.0)", () => {
  it("solo- und moment-Session tragen den Themen-Rahmen im assemblierten Prompt", async () => {
    const { soloDef, momentDef } = await import("../../core/ui/sessions.js");
    const solo = soloDef({}).sysPrompt({ me: "Anna", partner: "Bernd" });
    const moment = momentDef({}).sysPrompt({ nameA: "Anna", nameB: "Bernd" });
    for (const p of [solo, moment]) {
      expect(p).toContain("THEMEN-RAHMEN");
      expect(p).toContain("frag nach dem Bezug, statt abzuweisen");   // Mehrdeutigkeit → Frage, nicht Abweisung
    }
  });
});
