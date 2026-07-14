// Betreiber-Kommunikationskanal (S46/D6) — gegen den echten Worker.
// Beweist: Resend mailt einen frischen Einmal-Link an die HINTERLEGTE Adresse
// (transiente Entschlüsselung), mit Deckel und 409 ohne versandfähigen Eintrag.
// Broadcast erzwingt die Nonce-Disziplin (D6.3b): Senden nur nach dryRun,
// inhaltsgebunden, einmalig — und erreicht ausschließlich verifizierte,
// versandfähige Konten. Kein KV-Wert und keine Antwort enthält je Klartext-Adressen.

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Miniflare } from "miniflare";
import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ADMIN = "test-admin-geheim";
const KEY = "ab".repeat(32);
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

const pinAus = t => (/\b(\d{6})\b/.exec(t || "") || [])[1] || null;
const linkAus = t => (/#t=([A-Za-z0-9]+)/.exec(t || "") || [])[1] || null;

async function paarMitAdresse(nameA, nameB, email) {
  const init = client();
  const { data } = await init.call("POST", "/api/paar", { nameA, nameB }, { "x-admin-token": ADMIN });
  const a = client();
  await a.call("POST", "/api/enroll", { token: data.links.A });
  if (email) {
    await a.call("POST", "/api/email", { email });
    await a.call("POST", "/api/email/confirm", { pin: pinAus(mails[mails.length - 1].text), email });
  }
  return { code: data.code, a };
}

beforeAll(async () => {
  const bundled = await build({
    entryPoints: [path.join(ROOT, "platforms/cloudflare/worker/index.js")],
    bundle: true, format: "esm", external: ["cloudflare:sockets"], write: false, target: "es2022",
  });
  mf = new Miniflare({
    modules: true, script: bundled.outputFiles[0].text, kvNamespaces: ["PAARE"],
    compatibilityDate: "2026-06-01",
    bindings: { ADMIN_TOKEN: ADMIN, VERIFY_RATE: "100", EMAIL_KEY: KEY, RESEND_RATE: "3" },
    serviceBindings: {
      async MAIL_UPSTREAM(request) { mails.push(await request.json()); return new Response("ok"); },
    },
  });
});
afterAll(async () => { if (mf) await mf.dispose(); });
beforeEach(() => { mails = []; });

describe("Betreiber · Resend (Stufe 1)", () => {
  it("mailt einen frischen Einmal-Link an die hinterlegte Adresse — der Link meldet die richtige Rolle an", async () => {
    const { code } = await paarMitAdresse("Ines", "Jan", "ines.s46@example.com");
    mails = [];
    const r = await client().call("POST", "/api/resend", { code, role: "A" }, { "x-admin-token": ADMIN });
    expect(r.status).toBe(200);
    expect(r.data.name).toBe("Ines");
    expect(mails).toHaveLength(1);
    expect(mails[0].to).toBe("ines.s46@example.com");
    const token = linkAus(mails[0].text);
    expect(token).toBeTruthy();
    const geraet = client();
    const e = await geraet.call("POST", "/api/enroll", { token });
    expect(e.status).toBe(200);
    expect(e.data.role).toBe("A");
    expect((await client().call("POST", "/api/enroll", { token })).status).toBe(410);   // einmalig
  });

  it("Gates: 401 ohne Token; 404 unbekannter Code; 409 ohne versandfähigen Eintrag", async () => {
    const { code } = await paarMitAdresse("Kim", "Lars", null);
    expect((await client().call("POST", "/api/resend", { code, role: "A" })).status).toBe(401);
    expect((await client().call("POST", "/api/resend", { code: "gibtsnicht", role: "A" }, { "x-admin-token": ADMIN })).status).toBe(404);
    const r = await client().call("POST", "/api/resend", { code, role: "A" }, { "x-admin-token": ADMIN });
    expect(r.status).toBe(409);
    expect(r.data.code).toBe("no_email_enc");
  });

  it("Deckel je Konto (D6.4a): oberhalb RESEND_RATE ⇒ 429", async () => {
    const { code } = await paarMitAdresse("Mia", "Nils", "mia.s46@example.com");
    for (let i = 0; i < 3; i++)
      expect((await client().call("POST", "/api/resend", { code, role: "A" }, { "x-admin-token": ADMIN })).status).toBe(200);
    const r = await client().call("POST", "/api/resend", { code, role: "A" }, { "x-admin-token": ADMIN });
    expect(r.status).toBe(429);
    expect(r.data.code).toBe("resend_rate");
  });

  it("Audit: jede Resend-Ausgabe wird protokolliert", async () => {
    const { code } = await paarMitAdresse("Ole", "Pia", "ole.s46@example.com");
    await client().call("POST", "/api/resend", { code, role: "A" }, { "x-admin-token": ADMIN });
    const kv = await mf.getKVNamespace("PAARE");
    const audit = await kv.list({ prefix: "sys/audit/" });
    const eintraege = [];
    for (const k of audit.keys) eintraege.push(JSON.parse(await kv.get(k.name)));
    expect(eintraege.some(a => a.typ === "resend" && a.code === code && a.role === "A")).toBe(true);
  });
});

describe("Betreiber · Broadcast (Nonce-Disziplin, D6.3b)", () => {
  it("dryRun zählt nur verifizierte, versandfähige Konten und sendet NICHTS; Senden ohne Nonce ist unmöglich", async () => {
    // Zählbasis dieser Suite: alle bisher angelegten Konten mit bestätigter Adresse
    const vorher = await client().call("POST", "/api/broadcast",
      { subject: "Wartung", text: "Am Sonntag 10-11 Uhr.", dryRun: true }, { "x-admin-token": ADMIN });
    expect(vorher.status).toBe(200);
    expect(vorher.data.nonce).toBeTruthy();
    expect(mails).toHaveLength(0);                                  // dryRun sendet nie

    const { code } = await paarMitAdresse("Quirin", "Rosa", "quirin.s46@example.com");
    // Zusätzlich ein Konto mit nur OFFENER (unbestätigter) Verifikation — zählt nicht:
    const halb = await paarMitAdresse("Sven", "Tara", null);
    await halb.a.call("POST", "/api/email", { email: "sven.offen.s46@example.com" });
    mails = [];

    const dry = await client().call("POST", "/api/broadcast",
      { subject: "Wartung", text: "Am Sonntag 10-11 Uhr.", dryRun: true }, { "x-admin-token": ADMIN });
    expect(dry.data.empfaenger).toBe(vorher.data.empfaenger + 1);   // +Quirin, NICHT +Sven
    expect(mails).toHaveLength(0);

    // Direkter Send-Versuch ohne (oder mit falscher) Nonce scheitert:
    expect((await client().call("POST", "/api/broadcast",
      { subject: "Wartung", text: "Am Sonntag 10-11 Uhr." }, { "x-admin-token": ADMIN })).data.code).toBe("nonce_invalid");
    expect((await client().call("POST", "/api/broadcast",
      { subject: "Wartung", text: "Am Sonntag 10-11 Uhr.", nonce: "erfunden" }, { "x-admin-token": ADMIN })).data.code).toBe("nonce_invalid");
  });

  it("Inhalts-Bindung: geänderter Text nach der Vorschau ⇒ nonce_mismatch; unverändert ⇒ Versand; Nonce ist einmalig", async () => {
    await paarMitAdresse("Udo", "Vera", "udo.s46@example.com");
    mails = [];
    const dry = await client().call("POST", "/api/broadcast",
      { subject: "Hinweis", text: "Original.", dryRun: true }, { "x-admin-token": ADMIN });
    const n = dry.data.nonce;

    const geaendert = await client().call("POST", "/api/broadcast",
      { subject: "Hinweis", text: "Manipuliert.", nonce: n }, { "x-admin-token": ADMIN });
    expect(geaendert.status).toBe(409);
    expect(geaendert.data.code).toBe("nonce_mismatch");
    expect(mails).toHaveLength(0);

    const senden = await client().call("POST", "/api/broadcast",
      { subject: "Hinweis", text: "Original.", nonce: n }, { "x-admin-token": ADMIN });
    expect(senden.status).toBe(200);
    expect(senden.data.gesendet).toBe(senden.data.empfaenger);
    expect(senden.data.gesendet).toBeGreaterThan(0);
    expect(mails).toHaveLength(senden.data.gesendet);
    expect(mails.some(m => m.to === "udo.s46@example.com")).toBe(true);
    expect(mails.every(m => m.subject === "Hinweis" && m.text === "Original.")).toBe(true);

    // Einmaligkeit: derselbe Versand kann nicht wiederholt werden (Doppel-Klick/Retry harmlos)
    const nochmal = await client().call("POST", "/api/broadcast",
      { subject: "Hinweis", text: "Original.", nonce: n }, { "x-admin-token": ADMIN });
    expect(nochmal.data.code).toBe("nonce_invalid");
  });

  it("Gate + Audit: 401 ohne Token; die Aussendung wird mit Zahlen protokolliert, nie mit Adressen", async () => {
    expect((await client().call("POST", "/api/broadcast", { subject: "x", text: "y", dryRun: true })).status).toBe(401);
    const kv = await mf.getKVNamespace("PAARE");
    const audit = await kv.list({ prefix: "sys/audit/" });
    let broadcastEintrag = null;
    for (const k of audit.keys) {
      const e = JSON.parse(await kv.get(k.name));
      if (e.typ === "broadcast") broadcastEintrag = e;
      expect(JSON.stringify(e)).not.toContain("@example.com");     // nie Adressen im Audit
    }
    expect(broadcastEintrag).toBeTruthy();
    expect(broadcastEintrag.subject).toBe("Hinweis");
    expect(broadcastEintrag.gesendet).toBeGreaterThan(0);
  });
});
