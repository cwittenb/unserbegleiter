// S95.8b · Der Wortlaut-Abruf.
//
// Der Begleiter kennt die Zeitleiste — drei bis fünf Sätze je Sitzung —, aber
// nicht den Wortlaut. Wie ein Mensch, der sich an den Kern erinnert und das
// Material dann holt, statt es auswendig zu können.
//
// Zwei Eigenschaften tragen den Entwurf, und beide sind hier mechanisch
// abgesichert, statt nur im Prompt zu stehen:
//
//   · Der Begleiter kann SEHEN, wo etwas zu holen ist (die Kennung im
//     Kontext). Ohne das sagt er »ja, gern« und findet nichts.
//   · Findet sich nichts, sagt die Antwort ausdrücklich, dass der Weg über die
//     Zeitleiste geht. Ein ehrliches »ich finde nichts« ohne den Hinweis
//     ließe die Person mit dem Eindruck zurück, es ginge nicht — und die
//     Begrenzung, die wir bewusst gewählt haben, sähe aus wie ein Defekt.

import { describe, it, expect } from "vitest";
import { abrufBlockSchema } from "../../core/contracts/schemas.js";
import { BLOECKE } from "../../core/contracts/registry.js";
import { WIRE_KOEPFE, istWireNachricht } from "../../core/contracts/steuertoken.js";
import { baueSoloKontext } from "../../core/ui/sessions.js";
import { steuerTexte as steuerDe } from "../../core/prompts/prompts.de.js";
import { steuerTexte as steuerEn } from "../../core/prompts/prompts.en.js";

describe("S95.8b · Der Block", () => {
  it("ist im Register und unsichtbar — das Holen ist Mechanik", () => {
    expect(BLOECKE.abruf.start).toBe("RECALL-BLOCK");
    expect(BLOECKE.abruf.placeholder).toBe("");
  });

  it("verlangt genau eine Kennung", () => {
    expect(abrufBlockSchema({ vid: "1700-abc" })).toEqual([]);
    expect(abrufBlockSchema({})).toHaveLength(1);
    expect(abrufBlockSchema({ vid: "  " })).toHaveLength(1);
  });

  it("EINE je Abruf — mehrere wären viel Kontext und eine unübersichtliche Auswahl", () => {
    expect(abrufBlockSchema({ vid: "a", vid2: "b" })).toHaveLength(1);
    expect(abrufBlockSchema({ vid: "a", andere: [] })).toHaveLength(1);
  });

  it("die Antwort der App ist eine Protokoll-Nachricht und bleibt unsichtbar", () => {
    expect(WIRE_KOEPFE).toContain("RECALL-RESULT");
    expect(istWireNachricht({ role: "user", content: "RECALL-RESULT\nI: …" })).toBe(true);
  });
});

describe("S95.8b · Der Begleiter sieht, wo etwas zu holen ist", () => {
  const zeitleiste = {
    entries: [
      { at: "2026-07-01T10:00:00Z", topics: ["Abende"], summary: "Ohne Wortlaut.", },
      { at: "2026-07-08T10:00:00Z", topics: ["Abende"], summary: "Mit Wortlaut.", vid: "1700-abc" },
    ],
  };

  it("Einträge mit Verlauf tragen ihre Kennung", () => {
    const k = baueSoloKontext({ timeline: zeitleiste });
    expect(k).toContain("{vid:1700-abc}");
  });

  it("Einträge ohne Verlauf tragen keine — er sieht, dass es dort nichts gibt", () => {
    const k = baueSoloKontext({ timeline: zeitleiste });
    const zeile = k.split("\n").find(z => z.includes("Ohne Wortlaut."));
    expect(zeile).not.toContain("{vid:");
  });

  it("die Zusammenfassung bleibt lesbar — sie ist der Suchraum", () => {
    const k = baueSoloKontext({ timeline: zeitleiste });
    expect(k).toContain("Mit Wortlaut.");
    expect(k).toContain("Abende");
  });
});

describe("S95.8b · RCL-02 und RCL-02b sind in der Antwort verankert", () => {
  for (const [name, st] of [["DE", steuerDe], ["EN", steuerEn]]) {
    it(name + ": die Leer-Antwort verbietet Erfinden ausdrücklich (RCL-02)", () => {
      expect(st.abrufLeer).toMatch(/Erfinde nichts|Invent nothing/);
    });

    it(name + ": die Leer-Antwort NENNT den Rückfallweg (RCL-02b)", () => {
      expect(st.abrufLeer).toMatch(/Zeitleiste|timeline/i);
      expect(st.abrufLeer).toMatch(/sagen, welche|tell you which/i);
    });

    it(name + ": die Fund-Antwort trägt die Kennung und den Auftrag zur Eignung", () => {
      expect(st.abrufGefunden).toContain("{vid}");
      expect(st.abrufGefunden).toMatch(/Eignung|suitability/i);
    });
  }
});
