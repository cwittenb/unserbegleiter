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
  it("Häppchen ist definiert: höchstens ein Wertepaar je Gesprächsschritt", () => {
    beide(sp => {
      expect(moment(), sp).toContain(sp === "de" ? "höchstens EIN Wertepaar je Gesprächsschritt" : "at most ONE pair of values per conversational step");
    });
  });

  it("das Nebeneinander zweier Genauigkeits-Urteile ist als Richtungs-Vergleich benannt", () => {
    beide(sp => {
      expect(moment(), sp).toContain(sp === "de" ? "Nebeneinander zweier solcher Urteile" : "juxtaposition of two such verdicts");
    });
  });

  it("Trajektorie: der erste Satz ist die Frage, nie eine Feststellung", () => {
    beide(sp => {
      const txt = moment();
      expect(txt, sp).toContain(sp === "de" ? "dein erster Satz zur Trajektorie ist bereits die Frage" : "your first sentence about the trajectory is already the question");
      expect(txt, sp).toContain(sp === "de" ? "ihr habt euch verbessert" : "you have improved");
    });
  });

  it("die Kontext-Kopftexte tragen die Wertepaar-Regel mit", () => {
    beide(sp => {
      const kt = K().korpusTexte;
      expect(kt["mk.prozessKopf"], sp).toContain(sp === "de" ? "höchstens ein Wertepaar je Gesprächsschritt" : "at most one pair of values per conversational step");
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
