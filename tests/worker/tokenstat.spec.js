// Worker · Token-Statistik (S61) — gegen den ECHTEN, deploy-gleich gebündelten
// Worker (Miniflare). Beweist:
//   · /api/llm erfasst echte usage im KV — direkt UND Stream — als Paar-Summe
//     (Gesamt + Monats-Eimer), unabhängig davon, welche Rolle aufruft.
//   · /api/paare liefert die Stände (tokens.total / tokens.monat) mit.
//   · /api/tokens (Voll-Export) und /api/tokens/:code (Historie) sind
//     admin-gated und liefern die erwartete Struktur.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Miniflare } from "miniflare";
import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ADMIN = "test-admin-geheim";
const MONAT = new Date().toISOString().slice(0, 7);
let mf;

// Anthropic-Format mit vollständiger usage — inkl. Cache-Feldern.
const DIREKT_USAGE = { input_tokens: 7, output_tokens: 2, cache_read_input_tokens: 3, cache_creation_input_tokens: 1 };
const ANTHROPIC_SSE =
  'event: message_start\n' +
  'data: {"type":"message_start","message":{"usage":{"input_tokens":7,"cache_creation_input_tokens":1,"cache_read_input_tokens":3}}}\n\n' +
  'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hallo Welt"}}\n\n' +
  'data: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":2}}\n\n' +
  'data: {"type":"message_stop"}\n\n';

async function UPSTREAM(request) {
  const body = await request.json();
  if (body.stream)
    return new Response(ANTHROPIC_SSE, { headers: { "content-type": "text/event-stream" } });
  return new Response(JSON.stringify({
    content: [{ type: "text", text: "ok" }], stop_reason: "end_turn", usage: DIREKT_USAGE,
  }), { headers: { "content-type": "application/json" } });
}

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
      try { data = await res.clone().json(); } catch { /* SSE */ }
      return { status: res.status, data, res };
    },
  };
}

beforeAll(async () => {
  const bundled = await build({
    entryPoints: [path.join(ROOT, "platforms/cloudflare/worker/index.js")],
    bundle: true, format: "esm", external: ["cloudflare:sockets"], write: false, target: "es2022",
  });
  mf = new Miniflare({
    modules: true, script: bundled.outputFiles[0].text,
    kvNamespaces: ["PAARE"], compatibilityDate: "2026-06-01",
    bindings: {
      ADMIN_TOKEN: ADMIN, LLM_PROVIDER: "anthropic",
      ANTHROPIC_API_KEY: "k", ANTHROPIC_MODEL: "testmodell",
    },
    serviceBindings: { UPSTREAM },
  });
}, 60000);
afterAll(async () => { await mf?.dispose(); });

let code;   // die Tests bauen aufeinander auf (ein Paar, wachsender Stand)

describe("Worker · Token-Statistik (S61)", () => {
  it("Direktaufruf → Gesamt- UND Monats-Eimer im KV, Paar-Summe (A wie B)", async () => {
    const admin = client();
    const r = await admin.call("POST", "/api/paar", { nameA: "Anna", nameB: "Bernd" }, { "x-admin-token": ADMIN });
    code = r.data.code;

    const anna = client();
    await anna.call("POST", "/api/enroll", { token: r.data.links.A });
    await anna.call("POST", "/api/llm", { system: "S", messages: [{ role: "user", content: "hi" }] });

    const bernd = client();
    await bernd.call("POST", "/api/enroll", { token: r.data.links.B });
    await bernd.call("POST", "/api/llm", { system: "S", messages: [{ role: "user", content: "hallo" }] });

    const kv = await mf.getKVNamespace("PAARE");
    const total = JSON.parse(await kv.get("sys/tokens/" + code + "/total"));
    expect(total).toMatchObject({ calls: 2, in: 14, out: 4, cacheRead: 6, cacheWrite: 2 });
    const monat = JSON.parse(await kv.get("sys/tokens/" + code + "/" + MONAT));
    expect(monat).toMatchObject({ calls: 2, in: 14, out: 4, cacheRead: 6, cacheWrite: 2 });
  });

  it("Stream-Aufruf → usage aus dem done-Event wird ebenfalls erfasst", async () => {
    const kvVorher = await mf.getKVNamespace("PAARE");
    const vorher = JSON.parse(await kvVorher.get("sys/tokens/" + code + "/total"));

    const anna = client();
    // Frische Session über Betreiber-Link (Stufe 2), da der Enroll-Link verbraucht ist.
    const rel = await anna.call("POST", "/api/relink", { code, role: "A" }, { "x-admin-token": ADMIN });
    await anna.call("POST", "/api/enroll", { token: rel.data.token });
    const r = await anna.call("POST", "/api/llm", { system: "S", messages: [{ role: "user", content: "streame" }], stream: true });
    expect(r.status).toBe(200);
    await r.res.text();   // Strom vollständig konsumieren (done-Event abwarten)

    // erfasseUsage läuft NACH dem done-Event — dem Testlauf einen Tick geben.
    await new Promise(res => setTimeout(res, 50));
    const kv = await mf.getKVNamespace("PAARE");
    const total = JSON.parse(await kv.get("sys/tokens/" + code + "/total"));
    expect(total.calls).toBe(vorher.calls + 1);
    expect(total.in).toBe(vorher.in + 7);
    expect(total.out).toBe(vorher.out + 2);
    expect(total.cacheRead).toBe(vorher.cacheRead + 3);
    expect(total.cacheWrite).toBe(vorher.cacheWrite + 1);
  });

  it("/api/paare liefert tokens.total und tokens.monat mit", async () => {
    const admin = client();
    const r = await admin.call("GET", "/api/paare", undefined, { "x-admin-token": ADMIN });
    expect(r.status).toBe(200);
    const zeile = r.data.paare.find(x => x.code === code);
    expect(zeile.tokens.total.calls).toBe(3);
    expect(zeile.tokens.monat.calls).toBe(3);
    expect(zeile.tokens.total.in).toBe(21);
  });

  it("/api/tokens (Voll-Export) — admin-gated, alle Paare × Monate in einem JSON", async () => {
    const ohne = await client().call("GET", "/api/tokens");
    expect(ohne.status).toBe(401);

    const admin = client();
    const r = await admin.call("GET", "/api/tokens", undefined, { "x-admin-token": ADMIN });
    expect(r.status).toBe(200);
    expect(typeof r.data.stand).toBe("string");
    expect(r.data.paare[code].total.calls).toBe(3);
    expect(r.data.paare[code].monate[MONAT].calls).toBe(3);
  });

  it("/api/tokens/:code (Historie) — admin-gated, {total, monate}", async () => {
    const ohne = await client().call("GET", "/api/tokens/" + code);
    expect(ohne.status).toBe(401);

    const admin = client();
    const r = await admin.call("GET", "/api/tokens/" + code, undefined, { "x-admin-token": ADMIN });
    expect(r.status).toBe(200);
    expect(r.data.code).toBe(code);
    expect(r.data.total.in).toBe(21);
    expect(Object.keys(r.data.monate)).toEqual([MONAT]);
  });

  it("Paar ohne LLM-Aufrufe: tokens = {total: null, monat: null}", async () => {
    const admin = client();
    await admin.call("POST", "/api/paar", { nameA: "Cleo", nameB: "Dana" }, { "x-admin-token": ADMIN });
    const r = await admin.call("GET", "/api/paare", undefined, { "x-admin-token": ADMIN });
    const frisch = r.data.paare.find(x => x.code !== code);
    expect(frisch.tokens).toEqual({ total: null, monat: null });
  });
});
