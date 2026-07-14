// Betreiber-Wiederherstellung (S45) — gegen den echten Worker.
// Beweist: Paar-Liste und Relink sind admin-gated; der Direktlink ist
// kurzlebig-einmalig, meldet die RICHTIGE Rolle an und hinterlässt einen
// Audit-Eintrag. Die Liste macht den Paar-Code (Unique Key) wiederauffindbar.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Miniflare } from "miniflare";
import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ADMIN = "test-admin-geheim";
let mf, mails = [];

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

function pinAus(text) {
  const m = /\b(\d{6})\b/.exec(text || "");
  return m ? m[1] : null;
}

beforeAll(async () => {
  const bundled = await build({
    entryPoints: [path.join(ROOT, "platforms/cloudflare/worker/index.js")],
    bundle: true, format: "esm", external: ["cloudflare:sockets"], write: false, target: "es2022",
  });
  mf = new Miniflare({
    modules: true, script: bundled.outputFiles[0].text, kvNamespaces: ["PAARE"],
    compatibilityDate: "2026-06-01",
    bindings: { ADMIN_TOKEN: ADMIN, VERIFY_RATE: "100" },
    serviceBindings: {
      async MAIL_UPSTREAM(request) { mails.push(await request.json()); return new Response("ok"); },
    },
  });
});
afterAll(async () => { if (mf) await mf.dispose(); });

describe("Betreiber · Paar-Liste", () => {
  it("ist admin-gated (401 ohne Token)", async () => {
    expect((await client().call("GET", "/api/paare")).status).toBe(401);
  });

  it("listet Paare mit Code, Namen und Adress-Status je Rolle", async () => {
    const init = client();
    const { data } = await init.call("POST", "/api/paar", { nameA: "Clara", nameB: "David" }, { "x-admin-token": ADMIN });
    const clara = client();
    await clara.call("POST", "/api/enroll", { token: data.links.A });
    await clara.call("POST", "/api/email", { email: "clara@example.com" });
    await clara.call("POST", "/api/email/confirm", { pin: pinAus(mails[mails.length - 1].text) });

    const r = await client().call("GET", "/api/paare", undefined, { "x-admin-token": ADMIN });
    expect(r.status).toBe(200);
    const zeile = r.data.paare.find(p => p.code === data.code);
    expect(zeile).toBeTruthy();
    expect(zeile.nameA).toBe("Clara");
    expect(zeile.nameB).toBe("David");
    expect(zeile.emailA).toBe(true);      // bestätigt
    expect(zeile.emailB).toBe(false);     // nie hinterlegt
    expect(JSON.stringify(r.data)).not.toContain("example.com");   // nie Klartext-Adressen
  });
});

describe("Betreiber · Notfall-Direktlink (Stufe 2)", () => {
  it("ist admin-gated; unbekannter Code → 404; unbekannte Rolle → 400", async () => {
    expect((await client().call("POST", "/api/relink", { code: "x", role: "A" })).status).toBe(401);
    expect((await client().call("POST", "/api/relink", { code: "gibtsnicht", role: "A" }, { "x-admin-token": ADMIN })).status).toBe(404);
    expect((await client().call("POST", "/api/relink", { code: "x", role: "C" }, { "x-admin-token": ADMIN })).status).toBe(400);
  });

  it("liefert einen einmaligen Token für die RICHTIGE Rolle und protokolliert die Ausgabe", async () => {
    const init = client();
    const { data } = await init.call("POST", "/api/paar", { nameA: "Eva", nameB: "Finn" }, { "x-admin-token": ADMIN });

    const r = await client().call("POST", "/api/relink", { code: data.code, role: "B" }, { "x-admin-token": ADMIN });
    expect(r.status).toBe(200);
    expect(r.data.token).toBeTruthy();
    expect(r.data.name).toBe("Finn");                 // Namens-Echo gegen Rollen-Verwechslung

    // Der Token meldet Person B an — und nur einmal
    const geraet = client();
    const e = await geraet.call("POST", "/api/enroll", { token: r.data.token });
    expect(e.status).toBe(200);
    expect(e.data.role).toBe("B");
    expect(e.data.name).toBe("Finn");
    expect((await client().call("POST", "/api/enroll", { token: r.data.token })).status).toBe(410);

    // Audit-Eintrag im KV
    const kv = await mf.getKVNamespace("PAARE");
    const audit = await kv.list({ prefix: "sys/audit/" });
    const eintraege = [];
    for (const k of audit.keys) eintraege.push(JSON.parse(await kv.get(k.name)));
    expect(eintraege.some(a => a.typ === "relink" && a.code === data.code && a.role === "B")).toBe(true);
  });
});
