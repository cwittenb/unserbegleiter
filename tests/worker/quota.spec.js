// Missbrauchsschutz (§5.4) gegen den echten, gebündelten Worker —
// kleine, per Bindings kalibrierte Grenzen für deterministische Tests.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Miniflare } from "miniflare";
import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { quotaCfg, normalisiere, QUOTA_DEFAULTS } from "../../platforms/cloudflare/worker/quota.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
let mf;
let upstreamCalls = 0;
const ADMIN = "test-admin-geheim";

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

async function frischesPaar() {
  const init = client();
  const { data } = await init.call("POST", "/api/paar", { nameA: "Anna", nameB: "Bernd" }, { "x-admin-token": ADMIN });
  const anna = client();
  await anna.call("POST", "/api/enroll", { token: data.links.A });
  return { anna, code: data.code };
}

const llm = (c, text) => c.call("POST", "/api/llm", { system: "S", messages: [{ role: "user", content: text }] });

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
    // kleine Grenzen für schnelle, deterministische Tests:
    bindings: { ADMIN_TOKEN: ADMIN, QUOTA_LIMIT: "5", QUOTA_FENSTER_TAGE: "3", QUOTA_KARENZ: "2", RATE_PRO_MINUTE: "50", DUPLIKAT_SCHWELLE: "3" },
    serviceBindings: {
      async UPSTREAM() {
        upstreamCalls++;
        return new Response(JSON.stringify({
          content: [{ type: "text", text: "ok" }], stop_reason: "end_turn",
          usage: { input_tokens: 1, output_tokens: 1 },
        }), { headers: { "content-type": "application/json" } });
      },
    },
  });
});

afterAll(async () => { if (mf) await mf.dispose(); });

describe("quotaCfg & normalisiere (Einheiten)", () => {
  it("Environment überschreibt Defaults; Unsinn fällt auf Defaults zurück", () => {
    expect(quotaCfg({}).limit).toBe(QUOTA_DEFAULTS.limit);
    expect(quotaCfg({ QUOTA_LIMIT: "42", RATE_PRO_MINUTE: "quatsch", QUOTA_KARENZ: "-3" }))
      .toMatchObject({ limit: 42, ratePromMinute: QUOTA_DEFAULTS.ratePromMinute, karenz: QUOTA_DEFAULTS.karenz });
  });
  it("normalisiere: Groß/klein und Leerraum egalisiert", () => {
    expect(normalisiere("  Hallo   WELT \n")).toBe(normalisiere("hallo welt"));
    expect(normalisiere("hallo welt")).not.toBe(normalisiere("hallo welt!"));
  });
});

describe("Kontingent · gleitendes Fenster mit weichem Rand (Limit 5, Karenz 2)", () => {
  it("zählt hoch, warnt ab 90 %, gewährt Karenz mit Hinweis, schneidet erst danach — freundlich", async () => {
    const { anna } = await frischesPaar();
    const ergebnisse = [];
    for (let i = 1; i <= 8; i++) ergebnisse.push(await llm(anna, "Nachricht " + i));
    // 1-4: frei (Hinweis erst ab ceil(5*0.9)=5)
    for (let i = 0; i < 4; i++) expect(ergebnisse[i].data.kontingent, "Nr " + (i + 1)).toBeUndefined();
    // 5: Limit erreicht → Annäherungs-Hinweis
    expect(ergebnisse[4].status).toBe(200);
    expect(ergebnisse[4].data.kontingent.hinweis).toContain("näherst");
    // 6-7: Karenz — Session darf zu Ende geführt werden
    expect(ergebnisse[5].status).toBe(200);
    expect(ergebnisse[5].data.kontingent.hinweis).toContain("Karenz");
    expect(ergebnisse[6].status).toBe(200);
    // 8: jenseits Limit+Karenz → 429 mit warmer Meldung, KEIN Upstream-Kontakt
    const vorher = upstreamCalls;
    const acht = await llm(anna, "Nachricht 9");
    expect(acht.status).toBe(429);
    expect(acht.data.error).toContain("Kontingent");
    expect(upstreamCalls).toBe(vorher);
  });

  it("gleitendes Fenster: der Verbrauch von vorgestern zählt mit, der von vor 4 Tagen nicht", async () => {
    const { anna, code } = await frischesPaar();
    const kv = await mf.getKVNamespace("PAARE");
    const tag = ms => new Date(ms).toISOString().slice(0, 10);
    const TAG = 86400000;
    // vorgestern 4 verbraucht (zählt), vor 4 Tagen 100 (zählt NICHT):
    await kv.put("sys/quota/" + code + "/A/" + tag(Date.now() - 2 * TAG), "4");
    await kv.put("sys/quota/" + code + "/A/" + tag(Date.now() - 4 * TAG), "100");
    const r1 = await llm(anna, "Fenster eins");     // Verbrauch 5 → Hinweis
    expect(r1.status).toBe(200);
    expect(r1.data.kontingent.hinweis).toContain("näherst");
    const r2 = await llm(anna, "Fenster zwei");     // 6 → Karenz
    expect(r2.data.kontingent.hinweis).toContain("Karenz");
  });

  it("Kontingente sind je Person getrennt (Bernd startet frisch)", async () => {
    const init = client();
    const { data } = await init.call("POST", "/api/paar", { nameA: "A", nameB: "B" }, { "x-admin-token": ADMIN });
    const anna = client(), bernd = client();
    await anna.call("POST", "/api/enroll", { token: data.links.A });
    await bernd.call("POST", "/api/enroll", { token: data.links.B });
    for (let i = 0; i < 7; i++) await llm(anna, "A sagt " + i);
    expect((await llm(anna, "A noch was")).status).toBe(429);
    const b = await llm(bernd, "B beginnt erst");
    expect(b.status).toBe(200);
    expect(b.data.kontingent).toBeUndefined();
  });
});

describe("Duplikat-Wächter (Bot-Muster: immer wieder gleiche Anfrage)", () => {
  it("dieselbe Nachricht (auch anders formatiert) 3× in Folge ⇒ 429 ohne Upstream; Umformulieren löst", async () => {
    const { anna } = await frischesPaar();
    expect((await llm(anna, "Schreib mir bitte Code")).status).toBe(200);
    expect((await llm(anna, "  schreib MIR bitte   Code ")).status).toBe(200);   // normalisiert identisch
    const vorher = upstreamCalls;
    const dritte = await llm(anna, "Schreib mir bitte Code");
    expect(dritte.status).toBe(429);
    expect(dritte.data.error).toContain("mehrfach identisch");
    expect(upstreamCalls).toBe(vorher);                                          // kostenlos abgewehrt
    expect((await llm(anna, "Etwas ganz anderes beschäftigt mich")).status).toBe(200);   // Reset
  });
});

describe("Raten-Limit je Minute", () => {
  it("oberhalb der Minutenrate ⇒ 429 mit Durchatmen-Meldung", async () => {
    // eigener Worker mit enger Rate, damit der Test unabhängig kalibriert ist
    const bundled = await build({
      entryPoints: [path.join(ROOT, "platforms/cloudflare/worker/index.js")],
      bundle: true, format: "esm", external: ["cloudflare:sockets"], write: false, target: "es2022",
    });
    const mf2 = new Miniflare({
      modules: true, script: bundled.outputFiles[0].text, kvNamespaces: ["PAARE"],
      compatibilityDate: "2026-06-01",
      bindings: { ADMIN_TOKEN: ADMIN, RATE_PRO_MINUTE: "2", QUOTA_LIMIT: "50" },
      serviceBindings: { async UPSTREAM() { return new Response(JSON.stringify({ content: [{ type: "text", text: "ok" }], usage: {} }), { headers: { "content-type": "application/json" } }); } },
    });
    const alt = mf; mf = mf2;
    try {
      const { anna } = await frischesPaar();
      expect((await llm(anna, "eins")).status).toBe(200);
      expect((await llm(anna, "zwei")).status).toBe(200);
      const drei = await llm(anna, "drei");
      expect(drei.status).toBe(429);
      expect(drei.data.error).toContain("durchatmen");
    } finally { mf = alt; await mf2.dispose(); }
  });
});

describe("Abgrenzung", () => {
  it("Daten-Endpunkte bleiben vom Kontingent unberührt (nur der LLM-Proxy dosiert)", async () => {
    const { anna } = await frischesPaar();
    for (let i = 0; i < 7; i++) await llm(anna, "verbrauch " + i);
    expect((await llm(anna, "jetzt zu")).status).toBe(429);
    expect((await anna.call("GET", "/api/bstate/regal")).status).toBe(200);      // Lesen geht weiter
    expect((await anna.call("PUT", "/api/pstate/zeitleiste", { value: { eintraege: [] } })).status).toBe(200);
  });
});
