// Erzeugt dist/paarbegleitung-dev.html — eine Datei, Kern inlined, Hash gestempelt.
import { build } from "esbuild";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { coreHash } from "./core-hash.js";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

export async function buildArtifact() {
  const hash = await coreHash();
  const result = await build({
    entryPoints: [path.join(ROOT, "platforms/artifact/main.js")],
    bundle: true, format: "iife", write: false, target: "es2021", legalComments: "none",
    define: {},
  });
  let bundle = result.outputFiles[0].text.replace(/__CORE_HASH__/g, hash);
  bundle = bundle.replace(/<\/script>/gi, "<\\/script>");
  const shell = await readFile(path.join(ROOT, "platforms/artifact/shell.html"), "utf8");
  if (!shell.includes("/*__BUNDLE__*/")) throw new Error("Shell-Vorlage ohne /*__BUNDLE__*/-Platzhalter");
  const html = shell
    .replace("<div id=\"app\"></div>", `<div id="app" data-core-hash="${hash}"></div>`)
    .replace("/*__BUNDLE__*/", () => bundle);
  const out = path.join(ROOT, "dist/paarbegleitung-dev.html");
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, html);
  return { out, bytes: html.length, hash };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  buildArtifact().then(
    r => console.log(`Artefakt gebaut: ${r.out} (${(r.bytes / 1024).toFixed(1)} kB, Kern ${r.hash})`),
    e => { console.error("Artefakt-Build fehlgeschlagen:", e.message); process.exit(1); }
  );
}
