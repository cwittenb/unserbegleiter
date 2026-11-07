// Prompt-Kanarien S72 — pinnen die beiden Priorität-1-Antworten auf den
// sonnet-5-Eval-Lauf: (1) Krisen-Weiche für geteilte Räume (KRIS-02 ⚑,
// Entscheidung E1) in Auflösung UND Moment-Session, (2) hartes
// Stapel-Wiedergabe-Verbot im Aufdeck-AUFTAKT (AUFD-01). Beide Sprachen.

import { describe, it, expect } from "vitest";
import * as DE from "../../core/prompts/prompts.de.js";
import * as EN from "../../core/prompts/prompts.en.js";

const faelle = [
  ["de", DE, {
    weiche: "KRISEN-VORRANG IM GETEILTEN RAUM",
    keinNachfassen: "ohne Nachfassen",
    keineSicherheitsfrage: "weil vor dem Partner ein ehrliches Nein nicht möglich ist",
    einzelraum: "geschützten Einzelraum",
    keinAuftrag: "bleibt Partner – die Sicherheit der Person liegt bei ihr",
    skalen1: "Wie frei kannst du dich hier gerade zeigen?",
    verbot: "DIE TAFEL ZEIGT DIE STAPEL",
    verbotBeispiel: "dein Text kommt in jeder Form ohne sie aus",
    nurRichtung: "nennt die Richtung (wessen Stapel), sonst nichts",
  }],
  ["en", EN, {
    weiche: "CRISIS PRIORITY IN THE SHARED ROOM",
    keinNachfassen: "without follow-up",
    keineSicherheitsfrage: "because in front of the partner an honest no is not possible",
    einzelraum: "protected individual space",
    keinAuftrag: "remains the partner – the person's safety rests with them",
    skalen1: "How freely can you show yourself here right now?",
    verbot: "THE BOARD SHOWS THE STACKS",
    verbotBeispiel: "your text does without them in every form",
    nurRichtung: "names the direction (whose stack), nothing else",
  }],
];

describe.each(faelle)("Prompt-Kanarien S72 · %s", (_sprache, P, T) => {
  it("Auflösung trägt die Krisen-Weiche vollständig (E1: eine Skalen-Frage, kein Nachfassen, Einzelraum, Partner ohne Auftrag)", () => {
    const p = P.aufloesungsPrompt("Anna", "Bernd");
    for (const anker of [T.weiche, T.keinNachfassen, T.keineSicherheitsfrage, T.einzelraum, T.keinAuftrag, T.skalen1])
      expect(p, anker).toContain(anker);
  });

  it("Moment-Session (ebenfalls geteilter Raum) nutzt dieselbe Weiche statt des generischen Vorrangs", () => {
    const p = P.momentPrompt("Anna", "Bernd");
    expect(p).toContain(T.weiche);
  });

  it("Einzel- und Solo-Session behalten den generischen Krisen-Vorrang (kein Einzelraum-Verweis auf sich selbst)", () => {
    expect(P.klaerungsPrompt("Anna", "Bernd")).not.toContain(T.weiche);
    expect(P.reflexionsPrompt("Anna", "Bernd")).not.toContain(T.weiche);
  });

  it("AUFTAKT trägt das harte Wiedergabe-Verbot mit Beispiel und Richtung-statt-Inhalt", () => {
    const p = P.aufloesungsPrompt("Anna", "Bernd");
    for (const anker of [T.verbot, T.verbotBeispiel, T.nurRichtung])
      expect(p, anker).toContain(anker);
  });
});
