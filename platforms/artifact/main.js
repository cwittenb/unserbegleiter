// Artefakt-Entwicklungsumgebung — LocalBackend (window.storage + keyless)
// über demselben Kern wie die Cloudflare-Form. Onboarding ist dev-pragmatisch:
// Namen einmalig, Rolle umschaltbar (Solo-Entwicklung, eine Instanz).

import { CORE_VERSION, APP_NAME } from "../../core/index.js";
import { ArtifactStore } from "./artifact-store.js";
import { Repo } from "../../core/store/repo.js";
import { Bstate, Pstate } from "../../core/store/bundles.js";
import { freigebeUebergabe } from "../../core/engine/freigabe.js";
import { uebergabeTeilKey } from "../../core/contracts/uebergabe.js";
import { makeAdapter } from "../../core/llm/adapter.js";
import { ARTEFAKT_LLM } from "./llm-config.js";
import { createApp } from "../../core/ui/app.js";
import { applyDesign } from "../../core/ui/design.js";
import { t, setLocale, getLocale } from "../../core/i18n/index.js";
import { runSelftest } from "./selftest.js";
import { createDevPanel } from "./dev-panel.js";
import { mitTokenZaehler } from "./token-zaehler.js";

const doc = document;
const wurzel = doc.getElementById("app");
// Zwei feste Bereiche: die App oben, das Entwickler-Panel dauerhaft darunter.
wurzel.innerHTML = '<div id="pbMain"></div><div id="pbDevHost"></div>';
const app = doc.getElementById("pbMain");
applyDesign(doc);   // Design ab Start — auch Einrichtung, Rollenwahl, Dev-Panel

function localBackend({ store, meta, role }) {
  const repo = new Repo({ store, ns: "PBDEV", code: meta.code, activeModuleId: "betrieb" });
  const bstate = new Bstate(repo);
  const pstate = new Pstate(repo);
  // Artefakt-Ausnahme (S35d): einzige Stelle mit Modellwissen. S61: der
  // Zähl-Wrapper akkumuliert die echte usage pro Paar (geteilte Welt) und
  // meldet den Stand als DOM-Ereignis ans Entwickler-Panel (Live-Zähler).
  const llm = mitTokenZaehler(makeAdapter({ ...ARTEFAKT_LLM }), {
    store, code: meta.code,
    melde: (code, stand) => doc.dispatchEvent(new CustomEvent("pb:tokens", { detail: { code, stand } })),
  });
  return {
    async info() {
      return {
        role,
        name: role === "A" ? meta.nameA : meta.nameB,
        partner: role === "A" ? meta.nameB : meta.nameA,
        nameA: meta.nameA, nameB: meta.nameB,
        locale: meta.locale || "de",
        languageRequest: meta.languageRequest || null,
      };
    },
    /* Paarsprache lokal — gleiche Zustandsmaschine wie der Worker (S30·C3);
       bilateral testbar über den Rollenwechsel des Dev-Panels. */
    language: {
      request: async target => {
        const z = target === "en" ? "en" : target === "de" ? "de" : null;
        if (!z) throw new Error("Unbekannte Zielsprache.");
        const m = (await store.get("PBDEV:meta", true)) || meta;
        const aktuell = m.locale || "de";
        let status;
        if (z === aktuell) status = "active";
        else if (m.languageRequest && m.languageRequest.target === z && m.languageRequest.by !== role) {
          m.locale = z; delete m.languageRequest; status = "confirmed";
        } else { m.languageRequest = { target: z, by: role, at: Date.now() }; status = "waiting"; }
        await store.set("PBDEV:meta", m, true);
        Object.assign(meta, m); if (!m.languageRequest) delete meta.languageRequest;
        return { locale: m.locale || "de", languageRequest: m.languageRequest || null, status };
      },
      withdraw: async () => {
        const m = (await store.get("PBDEV:meta", true)) || meta;
        if (m.languageRequest) { delete m.languageRequest; await store.set("PBDEV:meta", m, true); }
        Object.assign(meta, m); delete meta.languageRequest;
        return { locale: m.locale || "de", languageRequest: null, status: "discarded" };
      },
    },
    bstate: { get: f => bstate.get(f), set: (f, v) => bstate.set(f, v) },
    pstate: { get: f => pstate.get(role, f), set: (f, v) => pstate.set(role, f, v) },
    chat: {
      load: (art, id) => repo.get("chat:" + (art === "shared" ? id : role + ":" + id), art === "shared"),
      save: (art, id, chat) => repo.set("chat:" + (art === "shared" ? id : role + ":" + id), chat, art === "shared"),
    },
    handover: {
      post: d => freigebeUebergabe(repo, role, d),
      get: r => repo.get(uebergabeTeilKey(r), true, "kernwetten"),
    },
    llm,
  };
}

async function boot() {
  const store = new ArtifactStore(window.storage);
  let meta = await store.get("PBDEV:meta", true);
  if (!meta) {
    einrichtung(store);
    return;
  }
  // Vorwahl der UI-Sprache aus der Paarsprache — das Personen-pstate ("language")
  // gewinnt nach der Rollenwahl (app.js boot liest es und baut ggf. neu).
  setLocale(meta.locale === "en" ? "en" : "de");
  doc.documentElement.lang = getLocale();
  rollenwahl(store, meta);
}

/** Ersteinrichtung (dev): Sprachwahl wirkt SOFORT auf die Oberfläche —
 *  sie ist zugleich Paarsprache (Korpus) und beste Vorwahl der UI-Sprache. */
function einrichtung(store, vorbelegt = {}) {
  {
    app.innerHTML = `
      <h1 style="font-family:inherit;font-weight:400;font-size:26px;margin:0 0 4px">${APP_NAME} · ${t("einr.titel")}</h1>
      <p style="color:var(--ink-soft);font-size:13px">${t("einr.umgebung", { version: CORE_VERSION })}</p>
      <div style="background:var(--card);border:1px solid var(--card-bd);border-radius:14px;padding:16px;backdrop-filter:blur(8px)">
        <label style="display:block;font-size:14px;margin:6px 0">${t("einr.nameA")}<input id="inA" style="display:block;padding:9px;border:1px solid var(--field-bd);background:var(--field);color:var(--ink);border-radius:9px;width:220px;font:inherit" value="Anna"></label>
        <label style="display:block;font-size:14px;margin:6px 0">${t("einr.nameB")}<input id="inB" style="display:block;padding:9px;border:1px solid var(--field-bd);background:var(--field);color:var(--ink);border-radius:9px;width:220px;font:inherit" value="Bernd"></label>
        <button id="btnStart" style="margin-top:8px;background:var(--accent);color:var(--me-ink,#fff);border:0;border-radius:999px;padding:11px 24px;font:inherit;cursor:pointer">${t("einr.los")}</button>
        <label style="display:block;font-size:13px;margin:10px 0 0;color:var(--ink-soft)">${t("einr.sprache")}<select id="inSpr" style="font:inherit;padding:4px 8px;border:1px solid var(--field-bd);background:var(--field);color:var(--ink);border-radius:9px"><option value="de"${getLocale() === "de" ? " selected" : ""}>Deutsch</option><option value="en"${getLocale() === "en" ? " selected" : ""}>English</option></select></label>
      </div>`;
    if (vorbelegt.a !== undefined) doc.getElementById("inA").value = vorbelegt.a;
    if (vorbelegt.b !== undefined) doc.getElementById("inB").value = vorbelegt.b;
    doc.getElementById("inSpr").addEventListener("change", e => {
      setLocale(e.target.value === "en" ? "en" : "de");
      doc.documentElement.lang = getLocale();
      einrichtung(store, {                                   // Screen in neuer Sprache, Eingaben bleiben
        a: doc.getElementById("inA").value,
        b: doc.getElementById("inB").value,
      });
    });
    doc.getElementById("btnStart").onclick = async () => {
      const meta = {
        code: "dev-" + Math.random().toString(36).slice(2, 8),
        nameA: doc.getElementById("inA").value.trim() || "A",
        nameB: doc.getElementById("inB").value.trim() || "B",
        locale: doc.getElementById("inSpr").value === "en" ? "en" : "de",   // Paarsprache (Korpus ab Stufe C)
      };
      await store.set("PBDEV:meta", meta, true);
      rollenwahl(store, meta);
    };
    return;
  }
}

function rollenwahl(store, meta) {
  app.innerHTML = `
    <h1 style="font-family:inherit;font-weight:400;font-size:26px;margin:0 0 4px">${APP_NAME}</h1>
    <p style="color:var(--ink-soft);font-size:13px">${t("einr.wer")}</p>
    <div style="background:var(--card);border:1px solid var(--card-bd);border-radius:14px;padding:16px;backdrop-filter:blur(8px)">
      <button id="asA" style="border:1px solid var(--accent);background:transparent;color:var(--accent-ink);border-radius:999px;padding:10px 22px;font:inherit;cursor:pointer;margin-right:8px">${meta.nameA}</button>
      <button id="asB" style="border:1px solid var(--accent);background:transparent;color:var(--accent-ink);border-radius:999px;padding:10px 22px;font:inherit;cursor:pointer">${meta.nameB}</button>
      <button id="btnSelftest" style="float:right;border:1px solid var(--card-bd);background:var(--card);color:var(--ink-soft);border-radius:999px;padding:9px 16px;font:inherit;cursor:pointer">${t("einr.selbsttest")}</button>
    </div>
    <pre id="devIO" style="font-size:11px;white-space:pre-wrap;color:#5a6675"></pre>`;
  const start = async role => {
    app.innerHTML = `<div id="pbApp"></div>`;
    const ui = createApp({ doc, backend: localBackend({ store, meta, role }), root: doc.getElementById("pbApp") });
    await ui.boot();
  };
  doc.getElementById("asA").onclick = () => start("A");
  doc.getElementById("asB").onclick = () => start("B");
  doc.getElementById("btnSelftest").onclick = async () => {
    doc.getElementById("devIO").textContent = t("einr.selbsttestLaeuft");
    doc.getElementById("devIO").textContent = await runSelftest(store);
  };
}

window.PAARBEGLEITUNG = { core: CORE_VERSION, coreHash: "__CORE_HASH__" };

const panelStore = new ArtifactStore(window.storage);
createDevPanel({
  doc,
  host: doc.getElementById("pbDevHost"),
  store: panelStore,
  reboot: () => boot().catch(e => { app.innerHTML = "<p>" + t("wieder.startFehler", { fehler: e.message }) + "</p>"; }),
});

boot().catch(e => { app.innerHTML = "<p>" + t("wieder.startFehler", { fehler: e.message }) + "</p>"; });
