// Sprint M4 — Capacitor-Gerüst: www/ aus dem Pages-Client, injizierte
// API-Basis, capacitor.config.json. Wächter: die App-ID ist die einzige nie
// wieder änderbare Kennung des Projekts — sie wird hier wörtlich festgenagelt.
// Negativ-Seiten: admin.html erreicht die Endnutzer-App nie; ohne gültige
// API-Basis bricht der Build (kein stiller Fallback); im Web bleibt die Basis
// leer und das Verhalten unverändert.

import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { readFile, mkdtemp, rm, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildCapacitor } from "../../scripts/build-capacitor.js";
import { APP_ID, API_BASIS } from "../../platforms/capacitor/deploy.config.js";
import { apiBasis, istNativeShell } from "../../platforms/cloudflare/pages/api-basis.js";
import { de } from "../../core/i18n/de.js";

describe("M4 · API-Basis im Client (rein)", () => {
  afterEach(() => { delete globalThis.RZZ_API_BASIS; });

  it("Web-Default: Basis leer, same-origin, keine native Hülle", () => {
    expect(apiBasis()).toBe("");
    expect(istNativeShell()).toBe(false);
  });

  it("gesetzte Basis wird durchgereicht und markiert die native Hülle", () => {
    globalThis.RZZ_API_BASIS = "https://app.raumzuzweit.de";
    expect(apiBasis()).toBe("https://app.raumzuzweit.de");
    expect(istNativeShell()).toBe(true);
  });
});

describe("M4 · Deploy-Konfiguration", () => {
  it("App-ID ist app.roomfortwo (D2 — nach Store-Einreichung unveränderlich)", () => {
    expect(APP_ID).toBe("app.roomfortwo");
  });

  it("API-Basis ist die produktive App-Subdomain, ohne Pfad", () => {
    expect(API_BASIS).toBe("https://app.raumzuzweit.de");
  });
});

describe("M4 · Capacitor-Build", () => {
  let outDir, index, config;
  beforeAll(async () => {
    outDir = await mkdtemp(path.join(tmpdir(), "ub-m4-cap-"));
    await buildCapacitor({ outDir });
    index = await readFile(path.join(outDir, "www/index.html"), "utf8");
    config = JSON.parse(await readFile(path.join(outDir, "capacitor.config.json"), "utf8"));
  }, 60000);
  afterAll(async () => { await rm(outDir, { recursive: true, force: true }); });

  it("www/ trägt die komplette Shell samt PWA-Artefakten", async () => {
    for (const f of ["www/app.js", "www/manifest.webmanifest", "www/icons/icon-192.png", "www/icons/icon-512.png", "www/icons/apple-touch-icon.png"])
      await access(path.join(outDir, f));   // wirft, wenn etwas fehlt
  });

  it("NEGATIV: admin.html erreicht die Endnutzer-App nicht", async () => {
    await expect(access(path.join(outDir, "www/admin.html"))).rejects.toThrow();
  });

  it("die API-Basis wird VOR dem App-Skript injiziert", () => {
    const injektion = `<script>globalThis.RZZ_API_BASIS="https://app.raumzuzweit.de";</script>`;
    expect(index).toContain(injektion);
    expect(index.indexOf(injektion)).toBeLessThan(index.indexOf('<script src="/app.js">'));
  });

  it("capacitor.config.json: App-ID, Name aus i18n, webDir, https-Schema", () => {
    expect(config.appId).toBe("app.roomfortwo");
    expect(config.appName).toBe(de["pwa.name"]);
    expect(config.webDir).toBe("www");
    expect(config.server.androidScheme).toBe("https");
  });

  it("NEGATIV: ungültige API-Basis bricht den Build (kein stiller Fallback)", async () => {
    const alt = process.env.RZZ_API_BASIS;
    process.env.RZZ_API_BASIS = "http://unsicher.example";   // kein https → ungültig
    try {
      const tmp = await mkdtemp(path.join(tmpdir(), "ub-m4-kaputt-"));
      await expect(buildCapacitor({ outDir: tmp })).rejects.toThrow(/API_BASIS/);
      await rm(tmp, { recursive: true, force: true });
    } finally {
      if (alt === undefined) delete process.env.RZZ_API_BASIS; else process.env.RZZ_API_BASIS = alt;
    }
  });

  it("Umgebungsvariable RZZ_API_BASIS hat Vorrang (Testinstanz-Fall)", async () => {
    const alt = process.env.RZZ_API_BASIS;
    process.env.RZZ_API_BASIS = "https://test.raumzuzweit.workers.dev";
    try {
      const tmp = await mkdtemp(path.join(tmpdir(), "ub-m4-env-"));
      const r = await buildCapacitor({ outDir: tmp });
      expect(r.apiBasis).toBe("https://test.raumzuzweit.workers.dev");
      const idx = await readFile(path.join(tmp, "www/index.html"), "utf8");
      expect(idx).toContain('RZZ_API_BASIS="https://test.raumzuzweit.workers.dev"');
      await rm(tmp, { recursive: true, force: true });
    } finally {
      if (alt === undefined) delete process.env.RZZ_API_BASIS; else process.env.RZZ_API_BASIS = alt;
    }
  }, 60000);
});

describe("M4 · Web bleibt unverändert", () => {
  it("der Client ruft fetch über apiBasis() auf und lässt den SW in der nativen Hülle aus", async () => {
    const quelle = await readFile(path.join(process.cwd(), "platforms/cloudflare/pages/client.js"), "utf8");
    expect(quelle).toContain("fetch(apiBasis() + pfad");
    expect(quelle).toContain("if (istNativeShell()) return;");
  });
});
