// UI-Schicht — dünner DOM-Layer über Engine und Backend-Fassade.
// document wird injiziert (happy-dom-testbar); kein Storage-, kein Key-Wissen.

import { Engine } from "../engine/engine.js";
import { cleanDisplay } from "../contracts/block.js";
import { ALLE_BLOECKE } from "../contracts/registry.js";
import { soloDef, momentDef, quereGate, baueMomentKontext, markiereGelesen, hebeInAgenda, raeumeAgendaAb } from "./sessions.js";
import { einzelDef, gemeinsamDef, aufdeckDef, RANK_ITEMS, RANK_MODES, reglerErgebnis, rankingErgebnis, startwerteErgebnis, KAPITEL_TITEL, beruehrungen, baueAufdeckung, baueAufdeckKontext, baueKlaerungsKontext } from "./kernwetten.js";
import { DOMAINS } from "../prompts/prompts.js";
import { trageMessbeitragEin, bereiteRunde, formatiereMessrunde, markiereAufgedeckt, qzStufe, QZ_STUFEN_TEXT, baueQzMaterial, qzDef, waehleEinladung, keineEinladung, vereinbarePause } from "./prozess.js";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function createApp({ doc, backend, root, diktat }) {
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
  const state = { info: null, engine: null, chatId: null, screen: null };

  const wurzel = root || doc.getElementById("app");
  wurzel.innerHTML = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,500;1,6..72,300&display=swap');
      :root{
        --bg1:#f7f4ea;--bg2:#edf1e2;--ink:#313c31;--ink-soft:#64705c;--ink-faint:#909a86;
        --accent:#7ba05b;--accent-ink:#41562c;--me-bg:#7ba05b;--me-ink:#ffffff;
        --card:rgba(255,255,255,.60);--card-bd:rgba(90,110,80,.15);
        --ai-bg:rgba(255,255,255,.72);--ai-bd:rgba(90,110,80,.13);
        --field:rgba(255,255,255,.74);--field-bd:rgba(90,110,80,.22);
      }
      html[data-theme=dark]{
        --bg1:#2a3a34;--bg2:#151f1c;--ink:#edf1e8;--ink-soft:#b3c1aa;--ink-faint:#889481;
        --accent:#aeca8d;--accent-ink:#e2ecd4;--me-bg:#5b7a51;--me-ink:#f4f7ef;
        --card:rgba(255,255,255,.055);--card-bd:rgba(255,255,255,.10);
        --ai-bg:rgba(255,255,255,.06);--ai-bd:rgba(255,255,255,.09);
        --field:rgba(255,255,255,.06);--field-bd:rgba(255,255,255,.16);
      }
      body{margin:0;background:linear-gradient(172deg,var(--bg1),var(--bg2));background-attachment:fixed;transition:background .5s}
      #app{max-width:660px;position:relative;z-index:1;font-family:"Newsreader",Georgia,'Times New Roman',serif;
           color:var(--ink);font-size:18px;line-height:1.72;padding:46px 22px 34vh}
      .pb-kulisse{position:fixed;inset:auto 0 0 0;height:84vh;z-index:0;pointer-events:none;overflow:hidden}
      .pb-kulisse svg{position:absolute;bottom:0;left:0;width:100%;height:100%}
      .pb-baeume{display:block} html[data-theme=dark] .pb-baeume{display:none}
      .pb-seerosen{display:none} html[data-theme=dark] .pb-seerosen{display:block}
      .pb-hidden{display:none!important}
      .pb-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:30px}
      .pb-brand{display:flex;flex-direction:column;gap:3px}
      .pb-h1{font-size:31px;font-weight:300;margin:0;letter-spacing:.005em;line-height:1.15}
      .pb-sub{color:var(--ink-faint);font-size:13px}
      .pb-brand .pb-sub{letter-spacing:.2em;text-transform:uppercase;font-size:12px}
      .pb-card{background:var(--card);border:1px solid var(--card-bd);border-radius:18px;padding:24px 26px;margin:16px 0;
               backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
      .pb-btn{display:inline-block;border:1px solid var(--accent);background:transparent;color:var(--accent-ink);
              border-radius:999px;padding:10px 22px;font-family:inherit;font-size:16px;cursor:pointer;margin:6px 8px 0 0;transition:.22s}
      .pb-btn:hover{background:var(--accent);color:var(--me-ink)}
      .pb-btn.primary{background:var(--accent);color:var(--me-ink)}
      .pb-btn.primary:hover{filter:brightness(1.05)}
      .pb-msgs{display:flex;flex-direction:column;gap:13px;margin:16px 0}
      .pb-msg{max-width:82%;padding:14px 19px;border-radius:19px;font-size:17px;line-height:1.62;white-space:pre-wrap}
      .pb-msg.ai{background:var(--ai-bg);border:1px solid var(--ai-bd);align-self:flex-start;border-bottom-left-radius:6px;
                 backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
      .pb-msg.me{background:var(--me-bg);color:var(--me-ink);align-self:flex-end;border-bottom-right-radius:6px}
      .pb-composer{display:flex;gap:8px;margin-top:6px}
      .pb-composer textarea{flex:1;border:1px solid var(--field-bd);background:var(--field);color:var(--ink);
              border-radius:14px;padding:12px 14px;font:inherit;font-size:17px;min-height:46px}
      .pb-typing{display:inline-flex;gap:5px;align-items:center;min-height:14px}
      .pb-typing span{width:7px;height:7px;border-radius:50%;background:var(--ink-faint);animation:pbBlink 1.2s infinite}
      .pb-typing span:nth-child(2){animation-delay:.2s}.pb-typing span:nth-child(3){animation-delay:.4s}
      @keyframes pbBlink{0%,80%,100%{opacity:.25}40%{opacity:1}}
      .pb-skala{display:none;gap:12px;align-items:center;background:var(--card);border:1px solid var(--card-bd);
                border-radius:16px;padding:12px 16px;margin:0 0 10px;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
      .pb-skala.offen{display:flex}
      .pb-skala input[type=range]{flex:1;accent-color:var(--accent)}
      .pb-skala .wert{font-weight:500;min-width:26px;text-align:center;color:var(--accent-ink);font-size:19px}
      .pb-msg.ai strong{font-weight:500}
      .pb-msg.ai code{background:var(--ai-bd);border-radius:4px;padding:0 4px;font-family:ui-monospace,Menlo,monospace;font-size:14px}
      .pb-err{background:rgba(188,74,74,.12);border:1px solid rgba(188,74,74,.34);border-radius:12px;padding:11px 15px;font-size:15px;margin:12px 0}
      .pb-item{border-bottom:1px solid var(--card-bd);padding:11px 0;font-size:16px}
      .pb-theme{position:fixed;top:18px;right:16px;z-index:6;display:flex;gap:3px;background:var(--card);
                border:1px solid var(--card-bd);border-radius:999px;padding:4px;backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px)}
      .pb-theme button{font-family:inherit;font-size:14px;border:0;background:transparent;color:var(--ink-soft);
                border-radius:999px;padding:6px 14px;cursor:pointer;transition:.2s}
      .pb-theme button.an{background:var(--accent);color:var(--me-ink)}
    </style>
    <div class="pb-kulisse" aria-hidden="true">
      <svg class="pb-baeume" viewBox="0 0 1200 850" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><defs>
      <symbol id="pbTanne" viewBox="0 0 100 200"><rect x="45" y="178" width="10" height="22" fill="currentColor"/><polygon points="50,86 12,180 88,180" fill="currentColor"/><polygon points="50,44 22,124 78,124" fill="currentColor"/><polygon points="50,8 31,74 69,74" fill="currentColor"/></symbol>
      <symbol id="pbLaub" viewBox="0 0 100 200"><rect x="45" y="128" width="10" height="72" fill="currentColor"/><g fill="currentColor"><ellipse cx="50" cy="80" rx="45" ry="58"/><circle cx="34" cy="50" r="21"/><circle cx="66" cy="52" r="21"/><circle cx="50" cy="38" r="23"/></g></symbol></defs>
      <path d="M0 700 Q300 664 600 700 T1200 700 V850 H0Z" fill="#dbe4cc" opacity=".55"/>
      <g color="#d3ddc1" opacity=".6"><use href="#pbLaub" x="270" y="410" width="220" height="440"/><use href="#pbTanne" x="430" y="470" width="190" height="380"/><use href="#pbLaub" x="782" y="452" width="205" height="410"/><use href="#pbTanne" x="70" y="512" width="170" height="340"/></g>
      <g color="#bcca9f" opacity=".86"><use href="#pbTanne" x="50" y="120" width="360" height="730"/><use href="#pbLaub" x="452" y="252" width="300" height="600"/><use href="#pbTanne" x="648" y="352" width="250" height="500"/><use href="#pbLaub" x="902" y="330" width="266" height="520"/></g></svg>
      <svg class="pb-seerosen" viewBox="0 0 1200 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><defs>
      <symbol id="pbPad" viewBox="0 0 100 100"><path d="M50 4 A46 46 0 1 1 49 4 L50 50 Z" fill="currentColor"/></symbol>
      <symbol id="pbRose" viewBox="0 0 100 100"><g fill="currentColor" fill-opacity=".82"><path d="M50 5 C57 30 56 46 50 60 C44 46 43 30 50 5Z"/><path d="M50 5 C57 30 56 46 50 60 C44 46 43 30 50 5Z" transform="rotate(30 50 54)"/><path d="M50 5 C57 30 56 46 50 60 C44 46 43 30 50 5Z" transform="rotate(60 50 54)"/><path d="M50 5 C57 30 56 46 50 60 C44 46 43 30 50 5Z" transform="rotate(90 50 54)"/><path d="M50 5 C57 30 56 46 50 60 C44 46 43 30 50 5Z" transform="rotate(120 50 54)"/><path d="M50 5 C57 30 56 46 50 60 C44 46 43 30 50 5Z" transform="rotate(150 50 54)"/><path d="M50 5 C57 30 56 46 50 60 C44 46 43 30 50 5Z" transform="rotate(180 50 54)"/><path d="M50 5 C57 30 56 46 50 60 C44 46 43 30 50 5Z" transform="rotate(210 50 54)"/><path d="M50 5 C57 30 56 46 50 60 C44 46 43 30 50 5Z" transform="rotate(240 50 54)"/><path d="M50 5 C57 30 56 46 50 60 C44 46 43 30 50 5Z" transform="rotate(270 50 54)"/><path d="M50 5 C57 30 56 46 50 60 C44 46 43 30 50 5Z" transform="rotate(300 50 54)"/><path d="M50 5 C57 30 56 46 50 60 C44 46 43 30 50 5Z" transform="rotate(330 50 54)"/></g><g fill="currentColor"><path d="M50 22 C55 37 55 48 50 58 C45 48 45 37 50 22Z" transform="rotate(15 50 54)"/><path d="M50 22 C55 37 55 48 50 58 C45 48 45 37 50 22Z" transform="rotate(45 50 54)"/><path d="M50 22 C55 37 55 48 50 58 C45 48 45 37 50 22Z" transform="rotate(75 50 54)"/><path d="M50 22 C55 37 55 48 50 58 C45 48 45 37 50 22Z" transform="rotate(105 50 54)"/><path d="M50 22 C55 37 55 48 50 58 C45 48 45 37 50 22Z" transform="rotate(135 50 54)"/><path d="M50 22 C55 37 55 48 50 58 C45 48 45 37 50 22Z" transform="rotate(165 50 54)"/><path d="M50 22 C55 37 55 48 50 58 C45 48 45 37 50 22Z" transform="rotate(195 50 54)"/><path d="M50 22 C55 37 55 48 50 58 C45 48 45 37 50 22Z" transform="rotate(225 50 54)"/><path d="M50 22 C55 37 55 48 50 58 C45 48 45 37 50 22Z" transform="rotate(255 50 54)"/><path d="M50 22 C55 37 55 48 50 58 C45 48 45 37 50 22Z" transform="rotate(285 50 54)"/><path d="M50 22 C55 37 55 48 50 58 C45 48 45 37 50 22Z" transform="rotate(315 50 54)"/><path d="M50 22 C55 37 55 48 50 58 C45 48 45 37 50 22Z" transform="rotate(345 50 54)"/></g><circle cx="50" cy="54" r="7" fill="currentColor"/></symbol></defs>
      <path d="M0 610 Q320 584 640 610 T1200 610 V900 H0Z" fill="#ffffff" opacity=".03"/>
      <path d="M0 770 Q300 748 600 770 T1200 770 V900 H0Z" fill="#ffffff" opacity=".035"/>
      <g color="#ffffff"><use href="#pbPad" x="-120" y="560" width="560" height="560" opacity=".10" transform="rotate(-12 160 840)"/><use href="#pbPad" x="770" y="600" width="540" height="540" opacity=".11" transform="rotate(26 1040 870)"/><use href="#pbPad" x="300" y="690" width="400" height="400" opacity=".13" transform="rotate(-28 500 890)"/></g>
      <g color="#ffffff"><use href="#pbRose" x="120" y="612" width="270" height="270" opacity=".52"/><use href="#pbRose" x="712" y="686" width="228" height="228" opacity=".44"/><use href="#pbRose" x="452" y="548" width="168" height="168" opacity=".34"/></g></svg>
    </div>
    <div class="pb-theme" role="group" aria-label="Ansicht">
      <button id="pbHell" type="button">Hell</button>
      <button id="pbDunkel" type="button">Dunkel</button>
    </div>
    <div class="pb-top">
      <h1 class="pb-h1" id="pbHallo"></h1>
      <span class="pb-sub" id="pbKern"></span>
    </div>
    <div id="pbErr" class="pb-err pb-hidden"></div>
    <div id="pbHint" class="pb-card pb-hidden" style="border-color:#e2d9a8;background:#fbf7e4;font-size:13px"></div>
    <div id="scrStart">
      <div class="pb-card">
        <div id="startHallo" style="font-size:17px;font-weight:650;margin-bottom:4px"></div>
        <p class="pb-sub" id="startIntro" style="margin:0 0 12px"></p>
        <button class="pb-btn primary" id="btnMyRoom">Mein Raum</button>
        <p class="pb-sub" id="startMeinSub" style="margin:4px 0 12px"></p>
        <button class="pb-btn primary" id="btnSharedRoom">Gemeinsamer Raum</button>
        <p class="pb-sub" id="startTeilSub" style="margin:4px 0 0"></p>
      </div>
    </div>
    <div id="scrMyRoom" class="pb-hidden">
      <div class="pb-card">
        <div style="font-size:16px;font-weight:650;margin-bottom:4px">Mein Raum</div>
        <p class="pb-sub" id="meinIntro" style="margin:0 0 12px"></p>
        <button class="pb-btn primary" id="btnSolo">Reflexionsgespräch beginnen</button>
        <button class="pb-btn primary" id="btnEinzel">Auftragsklärung beginnen</button>
        <button class="pb-btn" id="btnZeitleiste">Meine Zeitleiste</button>
        <button class="pb-btn" id="btnMess">Prozessreflexion</button>
        <button class="pb-btn" id="btnZurueck1">← Zurück</button>
      </div>
      <div class="pb-card pb-hidden" id="boxZeitleiste"><div class="pb-sub">Zeitleiste</div><div id="zlItems"></div></div>
      <div class="pb-card pb-hidden" id="boxMess"></div>
      <div class="pb-card pb-hidden" id="boxRecovery"></div>
    </div>
    <div id="scrShared" class="pb-hidden">
      <div class="pb-card">
        <div style="font-size:16px;font-weight:650;margin-bottom:4px">Gemeinsamer Raum</div>
        <p class="pb-sub" id="sharedIntro" style="margin:0 0 12px">Hier liegt nur, was freigegeben wurde — und alles, was ihr zu zweit macht.</p>
        <button class="pb-btn primary" id="btnMoment">Gemeinsame Session beginnen</button>
        <button class="pb-btn primary" id="btnAufdeck">Aufdeck-Runde beginnen</button>
        <button class="pb-btn primary" id="btnGemeinsam">Gemeinsame Klärung beginnen</button>
        <button class="pb-btn" id="btnRegal">Regal ansehen</button>
        <button class="pb-btn" id="btnAgenda">Agenda ansehen</button>
        <button class="pb-btn" id="btnQz">Gemeinsame Momente</button>
        <button class="pb-btn" id="btnZurueck2">← Zurück</button>
      </div>
      <div class="pb-card pb-hidden" id="boxRegal"><div class="pb-sub">Regal — zum Lesen, wenn du magst</div><p class="pb-sub" style="margin:6px 0 4px">Kein Posteingang: Hier liegt, was eine Person aus ihrer Einzelreflexion lesbar gemacht hat — als ihre Erfahrung, nicht als Nachricht oder Anforderung. Reagieren ist frei; der beste Ort dafür ist das Gespräch.</p><div id="regalItems"></div></div>
      <div class="pb-card pb-hidden" id="boxAgenda"><div class="pb-sub">Gemeinsame Agenda</div><div id="agendaItems"></div></div>
      <div class="pb-card pb-hidden" id="boxQz"></div>
    </div>
    <div id="scrChat" class="pb-hidden">
      <div class="pb-card">
        <div class="pb-sub" id="chatTitel"></div>
        <div class="pb-msgs" id="pbMsgs"></div>
        <div id="gatePanel" class="pb-card pb-hidden"></div>
        <div id="kwPanel" class="pb-card pb-hidden"></div>
        <div class="pb-skala" id="pbSkala">
          <span style="font-size:13px;color:#5a6675">Deine Zahl:</span>
          <input type="range" id="pbSkalaRange" min="1" max="10" step="1" value="7">
          <span class="wert" id="pbSkalaWert">7</span>
          <button class="pb-btn primary" id="pbSkalaSend" style="white-space:nowrap">Senden</button>
        </div>
        <div class="pb-composer" id="pbComposer">
          <textarea id="pbInput" placeholder="Deine Nachricht…"></textarea>
          <button class="pb-btn" id="btnMic" title="Diktieren">🎤</button>
          <button class="pb-btn primary" id="btnSend">Senden</button>
        </div>
        <button class="pb-btn" id="btnChatZurueck">← Raum verlassen</button>
      </div>
    </div>`;

  const $ = id => wurzel.querySelector("#" + id);
  const screens = ["scrStart", "scrMyRoom", "scrShared", "scrChat"];
  function show(id) {
    state.screen = id;
    for (const s of screens) $(s).classList.toggle("pb-hidden", s !== id);
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

  function renderMsgs() {
    const box = $("pbMsgs");
    box.innerHTML = "";
    if (state.engine) {
      for (const m of state.engine.chat.messages) {
        if (m.hidden) continue;
        const d = el("div", "pb-msg " + (m.role === "assistant" ? "ai" : "me"));
        if (m.role === "assistant") d.innerHTML = mdRender(cleanDisplay(m.content, [], ALLE_BLOECKE));
        else d.textContent = cleanDisplay(m.content, [], ALLE_BLOECKE);
        box.appendChild(d);
      }
    }
    if (state.warten) {
      const d = el("div", "pb-msg ai");
      d.innerHTML = '<span class="pb-typing" aria-label="Die Begleitung schreibt"><span></span><span></span><span></span></span>';
      box.appendChild(d);
    }
    box.scrollTop = box.scrollHeight;
    aktualisiereSkala();
  }

  /** Zentraler Sendeweg: User-Text SOFORT zeigen, Ladezustand, dann Antwort. */
  async function sende(text) {
    if (!text || !state.engine || state.warten) return;
    state.warten = true;
    $("btnSend").disabled = true;
    const laeuft = state.engine.sendUser(text);   // pusht die Nachricht synchron …
    renderMsgs();                                 // … darum ist sie hier schon sichtbar
    try {
      await laeuft;
      hint(backend.llm && backend.llm.kontingent ? backend.llm.kontingent.hinweis : null);
    } catch (e) { err(e.message); }
    finally {
      state.warten = false;
      $("btnSend").disabled = false;
      renderMsgs();
    }
  }

  function gatePanel(data, engine) {
    const p = $("gatePanel");
    p.classList.remove("pb-hidden");
    const wegName = { selbst: "Selbst ansprechen", regal: "Ins Regal legen (Einblick)", moment: "Auf die Agenda (Thema)" };
    p.innerHTML =
      `<div class="pb-sub">Deine Selbstmitteilung zur Freigabe</div>` +
      `<p style="font-size:14px">${esc(data.selbstmitteilung)}</p>` +
      (data.wunsch ? `<p class="pb-sub">Wunsch: ${esc(data.wunsch)}</p>` : "") +
      data.wege.map(w => `<label style="display:block;font-size:14px;margin:4px 0"><input type="checkbox" data-weg="${w}"> ${wegName[w]}</label>`).join("") +
      `<button class="pb-btn primary" id="btnGateOk">Freigeben</button>` +
      `<button class="pb-btn" id="btnGateNein">Noch nicht</button>`;
    p.querySelector("#btnGateOk").addEventListener("click", async () => {
      const wege = [...p.querySelectorAll("input:checked")].map(x => x.getAttribute("data-weg"));
      p.classList.add("pb-hidden");
      try {
        await quereGate(backend, data, wege);
        await engine.submitToolResult(
          wege.length ? "FREIGABE-ERGEBNIS: gequert über " + wege.join(", ") : "FREIGABE-ERGEBNIS: nichts gequert"
        );
        renderMsgs();
      } catch (e) { err(e.message); }
    });
    p.querySelector("#btnGateNein").addEventListener("click", async () => {
      p.classList.add("pb-hidden");
      await engine.submitToolResult("FREIGABE-ERGEBNIS: Ich möchte noch weiter daran arbeiten.");
      renderMsgs();
    });
  }

  /* ── Kapitel-Zwischenhalt (Einzelsession) ──
     Nach Kapitel 3 zuerst das Mini-Gate. Die Entscheidung landet NIE im
     Transkript — nur im privaten Chat-Feld (minigate) und, bei Ja, als
     Datenpaket (Top 5 + Tipp 3) im geteilten Bstate-Feld "aufdeckung". */
  async function kapitelPanel(n, engine) {
    engine.chat.kapitel = n;
    await backend.chat.save(state.chatShared ? "shared" : "mine", state.chatId, engine.chat);
    const p = kw();
    p.classList.remove("pb-hidden");
    const dots = "●".repeat(n) + "○".repeat(4 - n);
    const gateOffen = n === 3 && !engine.chat.minigate;
    const gateHtml = !gateOffen ? "" :
      `<p style="font-size:14px"><strong>Eine Frage zur Aufdeck-Runde:</strong> Hättest du Freude daran, wenn ihr eure Top 5 in der Aufdeck-Runde einander preisgebt – auch wenn der Gedanke im ersten Moment vielleicht etwas Aufregung und Unsicherheit auslöst?</p>` +
      `<p class="pb-sub">Gezeigt würden dabei nur: deine Top 5 und deine drei Tipps für ${esc(state.info.partner)} – nichts aus eurem Gespräch hier.</p>` +
      `<button class="pb-btn primary" id="kapJa">Ja, gern</button><button class="pb-btn primary" id="kapNein">Noch nicht</button>`;
    p.innerHTML =
      `<div class="pb-sub">Kapitel ${n} geschafft – ${esc(KAPITEL_TITEL[n - 1])}</div>` +
      `<div style="letter-spacing:5px;font-size:16px;margin:4px 0 10px">${dots}</div>` + gateHtml +
      `<div id="kapWeiter"${gateOffen ? ' class="pb-hidden"' : ""}>` +
      `<button class="pb-btn primary" id="kapNext">Weitermachen: Kapitel ${n + 1} · ${esc(KAPITEL_TITEL[n])}</button>` +
      `<button class="pb-btn" id="kapPause">Pause machen</button></div>` +
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
          const alle = (await backend.bstate.get("aufdeckung")) || { A: null, B: null };
          alle[state.info.role] = eintrag;
          await backend.bstate.set("aufdeckung", alle);
          engine.chat.minigate = "ja";
          await backend.chat.save(state.chatShared ? "shared" : "mine", state.chatId, engine.chat);
          zeigeWeiter("Schön – die Aufdeck-Runde wird startbar, sobald ihr beide so weit seid.");
        } catch (e) { err(e.message); }
      });
      p.querySelector("#kapNein").addEventListener("click", async () => {
        engine.chat.minigate = "nein";
        await backend.chat.save(state.chatShared ? "shared" : "mine", state.chatId, engine.chat);
        zeigeWeiter("Alles gut – das bleibt bei dir. Beim Abschluss fragt die App noch genau einmal, danach nicht mehr.");
      });
    }
    p.querySelector("#kapNext").addEventListener("click", async () => {
      kwZu();
      await engine.submitToolResult("[Weiter mit Kapitel " + (n + 1) + ".]", { hidden: true });
      renderMsgs();
    });
    p.querySelector("#kapPause").addEventListener("click", () => {
      kwZu();
      show("scrMyRoom");
      err("Gespeichert – du kannst jederzeit genau hier weitermachen.");
    });
  }
  
  /* ── Aufdeck-Tafel: beide Richtungen simultan, Berührungspunkte markiert,
     strukturell keine Quote und kein Zählen. Bleibt während des Gesprächs
     sichtbar. ── */
  async function aufdeckPanel(engine) {
    const alle = (await backend.bstate.get("aufdeckung")) || {};
    const gA = alle.A, gB = alle.B;
    if (!gA || !gB) { err("Aufdeck-Daten fehlen – bitte die Runde neu beginnen."); return; }
    const p = kw();
    p.classList.remove("pb-hidden");
    const spalte = (titel, liste, marks) =>
      `<div style="flex:1;min-width:150px"><div class="pb-sub">${esc(titel)}</div>` +
      liste.map((x, i) => `<div class="pb-item"${marks.includes(x) ? ' style="font-weight:700;border-left:3px solid var(--accent,#0f766e);padding-left:8px"' : ""}>${i + 1}. ${esc(x)}</div>`).join("") + `</div>`;
    const richtung = (tipper, owner) => {
      const treff = beruehrungen(tipper.tipp3, owner.top5);
      return `<div style="margin-top:12px"><div class="pb-sub">${esc(tipper.name)} hat getippt, was ${esc(owner.name)} am Herzen liegt</div>` +
        `<div style="display:flex;gap:10px;flex-wrap:wrap">` + spalte("Tipp von " + tipper.name, tipper.tipp3, treff) + spalte("Top 5 von " + owner.name, owner.top5, treff) + `</div>` +
        (treff.length ? `<p class="pb-sub">Berührungspunkte: ${treff.map(esc).join(" · ")}</p>`
                      : `<p class="pb-sub">Zwei verschiedene Blicke – Stoff für ein gutes Gespräch.</p>`) + `</div>`;
    };
    p.innerHTML =
      `<div class="pb-sub">Aufdeckung – beide Richtungen gleichzeitig</div>` +
      `<p style="font-size:13px">Kein richtig, kein falsch, keine Punkte: Markiert ist, wo Tipp und Stapel einander berühren. Unterschiede sind ein Befund über zwei Blickwinkel – und oft das beste Gesprächsmaterial.</p>` +
      richtung(gB, gA) + richtung(gA, gB) +
      (engine.chat.adShown ? `<button class="pb-btn" id="adZu">Tafel ausblenden</button>`
                           : `<button class="pb-btn primary" id="adWeiter">Weiter im Gespräch</button>`);
    const w = p.querySelector("#adWeiter");
    if (w) w.addEventListener("click", async () => {
      engine.chat.adShown = true;
      w.remove();   // Tafel bleibt sichtbar
      const zu = doc.createElement("button");
      zu.className = "pb-btn"; zu.textContent = "Tafel ausblenden";
      zu.addEventListener("click", kwZu);
      p.appendChild(zu);
      await engine.submitToolResult("AUFDECKUNG-ANGEZEIGT: Die App hat beiden beide Richtungen gleichzeitig gezeigt – Stapel und Tipps nebeneinander, Berührungspunkte hervorgehoben; die Tafel bleibt sichtbar. Führe nun durch das Gespräch: Berührungspunkte zuerst, dann die Unterschiede mit Neugier.", { hidden: true });
      renderMsgs();
    });
    const z = p.querySelector("#adZu");
    if (z) z.addEventListener("click", kwZu);
  }
  
  async function startChat(art) {
    err("");
    const info = state.info;
    const hooks = {
      onGate: (d, e2) => gatePanel(d, e2),
      onRegler: e2 => reglerPanel(e2),
      onRanking: (mode, e2) => rankPanel(mode, e2),
      onStartwerte: e2 => startwertePanel(e2),
      onFreigabe: (d, e2) => freigabePanel(d, e2),
      onKapitel: (n, e2) => kapitelPanel(n, e2),
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
    const gespeichert = await backend.chat.load(def.shared ? "shared" : "mine", art);
    state.chatShared = def.shared;
    // G1 vor G2: Sind beide Aufdeck-Freigaben da, aber kein Protokoll, kommt
    // erst die Aufdeck-Runde (verbinden vor verhandeln). Ohne beide Mini-Gates
    // läuft der kollabierte Pfad — die Klärung startet direkt.
    if (art === "gemeinsam" && !gespeichert) {
      const [alleG, protokollG] = await Promise.all([
        backend.bstate.get("aufdeckung").catch(() => null),
        backend.bstate.get("aufdeckprotokoll").catch(() => null),
      ]);
      if (alleG && alleG.A && alleG.B && !protokollG)
        throw new Error("Die Aufdeck-Runde wartet noch auf euch – sie kommt vor der Klärung.");
    }
    if (art === "aufdeck" && !gespeichert) {
      const alleA = (await backend.bstate.get("aufdeckung")) || {};
      if (!alleA.A || !alleA.B)
        throw new Error("Die Aufdeck-Runde öffnet erst, wenn beide sie gewählt haben und so weit sind.");
    }
    const chat = gespeichert || { messages: [], status: "running" };
    const ctx = { me: info.name, partner: info.partner, nameA: info.nameA, nameB: info.nameB };
    state.engine = new Engine({
      def, chat, llm: backend.llm, ctx,
      hooks: {
        onSave: c => backend.chat.save(def.shared ? "shared" : "mine", art, c),
        onPersonError: err,
        onRender: renderMsgs,
      },
    });
    $("chatTitel").textContent = def.titel;
    show("scrChat");
    renderMsgs();
    if (chat.messages.length) { await state.engine.resume(); } else {
      if (art === "gemeinsam") {
        const [freiA, freiB, protokoll] = await Promise.all([
          Promise.resolve().then(() => backend.uebergabe.get("A")).catch(() => null),
          Promise.resolve().then(() => backend.uebergabe.get("B")).catch(() => null),
          backend.bstate.get("aufdeckprotokoll").catch(() => null),
        ]);
        if (freiA && freiB)
          chat.messages.push({ role: "user", hidden: true, content: baueKlaerungsKontext(freiA, freiB, protokoll) });
      }
      if (art === "aufdeck") {
        const alle = (await backend.bstate.get("aufdeckung")) || {};
        chat.messages.push({ role: "user", hidden: true, content: baueAufdeckKontext(alle.A, alle.B) });
      }
      if (art === "moment") {
        const [auftraege, agenda, momentprotokoll, messrunden, freiA, freiB] = await Promise.all([
          backend.bstate.get("auftraege"), backend.bstate.get("agenda"),
          backend.bstate.get("momentprotokoll"), backend.bstate.get("messrunden"),
          Promise.resolve().then(() => backend.uebergabe.get("A")).catch(() => null),
          Promise.resolve().then(() => backend.uebergabe.get("B")).catch(() => null),
        ]);
        chat.messages.push({
          role: "user", hidden: true,
          content: baueMomentKontext(
            {
              auftraege, agenda, momentprotokoll,
              messrunde: (() => { const r = bereiteRunde(messrunden); return r ? formatiereMessrunde(r, info.nameA, info.nameB) : null; })(),
              freigaben: [freiA, freiB].filter(Boolean),
            },
            info.nameA, info.nameB
          ),
        });
      }
      // Die Eröffnungs-Nachricht ist Steuerung fürs Modell, keine Äußerung der Person —
      // sie bleibt unsichtbar (hidden), und die Begleitung beginnt von sich aus.
      const startText = {
        solo: "Ich bin da und möchte beginnen. Eröffne das Gespräch von dir aus.",
        einzel: "Ich bin da und möchte mit der Auftragsklärung beginnen. Eröffne die Session von dir aus.",
        gemeinsam: "Wir sind beide da und möchten mit der gemeinsamen Klärung beginnen. Eröffne die Session von dir aus.",
        aufdeck: "Wir sind beide da und möchten die Aufdeck-Runde beginnen. Eröffne die Session von dir aus.",
        moment: "Wir sind beide da und möchten beginnen. Eröffne die Session von dir aus.",
      }[art];
      state.warten = true;
      $("btnSend").disabled = true;
      renderMsgs();
      try { await state.engine.submitToolResult(startText, { hidden: true }); }
      catch (e) { err(e.message); }
      finally { state.warten = false; $("btnSend").disabled = false; renderMsgs(); }
    }
  }

  async function zeigeZeitleiste() {
    const zl = (await backend.pstate.get("zeitleiste")) || { eintraege: [] };
    $("boxZeitleiste").classList.remove("pb-hidden");
    $("zlItems").innerHTML = zl.eintraege.length
      ? zl.eintraege.map(e2 => `<div class="pb-item"><strong>${esc((e2.themen || []).join(" · "))}</strong><br>${esc(e2.zusammenfassung)}</div>`).join("")
      : `<div class="pb-item">Noch keine Einträge — sie entstehen aus deinen Reflexionsgesprächen, mit Datum und Kurzfassung.</div>`;
  }

  async function zeigeRegal() {
    const regal = (await backend.bstate.get("regal")) || { items: [] };
    $("boxRegal").classList.remove("pb-hidden");
    $("regalItems").innerHTML = regal.items.length
      ? regal.items.map(i => {
          const fremd = i.von !== state.info.name;
          return `<div class="pb-item">${esc(i.text)}` +
            (i.wunsch ? `<br><span class="pb-sub">Wunsch: ${esc(i.wunsch)}</span>` : "") +
            `<br><span class="pb-sub">von ${esc(i.von)}${i.gelesen ? " · gelesen" : ""}${i.gehoben ? " · in der Agenda" : ""}</span>` +
            (fremd && !i.gelesen ? ` <button class="pb-btn" data-gelesen="${i.id}" style="padding:3px 10px">Gelesen ✓</button>` : "") +
            (fremd && !i.gehoben ? ` <button class="pb-btn" data-heben="${i.id}" style="padding:3px 10px">In die Agenda heben</button>` : "") +
            `</div>`;
        }).join("")
      : `<div class="pb-item">Das Regal ist leer.</div>`;
    for (const b of $("regalItems").querySelectorAll("[data-gelesen]"))
      b.addEventListener("click", async () => { await markiereGelesen(backend, b.getAttribute("data-gelesen")); zeigeRegal(); });
    for (const b of $("regalItems").querySelectorAll("[data-heben]"))
      b.addEventListener("click", async () => { await hebeInAgenda(backend, b.getAttribute("data-heben")); zeigeRegal(); });
  }

  async function zeigeAgenda() {
    const agenda = (await backend.bstate.get("agenda")) || { items: [] };
    $("boxAgenda").classList.remove("pb-hidden");
    $("agendaItems").innerHTML = agenda.items.length
      ? agenda.items.map(i =>
          `<div class="pb-item">${esc(i.text)}<br><span class="pb-sub">von ${esc(i.von)} · ${esc(i.zustand)}</span>` +
          (i.zustand === "offen"
            ? ` <button class="pb-btn" data-abr="${i.id}" style="padding:3px 10px">Haben wir selbst geklärt ✓</button>`
            : "") + `</div>`
        ).join("")
      : `<div class="pb-item">Die Agenda ist leer.</div>`;
    for (const b of $("agendaItems").querySelectorAll("[data-abr]"))
      b.addEventListener("click", async () => { await raeumeAgendaAb(backend, b.getAttribute("data-abr"), "selbstGeklaert"); zeigeAgenda(); });
  }

  /* ---- Wiedereinstieg per E-Mail (nur wenn das Backend es unterstützt) ---- */
  function zeigeRecovery() {
    const box = $("boxRecovery");
    if (!backend.recovery) { box.classList.add("pb-hidden"); return; }
    box.classList.remove("pb-hidden");
    const hinterlegt = !!(state.info && state.info.recoveryEmail);
    box.innerHTML =
      `<div class="pb-sub">Zugang wiederfinden</div>` +
      `<p style="font-size:13px;color:var(--ink-soft,#5a6675);margin:6px 0">` +
      (hinterlegt
        ? `Eine E-Mail-Adresse ist hinterlegt. Wenn du dich auf einem neuen Gerät anmelden oder deinen Zugang verlierst, kannst du dir darüber einen frischen Link schicken lassen.`
        : `Hinterlege eine E-Mail-Adresse, damit du dir bei Bedarf einen neuen Zugangslink schicken lassen kannst — auch für ein zweites Gerät. Nimm ein Postfach, auf das nur du Zugriff hast.`) +
      `</p>` +
      `<input id="recInput" type="email" placeholder="dein@postfach.de" style="display:block;width:100%;box-sizing:border-box;padding:9px;border:1px solid #cfd8e0;border-radius:9px;font:inherit">` +
      `<button class="pb-btn primary" id="recSave" style="margin-top:8px">${hinterlegt ? "Adresse ändern" : "Adresse hinterlegen"}</button>` +
      `<span id="recNote" class="pb-sub" style="margin-left:8px"></span>`;
    box.querySelector("#recSave").addEventListener("click", async () => {
      const email = box.querySelector("#recInput").value.trim();
      const note = box.querySelector("#recNote");
      if (!email) { note.textContent = "Bitte eine Adresse eingeben."; return; }
      try {
        await backend.recovery.setEmail(email);
        state.info.recoveryEmail = true;
        zeigeRecovery();
      } catch (e) { note.textContent = e.message; }
    });
  }

  /* Verdrahtung */
  $("btnMyRoom").addEventListener("click", () => show("scrMyRoom"));
  $("btnSharedRoom").addEventListener("click", () => show("scrShared"));
  $("btnZurueck1").addEventListener("click", () => show("scrStart"));
  $("btnZurueck2").addEventListener("click", () => show("scrStart"));
  $("btnChatZurueck").addEventListener("click", () => show("scrStart"));
  $("btnSolo").addEventListener("click", () => startChat("solo").catch(e => err(e.message)));
  $("btnEinzel").addEventListener("click", () => startChat("einzel").catch(e => err(e.message)));
  $("btnGemeinsam").addEventListener("click", () => startChat("gemeinsam").catch(e => err(e.message)));
    $("btnAufdeck").addEventListener("click", () => startChat("aufdeck").catch(e => err(e.message)));
  $("btnMoment").addEventListener("click", () => startChat("moment").catch(e => err(e.message)));
  $("btnZeitleiste").addEventListener("click", () => zeigeZeitleiste().catch(e => err(e.message)));
  $("btnMess").addEventListener("click", () => zeigeMess().catch(e => err(e.message)));
  $("btnRegal").addEventListener("click", () => zeigeRegal().catch(e => err(e.message)));
  $("btnAgenda").addEventListener("click", () => zeigeAgenda().catch(e => err(e.message)));
  $("btnQz").addEventListener("click", () => zeigeQz().catch(e => err(e.message)));
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

  function pbTheme(t) {                          // hell/dunkel umschalten (Default hell)
    const d = t === "dark";
    doc.documentElement.setAttribute("data-theme", d ? "dark" : "light");
    $("pbHell").classList.toggle("an", !d);
    $("pbDunkel").classList.toggle("an", d);
  }
  $("pbHell").addEventListener("click", () => pbTheme("light"));
  $("pbDunkel").addEventListener("click", () => pbTheme("dark"));
  pbTheme("light");

  /* ---- Prozessreflexion (Mess-Runde, verdeckt — Aufdeckung im Moment) ---- */
  async function zeigeMess() {
    const box = $("boxMess");
    box.classList.remove("pb-hidden");
    const [mr, auftraege] = await Promise.all([backend.bstate.get("messrunden"), backend.bstate.get("auftraege")]);
    const offen = ((mr && mr.items) || []).find(r => r.status === "offen");
    if (offen && offen.werte[state.info.role]) {
      box.innerHTML = `<div class="pb-sub">Prozessreflexion</div><p style="font-size:14px">Dein Beitrag ist abgegeben — aufgedeckt wird gemeinsam im nächsten Moment, häppchenweise.</p>`;
      return;
    }
    const aktive = (((auftraege && auftraege.items) || [])).filter(a => a.status === "aktiv" && a.art === "gemeinsam");
    box.innerHTML =
      `<div class="pb-sub">Prozessreflexion — verdeckt; ${esc(state.info.partner)} sieht deine Werte erst bei der gemeinsamen Aufdeckung</div>` +
      `<label style="display:block;font-size:13px;margin:8px 0">Wie nah fühlst du dich ${esc(state.info.partner)} gerade? (1–10)<br><input id="msNaehe" type="range" min="1" max="10" value="5" style="width:100%"></label>` +
      `<label style="display:block;font-size:13px;margin:8px 0">Und was schätzt du: Wie nah fühlt sich ${esc(state.info.partner)} dir? (1–10)<br><input id="msZweit" type="range" min="1" max="10" value="5" style="width:100%"></label>` +
      aktive.map(a =>
        `<label style="display:block;font-size:13px;margin:8px 0">Wie gut passt „${esc(a.text)}" (${esc(a.id)}) gerade zu euch? (1–10)<br><input data-pass="${esc(a.id)}" type="range" min="1" max="10" value="5" style="width:100%"></label>`
      ).join("") +
      `<button class="pb-btn primary" id="msOk">Verdeckt abgeben</button>`;
    box.querySelector("#msOk").addEventListener("click", async () => {
      const passung = {};
      for (const inp of box.querySelectorAll("[data-pass]")) passung[inp.getAttribute("data-pass")] = +inp.value;
      const runde = await trageMessbeitragEin(backend, state.info.role, {
        naehe: +box.querySelector("#msNaehe").value,
        zweit: +box.querySelector("#msZweit").value,
        passung,
      });
      box.innerHTML = `<div class="pb-sub">Prozessreflexion</div><p style="font-size:14px">Danke — verdeckt abgelegt.` +
        (runde.status === "bereit" ? " Ihr seid beide dran gewesen: Die Aufdeckung wartet im nächsten gemeinsamen Moment." : "") + `</p>`;
    });
  }

  /* ---- Qualitätszeit: Einladungs-Fächer mit Leiter ---- */
  async function zeigeQz() {
    const box = $("boxQz");
    box.classList.remove("pb-hidden");
    const qz = (await backend.bstate.get("qz")) || { ruht: {}, wahl: [] };
    if (!qz.startAt) { qz.startAt = new Date().toISOString(); await backend.bstate.set("qz", qz); }
    const stufe = qzStufe(qz);
    if (stufe === "pause") {
      box.innerHTML = `<div class="pb-sub">Gemeinsame Momente</div><p style="font-size:14px">Pausiert bis ${esc((qz.leiter.pausiertBis || "").slice(0, 10))} — vereinbart, kein Vergessen.</p>`;
      return;
    }
    const rahmen = QZ_STUFEN_TEXT[stufe];
    box.innerHTML =
      `<div class="pb-sub">Gemeinsame Momente</div>` +
      `<p class="pb-sub" style="margin:6px 0 4px">Leichte Einladungen zu kleinen gemeinsamen Momenten — kein Programm, kein Takt. Ihr wählt, was sich stimmig anfühlt; nichts wird gemessen oder nachgehalten, und nichts auswählen ist völlig in Ordnung.</p>` +
      (rahmen ? `<p style="font-size:14px">${esc(rahmen)}</p>` : "") +
      (stufe === 4 ? `<button class="pb-btn" id="qzPause">Pause vereinbaren (4 Wochen)</button>` : "") +
      `<button class="pb-btn primary" id="qzHolen">Einladungen holen</button><div id="qzKarten"></div>`;
    if (stufe === 4) box.querySelector("#qzPause").addEventListener("click", async () => { await vereinbarePause(backend, 4); zeigeQz(); });
    box.querySelector("#qzHolen").addEventListener("click", async () => {
      const [auftraege, freiA, freiB] = await Promise.all([
        backend.bstate.get("auftraege"),
        Promise.resolve().then(() => backend.uebergabe.get("A")).catch(() => null),
        Promise.resolve().then(() => backend.uebergabe.get("B")).catch(() => null),
      ]);
      const def = qzDef({
        onFaecher: async (data) => {
          $("qzKarten").innerHTML = data.einladungen.map((e2, i) =>
            `<div class="pb-item">${esc(e2.text)}<br><span class="pb-sub">${esc(e2.domaene)}</span> <button class="pb-btn" data-qzw="${i}" style="padding:3px 10px">Wählen</button></div>`
          ).join("") + `<button class="pb-btn" id="qzKeine" style="margin-top:6px">Heute keine davon</button>`;
          for (const b of $("qzKarten").querySelectorAll("[data-qzw]"))
            b.addEventListener("click", async () => {
              await waehleEinladung(backend, data.einladungen[+b.getAttribute("data-qzw")]);
              $("qzKarten").innerHTML = `<p style="font-size:14px">Schön — viel Freude damit. (Nichts wird gemessen, nichts nachgehalten.)</p>`;
            });
          $("qzKarten").querySelector("#qzKeine").addEventListener("click", async () => {
            await keineEinladung(backend, data.einladungen, stufe);
            $("qzKarten").innerHTML = `<p style="font-size:14px">Völlig in Ordnung.</p>`;
          });
        },
      });
      const engine = new Engine({
        def, chat: { messages: [], status: "running" }, llm: backend.llm,
        ctx: {}, hooks: { onPersonError: err },
      });
      await engine.sendUser(baueQzMaterial({ auftraege, freigaben: [freiA, freiB].filter(Boolean), qz }));
    });
  }

  /* ---- Kernwetten-Panels (Regler · Ranking · Startwerte · Freigabe) ---- */
  const kw = () => $("kwPanel");
  function kwZu() { kw().classList.add("pb-hidden"); kw().innerHTML = ""; }

  function reglerPanel(engine) {
    const vals = DOMAINS.map(() => ({ w: 5, z: 5, tw: false, tz: false }));
    let i = 0;
    const p = kw();
    p.classList.remove("pb-hidden");
    function zeichne() {
      const d = DOMAINS[i];
      const [lw, lz] = d.poles
        ? ["Wo lebt ihr gerade? (1=" + d.poles[0] + " … 10=" + d.poles[1] + ")",
           "Wo wäre es für dich stimmig?"]
        : ["Wie wichtig ist dir das? (1 kaum … 10 zentral)",
           "Wie zufrieden bist du damit gerade? (1 … 10)"];
      p.innerHTML =
        `<div class="pb-sub">Bereich ${i + 1} von ${DOMAINS.length}</div>` +
        `<p style="font-size:14px;margin:6px 0"><strong>${esc(d.t)}</strong><br><span class="pb-sub">${esc(d.d)}</span></p>` +
        `<label style="display:block;font-size:13px;margin:8px 0">${esc(lw)}<br><input id="kwW" type="range" min="1" max="10" value="${vals[i].w}" style="width:100%"></label>` +
        `<label style="display:block;font-size:13px;margin:8px 0">${esc(lz)}<br><input id="kwZ" type="range" min="1" max="10" value="${vals[i].z}" style="width:100%"></label>` +
        `<button class="pb-btn" id="kwBack"${i === 0 ? " disabled" : ""}>← Zurück</button>` +
        `<button class="pb-btn primary" id="kwNext" disabled>${i === DOMAINS.length - 1 ? "Fertig" : "Weiter"}</button>`;
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
        if (i < DOMAINS.length - 1) { i++; zeichne(); return; }
        kwZu();
        await engine.submitToolResult(reglerErgebnis(vals, state.info.name), { slider: true });
        renderMsgs();
      });
    }
    zeichne();
  }

  function rankPanel(mode, engine) {
    const cfg = RANK_MODES[mode];
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
          `<div class="pb-item">${pos + 1}. ${esc(RANK_ITEMS[ri].label)} <button class="pb-btn" data-raus="${ri}" style="padding:2px 8px;float:right">✕</button></div>`
        ).join("") + `</div><div id="kwPool" style="margin:8px 0">` +
        RANK_ITEMS.map((it, ri) => order.includes(ri) ? "" :
          `<button class="pb-btn" data-rein="${ri}"${order.length >= cfg.topN ? " disabled" : ""}>${esc(it.label)}</button>`
        ).join("") + `</div>` +
        `<button class="pb-btn primary" id="kwRankOk"${order.length === cfg.topN ? "" : " disabled"}>Fertig</button>`;
      for (const b of p.querySelectorAll("[data-rein]"))
        b.addEventListener("click", () => { order.push(+b.getAttribute("data-rein")); zeichne(); });
      for (const b of p.querySelectorAll("[data-raus]"))
        b.addEventListener("click", () => { order.splice(order.indexOf(+b.getAttribute("data-raus")), 1); zeichne(); });
      p.querySelector("#kwRankOk").addEventListener("click", async () => {
        if (order.length !== cfg.topN) return;
        kwZu();
        engine.chat.ranks = engine.chat.ranks || {};
        engine.chat.ranks[mode] = order.map(ri => RANK_ITEMS[ri].label);
        if ((mode === "self" || mode === "pwichtig") && engine.chat.minigate === "ja") {
          try {
            const protokoll = await backend.bstate.get("aufdeckprotokoll");
            if (!protokoll) {
              const alle = (await backend.bstate.get("aufdeckung")) || {};
              if (alle[state.info.role]) {
                alle[state.info.role] = baueAufdeckung(state.info.name, engine.chat.ranks);
                await backend.bstate.set("aufdeckung", alle);
              }
            }
          } catch { /* Nachzug ist Komfort, kein Muss */ }
        }
        await engine.submitToolResult(rankingErgebnis(mode, order, ctx), { ranking: mode });
        renderMsgs();
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
        `<div class="pb-sub">Startwert, verdeckt — bitte nur ${esc(namen[idx])} schauen</div>` +
        `<p style="font-size:14px">${esc(namen[idx])}: Wie nah seid ihr dem heute? (1–10)</p>` +
        `<input id="kwSW" type="range" min="1" max="10" value="5" style="width:100%">` +
        `<div class="pb-sub" style="text-align:center" id="kwSWv">5</div>` +
        `<button class="pb-btn primary" id="kwSWok">Verdeckt übernehmen</button>`;
      const inp = p.querySelector("#kwSW");
      inp.addEventListener("input", () => { p.querySelector("#kwSWv").textContent = inp.value; });
      p.querySelector("#kwSWok").addEventListener("click", async () => {
        werte.push(+inp.value);
        if (werte.length < 2) { frage(1); return; }
        kwZu();
        await engine.submitToolResult(startwerteErgebnis(namen[0], werte[0], namen[1], werte[1]), { startwerte: true });
        renderMsgs();
      });
    }
    frage(0);
  }

  function freigabePanel(data, engine) {
    const wieder = engine.chat.minigate === "nein";   // Wiedervorlage genau einmal, danach nie mehr
    const p = kw();
    p.classList.remove("pb-hidden");
    p.innerHTML =
      `<div class="pb-sub">Deine Freigabe — nur angekreuzte Punkte werden für das gemeinsame Gespräch bereitgelegt</div>` +
      data.items.map((it, i) =>
        `<label style="display:block;font-size:14px;margin:6px 0"><input type="checkbox" data-fg="${i}" checked> <strong>${esc(it.id)}</strong> ${esc(it.text)}</label>`
      ).join("") +
      `${wieder ? `<p style="font-size:14px">Und ein einziges Mal noch die Aufdeck-Runde: Hättest du Freude daran, wenn ihr eure Top 5 einander preisgebt – auch wenn der Gedanke vielleicht etwas Aufregung auslöst? Gezeigt würden nur deine Top 5 und deine drei Tipps für ${esc(state.info.partner)}. Ohne Häkchen bleibt alles bei dir; danach fragt niemand mehr.</p><label style="display:block;font-size:14px;margin:6px 0"><input type="checkbox" id="kwFgAufdeck"> Ja – Top 5 und Tipps dürfen in der Aufdeck-Runde gezeigt werden.</label>` : ""}<button class="pb-btn primary" id="kwFgOk">Freigeben</button>` +
      `<button class="pb-btn" id="kwFgNein">Noch nicht</button>`;
    p.querySelector("#kwFgOk").addEventListener("click", async () => {
      const items = [...p.querySelectorAll("input[data-fg]:checked")].map(x => {
        const it = data.items[+x.getAttribute("data-fg")];
        return { id: it.id, text: it.text };
      });
      const auchAufdecken = wieder && !!p.querySelector("#kwFgAufdeck") && p.querySelector("#kwFgAufdeck").checked;
      kwZu();
      try {
        await backend.uebergabe.post({ module: "kernwetten", name: state.info.name, items });
        if (auchAufdecken) {
          const alle = (await backend.bstate.get("aufdeckung")) || { A: null, B: null };
          alle[state.info.role] = baueAufdeckung(state.info.name, engine.chat.ranks || {});
          await backend.bstate.set("aufdeckung", alle);
          engine.chat.minigate = "ja";
        }
        engine.chat.status = "released";
        await engine.submitToolResult("FREIGABE-ERGEBNIS: " + items.length + " von " + data.items.length + " Punkten freigegeben.");
        renderMsgs();
      } catch (e) { err(e.message); }
    });
    p.querySelector("#kwFgNein").addEventListener("click", async () => {
      kwZu();
      await engine.submitToolResult("FREIGABE-ERGEBNIS: Ich möchte vor der Freigabe noch etwas anpassen.");
      renderMsgs();
    });
  }

  /* ---- Diktat: direkte Spracherkennung mit OS-Tipp als Fallback ---- */
  function diktatTipp() {
    const ua = dk.ua;
    if (/Android|iPhone|iPad|iPod/i.test(ua))
      return "Diktat: Tippe auf das Mikrofon deiner Bildschirmtastatur — der Text landet direkt im Eingabefeld.";
    if (/Windows/i.test(ua))
      return "Diktat: Windows-Taste + H drücken — die Windows-Diktierfunktion schreibt direkt ins Eingabefeld.";
    if (/Mac/i.test(ua))
      return "Diktat: Zweimal die Fn-Taste (🌐) drücken — das macOS-Diktat schreibt direkt ins Eingabefeld.";
    return "Diktat: Nutze die Diktierfunktion deines Systems — der Text landet direkt im Eingabefeld.";
  }

  let rec = null;
  function diktatStopp() {
    if (rec) { try { rec.stop(); } catch { /* egal */ } rec = null; }
    $("btnMic").textContent = "🎤";
    $("btnMic").classList.remove("primary");
  }
  function diktatStart() {
    if (!dk.SR) { hint(diktatTipp()); return; }          // keine Erkennung → OS-Tipp
    try { rec = new dk.SR(); } catch { hint(diktatTipp()); return; }
    rec.lang = "de-DE";
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
      else err("Diktat unterbrochen — einfach erneut auf 🎤 tippen.");
    };
    rec.onend = () => { if (rec) diktatStopp(); };       // Browser beendet still (Timeout)
    rec.start();
    $("btnMic").textContent = "⏹";
    $("btnMic").classList.add("primary");
    hint("Diktat läuft — sprich einfach; ⏹ beendet.");
  }
  $("btnMic").addEventListener("click", () => { rec ? diktatStopp() : diktatStart(); });

  async function boot() {
    state.info = await backend.info();
    $("pbHallo").textContent = "Hallo " + state.info.name;
    $("pbKern").textContent = "Paarbegleitung";
    $("startHallo").textContent = "Schön, dass du da bist, " + state.info.name + ".";
    $("startIntro").textContent = "Zwei Räume, eine einfache Regel: Was bei dir bleibt, bleibt bei dir — geteilt wird nur, was du ausdrücklich freigibst.";
    $("startMeinSub").textContent = "Nur für dich: zum Sortieren, Üben und Ablegen. Nichts von hier erreicht " + state.info.partner + ", außer du gibst es frei.";
    $("startTeilSub").textContent = "Für euch beide: eure gemeinsamen Sessions — und alles, was einer von euch lesbar gemacht hat.";
    $("meinIntro").textContent = "Dieser Raum ist nur für dich — nichts von hier erreicht " + state.info.partner + ", außer du gibst es ausdrücklich frei. Nimm dir die Zeit, die du brauchst.";
    zeigeRecovery();
    show("scrStart");
  }

  return { boot, show, startChat, _state: state, _err: err };
}
