// Cloudflare-Pages-Client — RemoteBackend über die Worker-API.
// Enrollment: Magic-Token kommt als URL-Fragment (#t=…), wird einmalig
// konsumiert; danach tragen httpOnly-Cookies (Cred + Session).

import { CORE_VERSION, APP_NAME } from "../../../core/index.js";
import { makeAdapter } from "../../../core/llm/adapter.js";
import { createApp } from "../../../core/ui/app.js";

const doc = document;
const app = doc.getElementById("app");

async function api(method, pfad, body) {
  const r = await fetch(pfad, {
    method,
    credentials: "include",
    headers: body !== undefined ? { "content-type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(data.error || "Fehler " + r.status), { status: r.status });
  return data;
}

function remoteBackend() {
  return {
    info: () => api("GET", "/api/me"),
    bstate: {
      get: f => api("GET", "/api/bstate/" + f).then(r => r.value),
      set: (f, v) => api("PUT", "/api/bstate/" + f, { value: v }),
    },
    pstate: {
      get: f => api("GET", "/api/pstate/" + f).then(r => r.value),
      set: (f, v) => api("PUT", "/api/pstate/" + f, { value: v }),
    },
    chat: {
      load: (art, id) => api("GET", "/api/chat/" + art + "/" + id).then(r => r.value),
      save: (art, id, chat) => api("PUT", "/api/chat/" + art + "/" + id, { value: chat }),
    },
    uebergabe: {
      post: d => api("POST", "/api/handover", d),
      get: r => api("GET", "/api/handover/" + r).then(x => x.value),
    },
    llm: makeAdapter({ mode: "proxy" }),
  };
}

async function boot() {
  const frag = new URLSearchParams(location.hash.slice(1));
  const token = frag.get("t");
  if (token) {
    try {
      await api("POST", "/api/enroll", { token });
      history.replaceState(null, "", location.pathname);   // Token aus der Adresszeile
    } catch (e) {
      app.innerHTML = `<div style="background:#fdecec;border:1px solid #f5b5b5;border-radius:9px;padding:12px;font-size:14px">${e.message}</div>`;
      return;
    }
  } else {
    // Kein Token: bestehende Session prüfen, sonst über Credential neu anmelden
    try { await api("GET", "/api/me"); }
    catch {
      try { await api("POST", "/api/session"); }
      catch {
        app.innerHTML = `<p style="font-size:14px">Kein Zugang gefunden. Bitte deinen persönlichen Zugangslink öffnen.</p>`;
        return;
      }
    }
  }
  const ui = createApp({ doc, backend: remoteBackend(), root: app });
  await ui.boot();
}

window.PAARBEGLEITUNG = { core: CORE_VERSION, coreHash: "__CORE_HASH__" };
boot().catch(e => { app.innerHTML = "<p>Start fehlgeschlagen: " + e.message + "</p>"; });
