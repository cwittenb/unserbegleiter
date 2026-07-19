// Sprint M2 — Service Worker: App-Shell offline, API niemals cachen.
// Kernstück sind die NEGATIV-Tests: kein Pfad unter /api/ darf jemals eine
// cachende Entscheidung bekommen (Datenschutz-Grundsatz — Gesprächsinhalte
// bleiben aus jedem Browser-Cache draußen). Dazu Build-Beweis (sw.js entsteht,
// trägt den Kern-Hash als Cache-Version, Registrierung ist im Client-Bundle)
// und i18n-Vollständigkeit der Update-Hinweis-Strings.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildPages } from "../../scripts/build-pages.js";
import { coreHash } from "../../scripts/core-hash.js";
import { SHELL_PFADE, cacheEntscheidung } from "../../platforms/cloudflare/pages/sw-routing.js";
import { de } from "../../core/i18n/de.js";
import { en } from "../../core/i18n/en.js";

describe("M2 · Routing-Entscheidung (rein, deterministisch)", () => {
  it("NEGATIV: API-Pfade bekommen NIEMALS eine cachende Entscheidung", () => {
    const apiPfade = [
      "/api", "/api/", "/api/me", "/api/llm", "/api/session", "/api/enroll",
      "/api/chat/solo/abc", "/api/handover", "/api/handover/xyz",
      "/api/bstate/f", "/api/pstate/language", "/api/email", "/api/email/confirm",
      "/api/recover", "/api/language", "/api/paar",
    ];
    for (const p of apiPfade) expect(cacheEntscheidung(p), p).toBe("nie");
  });

  it("NEGATIV: admin.html und der Service Worker selbst werden nie gecacht", () => {
    expect(cacheEntscheidung("/admin.html")).toBe("nie");
    expect(cacheEntscheidung("/sw.js")).toBe("nie");
    expect(SHELL_PFADE).not.toContain("/admin.html");
    expect(SHELL_PFADE).not.toContain("/sw.js");
  });

  it("Einstieg ist netz-zuerst (Updates gewinnen, offline fällt auf Cache zurück)", () => {
    expect(cacheEntscheidung("/")).toBe("netz-zuerst");
    expect(cacheEntscheidung("/index.html")).toBe("netz-zuerst");
  });

  it("statische Shell ist cache-zuerst, Unbekanntes bleibt unangetastet", () => {
    for (const p of ["/app.js", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/apple-touch-icon.png"])
      expect(cacheEntscheidung(p), p).toBe("cache-zuerst");
    expect(cacheEntscheidung("/irgendwas.txt")).toBe("netz");
    expect(cacheEntscheidung("/apix")).toBe("netz");   // kein Präfix-Übergriff
  });

  it("jeder Precache-Eintrag hat eine cachende Entscheidung (Liste und Routing driften nicht)", () => {
    for (const p of SHELL_PFADE)
      expect(["cache-zuerst", "netz-zuerst"], p).toContain(cacheEntscheidung(p));
  });
});

describe("M2 · Build-Beweis", () => {
  let outDir, sw, appJs, hash;
  beforeAll(async () => {
    hash = await coreHash();
    outDir = await mkdtemp(path.join(tmpdir(), "ub-m2-sw-"));
    await buildPages({ outDir });
    sw = await readFile(path.join(outDir, "public/sw.js"), "utf8");
    appJs = await readFile(path.join(outDir, "public/app.js"), "utf8");
  }, 60000);
  afterAll(async () => { await rm(outDir, { recursive: true, force: true }); });

  it("sw.js entsteht und trägt den Kern-Hash als Cache-Version", () => {
    expect(sw).toContain(`rzz-shell-${hash}`);
    expect(sw).not.toContain("__CORE_HASH__");
  });

  it("Precache-Material ist vollständig im Bundle (die Ausschluss-Garantie liefern die Routing-Tests oben)", () => {
    for (const p of SHELL_PFADE) expect(sw, p).toContain(`"${p}"`);
    expect(sw).toContain("addAll");
  });

  it("der Client registriert /sw.js und kennt den Update-Hinweis", () => {
    expect(appJs).toContain('serviceWorker');
    expect(appJs).toContain('"/sw.js"');
    expect(appJs).toContain("pwa.updateVerfuegbar");
  });
});

describe("M2 · i18n & Naming", () => {
  it("Update-Hinweis-Strings liegen in beiden Sprachen vor", () => {
    for (const k of ["pwa.updateVerfuegbar", "pwa.neuLaden"]) {
      expect(de[k], "de: " + k).toBeTruthy();
      expect(en[k], "en: " + k).toBeTruthy();
    }
  });

  it("finalisierter Name ist verdrahtet: raumzuzweit (de) / roomfortwo (en)", () => {
    expect(de["pwa.name"]).toBe("raumzuzweit");
    expect(en["pwa.name"]).toBe("roomfortwo");
    expect(de["pwa.kurzname"]).toBe("raumzuzweit");
    expect(en["pwa.kurzname"]).toBe("roomfortwo");
  });
});
