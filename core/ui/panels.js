// R4b · Die Panels: Gate, Kapitel, Aufdeck-Tafel.
//
// Drei Bauelemente, die das Modell direkt anstößt — sie hängen an den
// Engine-Haken onGate, onKapitel und onAufdecken. Gemeinsam ist ihnen, dass
// sie eine ANTWORT einsammeln und über warteAntwort zurückgeben: Sie sind
// Eingabemasken im Gesprächsfluss, keine Ansichten.
//
// `baueTafelKarte` gehört mit hierher, obwohl es auch von renderMsgs gebraucht
// wird — es baut die Darstellung einer Aufdeck-Tafel im Verlauf, und die
// Aufdeck-Tafel ist ein Panel. Es wird deshalb nach außen mitgegeben, statt es
// in app.js zurückzulassen: Zugehörigkeit schlägt Aufrufort.
//
// `kw` und `kwZu` (Kernwetten-Panelfläche) bleiben in app.js — sie bedienen
// auch die Kernwetten-Abläufe, die hier nicht mitwandern.

import { t, fuelle } from "../i18n/index.js";
import { esc } from "./html.js";
import { K } from "../prompts/prompts.js";
import { WEGE_FUER } from "../engine/regal.js";
import { quereGate } from "./sessions.js";
import { beruehrungen, baueAufdeckung } from "./kernwetten.js";

/**
 * @param {object} ctx
 * @param {(id:string)=>Element} ctx.$
 * @param {Function} ctx.el
 * @param {object} ctx.state
 * @param {object} ctx.backend
 * @param {(msg:string)=>void} ctx.err
 * @param {Function} ctx.renderMsgs
 * @param {Function} ctx.warteAntwort
 * @param {Function} ctx.kw            Zugriff auf die Kernwetten-Panelfläche
 * @param {Function} ctx.kwZu          Schließt sie wieder
 */
export function machePanels({ $, el, state, backend, err, renderMsgs, warteAntwort, kw, kwZu }) {
  function gatePanel(data, engine) {
    const p = $("gatePanel");
    p.classList.remove("pb-hidden");
    // S95.3b · Die Beschriftungen nennen die FOLGE, nicht den Ort — der
    // Unterschied zwischen „liest es, wenn er mag" und „kommt zur Sprache"
    // muss im Moment der Entscheidung sichtbar sein, nicht rekonstruierbar.
    const wp = { partner: state.info.partner };
    const wegName = { self: t("gate.weg.selbst", wp), shelf: t("gate.weg.regal", wp), moment: t("gate.weg.moment", wp) };
    // Das Menü ist konstant und hängt nur an der Artefakt-Art (S95.3b).
    const wege = WEGE_FUER(data.kind);
    // D5 · Teilen-Vorschau (Design 17f): GENAU der Text, der drueben ankommt,
    // als Tiefgruen-Block mit Von-Zeile — Formular schuetzt den Wert,
    // Erzaehlung schuetzt die Beziehung. Optionen darunter als Hairline-Zeilen.
    p.innerHTML =
      `<div class="rz-caps">${t("gate.titel")}</div>` +
      `<div class="rz-teilen-block"><div class="rz-caps rz-von">${t("allg.von", { name: esc(state.info.name) })}</div>` +
      `<p class="rz-teilen-text">${esc(data.selbstmitteilung)}</p></div>` +
      (data.wish ? `<p class="rz-sub">${t("gate.wish")}${esc(data.wish)}</p>` : "") +
      wege.map(w => `<label class="rz-wahl"><input type="checkbox" data-weg="${w}"> ${esc(wegName[w])}</label>`).join("") +
      `<button class="rz-zeile rz-knopf-flach rz-gedimmt" id="btnGateOk" disabled><span>${t("allg.freigeben")}</span><span class="rz-pfeil">→</span></button>` +
      `<button class="rz-zeile rz-knopf-flach" id="btnGateNein"><span>${t("allg.nochNicht")}</span><span class="rz-pfeil">→</span></button>`;
    // S93 · Eine Entscheidung statt zwei. Bis S93 stand „Freigeben“ auch ohne
    // gewählten Weg bereit — der Klick schickte dann „nichts gequert“, eine
    // erreichbare, aber sinnlose Kombination, die sich wie eine dritte
    // Rückversicherung anfühlte. Jetzt trägt die Weg-Wahl die Entscheidung;
    // „Noch nicht“ bleibt der ausdrückliche Ausstieg.
    const gateOk = p.querySelector("#btnGateOk");
    const gateStand = () => {
      const gewaehlt = !!p.querySelector("input[data-weg]:checked");
      gateOk.disabled = !gewaehlt;
      gateOk.classList.toggle("rz-gedimmt", !gewaehlt);
    };
    for (const box of p.querySelectorAll("input[data-weg]")) box.addEventListener("change", gateStand);
    gateStand();
    gateOk.addEventListener("click", async () => {
      // Zwei Schlösser, absichtlich: das disabled-Attribut ist die SICHTBARE
      // Zusage, die Zählung der Häkchen die logische — die DOM-Lage entscheidet.
      const wege = [...p.querySelectorAll("input[data-weg]:checked")].map(x => x.getAttribute("data-weg"));
      if (!wege.length) return;
      p.classList.add("pb-hidden");
      try { await quereGate(backend, data, wege); } catch (e) { err(e.message); return; }
      if (!engine) return;   // Freigabe ausserhalb einer laufenden Session (S96.3)
      await warteAntwort(() => engine.submitToolResult(
        wege.length ? fuelle(K().steuerTexte.freigabeGequert, { paths: wege.join(", ") }) : K().steuerTexte.freigabeNichts
      ));
    });
    p.querySelector("#btnGateNein").addEventListener("click", async () => {
      p.classList.add("pb-hidden");
      if (!engine) return;
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
      `<p class="rz-klein"><strong>${t("kapitel.frageTitel")}</strong> ${t("kapitel.frage")}</p>` +
      `<p class="pb-sub">${t("kapitel.frageSub", { partner: esc(state.info.partner) })}</p>` +
      `<button class="pb-btn primary" id="kapJa">${t("kapitel.ja")}</button><button class="pb-btn primary" id="kapNein">${t("allg.nochNicht")}</button>`;
    p.innerHTML =
      `<div class="pb-sub">${t("kapitel.geschafft", { n, titel: esc(K().KAPITEL_TITEL[n - 1]) })}</div>` +
      `<div class="rz-code">${dots}</div>` + gateHtml +
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

  /* ── Aufdeck-Tafel (S62): Karte IM Gesprächsverlauf statt Panel darunter —
     Folgeantworten des Modells erscheinen sichtbar unter der Tafel, sie
     bleibt stehen (kein "Tafel ausblenden" mehr) und übersteht Reloads,
     weil die Tafel-Daten als Meta der auslösenden Assistant-Nachricht
     persistiert werden. Zwei-Schritt-Aufdeckung: richtung "A"/"B" zeigt
     nur diese Richtung; null (Legacy-[[REVEAL]]) zeigt beide. Strukturell
     weiterhin: keine Quote, kein Zählen. ── */
  async function aufdeckTafel(engine, richtung) {
    const alle = (await backend.bstate.get("reveal")) || {};
    const gA = alle.A, gB = alle.B;
    if (!gA || !gB) { err(t("aufdeck.fehlt")); return; }
    const msgs = engine.chat.messages || [];
    const letzte = msgs[msgs.length - 1];
    if (!letzte || letzte.role !== "assistant") return;
    if (!letzte.tafel) {   // idempotent: resume() dispatcht den Marker erneut
      const nackt = g => ({ name: g.name, top5: g.top5, guess3: g.guess3 });
      letzte.tafel = { richtung: richtung || "beide", gA: nackt(gA), gB: nackt(gB) };
      await engine._save();
    }
    renderMsgs();
  }

  /** Tafel-Karte für den Verlauf bauen; der Weiter-Knopf hängt nur an der
      JÜNGSTEN Tafel, solange das Modell noch kein REVEAL-SHOWN erhalten hat
      (danach ist die Tafel-Nachricht nicht mehr die letzte). */
  function baueTafelKarte(tafel, mitWeiter, ersteTafel) {
    const spalte = (titel, liste, marks) =>
      `<div class="rz-flex-spalte"><div class="pb-sub">${esc(titel)}</div>` +
      (liste || []).map((x, i) => `<div class="pb-item rz-marke-links"${(marks || []).includes(x) ? '' : ""}>${i + 1}. ${esc(x)}</div>`).join("") + `</div>`;
    const richtungHtml = (tipper, owner) => {
      const treff = beruehrungen(tipper.guess3, owner.top5);
      return `<div class="rz-oben-3"><div class="pb-sub">${t("aufdeck.getippt", { tipper: esc(tipper.name), owner: esc(owner.name) })}</div>` +
        `<div class="rz-reihe-umbruch">` + spalte(t("aufdeck.tippVon", { name: tipper.name }), tipper.guess3, treff) + spalte(t("aufdeck.topVon", { name: owner.name }), owner.top5, treff) + `</div>` +
        (treff.length ? `<p class="pb-sub">${t("aufdeck.beruehrungen")}${treff.map(esc).join(" · ")}</p>`
                      : `<p class="pb-sub">${t("aufdeck.verschieden")}</p>`) + `</div>`;
    };
    const einzel = tafel.richtung === "A" || tafel.richtung === "B";
    const owner = tafel.richtung === "B" ? tafel.gB : tafel.gA;
    const tipper = tafel.richtung === "B" ? tafel.gA : tafel.gB;
    const karte = el("div", "pb-card pb-tafel",
      `<div class="pb-sub">${einzel ? t("aufdeck.titelTeil", { owner: esc(owner.name) }) : t("aufdeck.titel")}</div>` +
      (ersteTafel ? `<p class="rz-fein">${t("aufdeck.intro")}</p>` : "") +
      (einzel ? richtungHtml(tipper, owner) : richtungHtml(tafel.gB, tafel.gA) + richtungHtml(tafel.gA, tafel.gB)));
    karte.setAttribute("style", "align-self:stretch;max-width:none");
    if (mitWeiter) {
      const w = el("button", "pb-btn primary");
      w.id = "adWeiter"; w.textContent = t("aufdeck.weiter");
      w.addEventListener("click", async () => {
        const eng = state.engine;
        if (!eng || state.warten) return;
        const namen = einzel
          ? { owner: owner.name, tipper: tipper.name }
          // Legacy-Pfad (beide Richtungen zugleich): beide Namen in beiden Rollen.
          : { owner: tafel.gA.name + " & " + tafel.gB.name, tipper: tafel.gA.name + " & " + tafel.gB.name };
        await warteAntwort(() => eng.submitToolResult(fuelle(K().steuerTexte.aufdeckungAngezeigt, namen), { hidden: true }));
      });
      karte.appendChild(w);
    }
    return karte;
  }
  return { gatePanel, kapitelPanel, aufdeckTafel, baueTafelKarte };
}
