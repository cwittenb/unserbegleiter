// pages/client.js unter Test (S66) — der einzige Code zwischen Nutzer und
// Worker in Produktion, bisher nur per i18n-grep geprüft. happy-dom + Fetch-Mock;
// das Modul bootet beim Import selbst (Auto-Boot), deshalb je Fall frischer
// Import über vi.resetModules() und ein vorbereitetes DOM/fetch.

// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeEach } from "vitest";

const PFAD = "../../platforms/cloudflare/pages/client.js";

/** Fetch-Mock: Antworten je (METHOD PFAD); alles andere → 404. Protokolliert Aufrufe. */
function fetchMock(routen) {
  const aufrufe = [];
  const fn = vi.fn(async (pfad, init = {}) => {
    const key = (init.method || "GET") + " " + pfad;
    aufrufe.push({ key, body: init.body ? JSON.parse(init.body) : undefined });
    const r = routen[key];
    if (!r) return { ok: false, status: 404, json: async () => ({ error: "not found" }) };
    return { ok: r.status ? r.status < 400 : true, status: r.status || 200, json: async () => (r.json || {}) };
  });
  fn.aufrufe = aufrufe;
  return fn;
}

async function starteClient({ routen = {}, hash = "" } = {}) {
  vi.resetModules();
  document.body.innerHTML = '<div id="app"></div>';
  location.hash = hash;
  const fetchFn = fetchMock(routen);
  vi.stubGlobal("fetch", fetchFn);
  const mod = await import(PFAD);
  await new Promise(r => setTimeout(r, 0));   // Auto-Boot (fire-and-forget) ausschwingen lassen
  return { mod, fetchFn, app: document.getElementById("app") };
}

beforeEach(() => { vi.unstubAllGlobals(); localStorage.clear(); location.hash = ""; });

describe("Pages-Client · Wiedereinstieg (kein Zugang)", () => {
  it("ohne Token, /api/me und /api/session scheitern → Wiedereinstiegs-Screen mit Mail-Feld", async () => {
    const { app, fetchFn } = await starteClient({ routen: {} });   // alles 404
    expect(fetchFn.aufrufe.map(a => a.key)).toEqual(["GET /api/me", "POST /api/session"]);
    expect(app.querySelector("#recMail")).toBeTruthy();
    expect(app.querySelector("#recGo")).toBeTruthy();
  });

  /* L3 (Turn 46) · Die Meldungszeile #recMsg ist entfallen: die Quittung
     ersetzt die Zeile nicht, sie schreibt IN IHR weiter. Die Rueckmeldung bei
     leerer Adresse steht seither im Hinweis unter der Zeile (#recHinweis) —
     dieselbe Aussage, ein Element weniger. Geprueft wird weiterhin dasselbe
     Verhalten: leer → keine Anfrage, gefuellt → POST. */
  it("Recover-Knopf: leere Adresse → Hinweis, KEIN Request; mit Adresse → POST /api/recover", async () => {
    const { app, fetchFn } = await starteClient({ routen: { "POST /api/recover": { json: {} } } });
    const go = app.querySelector("#recGo"), hinweis = app.querySelector("#recHinweis");
    const vorher = hinweis.textContent;
    go.click();
    await new Promise(r => setTimeout(r, 5));
    expect(hinweis.textContent).not.toBe(vorher);
    expect(fetchFn.aufrufe.some(a => a.key === "POST /api/recover")).toBe(false);
    app.querySelector("#recMail").value = "anna@example.org";
    go.click();
    await new Promise(r => setTimeout(r, 5));
    const rec = fetchFn.aufrufe.find(a => a.key === "POST /api/recover");
    expect(rec.body).toEqual({ email: "anna@example.org" });
  });

  it("keine Enumeration: Fehler des Recover-Endpoints zeigt dieselbe Quittung", async () => {
    const { app } = await starteClient({ routen: { "POST /api/recover": { status: 500, json: { error: "kaputt" } } } });
    app.querySelector("#recMail").value = "wer@auch.immer";
    app.querySelector("#recGo").click();
    await new Promise(r => setTimeout(r, 5));
    // Die Quittung steht jetzt IN der Zeile (L3): Adresse links, "Gesendet"
    // rechts. Der Status bleibt so unsichtbar wie zuvor.
    const zeile = app.querySelector(".rz-eintrag").textContent;
    expect(zeile).not.toMatch(/kaputt|500|Fehler/i);
    expect(app.querySelector(".rz-quittung")).toBeTruthy();
    expect(app.querySelector("#recHinweis").textContent.length).toBeGreaterThan(0);
  });

  it("Sprachumschalter baut den Screen in der anderen Sprache neu und merkt sich die Wahl", async () => {
    const { app } = await starteClient({ routen: {} });
    // L3 · Der Titel ist jetzt ein h1 (.rz-h1) — der Screen traegt eine
    // eigene Ueberschrift, keine Unterueberschrift eines fehlenden Titels.
    const vorher = app.querySelector(".rz-h1").textContent;
    // Boot wählt die Browser-Sprache (happy-dom: en) — umgeschaltet wird auf die jeweils ANDERE.
    const ziel = document.documentElement.lang === "de" ? "en" : "de";
    app.querySelector('[data-wspr="' + ziel + '"]').click();
    expect(document.documentElement.lang).toBe(ziel);
    expect(localStorage.getItem("pb.sprache")).toBe(ziel);
    expect(app.querySelector(".rz-h1").textContent).not.toBe(vorher);
  });
});

describe("Pages-Client · Enrollment-Token", () => {
  /* L3 (Turn 46) · Aus "Fehlerbox PLUS Wiedereinstieg" ist "die Lage WIRD die
     Ueberschrift" geworden. Ein verbrauchter Einmal-Link ist kein Fehler des
     Nutzers, sondern der normale Ablauf — und in einer Oberflaeche aus
     Haarlinien ist ein roter Kasten der lauteste Ton, den es gibt. Die
     Zusicherung bleibt dieselbe: keine Sackgasse, der Weg steht darunter. */
  it("verbrauchter Link (link_used): Lage als Ueberschrift, Weg darunter — keine Sackgasse", async () => {
    const { app, fetchFn } = await starteClient({
      hash: "#t=abc",
      routen: { "POST /api/enroll": { status: 410, json: { error: "verbraucht", code: "link_used" } } },
    });
    expect(fetchFn.aufrufe[0]).toEqual({ key: "POST /api/enroll", body: { token: "abc" } });
    expect(app.querySelector("#recMail")).toBeTruthy();          // Wiedereinstieg steht darunter
    expect(app.querySelector(".rz-caps")).toBeTruthy();          // "Einmal-Link"
    expect(app.querySelector(".rz-h1").textContent.length).toBeGreaterThan(0);
    expect(app.innerHTML, "keine rote Box mehr").not.toContain("188,74,74");
  });

  it("unbekannter Token: reine Fehlermeldung, KEIN Wiedereinstieg (kein Konto dahinter)", async () => {
    const { app } = await starteClient({
      hash: "#t=xyz",
      routen: { "POST /api/enroll": { status: 404, json: { error: "unbekannt", code: "link_unknown" } } },
    });
    expect(app.querySelector("#recMail")).toBeFalsy();
  });
});

describe("Pages-Client · remoteBackend-Mapping (Wire-Verträge)", () => {
  it("language.request sendet { target } an POST /api/language (Bugfix S66 — vorher ReferenceError)", async () => {
    const { mod, fetchFn } = await starteClient({ routen: { "POST /api/language": { json: { locale: "de", status: "waiting" } } } });
    await mod.remoteBackend().language.request("en");
    const call = fetchFn.aufrufe.find(a => a.key === "POST /api/language");
    expect(call.body).toEqual({ target: "en" });
  });

  it("bstate/pstate/chat/handover treffen die erwarteten Pfade und packen value aus", async () => {
    const { mod, fetchFn } = await starteClient({ routen: {
      "GET /api/bstate/lage": { json: { value: { x: 1 } } },
      "PUT /api/pstate/language": { json: {} },
      "GET /api/chat/einzel/a": { json: { value: { msgs: [] } } },
      "POST /api/handover": { json: { ok: true } },
    } });
    const b = mod.remoteBackend();
    expect(await b.bstate.get("lage")).toEqual({ x: 1 });
    await b.pstate.set("language", "en");
    expect(localStorage.getItem("pb.sprache")).toBe("en");      // Spiegelung für Vor-Session
    expect(await b.chat.load("einzel", "a")).toEqual({ msgs: [] });
    await b.handover.post({ role: "A" });
    const pfade = fetchFn.aufrufe.map(a => a.key);
    expect(pfade).toContain("GET /api/bstate/lage");
    expect(pfade).toContain("PUT /api/pstate/language");
    expect(pfade).toContain("POST /api/handover");
  });

  it("api() wirft bei Nicht-ok mit Status und code aus dem Fehlerkörper", async () => {
    const { mod } = await starteClient({ routen: { "GET /api/me": { status: 429, json: { error: "zu viel", code: "rate" } } } });
    await expect(mod.api("GET", "/api/me")).rejects.toMatchObject({ status: 429, code: "rate", message: "zu viel" });
  });
});
