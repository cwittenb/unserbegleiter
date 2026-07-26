// R4b · Einstellungsblatt und Paarsprache.
//
// Zweite Screen-Gruppe aus app.js. Sie gehört zusammen, weil das
// Einstellungsblatt die Paarsprache anzeigt und der Sprachantrag von dort aus
// gestellt wird — und weil beide denselben Punkt am Zeichen bespielen, der
// einen offenen Antrag des Partners meldet.
//
// Wie bei recovery-screen.js sind die Abhängigkeiten explizit statt aus der
// Closure gegriffen. `chrome` (Zugriff auf die feste Bedien-Ecke) wird
// hereingereicht, weil diese Knoten außerhalb der Wurzel im Dokument hängen.

import { t, getLocale, setLocale, fehlerText } from "../i18n/index.js";
import { esc } from "./html.js";
import { setzeAnsicht, merkeAnsicht } from "./design.js";

/**
 * @param {object} ctx
 * @param {Document} ctx.doc
 * @param {(id:string)=>Element} ctx.$        Element-Zugriff innerhalb der App
 * @param {(id:string)=>Element} ctx.chrome   Zugriff auf die feste Bedien-Ecke
 * @param {object} ctx.backend
 * @param {object} ctx.state
 * @param {(msg:string)=>void} ctx.err        Fehleranzeige der App
 * @param {()=>void} ctx.relaunch             Neuaufbau nach Sprachwechsel der Oberfläche
 */
export function macheEinstellungenScreen({ doc, $, chrome, backend, state, err, relaunch }) {

  /** Der Punkt am Zeichen ist der einzige Ort, an dem ein offener Sprach-
   *  antrag des Partners noch auffällt, seit die Karte in der Agenda wohnt. */
  function aktualisierePunkt() {
    const punkt = chrome("pbEinstPunkt");
    if (!punkt) return;
    const w = state.info && state.info.languageRequest;
    const offenFuerMich = !!(w && w.by !== state.info.role);
    punkt.classList.toggle("pb-hidden", !offenFuerMich);
  }

  async function waehleAnsicht(wahl) {
    const w = setzeAnsicht(doc, wahl);
    merkeAnsicht(w);
    try { await backend.pstate.set("theme", w); } catch { /* Umgebungen ohne pstate */ }
    zeigeEinstellungen();
  }

  function zeigeEinstellungen() {
    const blatt = chrome("pbEinstBlatt");
    if (!blatt || blatt.classList.contains("pb-hidden")) return;
    const ansicht = doc.documentElement.getAttribute("data-ansicht") || "auto";
    const ui = getLocale();
    const paar = state.info && state.info.locale === "en" ? "en" : "de";
    const offen = state.info && state.info.languageRequest;
    const wahl = (gruppe, wert, text, aktiv) =>
      `<button class="rz-einst-wahl${aktiv ? " an" : ""}" data-${gruppe}="${wert}">` +
      `<span>${text}</span><span class="rz-haken" aria-hidden="true">✓</span></button>`;
    blatt.innerHTML =
      `<div class="rz-einst-gruppe">` +
      `<div class="rz-caps">${t("einst.ansicht")}</div>` +
      wahl("ansicht", "light", t("theme.hell"), ansicht === "light") +
      wahl("ansicht", "dark", t("theme.dunkel"), ansicht === "dark") +
      wahl("ansicht", "auto", t("theme.auto"), ansicht === "auto") +
      `</div>` +
      `<div class="rz-einst-gruppe">` +
      `<div class="rz-caps">${t("einst.sprache")}</div>` +
      wahl("ui", "de", t("paarspr.name.de"), ui === "de") +
      wahl("ui", "en", t("paarspr.name.en"), ui === "en") +
      `<p class="rz-einst-fuss">${t("einst.paarsprache", { sprache: sprachName(paar) })}</p>` +
      // D12-2f · Der Antrag wird hier gestellt, verhandelt wird er in der
      // Agenda: der Knopf legt den Eintrag an, die Absprache lebt dort.
      (offen
        ? `<p class="rz-einst-fuss">${t("einst.antragOffen", { sprache: sprachName(offen.target) })}</p>`
        : backend.language
        ? `<button class="pb-btn rz-oben-2" id="einstSprachAntrag">` +
          `${t("einst.vorschlagen", { sprache: sprachName(paar === "en" ? "de" : "en") })}</button>` +
          `<p class="rz-einst-fuss">${t("einst.paarspracheHinweis")}</p>`
        : "") +
      `</div>`;
    for (const b of blatt.querySelectorAll("[data-ansicht]"))
      b.addEventListener("click", () => waehleAnsicht(b.getAttribute("data-ansicht")));
    const antrag = blatt.querySelector("#einstSprachAntrag");
    if (antrag) antrag.addEventListener("click", async () => {
      const ziel = paar === "en" ? "de" : "en";
      try {
        const r = await backend.language.request(ziel);
        state.info.locale = r.locale;
        state.info.languageRequest = r.languageRequest;
        aktualisierePunkt();
        zeigePaarsprache();          // falls die Agenda gerade offen liegt
        zeigeEinstellungen();
      } catch (e) { err(fehlerText(e)); }
    });
    for (const b of blatt.querySelectorAll("[data-ui]"))
      b.addEventListener("click", async () => {
        const l = b.getAttribute("data-ui");
        if (l === getLocale()) return;
        setLocale(l);
        try { await backend.pstate.set("language", l); } catch { /* Umgebungen ohne pstate */ }
        relaunch();     // die Oberfläche wird in der neuen Sprache neu gebaut
      });
  }

  function verdrahteEinstellungen() {
    const knopf = chrome("pbEinst"), blatt = chrome("pbEinstBlatt");
    if (!knopf || !blatt || knopf.dataset.rzVerdrahtet) return;
    knopf.dataset.rzVerdrahtet = "1";
    knopf.addEventListener("click", ev => {
      ev.stopPropagation();
      const zu = blatt.classList.toggle("pb-hidden");
      knopf.setAttribute("aria-expanded", String(!zu));
      if (!zu) zeigeEinstellungen();
    });
    doc.addEventListener("click", ev => {
      if (blatt.classList.contains("pb-hidden")) return;
      if (blatt.contains(ev.target) || knopf.contains(ev.target)) return;
      blatt.classList.add("pb-hidden");
      knopf.setAttribute("aria-expanded", "false");
    });
  }

  /* ---- Paarsprache: beidseitig bestätigter Wechsel (S30·C3).
     Die Karte ist reine Ansicht auf den Backend-Zustand — die Invariante
     (Wechsel nur bei zwei gleichlautenden Anträgen verschiedener Rollen)
     erzwingt der Worker bzw. das lokale Backend, nie die UI. ---- */
  function sprachName(l) { return t("paarspr.name." + (l === "en" ? "en" : "de")); }
  function zeigePaarsprache(meldung) {
    // D12-2d · Die Karte lebt jetzt in der Agenda unter den Absprachen. Kein
    // Aufklapp-Link mehr: wer die Agenda offen hat, sieht den Stand sofort.
    // Der Wartepunkt bei einem offenen Antrag sitzt am Einstellungs-Zeichen
    // (aktualisierePunkt) — sonst bliebe ein Antrag ungesehen liegen.
    const box = $("agendaSprache");
    if (!box) return;                      // Agenda gerade nicht gerendert
    if (!backend.language) { box.classList.add("pb-hidden"); return; }
    box.classList.remove("pb-hidden");
    const aktuell = state.info.locale === "en" ? "en" : "de";
    const wunsch = state.info.languageRequest;
    aktualisierePunkt();
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
    box.innerHTML =
      `<div class="pb-ag-kopf">${t("paarspr.agendaKopf")}</div>` +
      `<p class="rz-fein-abstand">${mitte}</p>` + knoepfe +
      (meldung ? `<p class="rz-fein-betont" id="psMeldung">${meldung}</p>` : "") +
      `<p class="pb-sub rz-oben-2">${t("paarspr.hinweisLaufend")}</p>`;
    const anwenden = r => {
      state.info.locale = r.locale;
      state.info.languageRequest = r.languageRequest;
      zeigePaarsprache(r.status === "confirmed"
        ? t("paarspr.gewechselt", { sprache: sprachName(r.locale) })
        : "");
    };
    const knopf = (id, fn) => { const b = box.querySelector(id); if (b) b.addEventListener("click", () => fn().then(anwenden).catch(e => err(fehlerText(e)))); };
    knopf("#psAntrag", () => backend.language.request(ziel));
    knopf("#psJa", () => backend.language.request(w.target));
    knopf("#psZurueck", () => backend.language.withdraw());
    knopf("#psNein", () => backend.language.withdraw());
  }
  return { aktualisierePunkt, waehleAnsicht, zeigeEinstellungen, verdrahteEinstellungen,
           sprachName, zeigePaarsprache };
}
