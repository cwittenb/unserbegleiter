// Cloudflare-Pages-Client — RemoteBackend über die Worker-API.
// Enrollment: Magic-Token kommt als URL-Fragment (#t=…), wird einmalig
// konsumiert; danach tragen httpOnly-Cookies (Cred + Session).

import { CORE_VERSION, APP_NAME } from "../../../core/index.js";
import { makeAdapter } from "../../../core/llm/adapter.js";
import { createApp } from "../../../core/ui/app.js";
import { applyDesign } from "../../../core/ui/design.js";
import { t, fehlerText, setLocale, getLocale, vorSessionSprache } from "../../../core/i18n/index.js";
import { apiBasis, istNativeShell } from "./api-basis.js";
import { lauscheAppLinks } from "./deep-link.js";
import { istPushMoeglich, aktivierePush, deaktivierePush, hatPushAbo } from "./push.js";

const doc = document;
const app = doc.getElementById("app");

export async function api(method, pfad, body) {
  const r = await fetch(apiBasis() + pfad, {
    method,
    credentials: "include",
    headers: body !== undefined ? { "content-type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(data.error || "Fehler " + r.status), { status: r.status, code: data.code });
  return data;
}

export function remoteBackend() {
  return {
    info: () => api("GET", "/api/me"),
    language: {
      // Bugfix (S66): der Parameter hieß `ziel`, der Body referenzierte die
      // NICHT existierende Variable `target` → ReferenceError bei jedem
      // Sprachwechsel-Antrag. Der Worker erwartet { target } (S30·C3).
      request: target => api("POST", "/api/language", { target }),
      withdraw: () => api("DELETE", "/api/language"),
    },
    bstate: {
      get: f => api("GET", "/api/bstate/" + f).then(r => r.value),
      set: (f, v) => api("PUT", "/api/bstate/" + f, { value: v }),
    },
    pstate: {
      get: f => api("GET", "/api/pstate/" + f).then(r => r.value),
      set: (f, v) => {
        if (f === "language") { try { localStorage.setItem("pb.sprache", v); } catch { /* z. B. Safari privat */ } }
        return api("PUT", "/api/pstate/" + f, { value: v });
      },
    },
    chat: {
      load: (art, id) => api("GET", "/api/chat/" + art + "/" + id).then(r => r.value),
      save: (art, id, chat) => api("PUT", "/api/chat/" + art + "/" + id, { value: chat }),
    },
    handover: {
      post: d => api("POST", "/api/handover", d),
      get: r => api("GET", "/api/handover/" + r).then(x => x.value),
    },
    recovery: {
      beginVerify: email => api("POST", "/api/email", { email }),
      confirm: (pin, email) => api("POST", "/api/email/confirm", { pin, email }),
    },
    llm: makeAdapter({ mode: "proxy" }),
  };
}

export async function boot() {
  applyDesign(doc);
  registriereServiceWorker();
  // Native Hülle (M5): Universal/App Link liefert das Magic-Token als Ereignis —
  // wir speisen es in den bestehenden Boot-Pfad (#t=…) ein und starten neu.
  if (istNativeShell())
    lauscheAppLinks((token) => {
      location.hash = "#t=" + encodeURIComponent(token);
      location.reload();
    });   // Design ab Start — auch Wiedereinstieg/Fehler-Screens
  // Vor-Session-Sprache (Stufe D): vor Anmeldung gibt es kein pstate —
  // gespeicherte Wahl → Browser-Sprache → de. Nach der Anmeldung bleibt
  // pstate maßgeblich (app.js) und spiegelt sich hierher zurück.
  let gespeichert = null;
  try { gespeichert = localStorage.getItem("pb.sprache"); } catch { /* privat-Modus */ }
  setLocale(vorSessionSprache(gespeichert, typeof navigator !== "undefined" && navigator.language));
  doc.documentElement.lang = getLocale();
  const frag = new URLSearchParams(location.hash.slice(1));
  const token = frag.get("t");
  if (token) {
    try {
      await api("POST", "/api/enroll", { token });
      history.replaceState(null, "", location.pathname);   // Token aus der Adresszeile
    } catch (e) {
      // Verbrauchter/abgelaufener Link ist KEINE Sackgasse: direkt darunter
      // steht der Wiedereinstieg per hinterlegter Adresse (S45). Nur unbekannte
      // Token bleiben reine Fehlermeldung — dort gibt es kein Konto dahinter.
      if (e.code === "link_used" || e.code === "link_expired") {
        zeigeWiedereinstieg(e);
      } else {
        app.innerHTML = fehlerBox(fehlerText(e));
      }
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
  ergaenzePushGlocke().catch(() => { /* Push ist Komfort, nie Voraussetzung */ });
}

function fehlerBox(text) {
  return `<div style="background:rgba(188,74,74,.14);border:1px solid rgba(188,74,74,.4);color:var(--ink);border-radius:12px;padding:14px;font-size:15px;backdrop-filter:blur(8px);margin-bottom:14px">${text}</div>`;
}

/** Sackgassen-Ersatz: Wer keinen gültigen Zugang (Cookie) hat, kann sich einen
 *  frischen Link an seine hinterlegte Adresse schicken lassen. Keine Enumeration:
 *  die Antwort ist immer dieselbe. Optional mit vorangestellter Fehlermeldung
 *  (verbrauchter/abgelaufener Link). */
export function zeigeWiedereinstieg(enrollFehler) {
  app.innerHTML =
    '<div style="max-width:440px;margin:0 auto;font-family:inherit">' +
    (enrollFehler ? fehlerBox(fehlerText(enrollFehler)) : "") +
    '<div style="text-align:right;font-size:13px;letter-spacing:1px;user-select:none">' +
    '<span data-wspr="de" style="cursor:pointer;font-weight:' + (getLocale() === "de" ? 700 : 400) + '">DE</span> · ' +
    '<span data-wspr="en" style="cursor:pointer;font-weight:' + (getLocale() === "en" ? 700 : 400) + '">EN</span></div>' +
    '<h2 style="font-family:inherit;font-weight:400;font-size:26px">' + t("wieder.titel") + '</h2>' +
    '<p style="font-size:14px;color:var(--ink-soft)">' + t("wieder.intro") + '</p>' +
    '<div style="background:var(--card);border:1px solid var(--card-bd);border-radius:14px;padding:18px;backdrop-filter:blur(8px)">' +
    '<label style="display:block;font-size:13px;font-weight:550;margin-bottom:5px">' + t("wieder.email") + '</label>' +
    '<input id="recMail" type="email" autocomplete="email" placeholder="' + t("rec.platzhalter") + '" ' +
    'style="display:block;width:100%;padding:10px 12px;border:1px solid var(--field-bd);background:var(--field);color:var(--ink);border-radius:9px;font:inherit;box-sizing:border-box">' +
    '<button id="recGo" style="width:100%;margin-top:10px;padding:12px;font:inherit;cursor:pointer;' +
    'background:var(--accent);color:var(--me-ink,#fff);border:0;border-radius:999px">' + t("wieder.anfordern") + '</button>' +
    '<div id="recMsg" style="font-size:13px;margin-top:10px"></div>' +
    '</div></div>';
  for (const el of app.querySelectorAll("[data-wspr]"))
    el.addEventListener("click", () => {
      const l = el.getAttribute("data-wspr");
      if (l === getLocale()) return;
      setLocale(l);
      try { localStorage.setItem("pb.sprache", l); } catch { /* privat-Modus */ }
      doc.documentElement.lang = l;
      zeigeWiedereinstieg(enrollFehler);   // Screen in der neuen Sprache neu aufbauen
    });
  const go = doc.getElementById("recGo"), msg = doc.getElementById("recMsg");
  go.addEventListener("click", async () => {
    const email = doc.getElementById("recMail").value.trim();
    if (!email) { msg.textContent = t("wieder.bitte"); return; }
    go.disabled = true; go.textContent = t("wieder.sendet");
    try { await api("POST", "/api/recover", { email }); }
    catch { /* Status wird bewusst nicht offengelegt */ }
    msg.innerHTML = '<span style="color:var(--accent-ink)">' + t("wieder.unterwegs") + '</span>';
    go.textContent = t("wieder.gesendet");
  });
}

/** Push-Glocke (M7a): kleiner Umschalter im Theme-Chrome — nur wenn Web Push
 *  hier möglich ist und der Worker konfiguriert ist (sonst bleibt er weg;
 *  /api/push/key antwortet dann 503). Aktiv = gefüllte Glocke. */
async function ergaenzePushGlocke() {
  if (!istPushMoeglich()) return;
  const gruppe = doc.querySelector(".pb-theme");
  if (!gruppe || doc.getElementById("pbPush")) return;
  try { await api("GET", "/api/push/key"); } catch { return; }   // Feature serverseitig aus
  const reg = await navigator.serviceWorker.ready;
  const knopf = doc.createElement("button");
  knopf.id = "pbPush";
  knopf.type = "button";
  knopf.title = t("pwa.push");
  knopf.setAttribute("aria-label", t("pwa.push"));
  const zeichne = (an) => { knopf.textContent = an ? "\u{1F514}" : "\u{1F515}"; knopf.classList.toggle("an", an); };
  zeichne(await hatPushAbo(reg));
  knopf.addEventListener("click", async () => {
    knopf.disabled = true;
    try {
      if (await hatPushAbo(reg)) { await deaktivierePush(api, reg); zeichne(false); }
      else zeichne(await aktivierePush(api, reg));
    } catch { /* z. B. Erlaubnis verweigert — Zustand unverändert */ }
    knopf.disabled = false;
  });
  gruppe.appendChild(knopf);
}

/** Service Worker (M2): registrieren + Update-Fluss. Meldet sich ein neuer
 *  Worker, während ein alter die Seite kontrolliert, erscheint ein dezenter
 *  Hinweis mit Neu-laden-Knopf — kein erzwungener Reload mitten im Gespräch. */
function registriereServiceWorker() {
  if (istNativeShell()) return;   // native Hülle: Assets lokal, SW überflüssig
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/sw.js").then((reg) => {
    reg.addEventListener("updatefound", () => {
      const neu = reg.installing;
      if (!neu) return;
      neu.addEventListener("statechange", () => {
        if (neu.state === "installed" && navigator.serviceWorker.controller) zeigeUpdateHinweis();
      });
    });
  }).catch(() => { /* SW ist Komfort, nie Voraussetzung */ });
}

export function zeigeUpdateHinweis() {
  if (doc.getElementById("swUpdate")) return;
  const box = doc.createElement("div");
  box.id = "swUpdate";
  box.setAttribute("role", "status");
  box.style.cssText = "position:fixed;left:50%;bottom:calc(18px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:99;" +
    "background:var(--card,#fff);border:1px solid var(--card-bd,#d8dee5);color:var(--ink);border-radius:999px;" +
    "padding:10px 16px;font:inherit;font-size:14px;display:flex;gap:12px;align-items:center;" +
    "box-shadow:0 6px 24px rgba(0,0,0,.12);backdrop-filter:blur(8px)";
  const txt = doc.createElement("span");
  txt.textContent = t("pwa.updateVerfuegbar");
  const btn = doc.createElement("button");
  btn.textContent = t("pwa.neuLaden");
  btn.style.cssText = "font:inherit;font-size:14px;cursor:pointer;border:0;border-radius:999px;" +
    "padding:6px 14px;background:var(--accent);color:var(--me-ink,#fff)";
  btn.addEventListener("click", () => location.reload());
  box.append(txt, btn);
  doc.body.appendChild(box);
}

window.PAARBEGLEITUNG = { core: CORE_VERSION, coreHash: "__CORE_HASH__" };
boot().catch(e => { app.innerHTML = "<p>" + t("wieder.startFehler", { fehler: e.message }) + "</p>"; });
