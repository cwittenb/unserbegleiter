// BLIND-2 (Slice 3, Invariante I12 „Verdeckte Runde") — gegen den ECHTEN Worker.
// S91: Verdecktheit ist auf der Cloudflare-Plattform eine Speicher-Zusicherung.
// Beweist: Eine offene Runde ohne eigenen Beitrag ist für die andere Rolle
// nicht einmal als existent sichtbar; Abgabe und Aufdeckung laufen nur über
// die servergeführten Routen (Rolle aus der Session); der direkte PUT ist
// gesperrt — er würde aus redigierter Sicht Partner-Beiträge löschen.

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
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

beforeAll(async () => {
  const bundled = await build({
    entryPoints: [path.join(ROOT, "platforms/cloudflare/worker/index.js")],
    bundle: true, format: "esm", external: ["cloudflare:sockets"], write: false, target: "es2022",
  });
  mf = new Miniflare({
    modules: true, script: bundled.outputFiles[0].text,
    kvNamespaces: ["PAARE"], bindings: { ADMIN_TOKEN: ADMIN },
  });
});
afterAll(async () => { if (mf) await mf.dispose(); });

let anna, bernd;
beforeEach(async () => {
  const init = client();
  const { data } = await init.call("POST", "/api/paar", { nameA: "Anna", nameB: "Bernd" }, { "x-admin-token": ADMIN });
  anna = client(); bernd = client();
  await anna.call("POST", "/api/enroll", { token: data.links.A });
  await bernd.call("POST", "/api/enroll", { token: data.links.B });
});

const BEITRAG_A = { closeness: 4, guess: 7, fit: { AG1: 6 } };
const BEITRAG_B = { closeness: 8, guess: 5, fit: { AG1: 3 } };

describe("BLIND-2 · I12 serverseitig", () => {
  it("A gibt ab → B sieht NICHTS (auch keine Existenz der Runde); A sieht nur sich", async () => {
    const r = await anna.call("POST", "/api/mess/beitrag", BEITRAG_A);
    expect(r.status).toBe(200);
    expect(r.data.runde.status).toBe("open");
    expect(r.data.runde.values.A.closeness).toBe(4);
    expect(r.data.runde.values.B).toBeNull();

    const sichtB = (await bernd.call("GET", "/api/bstate/measurements")).data.value;
    expect((sichtB.items || []).length).toBe(0);               // nicht einmal Existenz

    const sichtA = (await anna.call("GET", "/api/bstate/measurements")).data.value;
    expect(sichtA.items.length).toBe(1);
    expect(sichtA.items[0].values.A.guess).toBe(7);
    expect(sichtA.items[0].values.B).toBeNull();
  });

  it("B gibt (blind) auch ab → Server merged in DIESELBE Runde, beide sehen voll »ready«", async () => {
    await anna.call("POST", "/api/mess/beitrag", BEITRAG_A);
    const r = await bernd.call("POST", "/api/mess/beitrag", BEITRAG_B);
    expect(r.data.runde.status).toBe("ready");                 // gemerged, keine Parallel-Runde
    for (const wer of [anna, bernd]) {
      const sicht = (await wer.call("GET", "/api/bstate/measurements")).data.value;
      expect(sicht.items.length).toBe(1);
      expect(sicht.items[0].status).toBe("ready");
      expect(sicht.items[0].values.A.closeness).toBe(4);
      expect(sicht.items[0].values.B.closeness).toBe(8);
    }
  });

  it("direkter PUT auf measurements ist GESPERRT (403 mess_managed) — für beide Rollen", async () => {
    await anna.call("POST", "/api/mess/beitrag", BEITRAG_A);
    for (const wer of [anna, bernd]) {
      const r = await wer.call("PUT", "/api/bstate/measurements", { value: { items: [] } });
      expect(r.status).toBe(403);
      expect(r.data.code).toBe("mess_managed");
    }
    // und der Beitrag hat den Angriff überlebt:
    const sichtA = (await anna.call("GET", "/api/bstate/measurements")).data.value;
    expect(sichtA.items.length).toBe(1);
  });

  it("Aufdeckung nur ID-genau über die Route; gemischte Liste bleibt korrekt redigiert", async () => {
    await anna.call("POST", "/api/mess/beitrag", BEITRAG_A);
    await bernd.call("POST", "/api/mess/beitrag", BEITRAG_B);   // MR1 ready
    const falsch = await anna.call("POST", "/api/mess/aufgedeckt", { rundeId: "MR99" });
    expect(falsch.status).toBe(200);                            // folgenlos, kein Fehler
    let sicht = (await anna.call("GET", "/api/bstate/measurements")).data.value;
    expect(sicht.items[0].status).toBe("ready");
    await anna.call("POST", "/api/mess/aufgedeckt", { rundeId: "MR1" });
    sicht = (await bernd.call("GET", "/api/bstate/measurements")).data.value;
    expect(sicht.items[0].status).toBe("revealed");

    // Neue Runde: nur B gibt ab → für A unsichtbar, revealed bleibt voll da
    await bernd.call("POST", "/api/mess/beitrag", BEITRAG_B);
    const sichtA = (await anna.call("GET", "/api/bstate/measurements")).data.value;
    expect(sichtA.items.length).toBe(1);                        // nur die aufgedeckte
    expect(sichtA.items[0].status).toBe("revealed");
    const sichtB = (await bernd.call("GET", "/api/bstate/measurements")).data.value;
    expect(sichtB.items.length).toBe(2);                        // eigene offene sichtbar
  });

  it("unvollständige oder unplausible Beiträge werden abgewiesen (400 mess_invalid)", async () => {
    for (const kaputt of [{}, { closeness: 4 }, { closeness: 0, guess: 5 }, { closeness: 4, guess: 11 }, { closeness: 4, guess: 5, fit: { AG1: "x" } }]) {
      const r = await anna.call("POST", "/api/mess/beitrag", kaputt);
      expect(r.status).toBe(400);
      expect(r.data.code).toBe("mess_invalid");
    }
  });

  it("ohne Session: Mess-Routen sind dicht (401)", async () => {
    const fremd = client();
    expect((await fremd.call("POST", "/api/mess/beitrag", BEITRAG_A)).status).toBe(401);
    expect((await fremd.call("GET", "/api/bstate/measurements")).status).toBe(401);
  });
});
