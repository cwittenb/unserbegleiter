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
import { verlaufEinstellung, EINST_VERLAUF, loescheAlleVerlaeufe, zaehleVerlaeufe } from "./verlauf-ablage.js";   // S95.7b
import { oeffneExtern } from "./rechtliches.js";   // L3
import { geraeteSchalter } from "./geraeteschalter.js";   // S119.7

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
export function macheEinstellungenScreen({ doc, $, chrome, backend, state, err, relaunch, bestaetige }) {

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

  /* U7 (Turn 41 · Nachtrag) · Aus dem Blatt ist ein Ort geworden. Gerendert
     wird in zwei Zonen: oben, was nur auf diesem Geraet gilt, unten, was
     Folgen hat. Der Wiedereinstieg und das Loeschen stehen fest im Markup —
     sie brauchen die Aufklapp-Mechanik (data-box) und ihre Verdrahtung vom
     Start; alles andere wird bei jedem Betreten neu gezeichnet. */
  async function zeigeEinstellungen() {
    const oben = $("einstOben"), gemeinsam = $("einstGemeinsam");
    if (!oben || !gemeinsam) return;
    const verlaufModus = await verlaufEinstellung(backend);   // S95.7b
    const ansicht = doc.documentElement.getAttribute("data-ansicht") || "auto";
    const ui = getLocale();
    const paar = state.info && state.info.locale === "en" ? "en" : "de";
    const offen = state.info && state.info.languageRequest;
    const partner = (state.info && state.info.partner) || "";

    /* §2 · Die Wahl ist eine Haarlinien-Zeile mit Haken rechts. Der Haken
       traegt aria-hidden, weil aria-pressed die Aussage schon macht. */
    const wahl = (gruppe, wert, text, aktiv) =>
      `<button class="rz-zeile rz-einst-wahl${aktiv ? " an" : ""}" data-${gruppe}="${wert}" aria-pressed="${aktiv}">` +
      `<span>${esc(text)}</span><span class="rz-haken" aria-hidden="true">\u2713</span></button>`;
    const gruppe = (titel, inhalt) =>
      `<div class="rz-einst-gruppe"><div class="rz-caps">${esc(titel)}</div>${inhalt}</div>`;
    const hinweis = text => `<p class="rz-einst-fuss">${esc(text)}</p>`;

    oben.innerHTML =
      gruppe(t("einst.ansicht"),
        wahl("ansicht", "light", t("theme.hell"), ansicht === "light") +
        wahl("ansicht", "dark", t("theme.dunkel"), ansicht === "dark") +
        wahl("ansicht", "auto", t("theme.auto"), ansicht === "auto")) +
      // 3.4 · Zwei Hinweise zu einem: was die Begleitung spricht UND wie weit
      // die eigene Wahl reicht.
      gruppe(t("einst.sprache"),
        wahl("ui", "de", t("paarspr.name.de"), ui === "de") +
        wahl("ui", "en", t("paarspr.name.en"), ui === "en") +
        hinweis(t("einst.spracheHinweis", { sprache: sprachName(paar) }))) +
      /* S95.7b · Vorgabe ist "aufbewahren" (F0) — deshalb keine Empfehlung und
         keine Aussage darueber, was andere tun. Der Hinweis sagt, was
         passiert, nicht was gut waere. */
      gruppe(t("verlauf.einstTitel"),
        wahl("verlauf", "immer", t("verlauf.einstImmer"), verlaufModus === "immer") +
        wahl("verlauf", "fragen", t("verlauf.einstFragen"), verlaufModus === "fragen") +
        hinweis(t("verlauf.einstErklaerung")));

    /* D12-2f · Der Antrag wird hier gestellt, verhandelt wird er in der
       Agenda: die Zeile legt den Eintrag an, die Absprache lebt dort.
       Er steht UNTEN, weil er das Geraet verlaesst — anders als die
       Sprachwahl darueber, die nur hier gilt. */
    gemeinsam.innerHTML = offen
      ? `<div class="rz-caps">${esc(t("einst.gruppeGemeinsam"))}</div>` +
        hinweis(t("einst.antragOffen", { sprache: sprachName(offen.target) }))
      : backend.language
      ? `<div class="rz-caps">${esc(t("einst.gruppeGemeinsam"))}</div>` +
        `<button class="rz-zeile rz-unten rz-knopf-flach" id="einstSprachAntrag">` +
        `<span>${esc(t("einst.vorschlagen", { sprache: sprachName(paar === "en" ? "de" : "en") }))}</span>` +
        `<span class="rz-pfeil">\u2192</span></button>` +
        hinweis(t("einst.sprachvorschlagHinweis", { partner }))
      : "";

    await zeichneGeraeteSchalter();

    for (const b of oben.querySelectorAll("[data-verlauf]"))
      b.addEventListener("click", async () => {
        const v = b.getAttribute("data-verlauf");
        try { await backend.pstate.set(EINST_VERLAUF, v); } catch { /* still */ }
        zeigeEinstellungen();
      });
    for (const b of oben.querySelectorAll("[data-ansicht]"))
      b.addEventListener("click", () => waehleAnsicht(b.getAttribute("data-ansicht")));
    for (const b of oben.querySelectorAll("[data-ui]"))
      b.addEventListener("click", async () => {
        const l = b.getAttribute("data-ui");
        if (l === getLocale()) return;
        setLocale(l);
        try { await backend.pstate.set("language", l); } catch { /* Umgebungen ohne pstate */ }
        relaunch();     // die Oberfläche wird in der neuen Sprache neu gebaut
      });
    const antrag = gemeinsam.querySelector("#einstSprachAntrag");
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
  }

  /* S119.7 · Geraeteschalter. Plattformgebundene Ein/Aus-Zeilen (heute nur
     Benachrichtigungen) melden sich ueber core/ui/geraeteschalter.js an; hier
     werden sie gezeichnet. Der Kern erfaehrt nicht, WAS geschaltet wird.
     Kein Schalter angemeldet -> keine Zeile. Das ist der Regelfall in allen
     Umgebungen ohne Push (Artefakt, Tests, native Huelle ohne Erlaubnis) und
     der Grund, warum hier nichts vorgehalten wird: eine tote Zeile waere
     schlimmer als keine.
     Der Zustand wird bei jedem Zeichnen GEFRAGT, nie gemerkt — die Wahrheit
     liegt beim Browser und kann sich ausserhalb der App aendern. */
  async function zeichneGeraeteSchalter() {
    const wirt = $("einstGeraetSchalter");
    if (!wirt) return;
    const liste = geraeteSchalter();
    wirt.innerHTML = "";
    for (const s of liste) {
      let an = false;
      try { an = !!(await s.an()); } catch { continue; }   // fragt der Schalter nicht, zeigen wir ihn nicht
      const knopf = doc.createElement("button");
      knopf.type = "button";
      knopf.className = "rz-zeile rz-einst-wahl" + (an ? " an" : "");
      knopf.id = "einstSchalter-" + s.id;
      knopf.setAttribute("aria-pressed", String(an));
      const text = doc.createElement("span");
      text.textContent = s.label();
      const haken = doc.createElement("span");
      haken.className = "rz-haken";
      haken.setAttribute("aria-hidden", "true");
      haken.textContent = "\u2713";
      knopf.append(text, haken);
      knopf.addEventListener("click", async () => {
        knopf.disabled = true;
        try { await s.umschalten(); } catch { /* z. B. Erlaubnis verweigert */ }
        knopf.disabled = false;
        zeigeEinstellungen();          // Zustand neu erfragen statt annehmen
      });
      wirt.appendChild(knopf);
    }
  }

  /* 3.7 · Loeschen ist endgueltig und stand als normale Zeile neben dem
     Wiedereinstieg. Statt eines System-confirm klappt die Zeile auf, nennt
     die Zahl und fragt erst dann — dieselbe Bewegung, die das System schon
     kennt. K3 bleibt: Aufraeumen stellt die Vorgabe NICHT um. */
  async function zeigeLoeschFrage() {
    const box = $("boxVerlaeufeWeg");
    if (!box) return;
    let n = 0;
    try { n = await zaehleVerlaeufe(backend); } catch { /* still */ }
    box.innerHTML = `<p class="rz-einst-fuss">${esc(
      n ? t("verlauf.loeschAnzahl", { n }) : t("verlauf.loeschKeine"))}</p>`;
    if (!n) return;
    const ja = doc.createElement("button");
    ja.className = "rz-zeile rz-knopf-flach";
    ja.type = "button";
    ja.id = "btnVerlaeufeWegJa";
    ja.innerHTML = `<span></span><span class="rz-pfeil">\u2192</span>`;
    ja.firstChild.textContent = t("verlauf.loeschJa");
    box.appendChild(ja);
    ja.addEventListener("click", async () => {
      await loescheAlleVerlaeufe(backend);
      box.classList.add("pb-hidden");
      zeigeEinstellungen();
    });
  }

  /* U7/1.1 · Die Ecke oeffnet kein Panel mehr, sie fuehrt zu einem Ort.
     Damit entfallen auch die beiden Sonderwege des Panels: das
     stopPropagation und der Klick-ausserhalb-Waechter am document. Ein Ort
     schliesst sich nicht, wenn man danebentippt — man geht zurueck. */
  /* L3 · Die zwei Rechts-Zeilen stehen fest im Markup (app.js). Verdrahtet
     wird nur der Sonderfall: in der nativen Huelle darf der Link nicht IN der
     App aufgehen, sonst gibt es keinen Weg zurueck. Im Web passiert hier
     nichts — dann bleibt es ein gewoehnlicher Link mit target=_blank. */
  function verdrahteRechtsWege(wurzel) {
    for (const a of wurzel.querySelectorAll("[data-rz-recht]")) {
      if (a.dataset.rzVerdrahtet) continue;
      a.dataset.rzVerdrahtet = "1";
      a.addEventListener("click", ereignis => {
        if (oeffneExtern(a.getAttribute("href"), doc.defaultView || globalThis))
          ereignis.preventDefault();
      });
    }
  }

  /* S140 · Das Zeichen ist ein Kippschalter geworden. Vorher fuehrte jeder Tap
     hinein, auch der zweite — wer die Einstellungen mit demselben Zeichen
     wieder zumachen wollte, drueckte ins Leere.
     `verlasse` ist genau der Weg des Zurueck-Pfeils links (zurueckAus), nicht
     ein zweiter, eigener: Ein Ort soll nicht zwei verschiedene Ausgaenge
     haben. Damit gilt hier auch dessen Regel aus U10.3 — steht ein Fach
     offen, schliesst der erste Tap NUR das Fach. */
  function verdrahteEinstellungen(betrete, verlasse) {
    const knopf = chrome("pbEinst");
    if (!knopf || knopf.dataset.rzVerdrahtet) return;
    knopf.dataset.rzVerdrahtet = "1";
    knopf.addEventListener("click", () => {
      if (state.screen === "scrEinstellungen" && typeof verlasse === "function") { verlasse(); return; }
      zeigeEinstellungen();
      betrete("scrEinstellungen");
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
           verdrahteRechtsWege, sprachName, zeigePaarsprache, zeigeLoeschFrage };
}
