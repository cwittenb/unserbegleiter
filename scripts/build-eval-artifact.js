// Erzeugt dist/paarbegleitung-eval.html — Eval-Runner als Ein-Datei-Artefakt.
import { build } from "esbuild";
import { writeFile, mkdir, readdir, unlink } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { coreHash } from "./core-hash.js";
import { mitEingangsfrage } from "./eingangs-frage.js";
import { buildStamp } from "./build-stamp.js";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

export async function buildEvalArtifact({ outDir = path.join(ROOT, "dist") } = {}) {
  const hash = await coreHash();
  const result = await build({
    entryPoints: [path.join(ROOT, "platforms/artifact/eval-main.js")],
    bundle: true, format: "iife", write: false, target: "es2021", legalComments: "none",
  });
  const stamp = buildStamp();
  let bundle = result.outputFiles[0].text.replace(/__CORE_HASH__/g, hash);
  bundle = mitEingangsfrage(bundle, { untertitel: "Stand " + stamp + " UTC · Kern " + hash.slice(0, 8) });
  bundle = bundle.replace(/<\/script>/gi, "<\\/script>");
  const html = `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Paarbegleitung · Eval-Runner · ${stamp}</title>
<style>:root{--bg:#f5f7f9;--ink:#1b2430}
body{margin:0;background:var(--bg);color:var(--ink);font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
#app{max-width:760px;margin:0 auto;padding:24px 18px}</style></head>
<body><div id="app" data-core-hash="${hash}"></div>
<script>${bundle}</script></body></html>\n`;
  const out = path.join(outDir, "paarbegleitung-eval_" + stamp + "_" + hash.slice(0, 8) + ".html");
  await mkdir(path.dirname(out), { recursive: true });
  for (const f of await readdir(path.dirname(out)))
    if (f.startsWith("paarbegleitung-eval_") && f.endsWith(".html") && path.join(path.dirname(out), f) !== out)
      await unlink(path.join(path.dirname(out), f));
  await writeFile(out, html);
  return { out, bytes: html.length, hash, stamp };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  buildEvalArtifact().then(
    r => console.log(`Eval-Artefakt gebaut: ${r.out} (${(r.bytes / 1024).toFixed(1)} kB, Kern ${r.hash})`),
    e => { console.error("Eval-Artefakt-Build fehlgeschlagen:", e.message); process.exit(1); }
  );
}
