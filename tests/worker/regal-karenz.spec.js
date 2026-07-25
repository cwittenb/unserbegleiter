// S95.3 · Karenz (D5) gegen den ECHTEN Worker.
//
// Beweist, dass „noch zurückziehbar" eine SPEICHER-Zusage ist: Ein Ausschnitt
// in der Karenz verlässt den Worker für den Partner gar nicht — er ist nicht
// ausgegraut, sondern nicht da (I11: kein Sende-Status). Ablage, Lesestand,
// Hebung und Rücknahme laufen ausschließlich über /api/regal/*; der direkte
// PUT auf shelf ist gesperrt, weil ein Read-Modify-Write aus redigierter Sicht
// fremde Karenz-Items löschte.

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

const AUSSCHNITT = {
  kind: "excerpt",
  pairs: [{ question: "Was macht das mit dir?", answer: "Es wird klarer.", gapBefore: false }],
  frame: "Ein Stück von neulich.",
};
const NACHRICHT = { kind: "message", text: "Ich fühle mich allein, wenn du abends arbeitest." };

const regal = async wer => (await wer.call("GET", "/api/bstate/shelf")).data.value || { items: [] };

describe("S95.3 · Karenz serverseitig", () => {
  it("A gibt einen Ausschnitt frei → B sieht NICHTS, A sieht ihn", async () => {
    const r = await anna.call("POST", "/api/regal/freigabe", AUSSCHNITT);
    expect(r.status).toBe(200);
    expect(r.data.item.kind).toBe("excerpt");
    expect(r.data.item.visibleFrom).toBeTruthy();
    expect(r.data.item.by).toBe("Anna");
    expect(r.data.item.role).toBe("A");

    expect((await regal(bernd)).items).toHaveLength(0);   // nicht einmal Existenz
    expect((await regal(anna)).items).toHaveLength(1);
  });

  it("eine Selbstmitteilung ist für beide sofort da", async () => {
    await anna.call("POST", "/api/regal/freigabe", NACHRICHT);
    expect((await regal(bernd)).items).toHaveLength(1);
    expect((await regal(bernd)).items[0].visibleFrom).toBeUndefined();
  });

  it("der Client kann die Karenz nicht abwählen", async () => {
    const r = await anna.call("POST", "/api/regal/freigabe", {
      ...AUSSCHNITT, visibleFrom: "1999-01-01T00:00:00.000Z", role: "B", by: "Bernd", id: "RGX",
    });
    expect(Date.parse(r.data.item.visibleFrom)).toBeGreaterThan(Date.now());
    expect(r.data.item.role).toBe("A");
    expect(r.data.item.by).toBe("Anna");
    expect(r.data.item.id).toBe("RG1");
    expect((await regal(bernd)).items).toHaveLength(0);
  });

  it("unbekannte Artefakt-Art wird abgewiesen", async () => {
    const r = await anna.call("POST", "/api/regal/freigabe", { kind: "raw", text: "x" });
    expect(r.status).toBe(400);
    expect(r.data.code).toBe("regal_kind");
  });

  it("direkter PUT auf shelf ist GESPERRT (403 regal_managed) — für beide Rollen", async () => {
    await anna.call("POST", "/api/regal/freigabe", AUSSCHNITT);
    for (const wer of [anna, bernd]) {
      const r = await wer.call("PUT", "/api/bstate/shelf", { value: { items: [] } });
      expect(r.status).toBe(403);
      expect(r.data.code).toBe("regal_managed");
    }
    expect((await regal(anna)).items).toHaveLength(1);   // Angriff überlebt
  });

  it("A zieht in der Karenz zurück — das Item ist weg", async () => {
    await anna.call("POST", "/api/regal/freigabe", AUSSCHNITT);
    const r = await anna.call("POST", "/api/regal/ruecknahme", { itemId: "RG1" });
    expect(r.status).toBe(200);
    expect((await regal(anna)).items).toHaveLength(0);
  });

  it("B kann fremdes Material nicht zurückziehen", async () => {
    await anna.call("POST", "/api/regal/freigabe", AUSSCHNITT);
    const r = await bernd.call("POST", "/api/regal/ruecknahme", { itemId: "RG1" });
    expect(r.status).toBe(409);
    expect(r.data.code).toBe("regal_sichtbar");
    expect((await regal(anna)).items).toHaveLength(1);
  });

  it("eine Selbstmitteilung ist nicht zurückziehbar", async () => {
    await anna.call("POST", "/api/regal/freigabe", NACHRICHT);
    expect((await anna.call("POST", "/api/regal/ruecknahme", { itemId: "RG1" })).status).toBe(409);
  });

  it("B markiert eine sichtbare Nachricht als gelesen; A kann das nicht", async () => {
    await anna.call("POST", "/api/regal/freigabe", NACHRICHT);
    await anna.call("POST", "/api/regal/gelesen", { itemId: "RG1" });
    expect((await regal(anna)).items[0].read).toBe(false);   // Absender zählt nicht
    await bernd.call("POST", "/api/regal/gelesen", { itemId: "RG1" });
    expect((await regal(anna)).items[0].read).toBe(true);
  });

  it("Hebung über die Route lässt fremde Karenz-Items unversehrt", async () => {
    // Der eigentliche Grund für den PUT-Riegel: B liest redigiert und schreibt.
    await anna.call("POST", "/api/regal/freigabe", AUSSCHNITT);    // RG1, in Karenz
    await bernd.call("POST", "/api/regal/freigabe", NACHRICHT);    // RG2, sofort sichtbar
    const r = await anna.call("POST", "/api/regal/gehoben", { itemId: "RG2" });
    expect(r.status).toBe(200);
    const sichtA = await regal(anna);
    expect(sichtA.items).toHaveLength(2);                          // RG1 hat überlebt
    expect(sichtA.items.find(i => i.id === "RG2").gehoben).toBe(true);
    const agenda = (await anna.call("GET", "/api/bstate/agenda")).data.value;
    expect(agenda.items).toHaveLength(1);
    expect(agenda.items[0].herkunft).toBe("shelf");
  });

  it("ein Item in Karenz ist für den Partner nicht hebbar", async () => {
    await anna.call("POST", "/api/regal/freigabe", AUSSCHNITT);
    await bernd.call("POST", "/api/regal/gehoben", { itemId: "RG1" });
    expect((await regal(anna)).items[0].gehoben).toBeUndefined();
  });
});
