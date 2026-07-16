// Build-Fehlerpfade (S66, P3.7) — Lehre aus dem KV-Kontaminationsvorfall:
// (1) PAARE_KV_ID (Env) hat Vorrang vor der committeten deploy.config.js;
// (2) es gibt KEIN Rücklesen aus einer vorhandenen wrangler.toml mehr;
// (3) ohne jede ID schreibt der Build einen auskommentierten Hinweis-Block
//     statt still eine falsche ID zu übernehmen.
// Alle Builds laufen in mkdtemp-Verzeichnissen — nie gegen dist/ (Sprint-Regel).

import { describe, it, expect, afterEach } from "vitest";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildPages } from "../../scripts/build-pages.js";
import { PAARE_KV_ID } from "../../platforms/cloudflare/deploy.config.js";

let tmp = null;
const alteEnv = process.env.PAARE_KV_ID;
afterEach(async () => {
  if (tmp) { await rm(tmp, { recursive: true, force: true }); tmp = null; }
  if (alteEnv === undefined) delete process.env.PAARE_KV_ID; else process.env.PAARE_KV_ID = alteEnv;
});

describe("build-pages · KV-ID-Ermittlung", () => {
  it("Env PAARE_KV_ID hat Vorrang vor deploy.config.js (CI / abweichender Account)", async () => {
    tmp = await mkdtemp(path.join(tmpdir(), "pb-build-"));
    process.env.PAARE_KV_ID = "  env-id-mit-rand  ";
    await buildPages({ outDir: tmp });
    const toml = await readFile(path.join(tmp, "wrangler.toml"), "utf8");
    expect(toml).toContain('id = "env-id-mit-rand"');           // getrimmt übernommen
    expect(toml).not.toContain(PAARE_KV_ID);                    // Config tritt zurück
  });

  it("ohne Env gilt die committete deploy.config.js als Quelle der Wahrheit", async () => {
    tmp = await mkdtemp(path.join(tmpdir(), "pb-build-"));
    delete process.env.PAARE_KV_ID;
    await buildPages({ outDir: tmp });
    const toml = await readFile(path.join(tmp, "wrangler.toml"), "utf8");
    expect(toml).toContain('binding = "PAARE"');
    expect(toml).toContain('id = "' + PAARE_KV_ID + '"');
  });

  it("KEIN Rücklesen: eine im Zielordner liegende wrangler.toml mit Fremd-ID wird überschrieben, nie übernommen", async () => {
    tmp = await mkdtemp(path.join(tmpdir(), "pb-build-"));
    await writeFile(path.join(tmp, "wrangler.toml"), '[[kv_namespaces]]\nbinding = "PAARE"\nid = "test-fixture-kontamination"\n');
    delete process.env.PAARE_KV_ID;
    await buildPages({ outDir: tmp });
    const toml = await readFile(path.join(tmp, "wrangler.toml"), "utf8");
    expect(toml).not.toContain("test-fixture-kontamination");   // die Vorfalls-Klasse
    expect(toml).toContain('id = "' + PAARE_KV_ID + '"');
  });
});
