// Build-Beweis: beide Zielformen entstehen und tragen denselben Kern.
// (Vorstufe des Paritäts-Wächters aus S6 — hier über die Versionskonstante.)

import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildArtifact } from "../../scripts/build-artifact.js";
import { buildPages } from "../../scripts/build-pages.js";
import { CORE_VERSION } from "../../core/index.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("Build · Artefakt (Entwicklungsumgebung)", () => {
  it("erzeugt eine Single-File-HTML mit inliniertem Kern", async () => {
    const { out } = await buildArtifact();
    const html = await readFile(out, "utf8");
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).not.toContain("/*__BUNDLE__*/");      // Platzhalter ersetzt
    expect(html).toContain(CORE_VERSION);              // Kern ist wirklich drin
    expect(html).not.toMatch(/<script[^>]*src=/i);     // keine externen Skripte
  });
});

describe("Build · Cloudflare", () => {
  it("erzeugt Worker-Bundle + wrangler.toml mit demselben Kern", async () => {
    const { outDir } = await buildPages();
    const worker = await readFile(path.join(outDir, "worker.js"), "utf8");
    const toml = await readFile(path.join(outDir, "wrangler.toml"), "utf8");
    expect(worker).toContain(CORE_VERSION);
    expect(toml).toContain('name = "paarbegleitung"');
  });
});
