// UI-Schicht — dünner DOM-Layer über Engine und Backend-Fassade.
// document wird injiziert (happy-dom-testbar); kein Storage-, kein Key-Wissen.

import { Engine } from "../engine/engine.js";
import { cleanDisplay } from "../contracts/block.js";
import { ALLE_BLOECKE } from "../contracts/registry.js";
import { soloDef, momentDef, quereGate, baueMomentKontext, markiereGelesen, hebeInAgenda, raeumeAgendaAb } from "./sessions.js";
import { einzelDef, gemeinsamDef, aufdeckDef, RANK_ITEMS, RANK_MODES, reglerErgebnis, rankingErgebnis, startwerteErgebnis, KAPITEL_TITEL, beruehrungen, baueAufdeckung, baueAufdeckKontext, baueKlaerungsKontext } from "./kernwetten.js";
import { DOMAINS, steuerTexte } from "../prompts/prompts.js";
import { trageMessbeitragEin, bereiteRunde, formatiereMessrunde, markiereAufgedeckt, qzStufe, QZ_STUFEN_TEXT, baueQzMaterial, qzDef, waehleEinladung, keineEinladung, vereinbarePause } from "./prozess.js";
import { applyDesign } from "./design.js";
import { t, fuelle } from "../i18n/index.js";

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
        <button class="pb-btn primary" id="btnMyRoom">${t("start.meinRaum")}</button>
        <p class="pb-sub" id="startMeinSub" style="margin:4px 0 12px"></p>
        <button class="pb-btn primary" id="btnSharedRoom">${t("start.teilRaum")}</button>
        <p class="pb-sub" id="startTeilSub" style="margin:4px 0 0"></p>
      </div>
    </div>
    <div id="scrMyRoom" class="pb-hidden">
      <div class="pb-card">
        <div style="font-size:16px;font-weight:650;margin-bottom:4px">${t("start.meinRaum")}</div>
        <p class="pb-sub" id="meinIntro" style="margin:0 0 12px"></p>
        <button class="pb-btn primary" id="btnSolo">${t("mein.solo")}</button>
        <button class="pb-btn primary" id="btnEinzel">${t("mein.einzel")}</button>
        <button class="pb-btn" id="btnZeitleiste">${t("mein.zeitleiste")}</button>
        <button class="pb-btn" id="btnMess">${t("mein.mess")}</button>
        <button class="pb-btn" id="btnZurueck1">${t("allg.zurueck")}</button>
      </div>
      <div class="pb-card pb-hidden" id="boxZeitleiste"><div class="pb-sub">${t("zeitleiste.titel")}</div><div id="zlItems"></div></div>
      <div class="pb-card pb-hidden" id="boxMess"></div>
      <div class="pb-card pb-hidden" id="boxRecovery"></div>
    </div>
    <div id="scrShared" class="pb-hidden">
      <div class="pb-card">
        <div style="font-size:16px;font-weight:650;margin-bottom:4px">${t("start.teilRaum")}</div>
        <p class="pb-sub" id="sharedIntro" style="margin:0 0 12px">${t("teil.intro")}</p>
        <button class="pb-btn primary" id="btnMoment">${t("teil.moment")}</button>
        <button class="pb-btn primary" id="btnAufdeck">${t("teil.aufdeck")}</button>
        <button class="pb-btn primary" id="btnGemeinsam">${t("teil.gemeinsam")}</button>
        <button class="pb-btn" id="btnRegal">${t("teil.regal")}</button>
        <button class="pb-btn" id="btnAgenda">${t("teil.agenda")}</button>
        <button class="pb-btn" id="btnQz">${t("teil.qz")}</button>
        <button class="pb-btn" id="btnZurueck2">${t("allg.zurueck")}</button>
      </div>
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
          <span class="wert" id="pbSkalaWert">7</span>
          <button class="pb-btn primary" id="pbSkalaSend" style="white-space:nowrap">${t("chat.senden")}</button>
        </div>
        <div class="pb-composer" id="pbComposer">
          <textarea id="pbInput" placeholder="${t("chat.platzhalter")}"></textarea>
          <button class="pb-btn" id="btnMic" title="${t("chat.diktieren")}">🎤</button>
          <button class="pb-btn primary" id="btnSend">${t("chat.senden")}</button>
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
      d.innerHTML = '<span class="pb-typing" aria-label="' + t("chat.tippt") + '"><span></span><span></span><span></span></span>';
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
    const wegName = { selbst: t("gate.weg.selbst"), regal: t("gate.weg.regal"), moment: t("gate.weg.moment") };
    p.innerHTML =
      `<div class="pb-sub">${t("gate.titel")}</div>` +
      `<p style="font-size:14px">${esc(data.selbstmitteilung)}</p>` +
      (data.wunsch ? `<p class="pb-sub">${t("gate.wunsch")}${esc(data.wunsch)}</p>` : "") +
      data.wege.map(w => `<label style="display:block;font-size:14px;margin:4px 0"><input type="checkbox" data-weg="${w}"> ${wegName[w]}</label>`).join("") +
      `<button class="pb-btn primary" id="btnGateOk">${t("allg.freigeben")}</button>` +
      `<button class="pb-btn" id="btnGateNein">${t("allg.nochNicht")}</button>`;
    p.querySelector("#btnGateOk").addEventListener("click", async () => {
      const wege = [...p.querySelectorAll("input:checked")].map(x => x.getAttribute("data-weg"));
      p.classList.add("pb-hidden");
      try {
        await quereGate(backend, data, wege);
        await engine.submitToolResult(
          wege.length ? fuelle(steuerTexte.freigabeGequert, { wege: wege.join(", ") }) : steuerTexte.freigabeNichts
        );
        renderMsgs();
      } catch (e) { err(e.message); }
    });
    p.querySelector("#btnGateNein").addEventListener("click", async () => {
      p.classList.add("pb-hidden");
      await engine.submitToolResult(steuerTexte.freigabeWeiterarbeiten);
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
      `<p style="font-size:14px"><strong>${t("kapitel.frageTitel")}</strong> ${t("kapitel.frage")}</p>` +
      `<p class="pb-sub">${t("kapitel.frageSub", { partner: esc(state.info.partner) })}</p>` +
      `<button class="pb-btn primary" id="kapJa">${t("kapitel.ja")}</button><button class="pb-btn primary" id="kapNein">${t("allg.nochNicht")}</button>`;
    p.innerHTML =
      `<div class="pb-sub">${t("kapitel.geschafft", { n, titel: esc(KAPITEL_TITEL[n - 1]) })}</div>` +
      `<div style="letter-spacing:5px;font-size:16px;margin:4px 0 10px">${dots}</div>` + gateHtml +
      `<div id="kapWeiter"${gateOffen ? ' class="pb-hidden"' : ""}>` +
      `<button class="pb-btn primary" id="kapNext">${t("kapitel.weitermachen", { n: n + 1, titel: esc(KAPITEL_TITEL[n]) })}</button>` +
      `<button class="pb-btn" id="kapPause">${t("kapitel.pause")}</button></div>` +
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
      await engine.submitToolResult(fuelle(steuerTexte.weiterMitKapitel, { n: n + 1 }), { hidden: true });
      renderMsgs();
    });
    p.querySelector("#kapPause").addEventListener("click", () => {
      kwZu();
      show("scrMyRoom");
      err(t("kapitel.gespeichert"));
    });
  }
  
  /* ── Aufdeck-Tafel: beide Richtungen simultan, Berührungspunkte markiert,
     strukturell keine Quote und kein Zählen. Bleibt während des Gesprächs
     sichtbar. ── */
  async function aufdeckPanel(engine) {
    const alle = (await backend.bstate.get("aufdeckung")) || {};
    const gA = alle.A, gB = alle.B;
    if (!gA || !gB) { err(t("aufdeck.fehlt")); return; }
    const p = kw();
    p.classList.remove("pb-hidden");
    const spalte = (titel, liste, marks) =>
      `<div style="flex:1;min-width:150px"><div class="pb-sub">${esc(titel)}</div>` +
      liste.map((x, i) => `<div class="pb-item"${marks.includes(x) ? ' style="font-weight:700;border-left:3px solid var(--accent,#0f766e);padding-left:8px"' : ""}>${i + 1}. ${esc(x)}</div>`).join("") + `</div>`;
    const richtung = (tipper, owner) => {
      const treff = beruehrungen(tipper.tipp3, owner.top5);
      return `<div style="margin-top:12px"><div class="pb-sub">${t("aufdeck.getippt", { tipper: esc(tipper.name), owner: esc(owner.name) })}</div>` +
        `<div style="display:flex;gap:10px;flex-wrap:wrap">` + spalte(t("aufdeck.tippVon", { name: tipper.name }), tipper.tipp3, treff) + spalte(t("aufdeck.topVon", { name: owner.name }), owner.top5, treff) + `</div>` +
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
      await engine.submitToolResult(steuerTexte.aufdeckungAngezeigt, { hidden: true });
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
        throw new Error(t("fehler.aufdeckWartet"));
    }
    if (art === "aufdeck" && !gespeichert) {
      const alleA = (await backend.bstate.get("aufdeckung")) || {};
      if (!alleA.A || !alleA.B)
        throw new Error(t("fehler.aufdeckZu"));
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
      const startText = steuerTexte.start[art];   // Korpus: Sprachfassung liefert prompts.<locale>.js
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
      : `<div class="pb-item">${t("zeitleiste.leer")}</div>`;
  }

  async function zeigeRegal() {
    const regal = (await backend.bstate.get("regal")) || { items: [] };
    $("boxRegal").classList.remove("pb-hidden");
    $("regalItems").innerHTML = regal.items.length
      ? regal.items.map(i => {
          const fremd = i.von !== state.info.name;
          return `<div class="pb-item">${esc(i.text)}` +
            (i.wunsch ? `<br><span class="pb-sub">${t("gate.wunsch")}${esc(i.wunsch)}</span>` : "") +
            `<br><span class="pb-sub">${t("allg.von", { name: esc(i.von) })}${i.gelesen ? " · " + t("regal.stGelesen") : ""}${i.gehoben ? " · " + t("regal.stInAgenda") : ""}</span>` +
            (fremd && !i.gelesen ? ` <button class="pb-btn" data-gelesen="${i.id}" style="padding:3px 10px">${t("regal.btnGelesen")}</button>` : "") +
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
    $("boxAgenda").classList.remove("pb-hidden");
    $("agendaItems").innerHTML = agenda.items.length
      ? agenda.items.map(i =>
          `<div class="pb-item">${esc(i.text)}<br><span class="pb-sub">${t("allg.von", { name: esc(i.von) })} · ${esc(i.zustand)}</span>` +
          (i.zustand === "offen"
            ? ` <button class="pb-btn" data-abr="${i.id}" style="padding:3px 10px">${t("agenda.btnAbr")}</button>`
            : "") + `</div>`
        ).join("")
      : `<div class="pb-item">${t("agenda.leer")}</div>`;
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

  /* ---- Prozessreflexion (Mess-Runde, verdeckt — Aufdeckung im Moment) ---- */
  async function zeigeMess() {
    const box = $("boxMess");
    box.classList.remove("pb-hidden");
    const [mr, auftraege] = await Promise.all([backend.bstate.get("messrunden"), backend.bstate.get("auftraege")]);
    const offen = ((mr && mr.items) || []).find(r => r.status === "offen");
    if (offen && offen.werte[state.info.role]) {
      box.innerHTML = `<div class="pb-sub">${t("mess.titel")}</div><p style="font-size:14px">${t("mess.abgegeben")}</p>`;
      return;
    }
    const aktive = (((auftraege && auftraege.items) || [])).filter(a => a.status === "aktiv" && a.art === "gemeinsam");
    box.innerHTML =
      `<div class="pb-sub">${t("mess.verdeckt", { partner: esc(state.info.partner) })}</div>` +
      `<label style="display:block;font-size:13px;margin:8px 0">${t("mess.naehe", { partner: esc(state.info.partner) })}<br><input id="msNaehe" type="range" min="1" max="10" value="5" style="width:100%"></label>` +
      `<label style="display:block;font-size:13px;margin:8px 0">${t("mess.zweit", { partner: esc(state.info.partner) })}<br><input id="msZweit" type="range" min="1" max="10" value="5" style="width:100%"></label>` +
      aktive.map(a =>
        `<label style="display:block;font-size:13px;margin:8px 0">${t("mess.passung", { text: esc(a.text), id: esc(a.id) })}<br><input data-pass="${esc(a.id)}" type="range" min="1" max="10" value="5" style="width:100%"></label>`
      ).join("") +
      `<button class="pb-btn primary" id="msOk">${t("mess.abgeben")}</button>`;
    box.querySelector("#msOk").addEventListener("click", async () => {
      const passung = {};
      for (const inp of box.querySelectorAll("[data-pass]")) passung[inp.getAttribute("data-pass")] = +inp.value;
      const runde = await trageMessbeitragEin(backend, state.info.role, {
        naehe: +box.querySelector("#msNaehe").value,
        zweit: +box.querySelector("#msZweit").value,
        passung,
      });
      box.innerHTML = `<div class="pb-sub">${t("mess.titel")}</div><p style="font-size:14px">${t("mess.danke")}` +
        (runde.status === "bereit" ? t("mess.bereit") : "") + `</p>`;
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
      box.innerHTML = `<div class="pb-sub">${t("qz.titel")}</div><p style="font-size:14px">${t("qz.pausiert", { datum: esc((qz.leiter.pausiertBis || "").slice(0, 10)) })}</p>`;
      return;
    }
    const rahmen = QZ_STUFEN_TEXT[stufe];
    box.innerHTML =
      `<div class="pb-sub">${t("qz.titel")}</div>` +
      `<p class="pb-sub" style="margin:6px 0 4px">${t("qz.intro")}</p>` +
      (rahmen ? `<p style="font-size:14px">${esc(rahmen)}</p>` : "") +
      (stufe === 4 ? `<button class="pb-btn" id="qzPause">${t("qz.pauseBtn")}</button>` : "") +
      `<button class="pb-btn primary" id="qzHolen">${t("qz.holen")}</button><div id="qzKarten"></div>`;
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
            `<div class="pb-item">${esc(e2.text)}<br><span class="pb-sub">${esc(e2.domaene)}</span> <button class="pb-btn" data-qzw="${i}" style="padding:3px 10px">${t("qz.waehlen")}</button></div>`
          ).join("") + `<button class="pb-btn" id="qzKeine" style="margin-top:6px">${t("qz.keine")}</button>`;
          for (const b of $("qzKarten").querySelectorAll("[data-qzw]"))
            b.addEventListener("click", async () => {
              await waehleEinladung(backend, data.einladungen[+b.getAttribute("data-qzw")]);
              $("qzKarten").innerHTML = `<p style="font-size:14px">${t("qz.gewaehlt")}</p>`;
            });
          $("qzKarten").querySelector("#qzKeine").addEventListener("click", async () => {
            await keineEinladung(backend, data.einladungen, stufe);
            $("qzKarten").innerHTML = `<p style="font-size:14px">${t("qz.ok")}</p>`;
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
        ? [t("kw.poleW", { p0: d.poles[0], p1: d.poles[1] }), t("kw.poleZ")]
        : [t("kw.wichtig"), t("kw.zufrieden")];
      p.innerHTML =
        `<div class="pb-sub">${t("kw.bereich", { i: i + 1, n: DOMAINS.length })}</div>` +
        `<p style="font-size:14px;margin:6px 0"><strong>${esc(d.t)}</strong><br><span class="pb-sub">${esc(d.d)}</span></p>` +
        `<label style="display:block;font-size:13px;margin:8px 0">${esc(lw)}<br><input id="kwW" type="range" min="1" max="10" value="${vals[i].w}" style="width:100%"></label>` +
        `<label style="display:block;font-size:13px;margin:8px 0">${esc(lz)}<br><input id="kwZ" type="range" min="1" max="10" value="${vals[i].z}" style="width:100%"></label>` +
        `<button class="pb-btn" id="kwBack"${i === 0 ? " disabled" : ""}>${t("allg.zurueck")}</button>` +
        `<button class="pb-btn primary" id="kwNext" disabled>${i === DOMAINS.length - 1 ? t("allg.fertig") : t("allg.weiter")}</button>`;
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
        `<button class="pb-btn primary" id="kwRankOk"${order.length === cfg.topN ? "" : " disabled"}>${t("allg.fertig")}</button>`;
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
        await backend.uebergabe.post({ module: "kernwetten", name: state.info.name, items });
        if (auchAufdecken) {
          const alle = (await backend.bstate.get("aufdeckung")) || { A: null, B: null };
          alle[state.info.role] = baueAufdeckung(state.info.name, engine.chat.ranks || {});
          await backend.bstate.set("aufdeckung", alle);
          engine.chat.minigate = "ja";
        }
        engine.chat.status = "released";
        await engine.submitToolResult(fuelle(steuerTexte.freigabeAnzahl, { n: items.length, gesamt: data.items.length }));
        renderMsgs();
      } catch (e) { err(e.message); }
    });
    p.querySelector("#kwFgNein").addEventListener("click", async () => {
      kwZu();
      await engine.submitToolResult(steuerTexte.freigabeAnpassen);
      renderMsgs();
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
    $("btnMic").textContent = "🎤";
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
    $("btnMic").textContent = "⏹";
    $("btnMic").classList.add("primary");
    hint(t("diktat.laeuft"));
  }
  $("btnMic").addEventListener("click", () => { rec ? diktatStopp() : diktatStart(); });

  async function boot() {
    applyDesign(doc);   // Design dokumentweit (idempotent)
    state.info = await backend.info();
    $("pbHallo").textContent = t("allg.hallo", { name: state.info.name });
    $("pbKern").textContent = t("allg.marke");
    $("startHallo").textContent = t("start.hallo", { name: state.info.name });
    $("startIntro").textContent = t("start.intro");
    $("startMeinSub").textContent = t("start.meinSub", { partner: state.info.partner });
    $("startTeilSub").textContent = t("start.teilSub");
    $("meinIntro").textContent = t("mein.intro", { partner: state.info.partner });
    zeigeRecovery();
    show("scrStart");
  }

  return { boot, show, startChat, _state: state, _err: err };
}
