// Erzeugt dist/cloudflare/ — Worker-Bundle, Pages-Client, wrangler.toml.
import { build } from "esbuild";
import { writeFile, mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { coreHash } from "./core-hash.js";
import { PAARE_KV_ID as KV_ID_KONFIG } from "../platforms/cloudflare/deploy.config.js";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

/** KV-Namespace-ID dauerhaft bestimmen: die Umgebungsvariable PAARE_KV_ID hat
 *  Vorrang (CI / abweichender Account), sonst gilt die committete
 *  deploy.config.js als Quelle der Wahrheit. Bewusst OHNE Rücklesen aus einer
 *  vorhandenen wrangler.toml — dieser Fallback konnte Test-Fixtures in die
 *  echte Deploy-Config schleppen. */
function ermittleKvId() {
  if (process.env.PAARE_KV_ID) return process.env.PAARE_KV_ID.trim();
  if (KV_ID_KONFIG && KV_ID_KONFIG !== "…") return KV_ID_KONFIG.trim();
  return null;
}

export async function buildPages({ outDir = path.join(ROOT, "dist/cloudflare") } = {}) {
  const hash = await coreHash();
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

  const kvId = ermittleKvId();
  const kvLines = kvId
    ? ["[[kv_namespaces]]", 'binding = "PAARE"', `id = "${kvId}"`]
    : ["# Keine KV-ID gefunden. Trag sie in platforms/cloudflare/deploy.config.js ein",
       "# (oder setze PAARE_KV_ID als Umgebungsvariable); dann schreibt der Build den Block automatisch:",
       "# [[kv_namespaces]]", '# binding = "PAARE"', '# id = "…"'];
  await writeFile(path.join(outDir, "wrangler.toml"), [
    'name = "paarbegleitung"',
    'main = "worker.js"',
    'compatibility_date = "2026-06-01"',
    "",
    "[assets]",
    'directory = "public"',
    "",
    ...kvLines,
    "",
    "# Secrets: wrangler secret put LLM_API_KEY   (Provider-Key bleibt serverseitig)",
    "#          wrangler secret put ADMIN_TOKEN   (schützt /api/paar; ohne dieses Secret",
    "#                                             ist das Anlegen gesperrt — fail-closed)",
    "# Optional: LLM_PROVIDER (anthropic|mistral), LLM_MODEL, NS",
    "# Mailversand (Wiedereinstieg + Adress-Bestätigung):",
    "#          wrangler secret put SMTP_HOST / SMTP_USER / SMTP_PASS",
    "#          optional SMTP_PORT (587|465, nie 25) und SMTP_FROM",
    "# E-Mail-Pflicht (S45, D2b): [vars] EMAIL_PFLICHT = \"1\" erst setzen, wenn",
    "#          der SMTP-Versand produktiv verifiziert ist — sonst blockiert das",
    "#          Pflicht-Modal die App bei Mail-Ausfall.",
    "# Verwaltung: <deine-domain>/admin.html  (Einladungslinks, Paar-Liste,",
    "#          Export, Zugang wiederherstellen)",
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
