import { defineConfig } from "vitest/config";
import ReporterDE from "./scripts/reporter-de.js";

export default defineConfig({
  test: {
    include: ["tests/**/*.spec.js"],
    exclude: ["tests/fixtures/**", "node_modules/**"],
    // Standard-Reporter für Details, dazu die deutsche Familien-Zusammenfassung
    reporters: ["default", new ReporterDE()],
    // Worker-Tests (Miniflare) brauchen etwas Luft
    testTimeout: 20000,
  },
});
