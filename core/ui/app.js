// UI-Schicht — dünner DOM-Layer über Engine und Backend-Fassade.
// document wird injiziert (happy-dom-testbar); kein Storage-, kein Key-Wissen.

import { Engine } from "../engine/engine.js";
import { cleanDisplay } from "../contracts/block.js";
import { ALLE_BLOECKE } from "../contracts/registry.js";
import { soloDef, momentDef, quereGate, baueMomentKontext, markiereGelesen, hebeInAgenda, raeumeAgendaAb } from "./sessions.js";
import { einzelDef, gemeinsamDef, aufdeckDef, rankItems, RANK_MODES, reglerErgebnis, rankingErgebnis, startwerteErgebnis, beruehrungen, baueAufdeckung, baueAufdeckKontext, baueKlaerungsKontext } from "./kernwetten.js";
import { K, setKorpusSprache } from "../prompts/prompts.js";
import { trageMessbeitragEin, bereiteRunde, formatiereMessrunde, markiereAufgedeckt, qzStufe, baueQzMaterial, qzDef, waehleEinladung, keineEinladung, vereinbarePause } from "./prozess.js";
import { applyDesign } from "./design.js";
import { t, fuelle, getLocale, setLocale, fehlerText } from "../i18n/index.js";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* S35 · Ladeanzeige: dünner Zähl-Proxy um die Backend-Fassade. Jede laufende
   asynchrone Anfrage (Backend ODER LLM) hebt einen Zähler; solange er >0 ist,
   zeigt die App eine dezente Arbeits-Pille. Nur bekannte Fassaden-Schlüssel
   werden umhüllt — fremde Felder (store, meta, …) bleiben unangetastet, damit
   this-Bindungen und Test-Zugriffe intakt bleiben. */
const FASSADEN_SCHLUESSEL = ["info", "bstate", "pstate", "chat", "handover", "llm", "language", "recovery"];
function umhuelleBackend(roh, tick) {
  const zaehle = fn => new Proxy(fn, {
    apply(ziel, dies, args) {
      const r = Reflect.apply(ziel, dies, args);
      if (r && typeof r.then === "function") { tick(+1); return r.finally(() => tick(-1)); }
      return r;
    },
  });
  const aus = { ...roh };
  for (const k of FASSADEN_SCHLUESSEL) {
    const v = roh[k];
    if (typeof v === "function") aus[k] = zaehle(v);   // Proxy: llm.kontingent bleibt lesbar
    else if (v && typeof v === "object") {
      const o = {};
      for (const kk of Object.keys(v)) o[kk] = typeof v[kk] === "function" ? zaehle(v[kk]) : v[kk];
      aus[k] = o;
    }
  }
  return aus;
}

/* Flache Icons (S36): einfarbig über currentColor, keine Emoji, keine
   Schattierung. Auf primary-Knöpfen erscheinen sie weiß (--on-accent). */
const IKON = {
  mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><line x1="12" y1="18" x2="12" y2="21"/></svg>',
  stop: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',
  send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 2 11 13"/><path d="M22 2 15 22 11 13 2 9z"/></svg>',
};

export function createApp({ doc, backend, root, diktat }) {
  const rohBackend = backend;   // Relaunch umhüllt selbst neu (kein Doppel-Zählen)
  let laufend = 0;
  /* S36: Der globale Ladezustand (oben) tritt zurück, sobald der In-Place-
     Ladezustand (Tipp-Blase im Chat) aktiv ist — nie beide zugleich. */
  const aktualisiereBusy = () => {
    const b = wurzel && wurzel.querySelector("#pbBusy");
    if (b) b.classList.toggle("pb-hidden", laufend <= 0 || !!state.warten);
  };
  backend = umhuelleBackend(rohBackend, d => {
    laufend = Math.max(0, laufend + d);
    aktualisiereBusy();
  });
  // Diktat: echte Browser-Spracherkennung, wo verfügbar; sonst OS-Tipp.
  // Injizierbar für Tests: diktat = { SR: Konstruktor|null, ua: string }
  const dk = {
    SR: diktat && "SR" in diktat ? diktat.SR
        : (globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition || null),
    ua: (diktat && diktat.ua) || (globalThis.navigator ? navigator.userAgent : ""),
  };
  const el = (tag, cls, html) => {
    const d = doc.createElement(tag);
    if (cls) d.className = cls;
    if (html !== undefined) d.innerHTML = html;
    return d;
  };
  const state = { info: null, engine: null, chatId: null, screen: null, streamText: null };

  const wurzel = root || doc.getElementById("app");
  wurzel.innerHTML = `
    <div id="pbBusy" class="pb-busy pb-hidden"><span class="pb-busydots"><span></span><span></span><span></span></span><span id="pbBusyTxt"></span></div>
    <div class="pb-top">
      <div class="pb-brand">
        <h1 class="pb-h1" id="pbHallo"></h1>
        <span class="pb-sub" id="pbKern"></span>
      </div>
    </div>
    <div id="pbErr" class="pb-err pb-hidden"></div>
    <div id="pbHint" class="pb-card pb-hidden" style="border-color:#e2d9a8;background:#fbf7e4;font-size:13px"></div>
    <div id="scrStart">
      <div class="pb-card" style="padding:18px 26px">
        <div id="startHallo" style="font-size:17px;font-weight:650;margin-bottom:4px"></div>
        <p class="pb-sub" id="startIntro" style="margin:0"></p>
        <div class="pb-weg pb-hidden" id="wegStart" style="margin-top:12px"></div>
      </div>
      <div class="pb-zwei pb-mitte">
        <div class="pb-card">
          <button class="pb-btn primary" id="btnMyRoom">${t("start.meinRaum")}</button>
          <p class="pb-sub" id="startMeinSub" style="margin:0"></p>
        </div>
        <div class="pb-card">
          <button class="pb-btn primary" id="btnSharedRoom">${t("start.teilRaum")}</button>
          <p class="pb-sub" id="startTeilSub" style="margin:0"></p>
        </div>
      </div>
      <p class="pb-sub pb-hidden" id="psZeile" style="margin:10px 4px 0"></p>
      <div class="pb-card pb-hidden" id="boxPaarsprache"></div>
    </div>
    <div id="scrMyRoom" class="pb-hidden">
      <div class="pb-card" style="padding:18px 26px">
        <div style="font-size:16px;font-weight:650;margin-bottom:4px">${t("start.meinRaum")}</div>
        <p class="pb-sub" id="meinIntro" style="margin:0"></p>
        <div class="pb-weg pb-hidden" id="wegMein" style="margin-top:12px"></div>
      </div>
      <div class="pb-zwei pb-mitte">
        <div class="pb-card">
          <button class="pb-btn primary" id="btnSolo">${t("mein.solo")}</button>
          <p class="pb-sub" style="margin:0">${t("mein.soloSub")}</p>
        </div>
        <div class="pb-card">
          <button class="pb-btn primary" id="btnEinzel">${t("mein.einzel")}</button>
          <p class="pb-sub" style="margin:0">${t("mein.einzelSub")}</p>
        </div>
      </div>
      <div class="pb-card pb-reihe">
        <div class="pb-sub">${t("mein.gruppeRegale")}</div>
        <button class="pb-btn" id="btnZeitleiste">${t("mein.zeitleiste")}</button>
        <button class="pb-btn" id="btnMess">${t("mein.mess")}</button>
      </div>
      <div class="pb-card pb-hidden" id="boxZeitleiste"><div class="pb-sub">${t("zeitleiste.titel")}</div><div id="zlItems"></div></div>
      <div class="pb-card pb-hidden" id="boxMess"></div>
      <div class="pb-card pb-hidden" id="boxRecovery"></div>
      <div class="pb-reihe" style="padding:10px 0 0"><button class="pb-btn" id="btnZurueck1">${t("allg.zurueck")}</button></div>
    </div>
    <div id="scrShared" class="pb-hidden">
      <div class="pb-card">
        <div style="font-size:16px;font-weight:650;margin-bottom:4px">${t("start.teilRaum")}</div>
        <p class="pb-sub" id="sharedIntro" style="margin:0 0 4px">${t("teil.intro")}</p>
        <div class="pb-gruppe"><span class="pb-sub">${t("teil.gruppeRaeume")}</span>
          <button class="pb-btn primary" id="btnMoment">${t("teil.moment")}</button>
          <button class="pb-btn primary" id="btnAufdeck">${t("teil.aufdeck")}</button>
          <button class="pb-btn primary" id="btnGemeinsam">${t("teil.gemeinsam")}</button>
        </div>
        <div class="pb-gruppe"><span class="pb-sub">${t("teil.gruppeRegale")}</span>
          <button class="pb-btn" id="btnRegal">${t("teil.regal")}</button>
          <button class="pb-btn" id="btnAgenda">${t("teil.agenda")}</button>
          <button class="pb-btn" id="btnQz">${t("teil.qz")}</button>
        </div>
        <button class="pb-btn" id="btnZurueck2" style="margin-top:12px">${t("allg.zurueck")}</button>
      </div>
      <div class="pb-card pb-weg pb-hidden" id="wegTeil"></div>
      <div class="pb-card pb-hidden" id="boxRegal"><div class="pb-sub">${t("regal.titel")}</div><p class="pb-sub" style="margin:6px 0 4px">${t("regal.intro")}</p><div id="regalItems"></div></div>
      <div class="pb-card pb-hidden" id="boxAgenda"><div class="pb-sub">${t("agenda.titel")}</div><div id="agendaItems"></div></div>
      <div class="pb-card pb-hidden" id="boxQz"></div>
    </div>
    <div id="scrChat" class="pb-hidden">
      <div class="pb-card">
        <div class="pb-sub" id="chatTitel"></div>
        <div class="pb-msgs" id="pbMsgs"></div>
        <div id="gatePanel" class="pb-card pb-hidden"></div>
        <div id="kwPanel" class="pb-card pb-hidden"></div>
        <div class="pb-skala" id="pbSkala">
          <span style="font-size:13px;color:#5a6675">${t("chat.deineZahl")}</span>
          <input type="range" id="pbSkalaRange" min="1" max="10" step="1" value="7">
          <span class="value" id="pbSkalaWert">7</span>
          <button class="pb-btn primary" id="pbSkalaSend" style="white-space:nowrap">${t("chat.senden")}</button>
        </div>
        <div class="pb-composer" id="pbComposer">
          <textarea id="pbInput" placeholder="${t("chat.platzhalter")}"></textarea>
          <button class="pb-btn pb-ikon" id="btnMic" data-icon="mic" title="${t("chat.diktieren")}" aria-label="${t("chat.diktieren")}">${IKON.mic}</button>
          <button class="pb-btn primary pb-ikon" id="btnSend" data-icon="send" title="${t("chat.senden")}" aria-label="${t("chat.senden")}">${IKON.send}</button>
        </div>
        <button class="pb-btn" id="btnChatZurueck">${t("chat.raumVerlassen")}</button>
      </div>
    </div>`;

  const $ = id => wurzel.querySelector("#" + id);
  const screens = ["scrStart", "scrMyRoom", "scrShared", "scrChat"];
  function show(id) {
    state.screen = id;
    for (const s of screens) $(s).classList.toggle("pb-hidden", s !== id);
  }

  /* S35 · Ein Info-Bereich pro Vorraum: die Regal-Ansichten verdrängen
     einander, statt sich zu stapeln. zeigeNur blendet die Geschwister aus;
     die zeige*-Funktionen rufen es vor dem Befüllen auf. */
  const INFO_GRUPPEN = {
    scrMyRoom: ["boxZeitleiste", "boxMess"],
    scrShared: ["boxRegal", "boxAgenda", "boxQz"],
  };
  function zeigeNur(id) {
    for (const g of Object.values(INFO_GRUPPEN))
      if (g.includes(id)) for (const b of g) if (b !== id) $(b).classList.add("pb-hidden");
  }
  /** Knopf-Verhalten: sichtbare Box erneut angefragt → zuklappen (Toggle). */
  function infoToggle(id, oeffnen) {
    const box = $(id);
    if (!box.classList.contains("pb-hidden")) { box.classList.add("pb-hidden"); return Promise.resolve(); }
    return oeffnen();
  }

  /* S35 · Lagebild für Wegweiser und Gating — ein paralleler Rundflug über
     den geteilten und persönlichen Zustand. Fehlertolerant: was nicht
     erreichbar ist, zählt als "nicht vorhanden". */
  async function ladeLage() {
    const still = p => Promise.resolve().then(p).catch(() => null);
    const [reveal, revealLog, shelf, agenda, measurements, timeline, hA, hB, einzelChat, momentChat] = await Promise.all([
      still(() => backend.bstate.get("reveal")),
      still(() => backend.bstate.get("revealLog")),
      still(() => backend.bstate.get("shelf")),
      still(() => backend.bstate.get("agenda")),
      still(() => backend.bstate.get("measurements")),
      still(() => backend.pstate.get("timeline")),
      still(() => backend.handover.get("A")),
      still(() => backend.handover.get("B")),
      still(() => backend.chat.load("mine", "einzel")),
      still(() => backend.chat.load("shared", "moment")),
    ]);
    const rolle = state.info.role;
    const offeneRunde = (((measurements && measurements.items) || [])).find(r => r.status === "open");
    return {
      aufdeckBereit: !!(reveal && reveal.A && reveal.B && !revealLog),
      handMeins: !!(rolle === "A" ? hA : hB),
      handPartner: !!(rolle === "A" ? hB : hA),
      handBeide: !!(hA && hB),
      regalNeu: (((shelf && shelf.items) || [])).filter(i => i.by !== state.info.name && !i.read).length,
      agendaOffen: (((agenda && agenda.items) || [])).filter(i => i.state === "open").length,
      messBereit: (((measurements && measurements.items) || [])).some(r => r.status === "ready"),
      messOffen: !!(offeneRunde && !offeneRunde.values[rolle]),
      einzelKapitel: (einzelChat && einzelChat.status === "running" && einzelChat.kapitel) || 0,
      momentOffen: !!(momentChat && momentChat.status === "running" && (momentChat.messages || []).length),
      zeitleisteLeer: !((timeline && timeline.entries) || []).length,
    };
  }

  /** Hinweise je Screen, wichtigste zuerst; die UI zeigt maximal drei. */
  function wegHinweise(lage, screenId) {
    const h = [];
    const partner = state.info.partner;
    const aufloesung = () =>
      lage.handBeide ? h.push(t("weg.aufloesungBereit"))
      : !lage.handMeins && !lage.handPartner ? h.push(t("weg.aufloesungFehltBeide"))
      : !lage.handMeins ? h.push(t("weg.aufloesungFehltDu"))
      : h.push(t("weg.aufloesungFehltPartner", { partner }));
    if (screenId === "scrStart") {
      if (lage.einzelKapitel) h.push(t("weg.einzelPause", { n: lage.einzelKapitel }));
      if (lage.aufdeckBereit) h.push(t("weg.aufdeckBereit"));
      else if (lage.handBeide) h.push(t("weg.aufloesungBereit"));
      if (lage.momentOffen) h.push(t("weg.momentOffen"));
      if (lage.regalNeu) h.push(t("weg.regalNeu", { n: lage.regalNeu }));
      if (lage.messOffen) h.push(t("weg.messOffen"));
    }
    if (screenId === "scrMyRoom") {
      if (lage.einzelKapitel) h.push(t("weg.einzelPause", { n: lage.einzelKapitel }));
      if (lage.messOffen) h.push(t("weg.messOffen"));
    }
    if (screenId === "scrShared") {
      if (lage.momentOffen) h.push(t("weg.momentOffen"));
      if (lage.aufdeckBereit) h.push(t("weg.aufdeckBereit"));
      aufloesung();
      if (lage.regalNeu) h.push(t("weg.regalNeu", { n: lage.regalNeu }));
      if (lage.agendaOffen) h.push(t("weg.agendaOffen", { n: lage.agendaOffen }));
      if (lage.messBereit) h.push(t("weg.messBereit"));
    }
    return h.slice(0, 3);
  }

  /* S36 · Feste Wegweiser-Zeilen: sie halten alle Optionen offen, statt
     einen Pfad zu drängen. Die dritte Zeile in "Mein Raum" richtet sich
     danach, ob schon Inhalte da sind (Rückblick vs. Ausblick). */
  function wegOptionen(lage, screenId) {
    if (screenId === "scrStart")
      return [t("weg.soloErster"), t("weg.optAuftragDich"), t("weg.optQz")];
    if (screenId === "scrMyRoom")
      return [t("weg.soloErster"), t("weg.optAuftragEuch"),
              lage.zeitleisteLeer ? t("weg.optRueckblickSpaeter") : t("weg.optRueckblick")];
    return [];
  }

  /** Wegweiser zeichnen + Gating anwenden (Gemeinsame Auflösung nur mit
      beiden Freigaben). Läuft still im Hintergrund bei jedem Vorraum-Betreten.
      S36: Auf Start und in "Mein Raum" lebt der Wegweiser IM Intro-Panel
      (oben, nicht als letzte Karte); Lage-Hinweise stehen vor den Optionen. */
  async function aktualisiereWegweiser(screenId) {
    const boxId = { scrStart: "wegStart", scrMyRoom: "wegMein", scrShared: "wegTeil" }[screenId];
    if (!boxId) return;
    try {
      const lage = await ladeLage();
      if (screenId === "scrShared") $("btnGemeinsam").disabled = !lage.handBeide;
      const zeilen = [...wegHinweise(lage, screenId), ...wegOptionen(lage, screenId)];
      const box = $(boxId);
      if (!zeilen.length) { box.classList.add("pb-hidden"); return; }
      box.innerHTML = (screenId === "scrShared" ? `<div class="pb-sub">${t("weg.titel")}</div>` : "") +
        zeilen.map(x => `<div class="pb-item">‣ ${esc(x)}</div>`).join("");
      box.classList.remove("pb-hidden");
    } catch { /* Wegweiser ist Komfort, kein Muss */ }
  }
  function betrete(screenId) { show(screenId); aktualisiereWegweiser(screenId); }
  function hint(msg) {
    const b = $("pbHint");
    if (!msg) { b.classList.add("pb-hidden"); return; }
    b.textContent = msg;
    b.classList.remove("pb-hidden");
  }
  function err(msg) {
    const b = $("pbErr");
    if (!msg) { b.classList.add("pb-hidden"); return; }
    b.textContent = msg;
    b.classList.remove("pb-hidden");
  }

  /* Kompaktes, sicheres Inline-Markdown: erst HTML-escapen, dann **fett**,
     *kursiv*, \`code\`, Überschriften als fett, "- " als Aufzählungspunkt.
     white-space:pre-wrap erhält die Zeilenstruktur — kein Block-Parser nötig. */
  function mdRender(roh) {
    let t = esc(roh);
    t = t.replace(/^#{1,4}\s+(.+)$/gm, "<strong>$1</strong>");
    t = t.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
    t = t.replace(/(^|[\s(>])\*([^*\n]+)\*(?=[\s.,;:!?)]|$)/gm, "$1<em>$2</em>");
    t = t.replace(/\`([^\`\n]+)\`/g, "<code>$1</code>");
    t = t.replace(/^(\s*)[-*]\s+/gm, "$1• ");
    return t;
  }

  /** Skalenfrage? Dann Schnellantwort-Slider zeigen (freies Tippen bleibt möglich). */
  function aktualisiereSkala() {
    const boxS = $("pbSkala");
    if (!boxS) return;
    const msgs = state.engine ? state.engine.chat.messages.filter(m => !m.hidden) : [];
    const letzte = msgs.length ? msgs[msgs.length - 1] : null;
    const skala = !state.warten && letzte && letzte.role === "assistant" &&
      /[Ss]kala von 1 bis 10/.test(letzte.content);
    boxS.classList.toggle("offen", !!skala);
  }

  /* Streaming-sichere Anzeige eines UNVOLLSTÄNDIGEN Assistant-Textes:
     fertige Marker/Blöcke entfernt cleanDisplay; ANGEFANGENE Protokoll-
     Artefakte (Block ohne Ende, "[["-Marker, angerissenes Start-Token am
     Textende) werden abgeschnitten, damit während des Stroms nie rohe
     Protokollzeichen sichtbar werden (S34-Lehre, auf Teiltexte übertragen). */
  function streamAnzeige(roh) {
    const mkListe = (state.engine && state.engine.def && state.engine.def.markerOrder) || [];
    let txt = cleanDisplay(roh, mkListe, ALLE_BLOECKE);
    let schnitt = txt.length;
    for (const b of ALLE_BLOECKE) {
      const i = txt.indexOf(b.start);
      if (i >= 0 && i < schnitt) schnitt = i;        // Block begonnen, Ende fehlt noch
    }
    const iM = txt.indexOf("[[");
    if (iM >= 0 && iM < schnitt) schnitt = iM;        // Marker im Entstehen
    txt = txt.slice(0, schnitt);
    if (txt.endsWith("[")) txt = txt.slice(0, -1);    // halbe Marker-Klammer
    for (const tok of ALLE_BLOECKE.map(b => b.start)) // angerissenes Start-Token
      for (let l = tok.length - 1; l >= 4; l--)
        if (txt.endsWith(tok.slice(0, l))) { txt = txt.slice(0, -l); l = 0; }
    return txt.replace(/\s+$/, "");
  }

  /** Live-Update der Stream-Blase — gezielt, ohne Voll-Rerender je Delta. */
  function zeigeStream(teil) {
    state.streamText = teil;
    const box = $("pbMsgs");
    if (!box) return;
    let d = box.querySelector("#pbStream");
    if (!d) { d = el("div", "pb-msg ai"); d.id = "pbStream"; box.appendChild(d); }
    const anzeige = streamAnzeige(teil);
    d.innerHTML = anzeige
      ? mdRender(anzeige)
      : '<span class="pb-typing" aria-label="' + t("chat.tippt") + '"><span></span><span></span><span></span></span>';
    box.scrollTop = box.scrollHeight;
  }

  function renderMsgs() {
    state.streamText = null;   // Voll-Rerender ersetzt jede laufende Stream-Blase
    const box = $("pbMsgs");
    box.innerHTML = "";
    if (state.engine) {
      for (const m of state.engine.chat.messages) {
        if (m.hidden) continue;
        const d = el("div", "pb-msg " + (m.role === "assistant" ? "ai" : "me"));
        const mkListe = (state.engine && state.engine.def && state.engine.def.markerOrder) || [];
        if (m.role === "assistant") d.innerHTML = mdRender(cleanDisplay(m.content, mkListe, ALLE_BLOECKE));
        else d.textContent = cleanDisplay(m.content, mkListe, ALLE_BLOECKE);
        box.appendChild(d);
      }
    }
    if (state.warten) {
      const d = el("div", "pb-msg ai");
      d.id = "pbStream";
      d.innerHTML = '<span class="pb-typing" aria-label="' + t("chat.tippt") + '"><span></span><span></span><span></span></span>';
      box.appendChild(d);
    }
    box.scrollTop = box.scrollHeight;
    aktualisiereSkala();
  }

  function setzeWarten(v) { state.warten = v; aktualisiereBusy(); }

  /* S36 · EIN Wartepfad für alle ausstehenden Modell-Antworten: Tipp-Blase
     an, Senden gesperrt, dann Antwort. Panels (Regler, Skala, Gate, Kapitel,
     Freigabe …) laufen hierüber — fehlender Ladezustand nach Panel-Submits
     war ein globales Problem, das hier zentral gelöst ist. */
  async function warteAntwort(lauf) {
    setzeWarten(true);
    const bs = $("btnSend");
    if (bs) bs.disabled = true;
    renderMsgs();
    try { await (typeof lauf === "function" ? lauf() : lauf); }
    catch (e) { err(e.message); }
    finally {
      setzeWarten(false);
      if (bs) bs.disabled = false;
      renderMsgs();
    }
  }

  /** Zentraler Sendeweg: User-Text SOFORT zeigen, Ladezustand, dann Antwort. */
  async function sende(text) {
    if (!text || !state.engine || state.warten) return;
    const laeuft = state.engine.sendUser(text);   // pusht die Nachricht synchron …
    await warteAntwort(async () => {              // … die Blase zeigt sie sofort
      await laeuft;
      hint(backend.llm && backend.llm.kontingent ? backend.llm.kontingent.hinweis : null);
    });
  }

  function gatePanel(data, engine) {
    const p = $("gatePanel");
    p.classList.remove("pb-hidden");
    const wegName = { self: t("gate.weg.selbst"), shelf: t("gate.weg.regal"), moment: t("gate.weg.moment") };
    p.innerHTML =
      `<div class="pb-sub">${t("gate.titel")}</div>` +
      `<p style="font-size:14px">${esc(data.selbstmitteilung)}</p>` +
      (data.wish ? `<p class="pb-sub">${t("gate.wish")}${esc(data.wish)}</p>` : "") +
      data.paths.map(w => `<label style="display:block;font-size:14px;margin:4px 0"><input type="checkbox" data-weg="${w}"> ${wegName[w]}</label>`).join("") +
      `<button class="pb-btn primary" id="btnGateOk">${t("allg.freigeben")}</button>` +
      `<button class="pb-btn" id="btnGateNein">${t("allg.nochNicht")}</button>`;
    p.querySelector("#btnGateOk").addEventListener("click", async () => {
      const wege = [...p.querySelectorAll("input:checked")].map(x => x.getAttribute("data-weg"));
      p.classList.add("pb-hidden");
      try { await quereGate(backend, data, wege); } catch (e) { err(e.message); return; }
      await warteAntwort(() => engine.submitToolResult(
        wege.length ? fuelle(K().steuerTexte.freigabeGequert, { paths: wege.join(", ") }) : K().steuerTexte.freigabeNichts
      ));
    });
    p.querySelector("#btnGateNein").addEventListener("click", async () => {
      p.classList.add("pb-hidden");
      await warteAntwort(() => engine.submitToolResult(K().steuerTexte.freigabeWeiterarbeiten));
    });
  }

  /* ── Kapitel-Zwischenhalt (Einzelsession) ──
     Nach Kapitel 3 zuerst das Mini-Gate. Die Entscheidung landet NIE im
     Transkript — nur im privaten Chat-Feld (minigate) und, bei Ja, als
     Datenpaket (Top 5 + Tipp 3) im geteilten Bstate-Feld "reveal". */
  async function kapitelPanel(n, engine) {
    engine.chat.kapitel = n;
    await backend.chat.save(state.chatShared ? "shared" : "mine", state.chatId, engine.chat);
    const p = kw();
    p.classList.remove("pb-hidden");
    const dots = "●".repeat(n) + "○".repeat(4 - n);
    const gateOffen = n === 3 && !engine.chat.minigate;
    const gateHtml = !gateOffen ? "" :
      `<p style="font-size:14px"><strong>${t("kapitel.frageTitel")}</strong> ${t("kapitel.frage")}</p>` +
      `<p class="pb-sub">${t("kapitel.frageSub", { partner: esc(state.info.partner) })}</p>` +
      `<button class="pb-btn primary" id="kapJa">${t("kapitel.ja")}</button><button class="pb-btn primary" id="kapNein">${t("allg.nochNicht")}</button>`;
    p.innerHTML =
      `<div class="pb-sub">${t("kapitel.geschafft", { n, titel: esc(K().KAPITEL_TITEL[n - 1]) })}</div>` +
      `<div style="letter-spacing:5px;font-size:16px;margin:4px 0 10px">${dots}</div>` + gateHtml +
      `<div id="kapWeiter"${gateOffen ? ' class="pb-hidden"' : ""}>` +
      `<button class="pb-btn primary" id="kapNext">${t("kapitel.weitermachen", { n: n + 1, titel: esc(K().KAPITEL_TITEL[n]) })}</button></div>` +
      `<p class="pb-sub pb-hidden" id="kapNote"></p>`;
    const zeigeWeiter = txt => {
      for (const id of ["kapJa", "kapNein"]) { const b = p.querySelector("#" + id); if (b) b.remove(); }
      if (txt) { const note = p.querySelector("#kapNote"); note.textContent = txt; note.classList.remove("pb-hidden"); }
      p.querySelector("#kapWeiter").classList.remove("pb-hidden");
    };
    if (gateOffen) {
      p.querySelector("#kapJa").addEventListener("click", async () => {
        try {
          const eintrag = baueAufdeckung(state.info.name, engine.chat.ranks);
          const alle = (await backend.bstate.get("reveal")) || { A: null, B: null };
          alle[state.info.role] = eintrag;
          await backend.bstate.set("reveal", alle);
          engine.chat.minigate = "ja";
          await backend.chat.save(state.chatShared ? "shared" : "mine", state.chatId, engine.chat);
          zeigeWeiter(t("kapitel.jaNote"));
        } catch (e) { err(e.message); }
      });
      p.querySelector("#kapNein").addEventListener("click", async () => {
        engine.chat.minigate = "nein";
        await backend.chat.save(state.chatShared ? "shared" : "mine", state.chatId, engine.chat);
        zeigeWeiter(t("kapitel.neinNote"));
      });
    }
    p.querySelector("#kapNext").addEventListener("click", async () => {
      kwZu();
      await warteAntwort(() => engine.submitToolResult(fuelle(K().steuerTexte.weiterMitKapitel, { n: n + 1 }), { hidden: true }));
    });
  }
  
  /* ── Aufdeck-Tafel: beide Richtungen simultan, Berührungspunkte markiert,
     strukturell keine Quote und kein Zählen. Bleibt während des Gesprächs
     sichtbar. ── */
  async function aufdeckPanel(engine) {
    const alle = (await backend.bstate.get("reveal")) || {};
    const gA = alle.A, gB = alle.B;
    if (!gA || !gB) { err(t("aufdeck.fehlt")); return; }
    const p = kw();
    p.classList.remove("pb-hidden");
    const spalte = (titel, liste, marks) =>
      `<div style="flex:1;min-width:150px"><div class="pb-sub">${esc(titel)}</div>` +
      liste.map((x, i) => `<div class="pb-item"${marks.includes(x) ? ' style="font-weight:700;border-left:3px solid var(--accent,#0f766e);padding-left:8px"' : ""}>${i + 1}. ${esc(x)}</div>`).join("") + `</div>`;
    const richtung = (tipper, owner) => {
      const treff = beruehrungen(tipper.guess3, owner.top5);
      return `<div style="margin-top:12px"><div class="pb-sub">${t("aufdeck.getippt", { tipper: esc(tipper.name), owner: esc(owner.name) })}</div>` +
        `<div style="display:flex;gap:10px;flex-wrap:wrap">` + spalte(t("aufdeck.tippVon", { name: tipper.name }), tipper.guess3, treff) + spalte(t("aufdeck.topVon", { name: owner.name }), owner.top5, treff) + `</div>` +
        (treff.length ? `<p class="pb-sub">${t("aufdeck.beruehrungen")}${treff.map(esc).join(" · ")}</p>`
                      : `<p class="pb-sub">${t("aufdeck.verschieden")}</p>`) + `</div>`;
    };
    p.innerHTML =
      `<div class="pb-sub">${t("aufdeck.titel")}</div>` +
      `<p style="font-size:13px">${t("aufdeck.intro")}</p>` +
      richtung(gB, gA) + richtung(gA, gB) +
      (engine.chat.adShown ? `<button class="pb-btn" id="adZu">${t("aufdeck.tafelZu")}</button>`
                           : `<button class="pb-btn primary" id="adWeiter">${t("aufdeck.weiter")}</button>`);
    const w = p.querySelector("#adWeiter");
    if (w) w.addEventListener("click", async () => {
      engine.chat.adShown = true;
      w.remove();   // Tafel bleibt sichtbar
      const zu = doc.createElement("button");
      zu.className = "pb-btn"; zu.textContent = t("aufdeck.tafelZu");
      zu.addEventListener("click", kwZu);
      p.appendChild(zu);
      await warteAntwort(() => engine.submitToolResult(K().steuerTexte.aufdeckungAngezeigt, { hidden: true }));
    });
    const z = p.querySelector("#adZu");
    if (z) z.addEventListener("click", kwZu);
  }
  
  async function startChat(art) {
    err("");
    const info = state.info;
    // Sprach-Schnappschuss: neue Sessions starten in der Paarsprache; laufende
    // und pausierte behalten ihre Sprache (Resume bricht nicht mitten im
    // Gespräch um). Der Schnappschuss steuert ALLE Korpus-Zugriffe via K().
    const paarSprache = info && info.locale === "en" ? "en" : "de";
    setKorpusSprache(paarSprache);
    const hooks = {
      onGate: (d, e2) => gatePanel(d, e2),
      onRegler: e2 => reglerPanel(e2),
      onRanking: (mode, e2) => rankPanel(mode, e2),
      onStartwerte: e2 => startwertePanel(e2),
      onFreigabe: (d, e2) => freigabePanel(d, e2),
      onKapitel: (n, e2) => kapitelPanel(n, e2),
      onScale: (art, e2) => scalePanel(art, e2),
      onChoice: (art, e2, daten) => choicePanel(art, e2, daten),
      onAufdecken: e2 => aufdeckPanel(e2),
      onMomentEnde: () => markiereAufgedeckt(backend).catch(() => {}),
    };
    const def =
      art === "solo" ? soloDef(backend, hooks) :
      art === "aufdeck" ? aufdeckDef(backend, hooks) :
      art === "einzel" ? einzelDef(backend, hooks) :
      art === "gemeinsam" ? gemeinsamDef(backend, hooks) :
      momentDef(backend, hooks);
    state.chatId = art;
    state.chatShared = null;
    state.herkunft = def.shared ? "scrShared" : "scrMyRoom";   // Raum verlassen → Vorraum
    const gespeichert = await backend.chat.load(def.shared ? "shared" : "mine", art);
    state.chatShared = def.shared;
    // Gemeinsame Auflösung nur, wenn die Spekulation da ist: Beide Handover-
    // Blocks (Selbstangaben + Vermutungen) müssen vorliegen — sonst würde die
    // Session ins Leere starten und nach Blöcken fragen (S35).
    if (art === "gemeinsam" && !gespeichert) {
      const [hA, hB] = await Promise.all([
        Promise.resolve().then(() => backend.handover.get("A")).catch(() => null),
        Promise.resolve().then(() => backend.handover.get("B")).catch(() => null),
      ]);
      if (!hA || !hB) throw new Error(t("fehler.aufloesungFehlt"));
    }
    // G1 vor G2: Sind beide Aufdeck-Freigaben da, aber kein Protokoll, kommt
    // erst die Aufdeck-Runde (verbinden vor verhandeln). Ohne beide Mini-Gates
    // läuft der kollabierte Pfad — die Klärung startet direkt.
    if (art === "gemeinsam" && !gespeichert) {
      const [alleG, protokollG] = await Promise.all([
        backend.bstate.get("reveal").catch(() => null),
        backend.bstate.get("revealLog").catch(() => null),
      ]);
      if (alleG && alleG.A && alleG.B && !protokollG)
        throw new Error(t("fehler.aufdeckWartet"));
    }
    if (art === "aufdeck" && !gespeichert) {
      const alleA = (await backend.bstate.get("reveal")) || {};
      if (!alleA.A || !alleA.B)
        throw new Error(t("fehler.aufdeckZu"));
    }
    const chat = gespeichert || { messages: [], status: "running" };
    const korpusSprache = (gespeichert && gespeichert.language) || paarSprache;
    setKorpusSprache(korpusSprache);
    if (!gespeichert) chat.language = korpusSprache;
    const ctx = { me: info.name, partner: info.partner, nameA: info.nameA, nameB: info.nameB };
    state.engine = new Engine({
      def, chat, llm: backend.llm, ctx,
      hooks: {
        onSave: c => backend.chat.save(def.shared ? "shared" : "mine", art, c),
        onPersonError: err,
        onRender: renderMsgs,
        onDelta: zeigeStream,
      },
    });
    $("chatTitel").textContent = K().korpusTexte["titel." + art] || def.titel;
    show("scrChat");
    renderMsgs();
    if (chat.messages.length) { await state.engine.resume(); } else {
      if (art === "gemeinsam") {
        const [freiA, freiB, protokoll] = await Promise.all([
          Promise.resolve().then(() => backend.handover.get("A")).catch(() => null),
          Promise.resolve().then(() => backend.handover.get("B")).catch(() => null),
          backend.bstate.get("revealLog").catch(() => null),
        ]);
        if (freiA && freiB)
          chat.messages.push({ role: "user", hidden: true, content: baueKlaerungsKontext(freiA, freiB, protokoll) });
      }
      if (art === "aufdeck") {
        const alle = (await backend.bstate.get("reveal")) || {};
        chat.messages.push({ role: "user", hidden: true, content: baueAufdeckKontext(alle.A, alle.B) });
      }
      if (art === "moment") {
        const [goals, agenda, momentLog, measurements, freiA, freiB] = await Promise.all([
          backend.bstate.get("goals"), backend.bstate.get("agenda"),
          backend.bstate.get("momentLog"), backend.bstate.get("measurements"),
          Promise.resolve().then(() => backend.handover.get("A")).catch(() => null),
          Promise.resolve().then(() => backend.handover.get("B")).catch(() => null),
        ]);
        chat.messages.push({
          role: "user", hidden: true,
          content: baueMomentKontext(
            {
              goals, agenda, momentLog,
              messrunde: (() => { const r = bereiteRunde(measurements); return r ? formatiereMessrunde(r, info.nameA, info.nameB) : null; })(),
              sharings: [freiA, freiB].filter(Boolean),
            },
            info.nameA, info.nameB
          ),
        });
      }
      // Die Eröffnungs-Nachricht ist Steuerung fürs Modell, keine Äußerung der Person —
      // sie bleibt unsichtbar (hidden), und die Begleitung beginnt von sich aus.
      const startText = K().steuerTexte.start[art];   // Korpus: Sprachfassung liefert prompts.<locale>.js
      await warteAntwort(() => state.engine.submitToolResult(startText, { hidden: true }));
    }
  }

  async function zeigeZeitleiste() {
    const zl = (await backend.pstate.get("timeline")) || { entries: [] };
    zeigeNur("boxZeitleiste");
    $("boxZeitleiste").classList.remove("pb-hidden");
    $("zlItems").innerHTML = zl.entries.length
      ? zl.entries.map(e2 => `<div class="pb-item"><strong>${esc((e2.topics || []).join(" · "))}</strong><br>${esc(e2.summary)}</div>`).join("")
      : `<div class="pb-item">${t("zeitleiste.leer")}</div>`;
  }

  async function zeigeRegal() {
    const regal = (await backend.bstate.get("shelf")) || { items: [] };
    zeigeNur("boxRegal");
    $("boxRegal").classList.remove("pb-hidden");
    $("regalItems").innerHTML = regal.items.length
      ? regal.items.map(i => {
          const fremd = i.by !== state.info.name;
          return `<div class="pb-item">${esc(i.text)}` +
            (i.wish ? `<br><span class="pb-sub">${t("gate.wish")}${esc(i.wish)}</span>` : "") +
            `<br><span class="pb-sub">${t("allg.von", { name: esc(i.by) })}${i.read ? " · " + t("regal.stGelesen") : ""}${i.gehoben ? " · " + t("regal.stInAgenda") : ""}</span>` +
            (fremd && !i.read ? ` <button class="pb-btn" data-gelesen="${i.id}" style="padding:3px 10px">${t("regal.btnGelesen")}</button>` : "") +
            (fremd && !i.gehoben ? ` <button class="pb-btn" data-heben="${i.id}" style="padding:3px 10px">${t("regal.btnHeben")}</button>` : "") +
            `</div>`;
        }).join("")
      : `<div class="pb-item">${t("regal.leer")}</div>`;
    for (const b of $("regalItems").querySelectorAll("[data-gelesen]"))
      b.addEventListener("click", async () => { await markiereGelesen(backend, b.getAttribute("data-gelesen")); zeigeRegal(); });
    for (const b of $("regalItems").querySelectorAll("[data-heben]"))
      b.addEventListener("click", async () => { await hebeInAgenda(backend, b.getAttribute("data-heben")); zeigeRegal(); });
  }

  async function zeigeAgenda() {
    const agenda = (await backend.bstate.get("agenda")) || { items: [] };
    zeigeNur("boxAgenda");
    $("boxAgenda").classList.remove("pb-hidden");
    $("agendaItems").innerHTML = agenda.items.length
      ? agenda.items.map(i =>
          `<div class="pb-item">${esc(i.text)}<br><span class="pb-sub">${t("allg.von", { name: esc(i.by) })} · ${t("agenda.st." + i.state)}</span>` +
          (i.state === "open"
            ? ` <button class="pb-btn" data-abr="${i.id}" style="padding:3px 10px">${t("agenda.btnAbr")}</button>`
            : "") + `</div>`
        ).join("")
      : `<div class="pb-item">${t("agenda.leer")}</div>`;
    for (const b of $("agendaItems").querySelectorAll("[data-abr]"))
      b.addEventListener("click", async () => { await raeumeAgendaAb(backend, b.getAttribute("data-abr"), "selfResolved"); zeigeAgenda(); });
  }

  /* ---- Paarsprache: beidseitig bestätigter Wechsel (S30·C3).
     Die Karte ist reine Ansicht auf den Backend-Zustand — die Invariante
     (Wechsel nur bei zwei gleichlautenden Anträgen verschiedener Rollen)
     erzwingt der Worker bzw. das lokale Backend, nie die UI. ---- */
  function sprachName(l) { return t("paarspr.name." + (l === "en" ? "en" : "de")); }
  function zeigePaarsprache(meldung) {
    // S35: Die Karte ist hinter einem kleinen Link versteckt; ein offener
    // Vorschlag des Partners klappt sie von selbst auf (Bestätigung wartet).
    const box = $("boxPaarsprache"), zeile = $("psZeile");
    if (!backend.language) { box.classList.add("pb-hidden"); zeile.classList.add("pb-hidden"); return; }
    const aktuell = state.info.locale === "en" ? "en" : "de";
    const wunsch = state.info.languageRequest;
    if (wunsch && wunsch.by !== state.info.role) state.psOffen = true;
    zeile.innerHTML = `<span class="pb-link" id="psLink">${wunsch
      ? t("paarspr.linkOffen", { sprache: sprachName(aktuell) })
      : t("paarspr.link", { sprache: sprachName(aktuell) })}</span>`;
    zeile.classList.remove("pb-hidden");
    zeile.querySelector("#psLink").addEventListener("click", () => {
      state.psOffen = !state.psOffen;
      zeigePaarsprache();
    });
    box.classList.toggle("pb-hidden", !state.psOffen);
    if (!state.psOffen) return;
    const ziel = aktuell === "en" ? "de" : "en";
    const w = wunsch;
    const meins = w && w.by === state.info.role;
    let mitte, knoepfe;
    if (!w) {
      mitte = t("paarspr.aktuell", { sprache: sprachName(aktuell) });
      knoepfe = `<button class="pb-btn" id="psAntrag">${t("paarspr.vorschlagen", { sprache: sprachName(ziel) })}</button>`;
    } else if (meins) {
      mitte = t("paarspr.wartet", { sprache: sprachName(w.target), partner: esc(state.info.partner) });
      knoepfe = `<button class="pb-btn" id="psZurueck">${t("paarspr.zurueckziehen")}</button>`;
    } else {
      mitte = t("paarspr.vorschlag", { partner: esc(state.info.partner), sprache: sprachName(w.target) });
      knoepfe = `<button class="pb-btn primary" id="psJa">${t("paarspr.bestaetigen")}</button> ` +
                `<button class="pb-btn" id="psNein">${t("paarspr.ablehnen")}</button>`;
    }
    const uiZiel = getLocale() === "en" ? "de" : "en";
    box.innerHTML =
      `<div class="pb-sub">${t("paarspr.titel")}</div>` +
      `<p style="font-size:13px;margin:6px 0">${mitte}</p>` + knoepfe +
      ` <button class="pb-btn" id="psUi">${t("paarspr.uiWechsel", { sprache: sprachName(uiZiel) })}</button>` +
      (meldung ? `<p style="font-size:13px;margin:8px 0 0;font-weight:650" id="psMeldung">${meldung}</p>` : "") +
      `<p class="pb-sub" style="margin:8px 0 0">${t("paarspr.hinweisLaufend")}</p>` +
      `<p class="pb-sub" style="margin:4px 0 0">${t("paarspr.uiHinweis", { partner: esc(state.info.partner) })}</p>`;
    const anwenden = r => {
      state.info.locale = r.locale;
      state.info.languageRequest = r.languageRequest;
      state.psOffen = true;   // Ergebnis-Meldung sichtbar lassen
      zeigePaarsprache(r.status === "confirmed"
        ? t("paarspr.gewechselt", { sprache: sprachName(r.locale) })
        : "");
    };
    const knopf = (id, fn) => { const b = box.querySelector(id); if (b) b.addEventListener("click", () => fn().then(anwenden).catch(e => err(fehlerText(e)))); };
    box.querySelector("#psUi").addEventListener("click", async () => {
      setLocale(uiZiel);
      try { await backend.pstate.set("language", uiZiel); } catch { /* Umgebungen ohne pstate */ }
      relaunch();
    });
    knopf("#psAntrag", () => backend.language.request(ziel));
    knopf("#psJa", () => backend.language.request(w.target));
    knopf("#psZurueck", () => backend.language.withdraw());
    knopf("#psNein", () => backend.language.withdraw());
  }

  /* ---- Wiedereinstieg per E-Mail (nur wenn das Backend es unterstützt) ---- */
  function zeigeRecovery() {
    const box = $("boxRecovery");
    if (!backend.recovery) { box.classList.add("pb-hidden"); return; }
    box.classList.remove("pb-hidden");
    const hinterlegt = !!(state.info && state.info.recoveryEmail);
    box.innerHTML =
      `<div class="pb-sub">${t("rec.titel")}</div>` +
      `<p style="font-size:13px;color:var(--ink-soft,#5a6675);margin:6px 0">` +
      (hinterlegt ? t("rec.hinterlegt") : t("rec.neu")) +
      `</p>` +
      `<input id="recInput" type="email" placeholder="${t("rec.platzhalter")}" style="display:block;width:100%;box-sizing:border-box;padding:9px;border:1px solid #cfd8e0;border-radius:9px;font:inherit">` +
      `<button class="pb-btn primary" id="recSave" style="margin-top:8px">${hinterlegt ? t("rec.aendern") : t("rec.hinterlegen")}</button>` +
      `<span id="recNote" class="pb-sub" style="margin-left:8px"></span>`;
    box.querySelector("#recSave").addEventListener("click", async () => {
      const email = box.querySelector("#recInput").value.trim();
      const note = box.querySelector("#recNote");
      if (!email) { note.textContent = t("rec.bitte"); return; }
      try {
        await backend.recovery.setEmail(email);
        state.info.recoveryEmail = true;
        zeigeRecovery();
      } catch (e) { note.textContent = fehlerText(e); }
    });
  }

  /* Verdrahtung — die Zurück-Wege führen in den Vorraum, aus dem man kam:
     Raum verlassen landet nicht mehr auf der Hauptübersicht, sondern im
     jeweiligen Vorraum (Erwartungs-Kontinuität, S35). */
  $("btnMyRoom").addEventListener("click", () => betrete("scrMyRoom"));
  $("btnSharedRoom").addEventListener("click", () => betrete("scrShared"));
  $("btnZurueck1").addEventListener("click", () => betrete("scrStart"));
  $("btnZurueck2").addEventListener("click", () => betrete("scrStart"));
  $("btnChatZurueck").addEventListener("click", () => betrete(state.herkunft || "scrStart"));
  $("btnSolo").addEventListener("click", () => startChat("solo").catch(e => err(e.message)));
  $("btnEinzel").addEventListener("click", () => startChat("einzel").catch(e => err(e.message)));
  $("btnGemeinsam").addEventListener("click", () => startChat("gemeinsam").catch(e => err(e.message)));
    $("btnAufdeck").addEventListener("click", () => startChat("aufdeck").catch(e => err(e.message)));
  $("btnMoment").addEventListener("click", () => startChat("moment").catch(e => err(e.message)));
  $("btnZeitleiste").addEventListener("click", () => infoToggle("boxZeitleiste", () => zeigeZeitleiste()).catch(e => err(e.message)));
  $("btnMess").addEventListener("click", () => infoToggle("boxMess", () => zeigeMess()).catch(e => err(e.message)));
  $("btnRegal").addEventListener("click", () => infoToggle("boxRegal", () => zeigeRegal()).catch(e => err(e.message)));
  $("btnAgenda").addEventListener("click", () => infoToggle("boxAgenda", () => zeigeAgenda()).catch(e => err(e.message)));
  $("btnQz").addEventListener("click", () => infoToggle("boxQz", () => zeigeQz()).catch(e => err(e.message)));
  $("btnSend").addEventListener("click", () => {
    const t = $("pbInput").value.trim();
    if (!t) return;
    $("pbInput").value = "";
    sende(t);
  });
  $("pbInput").addEventListener("keydown", e2 => {
    if (e2.key === "Enter" && !e2.shiftKey) {       // Enter sendet; Shift+Enter = Zeilenumbruch
      e2.preventDefault();
      $("btnSend").click();
    }
  });
  $("pbSkalaRange").addEventListener("input", () => { $("pbSkalaWert").textContent = $("pbSkalaRange").value; });
  $("pbSkalaSend").addEventListener("click", () => sende($("pbSkalaRange").value));

  /* ---- Prozessreflexion (Mess-Runde, verdeckt — Aufdeckung im Moment) ---- */
  async function zeigeMess() {
    const box = $("boxMess");
    zeigeNur("boxMess");
    box.classList.remove("pb-hidden");
    const [mr, goals] = await Promise.all([backend.bstate.get("measurements"), backend.bstate.get("goals")]);
    const offen = ((mr && mr.items) || []).find(r => r.status === "open");
    if (offen && offen.values[state.info.role]) {
      box.innerHTML = `<div class="pb-sub">${t("mess.titel")}</div><p style="font-size:14px">${t("mess.abgegeben")}</p>`;
      return;
    }
    const aktive = (((goals && goals.items) || [])).filter(a => a.status === "active" && a.art === "shared");
    box.innerHTML =
      `<div class="pb-sub">${t("mess.verdeckt", { partner: esc(state.info.partner) })}</div>` +
      `<label style="display:block;font-size:13px;margin:8px 0">${t("mess.closeness", { partner: esc(state.info.partner) })}<br><input id="msNaehe" type="range" min="1" max="10" value="5" style="width:100%"></label>` +
      `<label style="display:block;font-size:13px;margin:8px 0">${t("mess.guess", { partner: esc(state.info.partner) })}<br><input id="msZweit" type="range" min="1" max="10" value="5" style="width:100%"></label>` +
      aktive.map(a =>
        `<label style="display:block;font-size:13px;margin:8px 0">${t("mess.fit", { text: esc(a.text), id: esc(a.id) })}<br><input data-pass="${esc(a.id)}" type="range" min="1" max="10" value="5" style="width:100%"></label>`
      ).join("") +
      `<button class="pb-btn primary" id="msOk">${t("mess.abgeben")}</button>`;
    box.querySelector("#msOk").addEventListener("click", async () => {
      const fit = {};
      for (const inp of box.querySelectorAll("[data-pass]")) fit[inp.getAttribute("data-pass")] = +inp.value;
      const runde = await trageMessbeitragEin(backend, state.info.role, {
        closeness: +box.querySelector("#msNaehe").value,
        guess: +box.querySelector("#msZweit").value,
        fit,
      });
      box.innerHTML = `<div class="pb-sub">${t("mess.titel")}</div><p style="font-size:14px">${t("mess.danke")}` +
        (runde.status === "ready" ? t("mess.bereit") : "") + `</p>`;
    });
  }

  /* ---- Qualitätszeit: Einladungs-Menü mit Leiter ---- */
  async function zeigeQz() {
    const box = $("boxQz");
    zeigeNur("boxQz");
    box.classList.remove("pb-hidden");
    const qz = (await backend.bstate.get("qualitytime")) || { resting: {}, choices: [] };
    if (!qz.startAt) { qz.startAt = new Date().toISOString(); await backend.bstate.set("qualitytime", qz); }
    const stufe = qzStufe(qz);
    if (stufe === "pause") {
      box.innerHTML = `<div class="pb-sub">${t("qz.titel")}</div><p style="font-size:14px">${t("qz.pausiert", { datum: esc((qz.ladder.pausedUntil || "").slice(0, 10)) })}</p>`;
      return;
    }
    const rahmen = K().QZ_STUFEN_TEXT[stufe];
    box.innerHTML =
      `<div class="pb-sub">${t("qz.titel")}</div>` +
      `<p class="pb-sub" style="margin:6px 0 4px">${t("qz.intro")}</p>` +
      (rahmen ? `<p style="font-size:14px">${esc(rahmen)}</p>` : "") +
      (stufe === 4 ? `<button class="pb-btn" id="qzPause">${t("qz.pauseBtn")}</button>` : "") +
      `<button class="pb-btn primary" id="qzHolen">${t("qz.holen")}</button><div id="qzKarten"></div>`;
    if (stufe === 4) box.querySelector("#qzPause").addEventListener("click", async () => { await vereinbarePause(backend, 4); zeigeQz(); });
    box.querySelector("#qzHolen").addEventListener("click", async () => {
      const [goals, freiA, freiB] = await Promise.all([
        backend.bstate.get("goals"),
        Promise.resolve().then(() => backend.handover.get("A")).catch(() => null),
        Promise.resolve().then(() => backend.handover.get("B")).catch(() => null),
      ]);
      setKorpusSprache(state.info && state.info.locale === "en" ? "en" : "de");   // QZ = geteilt, Paarsprache
      const def = qzDef({
        onFaecher: async (data) => {
          $("qzKarten").innerHTML = data.invitations.map((e2, i) =>
            `<div class="pb-item">${esc(e2.text)}<br><span class="pb-sub">${esc(e2.domain)}</span> <button class="pb-btn" data-qzw="${i}" style="padding:3px 10px">${t("qz.waehlen")}</button></div>`
          ).join("") + `<button class="pb-btn" id="qzKeine" style="margin-top:6px">${t("qz.keine")}</button>`;
          for (const b of $("qzKarten").querySelectorAll("[data-qzw]"))
            b.addEventListener("click", async () => {
              await waehleEinladung(backend, data.invitations[+b.getAttribute("data-qzw")]);
              $("qzKarten").innerHTML = `<p style="font-size:14px">${t("qz.gewaehlt")}</p>`;
            });
          $("qzKarten").querySelector("#qzKeine").addEventListener("click", async () => {
            await keineEinladung(backend, data.invitations, stufe);
            $("qzKarten").innerHTML = `<p style="font-size:14px">${t("qz.ok")}</p>`;
          });
        },
      });
      const engine = new Engine({
        def, chat: { messages: [], status: "running" }, llm: backend.llm,
        ctx: {}, hooks: { onPersonError: err },
      });
      await engine.sendUser(baueQzMaterial({ goals, sharings: [freiA, freiB].filter(Boolean), qualitytime: qz }));
    });
  }

  /* ---- Kernwetten-Panels (Regler · Ranking · Startwerte · Freigabe) ---- */
  const kw = () => $("kwPanel");
  const KTX = (key, weich) => (K().korpusTexte[key] !== undefined ? K().korpusTexte[key] : (weich ? "" : key));
  function kwZu() { kw().classList.add("pb-hidden"); kw().innerHTML = ""; }

  /* S34 · Skalen-Panel: ersetzt konversationale Zahlenfragen (Sicherheits-
   * skala, Nachbefragung). Beschriftung aus korpusTexte (Paarsprache) —
   * single point of Sicherheitsskalierung; das Modell fragt keine Zahl. */
  function scalePanel(art, engine) {
    const p = kw();
    p.classList.remove("pb-hidden");
    const kt = k => fuelle(KTX("scale." + art + "." + k), { partner: esc(state.info.partner) });
    const slider = id => `<input type="range" min="1" max="10" value="5" id="${id}" style="width:100%">` +
      `<div class="pb-sub" style="display:flex;justify-content:space-between"><span>${kt("min")}</span><strong id="${id}W">5</strong><span>${kt("max")}</span></div>`;
    const doppel = art === "closing";
    p.innerHTML =
      `<p style="font-size:15px"><strong>${kt("titel")}</strong></p>` +
      (KTX("scale." + art + ".text", true) ? `<p class="pb-sub">${kt("text")}</p>` : "") +
      (doppel
        ? `<p class="pb-sub">${esc(state.info.nameA)}</p>` + slider("scA") +
          `<p class="pb-sub" style="margin-top:10px">${esc(state.info.nameB)}</p>` + slider("scB")
        : slider("scA")) +
      `<button class="pb-btn primary" id="scOk" style="margin-top:10px">${t("scale.ok")}</button>`;
    for (const id of doppel ? ["scA", "scB"] : ["scA"]) {
      p.querySelector("#" + id).addEventListener("input", e =>
        (p.querySelector("#" + id + "W").textContent = e.target.value));
    }
    p.querySelector("#scOk").addEventListener("click", async () => {
      const a = p.querySelector("#scA").value;
      const text = doppel
        ? fuelle(K().steuerTexte.scaleClosingErgebnis, { nameA: state.info.nameA, nameB: state.info.nameB, a, b: p.querySelector("#scB").value })
        : fuelle(K().steuerTexte.scaleErgebnis, { id: art, wert: a });
      kwZu();
      await warteAntwort(() => engine.submitToolResult(text, { hidden: true }));   // Wire, nicht Chat (S35)
    });
  }

  /* S34 · Auswahl-Panel: kleines Karten-Menü (z. B. Verbindendes Angebot);
   * "ohne" ist gleichwertige Option — kein Nachhaken (Prompt-Regel). */
  function choicePanel(art, engine, daten) {
    // S35: Optionen kommen bevorzugt aus dem CHOICE-BLOCK des Modells
    // (kontextgespeist erfunden); der Marker-Alt-Pfad ohne daten fällt auf
    // die kuratierten Korpus-Optionen zurück. "Ohne Übung weiter" ergänzt
    // IMMER die App selbst — die Gleichwertigkeit ist App-Invariante.
    const p = kw();
    p.classList.remove("pb-hidden");
    const opt = k => KTX("choice." + art + "." + k, true);
    const karten = (daten && Array.isArray(daten.options) && daten.options.length)
      ? daten.options.slice(0, 4).map(String)
      : ["o1", "o2", "o3", "o4"].map(k => opt(k)).filter(Boolean);
    const titel = (daten && daten.title) || opt("titel");
    p.innerHTML =
      `<p style="font-size:15px"><strong>${esc(titel)}</strong></p>` +
      karten.map((txt, i) => `<button class="pb-btn" data-ch="${i}" style="display:block;width:100%;text-align:left;margin:6px 0">${esc(txt)}</button>`).join("") +
      `<button class="pb-btn" data-ch="ohne" style="display:block;width:100%;text-align:left;margin:10px 0 0;opacity:.85">${esc(opt("ohne"))}</button>`;
    for (const b of p.querySelectorAll("[data-ch]")) {
      b.addEventListener("click", async () => {
        const wahl = b.getAttribute("data-ch") === "ohne" ? opt("ohne") : karten[Number(b.getAttribute("data-ch"))];
        kwZu();
        // hidden: das Steuer-Token ist Wire, keine Äußerung der Person (S35)
        await warteAntwort(() => engine.submitToolResult(fuelle(K().steuerTexte.choiceErgebnis, { id: art, wahl }), { hidden: true }));
      });
    }
  }

  function reglerPanel(engine) {
    const vals = K().DOMAINS.map(() => ({ w: 5, z: 5, tw: false, tz: false }));
    let i = 0;
    const p = kw();
    p.classList.remove("pb-hidden");
    function zeichne() {
      const d = K().DOMAINS[i];
      const [lw, lz] = d.poles
        ? [t("kw.poleW", { p0: d.poles[0], p1: d.poles[1] }), t("kw.poleZ")]
        : [t("kw.wichtig"), t("kw.zufrieden")];
      p.innerHTML =
        `<div class="pb-sub">${t("kw.bereich", { i: i + 1, n: K().DOMAINS.length })}</div>` +
        `<p style="font-size:14px;margin:6px 0"><strong>${esc(d.t)}</strong><br><span class="pb-sub">${esc(d.d)}</span></p>` +
        `<label style="display:block;font-size:13px;margin:8px 0">${esc(lw)}<br><input id="kwW" type="range" min="1" max="10" value="${vals[i].w}" style="width:100%"></label>` +
        `<label style="display:block;font-size:13px;margin:8px 0">${esc(lz)}<br><input id="kwZ" type="range" min="1" max="10" value="${vals[i].z}" style="width:100%"></label>` +
        `<button class="pb-btn" id="kwBack"${i === 0 ? " disabled" : ""}>${t("allg.zurueck")}</button>` +
        `<button class="pb-btn primary" id="kwNext" disabled>${i === K().DOMAINS.length - 1 ? t("allg.fertig") : t("allg.weiter")}</button>`;
      const auf = () => { p.querySelector("#kwNext").disabled = !(vals[i].tw && vals[i].tz); };
      for (const [id, feld] of [["kwW", "w"], ["kwZ", "z"]]) {
        const inp = p.querySelector("#" + id);
        const anfassen = () => { vals[i][feld] = +inp.value; vals[i]["t" + feld] = true; auf(); };
        inp.addEventListener("input", anfassen);
        inp.addEventListener("click", anfassen);
      }
      auf();
      p.querySelector("#kwBack").addEventListener("click", () => { if (i > 0) { i--; zeichne(); } });
      p.querySelector("#kwNext").addEventListener("click", async () => {
        if (!(vals[i].tw && vals[i].tz)) return;
        if (i < K().DOMAINS.length - 1) { i++; zeichne(); return; }
        kwZu();
        await warteAntwort(() => engine.submitToolResult(reglerErgebnis(vals, state.info.name), { slider: true, hidden: true }));
      });
    }
    zeichne();
  }

  function rankPanel(mode, engine) {
    const cfg = RANK_MODES[mode];
    const ITEMS = rankItems();
    const ctx = { me: state.info.name, partner: state.info.partner };
    const order = [];
    const p = kw();
    p.classList.remove("pb-hidden");
    function zeichne() {
      const titel = typeof cfg.title === "function" ? cfg.title(ctx) : cfg.title;
      const desc = typeof cfg.desc === "function" ? cfg.desc(ctx) : cfg.desc;
      p.innerHTML =
        `<div class="pb-sub">${esc(titel)}</div><p style="font-size:13px">${esc(desc)}</p>` +
        `<div id="kwStack">` +
        order.map((ri, pos) =>
          `<div class="pb-item">${pos + 1}. ${esc(ITEMS[ri].label)} <button class="pb-btn" data-raus="${ri}" style="padding:2px 8px;float:right">✕</button></div>`
        ).join("") + `</div><div id="kwPool" style="margin:8px 0">` +
        ITEMS.map((it, ri) => order.includes(ri) ? "" :
          `<button class="pb-btn" data-rein="${ri}"${order.length >= cfg.topN ? " disabled" : ""}>${esc(it.label)}</button>`
        ).join("") + `</div>` +
        `<button class="pb-btn primary" id="kwRankOk"${order.length === cfg.topN ? "" : " disabled"}>${t("allg.fertig")}</button>`;
      for (const b of p.querySelectorAll("[data-rein]"))
        b.addEventListener("click", () => { order.push(+b.getAttribute("data-rein")); zeichne(); });
      for (const b of p.querySelectorAll("[data-raus]"))
        b.addEventListener("click", () => { order.splice(order.indexOf(+b.getAttribute("data-raus")), 1); zeichne(); });
      p.querySelector("#kwRankOk").addEventListener("click", async () => {
        if (order.length !== cfg.topN) return;
        kwZu();
        engine.chat.ranks = engine.chat.ranks || {};
        engine.chat.ranks[mode] = order.map(ri => ITEMS[ri].label);
        if ((mode === "self" || mode === "pwichtig") && engine.chat.minigate === "ja") {
          try {
            const protokoll = await backend.bstate.get("revealLog");
            if (!protokoll) {
              const alle = (await backend.bstate.get("reveal")) || {};
              if (alle[state.info.role]) {
                alle[state.info.role] = baueAufdeckung(state.info.name, engine.chat.ranks);
                await backend.bstate.set("reveal", alle);
              }
            }
          } catch { /* Nachzug ist Komfort, kein Muss */ }
        }
        await warteAntwort(() => engine.submitToolResult(rankingErgebnis(mode, order, ctx), { ranking: mode, hidden: true }));
      });
    }
    zeichne();
  }

  function startwertePanel(engine) {
    // Verdeckt nacheinander (ein Gerät), gleichzeitig aufgedeckt — v0.29-Semantik.
    const namen = [state.info.nameA, state.info.nameB];
    const werte = [];
    const p = kw();
    p.classList.remove("pb-hidden");
    function frage(idx) {
      p.innerHTML =
        `<div class="pb-sub">${t("sw.titel", { name: esc(namen[idx]) })}</div>` +
        `<p style="font-size:14px">${t("sw.frage", { name: esc(namen[idx]) })}</p>` +
        `<input id="kwSW" type="range" min="1" max="10" value="5" style="width:100%">` +
        `<div class="pb-sub" style="text-align:center" id="kwSWv">5</div>` +
        `<button class="pb-btn primary" id="kwSWok">${t("sw.ok")}</button>`;
      const inp = p.querySelector("#kwSW");
      inp.addEventListener("input", () => { p.querySelector("#kwSWv").textContent = inp.value; });
      p.querySelector("#kwSWok").addEventListener("click", async () => {
        werte.push(+inp.value);
        if (werte.length < 2) { frage(1); return; }
        kwZu();
        await warteAntwort(() => engine.submitToolResult(startwerteErgebnis(namen[0], werte[0], namen[1], werte[1]), { baseline: true, hidden: true }));
      });
    }
    frage(0);
  }

  function freigabePanel(data, engine) {
    const wieder = engine.chat.minigate === "nein";   // Wiedervorlage genau einmal, danach nie mehr
    const p = kw();
    p.classList.remove("pb-hidden");
    p.innerHTML =
      `<div class="pb-sub">${t("fg.titel")}</div>` +
      data.items.map((it, i) =>
        `<label style="display:block;font-size:14px;margin:6px 0"><input type="checkbox" data-fg="${i}" checked> <strong>${esc(it.id)}</strong> ${esc(it.text)}</label>`
      ).join("") +
      `${wieder ? `<p style="font-size:14px">${t("fg.wieder", { partner: esc(state.info.partner) })}</p><label style="display:block;font-size:14px;margin:6px 0"><input type="checkbox" id="kwFgAufdeck"> ${t("fg.check")}</label>` : ""}<button class="pb-btn primary" id="kwFgOk">${t("allg.freigeben")}</button>` +
      `<button class="pb-btn" id="kwFgNein">${t("allg.nochNicht")}</button>`;
    p.querySelector("#kwFgOk").addEventListener("click", async () => {
      const items = [...p.querySelectorAll("input[data-fg]:checked")].map(x => {
        const it = data.items[+x.getAttribute("data-fg")];
        return { id: it.id, text: it.text };
      });
      const auchAufdecken = wieder && !!p.querySelector("#kwFgAufdeck") && p.querySelector("#kwFgAufdeck").checked;
      kwZu();
      try {
        await backend.handover.post({ module: "kernwetten", name: state.info.name, items });
        if (auchAufdecken) {
          const alle = (await backend.bstate.get("reveal")) || { A: null, B: null };
          alle[state.info.role] = baueAufdeckung(state.info.name, engine.chat.ranks || {});
          await backend.bstate.set("reveal", alle);
          engine.chat.minigate = "ja";
        }
        engine.chat.status = "released";
      } catch (e) { err(e.message); return; }
      await warteAntwort(() => engine.submitToolResult(fuelle(K().steuerTexte.freigabeAnzahl, { n: items.length, gesamt: data.items.length })));
    });
    p.querySelector("#kwFgNein").addEventListener("click", async () => {
      kwZu();
      await warteAntwort(() => engine.submitToolResult(K().steuerTexte.freigabeAnpassen));
    });
  }

  /* ---- Diktat: direkte Spracherkennung mit OS-Tipp als Fallback ---- */
  function diktatTipp() {
    const ua = dk.ua;
    if (/Android|iPhone|iPad|iPod/i.test(ua))
      return t("diktat.mobil");
    if (/Windows/i.test(ua))
      return t("diktat.windows");
    if (/Mac/i.test(ua))
      return t("diktat.mac");
    return t("diktat.allgemein");
  }

  let rec = null;
  function diktatStopp() {
    if (rec) { try { rec.stop(); } catch { /* egal */ } rec = null; }
    $("btnMic").innerHTML = IKON.mic;
    $("btnMic").setAttribute("data-icon", "mic");
    $("btnMic").classList.remove("primary");
  }
  function diktatStart() {
    if (!dk.SR) { hint(diktatTipp()); return; }          // keine Erkennung → OS-Tipp
    try { rec = new dk.SR(); } catch { hint(diktatTipp()); return; }
    rec.lang = t("sprache.diktat");
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = ev => {
      let final = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++)
        if (ev.results[i].isFinal) final += ev.results[i][0].transcript;
      if (final) {
        const t = $("pbInput");
        t.value = (t.value ? t.value.replace(/\s+$/, "") + " " : "") + final.trim();
      }
    };
    rec.onerror = ev => {
      diktatStopp();
      if (ev && (ev.error === "not-allowed" || ev.error === "service-not-allowed"))
        hint(diktatTipp());                              // Mikro blockiert (z. B. Sandbox) → OS-Tipp
      else err(t("diktat.unterbrochen"));
    };
    rec.onend = () => { if (rec) diktatStopp(); };       // Browser beendet still (Timeout)
    rec.start();
    $("btnMic").innerHTML = IKON.stop;
    $("btnMic").setAttribute("data-icon", "stop");
    $("btnMic").classList.add("primary");
    hint(t("diktat.laeuft"));
  }
  $("btnMic").addEventListener("click", () => { rec ? diktatStopp() : diktatStart(); });

  /* ── UI-Sprache: pro Person (pstate "language"), jederzeit umstellbar,
     folgenlos für den Partner. Der Wechsel baut die Oberfläche neu auf;
     Gespräche und Zustände liegen im Backend und bleiben unberührt.
     Die Begleitungssprache (Korpus) ist davon getrennt — Paar-Ebene, Stufe C. ── */
  function relaunch() {
    const neu = createApp({ doc, backend, root: wurzel, diktat });
    return neu.boot();
  }
  /* S36: Der sichtbare EN·DE-Schalter oben rechts ist entfernt. Die
     UI-Sprache bleibt persönlicher Zustand (pstate "language") und wird
     beim Boot weiterhin angewendet — nur der Kopfzeilen-Schalter entfällt. */

  async function boot() {
    applyDesign(doc);   // Design dokumentweit (idempotent)
    state.info = await backend.info();
    try {
      const sp = await backend.pstate.get("language");
      if (sp && sp !== getLocale()) { setLocale(sp); return relaunch(); }
    } catch { /* Umgebungen ohne pstate */ }
    doc.documentElement.lang = getLocale();
    $("pbHallo").textContent = t("allg.hallo", { name: state.info.name });
    $("pbKern").textContent = t("allg.marke");
    $("startHallo").textContent = t("start.hallo", { name: state.info.name });
    $("startIntro").textContent = t("start.intro");
    $("startMeinSub").textContent = t("start.meinSub", { partner: state.info.partner });
    $("startTeilSub").textContent = t("start.teilSub");
    $("meinIntro").textContent = t("mein.intro", { partner: state.info.partner });
    $("pbBusyTxt").textContent = t("allg.arbeitet");
    zeigeRecovery();
    zeigePaarsprache();
    betrete("scrStart");
  }

  return { boot, show, startChat, _state: state, _err: err };
}
