// Paritäts-Wächter-Grundlage: deterministischer Hash über alle core/-Quellen.
import { readdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

export async function coreHash() {
  const dateien = [];
  async function scan(dir) {
    for (const e of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) await scan(p);
      else if (e.name.endsWith(".js")) dateien.push(p);
    }
  }
  await scan(path.join(ROOT, "core"));
  const h = createHash("sha256");
  for (const f of dateien.sort()) {
    h.update(path.relative(ROOT, f));
    h.update(await readFile(f));
  }
  return h.digest("hex").slice(0, 16);
}
