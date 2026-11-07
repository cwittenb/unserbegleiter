// Prompt-Kanarien S73 — pinnen die Nachschärfungen aus den beiden
// Bestätigungs-Läufen (sonnet-4-6 / sonnet-5, 2026-07-18): Einzelraum-Verweis
// hat Priorität und wird nie durch die Krisenhilfe ersetzt; die Moment-
// Benennung trägt das exakte Fehlerbeispiel als Verbot; der Reflexions-Prompt
// bietet Merkposten bei offener Themenfrage sofort und konkret an.

import { describe, it, expect } from "vitest";
import * as DE from "../../core/prompts/prompts.de.js";
import * as EN from "../../core/prompts/prompts.en.js";

const faelle = [
  ["de", DE, {
    reihenfolge: "Immer beides, in dieser Reihenfolge",
    ersetztNicht: "ersetzt den Einzelraum-Verweis nicht",
    momentBeispiel: "eine Deutung des Paares ist eine Frage, keine Tatsache",
    momentVerwerfbar: "die Benennung des Moments selbst ist ein Angebot",
    merkTrigger: "sofort und konkret",
  }],
  ["en", EN, {
    reihenfolge: "Always both, in this order",
    ersetztNicht: "does not replace the individual-space referral",
    momentBeispiel: "an interpretation of the couple is a question, not a fact",
    momentVerwerfbar: "The naming of the moment itself is also an offer",
    merkTrigger: "immediately and concretely",
  }],
];

describe.each(faelle)("Prompt-Kanarien S73 · %s", (_sprache, P, T) => {
  it("Krisen-Weiche: Einzelraum zuerst, Krisenhilfe ersetzt ihn nie", () => {
    const p = P.aufloesungsPrompt("Anna", "Bernd");
    expect(p).toContain(T.reihenfolge);
    expect(p).toContain(T.ersetztNicht);
  });

  it("Momente: das Feststellungs-plus-Paardeutungs-Beispiel steht als Verbot im Baustein, die Benennung ist verwerfbar", () => {
    const p = P.momentPrompt("Anna", "Bernd");
    expect(p).toContain(T.momentBeispiel);
    expect(p).toContain(T.momentVerwerfbar);
  });

  it("Reflexionsgespräch: offene Themenfrage löst ein konkretes Merkposten-Angebot aus", () => {
    expect(P.reflexionsPrompt("Anna", "Bernd")).toContain(T.merkTrigger);
  });
});
