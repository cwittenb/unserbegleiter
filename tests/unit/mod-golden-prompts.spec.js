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
// BEFUND BEIM ANLEGEN (S143-Stand): Der Eval-Runner (sysPromptFuer) baute fuer
// solo und moment NICHT denselben Text wie die App — sessions.js haengt
// THEMEN_RAHMEN an, der Runner nicht. Der Snapshot hielt beide Hashes fest;
// `runnerGleichText` dokumentierte die Luecke.
// MOD-1 (Composition Root) hat sie geschlossen: Der Runner ruft dieselbe
// Komposition wie die App (Entscheidung E6 a). Die Text-Hashes blieben dabei
// byte-identisch — nur die Runner-Hashes fuer solo/moment zogen nach.
// Der Wert ist jetzt fuer alle Arten true; er bleibt als Test stehen, damit
// eine neue Nachbau-Stelle im Eval wieder auffaellt.

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

    it("Produktion ≡ Eval fuer jede Art (MOD-1; vorher solo/moment ohne THEMEN_RAHMEN im Eval)", () => {
      for (const art of SESSION_ARTEN) {
        expect({ art, gleich: ist.sessions[art].runnerGleichText }).toEqual({ art, gleich: true });
        expect(ist.sessions[art].runner).toBe(ist.sessions[art].text);
      }
      expect(ist.sessions.qualitytime.runner).toBe(ist.sessions.qualitytime.text);
    });

    it("Snapshot kennt genau die registrierten Session-Arten", () => {
      expect(Object.keys(soll.sessions).sort()).toEqual([...SESSION_ARTEN, "qualitytime"].sort());
    });
  });
}
