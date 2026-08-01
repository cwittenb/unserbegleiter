// E2E · Pages-Vollstack-Smoke (S67, F4): der GEBAUTE Pages-Client fährt gegen
// den ECHTEN Worker (Miniflare, esbuild-Bundle) — Magic-Link-Enrollment,
// Cookie-Session, App-Boot, Solo-Nachricht über /api/llm (Proxy → Upstream-SSE).
//
// Damit ist die komplette Produktionskette einmal durchgestochen:
//   admin legt Paar an → Link → Client konsumiert Token → httpOnly-Cookies →
//   createApp bootet über die Worker-API → Chat sendet → Worker proxied →
//   provider-neutrale SSE → Antwort gerendert.
// Der fetch der happy-dom-Welt wird auf mf.dispatchFetch gebrückt (Cookie-Jar
// im Test, weil happy-dom keine httpOnly-Cookies führt); alles dahinter ist real.

// @vitest-environment happy-dom

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Miniflare } from "miniflare";
import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { coreHash } from "../../scripts/core-hash.js";
import { uebersetzeDrehbuchText } from "../../core/engine/mock-llm.js";
import { warteAuf, warteSendbereit } from "../../platforms/artifact/selbstfahrt.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
/* Wartefenster der e2e-Strecke.
 *
 * Frueher 60s je Fenster, fuenf hintereinander, mit 300s Wanduhr-Polster: Ein
 * Fehlschlag lief damit bis zu fuenf Minuten, bevor er sich meldete — bei einer
 * Suite, in der alles andere in Millisekunden fertig ist, sieht das aus wie ein
 * toter Prozess statt wie ein roter Test.
 *
 * Real braucht die Strecke rund eine Sekunde. Zehn Sekunden sind das Zehnfache
 * und immer noch grosszuegig fuer eine kalte, belastete Maschine — sie sind ein
 * Polster, kein Korrektheits-Kriterium. Der Gewinn ist die Diagnosezeit:
 * Sekunden statt Minuten bis zum Befund. */
const E2E_FENSTER_MS = 10000;

const ADMIN = "test-admin-geheim";
let mf, clientCode, hash;

/** ST3 · Upstream-SSE für STRUKTUR-Anfragen (output_config): das schema-
 *  erzwungene JSON strömt als NORMALE text_delta-Häppchen — die gescripteten
 *  Texte hebt dieselbe Übersetzung wie beim MockLLM in Turn-Daten. */
const sseStruktur = (text, body) => {
  const schema = body.output_config.format.schema;
  const input = uebersetzeDrehbuchText(text, { name: "turn", schema });
  const roh = JSON.stringify(input);
  const deltas = roh.match(/.{1,8}/g) || [""];
  return 'event: message_start\n' +
    'data: {"type":"message_start","message":{"usage":{"input_tokens":7,"cache_creation_input_tokens":0,"cache_read_input_tokens":0}}}\n\n' +
    deltas.map(d => 'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":' + JSON.stringify(d) + '}}\n\n').join("") +
    'data: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":2}}\n\n' +
    'data: {"type":"message_stop"}\n\n';
};

/** Upstream-SSE mit Sentinel-Text — eindeutig gegen UI-Texte (S67-Lehre). */
const sse = text => {
  const deltas = text.match(/.{1,8}/g) || [""];
  return 'event: message_start\n' +
    'data: {"type":"message_start","message":{"usage":{"input_tokens":7,"cache_creation_input_tokens":0,"cache_read_input_tokens":0}}}\n\n' +
    deltas.map(d => 'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":' + JSON.stringify(d) + '}}\n\n').join("") +
    'data: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":2}}\n\n' +
    'data: {"type":"message_stop"}\n\n';
};
let drehbuch = [];

beforeAll(async () => {
  hash = await coreHash();
  const worker = await build({
    entryPoints: [path.join(ROOT, "platforms/cloudflare/worker/index.js")],
    bundle: true, format: "esm", external: ["cloudflare:sockets"], write: false, target: "es2022",
  });
  const client = await build({
    entryPoints: [path.join(ROOT, "platforms/cloudflare/pages/client.js")],
    bundle: true, format: "iife", write: false, target: "es2021",
  });
  clientCode = client.outputFiles[0].text.replace(/__CORE_HASH__/g, hash);
  mf = new Miniflare({
    modules: true,
    script: worker.outputFiles[0].text,
    kvNamespaces: ["PAARE"],
    compatibilityDate: "2026-06-01",
    bindings: { ADMIN_TOKEN: ADMIN, LLM_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "test-key", ANTHROPIC_MODEL: "test-modell" },
    serviceBindings: {
      async UPSTREAM(request) {
        const body = await request.json();
        const text = drehbuch.length ? drehbuch.shift() : "[VOLL] Drehbuch erschöpft";
        const struktur = !!(body.output_config && body.output_config.format);
        if (body.stream === true)
          return new Response(struktur ? sseStruktur(text, body) : sse(text),
            { headers: { "content-type": "text/event-stream" } });
        if (struktur) {
          const input = uebersetzeDrehbuchText(text, { name: "turn", schema: body.output_config.format.schema });
          return new Response(JSON.stringify({
            content: [{ type: "text", text: JSON.stringify(input) }],
            stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 },
          }), { headers: { "content-type": "application/json" } });
        }
        return new Response(JSON.stringify({
          content: [{ type: "text", text }], stop_reason: "end_turn",
          usage: { input_tokens: 1, output_tokens: 1 },
        }), { headers: { "content-type": "application/json" } });
      },
      async MAIL_UPSTREAM() { return new Response("ok"); },
    },
  });
}, 30000);

afterAll(async () => { if (mf) await mf.dispose(); });

/** fetch-Brücke happy-dom → Miniflare mit Cookie-Jar (httpOnly lebt sonst nur im Browser). */
function baueFetchBruecke() {
  const jar = {};
  const protokoll = [];
  const fn = async (pfad, init = {}) => {
    protokoll.push((init.method || "GET") + " " + pfad);
    const headers = { ...(init.headers || {}) };
    const cookies = Object.entries(jar).map(([k, v]) => k + "=" + v).join("; ");
    if (cookies) headers["Cookie"] = cookies;
    const res = await mf.dispatchFetch("http://pb.test" + pfad, { method: init.method || "GET", headers, body: init.body });
    for (const sc of res.headers.getSetCookie?.() || []) {
      const m = /^([^=]+)=([^;]+)/.exec(sc);
      if (m) jar[m[1]] = m[2];
    }
    return res;
  };
  fn.protokoll = protokoll;
  return fn;
}

describe("E2E · Pages-Vollstack (Worker + gebauter Client)", () => {
  it("Magic-Link → Enrollment → App-Boot → Solo-Nachricht über den echten /api/llm-Proxy", async () => {
    // 1 · Betreiber legt das Paar an (echter Admin-Endpunkt) und erhält die Links.
    const paar = await mf.dispatchFetch("http://pb.test/api/paar", {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-token": ADMIN },
      body: JSON.stringify({ nameA: "Anna", nameB: "Bernd" }),
    }).then(r => r.json());
    const token = paar.links.A;                                // mintMagic liefert den rohen Token
    expect(token).toBeTruthy();

    // 2 · Client-Welt: #app, Token im Fragment, fetch-Brücke — dann das GEBAUTE Bundle.
    document.body.innerHTML = '<div id="app"></div>';
    location.hash = "#t=" + token;
    const bruecke = baueFetchBruecke();
    globalThis.fetch = bruecke;
    window.fetch = bruecke;
    drehbuch = [
      "[PF1] Willkommen in deinem Reflexionsgespräch, Anna. Was beschäftigt dich?",
      "[PF2] Ich höre dich — die gemeinsamen Abende fehlen dir.",
    ];
    new Function(clientCode)();

    // 3 · Enrollment verbraucht den Token, die App bootet über die Worker-API.
    await warteAuf(() => document.getElementById("btnMyRoom"), "App bootet bis zur Startseite", { timeoutMs: E2E_FENSTER_MS });
    expect(window.PAARBEGLEITUNG.coreHash).toBe(hash);
    expect(location.hash).toBe("");                            // Token aus der Adresszeile entfernt

    // 4 · In den Solo-Raum und eine Nachricht durch den ECHTEN Proxy schicken.
    document.getElementById("btnMyRoom").click();
    await warteAuf(() => !document.getElementById("scrMyRoom").classList.contains("pb-hidden"), "Mein Raum", { timeoutMs: E2E_FENSTER_MS });
    document.getElementById("btnSolo").click();
    await warteAuf(() => document.body.textContent.includes("[PF1]"), "Eröffnung über /api/llm gerendert", { timeoutMs: E2E_FENSTER_MS });
    await warteSendbereit(document.body, { timeoutMs: E2E_FENSTER_MS });   // Stream zu Ende — sonst schluckt state.warten den Klick
    const inp = document.getElementById("pbInput");
    inp.value = "Mich beschäftigt, dass wir kaum noch gemeinsame Abende haben.";
    document.getElementById("btnSend").click();
    await warteAuf(() => document.body.textContent.includes("[PF2]"), "Antwort (SSE→neutral) gerendert", { timeoutMs: E2E_FENSTER_MS });

    // 5 · Persistenz liegt im Worker-KV (Cookie-Session, derselbe Jar liest über
    //     die API). Das Rendern läuft dem save() der Antwort voraus — pollen.
    const roh = await warteAuf(async () => {
      const j = JSON.stringify(await bruecke("/api/chat/mine/solo").then(r => r.json()));
      return j.includes("[PF2]") ? j : null;
    }, "Antwort im Worker-KV persistiert", { timeoutMs: E2E_FENSTER_MS });
    expect(roh).toContain("[PF1]");
    expect(roh).toContain("gemeinsame Abende");
  }, 120000);   // Wanduhr-Polster: Summe der Fenster plus Luft, nie Korrektheits-Kriterium

  it("abgelaufener Link führt in den Wiedereinstieg statt in eine Sackgasse (voller Stack)", async () => {
    document.body.innerHTML = '<div id="app"></div>';
    location.hash = "#t=voellig-unbekannt";
    const bruecke = baueFetchBruecke();
    globalThis.fetch = bruecke;
    window.fetch = bruecke;
    new Function(clientCode)();
    // Unbekannter Token → reine Fehlermeldung (kein Konto dahinter, S45-Design).
    await warteAuf(() => document.getElementById("app").textContent.trim().length > 0, "Fehlmeldung erscheint");
    expect(document.getElementById("recMail")).toBeFalsy();
  }, 20000);
});
