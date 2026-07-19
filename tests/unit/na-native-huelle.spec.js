// Sprint NA — die native Hülle lebt in native/, nicht in dist/.
//
// Kern dieses Sprints ist ein REGRESSIONSSCHUTZ: die nativen Projekte tragen
// handgemachte, nicht reproduzierbare Konfiguration (Signing-Team, Associated
// Domains, Intent-Filter). Der Build darf sie unter keinen Umständen anfassen,
// und die .gitignore muss sie versionieren, während sie den Werkzeug-Auswurf
// draußen hält. Beides wird hier festgenagelt, nicht nur behauptet.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFile, writeFile, mkdtemp, mkdir, rm, access } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildCapacitor } from "../../scripts/build-capacitor.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("NA · Ort der nativen Hülle", () => {
  it("der Build zielt standardmäßig auf native/ — nicht mehr auf dist/", async () => {
    // Quelltext-Assertion (Kanarien-Stil): den Default aufzurufen würde ins
    // echte Arbeitsverzeichnis schreiben, deshalb wird er hier gelesen.
    const quelle = await readFile(path.join(ROOT, "scripts/build-capacitor.js"), "utf8");
    expect(quelle).toContain('outDir = path.join(ROOT, "native")');
    expect(quelle).not.toContain('path.join(ROOT, "dist/capacitor")');
  });

  it("native/package.json liegt versioniert bereit (kein npm init nötig)", async () => {
    const pkg = JSON.parse(await readFile(path.join(ROOT, "native/package.json"), "utf8"));
    expect(pkg.private).toBe(true);
    for (const p of ["@capacitor/core", "@capacitor/ios", "@capacitor/android"])
      expect(pkg.dependencies[p], p).toMatch(/^\^\d+\./);
    expect(pkg.devDependencies["@capacitor/cli"]).toMatch(/^\^\d+\./);
  });
});

describe("NA · Regressionsschutz: der Build fasst ios/ und android/ nie an", () => {
  let outDir;
  const HANDGEMACHT = "<!-- Signing-Team, Associated Domains: von Hand -->";

  beforeAll(async () => {
    outDir = await mkdtemp(path.join(tmpdir(), "rzz-na-"));
    // Vorhandene native Projekte nachstellen …
    for (const f of ["ios/App/App/Info.plist", "android/app/src/main/AndroidManifest.xml"]) {
      await mkdir(path.join(outDir, path.dirname(f)), { recursive: true });
      await writeFile(path.join(outDir, f), HANDGEMACHT);
    }
    // … samt der versionierten package.json.
    await writeFile(path.join(outDir, "package.json"), '{"name":"rzz-native"}');
    await buildCapacitor({ outDir });
  }, 60000);

  afterAll(async () => { await rm(outDir, { recursive: true, force: true }); });

  it("handgemachte native Konfiguration überlebt den Build unverändert", async () => {
    for (const f of ["ios/App/App/Info.plist", "android/app/src/main/AndroidManifest.xml"])
      expect(await readFile(path.join(outDir, f), "utf8"), f).toBe(HANDGEMACHT);
  });

  it("die native package.json wird nicht überschrieben", async () => {
    expect(await readFile(path.join(outDir, "package.json"), "utf8")).toBe('{"name":"rzz-native"}');
  });

  it("die generierten Teile entstehen daneben, das Zwischenverzeichnis wird geräumt", async () => {
    await access(path.join(outDir, "www/index.html"));
    await access(path.join(outDir, "capacitor.config.json"));
    await expect(access(path.join(outDir, "pages-build"))).rejects.toThrow();
  });

  it("meldet zurück, ob die Hülle initialisiert ist (Betreiber-Hinweis)", async () => {
    const r = await buildCapacitor({ outDir });
    expect(r.initialisiert).toBe(false);   // kein node_modules/@capacitor/cli im Testverzeichnis
  }, 60000);
});

/** git check-ignore: Exit 0 = ignoriert, 1 = versioniert. */
function wirdIgnoriert(pfad) {
  try {
    execFileSync("git", ["check-ignore", "-q", "--", pfad], { cwd: ROOT, stdio: "ignore" });
    return true;
  } catch (e) {
    if (e.status === 1) return false;
    throw e;
  }
}
let gitDa = true;
try { execFileSync("git", ["rev-parse", "--git-dir"], { cwd: ROOT, stdio: "ignore" }); } catch { gitDa = false; }

describe.skipIf(!gitDa)("NA · .gitignore trennt Handarbeit von Werkzeug-Auswurf", () => {
  it("versioniert: alles, was Signing und App-Verknüpfung trägt", () => {
    for (const p of [
      "native/package.json",
      "native/ios/App/App/Info.plist",
      "native/ios/App/App.xcodeproj/project.pbxproj",
      "native/android/app/src/main/AndroidManifest.xml",
      "native/android/app/build.gradle",
    ]) expect(wirdIgnoriert(p), p + " darf NICHT ignoriert werden").toBe(false);
  });

  it("ignoriert: Generate, Werkzeug-Auswurf und die sync-Kopien des Web-Builds", () => {
    for (const p of [
      "native/www/index.html",
      "native/capacitor.config.json",
      "native/node_modules/@capacitor/cli/package.json",
      "native/ios/App/Pods/Podfile",
      "native/ios/App/App/public/index.html",
      "native/android/app/src/main/assets/public/index.html",
      "native/android/app/build/outputs/app.apk",
      "native/android/.gradle/state",
      "native/android/local.properties",
    ]) expect(wirdIgnoriert(p), p + " MUSS ignoriert werden").toBe(true);
  });

  it("NEGATIV: Signaturmaterial kann nirgends versehentlich eingecheckt werden", () => {
    for (const p of [
      "native/upload-keystore.jks",
      "native/android/app/release.keystore",
      "native/ios/AuthKey_ABC123.p8",
      "native/zertifikat.p12",
      "native/android/key.properties",
    ]) expect(wirdIgnoriert(p), p + " MUSS ignoriert werden").toBe(true);
  });
});
