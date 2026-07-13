// Paritäts-Wächter — "ein Kern, zwei Häuser" als Testfall:
// beide Build-Ziele tragen denselben Kern-Hash; driftet eines, wird es rot.
// Beide Builds schreiben in temporäre Verzeichnisse (afterAll räumt auf).

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildArtifact } from "../../scripts/build-artifact.js";
import { buildPages } from "../../scripts/build-pages.js";
import { coreHash } from "../../scripts/core-hash.js";

let artefakt, pages, hash, tmpArt, tmpCf;

beforeAll(async () => {
  hash = await coreHash();
  tmpArt = await mkdtemp(path.join(tmpdir(), "ub-parity-art-"));
  tmpCf = await mkdtemp(path.join(tmpdir(), "ub-parity-cf-"));
  artefakt = await buildArtifact({ outDir: tmpArt });
  pages = await buildPages({ outDir: tmpCf });
}, 60000);

afterAll(async () => {
  await rm(tmpArt, { recursive: true, force: true });
  await rm(tmpCf, { recursive: true, force: true });
});

describe("Paritäts-Wächter", () => {
  it("beide Builds tragen denselben Kern-Hash", async () => {
    expect(artefakt.hash).toBe(hash);
    expect(pages.hash).toBe(hash);
    const html = await readFile(artefakt.out, "utf8");
    const worker = await readFile(path.join(pages.outDir, "worker.js"), "utf8");
    const appJs = await readFile(path.join(pages.outDir, "public/app.js"), "utf8");
    const index = await readFile(path.join(pages.outDir, "public/index.html"), "utf8");
    expect(html).toContain(`data-core-hash="${hash}"`);
    expect(worker).toContain(`__CORE_HASH__ = "${hash}"`);
    expect(appJs).toContain(hash);
    expect(index).toContain(`data-core-hash="${hash}"`);
  });

  it("Artefakt ist eine einzige Datei ohne externe Skript-Quellen", async () => {
    const html = await readFile(artefakt.out, "utf8");
    expect(html).not.toMatch(/<script[^>]+src=/i);
    expect(html.length).toBeGreaterThan(30000);
  });

  it("beide Bundles enthalten die Charta-Kanarien (Prompts sind wirklich drin)", async () => {
    const html = await readFile(artefakt.out, "utf8");
    const appJs = await readFile(path.join(pages.outDir, "public/app.js"), "utf8");
    for (const kanarie of ["SICHERHEITS-WEICHE", "SPIEGEL-GRAMMATIK", "NOT-FRAGE AN BEIDE", "VERSEHENS-KORREKTUR", "GEGENDRUCK-FEST"]) {
      expect(html, "Artefakt: " + kanarie).toContain(kanarie);
      expect(appJs, "Pages: " + kanarie).toContain(kanarie);
    }
  });

  it("Worker-Bundle enthält KEINE UI-Schicht, Client-Bundle KEINE Auth-Schicht (saubere Schnittkante)", async () => {
    const worker = await readFile(path.join(pages.outDir, "worker.js"), "utf8");
    const appJs = await readFile(path.join(pages.outDir, "public/app.js"), "utf8");
    expect(worker).not.toContain("createApp");
    expect(appJs).not.toContain("sys/session/");
    expect(appJs).not.toContain("sys/cred/");
  });
});
