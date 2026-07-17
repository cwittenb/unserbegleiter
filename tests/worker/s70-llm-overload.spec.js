// S70 · Overload-Härtung im Worker (/api/llm, Miniflare).
// (1) Upstream-529 wird wiederholt; je Wiederholung reist ein zahlenloses
//     {retry:true}-Event durch den SSE-Strom, danach normal {delta}…{done};
// (2) bleibt der Upstream überlastet, endet der Strom mit {error, code:
//     "llm_overloaded"} (flach — Alt-Clients lesen error weiter als String);
// (3) der JSON-Altpfad (ohne stream) serialisiert denselben Code über
//     fehler(msg, status, code) mit HTTP-Status 529;
// (4) die Retry-Parameter sind per env übersteuerbar (hier: Mini-Backoffs,
//     damit der Test in Millisekunden läuft — LLM_VERSUCHE=3).

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Miniflare } from "miniflare";
import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ADMIN = "test-admin-geheim";
let mf;
let ueberlastungen = 0;   // wie oft der Upstream zuerst 529 liefert
let upstreamZaehler = 0;  // tatsächliche Upstream-Aufrufe (Retry-Beweis)

const ANTHROPIC_SSE =
  'event: message_start\n' +
  'data: {"type":"message_start","message":{"usage":{"input_tokens":7,"cache_creation_input_tokens":0,"cache_read_input_tokens":0}}}\n\n' +
  'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hallo "}}\n\n' +
  'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Welt"}}\n\n' +
  'data: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":2}}\n\n' +
  'data: {"type":"message_stop"}\n\n';


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
      return res;
    },
  };
}

/** SSE-Body vollständig lesen und die data:-JSONs zurückgeben. */
async function leseEvents(res) {
  const roh = await res.text();
  return roh.split("\n\n").filter(Boolean)
    .map(block => block.split("\n").filter(z => z.startsWith("data:")).map(z => z.slice(5).trim()).join(""))
    .filter(Boolean)
    .map(d => JSON.parse(d));
}

beforeAll(async () => {
  const bundled = await build({
    entryPoints: [path.join(ROOT, "platforms/cloudflare/worker/index.js")],
    bundle: true, format: "esm", external: ["cloudflare:sockets"], write: false, target: "es2022",
  });
  mf = new Miniflare({
    modules: true,
    script: bundled.outputFiles[0].text,
    kvNamespaces: ["PAARE"],
    compatibilityDate: "2026-06-01",
    bindings: {
      ADMIN_TOKEN: ADMIN, LLM_PROVIDER: "anthropic",
      ANTHROPIC_API_KEY: "test-key", ANTHROPIC_MODEL: "test-modell",
      // S70: Robustheits-Tuning per env — hier Mini-Backoffs, damit die
      // Retries im Test Millisekunden statt Sekunden dauern.
      LLM_VERSUCHE: "3", LLM_BACKOFF_MS: "1", LLM_MAX_BACKOFF_MS: "2",
    },
    serviceBindings: {
      async UPSTREAM(request) {
        upstreamZaehler++;
        if (ueberlastungen > 0) {
          ueberlastungen--;
          return new Response(
            '{"type":"error","error":{"type":"overloaded_error","message":"Overloaded"}}',
            { status: 529, headers: { "content-type": "application/json" } });
        }
        const body = await request.json();
        if (body.stream === true)
          return new Response(ANTHROPIC_SSE, { headers: { "content-type": "text/event-stream" } });
        return new Response(JSON.stringify({
          content: [{ type: "text", text: "ok" }], stop_reason: "end_turn",
          usage: { input_tokens: 1, output_tokens: 1 },
        }), { headers: { "content-type": "application/json" } });
      },
    },
  });
});

afterAll(async () => { if (mf) await mf.dispose(); });
beforeEach(() => { ueberlastungen = 0; upstreamZaehler = 0; });

async function angemeldeteAnna() {
  const init = client();
  const res = await init.call("POST", "/api/paar", { nameA: "Anna", nameB: "Bernd" }, { "x-admin-token": ADMIN });
  const { links } = await res.json();
  const anna = client();
  await anna.call("POST", "/api/enroll", { token: links.A });
  return anna;
}

describe("Worker · /api/llm bei Upstream-529 (S70)", () => {
  it("2× 529, dann Erfolg → genau zwei {retry}-Events, danach {delta}…{done}", async () => {
    ueberlastungen = 2;
    const anna = await angemeldeteAnna();
    const res = await anna.call("POST", "/api/llm", { system: "S", messages: [{ role: "user", content: "hi" }], stream: true });
    expect(res.status).toBe(200);
    const events = await leseEvents(res);
    const retries = events.filter(e => e.retry === true);
    const deltas = events.filter(e => typeof e.delta === "string").map(e => e.delta);
    const done = events.find(e => e.done);
    expect(retries.length).toBe(2);
    expect(deltas).toEqual(["Hallo ", "Welt"]);
    expect(done.done).toMatchObject({ text: "Hallo Welt", stop: "end_turn" });
    // zahlenlos: das Event trägt KEINE Versuchs-Zahlen
    for (const r of retries) expect(Object.keys(r)).toEqual(["retry"]);
    expect(upstreamZaehler).toBe(3);
  });

  it("dauerhaft 529 → Strom endet mit {error, code:'llm_overloaded'}, kein done", async () => {
    ueberlastungen = 99;
    const anna = await angemeldeteAnna();
    const res = await anna.call("POST", "/api/llm", { system: "S", messages: [{ role: "user", content: "hi" }], stream: true });
    const events = await leseEvents(res);
    const fehlerEv = events.find(e => e.error);
    expect(fehlerEv).toBeTruthy();
    expect(typeof fehlerEv.error).toBe("string");            // flach: Alt-Clients lesen weiter Strings
    expect(fehlerEv.error).toContain("529");
    expect(fehlerEv.code).toBe("llm_overloaded");
    expect(events.some(e => e.done)).toBe(false);
    expect(events.filter(e => e.retry === true).length).toBe(2);   // versuche=3 → 2 Wartephasen
    expect(upstreamZaehler).toBe(3);                               // env-Override greift
  });

  it("JSON-Altpfad: dauerhaft 529 → HTTP 529 mit {error, code} aus fehler()", async () => {
    ueberlastungen = 99;
    const anna = await angemeldeteAnna();
    const res = await anna.call("POST", "/api/llm", { system: "S", messages: [{ role: "user", content: "hi" }] });
    expect(res.status).toBe(529);
    const data = await res.json();
    expect(data.error).toContain("529");
    expect(data.code).toBe("llm_overloaded");
    expect(upstreamZaehler).toBe(3);
  });

  it("ohne Überlastung bleibt alles beim Alten: keine {retry}-Events", async () => {
    const anna = await angemeldeteAnna();
    const res = await anna.call("POST", "/api/llm", { system: "S", messages: [{ role: "user", content: "hi" }], stream: true });
    const events = await leseEvents(res);
    expect(events.some(e => e.retry)).toBe(false);
    expect(events.find(e => e.done)).toBeTruthy();
    expect(upstreamZaehler).toBe(1);
  });
});
