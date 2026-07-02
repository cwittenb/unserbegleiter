// "Test des Tests" — die dauerhafte Form des Kanarienvogels.
// Führt Vitest kontrolliert auf dem absichtlich roten Fixture aus und
// beweist: ein Assert-Fehler schlägt als Nicht-Null-Exit-Code durch.
// Fällt DIESER Test, ist das Testframework selbst nicht vertrauenswürdig.

import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("Testframework", () => {
  it("ein fehlschlagendes Assert bricht den Lauf (Exit-Code ≠ 0)", () => {
    const r = spawnSync(
      process.execPath,
      [
        path.join(ROOT, "node_modules/vitest/vitest.mjs"),
        "run",
        "--config", "tests/fixtures/vitest.fixture.config.js",
      ],
      { cwd: ROOT, encoding: "utf8", timeout: 60000 }
    );
    const ausgabe = r.stdout + r.stderr;
    expect(r.status, "Exit-Code des Fixture-Laufs").not.toBe(0);
    // Der Fehlschlag muss aus dem Assert kommen, nicht aus einem Startfehler:
    expect(ausgabe).toContain("absichtlich rot");
    expect(ausgabe).toMatch(/1 failed/);
    expect(ausgabe).not.toContain("Startup Error");
  });

  it("das rote Fixture ist vom Hauptlauf ausgeschlossen", async () => {
    // Wäre es eingeschlossen, wäre dieser Lauf hier selbst rot —
    // zusätzlich prüfen wir die Konfiguration explizit.
    const cfg = (await import(path.join(ROOT, "vitest.config.js"))).default;
    expect(cfg.test.exclude).toContain("tests/fixtures/**");
  });
});
