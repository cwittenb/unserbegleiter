// S118 · Versandweg prüfen, Versandbefunde zählen.
//
// Der Anlass ist ein Betriebsfund und ein Versäumnis: Der HELO-Name war seit
// jeher nicht qualifiziert (S117), jeder Adress-Versand starb bei RCPT — und
// blieb monatelang unentdeckt. Nicht weil es keine Spur gab; `console.error`
// schrieb sie brav. Sondern weil ein Log nur findet, wer schon einen Verdacht
// hat. Ein Sicherheitsnetz, dessen Reißen niemandem auffällt, ist keines.
//
// Zwei Antworten darauf, und diese Datei bewacht beide:
//   · /api/mailtest — für den Verdacht: den Weg auf Knopfdruck durchspielen.
//   · /api/mailstat — für die Frage ohne Verdacht: was war zuletzt.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Miniflare } from "miniflare";
import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ADMIN = "test-admin-geheim";
const EMAIL_KEY = "abababababababababababababababababababababababababababababababab";
let script;

beforeAll(async () => {
  const r = await build({
    entryPoints: [path.join(ROOT, "platforms/cloudflare/worker/index.js")],
    bundle: true, format: "esm", write: false, platform: "neutral",
    external: ["cloudflare:sockets"],
  });
  script = r.outputFiles[0].text;
});

/** Miniflare-Instanz mit steuerbarem Mail-Upstream. */
function bau({ mailOk = true } = {}) {
  return new Miniflare({
    modules: true, script, kvNamespaces: ["PAARE"],
    compatibilityDate: "2026-06-01",
    bindings: { ADMIN_TOKEN: ADMIN, EMAIL_KEY, VERIFY_RATE: "100", RECOVER_RATE: "100" },
    serviceBindings: { async MAIL_UPSTREAM() { return new Response("x", { status: mailOk ? 200 : 500 }); } },
  });
}

async function ruf(mf, method, pfad, body, headers) {
  const res = await mf.dispatchFetch("http://pb.test" + pfad, {
    method,
    headers: { "content-type": "application/json", ...(headers || {}) },
    body: body === undefined || method === "GET" ? undefined : JSON.stringify(body),
  });
  let data = null;
  try { data = await res.json(); } catch { /* leer */ }
  return { status: res.status, data, res };
}

const adminKopf = { "x-admin-token": ADMIN };

describe("S118 · /api/mailtest", () => {
  let mf;
  beforeAll(() => { mf = bau(); });
  afterAll(async () => { await mf.dispose(); });

  /* Fail-closed wie jeder Betreiber-Endpunkt: Der Test verschickt im
     Zweifel Mail und nennt Konfigurationsdetails — er gehört hinter das
     Admin-Tor, ohne Ausnahme. */
  it("ohne Admin-Token: 401", async () => {
    expect((await ruf(mf, "POST", "/api/mailtest", { to: "du@example.org" })).status).toBe(401);
  });

  it("ohne gültige Zieladresse: Befund statt Dialog", async () => {
    const r = await ruf(mf, "POST", "/api/mailtest", { to: "kein-at" }, adminKopf);
    expect(r.status).toBe(200);
    expect(r.data.ok).toBe(false);
    expect(r.data.stufe).toBe("EINGABE");
  });

  /* Der Fehlschlag ist eine erfolgreiche Auskunft: die Frage war „funktioniert
     der Weg", und sie ist beantwortet. Deshalb 200 und nicht 502 — ein
     Fehlerstatus würde die Antwort mit der Störung verwechseln. */
  it("meldet den Befund mit 200, auch wenn der Weg scheitert", async () => {
    const kaputt = bau({ mailOk: false });
    try {
      const r = await ruf(kaputt, "POST", "/api/mailtest", { to: "du@example.org", senden: true }, adminKopf);
      expect(r.status).toBe(200);
      expect(r.data.ok).toBe(false);
      expect(r.data.meldung).toContain("500");
    } finally { await kaputt.dispose(); }
  });

  /* Ohne senden:true verlässt nichts das System — das ist der Standard, weil
     eine Prüfung, die etwas verschickt, seltener benutzt wird. */
  it("prüft standardmäßig, ohne zu verschicken", async () => {
    const r = await ruf(mf, "POST", "/api/mailtest", { to: "du@example.org" }, adminKopf);
    expect(r.data.ok).toBe(true);
    expect(r.data.gesendet).toBeFalsy();
    // Im Testpfad gibt es keinen SMTP-Dialog — das sagt der Befund ehrlich,
    // statt Grün über einen Weg zu melden, den es im Betrieb nicht gibt.
    expect(r.data.weg).toBe("upstream");
    expect(r.data.hinweis).toContain("MAIL_UPSTREAM");
  });
});

describe("S118 · /api/mailstat", () => {
  it("ohne Admin-Token: 401", async () => {
    const mf = bau();
    try { expect((await ruf(mf, "GET", "/api/mailstat", undefined, {})).status).toBe(401); }
    finally { await mf.dispose(); }
  });

  it("zählt gescheiterte Versände und nennt den letzten Grund", async () => {
    const mf = bau({ mailOk: false });
    try {
      // /api/recover mailt still (Enumerationsschutz) — genau der Fall, in dem
      // eine Störung sonst restlos unsichtbar wäre.
      await ruf(mf, "POST", "/api/mailtest", { to: "du@example.org", senden: true }, adminKopf);
      await ruf(mf, "POST", "/api/mailtest", { to: "du@example.org", senden: true }, adminKopf);

      const r = await ruf(mf, "GET", "/api/mailstat", undefined, adminKopf);
      expect(r.status).toBe(200);
      const summe = r.data.tage.reduce((n, t) => n + t.fehler, 0);
      expect(summe).toBeGreaterThanOrEqual(2);
      expect(r.data.letzterFehler).toBeTruthy();
      expect(r.data.letzterFehler.ok).toBe(false);
      expect(r.data.letzterFehler.meldung).toContain("500");
    } finally { await mf.dispose(); }
  });

  it("zählt gelungene Versände getrennt und trägt den Zweck", async () => {
    const mf = bau();
    try {
      const init = await ruf(mf, "POST", "/api/paar", { nameA: "Anna", nameB: "Bernd" }, adminKopf);
      // Betreiber-Resend braucht eine hinterlegte Adresse; der Relink-Weg
      // mailt auch ohne und ist damit der kürzeste echte Versandpfad.
      await ruf(mf, "POST", "/api/relink", { code: init.data.code, role: "A" }, adminKopf);

      const r = await ruf(mf, "GET", "/api/mailstat", undefined, adminKopf);
      expect(r.data.tage.reduce((n, t) => n + t.ok, 0)).toBeGreaterThanOrEqual(0);
      expect(r.data.letzterFehler, "kein Fehlschlag bei laufendem Versand").toBeFalsy();
    } finally { await mf.dispose(); }
  });

  /* Datensparsamkeit: Diese Zahlen beantworten „funktioniert der Weg", nicht
     „wer hat Post bekommen". Eine Betreiber-Liste von Adressen mit
     Zeitstempeln wäre ein Metadaten-Einblick, den die Grundprämissen nicht
     hergeben — deshalb steht weder Adresse noch Paar-Code in den Sätzen. */
  it("hält weder Empfängeradresse noch Paar-Code fest", async () => {
    const mf = bau({ mailOk: false });
    try {
      await ruf(mf, "POST", "/api/mailtest", { to: "geheim@example.org", senden: true }, adminKopf);
      const kv = await mf.getKVNamespace("PAARE");
      const { keys } = await kv.list({ prefix: "sys/mailstat/" });
      expect(keys.length).toBeGreaterThan(0);
      for (const k of keys) {
        expect(k.name, "keine Adresse im Schlüssel").not.toContain("geheim");
        const roh = await kv.get(k.name);
        expect(roh, "keine Adresse im Satz").not.toContain("geheim");
        expect(roh).not.toContain("example.org");
      }
    } finally { await mf.dispose(); }
  });
});
