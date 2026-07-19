// Erzeugt dist/cloudflare/ — Worker-Bundle, Pages-Client, wrangler.toml.
import { build } from "esbuild";
import { writeFile, mkdir, readFile, readdir, copyFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { coreHash } from "./core-hash.js";
import { PAARE_KV_ID as KV_ID_KONFIG } from "../platforms/cloudflare/deploy.config.js";
import { manifestJson, erzeugeManifest, THEME_COLOR } from "../platforms/cloudflare/pages/manifest.js";

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

  // Service Worker (M2): eigener Bundle-Schritt, Kern-Hash wird zum Cache-Namen —
  // jeder Deploy invalidiert die Shell von selbst (activate räumt Altstände weg).
  const sw = await build({
    entryPoints: [path.join(ROOT, "platforms/cloudflare/pages/sw.js")],
    bundle: true, format: "iife", write: false, target: "es2021",
  });
  await writeFile(
    path.join(outDir, "public/sw.js"),
    sw.outputFiles[0].text.replace(/__CORE_HASH__/g, hash)
  );
  // PWA (M1): Manifest + Icon-Satz. Icons sind eingecheckte Assets
  // (platforms/cloudflare/pages/icons/), das Manifest wird generiert.
  const manifest = erzeugeManifest();
  await writeFile(path.join(outDir, "public/manifest.webmanifest"), manifestJson());
  const iconsQuelle = path.join(ROOT, "platforms/cloudflare/pages/icons");
  await mkdir(path.join(outDir, "public/icons"), { recursive: true });
  for (const f of await readdir(iconsQuelle))
    if (f.endsWith(".png")) await copyFile(path.join(iconsQuelle, f), path.join(outDir, "public/icons", f));

  await writeFile(path.join(outDir, "public/index.html"), `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content">
<title>Paarbegleitung</title>
<link rel="manifest" href="/manifest.webmanifest">
<meta name="theme-color" content="${THEME_COLOR}">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="${manifest.short_name}">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png">
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
    "# LLM-Provider-Schalter (S47): EIN Wert wählt den Provider; Key + Modell liegen",
    "#   pro Provider getrennt vor. Ein Wechsel legt NUR LLM_PROVIDER um, die",
    "#   vorprovisionierten Paare bleiben stehen:",
    "#     wrangler secret put LLM_PROVIDER       (anthropic | mistral | openai)",
    "#     wrangler secret put ANTHROPIC_API_KEY  +  wrangler secret put ANTHROPIC_MODEL",
    "#     wrangler secret put MISTRAL_API_KEY    +  wrangler secret put MISTRAL_MODEL",
    "#   (optional analog OPENAI_API_KEY / OPENAI_MODEL). Alle drei zum GEWÄHLTEN",
    "#   Provider sind Pflicht — fehlt eines, antwortet /api/llm mit 500 und nennt",
    "#   die fehlende Variable (kein stiller Fallback, S35d). NS optional.",
    "# Admin: wrangler secret put ADMIN_TOKEN   (schützt /api/paar; ohne dieses Secret",
    "#          ist das Anlegen gesperrt — fail-closed)",
    "# Adress-Verschlüsselung (S46, Pflicht): wrangler secret put EMAIL_KEY",
    "#          (32 Byte hex: openssl rand -hex 32) — VOR dem Deploy setzen,",
    "#          sonst schlagen Adress-Bestätigungen fehl. Optional RESEND_RATE.",
    "# Mailversand (Wiedereinstieg + Adress-Bestätigung):",
    "#          wrangler secret put SMTP_HOST / SMTP_USER / SMTP_PASS",
    "#          optional SMTP_PORT (587|465, nie 25) und SMTP_FROM",
    "# E-Mail-Pflicht (S45, D2b): [vars] EMAIL_PFLICHT = \"1\" erst setzen, wenn",
    "#          der SMTP-Versand produktiv verifiziert ist — sonst blockiert das",
    "#          Pflicht-Modal die App bei Mail-Ausfall.",
    "# App-Verknüpfung (M5, native Hülle): [vars] APPLE_TEAM_ID = \"…\" (Apple",
    "#          Developer → Membership) und ANDROID_CERT_SHA256 = \"AA:BB:…\"",
    "#          (keytool -list -v, SHA-256). Ohne sie antworten die",
    "#          /.well-known/-Routen fail-closed mit 503.",
    "# Web Push (M7a, optional): drei Secrets schalten das Feature frei —",
    "#          wrangler secret put VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT",
    "#          (Schlüsselpaar erzeugen: node scripts/vapid-schluessel.mjs).",
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
