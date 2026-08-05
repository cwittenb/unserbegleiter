// Cloudflare-Pages-Client — RemoteBackend über die Worker-API.
// Enrollment: Magic-Token kommt als URL-Fragment (#t=…), wird einmalig
// konsumiert; danach tragen httpOnly-Cookies (Cred + Session).

import { CORE_VERSION, APP_NAME } from "../../../core/index.js";
import { makeAdapter } from "../../../core/llm/adapter.js";
import { createApp } from "../../../core/ui/app.js";
import { applyDesign } from "../../../core/ui/design.js";
import { setKorpusLader } from "../../../core/prompts/prompts.js";   // R5
import { t, fehlerText, setLocale, getLocale, vorSessionSprache } from "../../../core/i18n/index.js";
import { apiBasis, istNativeShell } from "./api-basis.js";
import { lauscheAppLinks } from "./deep-link.js";
import { istPushMoeglich, aktivierePush, deaktivierePush, hatPushAbo } from "./push.js";
/* L3 (Turn 46) · Der Wiedereinstieg benutzt jetzt die Bausteine aus design.js
   statt eigener Inline-Styles. Er laeuft zwar VOR createApp(), aber
   applyDesign(doc) laeuft in boot() davor — die Klassen stehen bereit. */
import { baueKulisse } from "../../../core/ui/kulisse.js";
import { RECHT_WEGE, oeffneExtern } from "../../../core/ui/rechtliches.js";
import { RECHT_BASIS } from "../../../core/ui/rechtliches.js";
import { RECOVER_MINUTEN } from "../../../core/zugang-fristen.js";

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
    // S91 · I12: Messungen sind servergeführt — Abgabe und Aufdeckung laufen
    // über eigene Routen (Rolle aus der Session); trageMessbeitragEin/
    // markiereAufgedeckt im Kern delegieren hierher, wenn vorhanden.
    mess: {
      beitrag: b => api("POST", "/api/mess/beitrag", b).then(r => r.runde),
      aufgedeckt: rundeId => api("POST", "/api/mess/aufgedeckt", { rundeId }),
    },
    // S95.3 · Regal servergeführt: Ablage, Lesestand, Hebung und Rücknahme
    // laufen über eigene Routen; PUT auf /api/bstate/shelf ist gesperrt.
    // S95.3b · Regal UND Agenda servergeführt: Ablage, Lesestand, Hebung,
    // Vormerkung, Abräumen und Rücknahme laufen über eigene Routen; PUT auf
    // /api/bstate/shelf und /api/bstate/agenda ist gesperrt.
    regal: {
      freigabe: entwurf => api("POST", "/api/regal/freigabe", entwurf),
      gelesen: itemId => api("POST", "/api/regal/gelesen", { itemId }),
      gehoben: (itemId, opts) => api("POST", "/api/regal/gehoben", { itemId, alsZiel: !!(opts && opts.alsZiel) }),
      ruecknahme: freigabe => api("POST", "/api/regal/ruecknahme", { freigabe }).then(() => true, () => false),
      vormerkung: itemId => api("POST", "/api/agenda/vormerkung", { itemId }),
      abraeumen: (itemId, wie) => api("POST", "/api/agenda/abraeumen", { itemId, wie }),
    },
    pstate: {
      get: f => api("GET", "/api/pstate/" + f).then(r => r.value),
      set: (f, v) => {
        if (f === "language") { try { localStorage.setItem("pb.sprache", v); } catch { /* z. B. Safari privat */ } }
        // D12-2d · Spiegel der Ansicht: beim naechsten Start steht die Farbe,
        // bevor der Server geantwortet hat — sonst blitzt es kurz hell auf.
        if (f === "theme") { try { localStorage.setItem("pb.ansicht", v); } catch { /* dito */ } }
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
  /* R5 · Korpus-Lader. Deutsch liegt im Bundle; Englisch wird als eigene
     Datei nachgezogen (Script-Tag statt import(), weil der Client als IIFE
     gebaut wird — siehe korpus-en-entry.js). Ein Fehlschlag ist laut: das Tor
     in app.js soll NICHT stillschweigend auf Deutsch zurückfallen. */
  setKorpusLader(locale => new Promise((fertig, scheitern) => {
    if (locale !== "en") return scheitern(new Error("Unbekannte Korpus-Sprache: " + locale));
    const da = globalThis.__KORPUS_EN__;
    if (da) return fertig(da);
    const s = doc.createElement("script");
    s.src = "/korpus." + locale + ".js";
    s.onload = () => globalThis.__KORPUS_EN__
      ? fertig(globalThis.__KORPUS_EN__)
      : scheitern(new Error("Korpus geladen, aber leer: " + locale));
    s.onerror = () => scheitern(new Error("Korpus nicht erreichbar: " + locale));
    doc.head.appendChild(s);
  }));

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
        app.innerHTML = fehlerBox(fehlerText(e)) + rechtsFuss();
        verdrahteRechtsFuss(app);
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

/* L3 · Rechtslinks. Sie stehen in der unteren Zone des Wiedereinstiegs — und
   zusaetzlich unter der Fehlerbox, die als einzige Lage keine untere Zone hat.
   §5 DDG verlangt "staendig verfuegbar": die Bedien-Ecke steht zwar ab
   applyDesign, ist ohne Sitzung aber tot (kein Einstellungs-Screen, in den sie
   fuehren koennte). Adressen aus core/ui/rechtliches.js, kein zweites Literal. */
function rechtsFuss() {
  return '<span class="rz-rechtsfuss">' +
    RECHT_WEGE.map(w =>
      '<a data-rz-recht="' + w.id + '" href="' + w.url + '"' +
      ' target="_blank" rel="noopener noreferrer">' + t(w.schluessel) + "</a>").join("") +
    "</span>";
}

/** Nur der native Sonderfall: im Capacitor-WebView darf der Link nicht IN der
 *  App aufgehen, sonst gibt es keinen Weg zurueck. Im Web bleibt es ein Link. */
function verdrahteRechtsFuss(wurzel) {
  for (const a of wurzel.querySelectorAll("[data-rz-recht]"))
    a.addEventListener("click", ereignis => {
      if (oeffneExtern(a.getAttribute("href"), globalThis)) ereignis.preventDefault();
    });
}

function fehlerBox(text) {
  return `<div style="background:rgba(188,74,74,.14);border:1px solid rgba(188,74,74,.4);color:var(--rz-ink);border-radius:12px;padding:14px;font-size:15px;backdrop-filter:blur(8px);margin-bottom:14px">${text}</div>`;
}

/** L3 (Turn 46) · Wiedereinstieg — der Screen fuer alle, die (noch) keinen
 *  Zugang auf diesem Geraet haben. Fuer viele ist er der ERSTE Eindruck der
 *  App ueberhaupt: wer einen Link auf einem neuen Geraet oeffnet, landet hier,
 *  nicht im Vorraum. Bis Turn 46 war er der einzige Screen, der die Bausteine
 *  aus design.js nicht benutzte.
 *
 *  Aufbau wie ueberall — oben Papier: was DU auf diesem Geraet tun kannst;
 *  unten Tiefgruen: die Bedingung, die nicht bei dir liegt. Die Aussage steht
 *  damit zweimal, aber in zwei Rollen: die Zeile oben ist ein Handgriff, der
 *  Satz unten ist die Lage.
 *
 *  Drei Invarianten, die beim Umbau NICHT verhandelbar waren:
 *    · Keine Enumeration — die Quittung ist bei JEDEM Ausgang dieselbe.
 *    · Das Rate-Limit (429) wird verschluckt; auch das waere eine Auskunft.
 *    · Der Sprachwechsel baut den Screen neu UND nimmt den Fehler-Vorspann mit.
 */
export function zeigeWiedereinstieg(enrollFehler) {
  /* Verbrauchter/abgelaufener Einmal-Link ist KEIN Fehler des Nutzers, sondern
     der normale Ablauf. Er bekommt deshalb keine rote Box, sondern wird zur
     Ueberschrift. Alle anderen Enroll-Fehler kommen hier gar nicht an
     (siehe boot(): die gehen in fehlerBox). */
  const einmal = !!enrollFehler &&
    (enrollFehler.code === "link_used" || enrollFehler.code === "link_expired");

  const sprachKnopf = l =>
    '<button type="button" data-wspr="' + l + '" aria-pressed="' + (getLocale() === l) + '">' +
    t("paarspr.name." + l) + "</button>";

  app.innerHTML =
    '<div class="rz-split" id="rzVorZugang">' +
      '<div class="rz-half rz-papier rz-vor-papier">' +
        '<div class="rz-vor-kopf">' +
          '<span class="rz-marke-vor">' + APP_NAME + "</span>" +
          '<span class="rz-sprachpaar">' + sprachKnopf("de") +
            '<span class="rz-trenner" aria-hidden="true">/</span>' + sprachKnopf("en") + "</span>" +
        "</div>" +
        '<div class="rz-vor-mitte">' +
          (einmal ? '<div class="rz-caps">' + t("wieder.einmalCaps") + "</div>" : "") +
          '<h1 class="rz-h1">' + t(einmal ? "wieder.einmalTitel" : "wieder.titel") + "</h1>" +
          '<p class="rz-vor-intro">' + t(einmal ? "wieder.einmalText" : "wieder.intro") + "</p>" +
          '<div class="rz-eintrag" id="recZeile">' +
            '<input id="recMail" type="email" autocomplete="email" ' +
              'aria-label="' + t("rec.platzhalter") + '" placeholder="' + t("rec.platzhalter") + '">' +
            '<button type="button" id="recGo">' +
              '<span class="rz-wort">' + t("wieder.anfordern") + " </span>\u2192</button>" +
          "</div>" +
          '<p class="rz-vor-hinweis" id="recHinweis">' +
            t("wieder.hinweis", { minuten: RECOVER_MINUTEN }) + "</p>" +
        "</div>" +
      "</div>" +
      '<div class="rz-half rz-tiefgruen rz-naht-anker rz-vor-tief">' +
        '<div class="rz-kulisse-naht rz-kulisse-vor" aria-hidden="true">' + baueKulisse(5, "vor") + "</div>" +
        '<span class="rz-weg-badge rz-auf-naht rz-badge-bedingung">' + t("wieder.badge") + "</span>" +
        '<div class="rz-vor-mitte">' +
          '<p class="rz-vor-bedingung">' + t("wieder.bedingung") + "</p>" +
          '<p class="rz-vor-landingtext">' + t("wieder.landingText") + "</p>" +
          '<a class="rz-extern" href="' + RECHT_BASIS + '" rel="noopener">' +
            t("wieder.landingZeile") + '<span class="rz-pfeil">\u2197</span></a>' +
        "</div>" +
        rechtsFuss() +
      "</div>" +
    "</div>";

  verdrahteRechtsFuss(app);
  for (const el of app.querySelectorAll("[data-wspr]"))
    el.addEventListener("click", () => {
      const l = el.getAttribute("data-wspr");
      if (l === getLocale()) return;
      setLocale(l);
      try { localStorage.setItem("pb.sprache", l); } catch { /* privat-Modus */ }
      doc.documentElement.lang = l;
      zeigeWiedereinstieg(enrollFehler);   // Screen neu — MIT dem Vorspann
    });

  const zeile = doc.getElementById("recZeile");
  const feld = doc.getElementById("recMail");
  const hinweis = doc.getElementById("recHinweis");

  /* Die Quittung ersetzt die Zeile nicht, sie schreibt IN IHR weiter: Adresse
     links (nicht mehr kursiv — sie ist jetzt Inhalt, kein Platzhalter),
     rechts "Gesendet" als Caps statt des Pfeils. Kein deaktivierter Knopf,
     keine zweite Meldungszeile. */
  function quittiere(adresse) {
    zeile.classList.add("rz-quittiert");
    zeile.innerHTML =
      '<span class="rz-adresse"></span>' +
      '<span class="rz-quittung">' + t("wieder.gesendet") + "</span>";
    zeile.querySelector(".rz-adresse").textContent = adresse;
    const h1 = app.querySelector(".rz-h1");
    if (h1) h1.textContent = t("wieder.quittungTitel");
    hinweis.textContent = t("wieder.unterwegs", { minuten: RECOVER_MINUTEN });
  }

  async function anfordern() {
    const email = feld.value.trim();
    if (!email) { hinweis.textContent = t("wieder.bitte"); return; }
    /* Der Ausgang ist bewusst OHNE Verzweigung: Erfolg, 429 und Netzfehler
       fuehren zur selben Quittung. Jede Unterscheidung waere eine Auskunft
       darueber, ob die Adresse hinterlegt ist. */
    try { await api("POST", "/api/recover", { email }); } catch { /* still, mit Absicht */ }
    quittiere(email);
  }

  doc.getElementById("recGo").addEventListener("click", anfordern);
  feld.addEventListener("keydown", e => { if (e.key === "Enter") anfordern(); });
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
  // U0 · Aussehen lebt in design.js (#swUpdate), nicht hier.
  const txt = doc.createElement("span");
  txt.textContent = t("pwa.updateVerfuegbar");
  const btn = doc.createElement("button");
  btn.textContent = t("pwa.neuLaden");
  btn.addEventListener("click", () => location.reload());
  box.append(txt, btn);
  doc.body.appendChild(box);
}

window.PAARBEGLEITUNG = { core: CORE_VERSION, coreHash: "__CORE_HASH__" };
boot().catch(e => { app.innerHTML = "<p>" + t("wieder.startFehler", { fehler: e.message }) + "</p>"; });
