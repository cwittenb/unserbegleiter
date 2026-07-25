// S95.3/S95.3b · Karenz (D5) gegen den ECHTEN Worker.
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
  kind: "excerpt", paths: ["shelf"],
  pairs: [{ question: "Was macht das mit dir?", answer: "Es wird klarer.", gapBefore: false }],
  frame: "Ein Stück von neulich.",
};
const NACHRICHT = { kind: "message", paths: ["shelf"], text: "Ich fühle mich allein, wenn du abends arbeitest." };
const BEIDE = { kind: "message", paths: ["shelf", "moment"], text: "Ich vermisse gemeinsame Abende." };

const regal = async wer => (await wer.call("GET", "/api/bstate/shelf")).data.value || { items: [] };
const agenda = async wer => (await wer.call("GET", "/api/bstate/agenda")).data.value || { items: [] };

describe("S95.3 · Karenz serverseitig", () => {
  it("A gibt frei → B sieht NICHTS, A sieht es", async () => {
    const r = await anna.call("POST", "/api/regal/freigabe", AUSSCHNITT);
    expect(r.status).toBe(200);
    expect(r.data.item.kind).toBe("excerpt");
    expect(r.data.item.visibleFrom).toBeTruthy();
    expect(r.data.item.by).toBe("Anna");
    expect(r.data.item.role).toBe("A");
    expect(r.data.freigabe).toBeTruthy();
    expect((await regal(bernd)).items).toHaveLength(0);   // nicht einmal Existenz
    expect((await regal(anna)).items).toHaveLength(1);
  });

  it("S95.3b · auch eine Selbstmitteilung liegt in der Karenz", async () => {
    // Umkehr gegenüber S95.3: gleiche Handlung, gleiche Rücknehmbarkeit.
    await anna.call("POST", "/api/regal/freigabe", NACHRICHT);
    expect((await regal(bernd)).items).toHaveLength(0);
    expect((await regal(anna)).items[0].visibleFrom).toBeTruthy();
  });

  it("der Client kann die Karenz nicht abwählen", async () => {
    const r = await anna.call("POST", "/api/regal/freigabe", {
      ...AUSSCHNITT, visibleFrom: "1999-01-01T00:00:00.000Z", role: "B", by: "Bernd", id: "RGX", freigabe: "FG-fremd",
    });
    expect(Date.parse(r.data.item.visibleFrom)).toBeGreaterThan(Date.now());
    expect(r.data.item.role).toBe("A");
    expect(r.data.item.by).toBe("Anna");
    expect(r.data.item.id).toBe("RG1");
    expect(r.data.item.freigabe).not.toBe("FG-fremd");
    expect((await regal(bernd)).items).toHaveLength(0);
  });

  it("unbekannte Artefakt-Art und leere Wege werden abgewiesen", async () => {
    expect((await anna.call("POST", "/api/regal/freigabe", { kind: "raw", paths: ["shelf"] })).data.code).toBe("regal_kind");
    expect((await anna.call("POST", "/api/regal/freigabe", { kind: "message", paths: [] })).data.code).toBe("regal_weg");
    // "selbst" quert nicht und ist beim Ausschnitt ohnehin kein Weg:
    expect((await anna.call("POST", "/api/regal/freigabe", { ...AUSSCHNITT, paths: ["selbst"] })).data.code).toBe("regal_weg");
  });

  it("direkter PUT auf shelf UND agenda ist gesperrt — für beide Rollen", async () => {
    await anna.call("POST", "/api/regal/freigabe", AUSSCHNITT);
    for (const wer of [anna, bernd]) {
      expect((await wer.call("PUT", "/api/bstate/shelf", { value: { items: [] } })).data.code).toBe("regal_managed");
      expect((await wer.call("PUT", "/api/bstate/agenda", { value: { items: [] } })).data.code).toBe("agenda_managed");
    }
    expect((await regal(anna)).items).toHaveLength(1);   // Angriff überlebt
  });
});

describe("S95.3b · beide Fächer, eine Freigabe", () => {
  it("Regal und Agenda tragen dieselbe Klammer und dieselbe Karenz", async () => {
    const r = await anna.call("POST", "/api/regal/freigabe", BEIDE);
    const fg = r.data.freigabe;
    expect((await regal(anna)).items[0].freigabe).toBe(fg);
    expect((await agenda(anna)).items[0].freigabe).toBe(fg);
    // B sieht in beiden Fächern nichts:
    expect((await regal(bernd)).items).toHaveLength(0);
    expect((await agenda(bernd)).items).toHaveLength(0);
  });

  it("Rücknahme räumt BEIDE Fächer — nicht die Hälfte", async () => {
    const fg = (await anna.call("POST", "/api/regal/freigabe", BEIDE)).data.freigabe;
    expect((await anna.call("POST", "/api/regal/ruecknahme", { freigabe: fg })).status).toBe(200);
    expect((await regal(anna)).items).toHaveLength(0);
    expect((await agenda(anna)).items).toHaveLength(0);
  });

  it("B kann eine fremde Freigabe nicht zurückziehen", async () => {
    const fg = (await anna.call("POST", "/api/regal/freigabe", BEIDE)).data.freigabe;
    expect((await bernd.call("POST", "/api/regal/ruecknahme", { freigabe: fg })).data.code).toBe("regal_sichtbar");
    expect((await regal(anna)).items).toHaveLength(1);
  });

  it("fremde Freigaben bleiben bei der Rücknahme unberührt", async () => {
    const fg1 = (await anna.call("POST", "/api/regal/freigabe", BEIDE)).data.freigabe;
    await bernd.call("POST", "/api/regal/freigabe", NACHRICHT);
    await anna.call("POST", "/api/regal/ruecknahme", { freigabe: fg1 });
    const alle = (await bernd.call("GET", "/api/bstate/shelf")).data.value;
    expect(alle.items).toHaveLength(1);
    expect(alle.items[0].by).toBe("Bernd");
  });
});

describe("S95.3b · Lesestand, Hebung, Agenda-Pflege", () => {
  it("nur der Empfänger setzt den Lesestand", async () => {
    await anna.call("POST", "/api/regal/freigabe", NACHRICHT);
    await anna.call("POST", "/api/regal/gelesen", { itemId: "RG1" });
    expect((await regal(anna)).items[0].read).toBe(false);   // Absender zählt nicht
  });

  it("ein Schreibvorgang des Partners löscht keine fremden Karenz-Items", async () => {
    // Der eigentliche Grund für den PUT-Riegel: B liest ein REDIGIERTES Regal.
    // Käme sein Schreibvorgang von dort, verschwände A's Karenz-Item. Über die
    // Route schreibt der Server mit voller Sicht — nachweisbar an der Nummer,
    // die er vergibt: Sie kennt A's unsichtbares RG1.
    await anna.call("POST", "/api/regal/freigabe", AUSSCHNITT);
    expect((await regal(bernd)).items).toHaveLength(0);           // B sieht nichts
    const r = await bernd.call("POST", "/api/regal/freigabe", NACHRICHT);
    expect(r.data.item.id).toBe("RG2");                            // Server sah RG1
    expect((await regal(anna)).items.map(i => i.id)).toEqual(["RG1"]);
    expect((await regal(bernd)).items.map(i => i.id)).toEqual(["RG2"]);
  });

  it("Vormerkung und Abräumen laufen über Routen, nicht über PUT", async () => {
    await anna.call("POST", "/api/regal/freigabe", BEIDE);
    // Der Owner sieht seinen Agenda-Punkt auch in der Karenz:
    const eigen = (await agenda(anna)).items[0];
    expect((await anna.call("POST", "/api/agenda/vormerkung", { itemId: eigen.id })).status).toBe(200);
    expect((await agenda(anna)).items[0].vormerkung).toBe(true);
    expect((await anna.call("POST", "/api/agenda/abraeumen", { itemId: eigen.id, wie: "selfResolved" })).status).toBe(200);
    expect((await agenda(anna)).items[0].state).toBe("selfResolved");
  });

  it("ein fremder Agenda-Punkt in Karenz ist nicht bearbeitbar", async () => {
    await anna.call("POST", "/api/regal/freigabe", BEIDE);
    await bernd.call("POST", "/api/agenda/abraeumen", { itemId: "AGD1", wie: "discussed" });
    expect((await agenda(anna)).items[0].state).toBe("open");
  });
});
