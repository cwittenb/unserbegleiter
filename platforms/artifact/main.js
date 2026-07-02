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
import { createApp } from "../../core/ui/app.js";
import { runSelftest } from "./selftest.js";

const doc = document;
const app = doc.getElementById("app");

function localBackend({ store, meta, role }) {
  const repo = new Repo({ store, ns: "PBDEV", code: meta.code, activeModuleId: "betrieb" });
  const bstate = new Bstate(repo);
  const pstate = new Pstate(repo);
  const llm = makeAdapter({ mode: "keyless" });
  return {
    async info() {
      return {
        role,
        name: role === "A" ? meta.nameA : meta.nameB,
        partner: role === "A" ? meta.nameB : meta.nameA,
        nameA: meta.nameA, nameB: meta.nameB,
      };
    },
    bstate: { get: f => bstate.get(f), set: (f, v) => bstate.set(f, v) },
    pstate: { get: f => pstate.get(role, f), set: (f, v) => pstate.set(role, f, v) },
    chat: {
      load: (art, id) => repo.get("chat:" + (art === "shared" ? id : role + ":" + id), art === "shared"),
      save: (art, id, chat) => repo.set("chat:" + (art === "shared" ? id : role + ":" + id), chat, art === "shared"),
    },
    uebergabe: {
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
    app.innerHTML = `
      <h1 style="font-size:17px;font-weight:650">${APP_NAME} · Einrichtung</h1>
      <p style="color:var(--ink-soft);font-size:13px">Entwicklungsumgebung (Artefakt) · Kern ${CORE_VERSION}</p>
      <div style="background:#fff;border:1px solid #e3e8ee;border-radius:12px;padding:14px">
        <label style="display:block;font-size:14px;margin:6px 0">Name Person A <input id="inA" style="display:block;padding:8px;border:1px solid #cfd8e0;border-radius:8px;width:220px" value="Anna"></label>
        <label style="display:block;font-size:14px;margin:6px 0">Name Person B <input id="inB" style="display:block;padding:8px;border:1px solid #cfd8e0;border-radius:8px;width:220px" value="Bernd"></label>
        <button id="btnStart" style="margin-top:8px;background:var(--accent);color:#fff;border:0;border-radius:9px;padding:10px 16px;font-size:14px;cursor:pointer">Loslegen</button>
      </div>`;
    doc.getElementById("btnStart").onclick = async () => {
      meta = {
        code: "dev-" + Math.random().toString(36).slice(2, 8),
        nameA: doc.getElementById("inA").value.trim() || "A",
        nameB: doc.getElementById("inB").value.trim() || "B",
      };
      await store.set("PBDEV:meta", meta, true);
      rollenwahl(store, meta);
    };
    return;
  }
  rollenwahl(store, meta);
}

function rollenwahl(store, meta) {
  app.innerHTML = `
    <h1 style="font-size:17px;font-weight:650">${APP_NAME}</h1>
    <p style="color:var(--ink-soft);font-size:13px">Wer bist du gerade? (Dev-Umschalter — produktiv übernimmt das der Magic-Link)</p>
    <div style="background:#fff;border:1px solid #e3e8ee;border-radius:12px;padding:14px">
      <button id="asA" style="border:1px solid #cfd8e0;background:#fff;border-radius:9px;padding:10px 16px;font-size:14px;cursor:pointer;margin-right:8px">${meta.nameA}</button>
      <button id="asB" style="border:1px solid #cfd8e0;background:#fff;border-radius:9px;padding:10px 16px;font-size:14px;cursor:pointer">${meta.nameB}</button>
      <button id="btnSelftest" style="float:right;border:1px solid #cfd8e0;background:#fff;border-radius:9px;padding:10px 12px;font-size:13px;cursor:pointer">Selbsttest</button>
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
    doc.getElementById("devIO").textContent = "Selbsttest läuft…";
    doc.getElementById("devIO").textContent = await runSelftest(store);
  };
}

window.PAARBEGLEITUNG = { core: CORE_VERSION, coreHash: "__CORE_HASH__" };
boot().catch(e => { app.innerHTML = "<p>Start fehlgeschlagen: " + e.message + "</p>"; });
