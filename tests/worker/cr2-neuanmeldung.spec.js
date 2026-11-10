// CR-2.1 · Stille Neuanmeldung — gegen den ECHTEN Worker.
//
// Der Fall aus dem Code-Review (C2): Die Sitzung lebt 15 Minuten ohne Anfrage.
// Wer länger an einer Nachricht schreibt, bekam beim Senden 401, und die
// Nachricht war verloren. Das Gerät trägt aber weiter sein Credential — die
// Fassade meldet damit neu an und wiederholt, ohne dass die Person es merkt.

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Miniflare } from "miniflare";
import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { baueRemoteBackend, mitNeuanmeldung } from "../../platforms/cloudflare/pages/remote-backend.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ADMIN = "test-admin-geheim";
let mf;

function macheRohApi() {
  const jar = {}; const rufe = [];
  const api = async (method, pfad, body, extraHeaders) => {
    rufe.push(method + " " + pfad);
    const headers = { ...(body !== undefined ? { "content-type": "application/json" } : {}), ...(extraHeaders || {}) };
    const cookies = Object.entries(jar).map(([k, v]) => k + "=" + v).join("; ");
    if (cookies) headers["Cookie"] = cookies;
    const res = await mf.dispatchFetch("http://pb.test" + pfad, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
    for (const sc of res.headers.getSetCookie?.() || []) { const m = /^([^=]+)=([^;]*)/.exec(sc); if (m) jar[m[1]] = m[2]; }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || "Fehler " + res.status), { status: res.status, code: data.code });
    return data;
  };
  return { api, jar, rufe };
}

beforeAll(async () => {
  const bundled = await build({
    entryPoints: [path.join(ROOT, "platforms/cloudflare/worker/index.js")],
    bundle: true, format: "esm", external: ["cloudflare:sockets"], write: false, target: "es2022",
  });
  mf = new Miniflare({ modules: true, script: bundled.outputFiles[0].text, kvNamespaces: ["PAARE"], bindings: { ADMIN_TOKEN: ADMIN } });
});
afterAll(async () => { if (mf) await mf.dispose(); });

let roh, anna;
beforeEach(async () => {
  const admin = macheRohApi();
  const data = await admin.api("POST", "/api/paar", { nameA: "Anna", nameB: "Bernd" }, { "x-admin-token": ADMIN });
  roh = macheRohApi();
  await roh.api("POST", "/api/enroll", { token: data.links.A });
  anna = baueRemoteBackend(mitNeuanmeldung(roh.api));
});

/** Die Sitzung ist abgelaufen: Das Sitzungs-Cookie zeigt auf nichts mehr. */
const lasseSitzungAblaufen = () => { roh.jar.pb_sid = "abgelaufen-" + Date.now(); roh.rufe.length = 0; };

describe("CR-2.1 · abgelaufene Sitzung ist unsichtbar", () => {
  it("Gegenprobe: ohne Mantel scheitert das Speichern mit 401", async () => {
    lasseSitzungAblaufen();
    const nackt = baueRemoteBackend(roh.api);
    await expect(nackt.chat.save("mine", "einzel", { messages: [], status: "running" })).rejects.toMatchObject({ status: 401 });
  });

  it("Chat speichern nach Ablauf gelingt — mit genau einer Neuanmeldung", async () => {
    lasseSitzungAblaufen();
    const chat = { messages: [{ role: "user", content: "Anna: zwanzig Minuten daran geschrieben" }], status: "running" };
    await anna.chat.save("mine", "einzel", chat);
    expect(roh.rufe).toEqual(["PUT /api/chat/mine/einzel", "POST /api/session", "PUT /api/chat/mine/einzel"]);
    expect((await anna.chat.load("mine", "einzel")).messages[0].content).toContain("zwanzig Minuten");
  });

  it("paralleles Lesen beim Betreten: eine Anmeldung für alle", async () => {
    lasseSitzungAblaufen();
    const r = await Promise.all([anna.info(), anna.bstate.get("goals"), anna.pstate.get("timeline"), anna.handover.get("A")]);
    expect(r[0].role).toBe("A");
    expect(roh.rufe.filter(x => x === "POST /api/session")).toHaveLength(1);
  });

  it("Credential fort → 401 mit Code sitzung (der eine Fall, der Neuladen braucht)", async () => {
    lasseSitzungAblaufen();
    roh.jar.pb_cred = "gibtsnicht";
    await expect(anna.info()).rejects.toMatchObject({ status: 401, code: "sitzung" });
  });
});
