// S74: Wissenslinse — Entwicklungsraum-Perspektive (nach P. Schellenbaum).
// Kanarien-Pins laut Designnotiz (docs/designnotiz-wissenslinse-entwicklungsraum.md):
// Hypothesen-Disziplin · Blick-Erweiterung statt Blick-Ersatz · Schuldumkehr-Verbot ·
// Fremd-Deutungs-Verbot im gemeinsamen Raum · Verstehen vor Lösung ·
// Ressource statt Bedrohung · Vorrangkette (Sicherheit → Stabilität → Kontakt → Deutung) ·
// Sicherheits-Marker-Sperre · EM-Vorrang · Herkunfts-Erkundungs-Verbot ·
// Doppel-Rahmungs-Verbot (Anteile-Sprache).

import { describe, it, expect } from "vitest";
import * as D from "../../core/prompts/prompts.de.js";
import * as E from "../../core/prompts/prompts.en.js";

const PINS = {
  de: {
    hypothese: "du kennst die inneren Entwicklungsaufgaben der Person NICHT",
    keinDefizit: "nie ein Defizit-Befund",
    erweiterung: "zu ERWEITERN",
    anliegenBleibt: "wird nicht wegpsychologisiert",
    schuldumkehr: "Es geht um Spielraum, nicht um Schuld",
    kippfigur: "früher fand ich genau das toll",
    ressource: "als Ressource statt ausschließlich als Bedrohung",
    verstehen: "VERSTEHEN VOR LÖSUNG",
    fremdDeutung: "Nie die Entwicklungsaufgabe des jeweils ANDEREN deuten",
    kampfbegriff: "übersetze zurück auf die Erfahrungsebene",
    vorrangkette: "Sicherheit → Stabilität → Kontakt → Deutung",
    sicherheitsSperre: "gilt ausschließlich die Sicherheitslogik",
    markerAbgrenzung: "konkrete Kontroll- oder Bestrafungsmuster SIND es",
    emVorrang: "NIE als erste Antwort auf Ehrliches Mitteilen",
    keineHerkunft: "die Einladung bleibt im Heute",
    keineDoppelrahmung: "nie beide Rahmungen in derselben Nachricht",
    rueckzug: "kehr kommentarlos zur gewöhnlichen Spiegelung zurück",
  },
  en: {
    hypothese: "you do NOT know the person's inner developmental tasks",
    keinDefizit: "never a deficit finding",
    erweiterung: "to WIDEN the question",
    anliegenBleibt: "not psychologized away",
    schuldumkehr: "this is about room to move, not about blame",
    kippfigur: "I used to love exactly that about them",
    ressource: "as a resource instead of exclusively as a threat",
    verstehen: "UNDERSTANDING BEFORE SOLUTIONS",
    fremdDeutung: "Never interpret the developmental task of the OTHER person",
    kampfbegriff: "translate back to the level of experience",
    vorrangkette: "safety → stability → contact → interpretation",
    sicherheitsSperre: "only the safety logic applies",
    markerAbgrenzung: "concrete control or punishment patterns ARE",
    emVorrang: "never comes as the first response to honest sharing",
    keineHerkunft: "the invitation stays in the present",
    keineDoppelrahmung: "never both framings in the same message",
    rueckzug: "return to ordinary mirroring without comment",
  },
};

for (const [locale, M] of [["de", D], ["en", E]]) {
  const P = PINS[locale];
  const klaerung = M.klaerungsPrompt("Anna", "Bernd");
  const aufloesung = M.aufloesungsPrompt("Anna", "Bernd");
  const moment = M.momentPrompt("Anna", "Bernd");
  const reflexion = M.reflexionsPrompt("Anna", "Bernd");

  describe(`Entwicklungsraum-Perspektive (${locale}) · Einbau in alle vier Räume`, () => {
    it("Baustein existiert und ist ein Text", () => {
      expect(typeof M.bausteine.entwicklungsRaum).toBe("string");
    });
    for (const [name, p] of [["klaerungsPrompt", klaerung], ["aufloesungsPrompt", aufloesung], ["momentPrompt", moment], ["reflexionsPrompt", reflexion]]) {
      it(`gerendert in ${name}`, () => expect(p).toContain(M.bausteine.entwicklungsRaum));
    }
  });

  describe(`Entwicklungsraum-Perspektive (${locale}) · Kanarien-Pins`, () => {
    const b = M.bausteine.entwicklungsRaum;
    for (const [key, pin] of Object.entries(P)) {
      it(`Pin ${key}`, () => expect(b).toContain(pin));
    }
  });

  describe(`Entwicklungsraum-Perspektive (${locale}) · Konsistenz mit Nachbar-Linsen`, () => {
    it("Anteile-Sprache bleibt in allen vier Räumen erhalten", () => {
      for (const p of [klaerung, aufloesung, moment, reflexion]) {
        expect(p).toContain(M.bausteine.anteileSprache);
      }
    });
    it("Lösungsversuch-Rahmung nicht dupliziert (SSOT im haltungsKern)", () => {
      const marker = locale === "de" ? "Muster, das einmal sinnvoll war" : "a pattern that once made sense";
      expect(M.bausteine.haltungsKern).toContain(marker);
      expect(M.bausteine.entwicklungsRaum).not.toContain(marker);
    });
  });
}
