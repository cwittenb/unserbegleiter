// Cloudflare-Pages-Client — RemoteBackend über die Worker-API.
// Enrollment: Magic-Token kommt als URL-Fragment (#t=…), wird einmalig
// konsumiert; danach tragen httpOnly-Cookies (Cred + Session).

import { CORE_VERSION, APP_NAME } from "../../../core/index.js";
import { makeAdapter } from "../../../core/llm/adapter.js";
import { createApp } from "../../../core/ui/app.js";
import { applyDesign } from "../../../core/ui/design.js";

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
  applyDesign(doc);   // Design ab Start — auch Wiedereinstieg/Fehler-Screens
  const frag = new URLSearchParams(location.hash.slice(1));
  const token = frag.get("t");
  if (token) {
    try {
      await api("POST", "/api/enroll", { token });
      history.replaceState(null, "", location.pathname);   // Token aus der Adresszeile
    } catch (e) {
      app.innerHTML = `<div style="background:rgba(188,74,74,.14);border:1px solid rgba(188,74,74,.4);color:var(--ink);border-radius:12px;padding:14px;font-size:15px;backdrop-filter:blur(8px)">${e.message}</div>`;
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
    '<div style="max-width:440px;margin:0 auto;font-family:inherit">' +
    '<h2 style="font-family:inherit;font-weight:400;font-size:26px">Kein Zugang auf diesem Gerät</h2>' +
    '<p style="font-size:14px;color:var(--ink-soft)">Öffne deinen persönlichen Zugangslink — oder lass dir einen neuen an deine hinterlegte E-Mail-Adresse schicken.</p>' +
    '<div style="background:var(--card);border:1px solid var(--card-bd);border-radius:14px;padding:18px;backdrop-filter:blur(8px)">' +
    '<label style="display:block;font-size:13px;font-weight:550;margin-bottom:5px">E-Mail-Adresse</label>' +
    '<input id="recMail" type="email" autocomplete="email" placeholder="dein@postfach.de" ' +
    'style="display:block;width:100%;padding:10px 12px;border:1px solid var(--field-bd);background:var(--field);color:var(--ink);border-radius:9px;font:inherit;box-sizing:border-box">' +
    '<button id="recGo" style="width:100%;margin-top:10px;padding:12px;font:inherit;cursor:pointer;' +
    'background:var(--accent);color:var(--me-ink,#fff);border:0;border-radius:999px">Neuen Link anfordern</button>' +
    '<div id="recMsg" style="font-size:13px;margin-top:10px"></div>' +
    '</div></div>';
  const go = doc.getElementById("recGo"), msg = doc.getElementById("recMsg");
  go.addEventListener("click", async () => {
    const email = doc.getElementById("recMail").value.trim();
    if (!email) { msg.textContent = "Bitte deine Adresse eingeben."; return; }
    go.disabled = true; go.textContent = "Wird gesendet …";
    try { await api("POST", "/api/recover", { email }); }
    catch { /* Status wird bewusst nicht offengelegt */ }
    msg.innerHTML = '<span style="color:var(--accent-ink)">Falls diese Adresse hinterlegt ist, ist ein Link unterwegs. Schau auch im Spam-Ordner nach.</span>';
    go.textContent = "Gesendet";
  });
}

window.PAARBEGLEITUNG = { core: CORE_VERSION, coreHash: "__CORE_HASH__" };
boot().catch(e => { app.innerHTML = "<p>Start fehlgeschlagen: " + e.message + "</p>"; });
