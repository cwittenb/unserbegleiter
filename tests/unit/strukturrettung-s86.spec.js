// S86 — Extraktor-Robustheit, Beleg-Stil j7, Überklärungs-Grenze.
// Anlass: keyless-Lauf 2026-07-19T16:33 — 4 Samples unrettbar (unverschlossener
// ```json-Zaun; gerade Anführungszeichen im Beleg ⇒ ungültiges JSON) und
// AUFD-01 2/3 verletzt (Rückversicherungs-Schleifen der Zustimmungs-Grammatik
// verbrauchen den Marken-Zug).

import { describe, it, expect } from "vitest";
import { extrahiereStrukturAusText, escapeSteuerzeichenInStrings } from "../../core/llm/adapter.js";
import * as DE from "../../core/prompts/prompts.de.js";
import * as EN from "../../core/prompts/prompts.en.js";

describe("S86 · Extraktor: unverschlossene Zäune", () => {
  it("rettet das real beobachtete Muster: ```json ohne schließenden Zaun (stop=end_turn)", () => {
    const text = '```json\n{"checks":[{"id":"C1","verdict":"no","evidence":"«kein Beleg»"}]}';
    expect(extrahiereStrukturAusText(text)).toEqual({ checks: [{ id: "C1", verdict: "no", evidence: "«kein Beleg»" }] });
  });

  it("bevorzugt weiterhin den geschlossenen Zaun und ignoriert Prosa danach", () => {
    const text = 'Vorwort {nicht dies} \n```json\n{"checks":[]}\n```\nNachwort mit } Klammer';
    expect(extrahiereStrukturAusText(text)).toEqual({ checks: [] });
  });

  it("leerer Zaun stört nicht — die Klammer-Kandidaten greifen", () => {
    expect(extrahiereStrukturAusText('```json\n```\n{"checks":[]}')).toEqual({ checks: [] });
  });
});

describe("S86 · Extraktor: Steuerzeichen in Strings", () => {
  it("escapt literale Zeilenumbrüche NUR innerhalb von String-Literalen", () => {
    const kaputt = '{\n  "evidence": "Zeile eins\nZeile zwei"\n}';
    expect(() => JSON.parse(kaputt)).toThrow();
    expect(JSON.parse(escapeSteuerzeichenInStrings(kaputt))).toEqual({ evidence: "Zeile eins\nZeile zwei" });
  });

  it("Rettung über die zweite Parse-Runde: mehrzeiliger Beleg im Zaun", () => {
    const text = '```json\n{"checks":[{"id":"C1","verdict":"yes","evidence":"«Schön, dass ihr da seid —\nwillkommen zurück»"}]}\n```';
    const d = extrahiereStrukturAusText(text);
    expect(d.checks[0].evidence).toContain("willkommen zurück");
  });

  it("bereits escapte Sequenzen bleiben unangetastet (Idempotenz auf gültigem JSON)", () => {
    const gueltig = '{"a":"x\\ny","b":"z\\"w"}';
    expect(escapeSteuerzeichenInStrings(gueltig)).toBe(gueltig);
    expect(JSON.parse(escapeSteuerzeichenInStrings(gueltig))).toEqual({ a: "x\ny", b: 'z"w' });
  });

  it("rät weiterhin nie: unescapte gerade Anführungszeichen im String bleiben unrettbar (Aufgabe j7)", () => {
    const kaputt = '{"evidence":"sie schreibt ("Anna: …") und mehr"}';
    expect(extrahiereStrukturAusText(kaputt)).toBe(null);
  });
});

describe("S86 · Überklärungs-Grenze und Marken-Anschluss (Kanarien)", () => {
  const faelle = [
    ["de", DE, {
      grenze: "ÜBERKLÄRUNGS-GRENZE",
      beispiel: '"Anna, auch von dir ein kurzes Ja" nach ihrem präfixierten Ja ist ein Verstoß',
      beide: "liegen damit BEIDE Okays vor",
      marke: "folgt die Marke SOFORT",
      keineRueckfrage: "Keine Rückversicherungs-Frage dazwischen",
    }],
    ["en", EN, {
      grenze: "OVER-CLARIFICATION LIMIT",
      beispiel: '"Anna, a short yes from you too" after her prefixed yes is a violation',
      beide: "BOTH okays are thereby given",
      marke: "the mark follows IMMEDIATELY",
      keineRueckfrage: "no reassurance question in between",
    }],
  ];

  it.each(faelle)("%s: ausdrückliches Ja wird nie erneut abgefragt; präfixierte Doppel-Antwort = beide Okays", (_s, P, T) => {
    const b = P.bausteine.zustimmungsGrammatik;
    expect(b).toContain(T.grenze);
    expect(b).toContain(T.beispiel);
    expect(b).toContain(T.beide);
  });

  it.each(faelle)("%s: nach beiden Okays + Wahl folgt die Marke sofort — keine Rückversicherung", (_s, P, T) => {
    const p = P.aufloesungsPrompt("Anna", "Bernd");
    expect(p).toContain(T.marke);
    expect(p).toContain(T.keineRueckfrage);
  });
});
