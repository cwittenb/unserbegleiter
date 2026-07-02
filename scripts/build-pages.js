// Erzeugt dist/cloudflare/ — Worker-Bundle, Pages-Client, wrangler.toml.
import { build } from "esbuild";
import { writeFile, mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { coreHash } from "./core-hash.js";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

export async function buildPages() {
  const hash = await coreHash();
  const outDir = path.join(ROOT, "dist/cloudflare");
  await mkdir(path.join(outDir, "public"), { recursive: true });

  await build({
    entryPoints: [path.join(ROOT, "platforms/cloudflare/worker/index.js")],
    bundle: true, format: "esm", external: ["cloudflare:sockets"],
    outfile: path.join(outDir, "worker.js"), target: "es2022",
    banner: { js: `// Kern-Hash: ${hash}\nglobalThis.__CORE_HASH__ = "${hash}";` },
  });

  const client = await build({
    entryPoints: [path.join(ROOT, "platforms/cloudflare/pages/client.js")],
    bundle: true, format: "iife", write: false, target: "es2021",
  });
  await writeFile(
    path.join(outDir, "public/app.js"),
    client.outputFiles[0].text.replace(/__CORE_HASH__/g, hash)
  );
  await writeFile(path.join(outDir, "public/index.html"), `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Paarbegleitung</title>
<style>:root{--bg:#f5f7f9;--ink:#1b2430;--ink-soft:#5a6675;--accent:#0f766e}
body{margin:0;background:var(--bg);color:var(--ink);font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
#app{max-width:760px;margin:0 auto;padding:24px 18px}</style></head>
<body><div id="app" data-core-hash="${hash}"></div><script src="/app.js"></script></body></html>\n`);

  // Betreiber-Verwaltung (Einladungslinks erzeugen) — statisch mitgeliefert.
  await writeFile(
    path.join(outDir, "public/admin.html"),
    await readFile(path.join(ROOT, "platforms/cloudflare/pages/admin.html"), "utf8")
  );

  await writeFile(path.join(outDir, "wrangler.toml"), [
    'name = "paarbegleitung"',
    'main = "worker.js"',
    'compatibility_date = "2026-06-01"',
    "",
    "[assets]",
    'directory = "public"',
    "",
    "# Nach `wrangler kv namespace create PAARE` die ID eintragen:",
    "# [[kv_namespaces]]",
    '# binding = "PAARE"',
    '# id = "…"',
    "",
    "# Secrets: wrangler secret put LLM_API_KEY   (Provider-Key bleibt serverseitig)",
    "#          wrangler secret put ADMIN_TOKEN   (schützt /api/paar; ohne dieses Secret",
    "#                                             ist das Anlegen gesperrt — fail-closed)",
    "# Optional: LLM_PROVIDER (anthropic|mistral), LLM_MODEL, NS",
    "# Verwaltung: <deine-domain>/admin.html  (Einladungslinks erzeugen)",
    "",
  ].join("\n"));
  return { outDir, hash };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  buildPages().then(
    r => console.log(`Cloudflare-Build: ${r.outDir} (Kern ${r.hash})`),
    e => { console.error("Pages-Build fehlgeschlagen:", e.message); process.exit(1); }
  );
}
