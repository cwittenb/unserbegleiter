// Cloudflare-Pages-Client — RemoteBackend über die Worker-API.
// Enrollment: Magic-Token kommt als URL-Fragment (#t=…), wird einmalig
// konsumiert; danach tragen httpOnly-Cookies (Cred + Session).

import { CORE_VERSION, APP_NAME } from "../../../core/index.js";
import { makeAdapter } from "../../../core/llm/adapter.js";
import { createApp } from "../../../core/ui/app.js";
import { baueRemoteBackend, mitNeuanmeldung, fetchMitNeuanmeldung, macheNeuanmelder } from "./remote-backend.js";
import { applyDesign } from "../../../core/ui/design.js";
import { setKorpusLader } from "../../../core/prompts/prompts.js";   // R5
import { t, fehlerText, setLocale, getLocale, vorSessionSprache } from "../../../core/i18n/index.js";
import { apiBasis, istNativeShell } from "./api-basis.js";
import { lauscheAppLinks } from "./deep-link.js";
import { istPushMoeglich, aktivierePush, deaktivierePush, hatPushAbo } from "./push.js";
import { meldeGeraeteSchalter } from "../../../core/ui/geraeteschalter.js";   // S119.7
/* L3 (Turn 46) · Der Wiedereinstieg benutzt jetzt die Bausteine aus design.js
   statt eigener Inline-Styles. Er laeuft zwar VOR createApp(), aber
   applyDesign(doc) laeuft in boot() davor — die Klassen stehen bereit. */
import { baueKulisse } from "../../../core/ui/kulisse.js";
import { RECHT_WEGE, oeffneExtern } from "../../../core/ui/rechtliches.js";
import { RECHT_BASIS } from "../../../core/ui/rechtliches.js";
import { RECOVER_MINUTEN } from "../../../core/zugang-fristen.js";

const doc = document;
const app = doc.getElementById("app");

/* CR-2.1 · rohApi ist die nackte Anfrage; `api` (darunter) meldet bei 401
   einmal still neu an und wiederholt. */
async function rohApi(method, pfad, body) {
  const r = await fetch(apiBasis() + pfad, {
    method,
    credentials: "include",
    headers: body !== undefined ? { "content-type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  // S117 · retryAfter reist mit: das Ratenlimit nennt seine Frist, und die
  // Oberflaeche kann "noch X Minuten" sagen statt "etwas spaeter".
  if (!r.ok) throw Object.assign(new Error(data.error || "Fehler " + r.status),
    { status: r.status, code: data.code, retryAfter: data.retryAfter });
  return data;
}

const neuanmelden = macheNeuanmelder(() => rohApi("POST", "/api/session"));
export const api = mitNeuanmeldung(rohApi, neuanmelden);

/* CR-1 · Die Fassade selbst lebt in remote-backend.js (ohne Browser pruefbar).
   CR-2.1 · Der LLM-Proxy bekommt denselben Neuanmelder wie die Routen — eine
   abgelaufene Sitzung beim Senden loest genau EINE Anmeldung aus. */
export function remoteBackend() {
  const proxyFetch = fetchMitNeuanmeldung(
    (url, init) => fetch(/^https?:/.test(url) ? url : apiBasis() + url, init), neuanmelden);
  return baueRemoteBackend(api, { llm: makeAdapter({ mode: "proxy" }, proxyFetch) });
}

/** CR-2.5 · Start ohne Verbindung: sagen, was ist, und den einen Weg anbieten.
 *  Bewusst KEIN Adressfeld — der Zugang ist nicht verloren. */
export function zeigeKeineVerbindung() {
  /* Dieselbe Huelle wie der Wiedereinstieg (Papier oben, Tiefgruen unten) —
     es ist dieselbe Lage "vor dem Zugang", nur mit anderem Grund. Die
     Bedien-Ecke fuehrt ohne Sitzung ins Leere und wird wie dort ausgeblendet. */
  doc.documentElement.setAttribute("data-vorzugang", "1");
  app.innerHTML =
    '<div class="rz-split" id="scrOffline">' +
      '<div class="rz-half rz-papier rz-vor-papier">' +
        '<div class="rz-vor-kopf"><span class="rz-marke-vor">' + APP_NAME + "</span></div>" +
        '<div class="rz-vor-mitte">' +
          '<h1 class="rz-h1">' + t("start.offlineTitel") + "</h1>" +
          '<p class="rz-vor-intro">' + t("start.offlineText") + "</p>" +
          '<div class="rz-eintrag">' +
            '<button type="button" id="btnNochmal">' + t("start.offlineNochmal") + " \u2192</button>" +
          "</div>" +
        "</div>" +
      "</div>" +
      '<div class="rz-half rz-tiefgruen rz-naht-anker rz-vor-tief">' +
        '<div class="rz-kulisse-naht rz-kulisse-vor" aria-hidden="true">' + baueKulisse(5, "vor") + "</div>" +
        rechtsFuss() +
      "</div>" +
    "</div>";
  verdrahteRechtsFuss(app);
  const knopf = doc.getElementById("btnNochmal");
  knopf.addEventListener("click", () => {
    knopf.disabled = true;
    boot().catch(() => zeigeKeineVerbindung());
  });
}

/** CR-6 (C28) · "/korpus.en.<hash>.js"; ohne eingesetzten Hash (Tests, Dev) der alte Name. */
export function korpusPfad(locale, hash) {
  return "/korpus." + locale + (/^[0-9a-f]{8,}$/.test(hash) ? "." + hash : "") + ".js";
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
    /* CR-6 (C28) · Die Datei traegt den Kern-Hash im Namen. Bis CR-6 hiess sie
       immer gleich: Ein Tab, der vor einem Deploy geoeffnet war, lud zu seinem
       ALTEN app.js den NEUEN Korpus — zwei Staende, die nicht zusammen gebaut
       wurden. Jetzt findet der alte Tab seine Datei nicht mehr und scheitert
       laut (unten), statt still zu mischen; Neuladen holt beides frisch. */
    s.src = korpusPfad(locale, "__CORE_HASH__");
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
    /* CR-2.5 · Nur "kein gueltiger Zugang" (401) fuehrt in den Wiedereinstieg.
       Bis CR-2 tat das JEDER Fehler — auch Netz weg oder Server gestoert: Wer
       im Zug kein Netz hatte, sah "Zugangslink fuer dein Konto", gab seine
       Adresse ein und las "Gesendet". Es war nichts gesendet, und der Zugang
       war nie weg. (`api` meldet bei 401 selbst einmal ueber /api/session neu
       an; kommt hier noch 401 an, ist das Credential wirklich fort.) */
    try { await api("GET", "/api/me"); }
    catch (e) {
      if (e && e.status === 401) zeigeWiedereinstieg();
      else zeigeKeineVerbindung();
      return;
    }
  }
  /* Ab hier gibt es eine Sitzung — die Bedien-Ecke fuehrt wieder irgendwohin. */
  doc.documentElement.removeAttribute("data-vorzugang");
  const ui = createApp({ doc, backend: remoteBackend(), root: app });
  await ui.boot();
  meldePushSchalter().catch(() => { /* Push ist Komfort, nie Voraussetzung */ });
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
    t("sprache.eigen." + l) + "</button>";
  /* Zweimal im Markup, je Breite genau EINE sichtbar (display:none nimmt die
     verdeckte auch aus dem Bedienbaum). Mobil steht die Sprachwahl neben der
     Wortmarke, auf dem Desktop ganz oben rechts — also in der anderen Spalte.
     Ein Element kann nicht zwischen zwei Flex-Containern wandern; dieselbe
     Loesung tragen die zwei Embleme der Landing. */
  const sprachPaar = nur =>
    '<span class="rz-sprachpaar ' + nur + '">' + sprachKnopf("de") +
    '<span class="rz-trenner" aria-hidden="true">/</span>' + sprachKnopf("en") + "</span>";

  /* Die Bedien-Ecke steht ab applyDesign im Body, fuehrt hier aber ins Leere:
     ohne Sitzung gibt es keinen Einstellungs-Screen, in den sie fuehren
     koennte. Ein Zeichen, das nichts tut, ist schlimmer als keins. */
  doc.documentElement.setAttribute("data-vorzugang", "1");

  app.innerHTML =
    '<div class="rz-split" id="rzVorZugang">' +
      '<div class="rz-half rz-papier rz-vor-papier">' +
        '<div class="rz-vor-kopf">' +
          '<span class="rz-marke-vor">' + APP_NAME + "</span>" +
          sprachPaar("rz-nur-schmal") +
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
        sprachPaar("rz-nur-breit") +
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

  /* Nur die FORM der Adresse, nicht ihre Existenz. Der Unterschied ist
     wichtig: eine Aussage darueber, ob eine Adresse hinterlegt ist, waere
     Enumeration — eine Aussage darueber, ob "abc" eine E-Mail-Adresse sein
     kann, ist keine. Bewusst grosszuegig: ein zu strenger Ausdruck sperrt
     gueltige Adressen aus, und die echte Pruefung ist ohnehin, ob die Mail
     ankommt. */
  const SIEHT_AUS_WIE_MAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  async function anfordern() {
    const email = feld.value.trim();
    if (!email) { hinweis.textContent = t("wieder.bitte"); return; }
    if (!SIEHT_AUS_WIE_MAIL.test(email)) { hinweis.textContent = t("wieder.format"); return; }
    /* Der Ausgang ist bewusst OHNE Verzweigung nach der ANTWORT: Erfolg, 429
       und 5xx fuehren zur selben Quittung. Jede Unterscheidung waere eine
       Auskunft darueber, ob die Adresse hinterlegt ist. */
    /* CR-2.5 · Still bleibt es bei jeder ANTWORT des Servers (keine Auskunft,
       ob die Adresse bekannt ist). Kam gar keine Antwort — die Anfrage hat das
       Geraet nie verlassen —, waere "Gesendet" schlicht falsch. */
    try { await api("POST", "/api/recover", { email }); }
    catch (e) {
      if (!e || typeof e.status !== "number") {
        hinweis.textContent = t("wieder.keinNetz");
        return;
      }
    }
    quittiere(email);
  }

  doc.getElementById("recGo").addEventListener("click", anfordern);
  feld.addEventListener("keydown", e => { if (e.key === "Enter") anfordern(); });
}


/** Push-Glocke (M7a): kleiner Umschalter im Theme-Chrome — nur wenn Web Push
 *  hier möglich ist und der Worker konfiguriert ist (sonst bleibt er weg;
 *  /api/push/key antwortet dann 503). Aktiv = gefüllte Glocke. */
/* S119.7 · Push als GERAETE-EINSTELLUNG, nicht als Glocke in der Ecke.
   Vorher hing hier ein Emoji-Knopf in .pb-theme — das einzige Emoji der
   Oberflaeche, ohne Token, an einem Ort, der sonst nur einen Weg traegt.
   (Die beiden Zeichen stehen hier bewusst nicht im Kommentar: ein Waechter
   sucht sie im Quelltext, und der liest Kommentare mit.)
   Jetzt meldet die Plattform einen Schalter an; gezeichnet wird er vom
   Einstellungs-Screen in der Gruppe "Dieses Geraet".
   Die Bedingungen bleiben unveraendert: nur wenn Push im Browser moeglich ist
   UND der Worker VAPID kennt. Ist eine davon nicht erfuellt, wird nichts
   angemeldet — und dann erscheint auch keine Zeile. Ein toter Schalter waere
   schlimmer als keiner. */
async function meldePushSchalter() {
  if (!istPushMoeglich()) return;
  try { await api("GET", "/api/push/key"); } catch { return; }   // Feature serverseitig aus
  const reg = await navigator.serviceWorker.ready;
  meldeGeraeteSchalter({
    id: "push",
    label: () => t("pwa.push"),
    an: () => hatPushAbo(reg),
    umschalten: async () => {
      if (await hatPushAbo(reg)) { await deaktivierePush(api, reg); return false; }
      return await aktivierePush(api, reg);
    },
  });
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
