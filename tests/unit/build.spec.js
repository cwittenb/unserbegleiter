// Build-Beweis: beide Zielformen entstehen und tragen denselben Kern.
// (Vorstufe des Paritäts-Wächters aus S6 — hier über die Versionskonstante.)
// Alle Build-Aufrufe schreiben in temporäre Verzeichnisse; das echte dist/
// bleibt beim Testen unberührt (afterAll räumt auf).

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFile, readdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildArtifact } from "../../scripts/build-artifact.js";
import { buildPages } from "../../scripts/build-pages.js";
import { CORE_VERSION } from "../../core/index.js";

describe("Build · Artefakt (Entwicklungsumgebung)", () => {
  let outDir;
  beforeAll(async () => { outDir = await mkdtemp(path.join(tmpdir(), "ub-artefakt-")); });
  afterAll(async () => { await rm(outDir, { recursive: true, force: true }); });

  it("erzeugt eine Single-File-HTML mit inliniertem Kern", async () => {
    const { out } = await buildArtifact({ outDir });
    const html = await readFile(out, "utf8");
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).not.toContain("/*__BUNDLE__*/");      // Platzhalter ersetzt
    expect(html).toContain(CORE_VERSION);              // Kern ist wirklich drin
    expect(html).not.toMatch(/<script[^>]*src=/i);     // keine externen Skripte
  });

  it("Dateiname trägt Build-Stempel + Kern-Kurzhash; alte Stände werden aufgeräumt", async () => {
    const a = await buildArtifact({ outDir });
    expect(path.basename(a.out)).toMatch(/^paarbegleitung-dev_\d{4}-\d{2}-\d{2}_\d{4}_[0-9a-f]{8}\.html$/);
    const html = await readFile(a.out, "utf8");
    expect(html).toContain("Stand " + a.stamp + " UTC · Kern " + a.hash.slice(0, 8));
    const b = await buildArtifact({ outDir });           // zweiter Build …
    const dateien = (await readdir(path.dirname(b.out))).filter(f => f.startsWith("paarbegleitung-dev_"));
    expect(dateien).toHaveLength(1);                     // … hinterlässt genau EINEN Stand
  });
});

describe("Build · Cloudflare", () => {
  let outDir;
  beforeAll(async () => { outDir = await mkdtemp(path.join(tmpdir(), "ub-cloudflare-")); });
  afterAll(async () => { await rm(outDir, { recursive: true, force: true }); });

  it("erzeugt Worker-Bundle + wrangler.toml mit demselben Kern", async () => {
    await buildPages({ outDir });
    const worker = await readFile(path.join(outDir, "worker.js"), "utf8");
    const toml = await readFile(path.join(outDir, "wrangler.toml"), "utf8");
    expect(worker).toContain(CORE_VERSION);
    expect(toml).toContain('name = "paarbegleitung"');
  });

  it("PAARE_KV_ID → schreibt den KV-Block ENT-kommentiert mit der ID (übersteht Rebuilds)", async () => {
    const alt = process.env.PAARE_KV_ID;
    process.env.PAARE_KV_ID = "test-kv-id-123";
    try {
      await buildPages({ outDir });
      const toml = await readFile(path.join(outDir, "wrangler.toml"), "utf8");
      expect(toml).toMatch(/^\[\[kv_namespaces\]\]/m);          // nicht auskommentiert
      expect(toml).toContain('binding = "PAARE"');
      expect(toml).toContain('id = "test-kv-id-123"');
      expect(toml).not.toContain('# id = "…"');
    } finally {
      if (alt === undefined) delete process.env.PAARE_KV_ID; else process.env.PAARE_KV_ID = alt;
    }
  });

  it("ohne Umgebungsvariable: nimmt die ID aus der committeten deploy.config.js", async () => {
    const alt = process.env.PAARE_KV_ID;
    delete process.env.PAARE_KV_ID;
    try {
      await buildPages({ outDir });
      const toml = await readFile(path.join(outDir, "wrangler.toml"), "utf8");
      const { PAARE_KV_ID } = await import("../../platforms/cloudflare/deploy.config.js");
      expect(PAARE_KV_ID).toMatch(/^[0-9a-f]{32}$/);        // echte KV-ID-Form, kein Platzhalter
      expect(toml).toContain(`id = "${PAARE_KV_ID}"`);
      expect(toml).toMatch(/^\[\[kv_namespaces\]\]/m);      // nicht auskommentiert
    } finally {
      if (alt === undefined) delete process.env.PAARE_KV_ID; else process.env.PAARE_KV_ID = alt;
    }
  });
});
