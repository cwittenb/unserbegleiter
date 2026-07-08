// Paarsprache — beidseitig bestätigter Wechsel (S30·C3), gegen den ECHTEN,
// deploy-gleich gebündelten Worker. Kern-Invariante: locale ändert sich
// AUSSCHLIESSLICH durch zwei gleichlautende Anträge verschiedener Rollen.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Miniflare } from "miniflare";
import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ADMIN = "test-admin-geheim";
let mf;

function client() {
  const jar = {};
  return {
    async call(method, pfad, body, extraHeaders) {
      const headers = { "content-type": "application/json", ...(extraHeaders || {}) };
      const cookies = Object.entries(jar).map(([k, v]) => k + "=" + v).join("; ");
      if (cookies) headers["Cookie"] = cookies;
      const res = await mf.dispatchFetch("http://pb.test" + pfad, {
        method, headers,
        body: body === undefined || method === "GET" ? undefined : JSON.stringify(body),
      });
      for (const sc of res.headers.getSetCookie?.() || []) {
        const m = /^([^=]+)=([^;]+)/.exec(sc);
        if (m) jar[m[1]] = m[2];
      }
      let data = null;
      try { data = await res.json(); } catch { /* leer */ }
      return { status: res.status, data };
    },
  };
}

async function frischesPaar(locale) {
  const initiator = client();
  const { data } = await initiator.call("POST", "/api/paar",
    { nameA: "Anna", nameB: "Bernd", ...(locale ? { locale } : {}) },
    { "x-admin-token": ADMIN });
  const anna = client(), bernd = client();
  await anna.call("POST", "/api/enroll", { token: data.links.A });
  await bernd.call("POST", "/api/enroll", { token: data.links.B });
  return { anna, bernd };
}

beforeAll(async () => {
  const bundled = await build({
    entryPoints: [path.join(ROOT, "platforms/cloudflare/worker/index.js")],
    bundle: true, format: "esm", external: ["cloudflare:sockets"], write: false, target: "es2022",
  });
  mf = new Miniflare({
    modules: true, script: bundled.outputFiles[0].text,
    kvNamespaces: ["PAARE"], compatibilityDate: "2026-06-01",
    bindings: { ADMIN_TOKEN: ADMIN },
  });
});

afterAll(async () => { if (mf) await mf.dispose(); });

describe("Paarsprache · /api/language", () => {
  it("Vorschlag → wartet; Bestätigung der ANDEREN Rolle → gewechselt, Wunsch weg, /api/me spiegelt beides", async () => {
    const { anna, bernd } = await frischesPaar();
    const r1 = await anna.call("POST", "/api/language", { target: "en" });
    expect(r1.status).toBe(200);
    expect(r1.data).toMatchObject({ status: "waiting", locale: "de" });
    expect(r1.data.languageRequest).toMatchObject({ target: "en", by: "A" });

    const meB = (await bernd.call("GET", "/api/me")).data;
    expect(meB.locale).toBe("de");
    expect(meB.languageRequest).toMatchObject({ target: "en", by: "A" });

    const r2 = await bernd.call("POST", "/api/language", { target: "en" });
    expect(r2.data).toMatchObject({ status: "confirmed", locale: "en", languageRequest: null });
    expect((await anna.call("GET", "/api/me")).data).toMatchObject({ locale: "en", languageRequest: null });
  });

  it("EINSEITIG unmöglich: doppelter Antrag DERSELBEN Rolle wechselt nie (idempotent wartend)", async () => {
    const { anna } = await frischesPaar();
    await anna.call("POST", "/api/language", { target: "en" });
    const r = await anna.call("POST", "/api/language", { target: "en" });
    expect(r.data.status).toBe("waiting");
    expect(r.data.locale).toBe("de");
    expect((await anna.call("GET", "/api/me")).data.locale).toBe("de");
  });

  it("Ablehnen durch den Partner: Wunsch weg, Sprache unverändert", async () => {
    const { anna, bernd } = await frischesPaar();
    await anna.call("POST", "/api/language", { target: "en" });
    const r = await bernd.call("DELETE", "/api/language");
    expect(r.data).toMatchObject({ status: "discarded", locale: "de", languageRequest: null });
    expect((await anna.call("GET", "/api/me")).data.languageRequest).toBe(null);
  });

  it("Zurückziehen durch die Vorschlagende: Wunsch weg; erneuter Zyklus funktioniert", async () => {
    const { anna, bernd } = await frischesPaar();
    await anna.call("POST", "/api/language", { target: "en" });
    await anna.call("DELETE", "/api/language");
    expect((await bernd.call("GET", "/api/me")).data.languageRequest).toBe(null);
    await bernd.call("POST", "/api/language", { target: "en" });
    const r = await anna.call("POST", "/api/language", { target: "en" });
    expect(r.data).toMatchObject({ status: "confirmed", locale: "en" });
  });

  it("Antrag auf die aktive Sprache: stiller No-op, offener Wunsch bleibt unberührt", async () => {
    const { anna, bernd } = await frischesPaar();
    await anna.call("POST", "/api/language", { target: "en" });
    const r = await bernd.call("POST", "/api/language", { target: "de" });
    expect(r.data.status).toBe("aktiv");
    expect(r.data.locale).toBe("de");
    expect(r.data.languageRequest).toMatchObject({ target: "en", by: "A" });   // unberührt
  });

  it("Rückweg en→de mit demselben Mechanismus; ungültige Zielsprache → 400", async () => {
    const { anna, bernd } = await frischesPaar("en");
    expect((await anna.call("GET", "/api/me")).data.locale).toBe("en");
    await bernd.call("POST", "/api/language", { target: "de" });
    const r = await anna.call("POST", "/api/language", { target: "de" });
    expect(r.data).toMatchObject({ status: "confirmed", locale: "de" });
    const bad = await anna.call("POST", "/api/language", { target: "fr" });
    expect(bad.status).toBe(400);
    expect(bad.data.code).toBe("language_invalid");
  });

  it("ohne Session → 401", async () => {
    const fremde = client();
    expect((await fremde.call("POST", "/api/language", { target: "en" })).status).toBe(401);
  });
});
