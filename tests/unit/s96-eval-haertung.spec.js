// S96 · Korpus-Zusicherungen aus der Eval-Härtung (Lauf 2026-07-27).
//
// Geprüft wird der TEXT, nicht das Modellverhalten — Verhalten prüfen die Evals
// (RCL-02b, AUS-04/05, MRV-01/03, QZ-01, WDR-01). Diese Kanarien halten fest,
// dass die geschärften Regeln im Korpus stehen und in beiden Sprachen gleich
// weit reichen.

import { describe, it, expect } from "vitest";
import { K, setKorpusSprache } from "../../core/prompts/prompts.js";
import { SZENARIEN } from "../../evals/szenarien/start-katalog.js";
import { SZENARIEN_EN } from "../../evals/szenarien/start-katalog.en.js";

const raum = () => K().reflexionsPrompt("Anna", "Bernd");
const moment = () => K().momentPrompt("Anna", "Bernd");
const beide = fn => {
  for (const sp of ["de", "en"]) { setKorpusSprache(sp); fn(sp); }
  setKorpusSprache("de");
};

describe("S96 · Recall-Grenze (RCL-02b, rote Linie)", () => {
  it("Halluzinations-Sperre: ohne Kontext-Eintrag kein behaupteter Zugriff — beide Sprachen", () => {
    beide(sp => {
      const txt = raum();
      expect(txt, sp).toContain(sp === "de" ? "KEIN KONTEXT, KEIN FUND" : "NO CONTEXT, NO FIND");
      expect(txt, sp).toContain(sp === "de" ? "ich habe das in meinen Zusammenfassungen" : "I have that in my summaries");
    });
  });

  it("der Zeitleisten-Weg steht auch bei Eingrenzungs-Rückfragen dabei", () => {
    beide(sp => {
      expect(raum(), sp).toContain(sp === "de" ? "DER WEG STEHT IMMER DABEI" : "THE WAY ALWAYS COMES ALONG");
    });
  });
});

describe("S96 · Abschluss-Gabelung (AUS-04/05)", () => {
  it("Tür (a) benennt den Vorgang: wörtliche Stellen aus diesem Gespräch, die der Partner lesen kann", () => {
    beide(sp => {
      expect(raum(), sp).toContain(sp === "de" ? "die Bernd lesen kann" : "that Bernd can read");
    });
  });

  it("Gleichgewichts-Regel: ein Satz je Tür, keine Empfehlung, nie für den Abwesenden sprechen", () => {
    beide(sp => {
      const txt = raum();
      expect(txt, sp).toContain(sp === "de" ? "GLEICHGEWICHT (S96, hart)" : "BALANCE (S96, hard)");
      expect(txt, sp).toContain(sp === "de" ? "das wäre für ihn leichter zu lesen" : "that would be easier for him to read");
    });
  });

  it("Einlöse-Pflicht: kein Vertagen der Gabelung bei vorgemerktem Teilenwunsch", () => {
    beide(sp => {
      const txt = raum();
      expect(txt, sp).toContain(sp === "de" ? "EINLÖSE-PFLICHT" : "REDEEM OBLIGATION");
      expect(txt, sp).toContain(sp === "de" ? "das nehmen wir beim nächsten Mal auf" : "we'll pick that up next time");
    });
  });
});

describe("S96 · Reveal-Zahlenregel und Trajektorien-Tür (MRV-01/03)", () => {
  /* S107 · Die Zahlenregel ist strenger geworden: Nicht mehr "höchstens EIN
     Wertepaar", sondern GAR KEINE Zahlen. Zwei Zahlen nebeneinander sind eine
     Genauigkeitsaussage, egal wie warm der Satz drumherum klingt — und
     Genauigkeit gibt es nicht mehr zu messen. */
  it("Häppchen: die beiden Sichten nie im selben Atemzug", () => {
    beide(sp => {
      expect(moment(), sp).toContain(sp === "de"
        ? "NIE im selben Atemzug abgehandelt" : "NEVER handled in the same breath");
    });
  });

  it("Zahlen werden gar nicht mehr ausgesprochen", () => {
    beide(sp => {
      expect(moment(), sp).toContain(sp === "de"
        ? "in Worten, nicht in Zahlen" : "in words, not in numbers");
      expect(moment(), sp).toContain(sp === "de"
        ? "sind eine Genauigkeitsaussage" : "are an accuracy statement");
    });
  });

  it("der Richtungs-Vergleich ist gegenstandslos — es gibt nichts zu treffen", () => {
    beide(sp => {
      expect(moment(), sp).toContain(sp === "de" ? "es gibt nichts zu treffen" : "there is nothing to hit");
      // Und die alte Genauigkeits-Sprache ist fort.
      expect(moment(), sp).not.toMatch(sp === "de" ? /Lese-Genauigkeit|Savoring/ : /reading accuracy|savoring/);
    });
  });

  it("Trajektorie: der erste Satz ist die Frage, nie eine Feststellung", () => {
    beide(sp => {
      const txt = moment();
      expect(txt, sp).toContain(sp === "de" ? "dein erster Satz zur Trajektorie ist bereits die Frage" : "your first sentence about the trajectory is already the question");
      expect(txt, sp).toContain(sp === "de" ? "ihr habt euch verbessert" : "you have improved");
    });
  });

  /* S109 · Die Absicht dieses Tests war richtig und bleibt: Der KONTEXT muss
     dasselbe sagen wie der Prompt. Er steht näher an den Daten — ein
     Widerspruch dort wiegt schwerer als einer im Prompt.
     Geprüft wurde bis hierher die Regel VOR dem Beziehungswesen ("höchstens
     ein Wertepaar je Gesprächsschritt"). Sie ist mit S107 gefallen; der
     Kopftext hatte sie noch getragen und dem Prompt widersprochen. */
  it("die Kontext-Kopftexte sagen dasselbe wie der Prompt", () => {
    beide(sp => {
      const kt = K().korpusTexte;
      const kopf = kt["mk.prozessKopf"], nachtrag = kt["mk.prozessNachtrag"];
      // Keine Zahlen — dieselbe Regel wie im momentPrompt.
      expect(kopf, sp).toContain(sp === "de" ? "sprich KEINE Zahlen aus" : "do NOT speak out numbers");
      expect(nachtrag, sp).toContain(sp === "de" ? "keine Zahlen aussprechen" : "do not speak out numbers");
      // Reihenfolge: Wesen zuerst.
      expect(kopf, sp).toContain(sp === "de" ? "beginne mit dem Beziehungswesen" : "begin with the relationship being");
      // Und die alte Sprache ist fort.
      for (const t of [kopf, nachtrag])
        expect(t, sp).not.toMatch(sp === "de" ? /Treffer zuerst|Lese-Richtung|Wertepaar/ : /matches first|reading direction|pair of values/);
      expect(kt["mk.prozessVerlauf"], sp).toContain(sp === "de" ? "der erste Satz dazu ist die Frage" : "the first sentence about it is the question");
    });
  });
});

describe("S96 · Moment-Abschluss (QZ-01)", () => {
  it("Landung und Block stehen in derselben Nachricht — beide Fehlformen benannt", () => {
    beide(sp => {
      const txt = moment();
      // S100.1 · Die Landungs-Pflicht lebt jetzt im Baustein regieUebergabe —
      // die Zusatzmarke "(S96 geschärft)" ist mit dem Umzug entfallen, die
      // Regel selbst gilt jetzt für beide Abschluss-Sessions.
      expect(txt, sp).toContain(sp === "de" ? "LANDUNGS-PFLICHT" : "LANDING OBLIGATION");
      expect(txt, sp).toContain(sp === "de" ? "in DERSELBEN Nachricht" : "in THE SAME message");
      expect(txt, sp).toContain(sp === "de" ? "ohne würdigenden Schlusssatz" : "without an appreciating closing sentence");
    });
  });
});

describe("S96 · Katalog-Anpassungen (K1/F1-Entscheide)", () => {
  const byId = id => [...SZENARIEN, ...SZENARIEN_EN].find(s => s.id === id);

  // MRV-02 wurde in S97 auf v3 gehoben (K1a: anlassgebunden statt pauschal
  // «erwünscht» — im Binärcheck war daraus eine Anforderung geworden). Die
  // Zusicherung dafür steht jetzt in s97-gabelung-einholen.spec.js; hier bleibt
  // nur WDR-01, das S97 nicht berührt.

  it("WDR-01 v2: Ankommens-Einladung und offene Frage sind kein Neustart (de + en)", () => {
    for (const id of ["WDR-01", "WDR-01-EN"]) {
      const s = byId(id);
      expect(s, id).toBeTruthy();
      expect(s.version, id).toBe(2);
      const c3 = s.checks.find(c => c.id === "C3");
      expect(c3.frage, id).toMatch(id.endsWith("EN") ? /NOT a restart/ : /KEIN Neustart/);
    }
  });
});
