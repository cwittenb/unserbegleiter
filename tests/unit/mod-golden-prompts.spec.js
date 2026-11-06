// MOD-0 · Golden-Snapshot der Systemprompte.
//
// Die MOD-Serie (Schichten-Entkopplung: KI · Prompts · Policies · Wissen)
// bewegt Inhalt zwischen Dateien, ohne den Text zu aendern, den das Modell
// sieht. Dieser Test ist die Byte-Identitaets-Bremse: je Session-Art, Sprache
// und Pfad ein SHA-256 gegen tests/fixtures/golden/prompts-<sprache>.json.
//
// Bewusste Aktualisierung NUR ueber `node scripts/golden-prompts.js --schreibe`
// — und dann mit Begruendung im Sprintprotokoll. Ein stilles Rot hier heisst:
// ein Umbau hat den Prompt veraendert.
//
// BEFUND BEIM ANLEGEN (S143-Stand): Der Eval-Runner (sysPromptFuer) baut fuer
// solo und moment NICHT denselben Text wie die App — sessions.js haengt
// THEMEN_RAHMEN an, der Runner nicht. Der Snapshot haelt beide Hashes fest;
// `runnerGleichText` dokumentiert die Luecke. MOD-1 (Composition Root)
// schliesst sie — dann wird dieser Wert hier auf true gedreht, nicht geloescht.

import { describe, it, expect } from "vitest";
import { baueGolden, liesGolden, SESSION_ARTEN } from "../../scripts/golden-prompts.js";

for (const sprache of ["de", "en"]) {
  describe("MOD-0 · Golden-Prompts · " + sprache, async () => {
    const soll = liesGolden(sprache);
    const ist = await baueGolden(sprache);

    for (const art of [...SESSION_ARTEN, "qualitytime"]) {
      it(art + " · Textpfad byte-identisch zum Snapshot", () => {
        expect(ist.sessions[art].text).toBe(soll.sessions[art].text);
        expect(ist.sessions[art].textLaenge).toBe(soll.sessions[art].textLaenge);
      });
      if (soll.sessions[art].struktur) {
        it(art + " · Strukturpfad (Praeambel + Text) byte-identisch", () => {
          expect(ist.sessions[art].struktur).toBe(soll.sessions[art].struktur);
        });
      }
      it(art + " · Eval-Runner-Pfad byte-identisch", () => {
        expect(ist.sessions[art].runner).toBe(soll.sessions[art].runner);
      });
    }

    it("Luecke Produktion ≠ Eval ist festgehalten (solo, moment: THEMEN_RAHMEN) — MOD-1 dreht das", () => {
      expect(ist.sessions.solo.runnerGleichText).toBe(soll.sessions.solo.runnerGleichText);
      expect(ist.sessions.moment.runnerGleichText).toBe(soll.sessions.moment.runnerGleichText);
      expect(ist.sessions.einzel.runnerGleichText).toBe(true);
      expect(ist.sessions.gemeinsam.runnerGleichText).toBe(true);
    });

    it("Snapshot kennt genau die registrierten Session-Arten", () => {
      expect(Object.keys(soll.sessions).sort()).toEqual([...SESSION_ARTEN, "qualitytime"].sort());
    });
  });
}
