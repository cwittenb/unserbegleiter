// S40: Wissenslinsen — Anteile-Sprache (IFS-informiert) & Klein-Bausteine.
// Kanarien-Pins laut Designnotiz (docs/designnotiz-wissenslinsen-anteile-sprache.md):
// Wohlwollens-Prämisse · Prozessarbeits-Verbot · Taxonomie-Verbot ·
// Weichspül-Verbot (Absolut→Anteil) · Trauma-Sprachregelung (haltungsKern) ·
// Nicht-Umdeutungs-Regel (Ehrliches Mitteilen ≠ Bedürfnisanalyse) ·
// Reaktionstypen nie als Persönlichkeitsmerkmal.

import { describe, it, expect } from "vitest";
import * as D from "../../core/prompts/prompts.de.js";
import * as E from "../../core/prompts/prompts.en.js";

const PINS = {
  de: {
    wohlwollen: "Alles in dir verfolgt das gemeinsame Ziel, für deine Zufriedenheit zu sorgen",
    prozessverbot: "KEINE Teile-Prozessarbeit",
    taxonomie: "Kategorien reduzieren die Komplexität der Anteile",
    weichspuel: "Weichspülen ist verboten",
    absolutAnteil: "nur die Totalität wird zur Hypothese",
    taufe: "Keine Anteil-Taufe durch dich",
    gemeinsamerRaum: "nur, wenn eine Person sie für SICH SELBST nutzt",
    traumaRegel: "außer die Person führt es selbst ein",
    loesungsversuch: "Muster, das einmal sinnvoll war",
    emKontakt: "würdige zuerst den Kontakt",
    emKeineAnalyse: "nicht in Bedürfnisanalyse um",
    rktHeuristik: "Heuristik, keine Diagnose",
    rktNieMerkmal: "NIE als Persönlichkeitsmerkmal",
    rktStabilitaet: "Erst Stabilität, dann wieder Inhalt",
  },
  en: {
    wohlwollen: "Everything in you pursues the shared goal of looking after your wellbeing",
    prozessverbot: "do NOT conduct parts process work",
    taxonomie: "categories reduce the complexity of parts",
    weichspuel: "watering down is forbidden",
    absolutAnteil: "only the totality becomes a hypothesis",
    taufe: "No christening of parts by you",
    gemeinsamerRaum: "only when a person uses or accepts it for THEMSELVES",
    traumaRegel: "unless the person introduces it themselves",
    loesungsversuch: "a pattern that once made sense",
    emKontakt: "honor the contact first",
    emKeineAnalyse: "reinterpret honest sharing as needs analysis",
    rktHeuristik: "heuristic, not diagnosis",
    rktNieMerkmal: "NEVER read them as personality traits",
    rktStabilitaet: "Stability first, then content again",
  },
};

for (const [locale, M] of [["de", D], ["en", E]]) {
  const P = PINS[locale];
  const klaerung = M.klaerungsPrompt("Anna", "Bernd");
  const aufloesung = M.aufloesungsPrompt("Anna", "Bernd");
  const moment = M.momentPrompt("Anna", "Bernd");
  const reflexion = M.reflexionsPrompt("Anna", "Bernd");

  describe(`Anteile-Sprache (${locale}) · Einbau in alle vier Räume`, () => {
    it("Baustein existiert und ist ein Text", () => {
      expect(typeof M.bausteine.anteileSprache).toBe("string");
    });
    for (const [name, p] of [["klaerungsPrompt", klaerung], ["aufloesungsPrompt", aufloesung], ["momentPrompt", moment], ["reflexionsPrompt", reflexion]]) {
      it(`gerendert in ${name}`, () => expect(p).toContain(M.bausteine.anteileSprache));
    }
  });

  describe(`Anteile-Sprache (${locale}) · Kanarien-Pins`, () => {
    const b = M.bausteine.anteileSprache;
    it("Wohlwollens-Prämisse (Cars10-Wortlaut)", () => expect(b).toContain(P.wohlwollen));
    it("Prozessarbeits-Verbot (Stabilisierung ja, Prozessarbeit nein)", () => expect(b).toContain(P.prozessverbot));
    it("Taxonomie-Verbot mit Begründung (Komplexitätsreduktion)", () => expect(b).toContain(P.taxonomie));
    it("Weichspül-Verbot der Absolut→Anteil-Spezifikation (ANT-05)", () => {
      expect(b).toContain(P.weichspuel);
      expect(b).toContain(P.absolutAnteil);
    });
    it("Keine Anteil-Taufe; personengeprägte Namen als ihr Konstrukt (ANT-02)", () => expect(b).toContain(P.taufe));
    it("Gemeinsamer Raum: keine Partner-Teile-Diagnose (ANT-03)", () => expect(b).toContain(P.gemeinsamerRaum));
  });

  describe(`Lösungsversuch-Rahmung & Trauma-Sprachregelung (${locale}) · haltungsKern`, () => {
    it("Sprachregelung als Baustein, eingewoben in den haltungsKern (KLE-01)", () => {
      expect(M.bausteine.loesungsversuchRahmung).toContain(P.traumaRegel);
      expect(M.bausteine.loesungsversuchRahmung).toContain(P.loesungsversuch);
      expect(M.bausteine.haltungsKern).toContain(M.bausteine.loesungsversuchRahmung);
    });
    it("erreicht damit alle Räume mit HALTUNG", () => {
      for (const p of [klaerung, aufloesung, moment, reflexion]) expect(p).toContain(P.traumaRegel);
    });
  });

  describe(`Ehrliches Mitteilen (${locale}) · Klein-Baustein`, () => {
    const b = M.bausteine.ehrlichesMitteilen;
    it("Nicht-Umdeutungs-Regel: EM ist keine Bedürfnisanalyse (EM-01)", () => {
      expect(b).toContain(P.emKeineAnalyse);
      expect(b).toContain(P.emKontakt);
    });
    it("gerendert im Reflexionsraum und in der Qualitätszeit", () => {
      expect(reflexion).toContain(b);
      expect(moment).toContain(b);
    });
    it("NICHT in Auftragsklärung und Auflösung (bewusste Dosierung)", () => {
      expect(klaerung).not.toContain(b);
      expect(aufloesung).not.toContain(b);
    });
  });

  describe(`Notfall-Reaktionstypen (${locale}) · Klein-Baustein`, () => {
    const b = M.bausteine.reaktionsTypen;
    it("Heuristik-Klausel und Persönlichkeits-Verbot (RKT-01)", () => {
      expect(b).toContain(P.rktHeuristik);
      expect(b).toContain(P.rktNieMerkmal);
      expect(b).toContain(P.rktStabilitaet);
    });
    it("gerendert in Qualitätszeit und Auflösung (Paar-Räume)", () => {
      expect(moment).toContain(b);
      expect(aufloesung).toContain(b);
    });
    it("NICHT in Auftragsklärung und Reflexionsraum (dort gilt die eigene Not-Logik)", () => {
      expect(klaerung).not.toContain(b);
      expect(reflexion).not.toContain(b);
    });
  });
}
