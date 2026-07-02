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
    recovery: {
      setEmail: email => api("POST", "/api/email", { email }),
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
        zeigeWiedereinstieg();
        return;
      }
    }
  }
  const ui = createApp({ doc, backend: remoteBackend(), root: app });
  await ui.boot();
}

/** Sackgassen-Ersatz: Wer keinen gültigen Zugang (Cookie) hat, kann sich einen
 *  frischen Link an seine hinterlegte Adresse schicken lassen. Keine Enumeration:
 *  die Antwort ist immer dieselbe. */
function zeigeWiedereinstieg() {
  app.innerHTML =
    '<div style="max-width:440px;margin:0 auto;font-family:ui-sans-serif,system-ui,sans-serif">' +
    '<h2 style="font-size:18px">Kein Zugang auf diesem Gerät</h2>' +
    '<p style="font-size:14px;color:#5a6675">Öffne deinen persönlichen Zugangslink — oder lass dir einen neuen an deine hinterlegte E-Mail-Adresse schicken.</p>' +
    '<div style="background:#fff;border:1px solid #e3e8ee;border-radius:12px;padding:16px">' +
    '<label style="display:block;font-size:13px;font-weight:550;margin-bottom:5px">E-Mail-Adresse</label>' +
    '<input id="recMail" type="email" autocomplete="email" placeholder="dein@postfach.de" ' +
    'style="display:block;width:100%;padding:10px 11px;border:1px solid #cfd8e0;border-radius:9px;font:inherit;box-sizing:border-box">' +
    '<button id="recGo" style="width:100%;margin-top:10px;padding:11px;font:inherit;font-weight:600;cursor:pointer;' +
    'background:#0f766e;color:#fff;border:1px solid #0f766e;border-radius:9px">Neuen Link anfordern</button>' +
    '<div id="recMsg" style="font-size:13px;margin-top:10px"></div>' +
    '</div></div>';
  const go = doc.getElementById("recGo"), msg = doc.getElementById("recMsg");
  go.addEventListener("click", async () => {
    const email = doc.getElementById("recMail").value.trim();
    if (!email) { msg.textContent = "Bitte deine Adresse eingeben."; return; }
    go.disabled = true; go.textContent = "Wird gesendet …";
    try { await api("POST", "/api/recover", { email }); }
    catch { /* Status wird bewusst nicht offengelegt */ }
    msg.innerHTML = '<span style="color:#0f766e">Falls diese Adresse hinterlegt ist, ist ein Link unterwegs. Schau auch im Spam-Ordner nach.</span>';
    go.textContent = "Gesendet";
  });
}

window.PAARBEGLEITUNG = { core: CORE_VERSION, coreHash: "__CORE_HASH__" };
boot().catch(e => { app.innerHTML = "<p>Start fehlgeschlagen: " + e.message + "</p>"; });
