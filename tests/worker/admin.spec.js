// Admin-Gate für /api/paar (Betreiber-Endpunkt) — gegen den echten Worker.
// Beweist beide Richtungen: mit konfiguriertem Token korrekt gated,
// und OHNE konfiguriertes Token fail-closed (gesperrt statt offen).

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Miniflare } from "miniflare";
import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ADMIN = "richtiges-admin-token";
let mfMitToken, mfOhneToken, script;

async function anlegen(mf, token) {
  const headers = { "content-type": "application/json" };
  if (token !== undefined) headers["x-admin-token"] = token;
  const res = await mf.dispatchFetch("http://pb.test/api/paar", {
    method: "POST", headers,
    body: JSON.stringify({ nameA: "Anna", nameB: "Bernd" }),
  });
  let data = null;
  try { data = await res.json(); } catch { /* leer */ }
  return { status: res.status, data };
}

beforeAll(async () => {
  const bundled = await build({
    entryPoints: [path.join(ROOT, "platforms/cloudflare/worker/index.js")],
    bundle: true, format: "esm", external: ["cloudflare:sockets"], write: false, target: "es2022",
  });
  script = bundled.outputFiles[0].text;
  mfMitToken = new Miniflare({
    modules: true, script, kvNamespaces: ["PAARE"], compatibilityDate: "2026-06-01",
    bindings: { ADMIN_TOKEN: ADMIN },
  });
  mfOhneToken = new Miniflare({
    modules: true, script, kvNamespaces: ["PAARE"], compatibilityDate: "2026-06-01",
    bindings: {},   // KEIN ADMIN_TOKEN gesetzt
  });
});

afterAll(async () => {
  if (mfMitToken) await mfMitToken.dispose();
  if (mfOhneToken) await mfOhneToken.dispose();
});

describe("Admin-Gate · /api/paar", () => {
  it("ohne Header → 401, kein Paar", async () => {
    const r = await anlegen(mfMitToken, undefined);
    expect(r.status).toBe(401);
    expect(r.data.error).toContain("Admin-Zugang");
  });

  it("falscher Token → 401", async () => {
    const r = await anlegen(mfMitToken, "falsch");
    expect(r.status).toBe(401);
  });

  it("richtiger Token → 200 mit Code und zwei Links", async () => {
    const r = await anlegen(mfMitToken, ADMIN);
    expect(r.status).toBe(200);
    expect(r.data.code).toBeTruthy();
    expect(r.data.links.A).toBeTruthy();
    expect(r.data.links.B).toBeTruthy();
    expect(r.data.links.A).not.toBe(r.data.links.B);
  });

  it("FAIL-CLOSED: ohne konfiguriertes ADMIN_TOKEN ist der Endpunkt gesperrt — selbst ein leerer Header greift nicht", async () => {
    expect((await anlegen(mfOhneToken, ADMIN)).status).toBe(401);   // irgendein Token
    expect((await anlegen(mfOhneToken, "")).status).toBe(401);      // leerer Token
    expect((await anlegen(mfOhneToken, undefined)).status).toBe(401);
  });
});
