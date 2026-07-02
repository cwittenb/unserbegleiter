// TEMPORÄR (Sprint 0, Schritt "Rot ist beweisbar rot"):
// Dieser Test MUSS fehlschlagen. Er beweist, dass ein Assert-Fehler den
// Gesamtlauf sichtbar bricht, bevor irgendein Fachcode existiert.
// Nach dem Beweis wandert er als Fixture unter tests/fixtures/ und wird
// vom dauerhaften framework.spec.js kontrolliert ausgeführt.

import { describe, it, expect } from "vitest";

describe("Kanarienvogel", () => {
  it("schlägt absichtlich fehl — Rot muss rot sein", () => {
    expect("dieser Lauf").toBe("absichtlich rot");
  });
});
