// UI-Schicht — dünner DOM-Layer über Engine und Backend-Fassade.
// document wird injiziert (happy-dom-testbar); kein Storage-, kein Key-Wissen.

import { Engine } from "../engine/engine.js";
import { cleanDisplay, findeBlock } from "../contracts/block.js";
import { offeneKlammerAbIndex, WIRE_KOEPFE, istWireNachricht } from "../contracts/steuertoken.js";
import { findeMarker } from "../contracts/marker.js";
import { ALLE_BLOECKE } from "../contracts/registry.js";
import { soloDef, momentDef, quereGate, baueMomentKontext, baueSoloKontext, markiereGelesen, hebeInAgenda, raeumeAgendaAb, merkeVor, nimmFreigabeZurueckAb } from "./sessions.js";
import { redigiereRegalFuerRolle, redigiereAgendaFuerRolle, WEGE_FUER, inKarenz } from "../engine/regal.js";
import { paareAusVerlauf, baueAusschnitt, paarWaehlbar, paarGrund, waehleUm,
  fuelleSpanne, ueberRichtwert, hatStilleLuecken } from "../engine/ausschnitt.js";
import { einzelDef, gemeinsamDef, rankItems, RANK_MODES, reglerErgebnis, rankingErgebnis, startwerteErgebnis, beruehrungen, baueAufdeckung, baueAufdeckKontext, baueKlaerungsKontext } from "./kernwetten.js";
import { K, setKorpusSprache, stelleKorpusBereit } from "../prompts/prompts.js";
import { holeMessIntervall, schlageMessIntervallVor, antworteMessIntervall, messFenster,
  trageMessbeitragEin, bereiteRunde, formatiereMessrunde, markiereAufgedeckt , formatiereVerlauf, pruefeLeserichtung, formatiereLeseMarker } from "./prozess.js";
import { applyDesign, setzeAnsicht, gemerkteAnsicht, merkeAnsicht, verdrahteWegweiser } from "./design.js";
import { kulisseAnzahl, baueKulisse } from "./kulisse.js";
import { t, fuelle, getLocale, setLocale, fehlerText } from "../i18n/index.js";
import { esc, mdRender, IKON, lesezeichenLabels } from "./html.js";   // R3/R4a
import { schneideStreamText } from "./stream-anzeige.js";   // R4a
import { zeitraumText, rhythmusText } from "./zeit-texte.js";   // R4a
import { macheRecoveryScreen } from "./recovery-screen.js";   // R4b
import { macheEinstellungenScreen } from "./einstellungen-screen.js";   // R4b
import { macheAnsichtenScreen } from "./ansichten-screen.js";   // R4b
import { macheAuswahlScreen } from "./auswahl-screen.js";   // R4b
import { machePanels } from "./panels.js";   // R4b
import { macheChatKern } from "./chat-kern.js";   // R4b
import { legeVerlaufAb, verlaufEinstellung, holeVerlauf } from "./verlauf-ablage.js";   // S95.7a/8b
import { zeichneReplay } from "./replay-ansicht.js";   // S95.7e


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


/* S41 · Anzeige-Wächter: Ergebnis-Nachrichten der Panels sind Wire — seit
   S35/S37 gehen sie hidden über den Draht, aber Sessions aus der Zeit davor
   tragen das Flag nicht. Diese Köpfe werden deshalb IMMER unterdrückt.
   S95.1: Die Liste lebt jetzt in contracts/steuertoken.js (zweiter Verbraucher:
   die Ausschnitt-Auswahlmenge); hier bleibt der Re-Export für Bestandscode. */
export { WIRE_KOEPFE };

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
  // S87 · chatGen: Generationsmarke der Chat-Oberfläche — jeder Abbau und
  // jeder Sessionstart erhöht sie; UI-Hooks alter Sessions prüfen sie und
  // kehren wortlos um (Nachzügler-Zaun). entwuerfe: ungesendete Composer-
  // Texte je Session, REINER Arbeitsspeicher (K3 b) — nie persistiert,
  // stirbt mit der App-Instanz (relaunch/Paarwechsel ⇒ neue Closure).
  const state = { info: null, engine: null, chatId: null, screen: null, streamText: null, chatGen: 0, entwuerfe: {} };

  const wurzel = root || doc.getElementById("app");
  wurzel.classList.add("rz-app");
  wurzel.innerHTML = `
    <div id="pbBusy" class="pb-busy pb-hidden"><span class="pb-busydots"><span></span><span></span><span></span></span><span id="pbBusyTxt"></span></div>
    <div id="pbErr" class="pb-err pb-hidden"></div>
    <div id="pbHint" class="pb-card pb-hidden rz-hinweis-blatt"></div>
    <div id="scrStart" class="rz-screen rz-split">
      <div class="rz-half rz-papier">
        <div class="rz-kopf rz-kopf-mitte">
          <span class="rz-zurueck rz-blind">←</span>
          <span class="rz-signatur" data-rz-signatur></span>
          <span class="rz-zurueck rz-blind">←</span>
        </div>
        <h1 class="rz-h1" id="startHallo"></h1>
        <p class="rz-sub pb-hidden" id="startIntro"></p>
        <p class="rz-sub pb-hidden" id="startMeinSub"></p>
        <p class="rz-sub pb-hidden" id="startTeilSub"></p>
        <h1 class="pb-h1 pb-hidden" id="pbHallo"></h1>
        <div class="rz-fuss">
          <div class="rz-caps rz-caps-ueber">${t("start.capsMein")}</div>
          <button class="rz-zeile" id="btnMyRoom"><span>${t("start.betreteMein")}</span><span class="rz-pfeil">↑</span></button>
        </div>
      </div>
      <div class="rz-half rz-tiefgruen rz-naht-anker">
        <div class="rz-kulisse-naht" id="kulisseStart"></div>
        <button class="rz-weg-badge rz-auf-naht" id="wegBadgeStart">${IKON.wegweiser}<span>${t("weg.badge")}</span><span class="rz-punkt"></span></button>
        <div class="rz-weg-panel pb-hidden" id="wegStart"></div>
        <button class="rz-zeile rz-unten" id="btnSharedRoom"><span>${t("start.betreteTeil")}</span><span class="rz-lz-leiste" id="lzStart"></span><span class="rz-pfeil">↓</span></button>
        <div class="rz-fuss">
          <h2 class="rz-h2">${t("start.teilTitel")}</h2>
          <div class="rz-caps">${t("start.capsTeil")}</div>
        </div>
        <span class="rz-fussmarke" id="pbKern" data-rz-marke></span>
      </div>
    </div>
    <div id="scrMyRoom" class="rz-screen rz-split pb-hidden">
      <div class="rz-half rz-papier">
        <div class="rz-kopf rz-kopf-mitte">
          <button class="rz-zurueck" id="btnZurueck1" aria-label="${t("allg.zurueck")}">←</button>
          <span class="rz-signatur" data-rz-signatur></span>
          <span class="rz-zurueck rz-blind">←</span>
        </div>
        <h1 class="rz-h1">${t("zone.raum")}</h1>
        <p class="rz-sub rz-intro" id="meinIntro"></p>
        <p class="rz-sub rz-still-aus" id="einzelSubP">${t("mein.einzelSub")}</p>
        <p class="rz-sub rz-still-aus" id="messSubP">${t("mein.messSub")}</p>
        <div class="rz-fuss">
          <button class="rz-zeile" id="btnSolo"><span>${t("mein.solo")}</span><span class="rz-pfeil">↑</span></button>
          <button class="rz-zeile rz-spalte" id="btnEinzel"><span class="rz-zeile-haupt"><span id="einzelLabel">${t("mein.einzel")}</span><span class="rz-pfeil">↑</span></span><span class="rz-balken pb-hidden" id="einzelBalken"><i></i></span></button>
          <button class="rz-zeile pb-hidden" id="btnMess"><span>${t("mein.mess")}</span><span class="rz-pfeil">↑</span></button>
        </div>
      </div>
      <div class="rz-half rz-tiefgruen rz-naht-anker">
        <button class="rz-weg-badge rz-auf-naht" id="wegBadgeMein">${IKON.wegweiser}<span>${t("weg.badgeMein")}</span><span class="rz-punkt"></span></button>
        <div class="rz-weg-panel pb-hidden" id="wegMein"></div>
        <div class="rz-regal-reihen">
          <button class="rz-zeile rz-unten" id="btnZeitleiste" data-box="boxZeitleiste"><span>${t("mein.zeitleiste")}</span><span class="rz-pfeil">↓</span></button>
          <div class="rz-regal-inhalt pb-hidden" id="boxZeitleiste"><div class="rz-caps">${t("zeitleiste.titel")}</div><div id="zlItems"></div></div>
          <button class="rz-zeile rz-unten pb-hidden" id="btnRecovery" data-box="boxRecovery"><span>${t("rec.titel")}</span><span class="rz-pfeil">↓</span></button>
          <div class="rz-regal-inhalt pb-hidden" id="boxRecovery"></div>
          <!-- S95.7e · Leseansicht eines abgeschlossenen Gespraechs. Eigene
               Flaeche, keine Eingabe, kein Panel — lesen aendert nichts. -->
          <div class="rz-regal-inhalt pb-hidden" id="boxLesen">
            <div class="rz-caps" id="lesenKopf"></div>
            <div id="lesenInhalt"></div>
            <button class="pb-btn rz-oben-2" id="lesenZu">${t("verlauf.leseZu")}</button>
          </div>
        </div>
        <div class="rz-fuss">
          <h2 class="rz-h2">${t("mein.gruppeRegale")}</h2>
        </div>
        <div class="rz-kulisse-fuss" id="kulisseMein"></div>
        <span class="rz-fussmarke" data-rz-marke></span>
      </div>
    </div>
    <div id="scrShared" class="rz-screen rz-split pb-hidden">
      <div class="rz-half rz-papier">
        <div class="rz-kopf rz-kopf-mitte">
          <button class="rz-zurueck" id="btnZurueck2" aria-label="${t("allg.zurueck")}">←</button>
          <span class="rz-signatur" data-rz-signatur></span>
          <span class="rz-zurueck rz-blind">←</span>
        </div>
        <h1 class="rz-h1">${t("zone.raum")}</h1>
        <p class="rz-sub rz-intro" id="sharedIntro">${t("teil.intro")}</p>
        <div class="rz-fuss">
          <button class="rz-zeile" id="btnMoment"><span id="momentLabel">${t("teil.moment")}</span><span class="rz-pfeil">↑</span></button>
          <button class="rz-zeile rz-spalte" id="btnGemeinsam"><span class="rz-zeile-haupt"><span id="gemeinsamLabel">${t("teil.gemeinsam")}</span><span class="rz-zustand pb-hidden" id="gemeinsamHinweis"></span><span class="rz-pfeil">↑</span></span></button>
          <p class="rz-sub" id="gemeinsamSub">${t("teil.gemeinsamSub")}</p>
        </div>
      </div>
      <div class="rz-half rz-tiefgruen rz-naht-anker">
        <button class="rz-weg-badge rz-auf-naht" id="wegBadgeTeil">${IKON.wegweiser}<span>${t("weg.badgeTeil")}</span><span class="rz-punkt"></span></button>
        <div class="rz-weg-panel pb-hidden" id="wegTeil"></div>
        <div class="rz-regal-reihen">
          <button class="rz-zeile rz-unten" id="btnRegal" data-box="boxRegal"><span>${t("teil.regal")}</span><span class="rz-lz-leiste pb-hidden" id="lzRegal"></span><span class="rz-pfeil">↓</span></button>
          <div class="rz-regal-inhalt pb-hidden" id="boxRegal"><p class="rz-sub rz-eng" id="regalTitel"></p><div id="regalItems"></div><p class="rz-sub rz-regal-fussnote" id="regalIntro"></p></div>
          <button class="rz-zeile rz-unten" id="btnAgenda" data-box="boxAgenda"><span>${t("teil.agenda")}</span><span class="rz-pfeil">↓</span></button>
          <div class="rz-regal-inhalt pb-hidden" id="boxAgenda"><div class="rz-caps">${t("agenda.titel")}</div><div id="agendaItems"></div></div>
          <button class="rz-zeile rz-unten" id="btnQz" data-box="boxQz"><span>${t("teil.qz")}</span><span class="rz-pfeil">↓</span></button>
          <div class="rz-regal-inhalt pb-hidden" id="boxQz"></div>
        </div>
        <div class="rz-fuss">
          <h2 class="rz-h2">${t("teil.gruppeRegale")}</h2>
        </div>
        <div class="rz-kulisse-fuss" id="kulisseTeil"></div>
        <span class="rz-fussmarke" data-rz-marke></span>
      </div>
    </div>
    <div id="scrProzess" class="rz-screen rz-eine-zone pb-hidden">
      <div class="rz-half rz-papier">
        <div class="rz-kopf rz-kopf-mitte">
          <button class="rz-zurueck" id="btnZurueck3" aria-label="${t("allg.zurueck")}">←</button>
          <span class="rz-signatur" data-rz-signatur></span>
          <span class="rz-zurueck rz-blind">←</span>
        </div>
        <h1 class="rz-h1">${t("prozess.titel")}</h1>
        <p class="rz-sub rz-intro">${t("prozess.intro")}</p>
        <div id="boxMess"></div>
        <span class="rz-fussmarke" data-rz-marke></span>
      </div>
    </div>
    <div id="scrChat" class="pb-hidden"></div>`;

  /* S87 · Raumtrennung: Die Chat-Oberfläche ist eine VORLAGE, kein stehendes
     DOM. scrChat ist EIN Screen für alle Sessions — Panels, Entwurf,
     Nachrichten und Titel überlebten bisher den Raumwechsel (sichtbar im
     fremden Raum und wirksam: Panel-Handler hielten die ALTE Engine). Jetzt
     wird die Fläche beim Betreten aus dieser Vorlage gebaut und beim
     Verlassen restlos abgebaut. Funktion statt Konstante: t() liest erst beim
     Bauen — ein Sprachwechsel greift so auch auf einer bereits einmal
     gebauten Oberfläche. */
  const CHAT_HTML = () => `
      <div class="rz-chat-innen">
        <div class="rz-chat-oben rz-papier">
          <div class="rz-kopf rz-kopf-mitte">
            <button class="rz-zurueck" id="btnChatZurueck" title="${t("chat.raumVerlassen")}" aria-label="${t("chat.raumVerlassen")}">←</button>
            <span class="rz-signatur" data-rz-signatur></span>
            <span class="rz-zurueck rz-blind">←</span>
          </div>
          <div class="rz-sessionname" id="chatTitel"></div>
          <div class="pb-msgs" id="pbMsgs"></div>
          <div id="gatePanel" class="rz-panel pb-hidden"></div>
          <div id="ausschnittPanel" class="rz-panel pb-hidden"></div>
          <div id="kwPanel" class="rz-panel pb-hidden"></div>
        </div>
        <div class="rz-chat-unten rz-naht-anker rz-tiefgruen">
          <div class="rz-kulisse-naht" id="kulisseChat"></div>
          <button type="button" class="rz-weg-badge rz-auf-naht" id="chatOrt" aria-haspopup="dialog">${IKON.wegweiser}<span id="chatOrtName"></span></button>
          <div class="rz-weg-panel pb-hidden" id="wegChat"></div>
          <!-- U3c/§1.1 · Die Leiste der Freigabe-Auswahl ist die untere Zone,
               keine klebende Leiste auf Papier. Sie steht deshalb HIER, in der
               Schreibkante, und tritt waehrend der Auswahl an die Stelle des
               Composers. Gefuellt wird sie vom Auswahl-Modul. -->
          <div class="rz-ausw-leiste pb-hidden" id="auswLeiste"></div>
          <div class="pb-skala" id="pbSkala">
            <span class="rz-fein">${t("chat.deineZahl")}</span>
            <input type="range" id="pbSkalaRange" min="1" max="10" step="1" value="7">
            <span class="value" id="pbSkalaWert">7</span>
            <button class="pb-btn primary rz-nowrap" id="pbSkalaSend">${t("chat.senden")}</button>
          </div>
          <div class="pb-composer" id="pbComposer">
            <textarea id="pbInput" placeholder="${t("chat.platzhalter")}"></textarea>
            <button class="pb-btn pb-ikon" id="btnMic" data-icon="mic" title="${t("chat.diktieren")}" aria-label="${t("chat.diktieren")}">${IKON.mic}</button>
            <button class="pb-btn primary pb-ikon" id="btnSend" data-icon="send" title="${t("chat.senden")}" aria-label="${t("chat.senden")}">${IKON.send}</button>
          </div>
          <button class="rz-zeile rz-knopf-flach pb-hidden" id="btnChatEnde"><span>${t("chat.abschliessen")}</span><span class="rz-pfeil">←</span></button>
          <button class="rz-zeile rz-knopf-flach pb-hidden" id="btnRaumVerlassen"><span>${t("chat.raumVerlassenKnopf")}</span><span class="rz-pfeil">←</span></button>
          <span class="rz-fussmarke" data-rz-marke></span>
        </div>
      </div>`;

  /* D12-2 · Kopf-Signatur und Fussmarke (Design Turn 27, §1/§3). Beide sitzen
     in JEDEM Screen-Rahmen, auch in der Chat-Vorlage, die bei jedem Betreten
     neu gebaut wird — deshalb werden sie ueber Attribute gesucht statt ueber
     Ids und nach jedem Aufbau erneut gesetzt. Ohne geladene Lage bleibt die
     Signatur leer: ein Platzhalter wuerde beim Nachladen sichtbar springen. */
  function setzeSignatur() {
    const i = state.info;
    const text = i ? t("allg.signatur", { ich: i.name, partner: i.partner }) : "";
    for (const e of wurzel.querySelectorAll("[data-rz-signatur]")) e.textContent = text;
  }
  function setzeMarke() {
    for (const e of wurzel.querySelectorAll("[data-rz-marke]")) e.textContent = t("allg.marke");
  }

  const $ = id => wurzel.querySelector("#" + id);
  const screens = ["scrStart", "scrMyRoom", "scrShared", "scrProzess", "scrChat"];
  function show(id) {
    if (id !== "scrChat") raeumeChatOberflaeche();   // S87: die Fläche gehört zur Session, nicht zum Screen
    state.screen = id;
    for (const s of screens) $(s).classList.toggle("pb-hidden", s !== id);
  }

  /* S87 · Abbau der Chat-Oberfläche — Reihenfolge ist wesentlich. Ein legitim
     wartendes Panel geht dabei nicht verloren: resume() dispatcht den letzten
     Assistant-Zug beim Wiederbetreten erneut. Idempotent (leere Hülle ⇒
     folgenlos), damit der Aufbau ihn konstruktiv voranstellen kann (G1). */
  function raeumeChatOberflaeche() {
    diktatStopp();   // zuerst, solange btnMic noch existiert; nullt die Handler (G2)
    const e = state.engine;
    if (e && e.chat && e.chat.status === "running") {
      // G4 · Die Pausen-Semantik (S71-Fünf-Minuten-Regel) gehört dem Abbau,
      // nicht allein dem Zurück-Knopf: pausedAt synchron stempeln, Speichern
      // fire-and-forget — bevor die Engine-Referenz geht. pausiereChat() in
      // btnChatZurueck bleibt und ist damit harmlos redundant.
      e.chat.pausedAt = Date.now();
      const shared = state.chatShared, id = state.chatId;
      Promise.resolve()
        .then(() => backend.chat.save(shared ? "shared" : "mine", id, e.chat))
        .catch(() => { /* Verlassen darf am Speichern nicht scheitern */ });
    }
    const eingabe = $("pbInput");
    if (state.chatId && eingabe)                       // G3-Guard: raeume läuft bei JEDER
      state.entwuerfe[state.chatId] = eingabe.value;   // Nicht-Chat-Navigation, auch ohne Session
    const huelle = $("scrChat");
    if (huelle) huelle.innerHTML = "";
    err(""); hint(null);
    state.engine = null; state.chatId = null; state.chatShared = null;
    state.streamText = null; state.herkunft = null;
    setzeWarten(false);
    state.chatGen++;   // Nachzügler-Zaun: alles, was zur alten Session gehört, kehrt fortan wortlos um
  }

  /* S87 · Aufbau aus der Vorlage. Beginnt SELBST mit dem Abbau (G1): auch ein
     direkter Chat→Chat-Übergang — heute existiert keiner, aber die Invariante
     soll Konstruktion sein, nicht Topologie-Zufall — sichert erst Entwurf,
     Diktat und Pausenstempel der alten Session. */
  function baueChatOberflaeche() {
    raeumeChatOberflaeche();
    $("scrChat").innerHTML = CHAT_HTML();
    setzeSignatur(); setzeMarke();   // D12-2: die Vorlage bringt leere Huellen mit
    verdrahteChat();
  }

  /* S87 · Die sieben Bedienelemente der Chat-Oberfläche werden bei jedem
     Aufbau neu gebunden — die Listener hängen an Knoten, die beim Abbau
     verschwinden; eine stehengebliebene Closure hat danach kein Ziel mehr. */
  function verdrahteChat() {
    // T2i · Der Wegweiser im Chat wird HIER verdrahtet, nicht einmalig beim
    // App-Start wie die drei Vorraum-Badges: seit S87 ist scrChat eine
    // Vorlage, deren DOM bei jedem Betreten neu entsteht. Eine Verdrahtung
    // aus der Boot-Phase hinge nach dem ersten Abbau an einem Knoten, den es
    // nicht mehr gibt.
    verdrahteWegweiser(doc, $("chatOrt"), $("wegChat"));
    $("btnChatZurueck").addEventListener("click", async () => {
      await pausiereChat();
      betrete(state.herkunft || "scrStart");
    });
    // S93 · Ausgang aus der ABGESCHLOSSENEN Session. Der Composer verschwindet
    // dort (nichts Eintippbares darf ins Nirwana laufen) — bis S93 blieb aber
    // NICHTS an seiner Stelle stehen: nur der kleine Pfeil im Kopf, weit weg
    // vom Blick, der gerade am Sitzungsende hing. Derselbe Pfad wie der Pfeil.
    $("btnRaumVerlassen").addEventListener("click", async () => {
      await pausiereChat();
      betrete(state.herkunft || "scrStart");
    });
    // S42 · Expliziter Abschluss der Qualitätszeit: bittet die Begleitung um den
    // Abschluss-Akt; das Modell erzeugt das Protokoll (MOMENT-BLOCK), die App
    // legt es in "Gemeinsame Momente" ab und schließt die Session wirklich.
    $("btnChatEnde").addEventListener("click", async () => {
      if (!state.engine || state.engine.chat.status !== "running") return;
      const text = state.engine.def.id === "solo" ? K().steuerTexte.soloAbschluss : K().steuerTexte.momentAbschluss;
      await warteAntwort(() => state.engine.submitToolResult(text, { hidden: true }));
      aktualisiereChatEnde();
      aktualisiereComposer();
    });
    $("btnSend").addEventListener("click", () => {
      const t2 = $("pbInput").value.trim();
      if (!t2) return;
      $("pbInput").value = "";
      sende(t2);
    });
    $("pbInput").addEventListener("keydown", e2 => {
      if (e2.key === "Enter" && !e2.shiftKey) {       // Enter sendet; Shift+Enter = Zeilenumbruch
        e2.preventDefault();
        $("btnSend").click();
      }
    });
    $("pbSkalaRange").addEventListener("input", () => { $("pbSkalaWert").textContent = $("pbSkalaRange").value; });
    $("pbSkalaSend").addEventListener("click", () => sende($("pbSkalaRange").value));
    $("btnMic").addEventListener("click", () => { rec ? diktatStopp() : diktatStart(); });
  }

  /* S35 · Ein Info-Bereich pro Vorraum: die Regal-Ansichten verdrängen
     einander, statt sich zu stapeln. zeigeNur blendet die Geschwister aus;
     die zeige*-Funktionen rufen es vor dem Befüllen auf. */
  const INFO_GRUPPEN = {
    scrMyRoom: ["boxZeitleiste"],   // S88: boxMess lebt jetzt im eigenen Raum scrProzess
    scrShared: ["boxRegal", "boxAgenda", "boxQz"],
  };
  function zeigeNur(id) {
    for (const g of Object.values(INFO_GRUPPEN))
      if (g.includes(id)) for (const b of g) if (b !== id) $(b).classList.add("pb-hidden");
  }
  /* D9 · Regal-Vollbild.
     U5/§1.3 · Der Wiedereinstieg war bis dahin ausgenommen — er stand ohne
     eigene Zeile von selbst offen da und haette den Raum sonst dauerhaft ins
     Vollbild gezwungen. Jetzt hat er eine Zeile wie die anderen und klappt
     nur auf, wenn jemand ihn oeffnet; die Ausnahme faellt damit weg. */
  const REGAL_OFFEN = ".rz-regal-inhalt:not(.pb-hidden)";

  /** Fährt die Regal-Zone hoch bis unter den Kopf ("Raum für uns") und
   *  wieder herunter. Der obere Teil bleibt dabei EXAKT stehen: beide Zonen
   *  werden im offenen Zustand auf ihre gemessenen Maße festgesetzt, statt
   *  dass das Flex-Layout sie neu verteilt.
   *  Die Bewegung selbst läuft als FLIP — Lage messen, Zustand setzen, neu
   *  messen, die Differenz als Transform vorgeben, im übernächsten Bild
   *  loslassen. Reine Transform-Bewegung. Ohne Layout (Testumgebung) ist die
   *  Differenz 0 → nur der Zustand wechselt. */
  function regalModus(box) {
    const screen = box.closest && box.closest(".rz-screen");
    if (!screen) return;
    const zone = box.closest(".rz-half");
    const offen = !!screen.querySelector(REGAL_OFFEN);

    // D12-2b · Die offene Zeile IST die Sektionsüberschrift und trägt den Weg
    // nach oben; die geschlossenen zeigen weiter nach unten. Der Pfeil wird
    // gesetzt, nicht versteckt — sonst stünde der Rückweg nirgends.
    for (const z of screen.querySelectorAll("[data-box]")) {
      const ziel = $(z.getAttribute("data-box"));
      const auf = !!ziel && !ziel.classList.contains("pb-hidden");
      z.classList.toggle("rz-auf", auf);
      const pfeil = z.querySelector(".rz-pfeil");
      if (pfeil) pfeil.textContent = auf ? "\u2191" : "\u2193";
    }

    const misst = zone && typeof zone.getBoundingClientRect === "function";
    if (!misst) { screen.classList.toggle("rz-regal-offen", offen); return; }

    // Maße einfrieren: Kopfhöhe = Obergrenze der Zone, Höhe der oberen
    // Zone = ihr Ist-Maß. So verschiebt sich oben kein Pixel.
    if (offen) {
      const oben = screen.querySelector(".rz-half");
      const kopf = oben && oben.querySelector(".rz-kopf");
      const rahmen = screen.getBoundingClientRect();
      if (kopf) screen.style.setProperty("--rz-regal-top", Math.round(kopf.getBoundingClientRect().bottom - rahmen.top) + "px");
      if (oben) screen.style.setProperty("--rz-oben-h", Math.round(oben.getBoundingClientRect().height) + "px");
    }

    const vorher = zone.getBoundingClientRect().top;
    screen.classList.toggle("rz-regal-offen", offen);
    const delta = vorher - zone.getBoundingClientRect().top;
    const fenster = screen.ownerDocument && screen.ownerDocument.defaultView;
    const aufraeumen = () => { if (!offen) { screen.style.removeProperty("--rz-regal-top"); screen.style.removeProperty("--rz-oben-h"); } };
    if (!delta) { aufraeumen(); return; }
    zone.style.transition = "none";
    zone.style.transform = "translateY(" + delta + "px)";
    const los = () => { zone.style.transition = ""; zone.style.transform = ""; aufraeumen(); };
    if (fenster && fenster.requestAnimationFrame) fenster.requestAnimationFrame(() => fenster.requestAnimationFrame(los));
    else los();
  }

  /** Schließt den offenen Regal-Kasten eines Raums (Zu-Pfeil, Klick oben). */
  function regalZu(screen) {
    if (!screen || !screen.classList.contains("rz-regal-offen")) return;
    const offen = screen.querySelector(REGAL_OFFEN);
    if (!offen) return;
    offen.classList.add("pb-hidden");
    regalModus(offen);
  }

  /** Knopf-Verhalten: sichtbare Box erneut angefragt → zuklappen (Toggle).
   *  D9: es ist immer nur EINE Box offen — zwei gleichzeitig hieße wieder
   *  springende Höhen. Danach folgt der Vollbild-Zustand. */
  function infoToggle(id, oeffnen) {
    const box = $(id);
    if (!box.classList.contains("pb-hidden")) {
      box.classList.add("pb-hidden");
      regalModus(box);
      return Promise.resolve();
    }
    const zone = box.closest && box.closest(".rz-half");
    // U5/§1.3 · boxRecovery war hier ausgenommen, weil er ohne eigene Zeile
    // dauerhaft offen stand. Jetzt gilt fuer ihn dieselbe Regel: immer nur
    // EINE Box offen, sonst springen die Hoehen.
    if (zone) for (const g of zone.querySelectorAll(".rz-regal-inhalt")) if (g !== box) g.classList.add("pb-hidden");
    return Promise.resolve().then(oeffnen).then(r => { regalModus(box); return r; });
  }

  /* S35 · Lagebild für Wegweiser und Gating — ein paralleler Rundflug über
     den geteilten und persönlichen Zustand. Fehlertolerant: was nicht
     erreichbar ist, zählt als "nicht vorhanden". */
  async function ladeLage() {
    // Selbstheilung (S67, Selbstfahrt-Fund): Das Screen-Gerüst ist klickbar,
    // BEVOR boot() state.info gesetzt hat — ein schneller Raumwechsel traf
    // dann state.info.name/role als null (Fehlerbox statt Wegweiser).
    if (!state.info) state.info = await backend.info();
    const still = p => Promise.resolve().then(p).catch(() => null);
    const [reveal, revealLog, shelf, agenda, measurements, timeline, hA, hB, einzelChat, momentChat, findings, gemeinsamChat] = await Promise.all([
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
      still(() => backend.chat.load("shared", "gemeinsam")),
    ]);
    const rolle = state.info.role;
    const offeneRunde = (((measurements && measurements.items) || [])).find(r => r.status === "open");
    // S59 · D1: Das eigene Handover im geteilten Speicher IST der Beleg der
    // abgeschlossenen Auftragsklärung — es schlägt den lokalen Chat. Fehlt
    // dem Chat das Flag (inkonsistente Seeds, zurückgesetzter Chat), wird es
    // nachgetragen (Selbstheilung), damit alle Pfade dieselbe Wahrheit sehen.
    const handMeins = !!(rolle === "A" ? hA : hB);
    const einzelFrei = !!(einzelChat && einzelChat.freigegeben) || handMeins;
    if (handMeins && einzelChat && !einzelChat.freigegeben) {
      einzelChat.freigegeben = true; einzelChat.nachklang = true;
      Promise.resolve().then(() => backend.chat.save("mine", "einzel", einzelChat)).catch(() => { /* heilt beim nächsten Mal */ });
    }
    return {
      aufdeckBereit: !!(reveal && reveal.A && reveal.B && !revealLog),
      aufdeckGelaufen: !!revealLog,
      aufloesungGelaufen: !!findings,
      // S63 · Pausiert-Zustand der Gemeinsamen Auflösung: begonnen (Nachrichten
      // liegen), läuft noch, kein Befund — der Vorraum sagt dann "fortsetzen".
      aufloesungOffen: !!(gemeinsamChat && gemeinsamChat.status === "running" && (gemeinsamChat.messages || []).length && !findings),
      handMeins,
      handPartner: !!(rolle === "A" ? hB : hA),
      handBeide: !!(hA && hB),
      regalNeu: (((shelf && shelf.items) || [])).filter(i => i.by !== state.info.name && !i.read).length,
      // Je Partner ungelesen (Empfänger = die jeweils ANDERE Person): für zwei Badges.
      regalNeuA: (((shelf && shelf.items) || [])).filter(i => i.by !== state.info.nameA && !i.read).length,
      regalNeuB: (((shelf && shelf.items) || [])).filter(i => i.by !== state.info.nameB && !i.read).length,
      agendaOffen: (((agenda && agenda.items) || [])).filter(i => i.state === "open").length,
      // D6 · Meilenstein "Ziele definiert" (erstes Blatt der Kulisse)
      zieleDefiniert: (((agenda && agenda.items) || [])).some(i => i.zielKandidat),
      messBereit: (((measurements && measurements.items) || [])).some(r => r.status === "ready"),
      messOffen: !!(offeneRunde && !offeneRunde.values[rolle]),
      // "pausiert bei Kapitel N" nur solange die Auftragsklärung wirklich läuft
      // und NICHT als frei gilt (S44/S59: nach Abschluss kein Pause-Hinweis mehr;
      // Pause-Zeile und Auflösungs-Zeile schließen sich damit aus).
      einzelKapitel: (einzelChat && einzelChat.status === "running" && !einzelFrei && einzelChat.kapitel) || 0,
      einzelBegonnen: !!(einzelChat && (einzelChat.messages || []).length) || einzelFrei,
      einzelFertig: einzelFrei,
      momentOffen: !!(momentChat && momentChat.status === "running" && (momentChat.messages || []).length),
      zeitleisteLeer: !((timeline && timeline.entries) || []).length,
    };
  }

  /* S54 · EINE Rangliste pro Vorraum statt zweier Kategorien (Hinweise vs.
     Optionen): Kandidaten mit Stufe und Bereich, dann Deckel DREI über alles.
       Stufe 1 · Begonnenes fortsetzen (offene/pausierte Sessions)
       Stufe 2 · Roter Faden Klärung → Auflösung (nächster Kernschritt)
       Stufe 3 · Neues/Offenes (eingetroffenes Material, wartende Runde)
       Stufe 4 · Freie Sessions & Stöbern (stehende Einladungen)
     Invariante: Stufe 4 füllt nur auf — sie verdrängt nie Stufe 1–3.
     Einzige Ausnahme ist die Start-Balance (s. waehleWegzeilen). Doppelungen
     sind zu Aktionszeilen verschmolzen: Freigaben-bereit + Auflösungs-
     Einladung = weg.aufloesungStart(MitAufdeck); die Regal-Einladung weicht,
     sobald der Regal-Zähler als Zeile dasteht. */
  const WEG_MAX = 3;
  function wegKandidaten(lage, screenId) {
    const partner = state.info.partner;
    const k = [];
    const zeile = (stufe, bereich, text) => { if (text) k.push({ stufe, bereich, text }); };
    const aufloesungAktion = () =>
      lage.aufdeckBereit ? t("weg.aufloesungStartMitAufdeck") : t("weg.aufloesungStart");
    if (screenId === "scrStart") {
      zeile(1, "mein", lage.einzelKapitel && t("weg.einzelPause", { n: lage.einzelKapitel }));
      zeile(1, "gemeinsam", lage.aufloesungOffen && t("weg.aufloesungOffen"));   // S63: Begonnenes fortsetzen
      zeile(1, "gemeinsam", lage.momentOffen && t("weg.momentOffen"));
      zeile(2, "mein", !lage.einzelBegonnen && t("weg.startAuftrag"));
      zeile(2, "gemeinsam", lage.handBeide && !lage.aufloesungGelaufen && !lage.aufloesungOffen && aufloesungAktion());
      zeile(3, "gemeinsam", lage.regalNeu > 0 && t("weg.regalNeu", { n: lage.regalNeu }));
      zeile(3, "mein", lage.messOffen && t("weg.messOffen"));
      // S76 · Vor der Aufdeckung lautet die Einladung "erstmal", danach
      // "jederzeit" — der Reflexionsraum bleibt dauerhaft offen.
      zeile(4, "mein", t(lage.aufdeckGelaufen ? "weg.startSoloJederzeit" : "weg.startSolo"));
      zeile(4, "gemeinsam", t("weg.optQz"));
    }
    if (screenId === "scrMyRoom") {
      zeile(1, "mein", lage.einzelKapitel && t("weg.einzelPause", { n: lage.einzelKapitel }));
      zeile(2, "mein", !lage.einzelBegonnen && t("weg.optAuftragEuch"));
      zeile(3, "mein", lage.messOffen && t("weg.messOffen"));
      zeile(4, "mein", t("weg.soloErster"));
      zeile(4, "mein", lage.zeitleisteLeer ? t("weg.optRueckblickSpaeter") : t("weg.optRueckblick"));
    }
    if (screenId === "scrShared") {
      zeile(1, "gemeinsam", lage.aufloesungOffen && t("weg.aufloesungOffen"));   // S63: Begonnenes fortsetzen
      zeile(1, "gemeinsam", lage.momentOffen && t("weg.momentOffen"));
      if (!lage.aufloesungGelaufen && !lage.aufloesungOffen) {
        const text = lage.handBeide ? aufloesungAktion()
          : !lage.handMeins && !lage.handPartner ? t("weg.aufloesungFehltBeide")
          : !lage.handMeins ? t("weg.aufloesungFehltDu")
          : t("weg.aufloesungFehltPartner", { partner });
        zeile(2, "gemeinsam", text);
      }
      zeile(2, "gemeinsam", lage.messBereit && t("weg.messBereit"));
      zeile(3, "gemeinsam", lage.regalNeu > 0 && t("weg.regalNeu", { n: lage.regalNeu }));
      zeile(3, "gemeinsam", lage.agendaOffen > 0 && t("weg.agendaOffen", { n: lage.agendaOffen }));
      zeile(4, "gemeinsam", t("weg.optQzTeil"));
      zeile(4, "gemeinsam", !lage.regalNeu && t("weg.optRegalTeil"));
    }
    return k;
  }

  /** Stabile Stufen-Sortierung, dann Deckel DREI. Start-Balance: mindestens
      eine Zeile je Bereich (mein/gemeinsam) — fehlt ein Bereich, weicht die
      niedrigst priorisierte der drei Zeilen seiner besten Zeile (bewusste
      Ausnahme von der Stufen-Invariante, nur auf dem Startscreen). */
  function waehleWegzeilen(kandidaten, screenId) {
    const sortiert = kandidaten.map((kd, i) => ({ ...kd, i }))
      .sort((a, b) => a.stufe - b.stufe || a.i - b.i);
    const wahl = sortiert.slice(0, WEG_MAX);
    if (screenId === "scrStart" && wahl.length === WEG_MAX) {
      for (const bereich of ["mein", "gemeinsam"]) {
        if (wahl.some(kd => kd.bereich === bereich)) continue;
        const bester = sortiert.find(kd => kd.bereich === bereich);
        if (bester) wahl[WEG_MAX - 1] = bester;
      }
    }
    return wahl.map(kd => kd.text);
  }

  /* S41 · Lage sichtbar machen: Badges für ungelesene Freigaben und
     Ausgrauen gesperrter Sessions MIT stets sichtbarem Hinweis unter dem
     Knopf (Touch-tauglich, kein Hover, kein Fehler-Popup). */
  function wendeLageAn(lage, screenId) {
    // S76 · Lesezeichen statt Badges: je Partner mit Ungelesenem EIN Lesezeichen
    // mit dem (unterscheidbaren) Kürzel der Person, DIE LESEN SOLL — ohne
    // Zähler; die Marke ragt oben rechts aus dem Regal-Knopf (angeheftet).
    const [kA, kB] = lesezeichenLabels(state.info.nameA, state.info.nameB);
    const lesezeichen = (id) => {
      const b = wurzel.querySelector("#" + id);
      if (!b) return;
      const marken = [{ k: kA, n: lage.regalNeuA }, { k: kB, n: lage.regalNeuB }].filter(p => p.n > 0);
      b.innerHTML = marken.map(p => `<span class="pb-lz">${esc(p.k)}</span>`).join("");
      b.classList.toggle("pb-hidden", !marken.length);
    };
    if (screenId === "scrStart") {
      // D2 · Runde Initial-Badge an der Betreten-Zeile (Design 17a): das
      // Initial der Person, DIE LESEN SOLL — keine Zaehler, keine Details.
      const leiste = $("lzStart");
      if (leiste) {
        const marken = [{ k: kA, n: lage.regalNeuA }, { k: kB, n: lage.regalNeuB }].filter(p => p.n > 0);
        leiste.innerHTML = marken.map(p => `<span class="rz-initial">${esc(p.k)}</span>`).join("");
      }
      return;
    }
    if (screenId === "scrMyRoom") {
      // S44 · Prozessreflexion erscheint erst, wenn die Gemeinsame Auflösung
      // gelaufen ist (Auftragsklärung abgeschlossen + aufgedeckt); dann tritt
      // sie an die STELLE der Auftragsklärung (nicht in die Regal-Reihe).
      const auf = !!lage.aufloesungGelaufen;
      const tog = (id, hide) => { const e = $(id); if (e) e.classList.toggle("pb-hidden", hide); };
      // S53 · Eine begonnene Auftragsklärung heißt "fortsetzen" statt
      // "beginnen" (Muster wie btnMoment/teil.momentWeiter).
      const be = $("einzelLabel");
      if (be) be.textContent = lage.einzelBegonnen ? t("mein.einzelWeiter") : t("mein.einzel");
      // D3 · 2px-Fortschrittsbalken (Design 17c) unter der Auftragsklaerungs-
      // Zeile: sichtbar, solange eine Kapitel-Pause vorliegt; Breite = Anteil
      // geschaffter Kapitel. Kein Kapitel-Label (Spez).
      const balken = $("einzelBalken");
      if (balken) {
        const gesamt = (K().KAPITEL_TITEL || []).length || 1;
        balken.classList.toggle("pb-hidden", !lage.einzelKapitel);
        const i = balken.querySelector("i");
        if (i) i.style.width = Math.round(100 * Math.min(1, lage.einzelKapitel / gesamt)) + "%";
      }
      tog("btnEinzel", auf); tog("einzelSubP", auf);
      tog("btnMess", !auf); tog("messSubP", !auf);
      return;
    }
    if (screenId !== "scrShared") return;
    lesezeichen("lzRegal");
    const sperre = (btnId, hinweisId, zu, text) => {
      const b = $(btnId), h = $(hinweisId);
      if (!b) return;
      b.disabled = zu;
      b.classList.toggle("rz-gedimmt", zu);   // D3: gedimmt + Zustandstext statt Pfeil
      if (h) { h.textContent = text || ""; h.classList.toggle("pb-hidden", !zu || !text); }
    };
    const bm = $("momentLabel");
    if (bm) bm.textContent = lage.momentOffen ? t("teil.momentWeiter") : t("teil.moment");
    sperre("btnGemeinsam", "gemeinsamHinweis", !lage.handBeide, t("teil.gateAufloesung"));
    // S63 · Begonnene Auflösung heißt "fortsetzen" statt "beginnen" (Muster
    // btnMoment/btnEinzel); der Subtext wechselt mit.
    const bg = $("btnGemeinsam");
    const bgl = $("gemeinsamLabel");
    if (bgl) bgl.textContent = lage.aufloesungOffen ? t("teil.gemeinsamWeiter") : t("teil.gemeinsam");
    // S74 · Nach dem Befund ist die Auflösung abgeschlossen — die ganze Zeile
    // (D3: Hairline-Zeile statt Karte) verschwindet samt Subtext, statt wieder
    // "beginnen" anzubieten; der lineare Pfad geht bei der Prozessreflexion weiter.
    if (bg) bg.classList.toggle("pb-hidden", !!lage.aufloesungGelaufen);
    // S62 · Dauerhafter Subtext unter der Auflösungs-Karte; solange gesperrt,
    // weicht er dem Gate-Hinweis (nie beide zugleich).
    const gSub = $("gemeinsamSub");
    if (gSub) {
      gSub.textContent = lage.aufloesungOffen ? t("teil.gemeinsamWeiterSub") : t("teil.gemeinsamSub");
      gSub.classList.toggle("pb-hidden", !lage.handBeide || !!lage.aufloesungGelaufen);
    }
  }

  /* S36-Kommentar historisch: die festen Einladungen leben jetzt als
     Stufe-4-Kandidaten in wegKandidaten (S54). */

  /** Wegweiser zeichnen + Gating anwenden (Gemeinsame Auflösung nur mit
      beiden Freigaben). Läuft still im Hintergrund bei jedem Vorraum-Betreten.
      S36: Auf Start und in "Mein Raum" lebt der Wegweiser IM Intro-Panel
      (oben, nicht als letzte Karte); Lage-Hinweise stehen vor den Optionen. */
  /** Panelinhalt: Optionen, optionaler Zusatz, Fusszeile. Von Vorraeumen und
      Chat gemeinsam benutzt, damit beide dieselbe Form behalten. */
  function zeichneWegPanel(box, zeilen, extra) {
    box.innerHTML = zeilen.map(x => `<p class="rz-option">${esc(x)}</p>`).join("") +
      (extra || "") + `<div class="rz-weg-fuss">${t("weg.fuss")}</div>`;
  }

  /* T2i · Wegweiser IM Gespraech.
     Die vier Stufen bedeuten hier NICHT Dringlichkeit wie in den Vorraeumen.
     Dort steht man VOR etwas und waehlt; im Chat ist man drin, und eine Zeile
     "hier wartet noch etwas anderes" waere eine Aufforderung, das Gespraech zu
     verlassen. Belegt sind die Stufen deshalb mit der Prioritaetskette der
     Haltungs-Charta (Regel 7):
        1 Sicherheit · 2 Stabilitaet · 3 Kontakt · 4 Deutung
     Das Panel sagt also zuerst "das hier ist vertraulich" und erst zuletzt,
     wo man gerade steht. Aus demselben Grund leuchtet hier kein wartender
     Punkt: es gibt keine Stufe mehr, die "hier wartet etwas" bedeutet.

     Der Entwurf liefert je Format genau drei Zeilen — der Deckel greift also
     nie. Gebaut ist es trotzdem ueber wegKandidaten/waehleWegzeilen, damit
     weitere Lagen (erste Nachricht noch nicht geschrieben, Ausschnitt-Tuer
     offen, Freigabe steht an) rein additiv nachruestbar sind. */
  function wegKandidatenChat(def) {
    const partner = state.info ? state.info.partner : "";
    const k = [];
    const zeile = (stufe, text) => { if (text) k.push({ stufe, text }); };
    const id = def && def.id;
    const gemeinsam = !!(def && def.shared);
    // §4.4 · Waehrend der Freigabe-Auswahl traegt der Wegweiser die
    // Bedienanleitung. Sie steht auf Stufe 2 (Stabilitaet): sie sagt, wie man
    // die Flaeche beherrscht — nach der Vertraulichkeit, vor allem anderen.
    if (auswahlOffen()) {
      zeile(1, gemeinsam ? t("weg.chatGemeinsam") : t("weg.chatVertraulich", { partner }));
      zeile(2, t("weg.auswahlHalten"));
      zeile(3, t("weg.chatFreigabe", { partner }));
      return k;
    }
    zeile(1, gemeinsam ? t("weg.chatGemeinsam") : t("weg.chatVertraulich", { partner }));
    if (id === "solo") {
      zeile(2, t("weg.chatPauseAbschluss"));
      zeile(3, t("weg.chatTeilen"));
    } else if (id === "einzel") {
      const kap = state.engine && state.engine.chat && state.engine.chat.kapitel;
      const gesamt = (K().KAPITEL_TITEL || []).length;
      zeile(2, kap && gesamt ? t("weg.chatKapitel", { n: kap, m: gesamt }) : t("weg.chatPause"));
      zeile(3, t("weg.chatFreigabe", { partner }));
    } else if (id === "moment") {
      zeile(2, t("weg.chatPauseAbschlussTeil"));
      zeile(4, t("weg.chatQzRahmen"));
    } else if (id === "gemeinsam") {
      zeile(2, t("weg.chatPauseTeil"));
      zeile(3, t("weg.chatBefund"));
    } else if (id === "qualitytime") {
      zeile(2, t("weg.chatPauseTeil"));
      zeile(3, t("weg.chatAufdeck"));
    } else {
      zeile(2, gemeinsam ? t("weg.chatPauseTeil") : t("weg.chatPause"));
    }
    return k;
  }

  /** T2i · Panel der laufenden Session nachziehen. Haengt am Chat-Zustand,
      deshalb aus aktualisiereChatEnde() mitgerufen. */
  function aktualisiereWegweiserChat() {
    const box = $("wegChat"), badge = $("chatOrt");
    if (!box || !badge) return;
    const def = state.engine && state.engine.def;
    const zeilen = waehleWegzeilen(wegKandidatenChat(def), "scrChat");
    if (!zeilen.length) { box.classList.add("pb-hidden"); badge.classList.add("pb-hidden"); return; }
    zeichneWegPanel(box, zeilen);
    box.classList.remove("pb-hidden");
    badge.classList.remove("pb-hidden");
    badge.classList.remove("rz-wartet");   // im Gespraech wartet nichts
  }

  async function aktualisiereWegweiser(screenId) {
    const boxId = { scrStart: "wegStart", scrMyRoom: "wegMein", scrShared: "wegTeil" }[screenId];
    if (!boxId) return;
    try {
      const lage = await ladeLage();
      wendeLageAn(lage, screenId);
      aktualisiereKulisse(screenId, lage);   // D6: still im Hintergrund
      const kandidaten = wegKandidaten(lage, screenId);
      const zeilen = waehleWegzeilen(kandidaten, screenId);
      const box = $(boxId);
      /* D2 · Badge/Panel-Wegweiser (Design Turn 17): Boxen mit Klasse
         rz-weg-panel werden als faltbares Naht-Panel gerendert — nur Text,
         2-3 Optionen, Serif, Fusszeile. Der Punkt im Badge zeigt an, dass
         etwas WARTET (Stufe 1-3); stehende Stufe-4-Einladungen leuchten
         nicht. Alte Boxen (bis zum D3-Umzug) behalten die pb-item-Liste. */
      if (box.classList.contains("rz-weg-panel")) {
        const badge = box.parentElement.querySelector(".rz-weg-badge");
        if (!zeilen.length) {
          box.classList.add("pb-hidden");
          if (badge) badge.classList.add("pb-hidden");
          return;
        }
        // T2k/K7 · Die Startseite erklaert einmal, was das Zeichen bedeutet.
        // Bewusst KEIN vierter Kandidat: der Hinweis soll keine echte Zeile
        // verdraengen, wenn der Deckel von drei greift.
        zeichneWegPanel(box, zeilen, screenId === "scrStart"
          ? `<div class="rz-weg-hinweis">${esc(t("weg.hinweisStart"))}</div>` : "");
        box.classList.remove("pb-hidden");
        if (badge) {
          badge.classList.remove("pb-hidden");
          badge.classList.toggle("rz-wartet", kandidaten.some(kd => kd.stufe < 4));
        }
        return;
      }
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

  /* D6 · Kulisse nachziehen — still, fehlertolerant, nie blockierend.
     Startzeitpunkte liegen SERVERSEITIG (K4): der geteilte Zaehler im
     Bstate (Naht des Starts + Vorraum uns), der persoenliche im Pstate
     (Vorraum mich); beide werden beim ersten Betreten einmalig gesetzt.
     Meilensteine kommen aus der ohnehin geladenen Lage. */
  async function aktualisiereKulisse(screenId, lage) {
    const ziel = { scrStart: "kulisseStart", scrMyRoom: "kulisseMein", scrShared: "kulisseTeil", scrChat: "kulisseChat" }[screenId];
    if (!ziel) return;
    const halter = $(ziel);
    if (!halter) return;
    try {
      // D12-2c · Der Chat wächst mit dem Raum, in dem er stattfindet: die
      // Einzelsession aus dem persönlichen Zähler, die gemeinsame aus dem
      // geteilten. Ein eigener Chat-Zähler wäre ein dritter Garten für
      // denselben Ort.
      const privat = screenId === "scrMyRoom" || (screenId === "scrChat" && !state.chatShared);
      const lies = () => privat ? backend.pstate.get("kulisse") : backend.bstate.get("kulisse");
      const schreib = v => privat ? backend.pstate.set("kulisse", v) : backend.bstate.set("kulisse", v);
      let k = await lies();
      if (!k || !k.start) { k = { start: Date.now() }; await schreib(k); }
      const meilensteine = (lage.einzelBegonnen ? 1 : 0) + (lage.aufdeckGelaufen ? 1 : 0) + (lage.zieleDefiniert ? 1 : 0);
      // D11 · Vorschau-Haken fuers Entwickler-Panel: setzt jemand eine Zahl,
      // gilt sie statt der gewachsenen. Nur lesend, nur wenn vorhanden — im
      // Betrieb setzt das niemand.
      const fenster = doc.defaultView;
      const vorschau = fenster && fenster.__rzKulisseVorschau;
      const n = Number.isFinite(vorschau) ? vorschau : kulisseAnzahl({ meilensteine, startTs: k.start });
      halter.innerHTML = baueKulisse(n, screenId);
    } catch { /* Kulisse ist Beiwerk, kein Muss */ }
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
      knoepfe = `<label class="rz-fein">${t("messiv.eingabe")} <input id="miTage" type="number" min="1" max="90" value="${iv.days}" class="rz-zahlfeld"></label> ` +
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
      `<div class="pb-sub rz-oben-3">${t("agenda.gruppeAbsprachen")}</div>` +
      `<p class="rz-fein-abstand"><strong>${t("messiv.titel")}</strong> — ${mitte}</p>` + knoepfe +
      (meldung ? `<p class="rz-fein-betont">${meldung}</p>` : "") +
      `<p class="pb-sub rz-oben-2">${t("messiv.hinweis")}</p>`;
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
    if (!msg) { b.textContent = ""; b.classList.add("pb-hidden"); return; }   // S87: verborgen UND leer
    b.textContent = msg;
    b.classList.remove("pb-hidden");
  }
  function err(msg) {
    const b = $("pbErr");
    if (!msg) { b.textContent = ""; b.classList.add("pb-hidden"); return; }   // S87: verborgen UND leer (R4)
    b.textContent = msg;
    b.classList.remove("pb-hidden");
  }

  /* Kompaktes, sicheres Inline-Markdown: erst HTML-escapen, dann **fett**,
     *kursiv*, \`code\`, Überschriften als fett, "- " als Aufzählungspunkt.
     white-space:pre-wrap erhält die Zeilenstruktur — kein Block-Parser nötig. */
  /* R4b · Der Chat-Kern (zeichnen, streamen, warten, senden) lebt jetzt in
     chat-kern.js. Die Verdrahtung ist ZWEISTUFIG, weil die Abhaengigkeiten im
     Kreis laufen: Der Verlauf zeichnet Panel-Karten und die Auswahlflaeche,
     beide stossen ihrerseits ein Neuzeichnen an. Der Kreis ist real — er wird
     hier sichtbar gemacht statt hinter einem Ereigniskanal versteckt. */
  const chatKern = macheChatKern({ doc, $, el, state, backend, err, hint, aktualisiereBusy });
  const { aktualisiereSkala, streamAnzeige, zeigeStream, zeigeAusgelastet,
          nahAmEingabefeld, scrolleZumEingabefeld, renderMsgs, aktualisiereComposer,
          setzeWarten, zeigeErneutSenden, warteAntwort, sende } = chatKern;


  /* ══════════ S96.2 · Dialogausschnitt: Auswahl und Vorschau ══════════
     Drei Stationen: Auswählen → Vorschau → Freigeben.

     Der VERLAUF SELBST kippt in den Auswahl-Modus — keine abgeleitete Liste.
     Das Material bleibt in seinem Kontext, und die Person hat es gerade eben
     gelesen; eine gestrippte Liste zwänge zum Wiedererkennen statt zum
     Erinnern. Sichtbar wechselt dabei die EINHEIT: aus zwei Blasen wird EIN
     Block, sonst tippt jeder zuerst auf eine einzelne Blase und lernt die
     Regel durch Scheitern. */

  /* R4b · Ausschnitt-Auswahl und Vorschau leben jetzt in auswahl-screen.js —
     samt ihrem eigenen Zustand (`ausw`). app.js kennt weder den Zustand noch
     seine Phasen; es fragt ueber zeichneAuswahl(), ob gezeichnet wurde. */
  /* §4.4 · Der Wegweiser traegt waehrend der Auswahl deren Anleitung. Damit
     er beim Oeffnen und Schliessen der Flaeche mitzieht, laeuft er an
     renderMsgs mit — dem einen Punkt, den jede Zustandsaenderung der Auswahl
     ohnehin passiert. */
  const { ausschnittAngebot, starteAuswahl, beendeAuswahl, zeichneAuswahl, auswahlOffen } =
    macheAuswahlScreen({
      $, el, state, backend, err, warteAntwort,
      renderMsgs: erzwingen => { renderMsgs(erzwingen); aktualisiereWegweiserChat(); },
    });

  /* S96.1 · Bauvorschrift: engine-frei. Die Engine wird AUSSCHLIESSLICH für die
     Quittung ans Modell gebraucht — quereGate selbst kommt ohne Session aus.
     Ohne diese Trennung liesse sich der Replay-Eingang (S96.3) nur mit einer
     zweiten Freigabestrecke anschliessen, also mit genau der Dopplung, die es
     nicht geben soll. */
  /* R4b · kw/kwZu stehen bewusst HIER, oberhalb der Panel-Fabrik: sie sind
     const bzw. werden von ihr gebraucht, und eine spaetere Definition liefe
     in die temporale Totzone. Zwei Zeilen hochzuziehen ist ehrlicher, als die
     Fabrik ans Dateiende zu schieben. */
  const kw = () => $("kwPanel");
  const KTX = (key, weich) => (K().korpusTexte[key] !== undefined ? K().korpusTexte[key] : (weich ? "" : key));
  function kwZu() { kw().classList.add("pb-hidden"); kw().innerHTML = ""; }

  /* R4b · Gate, Kapitel und Aufdeck-Tafel leben jetzt in panels.js. kw/kwZu
     (Kernwetten-Panelflaeche) bleiben hier, weil sie auch die Kernwetten-
     Ablaeufe bedienen, und werden hereingereicht. */
  const { gatePanel, kapitelPanel, aufdeckTafel, baueTafelKarte } =
    machePanels({ $, el, state, backend, err, renderMsgs, warteAntwort, kw, kwZu });

  /* Zweite Stufe: die Gegenrichtung des Kreises. Ab hier zeichnet der Verlauf
     Panel-Karten und die Auswahlflaeche. Muss VOR dem ersten Rendern stehen. */
  chatKern.verbinde({ baueTafelKarte, zeichneAuswahl });
  
  const FORTSETZ_PAUSE_MS = 5 * 60 * 1000;   // S71: unter fünf Minuten Abwesenheit machen wir nahtlos weiter, erst danach das Wiedereinstiegs-Ritual
  async function startChat(art) {
    // S87 · Kopf-Abbau: eine eventuell noch stehende Chat-Oberfläche wird
    // ZUERST abgebaut (Entwurf unter der ALTEN chatId sichern, Diktat stoppen,
    // Pausenstempel setzen), bevor unten state.chatId überschrieben wird.
    // Deckt auch den Abbruchpfad (throw aufloesungFehlt): der Vorraum bleibt sauber.
    raeumeChatOberflaeche();
    const info = state.info || (state.info = await backend.info());   // Selbstheilung (S67), s. ladeLage
    // Sprach-Schnappschuss: neue Sessions starten in der Paarsprache; laufende
    // und pausierte behalten ihre Sprache (Resume bricht nicht mitten im
    // Gespräch um). Der Schnappschuss steuert ALLE Korpus-Zugriffe via K().
    const paarSprache = info && info.locale === "en" ? "en" : "de";
    // R5 · Tor: Der Korpus MUSS da sein, bevor die Sprache gesetzt wird —
    // sonst faellt setKorpusSprache lautlos auf Deutsch zurueck und ein
    // englischsprachiges Paar bekaeme deutsche Prompts, ohne jedes Anzeichen.
    await stelleKorpusBereit(paarSprache);
    setKorpusSprache(paarSprache);
    // S87 · Nachzügler-Zaun auch für die Def-Hooks: Eine spät eintreffende
    // Antwort der ALTEN Session dispatcht ihre Blöcke — und würde Panels in
    // der Oberfläche des NEUEN Raums öffnen (kwPanel/gatePanel existieren
    // nach dem Neubau wieder). Panel-Öffner kehren deshalb am Zaun um; ein
    // legitim wartendes Panel geht nicht verloren, resume() dispatcht es beim
    // Wiederbetreten erneut. Daten-Hooks (onMomentEnde-Buchung, onZeitleiste)
    // bleiben ungezäunt — die alte Sitzung wird zu Ende gebucht; ihre
    // Anzeige-Aufrufe rechnen ohnehin aus dem AKTUELLEN state.engine.
    let gen = -1;   // wird nach dem Aufbau gezogen; bis dahin sind die Zäune zu
    const lebend = fn => (...a) => { if (gen === state.chatGen) return fn(...a); };
    const hooks = {
      onGate: lebend((d, e2) => gatePanel(d, e2)),
      /* S95.7a · Der EXCERPT-BLOCK ist der einzige Moment, in dem Eignung UND
         Verlauf zugleich vorliegen. Hier wird abgelegt (F0: Vorgabe
         aufbewahren), damit sich spaeter noch ein Ausschnitt schneiden laesst.
         Best-Effort — ein Fehlschlag kostet die Teilbarkeit, nie die Session. */
      onAusschnitt: lebend((eignung, e2) => {
        /* S95.7 · Erst die Tuer, dann die Verlaufs-Zeile darunter — sie haengt
           an derselben Bedingung: Wo es nichts Teilbares gibt, wird weder eine
           Tuer gezeigt noch etwas gefragt oder aufbewahrt. */
        if (!ausschnittAngebot(eignung, e2)) return;
        verlaufSchritt(eignung, e2);
      }),
      onRegler: lebend(e2 => reglerPanel(e2)),
      onRanking: lebend((mode, e2) => rankPanel(mode, e2)),
      onStartwerte: lebend(e2 => startwertePanel(e2)),
      onFreigabe: lebend((d, e2) => freigabePanel(d, e2)),
      onKapitel: lebend((n, e2) => kapitelPanel(n, e2)),
      onScale: lebend((art, e2) => scalePanel(art, e2)),
      onChoice: lebend((art, e2, daten) => choicePanel(art, e2, daten)),
      onAufdecken: lebend((e2, richtung) => aufdeckTafel(e2, richtung)),
      /* S95.8b · Wortlaut-Abruf. Der Begleiter nennt die Kennung, die App loest
         auf und liefert. Er raet NICHT, welches Gespraech gemeint war — bei
         "gestern" gegen "letzte Woche" ist eine Verwechslung teuer. */
      onAbruf: lebend((daten, e2) => holeWortlaut(daten, e2)),
      // S89 · Verbrauch der Messrunde hängt an der AUFDECKUNG, nicht am
      // Sessionende: [[META-REVEALED]] bucht ID-genau; ein MOMENT-BLOCK ohne
      // Aufdeckung lässt die Runde für die nächste Qualitätszeit liegen.
      // Daten-Hook — bewusst UNGEZÄUNT (wie onSave): auch ein Nachzügler-
      // Abschluss der alten Session bucht korrekt.
      onMetaAufgedeckt: () => {
        const id = state.engine && state.engine.chat && state.engine.chat.messrundeId;
        markiereAufgedeckt(backend, id).catch(() => {});
      },
      onMomentEnde: () => { aktualisiereChatEnde(); aktualisiereComposer(); },
      // S76 · Solo-Abschluss (TIMELINE-BLOCK nach [CLOSE SESSION]) beendet die
      // Session — Knopf und Composer ziehen sichtbar nach.
      onZeitleiste: () => { aktualisiereChatEnde(); aktualisiereComposer(); },
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
    // S42/S76 · Eine abgeschlossene Qualitätszeit oder ein abgeschlossenes
    // Reflexionsgespräch wird nicht wieder aufgemacht — das Protokoll liegt in
    // "Gemeinsame Momente" bzw. der Zeitleiste; der nächste Klick beginnt frisch.
    if ((art === "moment" || art === "solo") && gespeichert && gespeichert.status !== "running") gespeichert = null;
    // S76 · Heilung: Vor dem Engine-Fix (Handler abwarten + speichern) konnten
    // Qualitätszeiten mit erzeugtem MOMENT-BLOCK als "running" hängen bleiben —
    // Fortsetzen-Schleife ohne Neustart-Möglichkeit. Steht der Block in der
    // letzten Assistant-Nachricht, gilt die Session als abgeschlossen.
    if (art === "moment" && gespeichert && gespeichert.status === "running") {
      const letzte = (gespeichert.messages || [])[gespeichert.messages.length - 1];
      if (letzte && letzte.role === "assistant" && /\bMOMENT-BLOCK\b/.test(letzte.content || "")) {
        gespeichert.status = "finished";
        await backend.chat.save("shared", art, gespeichert).catch(() => {});
        gespeichert = null;
      }
    }
    const chat = gespeichert || { messages: [], status: "running" };
    // S59 · Linearer Pfad (Klärung → Auflösung → Prozessreflexion): nach der
    // Freigabe existiert kein Neustart. Das eigene Handover schlägt den
    // lokalen Chat (D1) — auch ein leerer oder zurückgesetzter Chat öffnet
    // den NACHKLANG statt Kapitel 1.
    if (art === "einzel" && !chat.freigegeben) {
      const hand = await Promise.resolve().then(() => backend.handover.get(info.role)).catch(() => null);
      if (hand) { chat.freigegeben = true; chat.nachklang = true; }
    }
    // S38/S59 · Abschluss-Bewusstsein: JEDE freigegebene Auftragsklärung
    // öffnet beim Wiederbetreten den NACHKLANG (hinzufügen / richtigstellen /
    // Zusammenfassung) — auch die seit S44 üblichen running-Sessions; der
    // Legacy-Status "released" wird weiter auf "running" geheilt.
    const einzelRueckkehr = art === "einzel" && !!chat.freigegeben;
    if (einzelRueckkehr && chat.status !== "running") chat.status = "running";
    // S53 · Wiedereinstieg in eine LAUFENDE (pausierte) Auftragsklärung:
    // begrüßen statt stummem Verlauf. Wächter (Vertrag 1) für Nachklang UND
    // Wiedereinstieg: nur wenn der letzte Zug ein Assistant-Zug OHNE Marker
    // und OHNE Block ist — ein wartendes Panel öffnet stattdessen wieder und
    // bekommt GENAU EINE Panel-Antwort; ein offener User-Zug wird von
    // resume() beantwortet.
    const letzterZug = chat.messages[chat.messages.length - 1];
    const zugFrei = !!letzterZug && letzterZug.role === "assistant" &&
      !findeMarker(letzterZug.content || "", def.markerOrder || []) &&
      !findeBlock(letzterZug.content || "", def.blocks || (def.block ? [def.block] : []));
    // S64 · Generischer Wiedereinstieg: jede SessionDef, die einen
    // wiedereinstieg-Steuertext deklariert, meldet dem Modell das erneute
    // Betreten ihrer laufenden Session — kein Sonderfall je Raum mehr.
    // S71 · Fortsetzenpause: Kehrt das Paar binnen fünf Minuten zurück, machen
    // wir NAHTLOS weiter (kein Wiedereinstiegs-Ritual, kein Ankommens-Menü); erst
    // ab fünf Minuten Abwesenheit greift die Zeremonie. Ohne Pausenstempel
    // (Legacy oder Tab-Abbruch) gilt der sichere Default: Zeremonie. Gestempelt
    // wird beim Verlassen des Raums (btnChatZurueck). Der NACHKLANG bleibt
    // unberührt — er hängt an einzelRueckkehr, nicht an dieser Schwelle.
    const pausenAlterMs = chat.pausedAt != null ? (Date.now() - chat.pausedAt) : Infinity;
    const langeGenugPausiert = pausenAlterMs >= FORTSETZ_PAUSE_MS;
    const wiedereinstieg = def.wiedereinstieg && !einzelRueckkehr &&
      chat.status === "running" && zugFrei && langeGenugPausiert ? def.wiedereinstieg : null;
    chat.pausedAt = null;   // die nun aktive Session trägt keinen Pausenstempel mehr
    const korpusSprache = (gespeichert && gespeichert.language) || paarSprache;
    await stelleKorpusBereit(korpusSprache);   // R5 · Tor, s. o.
    setKorpusSprache(korpusSprache);
    if (!gespeichert) chat.language = korpusSprache;
    const ctx = { me: info.name, partner: info.partner, nameA: info.nameA, nameB: info.nameB };
    // S87 · Aufbau VOR der Engine: baueChatOberflaeche räumt konstruktiv selbst
    // (G1) und erhöht dabei chatGen — die Marke dieser Session wird DANACH
    // gezogen. Hooks alter Sessions (Nachzügler: laufende Antworten, Retries)
    // kehren am Zaun wortlos um; onSave bleibt bewusst UNGEZÄUNT, damit die
    // alte Sitzung zu Ende gespeichert wird und beim Wiederbetreten vollständig ist.
    baueChatOberflaeche();
    // Der konstruktive Abbau in baueChatOberflaeche hat die Sessionfelder
    // genullt — für DIESE Session neu setzen (nach dem Abbau, vor der Engine).
    state.chatId = art;
    state.chatShared = def.shared;
    state.herkunft = def.shared ? "scrShared" : "scrMyRoom";
    // D12-2b/T2i · Das Badge auf der Naht nennt den Ort (Turn 27, 27e) — und
    // ist seit T2 zugleich der Wegweiser-Knopf. Die Beschriftung bleibt der
    // Ortsname (Entscheidung K5), sie zieht ihn aber aus eigenen Schlüsseln
    // statt aus denen der Startseite (§3.7).
    $("chatOrtName").textContent = t(def.shared ? "weg.badgeTeil" : "weg.badgeMein");
    gen = ++state.chatGen;
    state.engine = new Engine({
      def, chat, llm: backend.llm, ctx,
      hooks: {
        onSave: c => backend.chat.save(def.shared ? "shared" : "mine", art, c),
        onPersonError: lebend(err),
        onRender: lebend(renderMsgs),
        onDelta: lebend(zeigeStream),
        onStatus: lebend(zeigeAusgelastet),   // S70: zahlenlose Warteanzeige bei Auslastungs-Retries
      },
    });
    $("pbInput").value = state.entwuerfe[art] || "";   // K3 b: Entwurf zurücklegen (nur Arbeitsspeicher)
    $("chatTitel").textContent = K().korpusTexte["titel." + art] || def.titel;
    aktualisiereChatEnde();
    show("scrChat");
    // D6/D12-2c · Kulisse still im Hintergrund — nie blockierend, nie kritisch.
    ladeLage().then(l => aktualisiereKulisse("scrChat", l)).catch(() => {});
    renderMsgs(true);   // (Wieder-)Betreten springt einmalig ans Verlaufs-Ende (S53/S62)
    if (chat.messages.length) {
      await state.engine.resume();
      if (einzelRueckkehr && zugFrei)
        await warteAntwort(() => state.engine.submitToolResult(K().steuerTexte.einzelRueckkehr, { hidden: true }));
      else if (wiedereinstieg)
        await warteAntwort(() => state.engine.submitToolResult(K().steuerTexte[wiedereinstieg], { hidden: true }));
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
        const [goals, freiA, freiB, timeline, momentLog, merkposten, messungenSolo, markerAlt] = await Promise.all([
          backend.bstate.get("goals").catch(() => null),
          Promise.resolve().then(() => backend.handover.get("A")).catch(() => null),
          Promise.resolve().then(() => backend.handover.get("B")).catch(() => null),
          backend.pstate.get("timeline").catch(() => null),
          backend.bstate.get("momentLog").catch(() => null),
          backend.pstate.get("merkposten").catch(() => null),
          backend.bstate.get("measurements").catch(() => null),
          backend.pstate.get("leseMarker").catch(() => null),
        ]);
        // S92 · Marker-Regel (Slice 3): wiederkehrend schwache Lese-Richtung —
        // je Musterlage EINMAL als Material eingespielt (merken statt melden,
        // Schlüssel in pstate); das Ansprechen bleibt anlassgebunden beim Modell.
        let leseMarker = null;
        const befund = pruefeLeserichtung(messungenSolo, info.role);
        if (befund && befund.schluessel !== (markerAlt && markerAlt.schluessel)) {
          leseMarker = formatiereLeseMarker(befund, info.name, info.partner);
          backend.pstate.set("leseMarker", { schluessel: befund.schluessel, at: new Date().toISOString() }).catch(() => {});
        }
        const kontext = baueSoloKontext({ goals, sharings: [freiA, freiB].filter(Boolean), timeline, momentLog, merkposten, leseMarker });
        if (kontext) chat.messages.push({ role: "user", hidden: true, content: kontext });
      }
      if (art === "moment") {
        const [goals, agenda, momentLog, measurements, freiA, freiB, findings] = await Promise.all([
          backend.bstate.get("goals"), backend.bstate.get("agenda"),
          backend.bstate.get("momentLog"), backend.bstate.get("measurements"),
          Promise.resolve().then(() => backend.handover.get("A")).catch(() => null),
          Promise.resolve().then(() => backend.handover.get("B")).catch(() => null),
          backend.bstate.get("findings").catch(() => null),
        ]);
        chat.messages.push({
          role: "user", hidden: true,
          content: baueMomentKontext(
            {
              goals, agenda, momentLog, findings,
              qualitytime: await backend.bstate.get("qualitytime").catch(() => null),
              // S89: Die verwendete Runde wird per ID an der Chat-Struktur
              // persistiert (überlebt Reload wie die Tafel-Meta) — Anker für
              // [[META-REVEALED]] und Duplikat-Schutz des Lazy-Checks.
              messrunde: (() => { const r = bereiteRunde(measurements); if (r) chat.messrundeId = r.id; return r ? formatiereMessrunde(r, info.nameA, info.nameB) : null; })(),
              // S92 · Trajektorien-Material (nur wirksam zusammen mit messrunde, s. sessions.js)
              messVerlauf: formatiereVerlauf(measurements, info.nameA, info.nameB),
              sharings: [freiA, freiB].filter(Boolean),
            },
            info.nameA, info.nameB
          ),
        });
      }
      // Die Eröffnungs-Nachricht ist Steuerung fürs Modell, keine Äußerung der Person —
      // sie bleibt unsichtbar (hidden), und die Begleitung beginnt von sich aus.
      // S59 · Fertig ohne Verlauf (geheilter Zustand): Eröffnung ist der
      // NACHKLANG, nie der Kapitel-1-Start.
      const startText = einzelRueckkehr ? K().steuerTexte.einzelRueckkehr : K().steuerTexte.start[art];   // Korpus: Sprachfassung liefert prompts.<locale>.js
      await warteAntwort(() => state.engine.submitToolResult(startText, { hidden: true }));
    }
  }



  /* ---- D12-2d · Einstellungs-Blatt: Ansicht und Oberflächensprache.
     Beides ist persönlich und wirkt sofort — im Gegensatz zur Paarsprache,
     die in der Agenda ausgehandelt wird. Das Blatt sitzt in der Bedien-Ecke
     am Dokument, nicht in der App-Wurzel: es soll auf jedem Screen erreichbar
     sein, auch wenn die Wurzel gerade neu gebaut wird. ---- */
  const chrome = id => doc.getElementById(id);
  /* R4b · Einstellungsblatt und Paarsprache leben jetzt in
     einstellungen-screen.js — Abhaengigkeiten explizit statt ueber die Closure. */
  const { aktualisierePunkt, zeigeEinstellungen, verdrahteEinstellungen, zeigePaarsprache } =
    macheEinstellungenScreen({ doc, $, chrome, backend, state, err, relaunch, bestaetige });
  /* R4b · Die Wiedereinstiegs-Gruppe (Karte, Pflicht-Modal, Bauelement) lebt
     jetzt in recovery-screen.js. Ihre Abhaengigkeiten sind dort explizit statt
     ueber die Closure eingesammelt. */
  const { zeigeRecovery, zeigeEmailPflicht } =
    macheRecoveryScreen({ doc, $, backend, state, wurzel });

  /* S95.7e · Leseansicht. Eine eigene Flaeche ueber dem Vorraum, kein
     wiederverwendeter Chat: renderMsgs zoege Auswahlflaeche, Aufdeck-Tafeln,
     Stream-Blase, Skalen und Composer mit — nichts davon gehoert zu einem
     abgeschlossenen Gespraech. Lesen aendert nichts, deshalb gibt es hier
     weder Eingabe noch Knoepfe ausser dem Schliessen. */
  function verdrahteLeseansicht() {
    const zu = $("lesenZu");
    if (zu && !zu.dataset.rzVerdrahtet) {
      zu.dataset.rzVerdrahtet = "1";
      zu.addEventListener("click", schliesseLeseansicht);
    }
  }

  function oeffneLeseansicht(verlauf) {
    const box = $("boxLesen");
    if (!box) return;
    const kopf = $("lesenKopf"), inhalt = $("lesenInhalt");
    if (kopf) kopf.textContent = t("verlauf.leseTitel", {
      datum: new Date((verlauf && verlauf.at) || Date.now()).toLocaleDateString(getLocale()),
    });
    verdrahteLeseansicht();
    const n = zeichneReplay(inhalt, verlauf, el);
    if (!n && inhalt) inhalt.textContent = t("verlauf.leseLeer");
    box.classList.remove("pb-hidden");
    if (inhalt) inhalt.scrollTop = 0;
  }

  function schliesseLeseansicht() {
    const box = $("boxLesen");
    if (box) box.classList.add("pb-hidden");
  }

  /* S95.8b · Den angeforderten Verlauf in den Kontext geben.
     Die Antwort geht als Protokoll-Nachricht zurueck (RECALL-RESULT) — wie bei
     allen anderen App-Antworten. Findet sich nichts, sagt die Antwort das
     ausdruecklich: Der Begleiter soll die Luecke NICHT fuellen, sondern
     benennen und auf die Zeitleiste verweisen. */
  async function holeWortlaut(daten, engine) {
    const verlauf = await holeVerlauf(backend, daten && daten.vid);
    const sichtbar = ((verlauf && verlauf.messages) || [])
      .filter(m => !m.hidden && !istWireNachricht(m))
      .map(m => (m.role === "assistant" ? "B: " : "I: ") + cleanDisplay(m.content, [], ALLE_BLOECKE))
      .join("\n");
    const antwort = sichtbar
      ? "RECALL-RESULT\n" + fuelle(K().steuerTexte.abrufGefunden, { vid: daten.vid }) + "\n" + sichtbar
      : "RECALL-RESULT\n" + K().steuerTexte.abrufLeer;
    await warteAntwort(() => engine.submitToolResult(antwort));
  }

  /** Rueckfrage. Loeschen ist endgueltig und wird als solches benannt. */
  function bestaetige(text) {
    const w = doc.defaultView;
    return Promise.resolve(w && typeof w.confirm === "function" ? w.confirm(text) : true);
  }

  /* R4b · Die fuenf Vorraum-Ansichten (Zeitleiste, Regal, Agenda,
     Prozessreflexion, Gemeinsame Momente) leben jetzt in ansichten-screen.js.
     Ihre Abhaengigkeiten sind dort explizit.
     Die Erzeugung steht bewusst HIER und nicht weiter oben: zeigePaarsprache
     stammt aus der Einstellungs-Gruppe und muss vorher initialisiert sein. */
  const { zeigeZeitleiste, zeigeRegal, zeigeAgenda, zeigeMess, zeigeMomente } =
    macheAnsichtenScreen({ $, backend, state, zeigeNur, rhythmusSektion,
                           zeitleistenEintrag, zeigePaarsprache,
                           oeffneLeseansicht, bestaetige });

  // S71 · Verlässt jemand den Chat, stempeln wir den Pausenbeginn auf die
  // laufende Session — so bleibt eine kurze Rückkehr (< 5 Min) nahtlos, während
  // längere Abwesenheit das Wiedereinstiegs-Ritual auslöst. Wartet ein Panel
  // oder ein offener User-Zug, ist der Stempel folgenlos (die Zeremonie prüft
  // ohnehin auf einen freien Assistant-Zug).
  async function pausiereChat() {
    const e = state.engine;
    if (!e || !e.chat || e.chat.status !== "running") return;
    e.chat.pausedAt = Date.now();
    try { await backend.chat.save(state.chatShared ? "shared" : "mine", state.chatId, e.chat); }
    catch { /* Verlassen darf am Speichern nicht scheitern */ }
  }

  /* Verdrahtung — die Zurück-Wege führen in den Vorraum, aus dem man kam:
     Raum verlassen landet nicht mehr auf der Hauptübersicht, sondern im
     jeweiligen Vorraum (Erwartungs-Kontinuität, S35). Die Bedienelemente der
     Chat-Oberfläche binden seit S87 in verdrahteChat() bei jedem Aufbau. */
  verdrahteWegweiser(doc, $("wegBadgeStart"), $("wegStart"));   // D2: Badge auf der Naht
  verdrahteWegweiser(doc, $("wegBadgeMein"), $("wegMein"));     // D3: Vorraum mich
  verdrahteWegweiser(doc, $("wegBadgeTeil"), $("wegTeil"));     // D3: Vorraum uns
  $("btnMyRoom").addEventListener("click", () => betrete("scrMyRoom"));
  $("btnSharedRoom").addEventListener("click", () => betrete("scrShared"));
  $("btnZurueck1").addEventListener("click", () => betrete("scrStart"));
  $("btnZurueck2").addEventListener("click", () => betrete("scrStart"));
  $("btnSolo").addEventListener("click", () => startChat("solo").catch(e => err(e.message)));
  $("btnEinzel").addEventListener("click", () => startChat("einzel").catch(e => err(e.message)));
  $("btnGemeinsam").addEventListener("click", () => startChat("gemeinsam").catch(e => err(e.message)));
  $("btnMoment").addEventListener("click", () => startChat("moment").catch(e => err(e.message)));
  // D9/D12-2b · Klick auf den Bereich ÜBER dem Regal fährt es wieder herunter.
  // Der eigene Zu-Pfeil an der Zonen-Überschrift ist mit Turn 27 entfallen —
  // der Weg nach oben steht jetzt an der Sektionszeile selbst (regalModus).
  for (const screenId of ["scrMyRoom", "scrShared"]) {
    const screen = $(screenId);
    if (!screen) continue;
    const oben = screen.querySelector(".rz-half");
    if (oben) oben.addEventListener("click", () => regalZu(screen));
  }
  $("btnZeitleiste").addEventListener("click", () => infoToggle("boxZeitleiste", () => zeigeZeitleiste()).catch(e => err(e.message)));
  // U5/§1.3 · Der Wiedereinstieg klappt wie jede andere Regal-Zeile auf. Der
  // Inhalt steht schon (zeigeRecovery baut ihn beim Start), die Zeile schaltet
  // ihn nur sichtbar — deshalb kein Nachladen im Toggle.
  $("btnRecovery").addEventListener("click", () =>
    infoToggle("boxRecovery", () => $("boxRecovery").classList.remove("pb-hidden")).catch(e => err(e.message)));
  // S88 · Prozessreflexion ist eine HANDLUNG und bekommt wie jede Handlung
  // einen eigenen Raum (S44 hatte sie bereits an die Stelle der Auftrags-
  // klärung gesetzt — nur ihr Panel steckte noch als Klappe im Regal-Block).
  $("btnMess").addEventListener("click", () => { betrete("scrProzess"); zeigeMess().catch(e => err(e.message)); });
  $("btnZurueck3").addEventListener("click", () => betrete("scrMyRoom"));
  $("btnRegal").addEventListener("click", () => infoToggle("boxRegal", () => zeigeRegal()).catch(e => err(e.message)));
  $("btnAgenda").addEventListener("click", () => infoToggle("boxAgenda", () => zeigeAgenda()).catch(e => err(e.message)));
  $("btnQz").addEventListener("click", () => infoToggle("boxQz", () => zeigeMomente()).catch(e => err(e.message)));

  /* ---- Prozessreflexion (Mess-Runde, verdeckt — Aufdeckung im Moment) ---- */
  /* S39 · Sprach-Helfer für den vereinbarten Rhythmus. */


  /* S42 · Gemeinsame Momente: der geteilte Protokoll-Zeitstrahl. Hier liegen
     die Abschluss-Protokolle der Qualitätszeiten (und der Aufdeck-Runde) —
     chronologisch, nur lesbar, analog "Meine Zeitleiste". */


  /* S42/S76 · Abschluss-Knopf ("Session abschließen") in laufenden Sessions
     MIT eigenem Abschluss-Akt: Qualitätszeit (MOMENT-BLOCK) und Reflexions-
     gespräch (TIMELINE-BLOCK). Auftragsklärung und Gemeinsame Auflösung
     schließen über ihre eigenen Rituale (Freigabe bzw. Befund) — dort bleibt
     nur "Raum verlassen". */
  function aktualisiereChatEnde() {
    const b = $("btnChatEnde");
    const id = state.engine && state.engine.def && state.engine.def.id;
    if (b) b.classList.toggle("pb-hidden",
      !((id === "moment" || id === "solo") && state.engine.chat.status === "running"));
    aktualisiereWegweiserChat();   // T2i: der Wegweiser gehoert zur Schreibkante
  }

  /* S38 · Persönliche Zeitleiste fortschreiben (Auftragsklärung, Prozess-
     reflexion). Fehlertolerant — die Zeitleiste ist Chronik, kein Muss. */
  /* S95.7a · Ablage des Verlaufs.
     Die Reihenfolge von EXCERPT-BLOCK und Freigabe der Auftragsklaerung ist
     nicht garantiert. Statt sie zu erraten, deckt der Code BEIDE Faelle ab:
     Liegt die Kennung beim Schreiben des Eintrags vor, wird sie mitgegeben;
     trifft sie danach ein, wird der juengste Eintrag nachtraeglich ergaenzt. */
  async function ablegen(eignung, engine) {
    const id = await legeVerlaufAb(backend, {
      messages: engine && engine.chat ? engine.chat.messages : null, eignung,
    });
    if (!id) return null;
    state.verlaufId = id;
    await hefteVerlaufAn(id);
    return id;
  }

  /* S95.7b · Zeile statt Flaeche (K2): Eine eigene Flaeche machte aus einer
     Mitteilung ein Ereignis. Die Zeile haengt unter der Ausschnitt-Tuer. */
  function verlaufZeile(inhalt) {
    const p = $("ausschnittPanel");
    if (!p) return null;
    const z = el("div", "rz-klein-leise rz-oben-1");
    z.id = "verlaufZeile";
    z.innerHTML = inhalt;
    p.appendChild(z);
    return z;
  }

  async function verlaufSchritt(eignung, engine) {
    try {
      const modus = await verlaufEinstellung(backend);
      if (modus === "fragen") {
        /* Vorgabe der FRAGE ist nein: kein vorausgewaehltes Ja, keine Empfehlung. */
        const z = verlaufZeile(
          `${esc(t("verlauf.frage"))} ` +
          `<button class="pb-link" id="vlJa">${esc(t("verlauf.frageJa"))}</button> · ` +
          `<button class="pb-link" id="vlNein">${esc(t("verlauf.frageNein"))}</button>`);
        if (!z) return;
        z.querySelector("#vlNein").addEventListener("click", () => z.remove());
        z.querySelector("#vlJa").addEventListener("click", async () => {
          await ablegen(eignung, engine);
          z.remove();
        });
        return;
      }
      const id = await ablegen(eignung, engine);
      if (!id) return;
      /* Erst-Information: genau einmal, im selben Moment, in dem es zum ersten
         Mal geschieht — nicht rueckwirkend und nicht als Einladung. */
      if (await backend.pstate.get("verlaufInfoGezeigt")) return;
      verlaufZeile(esc(t("verlauf.erstInfo")));
      await backend.pstate.set("verlaufInfoGezeigt", true);
    } catch { /* Aufbewahren ist Komfort, kein Muss */ }
  }

  /** Kennung an den juengsten Zeitleisten-Eintrag heften, falls es ihn schon gibt. */
  async function hefteVerlaufAn(id) {
    try {
      const zl = await backend.pstate.get("timeline");
      if (!zl || !zl.entries || !zl.entries.length) return;      // Eintrag kommt noch
      const letzter = zl.entries[zl.entries.length - 1];
      if (letzter.vid) return;                                    // schon versorgt
      letzter.vid = id;
      await backend.pstate.set("timeline", zl);
      state.verlaufId = null;
    } catch { /* still */ }
  }

  async function zeitleistenEintrag(topic, summary, details) {
    try {
      const zl = (await backend.pstate.get("timeline")) || { entries: [] };
      const eintrag = { topics: [topic], summary, at: new Date().toISOString() };
      if (details && details.length) eintrag.details = details;   // S44: aufklappbare Punkte
      if (state.verlaufId) { eintrag.vid = state.verlaufId; state.verlaufId = null; }   // S95.7a
      zl.entries.push(eintrag);
      await backend.pstate.set("timeline", zl);
    } catch { /* Chronik ist Komfort, kein Muss */ }
  }

  /* ---- Kernwetten-Panels (Regler · Ranking · Startwerte · Freigabe) ---- */

  /* S34 · Skalen-Panel: ersetzt konversationale Zahlenfragen (Sicherheits-
   * skala, Nachbefragung). Beschriftung aus korpusTexte (Paarsprache) —
   * single point of Sicherheitsskalierung; das Modell fragt keine Zahl. */
  function scalePanel(art, engine) {
    const p = kw();
    p.classList.remove("pb-hidden");
    const kt = k => fuelle(KTX("scale." + art + "." + k), { partner: esc(state.info.partner) });
    const slider = id => `<input type="range" min="1" max="10" value="5" id="${id}" class="rz-voll">` +
      `<div class="pb-sub rz-reihe-verteilt"><span>${kt("min")}</span><strong id="${id}W">5</strong><span>${kt("max")}</span></div>`;
    const doppel = art === "closing";
    p.innerHTML =
      `<p class="rz-text"><strong>${kt("titel")}</strong></p>` +
      (KTX("scale." + art + ".text", true) ? `<p class="pb-sub">${kt("text")}</p>` : "") +
      (doppel
        ? `<p class="pb-sub">${esc(state.info.nameA)}</p>` + slider("scA") +
          `<p class="pb-sub rz-oben-3">${esc(state.info.nameB)}</p>` + slider("scB")
        : slider("scA")) +
      `<button class="pb-btn primary rz-oben-3" id="scOk">${t("scale.ok")}</button>`;
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
      `<p class="rz-text"><strong>${esc(titel)}</strong></p>` +
      karten.map((txt, i) => `<button class="pb-btn rz-blockknopf" data-ch="${i}">${esc(txt)}</button>`).join("") +
      `<button class="pb-btn rz-blockknopf-leise" data-ch="ohne">${esc(opt("ohne"))}</button>`;
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
        `<p class="rz-klein-abstand"><strong>${esc(d.t)}</strong><br><span class="pb-sub">${esc(d.d)}</span></p>` +
        `<label class="rz-fein-block">${esc(lw)}<br><input id="kwW" type="range" min="1" max="10" value="${vals[i].w}" class="rz-voll"></label>` +
        `<label class="rz-fein-block">${esc(lz)}<br><input id="kwZ" type="range" min="1" max="10" value="${vals[i].z}" class="rz-voll"></label>` +
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
        `<div class="pb-sub">${esc(titel)}</div><p class="rz-fein">${esc(desc)}</p>` +
        `<div id="kwStack">` +
        Array.from({ length: cfg.topN }, (_, pos) => {
          const ri = order[pos];
          return ri === undefined
            ? `<div class="pb-item pb-platz leer" data-platz="${pos}">${pos + 1}. <span class="pb-sub">${t("rank.frei")}</span></div>`
            : `<div class="pb-item pb-platz${gewaehlt === pos ? " gewaehlt" : ""}" data-platz="${pos}" draggable="true">${pos + 1}. ${esc(ITEMS[ri].label)} <button class="pb-btn rz-rechts-pille" data-raus="${ri}">✕</button></div>`;
        }).join("") + `</div><div id="kwPool" class="rz-abstand-2">` +
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
        `<p class="rz-klein">${t("sw.frage", { name: esc(namen[idx]) })}</p>` +
        `<input id="kwSW" type="range" min="1" max="10" value="5" class="rz-voll">` +
        `<div class="pb-sub rz-mitte" id="kwSWv">5</div>` +
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
      `<div class="rz-caps">${t("fg.titel")}</div>` +
      data.items.map((it, i) =>
        `<label class="rz-wahl"><input type="checkbox" data-fg="${i}" checked> <strong>${esc(it.id)}</strong> ${esc(it.text)}</label>`
      ).join("") +
      `${wieder ? `<p class="rz-klein">${t("fg.wieder", { partner: esc(state.info.partner) })}</p><label class="rz-wahl"><input type="checkbox" id="kwFgAufdeck"> ${t("fg.check")}</label>` : ""}<button class="rz-zeile rz-knopf-flach" id="kwFgOk"><span>${t("allg.freigeben")}</span><span class="rz-pfeil">→</span></button>` +
      `<button class="rz-zeile rz-knopf-flach" id="kwFgNein"><span>${t("allg.nochNicht")}</span><span class="rz-pfeil">→</span></button>`;
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
    if (rec) {
      const r = rec;
      rec = null;
      // G2 · rec.stop() genügt nicht: Web Speech liefert danach noch gequeute
      // Events aus, und pbInput EXISTIERT nach einem Neubau wieder — als Feld
      // des neuen Raums. Handler nullen nimmt dem Nachzügler den Code, nicht
      // nur das Ziel.
      r.onresult = r.onend = r.onerror = null;
      try { r.stop(); } catch { /* egal */ }
    }
    const mic = $("btnMic");
    if (!mic) return;   // S87: Abbau läuft auch ohne Chat-Oberfläche (leere Hülle)
    mic.innerHTML = IKON.mic;
    mic.setAttribute("data-icon", "mic");
    mic.classList.remove("primary");
  }
  function diktatStart() {
    if (!dk.SR) { hint(diktatTipp()); return; }          // keine Erkennung → OS-Tipp
    try { rec = new dk.SR(); } catch { hint(diktatTipp()); return; }
    const r = rec;   // S87/G2 · Selbst-Guard: pbInput existiert nach einem Neubau
    rec.lang = t("sprache.diktat");                    // wieder — als Feld des NEUEN Raums.
    rec.continuous = true;                             // Ein Nachzügler-Ereignis eines alten
    rec.interimResults = true;                         // Diktats darf dort nie hineinschreiben.
    rec.onresult = ev => {
      if (rec !== r) return;
      let final = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++)
        if (ev.results[i].isFinal) final += ev.results[i][0].transcript;
      if (final) {
        const t = $("pbInput");
        if (!t) return;
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
  // S87: btnMic bindet in verdrahteChat() bei jedem Aufbau der Chat-Oberfläche.

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
    // D12-2d · Die Ansicht folgt der Person. localStorage zeichnet SOFORT,
    // pstate ist die Wahrheit und holt die Wahl aufs nächste Gerät — aber es
    // wird NICHT abgewartet: eine Komfort-Einstellung darf den Start nie
    // aufhalten (dieselbe Regel wie bei der Kulisse). Der Boot lief sonst in
    // eine zusätzliche Runde durch die API, bevor die Sitzung stand.
    setzeAnsicht(doc, gemerkteAnsicht());
    verdrahteEinstellungen();
    aktualisierePunkt();
    backend.pstate.get("theme").then(w => {
      if (!w || w === gemerkteAnsicht()) return;
      merkeAnsicht(w);
      setzeAnsicht(doc, w);
    }).catch(() => { /* Umgebungen ohne pstate */ });
    doc.documentElement.lang = getLocale();
    $("pbHallo").textContent = t("allg.hallo", { name: state.info.name });
    setzeMarke();
    setzeSignatur();
    $("startHallo").textContent = t("start.hallo", { name: state.info.name });
    $("startIntro").textContent = t("start.intro");
    $("startMeinSub").textContent = t("start.meinSub", { partner: state.info.partner });
    $("startTeilSub").textContent = t("start.teilSub");
    $("meinIntro").textContent = t("mein.intro", { partner: state.info.partner });
    $("pbBusyTxt").textContent = t("allg.arbeitet");
    zeigeRecovery();
    betrete("scrStart");
    if (backend.recovery && state.info.emailRequired && !state.info.recoveryEmail) zeigeEmailPflicht();
  }

  // S62: testHooks exponiert Render/Stream für die Scroll-Disziplin-Tests.
  return { boot, show, startChat, _state: state, _err: err,
    engine: () => state.engine,
    testAusschnitt: eignung => ausschnittAngebot(eignung, state.engine),
    testHooks: { renderMsgs, zeigeStream: t2 => Promise.resolve(zeigeStream(t2)) } };
}
