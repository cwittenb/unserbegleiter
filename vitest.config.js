import { defineConfig } from "vitest/config";
import ReporterDE from "./scripts/reporter-de.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      // workerd-Runtime-Modul: im Build als `external` markiert, in Node nicht
      // auflösbar. Der Stub macht mailer.js in Ebene-1-Tests importierbar und
      // liefert einen skriptbaren Fake-Socket (S66).
      "cloudflare:sockets": path.join(ROOT, "tests/fixtures/cloudflare-sockets-stub.js"),
    },
  },
  test: {
    include: ["tests/**/*.spec.js"],
    exclude: ["tests/fixtures/**", "node_modules/**"],
    // Standard-Reporter für Details, dazu die deutsche Familien-Zusammenfassung
    reporters: ["default", new ReporterDE()],
    // Worker-Tests (Miniflare) brauchen etwas Luft
    testTimeout: 20000,
    coverage: {
      // Ehrliche Zahlen (S66): include zieht auch NIE geladene Dateien in den
      // Bericht (0 % statt unsichtbar) — so wäre mailer.js aufgefallen.
      // MESS-VORBEHALT: Die 87 Miniflare-Tests führen den Worker in workerd aus;
      // deren Pfade erscheinen hier als unbedeckt (worker/index.js, quota.js,
      // tokenstat.js …). Die Schwellen sind deshalb Regressionswächter knapp
      // unter dem Ist — keine Zielmarken.
      provider: "v8",
      include: ["core/**/*.js", "platforms/**/*.js", "scripts/**/*.js", "evals/**/*.js"],
      exclude: [
        "scripts/reporter-de.js",        // Test-Infrastruktur (bewusst untestbar)
        "evals/ergebnisse/**",
        "evals/szenarien/**",            // Daten, kein Code
      ],
      thresholds: { statements: 73, branches: 65, functions: 76, lines: 75 },   // Ist (S66): 74,4 / 67,0 / 78,2 / 77,2
      reporter: ["text", "json-summary"],
    },
  },
});
