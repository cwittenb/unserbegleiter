// S95.4 · Korpus-Zusicherungen zum Freigabe-Ort und zur Gabelung.
//
// Geprüft wird der TEXT, nicht das Modellverhalten — Verhalten prüfen die Evals
// (AUS-01…AUS-06). Diese Tests halten fest, dass die Regeln überhaupt im Korpus
// stehen und in beiden Sprachen gleich weit reichen.

import { describe, it, expect } from "vitest";
import { K, setKorpusSprache } from "../../core/prompts/prompts.js";

// Der Freigabe-Abschnitt entsteht erst beim Bauen des Reflexions-Prompts
// (Template-Literal mit ${name}/${partner}) — er liegt in keinem Baustein.
const CTX = { name: "Anna", partner: "Bernd" };
const raum = () => K().reflexionsPrompt(CTX);
const beide = fn => {
  for (const sp of ["de", "en"]) { setKorpusSprache(sp); fn(raum(), sp); }
  setKorpusSprache("de");
};

describe("S95.4 · Freigabe-Ort", () => {
  it("nennt den Abschluss als einzigen Ort — in beiden Sprachen", () => {
    beide((txt, sp) => {
      expect(txt, sp).toMatch(sp === "de" ? /FREIGABE-ORT/ : /RELEASE POINT/);
      expect(txt, sp).toContain("[CLOSE SESSION]");
      expect(txt, sp).toContain("EXCERPT-BLOCK");
    });
  });

  it("das alte Sofort-Angebot ist weg", () => {
    setKorpusSprache("de");
    expect(raum()).not.toContain("beim Sitzungsabschluss stellst du zusätzlich genau EINE offene");
    setKorpusSprache("en");
    expect(raum()).not.toContain("On your own initiative you offer sharing DURING the session");
    setKorpusSprache("de");
  });
});

describe("S95.4 · Teilenwunsch als Bremse", () => {
  it("verlangt eine Zusage und verbietet die Rückfrage-Formel", () => {
    setKorpusSprache("de");
    expect(raum()).toContain("ZUSAGE, keine Frage");
    expect(raum()).toContain("ich frage dich am Ende");   // ausdrücklich als Verstoß benannt
    expect(raum()).toContain("Das nehme ich mit");
    setKorpusSprache("en");
    expect(raum()).toContain("COMMITMENT, not a question");
    setKorpusSprache("de");
  });

  it("führt die Vertiefung aufs Erleben, nicht auf den Inhalt", () => {
    setKorpusSprache("de");
    expect(raum()).toContain("ERLEBEN");
    expect(raum()).toContain("Was wäre anders, wenn");
    setKorpusSprache("de");
  });
});

describe("S95.4 · Dreiwertige Gabelung", () => {
  it("alle drei Türen stehen im Wortlaut", () => {
    setKorpusSprache("de");
    const txt = raum();
    expect(txt).toContain("DREI TÜREN");
    expect(txt).toContain("noch für mich behalten");
    expect(txt).toContain("Selbstmitteilung");
    setKorpusSprache("en");
    expect(raum()).toContain("THREE DOORS");
    expect(raum()).toContain("keep it to myself for now");
    setKorpusSprache("de");
  });

  it("fragt nach Zweck, nicht nach Aufwand", () => {
    beide((txt, sp) => expect(txt, sp).toMatch(sp === "de" ? /nach ZWECK, nie nach Aufwand/ : /about PURPOSE, never about effort/));
  });

  it("die dritte Tür trägt keine Verneinungsformel", () => {
    setKorpusSprache("de");
    expect(raum()).toContain("keine Verneinungsformel");
    expect(raum()).toContain("schließt sich die Gabelung lautlos");
    setKorpusSprache("de");
  });

  it("„offen lassen“ ist ausdrücklich keine vierte Tür", () => {
    beide((txt, sp) => expect(txt, sp).toMatch(sp === "de" ? /nie eine vierte Tür/ : /never a fourth door/));
  });
});

describe("S95.4 · Ausschnitt-Regeln", () => {
  it("verbietet Umformulieren und begrenzt Auslassungen auf Paar-Grenzen", () => {
    setKorpusSprache("de");
    const txt = raum();
    expect(txt).toContain("formulierst nichts um");
    expect(txt).toContain("nie innerhalb eines Zuges");
    setKorpusSprache("en");
    expect(raum()).toContain("rewrite nothing");
    expect(raum()).toContain("never within a turn");
    setKorpusSprache("de");
  });

  it("nennt den zweiten Kriteriensatz für die eigenen Züge", () => {
    setKorpusSprache("de");
    const txt = raum();
    expect(txt).toContain("keine Parteinahme");
    expect(txt).toContain("keine Diagnose");
    setKorpusSprache("de");
  });

  it("der Richtwert-Hinweis macht keine Aussage über den Partner", () => {
    beide((txt, sp) => {
      expect(txt, sp).toMatch(sp === "de" ? /nie mit einer Aussage über/ : /never with a statement about/);
      // Der klassische Fehlgriff: Fürsorge FÜR den Abwesenden aussprechen.
      expect(txt, sp).not.toMatch(/viel zu lesen für|too much to read for/);
    });
  });

  it("die Auswahl-Rahmung enthält keine Bedien-Begriffe", () => {
    setKorpusSprache("de");
    expect(raum()).toContain("Nie Gesten");
    expect(raum()).toContain("die Bedienung trägt die Oberfläche");
    setKorpusSprache("en");
    expect(raum()).toContain("Never gestures");
    setKorpusSprache("de");
  });
});

describe("S95.4 · EXCERPT-BLOCK-Format", () => {
  it("ist in beiden Sprachen dokumentiert und zeigt Schweigen bei Bestehen", () => {
    beide((txt, sp) => {
      expect(txt, sp).toContain("EXCERPT-BLOCK");
      expect(txt, sp).toContain("END EXCERPT-BLOCK");
      expect(txt, sp).toContain('"reason":null');
      expect(txt, sp).toContain("ownerOk");
      expect(txt, sp).toContain("companionOk");
    });
  });

  it("das Beispiel-JSON ist gültig und besteht das Schema", async () => {
    const { ausschnittBlockSchema } = await import("../../core/contracts/schemas.js");
    setKorpusSprache("de");
    const m = /EXCERPT-BLOCK\n(\{[\s\S]*?\})\nEND EXCERPT-BLOCK/.exec(raum());
    expect(m).toBeTruthy();
    expect(ausschnittBlockSchema(JSON.parse(m[1]))).toEqual([]);
  });

  it("die Wiederkehr bleibt als Anlass erhalten", () => {
    setKorpusSprache("de");
    expect(raum()).toContain("WIEDERKEHR");
    expect(raum()).toContain("ohne Nachhaken");
    setKorpusSprache("de");
  });
});
