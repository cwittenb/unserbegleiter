// PRV-1c (F8) · Prime-Probe: Die Verbots-Beispiele der Urteils-Grammatik
// verlassen den Prompt.
//
// Hypothese: Haikus Standard-Eroeffnung ("Das ist eine wichtige Einsicht",
// SYC-05 3/3 in S144c und S146) ist ein Prime — der Satz stand woertlich als
// Verbot in der URTEILS-GRAMMATIK. Drei Sprints, die die Regel schaerfer
// formulierten, haben ihn nicht bewegt. PRV-1c nimmt die zitierten Urteile
// aus allen Prompts (sie stehen als Kommentar in den Quellen) und setzt an
// ihre Stelle eine positive Eroeffnungsregel: Der erste Satz beginnt mit
// "Ich …" oder beschreibt, was die Person gerade tut.
//
// Dieser Branch wird erst nach dem Eval gemergt (Haiku n=5 SYC-05/06,
// GATE-S1; Sonnet/Medium n=3 als Regressionsschutz). Faellt er durch, bleibt
// er als dokumentierter Negativbefund liegen (Ruecknahmeregel S136).

import { describe, it, expect } from "vitest";

const VERBOTEN = {
  de: ["Das ist mutig", "Das ist eine wichtige Einsicht", "Das klingt nach einem echten Moment", "Was für ein",
       "Das ist ein großer Satz", "Das ist ein echter Berührungspunkt", "wichtiger Moment zum Einstieg",
       "Das ist nicht wenig", "Ich höre da etwas Wichtiges"],
  en: ["That is brave", "That's an important insight", "That sounds like a real moment", "What a ",
       "That is a big sentence", "That is a real touching point", "important moment to start with",
       "That is no small thing", "I hear something important there"],
};
const ARTEN = ["solo", "moment", "einzel", "gemeinsam", "qualitytime"];
const KTX = { me: "Anna", partner: "Bernd", nameA: "Anna", nameB: "Bernd" };

for (const sprache of ["de", "en"]) {
  describe("PRV-1c · keine zitierten Urteile im Prompt · " + sprache, async () => {
    const P = await import("../../core/prompts/prompts.js");
    if (sprache === "en" && !P.istKorpusDa("en")) P.registerKorpus("en", await import("../../core/prompts/prompts.en.js"));
    const { baueSystemText } = await import("../../core/komposition.js");
    for (const art of ARTEN) {
      it(art, () => {
        const t = baueSystemText(art, KTX, { sprache });
        for (const v of VERBOTEN[sprache]) expect(t.includes(v), v).toBe(false);
      });
    }
    it("die positive Eröffnungsregel steht in jeder Gesprächs-Session", () => {
      const anker = sprache === "de" ? "Dein erster Satz beginnt mit „Ich …“" : "your first sentence begins with “I …”";
      for (const art of ["solo", "moment", "einzel", "gemeinsam"]) expect(baueSystemText(art, KTX, { sprache }), art).toContain(anker);
    });
  });
}
