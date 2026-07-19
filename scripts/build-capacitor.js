// Erzeugt dist/capacitor/ — die native Hülle (M4): www/ aus dem Pages-Client
// plus capacitor.config.json. Die nativen Projekte (ios/, android/) werden
// bewusst NICHT erzeugt oder eingecheckt — das bleibt ein lokaler Schritt beim
// Betreiber (`npx cap add ios|android` in dist/capacitor/, siehe Protokoll M4).
//
// Prinzipien:
//   • Der Web-Client bleibt die einzige Quelle: www/ ist der Pages-Build,
//     lokal gebündelt (D3a) — die App startet auch bei schlechtem Netz sofort.
//   • admin.html wird NICHT mit ausgeliefert (Betreiber-Werkzeug, gehört nicht
//     in die Endnutzer-App).
//   • Die API-Basis wird VOR dem App-Skript injiziert (globalThis.RZZ_API_BASIS);
//     im Web bleibt sie leer — Verhalten dort unverändert.

import { writeFile, mkdir, readFile, readdir, copyFile, rm, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { buildPages } from "./build-pages.js";
import { APP_ID, API_BASIS as API_BASIS_KONFIG } from "../platforms/capacitor/deploy.config.js";
import { de } from "../core/i18n/de.js";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

/** API-Basis bestimmen: Umgebungsvariable RZZ_API_BASIS hat Vorrang (CI /
 *  Testinstanz), sonst gilt die committete deploy.config.js. Kein stiller
 *  Fallback auf leer — eine native Hülle OHNE absolute API-Basis wäre kaputt. */
function ermittleApiBasis() {
  const basis = (process.env.RZZ_API_BASIS || API_BASIS_KONFIG || "").trim();
  if (!/^https:\/\/[^/]+$/.test(basis))
    throw new Error(`Capacitor-Build: API_BASIS fehlt oder ist ungültig (erwartet https://host ohne Pfad, bekommen: "${basis}")`);
  return basis;
}

export async function buildCapacitor({ outDir = path.join(ROOT, "dist/capacitor") } = {}) {
  const apiBasis = ermittleApiBasis();

  // 1) Pages-Client in ein Unterverzeichnis bauen und www/ daraus ableiten.
  const pagesOut = path.join(outDir, "pages-build");
  const { hash } = await buildPages({ outDir: pagesOut });
  const www = path.join(outDir, "www");
  await rm(www, { recursive: true, force: true });
  await mkdir(www, { recursive: true });
  const quelle = path.join(pagesOut, "public");
  const kopiere = async (von, nach) => {
    for (const name of await readdir(von)) {
      if (name === "admin.html") continue;                    // Betreiber-Werkzeug: nie in die App
      const q = path.join(von, name), z = path.join(nach, name);
      if ((await stat(q)).isDirectory()) { await mkdir(z, { recursive: true }); await kopiere(q, z); }
      else await copyFile(q, z);
    }
  };
  await kopiere(quelle, www);
  await rm(pagesOut, { recursive: true, force: true });

  // 2) API-Basis VOR dem App-Skript injizieren.
  const indexPfad = path.join(www, "index.html");
  let index = await readFile(indexPfad, "utf8");
  const anker = '<script src="/app.js"></script>';
  if (!index.includes(anker)) throw new Error("Capacitor-Build: App-Skript-Anker nicht gefunden — Shell-Format geändert?");
  index = index.replace(anker, `<script>globalThis.RZZ_API_BASIS=${JSON.stringify(apiBasis)};</script>${anker}`);
  await writeFile(indexPfad, index);

  // 3) capacitor.config.json — appName aus der i18n-Referenzsprache (pwa.name).
  const config = {
    appId: APP_ID,
    appName: de["pwa.name"],
    webDir: "www",
    server: { androidScheme: "https" },
    // M5: CapacitorHttp/-Cookies heben fetch auf die native Netzwerkschicht —
    // Cookie-Persistenz in WKWebView (ITP) wird damit robust; der Worker-CORS
    // bleibt als Rückfallebene für den reinen WebView-Pfad bestehen.
    plugins: {
      CapacitorHttp: { enabled: true },
      CapacitorCookies: { enabled: true },
      SplashScreen: { backgroundColor: "#f7f4ea", launchShowDuration: 0 },
    },
  };
  await writeFile(path.join(outDir, "capacitor.config.json"), JSON.stringify(config, null, 2) + "\n");

  return { outDir, hash, apiBasis, appId: APP_ID };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  buildCapacitor().then(
    r => console.log(`Capacitor-Build: ${r.outDir} (Kern ${r.hash}, API ${r.apiBasis}, App-ID ${r.appId})`),
    e => { console.error("Capacitor-Build fehlgeschlagen:", e.message); process.exit(1); }
  );
}
