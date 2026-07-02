// Minimal-Konfiguration NUR für den kontrollierten Rot-Lauf des Frameworks.
// Enthält ausschließlich das absichtlich rote Fixture.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/fixtures/absichtlich-rot.spec.js"],
    reporters: ["default"],
  },
});
