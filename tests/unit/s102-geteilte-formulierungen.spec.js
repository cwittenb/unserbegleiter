// S102 · Vier Formulierungen, die zweimal im Korpus standen.
//
// Gemessen wurde über 8-Wort-Fenster zwischen allen vier Prompts, nach Abzug
// der bestehenden Bausteine. Der Befund war nicht "doppelt" — es war DRIFT:
// Jede Fassung trug etwas, das der anderen fehlte. Dasselbe Muster wie bei der
// Regie-Übergabe (dreimal entdeckt, S99–S101), hier aber auf Pfaden, an denen
// es um Sicherheit geht.
//
// Was die Zusammenlegung konkret gebracht hat, steht unten als Prüfung: Das
// Reflexionsgespräch bekommt drei Dinge, die es vorher nicht hatte.

import { describe, it, expect } from "vitest";
import {
  bausteine, reflexionsPrompt, klaerungsPrompt, momentPrompt, aufloesungsPrompt,
} from "../../core/prompts/prompts.de.js";
import {
  bausteine as bausteineEn, reflexionsPrompt as reflexionsPromptEn,
  klaerungsPrompt as klaerungsPromptEn, momentPrompt as momentPromptEn,
  aufloesungsPrompt as aufloesungsPromptEn,
} from "../../core/prompts/prompts.en.js";

const DE = { reflexion: reflexionsPrompt, klaerung: klaerungsPrompt, moment: momentPrompt, aufloesung: aufloesungsPrompt };
const EN = { reflexion: reflexionsPromptEn, klaerung: klaerungsPromptEn, moment: momentPromptEn, aufloesung: aufloesungsPromptEn };
const p = (m, k) => m[k]("Anna", "Bernd");

describe("S102 · Die vier Bausteine existieren in beiden Sprachen", () => {
  for (const [name, k] of [["DE", bausteine], ["EN", bausteineEn]]) {
    it(name + ": widerspruchsForm, notFrage, gewaltNichtEinfuehren, endSignal", () => {
      expect(typeof k.widerspruchsForm).toBe("string");
      expect(typeof k.notFrage).toBe("function");
      expect(typeof k.gewaltNichtEinfuehren).toBe("function");
      expect(typeof k.endSignal).toBe("function");
    });
  }
});

describe("S102 · Jeder Baustein steht dort, wo er vorher zweimal stand", () => {
  it("Widerspruchs-Form: Auftragsklärung und Reflexionsgespräch", () => {
    for (const m of [DE, EN]) {
      const f = m === DE ? bausteine.widerspruchsForm : bausteineEn.widerspruchsForm;
      expect(p(m, "klaerung")).toContain(f);
      expect(p(m, "reflexion")).toContain(f);
    }
  });

  it("Not-Frage: dreimal, zweimal lang und einmal kurz", () => {
    for (const [m, k] of [[DE, bausteine], [EN, bausteineEn]]) {
      expect(p(m, "klaerung")).toContain(k.notFrage());
      expect(p(m, "reflexion")).toContain(k.notFrage());
      expect(p(m, "aufloesung")).toContain(k.notFrage(false));
    }
  });

  it("Gewalt-Klärung: Auftragsklärung und Reflexionsgespräch", () => {
    for (const [m, k] of [[DE, bausteine], [EN, bausteineEn]]) {
      const t = k.gewaltNichtEinfuehren("Anna", "Bernd");
      expect(p(m, "klaerung")).toContain(t);
      expect(p(m, "reflexion")).toContain(t);
    }
  });

  it("End-Signal: Qualitätszeit und Reflexionsgespräch, je eigene Klärungsfrage", () => {
    for (const m of [DE, EN]) {
      const kern = m === DE ? "END-SIGNALE ERNST NEHMEN" : "END SIGNALS SERIOUSLY";
      expect(p(m, "moment")).toContain(kern);
      expect(p(m, "reflexion")).toContain(kern);
    }
    // Die Klärungsfrage bleibt Parameter: "ihr" im geteilten Raum, "du" im eigenen.
    expect(p(DE, "moment")).toContain("Mögt ihr hier für heute schließen");
    expect(p(DE, "reflexion")).toContain("Magst du hier für heute schließen");
  });
});

describe("S102 · Was die Zusammenlegung gebracht hat", () => {
  // Das ist der eigentliche Ertrag: Die kürzere Fassung erbt, was ihr fehlte.
  it("das Reflexionsgespräch kennt jetzt das Gegenbeispiel zur Gewalt-Abfrage", () => {
    expect(p(DE, "reflexion")).toContain("Gibt es körperliche Gewalt?");
    expect(p(EN, "reflexion")).toContain("Is there physical violence?");
  });

  it("… und den genauen Mechanismus der Gefährdung", () => {
    // Vorher stand dort nur "falls Bernd mitliest" — ohne den Ort (Chatverlauf)
    // und ohne das, was Bernd tatsächlich sieht (das Transkript).
    expect(p(DE, "reflexion")).toContain("im Chatverlauf");
    expect(p(DE, "reflexion")).toContain("das Transkript sieht");
    expect(p(EN, "reflexion")).toContain("in the chat history");
  });

  it("… und das Gegenbeispiel für die verbotene Themenrunde", () => {
    expect(p(DE, "reflexion")).toContain("Was ist heute sonst noch da");
    expect(p(EN, "reflexion")).toContain("What else is here today");
  });
});

describe("S102 · Was NICHT mitgewandert ist — und warum", () => {
  it("die Auflösung behält die kurze Not-Frage ohne Experiment-Einladung", () => {
    // Im geteilten Raum lädt man nicht eine Person vor der anderen zu einem
    // Experiment ein. Die kurze Fassung ist eine Entscheidung, kein Versehen.
    expect(p(DE, "aufloesung")).not.toContain("kleinen Experiment einladen");
    expect(p(EN, "aufloesung")).not.toContain("invite you to a small experiment");
  });

  it("die Weiterleitung in den Stützmodus bleibt bei der Auftragsklärung", () => {
    // Der Stützmodus existiert nur dort. Ihn ins Reflexionsgespräch zu
    // kopieren hieße, auf einen Modus zu verweisen, den es nicht gibt.
    // Ob das Reflexionsgespräch einen eigenen braucht, ist eine offene
    // Produktfrage — siehe docs/SPRINT-S102-PROTOKOLL.md §3.
    expect(p(DE, "klaerung")).toContain("oder direkt Stützmodus");
    expect(p(DE, "reflexion")).not.toContain("oder direkt Stützmodus");
  });

  it("die Widerspruchs-PFLICHT bleibt beim Reflexionsgespräch", () => {
    // Geteilt wird die FORM, nicht die Verbindlichkeit: Nur dort ist
    // Widerspruch an drei Auslösern nicht optional.
    expect(p(DE, "reflexion")).toContain("WIDERSPRUCHS-PFLICHT");
    expect(p(DE, "klaerung")).not.toContain("WIDERSPRUCHS-PFLICHT");
    expect(p(DE, "klaerung")).toContain("Widerspruch als Angebot");
  });
});
