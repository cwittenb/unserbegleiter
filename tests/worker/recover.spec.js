// Wiedereinstieg per E-Mail — gegen den echten Worker. Der Versand läuft über
// ein Fake-MAIL_UPSTREAM-Service-Binding (die reale SMTP-Übertragung ist
// deploy-verifiziert, hier nicht nötig). Enthält den Mehrgeräte-Beweis.
//
// S45: Adressen zählen erst nach PIN-Bestätigung (zweistufig). Der Lookup für
// /api/recover entsteht strukturell erst bei der Bestätigung — unbestätigte
// Adressen können daher nie einen Link erhalten (D4).

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Miniflare } from "miniflare";
import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ADMIN = "test-admin-geheim";
let mf, script, mails = [];

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
  const anna = client(), bernd = client();
  await anna.call("POST", "/api/enroll", { token: data.links.A });
  await bernd.call("POST", "/api/enroll", { token: data.links.B });
  return { anna, bernd, code: data.code };
}

function linkAus(text) {
  const m = /#t=([A-Za-z0-9]+)/.exec(text || "");
  return m ? m[1] : null;
}
function pinAus(text) {
  const m = /\b(\d{6})\b/.exec(text || "");
  return m ? m[1] : null;
}
function falschePin(pin) { return pin === "000000" ? "000001" : "000000"; }

/** Vollständige, bestätigte Registrierung einer Adresse (Schritt 1 + 2). */
async function registriere(person, email) {
  const r1 = await person.call("POST", "/api/email", { email });
  expect(r1.status).toBe(200);
  const pin = pinAus(mails[mails.length - 1].text);
  expect(pin).toBeTruthy();
  // D6.1a: die Adresse reist bei der Bestätigung mit (Hash-Abgleich serverseitig)
  const r2 = await person.call("POST", "/api/email/confirm", { pin, email });
  expect(r2.status).toBe(200);
}

beforeAll(async () => {
  const bundled = await build({
    entryPoints: [path.join(ROOT, "platforms/cloudflare/worker/index.js")],
    bundle: true, format: "esm", external: ["cloudflare:sockets"], write: false, target: "es2022",
  });
  script = bundled.outputFiles[0].text;
  mf = new Miniflare({
    modules: true, script, kvNamespaces: ["PAARE"], compatibilityDate: "2026-06-01",
    bindings: { ADMIN_TOKEN: ADMIN, RECOVER_RATE: "100", VERIFY_RATE: "100", EMAIL_KEY: "abababababababababababababababababababababababababababababababab" },
    serviceBindings: {
      async MAIL_UPSTREAM(request) { mails.push(await request.json()); return new Response("ok"); },
    },
  });
});
afterAll(async () => { if (mf) await mf.dispose(); });
beforeEach(() => { mails = []; });

describe("Wiedereinstieg · Adresse hinterlegen (zweistufig)", () => {
  it("Schritt 1 verschickt einen 6-stelligen Code an genau die genannte Adresse; erst Schritt 2 zählt", async () => {
    const { anna } = await frischesPaar();
    expect((await anna.call("GET", "/api/me")).data.recoveryEmail).toBe(false);
    expect((await anna.call("POST", "/api/email", { email: "Anna@Beispiel.de" })).status).toBe(200);
    expect(mails).toHaveLength(1);
    expect(mails[0].to).toBe("anna@beispiel.de");             // normalisiert
    const pin = pinAus(mails[0].text);
    expect(pin).toBeTruthy();
    // Noch unbestätigt: zählt nicht als hinterlegt
    expect((await anna.call("GET", "/api/me")).data.recoveryEmail).toBe(false);
    expect((await anna.call("POST", "/api/email/confirm", { pin, email: "Anna@Beispiel.de" })).status).toBe(200);
    const me = (await anna.call("GET", "/api/me")).data;
    expect(me.recoveryEmail).toBe(true);
    expect(JSON.stringify(me)).not.toContain("beispiel.de");   // nur Status, nie die Adresse
  });

  it("ungültige Adresse → 400, keine Mail", async () => {
    const { anna } = await frischesPaar();
    expect((await anna.call("POST", "/api/email", { email: "kein-at-zeichen" })).status).toBe(400);
    expect(mails).toHaveLength(0);
  });

  it("Kollision: dieselbe Adresse für das andere Konto → 409 schon in Schritt 1", async () => {
    const { anna, bernd } = await frischesPaar();
    await registriere(anna, "geteilt@example.com");
    expect((await bernd.call("POST", "/api/email", { email: "geteilt@example.com" })).status).toBe(409);
    // dieselbe Person darf ihre eigene Adresse erneut bestätigen (idempotent)
    await registriere(anna, "geteilt@example.com");
  });

  it("falscher Code → 400 pin_wrong; nach 5 Fehlversuchen → 429 pin_tries; danach pin_none", async () => {
    const { anna } = await frischesPaar();
    await anna.call("POST", "/api/email", { email: "anna@example.com" });
    const pin = pinAus(mails[0].text);
    for (let i = 0; i < 4; i++) {
      const r = await anna.call("POST", "/api/email/confirm", { pin: falschePin(pin), email: "anna@example.com" });
      expect(r.status).toBe(400);
      expect(r.data.code).toBe("pin_wrong");
    }
    const gesperrt = await anna.call("POST", "/api/email/confirm", { pin: falschePin(pin), email: "anna@example.com" });
    expect(gesperrt.status).toBe(429);
    expect(gesperrt.data.code).toBe("pin_tries");
    // Auch der RICHTIGE Code hilft jetzt nicht mehr — neue Anforderung nötig
    const danach = await anna.call("POST", "/api/email/confirm", { pin, email: "anna@example.com" });
    expect(danach.status).toBe(400);
    expect(danach.data.code).toBe("pin_none");
    expect((await anna.call("GET", "/api/me")).data.recoveryEmail).toBe(false);
  });
});

describe("Wiedereinstieg · Klartext-Schutz (S46)", () => {
  it("Bestätigung mit ANDERER Adresse als der aus Schritt 1 → 400 email_mismatch", async () => {
    const { anna } = await frischesPaar();
    await anna.call("POST", "/api/email", { email: "richtig.s46@example.com" });
    const pin = pinAus(mails[0].text);
    const r = await anna.call("POST", "/api/email/confirm", { pin, email: "andere.s46@example.com" });
    expect(r.status).toBe(400);
    expect(r.data.code).toBe("email_mismatch");
  });

  it("nach vollständiger Verifikation liegt die Adresse in KEINEM KV-Wert im Klartext", async () => {
    const { anna } = await frischesPaar();
    await registriere(anna, "geheim.s46@example.com");
    const kv = await mf.getKVNamespace("PAARE");
    const liste = await kv.list();
    for (const k of liste.keys) {
      const wert = (await kv.get(k.name)) || "";
      expect(wert).not.toContain("geheim.s46@example.com");
      expect(wert.toLowerCase()).not.toContain("geheim.s46");
    }
  });
});

describe("Wiedereinstieg · Link anfordern", () => {
  it("BESTÄTIGTE Adresse → Mail mit frischem Einmal-Link; Antwort verrät nichts über Existenz", async () => {
    const { anna } = await frischesPaar();
    await registriere(anna, "anna@example.com");
    mails = [];
    const r = await client().call("POST", "/api/recover", { email: "anna@example.com" });
    expect(r.status).toBe(200);
    expect(r.data).toEqual({ ok: true });
    expect(mails).toHaveLength(1);
    expect(mails[0].to).toBe("anna@example.com");
    expect(linkAus(mails[0].text)).toBeTruthy();
  });

  it("UNregistrierte Adresse → weiterhin 200 {ok:true}, aber KEINE Mail (keine Enumeration)", async () => {
    await frischesPaar();
    const r = await client().call("POST", "/api/recover", { email: "fremde@example.com" });
    expect(r.status).toBe(200);
    expect(r.data).toEqual({ ok: true });
    expect(mails).toHaveLength(0);
  });

  it("UNBESTÄTIGTE Adresse (nur Schritt 1) → keine Mail (D4: nur verifizierte Adressen)", async () => {
    const { anna } = await frischesPaar();
    await anna.call("POST", "/api/email", { email: "offen@example.com" });
    mails = [];
    const r = await client().call("POST", "/api/recover", { email: "offen@example.com" });
    expect(r.status).toBe(200);
    expect(mails).toHaveLength(0);
  });

  it("Adresse ersetzen: alte Adresse führt zu keiner Mail mehr, neue schon", async () => {
    const { anna } = await frischesPaar();
    await registriere(anna, "alt@example.com");
    await registriere(anna, "neu@example.com");
    mails = [];
    await client().call("POST", "/api/recover", { email: "alt@example.com" });
    expect(mails).toHaveLength(0);                                // alter Hash entfernt
    await client().call("POST", "/api/recover", { email: "neu@example.com" });
    expect(mails).toHaveLength(1);
    expect(mails[0].to).toBe("neu@example.com");
  });

  it("MEHRGERÄTE: der Wiedereinstiegs-Link meldet ein ZWEITES Gerät an, ohne das erste auszuloggen", async () => {
    // Eindeutige Adresse je Test: der KV lebt über die Suite, eine Adresse
    // gehört zu genau EINEM Konto (409 sonst schon in Schritt 1 — gewollt).
    const { anna } = await frischesPaar();
    await registriere(anna, "anna.zweitgeraet@example.com");
    mails = [];
    await client().call("POST", "/api/recover", { email: "anna.zweitgeraet@example.com" });
    const token = linkAus(mails[0].text);

    const zweitgeraet = client();
    const e = await zweitgeraet.call("POST", "/api/enroll", { token });
    expect(e.status).toBe(200);
    expect(e.data.role).toBe("A");
    // Zweitgerät hat eigene Session:
    expect((await zweitgeraet.call("GET", "/api/me")).data.role).toBe("A");
    // Erstgerät läuft unverändert weiter (Sessions sind per sid geschlüsselt):
    expect((await anna.call("GET", "/api/me")).status).toBe(200);
    // Der Wiedereinstiegs-Link ist einmalig:
    expect((await client().call("POST", "/api/enroll", { token })).status).toBe(410);
  });
});

describe("Wiedereinstieg · Raten-Limits", () => {
  it("/api/recover oberhalb RECOVER_RATE ⇒ 429 (unabhängig von Existenz der Adresse)", async () => {
    const mf2 = new Miniflare({
      modules: true, script, kvNamespaces: ["PAARE"],
      compatibilityDate: "2026-06-01",
      bindings: { ADMIN_TOKEN: ADMIN, RECOVER_RATE: "2", EMAIL_KEY: "abababababababababababababababababababababababababababababababab" },
      serviceBindings: { async MAIL_UPSTREAM() { return new Response("ok"); } },
    });
    const alt = mf; mf = mf2;
    try {
      expect((await client().call("POST", "/api/recover", { email: "x@example.com" })).status).toBe(200);
      expect((await client().call("POST", "/api/recover", { email: "x@example.com" })).status).toBe(200);
      expect((await client().call("POST", "/api/recover", { email: "x@example.com" })).status).toBe(429);
    } finally { mf = alt; await mf2.dispose(); }
  });

  it("/api/email oberhalb VERIFY_RATE ⇒ 429 (keine Mail-Kanone gegen fremde Postfächer)", async () => {
    const mf2 = new Miniflare({
      modules: true, script, kvNamespaces: ["PAARE"],
      compatibilityDate: "2026-06-01",
      bindings: { ADMIN_TOKEN: ADMIN, VERIFY_RATE: "2", EMAIL_KEY: "abababababababababababababababababababababababababababababababab" },
      serviceBindings: { async MAIL_UPSTREAM(request) { mails.push(await request.json()); return new Response("ok"); } },
    });
    const alt = mf; mf = mf2;
    try {
      const { anna } = await frischesPaar();
      expect((await anna.call("POST", "/api/email", { email: "a@example.com" })).status).toBe(200);
      expect((await anna.call("POST", "/api/email", { email: "a@example.com" })).status).toBe(200);
      const r = await anna.call("POST", "/api/email", { email: "a@example.com" });
      expect(r.status).toBe(429);
      expect(r.data.code).toBe("verify_rate");
    } finally { mf = alt; await mf2.dispose(); }
  });
});

describe("Wiedereinstieg · Versandfehler", () => {
  it("scheitert der Code-Versand, erfährt es die Person (mail_failed) — kein stiller Fehlschlag", async () => {
    const mf2 = new Miniflare({
      modules: true, script, kvNamespaces: ["PAARE"],
      compatibilityDate: "2026-06-01",
      bindings: { ADMIN_TOKEN: ADMIN, EMAIL_KEY: "abababababababababababababababababababababababababababababababab" },
      serviceBindings: { async MAIL_UPSTREAM() { return new Response("kaputt", { status: 500 }); } },
    });
    const alt = mf; mf = mf2;
    try {
      const { anna } = await frischesPaar();
      const r = await anna.call("POST", "/api/email", { email: "anna@example.com" });
      expect(r.status).toBe(502);
      expect(r.data.code).toBe("mail_failed");
    } finally { mf = alt; await mf2.dispose(); }
  });
});

describe("E-Mail-Pflicht · Feature-Flag (D2b)", () => {
  it("EMAIL_PFLICHT gesetzt ⇒ /api/me meldet emailRequired: true; ohne Flag false", async () => {
    const mf2 = new Miniflare({
      modules: true, script, kvNamespaces: ["PAARE"],
      compatibilityDate: "2026-06-01",
      bindings: { ADMIN_TOKEN: ADMIN, EMAIL_PFLICHT: "1", EMAIL_KEY: "abababababababababababababababababababababababababababababababab" },
      serviceBindings: { async MAIL_UPSTREAM() { return new Response("ok"); } },
    });
    const alt = mf; mf = mf2;
    try {
      const { anna } = await frischesPaar();
      expect((await anna.call("GET", "/api/me")).data.emailRequired).toBe(true);
    } finally { mf = alt; await mf2.dispose(); }
    const { anna } = await frischesPaar();
    expect((await anna.call("GET", "/api/me")).data.emailRequired).toBe(false);
  });
});
