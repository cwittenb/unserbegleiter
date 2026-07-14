// UI-Schicht — dünner DOM-Layer über Engine und Backend-Fassade.
// document wird injiziert (happy-dom-testbar); kein Storage-, kein Key-Wissen.

import { Engine } from "../engine/engine.js";
import { cleanDisplay } from "../contracts/block.js";
import { ALLE_BLOECKE } from "../contracts/registry.js";
import { soloDef, momentDef, quereGate, baueMomentKontext, baueSoloKontext, markiereGelesen, hebeInAgenda, raeumeAgendaAb } from "./sessions.js";
import { einzelDef, gemeinsamDef, rankItems, RANK_MODES, reglerErgebnis, rankingErgebnis, startwerteErgebnis, beruehrungen, baueAufdeckung, baueAufdeckKontext, baueKlaerungsKontext } from "./kernwetten.js";
import { K, setKorpusSprache } from "../prompts/prompts.js";
import { holeMessIntervall, schlageMessIntervallVor, antworteMessIntervall, messFenster,
  trageMessbeitragEin, bereiteRunde, formatiereMessrunde, markiereAufgedeckt } from "./prozess.js";
import { applyDesign } from "./design.js";
import { t, fuelle, getLocale, setLocale, fehlerText } from "../i18n/index.js";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
// Kürzel für die zwei Notifikations-Badges: beide Partner schauen ggf.
// gemeinsam auf den Screen, deshalb je eine Badge. Das Präfix wächst nur so
// weit, wie nötig, um die Namen unterscheidbar zu machen (Anna/Andreas → AN/AND).
function badgeLabels(a, b) {
  a = String(a ?? "").trim(); b = String(b ?? "").trim();
  const up = (s, k) => s.slice(0, k).toLocaleUpperCase();
  let n = 1;
  while (n < Math.max(a.length, b.length) && up(a, n) === up(b, n)) n++;
  return [up(a, n) || up(a, 1), up(b, n) || up(b, 1)];
}

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

/* S41 · Anzeige-Wächter: Ergebnis-Nachrichten der Panels sind Wire — seit
   S35/S37 gehen sie hidden über den Draht, aber Sessions aus der Zeit davor
   tragen das Flag nicht. Diese Köpfe werden deshalb IMMER unterdrückt. */
export const WIRE_KOEPFE = [
  "SLIDERS-RESULT", "RANKING-RESULT", "PARTNER-GUESS-CHANGE", "PARTNER-GUESS",
  "BASELINE-RESULT", "SCALE-RESULT", "CHOICE-RESULT", "SHARING-RESULT", "REVEAL-SHOWN",
];
const istWireNachricht = m =>
  m.role === "user" && WIRE_KOEPFE.some(k => String(m.content || "").startsWith(k));

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
          <p class="pb-sub" id="startMeinSub" style="margin:8px 0 0"></p>
        </div>
        <div class="pb-card">
          <button class="pb-btn primary" id="btnSharedRoom">${t("start.teilRaum")} <span class="pb-hidden" id="badgeTeil"></span></button>
          <p class="pb-sub" id="startTeilSub" style="margin:8px 0 0"></p>
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
          <p class="pb-sub" style="margin:8px 0 0">${t("mein.soloSub")}</p>
        </div>
        <div class="pb-card">
          <button class="pb-btn primary" id="btnEinzel">${t("mein.einzel")}</button>
          <p class="pb-sub" id="einzelSubP" style="margin:8px 0 0">${t("mein.einzelSub")}</p>
          <button class="pb-btn primary pb-hidden" id="btnMess">${t("mein.mess")}</button>
          <p class="pb-sub pb-hidden" id="messSubP" style="margin:8px 0 0">${t("mein.messSub")}</p>
        </div>
      </div>
      <div class="pb-card pb-reihe">
        <div class="pb-sub">${t("mein.gruppeRegale")}</div>
        <button class="pb-btn" id="btnZeitleiste">${t("mein.zeitleiste")}</button>
      </div>
      <div class="pb-card pb-hidden" id="boxZeitleiste"><div class="pb-sub">${t("zeitleiste.titel")}</div><div id="zlItems"></div></div>
      <div class="pb-card pb-hidden" id="boxMess"></div>
      <div class="pb-card pb-hidden" id="boxRecovery"></div>
      <div class="pb-reihe" style="padding:10px 0 0"><button class="pb-btn" id="btnZurueck1">${t("allg.zurueck")}</button></div>
    </div>
    <div id="scrShared" class="pb-hidden">
      <div class="pb-card" style="padding:18px 26px">
        <div style="font-size:16px;font-weight:650;margin-bottom:4px">${t("start.teilRaum")}</div>
        <p class="pb-sub" id="sharedIntro" style="margin:0">${t("teil.intro")}</p>
        <div class="pb-weg pb-hidden" id="wegTeil" style="margin-top:12px"></div>
      </div>
      <div class="pb-drei pb-mitte">
        <div class="pb-card">
          <button class="pb-btn primary" id="btnMoment">${t("teil.moment")}</button>
          <p class="pb-sub" style="margin:8px 0 0">${t("teil.momentSub")}</p>
        </div>
        <div class="pb-card">
          <button class="pb-btn primary" id="btnGemeinsam">${t("teil.gemeinsam")}</button>
          <p class="pb-sub pb-hidden" id="gemeinsamHinweis" style="margin:8px 0 0"></p>
        </div>
      </div>
      <div class="pb-card pb-reihe">
        <div class="pb-sub">${t("teil.gruppeRegale")}</div>
        <button class="pb-btn" id="btnRegal">${t("teil.regal")} <span class="pb-hidden" id="badgeRegal"></span></button>
        <button class="pb-btn" id="btnAgenda">${t("teil.agenda")}</button>
        <button class="pb-btn" id="btnQz">${t("teil.qz")}</button>
      </div>
      <div class="pb-card pb-hidden" id="boxRegal"><div class="pb-sub" id="regalTitel"></div><p class="pb-sub" id="regalIntro" style="margin:6px 0 4px"></p><div id="regalItems"></div></div>
      <div class="pb-card pb-hidden" id="boxAgenda"><div class="pb-sub">${t("agenda.titel")}</div><div id="agendaItems"></div></div>
      <div class="pb-card pb-hidden" id="boxQz"></div>
      <div class="pb-reihe" style="padding:10px 0 0"><button class="pb-btn" id="btnZurueck2">${t("allg.zurueck")}</button></div>
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
        <button class="pb-btn pb-hidden" id="btnChatEnde">${t("chat.abschliessen")}</button>
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
    const [reveal, revealLog, shelf, agenda, measurements, timeline, hA, hB, einzelChat, momentChat, findings] = await Promise.all([
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
      still(() => backend.bstate.get("findings")),
    ]);
    const rolle = state.info.role;
    const offeneRunde = (((measurements && measurements.items) || [])).find(r => r.status === "open");
    return {
      aufdeckBereit: !!(reveal && reveal.A && reveal.B && !revealLog),
      aufdeckGelaufen: !!revealLog,
      aufloesungGelaufen: !!findings,
      handMeins: !!(rolle === "A" ? hA : hB),
      handPartner: !!(rolle === "A" ? hB : hA),
      handBeide: !!(hA && hB),
      regalNeu: (((shelf && shelf.items) || [])).filter(i => i.by !== state.info.name && !i.read).length,
      // Je Partner ungelesen (Empfänger = die jeweils ANDERE Person): für zwei Badges.
      regalNeuA: (((shelf && shelf.items) || [])).filter(i => i.by !== state.info.nameA && !i.read).length,
      regalNeuB: (((shelf && shelf.items) || [])).filter(i => i.by !== state.info.nameB && !i.read).length,
      agendaOffen: (((agenda && agenda.items) || [])).filter(i => i.state === "open").length,
      messBereit: (((measurements && measurements.items) || [])).some(r => r.status === "ready"),
      messOffen: !!(offeneRunde && !offeneRunde.values[rolle]),
      // "pausiert bei Kapitel N" nur solange die Auftragsklärung wirklich läuft
      // und NICHT freigegeben ist (S44: nach Abschluss kein Pause-Hinweis mehr).
      einzelKapitel: (einzelChat && einzelChat.status === "running" && !einzelChat.freigegeben && einzelChat.kapitel) || 0,
      einzelBegonnen: !!(einzelChat && ((einzelChat.messages || []).length || einzelChat.freigegeben)),
      einzelFertig: !!(einzelChat && einzelChat.freigegeben),
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
      if (lage.handBeide && !lage.aufloesungGelaufen) h.push(t("weg.aufloesungBereit"));
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
      if (!lage.aufloesungGelaufen) aufloesung();
      if (lage.regalNeu) h.push(t("weg.regalNeu", { n: lage.regalNeu }));
      if (lage.agendaOffen) h.push(t("weg.agendaOffen", { n: lage.agendaOffen }));
      if (lage.messBereit) h.push(t("weg.messBereit"));
    }
    return h.slice(0, 3);
  }

  /* S41 · Lage sichtbar machen: Badges für ungelesene Freigaben und
     Ausgrauen gesperrter Sessions MIT stets sichtbarem Hinweis unter dem
     Knopf (Touch-tauglich, kein Hover, kein Fehler-Popup). */
  function wendeLageAn(lage, screenId) {
    // Zwei Badges möglich: beide Partner schauen ggf. gemeinsam auf den Screen,
    // jede Badge zeigt das (unterscheidbare) Kürzel der Person, DIE LESEN SOLL,
    // plus Zähler. Eine Badge mit Zähler 0 wird weggelassen.
    const [kA, kB] = badgeLabels(state.info.nameA, state.info.nameB);
    const badges = (id) => {
      const b = wurzel.querySelector("#" + id);
      if (!b) return;
      const pillen = [{ k: kA, n: lage.regalNeuA }, { k: kB, n: lage.regalNeuB }].filter(p => p.n > 0);
      b.innerHTML = pillen.map(p => `<span class="pb-badge">${esc(p.k)} ${p.n}</span>`).join("");
      b.classList.toggle("pb-hidden", !pillen.length);
    };
    if (screenId === "scrMyRoom") {
      // S44 · Prozessreflexion erscheint erst, wenn die Gemeinsame Auflösung
      // gelaufen ist (Auftragsklärung abgeschlossen + aufgedeckt); dann tritt
      // sie an die STELLE der Auftragsklärung (nicht in die Regal-Reihe).
      const auf = !!lage.aufloesungGelaufen;
      const tog = (id, hide) => { const e = $(id); if (e) e.classList.toggle("pb-hidden", hide); };
      tog("btnEinzel", auf); tog("einzelSubP", auf);
      tog("btnMess", !auf); tog("messSubP", !auf);
      return;
    }
    if (screenId === "scrStart") badges("badgeTeil");
    if (screenId !== "scrShared") return;
    badges("badgeRegal");
    const sperre = (btnId, hinweisId, zu, text) => {
      const b = $(btnId), h = $(hinweisId);
      if (!b) return;
      b.disabled = zu;
      if (h) { h.textContent = text || ""; h.classList.toggle("pb-hidden", !zu || !text); }
    };
    const bm = $("btnMoment");
    if (bm) bm.textContent = lage.momentOffen ? t("teil.momentWeiter") : t("teil.moment");
    sperre("btnGemeinsam", "gemeinsamHinweis", !lage.handBeide, t("teil.gateAufloesung"));
  }

  /* S36 · Feste Wegweiser-Zeilen: sie halten alle Optionen offen, statt
     einen Pfad zu drängen. Die dritte Zeile in "Mein Raum" richtet sich
     danach, ob schon Inhalte da sind (Rückblick vs. Ausblick). */
  function wegOptionen(lage, screenId) {
    if (screenId === "scrStart")
      return [!lage.einzelBegonnen && t("weg.startAuftrag"), t("weg.startSolo"), t("weg.optQz")].filter(Boolean);
    if (screenId === "scrMyRoom")
      return [t("weg.soloErster"), !lage.einzelBegonnen && t("weg.optAuftragEuch"),
              lage.zeitleisteLeer ? t("weg.optRueckblickSpaeter") : t("weg.optRueckblick")].filter(Boolean);
    if (screenId === "scrShared") {
      const zeilen = [t("weg.optQzTeil")];
      if (lage.handBeide && !lage.aufloesungGelaufen)
        zeilen.push(lage.aufdeckBereit ? t("weg.optAufloesungMitAufdeck") : t("weg.optAufloesung"));
      zeilen.push(t("weg.optRegalTeil"));
      return zeilen;
    }
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
      wendeLageAn(lage, screenId);
      const zeilen = [...wegHinweise(lage, screenId), ...wegOptionen(lage, screenId)];
      const box = $(boxId);
      if (!zeilen.length) { box.classList.add("pb-hidden"); return; }
      box.innerHTML = (screenId === "scrShared" ? `<div class="pb-sub">${t("weg.titel")}</div>` : "") +
        zeilen.map(x => `<div class="pb-item">‣ ${esc(x)}</div>`).join("");
      box.classList.remove("pb-hidden");
    } catch { /* Wegweiser ist Komfort, kein Muss */ }
  }
  function betrete(screenId) {
    show(screenId);
    aktualisiereWegweiser(screenId);
  }

  /* S39/S44 · Prozessreflexions-Rhythmus: geteilter Vertrag, jetzt als Sektion
     "Weitere Absprachen" IN der Agenda (statt lose im gemeinsamen Raum). Frei
     wählbar (Tage), Default wöchentlich; eine Person schlägt vor, die andere
     bestätigt — Muster wie die Begleitsprache, App-Ebene. Immer offen gerendert. */
  async function rhythmusSektion(box, meldung) {
    if (!box) return;
    const iv = await holeMessIntervall(backend);
    const w = iv.vorschlag;
    const meins = w && w.by === state.info.role;
    let mitte, knoepfe;
    if (!w) {
      mitte = t("messiv.aktuell", { rhythmus: rhythmusText(iv.days) });
      knoepfe = `<label style="font-size:13px">${t("messiv.eingabe")} <input id="miTage" type="number" min="1" max="90" value="${iv.days}" style="width:64px;padding:6px;border:1px solid var(--field-bd);border-radius:8px;background:var(--field);color:var(--ink);font:inherit"></label> ` +
                `<button class="pb-btn" id="miVorschlag">${t("messiv.vorschlagen")}</button>`;
    } else if (meins) {
      mitte = t("messiv.wartet", { rhythmus: rhythmusText(w.days), partner: esc(state.info.partner) });
      knoepfe = `<button class="pb-btn" id="miZurueck">${t("messiv.zurueckziehen")}</button>`;
    } else {
      mitte = t("messiv.vorschlag", { partner: esc(state.info.partner), rhythmus: rhythmusText(w.days) });
      knoepfe = `<button class="pb-btn primary" id="miJa">${t("messiv.bestaetigen")}</button> ` +
                `<button class="pb-btn" id="miNein">${t("messiv.ablehnen")}</button>`;
    }
    box.innerHTML =
      `<div class="pb-sub" style="margin-top:12px">${t("agenda.gruppeAbsprachen")}</div>` +
      `<p style="font-size:13px;margin:4px 0 6px"><strong>${t("messiv.titel")}</strong> — ${mitte}</p>` + knoepfe +
      (meldung ? `<p style="font-size:13px;margin:8px 0 0;font-weight:650">${meldung}</p>` : "") +
      `<p class="pb-sub" style="margin:8px 0 0">${t("messiv.hinweis")}</p>`;
    const knopf = (id, fn) => {
      const b = box.querySelector(id);
      if (b) b.addEventListener("click", () => fn().then(r =>
        rhythmusSektion(box, r && r.days && !r.vorschlag && id === "#miJa" ? t("messiv.gewechselt", { rhythmus: rhythmusText(r.days) }) : "")
      ).catch(e => err(fehlerText(e))));
    };
    knopf("#miVorschlag", () => schlageMessIntervallVor(backend, state.info.role, box.querySelector("#miTage").value));
    knopf("#miJa", () => antworteMessIntervall(backend, state.info.role, true));
    knopf("#miNein", () => antworteMessIntervall(backend, state.info.role, false));
    knopf("#miZurueck", () => antworteMessIntervall(backend, state.info.role, false));
  }
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
        // S44 · Panel-Echo: geschlossene Regler/Slider hinterlassen eine
        // kompakte Zusammenfassungszeile im Verlauf (statt spurlos zu verschwinden).
        if (m.echo) {
          const e2 = el("div", "pb-echo");
          e2.textContent = m.echo;
          e2.setAttribute("style", "align-self:flex-end;font-size:12px;color:var(--ink-faint);background:var(--card);border:1px solid var(--card-bd);border-radius:999px;padding:3px 12px;max-width:82%");
          box.appendChild(e2);
          continue;
        }
        if (m.hidden || istWireNachricht(m)) continue;   // S41: Wächter auch für Alt-Sessions
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
      onMomentEnde: () => { markiereAufgedeckt(backend).catch(() => {}); aktualisiereChatEnde(); },
    };
    const def =
      art === "solo" ? soloDef(backend, hooks) :
      art === "einzel" ? einzelDef(backend, hooks) :
      art === "gemeinsam" ? gemeinsamDef(backend, hooks) :
      momentDef(backend, hooks);
    state.chatId = art;
    state.chatShared = null;
    state.herkunft = def.shared ? "scrShared" : "scrMyRoom";   // Raum verlassen → Vorraum
    let gespeichert = await backend.chat.load(def.shared ? "shared" : "mine", art);
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
    // S42 · Eine abgeschlossene Qualitätszeit wird nicht wieder aufgemacht —
    // ihr Protokoll liegt in "Gemeinsame Momente"; der nächste Klick beginnt frisch.
    if (art === "moment" && gespeichert && gespeichert.status !== "running") gespeichert = null;
    const chat = gespeichert || { messages: [], status: "running" };
    // S38 · Abschluss-Bewusstsein: Eine freigegebene Auftragsklärung öffnet
    // beim Wiederbetreten den NACHKLANG (hinzufügen / richtigstellen /
    // Zusammenfassung) statt stumm abgeschlossen zu sein.
    const einzelRueckkehr = art === "einzel" && !!chat.freigegeben && chat.status === "released";
    if (einzelRueckkehr) chat.status = "running";
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
    aktualisiereChatEnde();
    show("scrChat");
    renderMsgs();
    if (chat.messages.length) {
      await state.engine.resume();
      if (einzelRueckkehr)
        await warteAntwort(() => state.engine.submitToolResult(K().steuerTexte.einzelRueckkehr, { hidden: true }));
    } else {
      if (art === "gemeinsam") {
        const [freiA, freiB, protokoll, alleG] = await Promise.all([
          Promise.resolve().then(() => backend.handover.get("A")).catch(() => null),
          Promise.resolve().then(() => backend.handover.get("B")).catch(() => null),
          backend.bstate.get("revealLog").catch(() => null),
          backend.bstate.get("reveal").catch(() => null),
        ]);
        // S43 · Aufdeckung als Auftakt: Haben BEIDE sie gewählt und sie lief
        // noch nicht, wandert der REVEAL-CONTEXT mit in die Klärung — die
        // Session beginnt mit der Tafel und geht dann in die Klärung über.
        // Ohne beidseitige Wahl kollabiert der Pfad unsichtbar (kein Hinweis,
        // woran es lag — die Mini-Gate-Entscheidung bleibt privat).
        const auftakt = alleG && alleG.A && alleG.B && !protokoll
          ? baueAufdeckKontext(alleG.A, alleG.B) : null;
        if (freiA && freiB)
          chat.messages.push({ role: "user", hidden: true, content: baueKlaerungsKontext(freiA, freiB, protokoll, auftakt) });
      }
      // S39 · Reflexionsgespräch kennt den Stand: COMPANION-CONTEXT aus
      // Aufträgen, freigegebenem Material beider, EIGENER Zeitleiste und den
      // letzten gemeinsamen Sessions. Ist nichts da → kalter Start (kein Kontext).
      if (art === "solo") {
        const [goals, freiA, freiB, timeline, momentLog, merkposten] = await Promise.all([
          backend.bstate.get("goals").catch(() => null),
          Promise.resolve().then(() => backend.handover.get("A")).catch(() => null),
          Promise.resolve().then(() => backend.handover.get("B")).catch(() => null),
          backend.pstate.get("timeline").catch(() => null),
          backend.bstate.get("momentLog").catch(() => null),
          backend.pstate.get("merkposten").catch(() => null),
        ]);
        const kontext = baueSoloKontext({ goals, sharings: [freiA, freiB].filter(Boolean), timeline, momentLog, merkposten });
        if (kontext) chat.messages.push({ role: "user", hidden: true, content: kontext });
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
              qualitytime: await backend.bstate.get("qualitytime").catch(() => null),
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
    const items = $("zlItems");
    items.innerHTML = zl.entries.length
      ? zl.entries.map((e2, i) => {
          const det = e2.details || [];
          return `<div class="pb-item"><strong>${esc((e2.topics || []).join(" · "))}</strong><br>${esc(e2.summary)}` +
            (det.length
              ? `<br><span class="pb-link" data-zl="${i}">${t("zeitleiste.detailsAuf")}</span>` +
                `<div class="pb-hidden" id="zlDet${i}" style="margin-top:6px">` +
                det.map(dd => `<div style="font-size:14px;color:var(--ink-soft)"><strong>${esc(dd.id)}</strong> ${esc(dd.text)}</div>`).join("") +
                `</div>`
              : "") + `</div>`;
        }).join("")
      : `<div class="pb-item">${t("zeitleiste.leer")}</div>`;
    for (const b of items.querySelectorAll("[data-zl]"))
      b.addEventListener("click", () => {
        const det = items.querySelector("#zlDet" + b.getAttribute("data-zl"));
        if (!det) return;
        const zu = det.classList.toggle("pb-hidden");   // true = jetzt verborgen
        b.textContent = zu ? t("zeitleiste.detailsAuf") : t("zeitleiste.detailsZu");
      });
  }

  async function zeigeRegal() {
    const regal = (await backend.bstate.get("shelf")) || { items: [] };
    zeigeNur("boxRegal");
    $("boxRegal").classList.remove("pb-hidden");
    $("regalTitel").textContent = t("regal.titel");
    $("regalIntro").textContent = t("regal.intro", { nameA: state.info.nameA, nameB: state.info.nameB });
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

  /* S43 · Agenda-Regal v2: EIN Regal, zwei Konzepte getrennt — die
     LAUFENDEN AUFTRÄGE (aus der Gemeinsamen Auflösung, langlebig) und die
     GESPRÄCHSPUNKTE (aus Regal-Hebungen und Gates, flüchtig). Dazu das
     BACKLOG: ruhende Aufträge, die gerade keinen Platz haben, weil an
     höher Priorisiertem gearbeitet wird — zurückgestellt/reaktiviert wird
     in den Sessions (beidseitig), das Regal zeigt nur. */
  async function zeigeAgenda() {
    const [agenda, goals] = await Promise.all([
      backend.bstate.get("agenda").catch(() => null),
      backend.bstate.get("goals").catch(() => null),
    ]);
    zeigeNur("boxAgenda");
    $("boxAgenda").classList.remove("pb-hidden");
    const items = (agenda && agenda.items) || [];
    const auftraege = ((goals && goals.items) || []);
    const aktiv = auftraege.filter(a => a.status === "active");
    const ruht = auftraege.filter(a => a.status === "rest");
    const auftragZeile = a =>
      `<div class="pb-item">${esc(a.text)}<br><span class="pb-sub">${esc(a.id)} · ${t(a.art === "shared" ? "agenda.artGemeinsam" : "agenda.artIndividuell")}${a.owner ? " · " + esc(a.owner) : ""}</span></div>`;
    const punktZeile = i =>
      `<div class="pb-item">${esc(i.text)}<br><span class="pb-sub">${t("allg.von", { name: esc(i.by) })} · ${t("agenda.st." + i.state)}</span>` +
      (i.state === "open"
        ? ` <button class="pb-btn" data-abr="${i.id}" style="padding:3px 10px">${t("agenda.btnAbr")}</button>`
        : "") + `</div>`;
    $("agendaItems").innerHTML =
      `<div class="pb-sub" style="margin-top:6px">${t("agenda.gruppeAuftraege")}</div>` +
      (aktiv.length ? aktiv.map(auftragZeile).join("") : `<div class="pb-item">${t("agenda.auftraegeLeer")}</div>`) +
      `<div class="pb-sub" style="margin-top:10px">${t("agenda.gruppePunkte")}</div>` +
      (items.length ? items.map(punktZeile).join("") : `<div class="pb-item">${t("agenda.leer")}</div>`) +
      (ruht.length
        ? `<div class="pb-sub" style="margin-top:10px">${t("agenda.gruppeBacklog")}</div>` +
          `<p class="pb-sub" style="margin:2px 0 4px">${t("agenda.backlogHinweis")}</p>` +
          ruht.map(auftragZeile).join("")
        : "") +
      `<div id="agendaAbsprachen"></div>`;
    for (const b of $("agendaItems").querySelectorAll("[data-abr]"))
      b.addEventListener("click", async () => { await raeumeAgendaAb(backend, b.getAttribute("data-abr"), "selfResolved"); zeigeAgenda(); });
    // S44 · "Weitere Absprachen": Prozessreflexions-Rhythmus lebt jetzt hier.
    await rhythmusSektion($("agendaAbsprachen"));
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

  /* ---- Wiedereinstieg per E-Mail — zweistufig mit Bestätigungscode (S45).
   *  Ein Bauelement für beide Orte (Karte im Raum, Pflicht-Modal): Adresse →
   *  Code anfordern → 6-stelligen Code eingeben → bestätigt. DOM per
   *  createElement, damit es keine ID-Kollisionen zwischen Karte und Modal
   *  gibt; Tests greifen über data-rec-Attribute zu. ---- */
  function baueVerifikation(wirt, { onFertig }) {
    wirt.innerHTML = "";
    const el = (tag, attrs, stil) => {
      const x = doc.createElement(tag);
      for (const [k, v] of Object.entries(attrs || {})) x.setAttribute(k, v);
      if (stil) x.style.cssText = stil;
      return x;
    };
    const mail = el("input", { type: "email", placeholder: t("rec.platzhalter"), "data-rec": "mail", autocomplete: "email" },
      "display:block;width:100%;box-sizing:border-box;padding:9px;border:1px solid #cfd8e0;border-radius:9px;font:inherit");
    const senden = el("button", { class: "pb-btn primary", "data-rec": "senden" }, "margin-top:8px");
    senden.textContent = t("rec.codeSenden");
    const pin = el("input", { type: "text", inputmode: "numeric", placeholder: t("rec.codeLabel"), "data-rec": "pin", autocomplete: "one-time-code" },
      "display:none;width:100%;box-sizing:border-box;padding:9px;border:1px solid #cfd8e0;border-radius:9px;font:inherit;margin-top:8px;letter-spacing:.2em");
    const ok = el("button", { class: "pb-btn primary", "data-rec": "ok" }, "display:none;margin-top:8px");
    ok.textContent = t("rec.bestaetigen");
    const note = el("span", { class: "pb-sub", "data-rec": "note" }, "display:block;margin-top:8px");
    for (const x of [mail, senden, pin, ok, note]) wirt.appendChild(x);

    let gesendetAn = null;   // Adresse aus Schritt 1 — reist bei der Bestätigung mit (D6.1a)
    const schritt2 = email => {
      gesendetAn = email;
      note.textContent = t("rec.codeUnterwegs", { email });
      pin.style.display = "block";
      ok.style.display = "inline-block";
      senden.textContent = t("rec.neuAnfordern");
    };
    senden.addEventListener("click", async () => {
      const email = mail.value.trim();
      if (!email) { note.textContent = t("rec.bitte"); return; }
      senden.disabled = true;
      try { await backend.recovery.beginVerify(email); schritt2(email); }
      catch (e) { note.textContent = fehlerText(e); }
      finally { senden.disabled = false; }
    });
    ok.addEventListener("click", async () => {
      ok.disabled = true;
      try {
        await backend.recovery.confirm(pin.value.trim(), gesendetAn);
        onFertig();
      } catch (e) {
        note.textContent = fehlerText(e);
        // Abgelaufen/zu viele Versuche: zurück auf Schritt 1 — neuer Code nötig.
        if (e && (e.code === "pin_expired" || e.code === "pin_tries" || e.code === "pin_none")) {
          pin.value = ""; pin.style.display = "none"; ok.style.display = "none";
          senden.textContent = t("rec.codeSenden");
        }
      } finally { ok.disabled = false; }
    });
  }

  function zeigeRecovery() {
    const box = $("boxRecovery");
    if (!backend.recovery) { box.classList.add("pb-hidden"); return; }
    box.classList.remove("pb-hidden");
    const hinterlegt = !!(state.info && state.info.recoveryEmail);
    box.innerHTML =
      `<div class="pb-sub">${t("rec.titel")}</div>` +
      `<p style="font-size:13px;color:var(--ink-soft,#5a6675);margin:6px 0">` +
      (hinterlegt ? t("rec.hinterlegt") : t("rec.neu")) +
      `</p>`;
    if (hinterlegt) {
      const aendern = doc.createElement("button");
      aendern.className = "pb-btn";
      aendern.setAttribute("data-rec", "aendern");
      aendern.textContent = t("rec.aendern");
      box.appendChild(aendern);
      aendern.addEventListener("click", () => {
        aendern.remove();
        const wirt = doc.createElement("div");
        box.appendChild(wirt);
        baueVerifikation(wirt, { onFertig: () => { state.info.recoveryEmail = true; zeigeRecovery(); } });
      });
    } else {
      const wirt = doc.createElement("div");
      box.appendChild(wirt);
      baueVerifikation(wirt, { onFertig: () => { state.info.recoveryEmail = true; zeigeRecovery(); } });
    }
  }

  /* ---- Pflicht-Modal (S45, Flag EMAIL_PFLICHT): Ohne bestätigte Adresse geht
   *  es nicht weiter — Zugangsverlust wäre kritischer als die kleine Hürde.
   *  Bewusst nicht wegklickbar: kein Schließen-Knopf, kein Klick-außerhalb,
   *  kein Escape. Verschwindet ausschließlich durch erfolgreiche Bestätigung. ---- */
  function zeigeEmailPflicht() {
    const overlay = doc.createElement("div");
    overlay.id = "pbEmailPflicht";
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(20,26,34,.55);display:flex;align-items:flex-start;justify-content:center;z-index:1000;padding:48px 18px;overflow:auto";
    const karte = doc.createElement("div");
    karte.className = "pb-card";
    karte.style.cssText = "max-width:440px;width:100%;background:var(--card,#fff);border-radius:14px;padding:20px";
    karte.innerHTML =
      `<div style="font-size:16px;font-weight:650;margin-bottom:6px">${t("rec.pflicht.titel")}</div>` +
      `<p style="font-size:13px;color:var(--ink-soft,#5a6675);margin:0 0 10px">${t("rec.pflicht.text")}</p>`;
    const wirt = doc.createElement("div");
    karte.appendChild(wirt);
    overlay.appendChild(karte);
    (doc.body || wurzel).appendChild(overlay);
    baueVerifikation(wirt, {
      onFertig: () => {
        state.info.recoveryEmail = true;
        overlay.remove();
        zeigeRecovery();
      },
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
  // S42 · Expliziter Abschluss der Qualitätszeit: bittet die Begleitung um den
  // Abschluss-Akt; das Modell erzeugt das Protokoll (MOMENT-BLOCK), die App
  // legt es in "Gemeinsame Momente" ab und schließt die Session wirklich.
  $("btnChatEnde").addEventListener("click", async () => {
    if (!state.engine || state.engine.chat.status !== "running") return;
    await warteAntwort(() => state.engine.submitToolResult(K().steuerTexte.momentAbschluss, { hidden: true }));
    aktualisiereChatEnde();
  });
  $("btnSolo").addEventListener("click", () => startChat("solo").catch(e => err(e.message)));
  $("btnEinzel").addEventListener("click", () => startChat("einzel").catch(e => err(e.message)));
  $("btnGemeinsam").addEventListener("click", () => startChat("gemeinsam").catch(e => err(e.message)));
  $("btnMoment").addEventListener("click", () => startChat("moment").catch(e => err(e.message)));
  $("btnZeitleiste").addEventListener("click", () => infoToggle("boxZeitleiste", () => zeigeZeitleiste()).catch(e => err(e.message)));
  $("btnMess").addEventListener("click", () => infoToggle("boxMess", () => zeigeMess()).catch(e => err(e.message)));
  $("btnRegal").addEventListener("click", () => infoToggle("boxRegal", () => zeigeRegal()).catch(e => err(e.message)));
  $("btnAgenda").addEventListener("click", () => infoToggle("boxAgenda", () => zeigeAgenda()).catch(e => err(e.message)));
  $("btnQz").addEventListener("click", () => infoToggle("boxQz", () => zeigeMomente()).catch(e => err(e.message)));
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
  /* S39 · Sprach-Helfer für den vereinbarten Rhythmus. */
  function zeitraumText(days) {
    if (days === 7) return t("mess.zrWoche");
    if (days % 7 === 0) return t("mess.zrWochen", { w: days / 7 });
    return t("mess.zrTage", { n: days });
  }
  function rhythmusText(days) {
    if (days === 7) return t("messiv.rhWoche");
    if (days % 7 === 0) return t("messiv.rhWochen", { w: days / 7 });
    return t("messiv.rhTage", { n: days });
  }

  async function zeigeMess() {
    const box = $("boxMess");
    zeigeNur("boxMess");
    box.classList.remove("pb-hidden");
    const [mr, goals, iv] = await Promise.all([
      backend.bstate.get("measurements"), backend.bstate.get("goals"), holeMessIntervall(backend),
    ]);
    const offen = ((mr && mr.items) || []).find(r => r.status === "open");
    if (offen && offen.values[state.info.role]) {
      box.innerHTML = `<div class="pb-sub">${t("mess.titel")}</div><p style="font-size:14px">${t("mess.abgegeben")}</p>`;
      return;
    }
    // S39 · Rhythmus-Fenster: eine NEUE Runde öffnet erst nach dem vereinbarten
    // Abstand; eine offene Runde des Partners bleibt immer beantwortbar.
    if (!offen) {
      const fenster = messFenster(mr, state.info.role, iv.days);
      if (!fenster.offen) {
        box.innerHTML = `<div class="pb-sub">${t("mess.titel")}</div>` +
          `<p style="font-size:14px">${t("mess.gesperrt", { rhythmus: rhythmusText(iv.days), datum: esc((fenster.naechsteAb || "").slice(0, 10)) })}</p>`;
        return;
      }
    }
    const zeitraum = zeitraumText(iv.days);
    const aktive = (((goals && goals.items) || [])).filter(a => a.status === "active" && a.art === "shared");
    box.innerHTML =
      `<div class="pb-sub">${t("mess.verdeckt", { partner: esc(state.info.partner) })}</div>` +
      `<label style="display:block;font-size:13px;margin:8px 0">${t("mess.closeness", { partner: esc(state.info.partner), zeitraum })}<br><input id="msNaehe" type="range" min="1" max="10" value="5" style="width:100%"></label>` +
      `<label style="display:block;font-size:13px;margin:8px 0">${t("mess.guess", { partner: esc(state.info.partner), zeitraum })}<br><input id="msZweit" type="range" min="1" max="10" value="5" style="width:100%"></label>` +
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
      await zeitleistenEintrag(t("zeitleiste.tpMess"), t("zeitleiste.eintragMess"));
      box.innerHTML = `<div class="pb-sub">${t("mess.titel")}</div><p style="font-size:14px">${t("mess.danke")}` +
        (runde.status === "ready" ? t("mess.bereit") : "") + `</p>`;
    });
  }

  /* S42 · Gemeinsame Momente: der geteilte Protokoll-Zeitstrahl. Hier liegen
     die Abschluss-Protokolle der Qualitätszeiten (und der Aufdeck-Runde) —
     chronologisch, nur lesbar, analog "Meine Zeitleiste". */
  async function zeigeMomente() {
    const box = $("boxQz");
    zeigeNur("boxQz");
    box.classList.remove("pb-hidden");
    const [momentLog, revealLog] = await Promise.all([
      backend.bstate.get("momentLog").catch(() => null),
      backend.bstate.get("revealLog").catch(() => null),
    ]);
    const eintraege = [];
    for (const e2 of ((momentLog && momentLog.entries) || []))
      eintraege.push({ at: e2.at || "", art: t("momente.artQz"), text: e2.summary || "",
        themen: (e2.topics || []).join(" · "), impuls: e2.gentleInvitation || null });
    if (revealLog && revealLog.at)
      eintraege.push({ at: revealLog.at, art: t("momente.artAufdeck"), text: revealLog.summary || t("momente.aufdeckStandard"), themen: "", impuls: null });
    eintraege.sort((a, b) => (a.at < b.at ? -1 : 1));
    box.innerHTML = `<div class="pb-sub">${t("momente.titel")}</div>` +
      `<p class="pb-sub" style="margin:6px 0 4px">${t("momente.intro")}</p>` +
      (eintraege.length ? eintraege.map(e2 =>
        `<div class="pb-item"><span class="pb-sub">${esc((e2.at || "").slice(0, 10))} · ${esc(e2.art)}${e2.themen ? " · " + esc(e2.themen) : ""}</span><br>${esc(e2.text)}` +
        (e2.impuls ? `<br><span class="pb-sub">${t("momente.impuls")} ${esc(e2.impuls)}</span>` : "") + `</div>`
      ).join("") : `<p style="font-size:14px">${t("momente.leer")}</p>`);
  }

  /* S42 · Abschluss-Knopf nur in einer LAUFENDEN Qualitätszeit anbieten. */
  function aktualisiereChatEnde() {
    const b = $("btnChatEnde");
    if (b) b.classList.toggle("pb-hidden",
      !(state.engine && state.engine.def && state.engine.def.id === "moment" && state.engine.chat.status === "running"));
  }

  /* S38 · Persönliche Zeitleiste fortschreiben (Auftragsklärung, Prozess-
     reflexion). Fehlertolerant — die Zeitleiste ist Chronik, kein Muss. */
  async function zeitleistenEintrag(topic, summary, details) {
    try {
      const zl = (await backend.pstate.get("timeline")) || { entries: [] };
      const eintrag = { topics: [topic], summary, at: new Date().toISOString() };
      if (details && details.length) eintrag.details = details;   // S44: aufklappbare Punkte
      zl.entries.push(eintrag);
      await backend.pstate.set("timeline", zl);
    } catch { /* Chronik ist Komfort, kein Muss */ }
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
      const b = doppel ? p.querySelector("#scB").value : null;
      const text = doppel
        ? fuelle(K().steuerTexte.scaleClosingErgebnis, { nameA: state.info.nameA, nameB: state.info.nameB, a, b })
        : fuelle(K().steuerTexte.scaleErgebnis, { id: art, wert: a });
      const echo = doppel
        ? t("echo.closing", { nameA: state.info.nameA, a, nameB: state.info.nameB, b })
        : (art === "safety" ? t("echo.safety", { n: a }) : "");
      kwZu();
      await warteAntwort(() => engine.submitToolResult(text, { hidden: true, echo }));   // Wire, nicht Chat (S35)
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
      let lw, lz;
      if (d.poles) {
        // Rotierende Formulierungs-Pools, damit die Reglerfragen nicht zur Formel
        // werden; der Pol-Rang (0,1,2,…) wählt die Variante deterministisch.
        const rang = K().DOMAINS.slice(0, i + 1).filter(x => x.poles).length - 1;
        lw = t("kw.istPool" + (rang % 3), {}) + " " + t("kw.poleLegende", { p0: d.poles[0], p1: d.poles[1] });
        lz = t("kw.idealPool" + (rang % 4), {});
      } else {
        [lw, lz] = [t("kw.wichtig"), t("kw.zufrieden")];
      }
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
        // Echo NUR als Anzahl — die Person hat keine Zahlen gesehen (Reglerpositionen).
        await warteAntwort(() => engine.submitToolResult(reglerErgebnis(vals, state.info.name), { slider: true, hidden: true, echo: t("echo.regler", { n: K().DOMAINS.length }) }));
      });
    }
    zeichne();
  }

  /* S38 · Prioritäten-Board: topN nummerierte Plätze; Pool-Chips lassen sich
     per Drag & Drop auf einen Platz ziehen (besetzt → ersetzen, das alte Item
     fällt in den Pool zurück), Platz-Items lassen sich per Drag & Drop
     umsortieren. Tipp-Fallback für Touch: Chip antippen → erster freier
     Platz (wie bisher); Platz-Item antippen → auswählen, zweiten Platz
     antippen → dorthin verschieben. ✕ entfernt. */
  function rankPanel(mode, engine) {
    const cfg = RANK_MODES[mode];
    const ITEMS = rankItems();
    const ctx = { me: state.info.name, partner: state.info.partner };
    const order = [];        // kompakte Platzliste (Index = Platz)
    let zieh = null;         // laufender Drag: {art:"pool",ri} | {art:"platz",pos}
    let gewaehlt = null;     // Tipp-Fallback: ausgewählter Platz (Index)
    const p = kw();
    p.classList.remove("pb-hidden");
    function setze(pos, ri) {                       // Pool → Platz (ersetzen/anhängen)
      const alt = order.indexOf(ri);
      if (alt >= 0) order.splice(alt, 1);
      if (pos >= order.length) { if (order.length < cfg.topN) order.push(ri); }
      else order[pos] = ri;                         // ersetztes Item fällt in den Pool zurück
    }
    function verschiebe(von, nach) {                // Platz → Platz (umsortieren)
      if (von === nach || von < 0 || von >= order.length) return;
      const [x] = order.splice(von, 1);
      order.splice(Math.min(nach, order.length), 0, x);
    }
    function zeichne() {
      const titel = typeof cfg.title === "function" ? cfg.title(ctx) : cfg.title;
      const desc = typeof cfg.desc === "function" ? cfg.desc(ctx) : cfg.desc;
      p.innerHTML =
        `<div class="pb-sub">${esc(titel)}</div><p style="font-size:13px">${esc(desc)}</p>` +
        `<div id="kwStack">` +
        Array.from({ length: cfg.topN }, (_, pos) => {
          const ri = order[pos];
          return ri === undefined
            ? `<div class="pb-item pb-platz leer" data-platz="${pos}">${pos + 1}. <span class="pb-sub">${t("rank.frei")}</span></div>`
            : `<div class="pb-item pb-platz${gewaehlt === pos ? " gewaehlt" : ""}" data-platz="${pos}" draggable="true">${pos + 1}. ${esc(ITEMS[ri].label)} <button class="pb-btn" data-raus="${ri}" style="padding:2px 8px;float:right">✕</button></div>`;
        }).join("") + `</div><div id="kwPool" style="margin:8px 0">` +
        ITEMS.map((it, ri) => order.includes(ri) ? "" :
          `<button class="pb-btn" data-rein="${ri}" draggable="true">${esc(it.label)}</button>`
        ).join("") + `</div>` +
        `<button class="pb-btn primary" id="kwRankOk"${order.length === cfg.topN ? "" : " disabled"}>${t("allg.fertig")}</button>`;
      for (const b of p.querySelectorAll("[data-rein]")) {
        const ri = +b.getAttribute("data-rein");
        b.addEventListener("click", () => {          // Tipp: erster freier Platz
          if (order.length >= cfg.topN) return;
          order.push(ri); gewaehlt = null; zeichne();
        });
        b.addEventListener("dragstart", () => { zieh = { art: "pool", ri }; });
        b.addEventListener("dragend", () => { zieh = null; });
      }
      for (const pl of p.querySelectorAll("[data-platz]")) {
        const pos = +pl.getAttribute("data-platz");
        pl.addEventListener("dragstart", () => { if (order[pos] !== undefined) zieh = { art: "platz", pos }; });
        pl.addEventListener("dragend", () => { zieh = null; });
        pl.addEventListener("dragover", ev => ev.preventDefault());
        pl.addEventListener("drop", ev => {
          ev.preventDefault();
          if (!zieh) return;
          if (zieh.art === "pool") setze(pos, zieh.ri);
          else verschiebe(zieh.pos, pos);
          zieh = null; gewaehlt = null; zeichne();
        });
        pl.addEventListener("click", ev => {         // Tipp-Fallback (Touch)
          if (ev.target.hasAttribute && ev.target.hasAttribute("data-raus")) return;
          if (gewaehlt === null) { if (order[pos] !== undefined) { gewaehlt = pos; zeichne(); } return; }
          if (gewaehlt === pos) { gewaehlt = null; zeichne(); return; }
          verschiebe(gewaehlt, pos);
          gewaehlt = null; zeichne();
        });
      }
      for (const b of p.querySelectorAll("[data-raus]"))
        b.addEventListener("click", () => { order.splice(order.indexOf(+b.getAttribute("data-raus")), 1); gewaehlt = null; zeichne(); });
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
        await warteAntwort(() => engine.submitToolResult(rankingErgebnis(mode, order, ctx), { ranking: mode, hidden: true, echo: mode === "self" ? t("echo.rankingSelf") : t("echo.rankingGuess") }));
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
        await warteAntwort(() => engine.submitToolResult(startwerteErgebnis(namen[0], werte[0], namen[1], werte[1]), { baseline: true, hidden: true, echo: t("echo.baseline") }));
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
        engine.chat.freigegeben = true;   // S38: Abschluss-Bewusstsein über den Session-Zustand
        // S44 · D4b: nach der Freigabe bleibt die Session offen (NACHKLANG) —
        // der Composer lebt weiter für Korrekturen/Spezifizierungen/Nachfragen.
        // Der Abschluss-Status steckt in "freigegeben" (nicht mehr in status="released").
        engine.chat.status = "running";
        engine.chat.nachklang = true;
        await zeitleistenEintrag(t("zeitleiste.tpAuftrag"), t("zeitleiste.eintragAuftrag", { n: items.length, gesamt: data.items.length }), items);
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
    if (backend.recovery && state.info.emailRequired && !state.info.recoveryEmail) zeigeEmailPflicht();
  }

  return { boot, show, startChat, _state: state, _err: err };
}
