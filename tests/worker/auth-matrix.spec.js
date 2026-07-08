// Die Auth-Matrix (Spez §5.5) als ausführbare Suite — gegen den ECHTEN,
// deploy-gleich gebündelten Worker in workerd (Miniflare).

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Miniflare } from "miniflare";
import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
let mf;
const ADMIN = "test-admin-geheim";

/* Mini-Client mit Cookie-Glas je Person (Anna, Bernd, Fremde) */
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
      return { status: res.status, data, jar };
    },
    loescheCookie(name) { delete jar[name]; },
    setzeCookie(name, wert) { jar[name] = wert; },
  };
}

/** Frisches Paar: Anna und Bernd eingeschrieben, Sessions aktiv. */
async function frischesPaar() {
  const initiator = client();
  const { data } = await initiator.call("POST", "/api/paar", { nameA: "Anna", nameB: "Bernd" }, { "x-admin-token": ADMIN });
  const anna = client();
  const bernd = client();
  await anna.call("POST", "/api/enroll", { token: data.links.A });
  await bernd.call("POST", "/api/enroll", { token: data.links.B });
  return { anna, bernd, links: data.links, code: data.code };
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
    bindings: { ADMIN_TOKEN: ADMIN },
    serviceBindings: {
      // Mock-Upstream für den LLM-Proxy (Anthropic-Antwortformat)
      async UPSTREAM(request) {
        const body = await request.json();
        return new Response(JSON.stringify({
          content: [{ type: "text", text: "UPSTREAM-ANTWORT auf: " + body.messages.length + " Nachrichten" }],
          stop_reason: "end_turn",
          usage: { input_tokens: 1, output_tokens: 1 },
        }), { headers: { "content-type": "application/json" } });
      },
    },
  });
});

afterAll(async () => { if (mf) await mf.dispose(); });

describe("Enrollment · Magic-Link", () => {
  it("Paar anlegen liefert Code + zwei Links; Enrollment bindet Rolle und Namen", async () => {
    const { anna, bernd } = await frischesPaar();
    expect((await anna.call("GET", "/api/me")).data).toMatchObject({ role: "A", name: "Anna", partner: "Bernd" });
    expect((await bernd.call("GET", "/api/me")).data).toMatchObject({ role: "B", name: "Bernd" });
  });

  it("EINMAL-Token: zweiter Konsum desselben Links scheitert (410)", async () => {
    const { links } = await frischesPaar();
    const dieb = client();
    const r = await dieb.call("POST", "/api/enroll", { token: links.A });
    expect(r.status).toBe(410);
    expect((await dieb.call("GET", "/api/me")).status).toBe(401);
  });

  it("unbekannter Token → 404; abgelaufener Token → 410", async () => {
    expect((await client().call("POST", "/api/enroll", { token: "gibtsnicht" })).status).toBe(404);
    const initiator = client();
    const { data } = await initiator.call("POST", "/api/paar", { nameA: "A", nameB: "B" }, { "x-admin-token": ADMIN });
    const kv = await mf.getKVNamespace("PAARE");
    const k = "sys/magic/" + data.links.A;
    const m = JSON.parse(await kv.get(k));
    m.expiresAt = Date.now() - 1;
    await kv.put(k, JSON.stringify(m));
    expect((await client().call("POST", "/api/enroll", { token: data.links.A })).status).toBe(410);
  });

  it("Neu-Anmeldung über Credential-Cookie (Session weg, Cred da)", async () => {
    const { anna } = await frischesPaar();
    anna.loescheCookie("pb_sid");
    expect((await anna.call("GET", "/api/me")).status).toBe(401);
    expect((await anna.call("POST", "/api/session")).status).toBe(200);
    expect((await anna.call("GET", "/api/me")).data.role).toBe("A");
  });
});

describe("Session · 15 Minuten, touch-to-extend", () => {
  it("abgelaufene Session → 401", async () => {
    const { anna } = await frischesPaar();
    const kv = await mf.getKVNamespace("PAARE");
    // Session künstlich altern lassen
    const sid = (await anna.call("GET", "/api/me")).jar.pb_sid;
    const k = "sys/session/" + sid;
    const s = JSON.parse(await kv.get(k));
    s.expiresAt = Date.now() - 1;
    await kv.put(k, JSON.stringify(s));
    expect((await anna.call("GET", "/api/me")).status).toBe(401);
  });

  it("jede Anfrage verlängert (touch): expiresAt wandert nach vorn", async () => {
    const { anna } = await frischesPaar();
    const kv = await mf.getKVNamespace("PAARE");
    const sid = (await anna.call("GET", "/api/me")).jar.pb_sid;
    const k = "sys/session/" + sid;
    const s1 = JSON.parse(await kv.get(k));
    await new Promise(r => setTimeout(r, 15));
    await anna.call("GET", "/api/me");
    const s2 = JSON.parse(await kv.get(k));
    expect(s2.expiresAt).toBeGreaterThan(s1.expiresAt);
  });
});

describe("Auth-Matrix · „Bernd liest Anna nicht\"", () => {
  it("Pstate: Bernd erhält unter JEDER konstruierbaren Form nur SEINE Daten, nie Annas", async () => {
    const { anna, bernd } = await frischesPaar();
    await anna.call("PUT", "/api/pstate/timeline", { value: { entries: [{ at: "ANNAS-PRIVATES" }] } });
    await bernd.call("PUT", "/api/pstate/timeline", { value: { entries: [{ at: "bernds-eigenes" }] } });

    // 1) regulärer Zugriff → nur Bernds Daten
    const regulaer = await bernd.call("GET", "/api/pstate/timeline");
    expect(JSON.stringify(regulaer.data)).not.toContain("ANNAS-PRIVATES");
    expect(regulaer.data.value.entries[0].at).toBe("bernds-eigenes");

    // 2) Query-Manipulation ?role=A → ignoriert
    const query = await bernd.call("GET", "/api/pstate/timeline?role=A");
    expect(JSON.stringify(query.data)).not.toContain("ANNAS-PRIVATES");

    // 3) Body-Manipulation beim Schreiben {role:"A"} → landet in Bernds Pstate, nicht Annas
    await bernd.call("PUT", "/api/pstate/timeline", { role: "A", value: { entries: [{ at: "einbruchsversuch" }] } });
    const annas = await anna.call("GET", "/api/pstate/timeline");
    expect(annas.data.value.entries[0].at).toBe("ANNAS-PRIVATES");

    // 4) Pfad-Trickserei → 404, kein Datenleck
    for (const pfad of ["/api/pstate/timeline:A", "/api/pstate/A/zeitleiste", "/api/pstate/pstate%3AA"]) {
      const r = await bernd.call("GET", pfad);
      expect(r.status, pfad).toBeGreaterThanOrEqual(400);
      expect(JSON.stringify(r.data || {})).not.toContain("ANNAS-PRIVATES");
    }
  });

  it("Chats: privater Solo-Chat ist je Rolle isoliert; geteilter Chat ist gemeinsam", async () => {
    const { anna, bernd } = await frischesPaar();
    await anna.call("PUT", "/api/chat/mine/solo", { value: { messages: [{ role: "user", content: "ANNAS-CHAT" }] } });
    const b = await bernd.call("GET", "/api/chat/mine/solo");
    expect(b.data.value).toBeNull();                          // Bernd sieht NICHT Annas Solo-Chat
    await anna.call("PUT", "/api/chat/shared/moment", { value: { messages: [{ role: "user", content: "gemeinsam" }] } });
    expect((await bernd.call("GET", "/api/chat/shared/moment")).data.value.messages[0].content).toBe("gemeinsam");
  });

  it("Paar-Isolation: ein zweites Paar sieht NICHTS vom ersten", async () => {
    const p1 = await frischesPaar();
    await p1.anna.call("PUT", "/api/bstate/shelf", { value: { items: [{ id: "R1", text: "PAAR1-GETEILT" }] } });
    const p2 = await frischesPaar();
    const fremd = await p2.anna.call("GET", "/api/bstate/shelf");
    expect(JSON.stringify(fremd.data)).not.toContain("PAAR1-GETEILT");
    expect(fremd.data.value).toEqual({ items: [] });
  });

  it("ohne Session: alle Daten- und LLM-Endpunkte → 401", async () => {
    const fremd = client();
    for (const [m2, pfad] of [
      ["GET", "/api/me"], ["GET", "/api/bstate/shelf"], ["GET", "/api/pstate/timeline"],
      ["POST", "/api/llm"], ["POST", "/api/handover"], ["GET", "/api/chat/mine/solo"],
    ]) {
      expect((await fremd.call(m2, pfad, {})).status, m2 + " " + pfad).toBe(401);
    }
  });
});

describe("Übergabe über die API", () => {
  it("Schreiben geht nur in die EIGENE Rolle (aus Session), Lesen ist geteilt", async () => {
    const { anna, bernd } = await frischesPaar();
    const r = await anna.call("POST", "/api/handover", {
      module: "kernwetten", name: "Anna",
      items: [{ id: "CS1", text: "meine Fassung", rohform: "GEHEIM" }],
      role: "B",   // Einbruchsversuch: wird ignoriert
    });
    expect(r.status).toBe(200);
    const vonB = await bernd.call("GET", "/api/handover/A");
    expect(vonB.data.value.items[0].text).toBe("meine Fassung");
    expect(JSON.stringify(vonB.data)).not.toContain("GEHEIM");   // Fremdfeld-Filter wirkt bis zur API
    expect((await bernd.call("GET", "/api/handover/B")).data.value).toBeNull();
  });

  it("Schema-Zwang: ungültige Übergabe wird abgewiesen", async () => {
    const { anna } = await frischesPaar();
    const r = await anna.call("POST", "/api/handover", { module: "", name: "", items: [{}] });
    expect(r.status).toBeGreaterThanOrEqual(400);
  });
});

describe("LLM-Proxy", () => {
  it("mit Session: Anfrage läuft über den Upstream und kommt in Fassadenform zurück", async () => {
    const { anna } = await frischesPaar();
    const r = await anna.call("POST", "/api/llm", {
      system: "SYS", messages: [{ role: "user", content: "hallo" }],
    });
    expect(r.status).toBe(200);
    expect(r.data.text).toContain("UPSTREAM-ANTWORT");
    expect(r.data.stop).toBe("end_turn");
  });

  it("Denial-of-Wallet: ohne Session kein Upstream-Kontakt (401)", async () => {
    const r = await client().call("POST", "/api/llm", { system: "S", messages: [] });
    expect(r.status).toBe(401);
  });

  it("kaputte Anfrage → 400 statt Upstream-Kontakt", async () => {
    const { anna } = await frischesPaar();
    expect((await anna.call("POST", "/api/llm", { messages: "keine-liste" })).status).toBe(400);
  });
});
