// Sprint M5 (Worker) — gegen den echten, gebündelten Worker (Miniflare):
// Well-known-Routen (fail-closed ohne Konfiguration, korrekt mit), CORS auf
// echten Antworten inkl. Fehlerpfad, und SameSite der Auth-Cookies: None NUR
// für App-Origins, Lax für alle anderen — der Web-Pfad bleibt unangetastet.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Miniflare } from "miniflare";
import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ADMIN = "test-admin-geheim";
let script, mfOhne, mfMit;

beforeAll(async () => {
  const bundled = await build({
    entryPoints: [path.join(ROOT, "platforms/cloudflare/worker/index.js")],
    bundle: true, format: "esm", external: ["cloudflare:sockets"], write: false, target: "es2022",
  });
  script = bundled.outputFiles[0].text;
  const basis = { modules: true, script, kvNamespaces: ["PAARE"], compatibilityDate: "2026-06-01" };
  mfOhne = new Miniflare({ ...basis, bindings: { ADMIN_TOKEN: ADMIN } });
  mfMit = new Miniflare({
    ...basis,
    bindings: { ADMIN_TOKEN: ADMIN, APPLE_TEAM_ID: "TEAM12345", ANDROID_CERT_SHA256: "aa:bb:cc:dd" },
  });
}, 60000);

afterAll(async () => { for (const mf of [mfOhne, mfMit]) if (mf) await mf.dispose(); });

describe("M5 · /.well-known/ — fail-closed ohne Konfiguration", () => {
  it("AASA: 503 mit klarer Ansage, solange APPLE_TEAM_ID fehlt", async () => {
    const r = await mfOhne.dispatchFetch("http://pb.test/.well-known/apple-app-site-association");
    expect(r.status).toBe(503);
    const d = await r.json();
    expect(d.code).toBe("config_missing");
    expect(d.error).toContain("APPLE_TEAM_ID");
  });

  it("assetlinks: 503 mit klarer Ansage, solange ANDROID_CERT_SHA256 fehlt", async () => {
    const r = await mfOhne.dispatchFetch("http://pb.test/.well-known/assetlinks.json");
    expect(r.status).toBe(503);
    expect((await r.json()).error).toContain("ANDROID_CERT_SHA256");
  });
});

describe("M5 · /.well-known/ — konfiguriert", () => {
  it("AASA: JSON mit TEAM.APP_ID und Einstieg '/'", async () => {
    const r = await mfMit.dispatchFetch("http://pb.test/.well-known/apple-app-site-association");
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toContain("application/json");
    const d = await r.json();
    expect(d.applinks.details[0].appIDs).toEqual(["TEAM12345.app.roomfortwo"]);
  });

  it("assetlinks: Fingerprint normalisiert (Großschreibung), Paketname app.roomfortwo", async () => {
    const r = await mfMit.dispatchFetch("http://pb.test/.well-known/assetlinks.json");
    expect(r.status).toBe(200);
    const d = await r.json();
    expect(d[0].target.package_name).toBe("app.roomfortwo");
    expect(d[0].target.sha256_cert_fingerprints).toEqual(["AA:BB:CC:DD"]);
  });
});

describe("M5 · CORS auf echten Antworten", () => {
  it("App-Origin: Antwort trägt Credentials-CORS — auch auf Fehlerantworten", async () => {
    const ok = await mfMit.dispatchFetch("http://pb.test/api/health", { headers: { Origin: "capacitor://localhost" } });
    expect(ok.headers.get("Access-Control-Allow-Origin")).toBe("capacitor://localhost");
    expect(ok.headers.get("Access-Control-Allow-Credentials")).toBe("true");
    const fehl = await mfMit.dispatchFetch("http://pb.test/api/paare", { headers: { Origin: "https://localhost" } });
    expect(fehl.status).toBe(401);   // admin-gated bleibt admin-gated
    expect(fehl.headers.get("Access-Control-Allow-Origin")).toBe("https://localhost");
  });

  it("NEGATIV: fremde Origins bekommen keinerlei CORS-Öffnung", async () => {
    const r = await mfMit.dispatchFetch("http://pb.test/api/health", { headers: { Origin: "https://boese.example" } });
    expect(r.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("Preflight einer App-Anfrage: 204 mit Methoden und Headern", async () => {
    const r = await mfMit.dispatchFetch("http://pb.test/api/enroll", {
      method: "OPTIONS",
      headers: { Origin: "capacitor://localhost", "Access-Control-Request-Method": "POST" },
    });
    expect(r.status).toBe(204);
    expect(r.headers.get("Access-Control-Allow-Methods")).toContain("POST");
    expect(r.headers.get("Access-Control-Allow-Headers")).toContain("content-type");
  });
});

describe("M5 · Auth-Cookies je Herkunft", () => {
  async function enrollCookies(mf, origin) {
    const init = await mf.dispatchFetch("http://pb.test/api/paar", {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-token": ADMIN },
      body: JSON.stringify({ nameA: "Ada", nameB: "Ben" }),
    });
    const { links } = (await init.json());
    const r = await mf.dispatchFetch("http://pb.test/api/enroll", {
      method: "POST",
      headers: { "content-type": "application/json", ...(origin ? { Origin: origin } : {}) },
      body: JSON.stringify({ token: links.A }),
    });
    expect(r.status).toBe(200);
    return r.headers.getSetCookie();
  }

  it("Web (kein Origin): beide Cookies SameSite=Lax — unverändertes Verhalten", async () => {
    const cookies = await enrollCookies(mfMit);
    expect(cookies).toHaveLength(2);
    for (const c of cookies) { expect(c).toContain("SameSite=Lax"); expect(c).toContain("HttpOnly"); }
  });

  it("App-Origin: beide Cookies SameSite=None; Secure (cross-origin-fähig)", async () => {
    const cookies = await enrollCookies(mfMit, "capacitor://localhost");
    expect(cookies).toHaveLength(2);
    for (const c of cookies) { expect(c).toContain("SameSite=None"); expect(c).toContain("Secure"); }
  });
});
