// S70 · Overload-Härtung — Adapter- und i18n-Ebene.
// (1) 529 ist wiederholbar und wird nach erschöpften Versuchen geworfen;
// (2) Full Jitter: Wartezeit = zufall() · gedeckelter Exponential-Backoff,
//     ein Retry-After-Header schlägt den Jitter IMMER;
// (3) LlmHttpError trägt den stabilen Code "llm_overloaded" (429/503/529);
// (4) onRetry/onStatus feuern je Wiederholung genau einmal;
// (5) Proxy-Modus: {retry}-Event → onStatus, Fehler-Events rekonstruieren
//     e.code (flach {error, code}; Alt-Form ohne code bleibt gültig);
// (6) fehlerText lokalisiert Code UND nackten Auslastungs-Status.

import { describe, it, expect, beforeEach } from "vitest";
import { makeAdapter, LlmHttpError } from "../../core/llm/adapter.js";
import { fehlerText, setLocale } from "../../core/i18n/index.js";
import { de } from "../../core/i18n/de.js";
import { en } from "../../core/i18n/en.js";

const basisCfg = {
  provider: "anthropic", mode: "direct", apiKey: "k",
  models: { anthropic: "test-modell" },
  schlaf: async () => {},
};

const okAntwort = () => ({
  status: 200, headers: { get: () => null },
  json: async () => ({ content: [{ type: "text", text: "ok" }], stop_reason: "end_turn" }),
});
const httpFehler = status => ({
  status, headers: { get: () => null },
  json: async () => ({ type: "error", error: { type: "overloaded_error", message: "Overloaded" } }),
  text: async () => '{"type":"error","error":{"type":"overloaded_error"}}',
});

describe("S70 · LlmHttpError.code", () => {
  it('429/503/529 tragen "llm_overloaded", andere Status null', () => {
    for (const s of [429, 503, 529]) expect(new LlmHttpError(s, null, "").code).toBe("llm_overloaded");
    for (const s of [400, 401, 404, 500, 502]) expect(new LlmHttpError(s, null, "").code).toBe(null);
  });
});

describe("S70 · Wiederholung bei 529 mit Full Jitter", () => {
  it("529 wird wiederholt; nach erschöpften Versuchen fliegt der Fehler MIT Code", async () => {
    let calls = 0;
    const fetchFn = async () => { calls++; return httpFehler(529); };
    const call = makeAdapter({ ...basisCfg, versuche: 3 }, fetchFn);
    const e = await call("s", [{ role: "user", content: "hi" }]).catch(x => x);
    expect(calls).toBe(3);
    expect(e).toBeInstanceOf(LlmHttpError);
    expect(e.status).toBe(529);
    expect(e.code).toBe("llm_overloaded");
  });

  it("529 → Erfolg beim zweiten Versuch liefert die Antwort", async () => {
    let calls = 0;
    const fetchFn = async () => (++calls === 1 ? httpFehler(529) : okAntwort());
    const call = makeAdapter({ ...basisCfg, versuche: 3 }, fetchFn);
    const antwort = await call("s", [{ role: "user", content: "hi" }]);
    expect(antwort.text).toBe("ok");
    expect(calls).toBe(2);
  });

  it("Jitter: zufall()=0 → 0 ms; zufall()≈1 → am gedeckelten Backoff", async () => {
    const laeufe = [];
    for (const zufall of [() => 0, () => 0.999999]) {
      const warte = [];
      let calls = 0;
      const fetchFn = async () => (++calls < 3 ? httpFehler(529) : okAntwort());
      const call = makeAdapter({
        ...basisCfg, versuche: 3, backoffMs: 1000, maxBackoffMs: 1500,
        zufall, schlaf: async ms => { warte.push(ms); },
      }, fetchFn);
      await call("s", [{ role: "user", content: "hi" }]);
      laeufe.push(warte);
    }
    expect(laeufe[0]).toEqual([0, 0]);                        // RNG 0 → sofort
    expect(laeufe[1][0]).toBeGreaterThan(999);                // ≈ 1·min(1500, 1000·2⁰)
    expect(laeufe[1][0]).toBeLessThanOrEqual(1000);
    expect(laeufe[1][1]).toBeGreaterThan(1499);               // Deckel: min(1500, 2000)
    expect(laeufe[1][1]).toBeLessThanOrEqual(1500);
  });

  it("Retry-After-Header schlägt den Jitter (Server-Anweisung exakt)", async () => {
    const warte = [];
    let calls = 0;
    const mitHeader = { ...httpFehler(529), headers: { get: k => (k === "retry-after" ? "7" : null) } };
    const fetchFn = async () => (++calls === 1 ? mitHeader : okAntwort());
    const call = makeAdapter({
      ...basisCfg, versuche: 2, zufall: () => 0,              // RNG 0 würde 0 ms bedeuten …
      schlaf: async ms => { warte.push(ms); },
    }, fetchFn);
    await call("s", [{ role: "user", content: "hi" }]);
    expect(warte).toEqual([7000]);                            // … der Header gewinnt trotzdem
  });

  it("onRetry (cfg) und onStatus (per Aufruf) feuern je Wiederholung genau einmal", async () => {
    const retries = [];
    const stati = [];
    let calls = 0;
    const fetchFn = async () => (++calls < 3 ? httpFehler(529) : okAntwort());
    const call = makeAdapter({
      ...basisCfg, versuche: 4, zufall: () => 0,
      onRetry: info => retries.push(info),
    }, fetchFn);
    await call("s", [{ role: "user", content: "hi" }], undefined, art => stati.push(art));
    expect(retries).toEqual([{ status: 529, versuch: 1 }, { status: 529, versuch: 2 }]);
    expect(stati).toEqual(["overloaded_retry", "overloaded_retry"]);
  });

  it("nicht-wiederholbarer Status (404) fliegt sofort, ohne onRetry", async () => {
    const retries = [];
    let calls = 0;
    const fetchFn = async () => { calls++; return httpFehler(404); };
    const call = makeAdapter({ ...basisCfg, versuche: 4, onRetry: i => retries.push(i) }, fetchFn);
    const e = await call("s", [{ role: "user", content: "hi" }]).catch(x => x);
    expect(calls).toBe(1);
    expect(retries).toEqual([]);
    expect(e.code).toBe(null);
  });
});

/* ---- Proxy-Modus: SSE-Events {retry} / {error, code} ---- */

function sseAntwort(events) {
  const body = events.map(e => "data: " + JSON.stringify(e) + "\n\n").join("");
  const bytes = new TextEncoder().encode(body);
  let gelesen = false;
  return {
    status: 200,
    headers: { get: k => (k === "content-type" ? "text/event-stream" : null) },
    body: {
      getReader: () => ({
        read: async () => (gelesen ? { done: true } : (gelesen = true, { done: false, value: bytes })),
      }),
    },
  };
}

describe("S70 · Proxy-Modus: Statuskanal & Fehlercode über die Grenze", () => {
  it("{retry:true} löst onStatus aus und stört delta/done nicht", async () => {
    const fetchFn = async () => sseAntwort([
      { retry: true }, { retry: true },
      { delta: "Hallo " }, { delta: "Welt" },
      { done: { text: "Hallo Welt", stop: "end_turn", usage: null } },
    ]);
    const call = makeAdapter({ mode: "proxy" }, fetchFn);
    const stati = [];
    const deltas = [];
    const antwort = await call("s", [{ role: "user", content: "hi" }], d => deltas.push(d), a => stati.push(a));
    expect(stati).toEqual(["overloaded_retry", "overloaded_retry"]);
    expect(deltas).toEqual(["Hallo ", "Welt"]);
    expect(antwort.text).toBe("Hallo Welt");
  });

  it("{retry} OHNE onStatus bleibt still (kein Absturz)", async () => {
    const fetchFn = async () => sseAntwort([
      { retry: true },
      { done: { text: "ok", stop: "end_turn", usage: null } },
    ]);
    const call = makeAdapter({ mode: "proxy" }, fetchFn);
    const antwort = await call("s", [{ role: "user", content: "hi" }], () => {});
    expect(antwort.text).toBe("ok");
  });

  it("Stream-{error, code} → geworfener Fehler trägt e.code", async () => {
    const fetchFn = async () => sseAntwort([{ error: "LLM HTTP 529 — Overloaded", code: "llm_overloaded" }]);
    const call = makeAdapter({ mode: "proxy" }, fetchFn);
    const e = await call("s", [{ role: "user", content: "hi" }], () => {}).catch(x => x);
    expect(e.message).toContain("529");
    expect(e.code).toBe("llm_overloaded");
  });

  it("Alt-Form: Stream-{error} als bloßer String bleibt gültig (ohne code)", async () => {
    const fetchFn = async () => sseAntwort([{ error: "irgendein Upstream-Fehler" }]);
    const call = makeAdapter({ mode: "proxy" }, fetchFn);
    const e = await call("s", [{ role: "user", content: "hi" }], () => {}).catch(x => x);
    expect(e.message).toBe("irgendein Upstream-Fehler");
    expect(e.code).toBeUndefined();
  });

  it("Nicht-Stream: {error, code} aus fehler() → e.code rekonstruiert", async () => {
    const fetchFn = async () => ({
      status: 529, headers: { get: () => null },
      json: async () => ({ error: "LLM HTTP 529 — Overloaded", code: "llm_overloaded" }),
    });
    const call = makeAdapter({ mode: "proxy" }, fetchFn);
    const e = await call("s", [{ role: "user", content: "hi" }]).catch(x => x);
    expect(e.code).toBe("llm_overloaded");
  });
});

/* ---- fehlerText: Lokalisierung über Code UND nackten Status ---- */

describe("S70 · fehlerText lokalisiert Auslastung", () => {
  beforeEach(() => setLocale("de"));

  it("e.code=llm_overloaded → deutsche Meldung, kein Roh-JSON", () => {
    const txt = fehlerText({ code: "llm_overloaded", message: 'LLM HTTP 529 — {"type":"error"}' });
    expect(txt).toBe(de["fehler.code.llm_overloaded"]);
    expect(txt).not.toContain("529");
  });

  it("nackter Status 429/503/529 (ohne code) → dieselbe Meldung; 404 bleibt roh", () => {
    for (const s of [429, 503, 529])
      expect(fehlerText({ status: s, message: "LLM HTTP " + s })).toBe(de["fehler.code.llm_overloaded"]);
    expect(fehlerText({ status: 404, message: "LLM HTTP 404" })).toBe("LLM HTTP 404");
  });

  it("englische Locale liefert die englische Parität", () => {
    setLocale("en");
    expect(fehlerText({ code: "llm_overloaded", message: "x" })).toBe(en["fehler.code.llm_overloaded"]);
    setLocale("de");
  });

  it("unbekannter Code fällt weiter auf die Server-Meldung zurück", () => {
    expect(fehlerText({ code: "voellig_unbekannt", message: "Original" })).toBe("Original");
  });
});
