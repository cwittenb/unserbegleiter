// Artefakt-Entwicklungsumgebung — LocalBackend (window.storage + keyless)
// über demselben Kern wie die Cloudflare-Form. Onboarding ist dev-pragmatisch:
// Namen einmalig, Rolle umschaltbar (Solo-Entwicklung, eine Instanz).

import { CORE_VERSION, APP_NAME } from "../../core/index.js";
import { ArtifactStore } from "./artifact-store.js";
import { localBackend } from "./local-backend.js";
import { createApp } from "../../core/ui/app.js";
import { applyDesign } from "../../core/ui/design.js";
import { t, setLocale, getLocale } from "../../core/i18n/index.js";
import { runSelftest } from "./selftest.js";
import { fahreSelbstfahrt } from "./selbstfahrt.js";
import { createDevPanel } from "./dev-panel.js";

const doc = document;
const wurzel = doc.getElementById("app");
// Zwei feste Bereiche: die App oben, das Entwickler-Panel dauerhaft darunter.
wurzel.innerHTML = '<div id="pbMain"></div><div id="pbDevHost"></div>';
const app = doc.getElementById("pbMain");
applyDesign(doc);   // Design ab Start — auch Einrichtung, Rollenwahl, Dev-Panel

/* localBackend lebt seit S67 in ./local-backend.js — von der Selbstfahrt
   mitgenutzt (isolierte Journey-Welten). Hier nur die dünne Bindung ans doc. */
const backendFuer = ({ store, meta, role }) => localBackend({ store, meta, role, doc });

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
    const ui = createApp({ doc, backend: backendFuer({ store, meta, role }), root: doc.getElementById("pbApp") });
    await ui.boot();
  };
  doc.getElementById("asA").onclick = () => start("A");
  doc.getElementById("asB").onclick = () => start("B");
  doc.getElementById("btnSelftest").onclick = async () => {
    doc.getElementById("devIO").textContent = t("einr.selbsttestLaeuft");
    doc.getElementById("devIO").textContent = await runSelftest(store);
  };
}

window.PAARBEGLEITUNG = { core: CORE_VERSION, coreHash: "__CORE_HASH__", selbstfahrt: fahreSelbstfahrt };

// Ebene B (S67): #selbstfahrt in der Adresse fährt die Journeys automatisch —
// Ergebnis maschinenlesbar unter window.__PB_SELBSTFAHRT__ + Konsolen-Sentinel.
// Ein späteres Playwright/CI mit echtem Browser braucht damit keinen App-Code.
if (typeof location !== "undefined" && /(^|[#&])selbstfahrt([&=]|$)/.test(location.hash))
  setTimeout(() => fahreSelbstfahrt({ doc }).catch(e => console.error("Selbstfahrt:", e.message)), 0);

const panelStore = new ArtifactStore(window.storage);
createDevPanel({
  doc,
  host: doc.getElementById("pbDevHost"),
  store: panelStore,
  reboot: () => boot().catch(e => { app.innerHTML = "<p>" + t("wieder.startFehler", { fehler: e.message }) + "</p>"; }),
});

boot().catch(e => { app.innerHTML = "<p>" + t("wieder.startFehler", { fehler: e.message }) + "</p>"; });
