// PRV-1a · Redaktion A: Dev-Changelog raus, Betonungs-CAPS zurueck in Schrift.
//
// Was dieser Test haelt:
//   1. entferneKommentare() — Begruendungen bleiben in den .md-Quellen als
//      <!-- … -->, das Generat traegt sie nicht (Zeile samt Umbruch bzw. Satz
//      samt dem einen Leerzeichen davor).
//   2. Kein Sprint-Changelog im Modellprompt: keine "(S103)"-Referenzen, kein
//      Kommentar-Rest in den generierten Korpusdateien.
//   3. Die CAPS-Diaet: Betonungs-CAPS je Prompt unter einer Obergrenze
//      (gemessen wie in scripts/prompt-masse.js). Die Sperrklinke aus PRV-0
//      haelt den genauen Wert; hier steht die Decke, unter der die Serie bleibt.
//
// Inhaltsgleichheit (PRV-1a hat keine Regel entfernt) wurde beim Bau des
// Patches gegen den Stand c1f2adc bewiesen: alter und neuer Prompt sind nach
// Kleinschreibung, ohne Sprint-Referenzen und ss/ß-gleich byte-identisch
// (docs/SPRINT-PRV-1A-PROTOKOLL.md). Das laesst sich nicht als Dauertest
// halten — der alte Stand ist weg; deshalb steht es dort als Nachweis.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { entferneKommentare, ZIELE, zielPfad } from "../../scripts/build-korpus.js";
import { baueMasse, SESSION_ARTEN } from "../../scripts/prompt-masse.js";

describe("PRV-1a · entferneKommentare", () => {
  it("Kommentar auf eigener Zeile verschwindet samt Zeile", () => {
    expect(entferneKommentare("a\n<!-- Grund -->\nb")).toBe("a\nb");
    expect(entferneKommentare("a\n  <!-- Grund\n   zweizeilig -->  \nb")).toBe("a\nb");
  });
  it("Kommentar im Satz verschwindet samt dem Leerzeichen davor", () => {
    expect(entferneKommentare("PAARIG: <!-- (S103) aus dem Lauf gelernt --> Dieser Kontrast")).toBe("PAARIG: Dieser Kontrast");
    expect(entferneKommentare("ein Verstoß: <!-- Grund --> Sie schickt")).toBe("ein Verstoß: Sie schickt");
  });
  it("Text ohne Kommentar bleibt byte-identisch (auch Dateiende ohne Umbruch)", () => {
    const t = "Zeile eins\nZeile zwei";
    expect(entferneKommentare(t)).toBe(t);
  });
  it("laesst {{…}} und JSON-Vorlagen unberuehrt", () => {
    const t = "{{policies.notFrage}}\nGATE-BLOCK\n{\"a\":1}\nEND GATE-BLOCK";
    expect(entferneKommentare(t)).toBe(t);
  });
});

describe("PRV-1a · kein Changelog im Modellprompt", () => {
  for (const sprache of ["de", "en"]) {
    it(sprache + " · generierte Korpusdateien tragen keinen <!-- --> Rest im Text", () => {
      for (const ziel of ZIELE) {
        const q = readFileSync(zielPfad(sprache, ziel), "utf8");
        expect(q.includes("<!--"), ziel).toBe(false);
      }
    });
  }
});

for (const sprache of ["de", "en"]) {
  describe("PRV-1a · Sperrklinke der Redaktion · " + sprache, async () => {
    const m = await baueMasse(sprache);
    /* Decken nach PRV-1a (gemessen): solo 213/242, moment 209/220, einzel 99/116,
       gemeinsam 132/153, qualitytime 14/16 (de/en). Was bleibt, sind Abschnitts-
       und Regel-Labels ("TEILEN:", "SPIEGEL-GRAMMATIK:") und Protokoll-Tokens
       in Anfuehrungszeichen — keine Betonung mitten im Satz mehr. */
    const DECKE = { solo: 250, moment: 230, einzel: 120, gemeinsam: 160, qualitytime: 20 };
    for (const art of SESSION_ARTEN) {
      it(art + " · keine Sprint-Referenzen, CAPS unter der Decke", () => {
        expect(m.sessions[art].sprintRefs, "sprintRefs").toBe(0);
        expect(m.sessions[art].verstossWoerter, "VERSTOSS/VIOLATION").toBe(0);
        expect(m.sessions[art].genauWoerter, "GENAU/EXACTLY als Betonung").toBeLessThanOrEqual(1);
        expect(m.sessions[art].capsWoerter, "capsWoerter").toBeLessThanOrEqual(DECKE[art]);
      });
    }
  });
}
