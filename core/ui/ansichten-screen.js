// R4b · Die fünf Vorraum-Ansichten: Zeitleiste, Regal, Agenda, Prozessreflexion,
// Gemeinsame Momente.
//
// Sie gehören zusammen, weil sie dieselbe Rolle spielen — Aufklapp-Ansichten im
// Vorraum, die etwas Abgelegtes zeigen, statt ein Gespräch zu führen. Und sie
// haben, gemessen statt geschätzt, fast dieselbe schmale Abhängigkeitsfläche:
// $, backend, state, zeigeNur.
//
// Drei Dinge bleiben bewusst in app.js und werden hereingereicht:
//   · zeigeNur          — Sichtbarkeitslogik aller Aufklappboxen, nicht nur dieser
//   · rhythmusSektion   — auch außerhalb der Agenda gebraucht
//   · zeitleistenEintrag — auch vom Chat-Abschluss gebraucht
//   · zeigePaarsprache  — lebt in einstellungen-screen.js
// Sie hier mitzunehmen hieße, Zuständigkeit nach Aufrufhäufigkeit zu verteilen
// statt nach Zugehörigkeit.

import { t, fuelle } from "../i18n/index.js";
import { esc } from "./html.js";
import { redigiereRegalFuerRolle, redigiereAgendaFuerRolle, inKarenz } from "../engine/regal.js";
import { markiereGelesen, hebeInAgenda, raeumeAgendaAb, merkeVor, nimmFreigabeZurueckAb } from "./sessions.js";
import { formatiereVerlauf, formatiereMessrunde, holeMessIntervall, messFenster,
         trageMessbeitragEin } from "./prozess.js";
import { zeitraumText, rhythmusText } from "./zeit-texte.js";
import { holeVerlauf, loescheVerlauf } from "./verlauf-ablage.js";   // S95.7c

/**
 * @param {object} ctx
 * @param {(id:string)=>Element} ctx.$
 * @param {object} ctx.backend
 * @param {object} ctx.state
 * @param {(id:string)=>void} ctx.zeigeNur
 * @param {Function} ctx.rhythmusSektion
 * @param {Function} ctx.zeitleistenEintrag
 * @param {Function} ctx.zeigePaarsprache
 */
export function macheAnsichtenScreen({ $, backend, state, zeigeNur, rhythmusSektion,
                                       zeitleistenEintrag, zeigePaarsprache,
                                       oeffneReplay, laeuftGespraech, hinweis, bestaetige }) {
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
                `<div class="pb-hidden rz-oben-1" id="zlDet${i}">` +
                det.map(dd => `<div class="rz-klein-leise"><strong>${esc(dd.id)}</strong> ${esc(dd.text)}</div>`).join("") +
                `</div>`
              : "") +
            /* S95.7c · Eingang NUR wo ein Verlauf liegt — keine ausgegraute Tuer
               und kein Hinweis auf Fehlendes. Und still wie das Regal: kein
               Zaehler, kein Badge. Wer hinschaut, findet ihn; wer die Zeitleiste
               liest, wird nicht daran erinnert. */
            (e2.vid
              ? `<br><span class="pb-link" data-zlteil="${esc(e2.vid)}">${t("verlauf.zlEingang")}</span>` +
                ` <span class="pb-link rz-klein-leise" data-zlweg="${esc(e2.vid)}">${t("verlauf.zlLoeschen")}</span>`
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

    /* S95.7c · Der Replay-Eingang. Er oeffnet DASSELBE Panel wie am
       Sessionende — engine = null, weil eine abgeschlossene Session inert ist.
       Der Freigabepfad laeuft dann bis quereGate durch und ueberspringt nur die
       Quittung ans Modell (Bauvorschrift aus S96.1). */
    for (const b of items.querySelectorAll("[data-zlteil]"))
      b.addEventListener("click", async () => {
        if (laeuftGespraech && laeuftGespraech()) { hinweis(t("verlauf.zlLaeuft")); return; }
        const v = await holeVerlauf(backend, b.getAttribute("data-zlteil"));
        if (!v) { hinweis(t("verlauf.zlLaeuft")); return; }
        oeffneReplay(v);
      });

    for (const b of items.querySelectorAll("[data-zlweg]"))
      b.addEventListener("click", async () => {
        if (!(await bestaetige(t("verlauf.loeschFrage")))) return;
        await loescheVerlauf(backend, b.getAttribute("data-zlweg"));
        await zeigeZeitleiste();          // Eingang verschwindet mit dem Verlauf
      });
  }

  async function zeigeRegal() {
    // S95.3 · Doppelt gesichert: Auf Cloudflare hat der Worker schon redigiert
    // (Speicher-Garantie), auf Plattformen ohne Server ist DIES die Zusicherung.
    // Zweimal filtern ist folgenlos — die Funktion ist idempotent.
    const regal = redigiereRegalFuerRolle(
      (await backend.bstate.get("shelf")) || { items: [] }, state.info.role);
    zeigeNur("boxRegal");
    $("boxRegal").classList.remove("pb-hidden");
    $("regalTitel").textContent = t("regal.titel");
    $("regalIntro").textContent = t("regal.intro", { nameA: state.info.nameA, nameB: state.info.nameB });
    $("regalItems").innerHTML = regal.items.length
      ? regal.items.map(i => {
          const fremd = i.by !== state.info.name;
          // D5 · Empfang im Regal (Design 17f): Von-Caps-Zeile ueber dem Text,
          // Initial-Badge solange ungelesen; Status und Handgriffe leise darunter.
          return `<div class="pb-item rz-regal-eintrag">` +
            `<div class="rz-caps rz-von">${fremd && !i.read ? `<span class="rz-initial">${esc((i.by || "?")[0].toUpperCase())}</span> ` : ""}${t("allg.von", { name: esc(i.by) })}</div>` +
            regalKoerper(i) +
            (i.wish ? `<br><span class="pb-sub">${t("gate.wish")}${esc(i.wish)}</span>` : "") +
            `${i.read || i.gehoben ? `<br><span class="pb-sub">${i.read ? t("regal.stGelesen") : ""}${i.read && i.gehoben ? " · " : ""}${i.gehoben ? t(i.alsZiel ? "regal.stZielVorschlag" : "regal.stInAgenda") : ""}</span>` : ""}` +
            (fremd && !i.read ? ` <button class="pb-btn rz-pille-eng" data-gelesen="${i.id}">${t("regal.btnGelesen")}</button>` : "") +
            (fremd && !i.gehoben ? ` <button class="pb-btn rz-pille-eng" data-heben="${i.id}">${t("regal.btnBesprechen")}</button>` +
              ` <button class="pb-btn rz-pille-eng" data-ziel="${i.id}">${t("regal.btnZiel")}</button>` : "") +
            // D5 · Der Owner sieht einen RUHIGEN Zustand, keinen Countdown —
            // ein tickender Timer erzeugt genau die Anspannung, gegen die die
            // Karenz gedacht ist.
            (!fremd && inKarenz(i) ? `<br><span class="pb-sub">${t("regal.stZurueckziehbar")}</span>` +
              ` <button class="pb-btn rz-pille-eng" data-zurueck="${esc(i.freigabe || "")}">${t("regal.btnZurueckziehen")}</button>` : "") +
            `</div>`;
        }).join("")
      : `<div class="pb-item">${t("regal.leer")}</div>`;
    for (const b of $("regalItems").querySelectorAll("[data-gelesen]"))
      b.addEventListener("click", async () => { await markiereGelesen(backend, b.getAttribute("data-gelesen")); zeigeRegal(); });
    for (const b of $("regalItems").querySelectorAll("[data-heben]"))
      b.addEventListener("click", async () => { await hebeInAgenda(backend, b.getAttribute("data-heben")); zeigeRegal(); });
    for (const b of $("regalItems").querySelectorAll("[data-ziel]"))
      b.addEventListener("click", async () => { await hebeInAgenda(backend, b.getAttribute("data-ziel"), { alsZiel: true }); zeigeRegal(); });
    for (const b of $("regalItems").querySelectorAll("[data-zurueck]"))
      b.addEventListener("click", async () => { await nimmFreigabeZurueckAb(backend, b.getAttribute("data-zurueck")); zeigeRegal(); });
  }

  /* S96.3 · Zwei Artefakt-Formen, zwei Darstellungen. Der Ausschnitt ist eine
     SZENE, keine Aussage — als Fließtext gelesen verlöre er genau das, was ihn
     wertvoll macht: dass man dem Denken beim Arbeiten zusieht. Die Auslassungen
     erscheinen hier so wie in der Vorschau des Absenders (D2). */
  function regalKoerper(i) {
    if (i.kind !== "excerpt" || !Array.isArray(i.pairs) || !i.pairs.length)
      return `<span class="rz-regal-text">${esc(i.text || "")}</span>`;
    return `<div class="rz-ausschnitt">` +
      `<div class="pb-sub rz-denkarbeit">${esc(fuelle(t("ausschnitt.denkarbeit"), { name: i.by }))}</div>` +
      (i.frame ? `<p class="rz-regal-text rz-rahmensatz">${esc(i.frame)}</p>` : "") +
      i.pairs.map(pr =>
        (pr.gapBefore ? `<div class="rz-luecke rz-mitte-leise">…</div>` : "") +
        `<div class="rz-paar-lesen rz-polster-y">` +
        `<div class="pb-sub rz-unten-1">${esc(pr.question)}</div>` +
        `<span class="rz-regal-text">${esc(pr.answer)}</span></div>`).join("") +
      `</div>`;
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
    const ruht = auftraege.filter(a => a.status === "resting");   // S60: Writer (sessions.js) setzt "resting" — "rest" ist nur der Block-OP
    const auftragZeile = a =>
      `<div class="pb-item">${esc(a.text)}<br><span class="pb-sub">${esc(a.id)} · ${t(a.art === "shared" ? "agenda.artGemeinsam" : "agenda.artIndividuell")}${a.owner ? " · " + esc(a.owner) : ""}</span></div>`;
    const punktZeile = i =>
      `<div class="pb-item">${esc(i.text)}<br><span class="pb-sub">${t("allg.von", { name: esc(i.by) })} · ${t("agenda.st." + i.state)}` +
      `${i.zielKandidat ? " · " + t("agenda.stKandidat") : ""}${i.vormerkung ? " · " + t("agenda.stVor") : ""}</span>` +
      (i.state === "open"
        ? (i.vormerkung ? "" : ` <button class="pb-btn rz-pille-eng" data-vor="${i.id}">${t("agenda.btnVor")}</button>`) +
          ` <button class="pb-btn rz-pille-eng" data-abr="${i.id}">${t("agenda.btnAbr")}</button>`
        : "") + `</div>`;
    // S76 · Ziele und Gesprächspunkte deutlich getrennt: je Gruppe ein eigener
    // Kartenblock (Ziele mit Akzentleiste, Punkte neutral); das Backlog ruht
    // als Untergruppe im Ziele-Block.
    $("agendaItems").innerHTML =
      `<div class="pb-ag-block pb-ag-ziele">` +
      `<div class="pb-ag-kopf">${t("agenda.gruppeAuftraege")}</div>` +
      (aktiv.length ? aktiv.map(auftragZeile).join("") : `<div class="pb-item">${t("agenda.auftraegeLeer")}</div>`) +
      (ruht.length
        ? `<div class="pb-ag-kopf rz-oben-3">${t("agenda.gruppeBacklog")}</div>` +
          `<p class="pb-sub rz-eng">${t("agenda.backlogHinweis")}</p>` +
          ruht.map(auftragZeile).join("")
        : "") +
      `</div>` +
      `<div class="pb-ag-block pb-ag-punkte">` +
      `<div class="pb-ag-kopf">${t("agenda.gruppePunkte")}</div>` +
      (items.length ? items.map(punktZeile).join("") : `<div class="pb-item">${t("agenda.leer")}</div>`) +
      `</div>` +
      `<div id="agendaAbsprachen"></div>` +
      `<div class="pb-ag-block" id="agendaSprache"></div>`;
    for (const b of $("agendaItems").querySelectorAll("[data-abr]"))
      b.addEventListener("click", async () => { await raeumeAgendaAb(backend, b.getAttribute("data-abr"), "selfResolved"); zeigeAgenda(); });
    for (const b of $("agendaItems").querySelectorAll("[data-vor]"))
      b.addEventListener("click", async () => { await merkeVor(backend, b.getAttribute("data-vor")); zeigeAgenda(); });
    // S44 · "Weitere Absprachen": Prozessreflexions-Rhythmus lebt jetzt hier.
    await rhythmusSektion($("agendaAbsprachen"));
    // D12-2d · Die Paarsprache ist eine Absprache und wohnt deshalb hier,
    // nicht im persönlichen Einstellungs-Blatt.
    zeigePaarsprache();
  }

  async function zeigeMess() {
    const box = $("boxMess");
    if (!box) return;
    // S88: die Karte lebt im eigenen Raum scrProzess — kein zeigeNur, kein
    // Auf-/Zuklappen mehr; jedes Betreten rendert frisch.
    const [mr, goals, iv] = await Promise.all([
      backend.bstate.get("measurements"), backend.bstate.get("goals"), holeMessIntervall(backend),
    ]);
    const offen = ((mr && mr.items) || []).find(r => r.status === "open");
    if (offen && offen.values[state.info.role]) {
      box.innerHTML = `<div class="pb-sub">${t("mess.titel")}</div><p class="rz-klein">${t("mess.abgegeben")}</p>`;
      return;
    }
    // S39 · Rhythmus-Fenster: eine NEUE Runde öffnet erst nach dem vereinbarten
    // Abstand; eine offene Runde des Partners bleibt immer beantwortbar.
    if (!offen) {
      const fenster = messFenster(mr, state.info.role, iv.days);
      if (!fenster.offen) {
        box.innerHTML = `<div class="pb-sub">${t("mess.titel")}</div>` +
          `<p class="rz-klein">${t("mess.gesperrt", { rhythmus: rhythmusText(iv.days), datum: esc((fenster.naechsteAb || "").slice(0, 10)) })}</p>`;
        return;
      }
    }
    const zeitraum = zeitraumText(iv.days);
    const aktive = (((goals && goals.items) || [])).filter(a => a.status === "active" && a.art === "shared");
    box.innerHTML =
      `<div class="pb-sub">${t("mess.verdeckt", { partner: esc(state.info.partner) })}</div>` +
      `<label class="rz-fein-block">${t("mess.closeness", { partner: esc(state.info.partner), zeitraum })}<br><input id="msNaehe" type="range" min="1" max="10" value="5" class="rz-voll"></label>` +
      `<label class="rz-fein-block">${t("mess.guess", { partner: esc(state.info.partner), zeitraum })}<br><input id="msZweit" type="range" min="1" max="10" value="5" class="rz-voll"></label>` +
      // S88 · Themen-Regler: Gruppenzeile sagt die Herkunft (und implizit,
      // warum individuelle Ziele hier fehlen); die Frage traegt KEINE Wire-ID
      // mehr — die ID bleibt im data-pass-Attribut und im fit-Objekt (Wire
      // unberuehrt: formatiereMessrunde/Agenda zeigen sie weiter als Referenz).
      (aktive.length ? `<div class="pb-sub rz-oben-3">${t("mess.gruppeThemen")}</div>` : "") +
      aktive.map(a =>
        `<label class="rz-fein-block">${t("mess.fit", { text: esc(a.text) })}<br><input data-pass="${esc(a.id)}" type="range" min="1" max="10" value="5" class="rz-voll"></label>`
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
      box.innerHTML = `<div class="pb-sub">${t("mess.titel")}</div><p class="rz-klein">${t("mess.danke")}` +
        (runde.status === "ready" ? t("mess.bereit") : "") + `</p>`;
    });
  }

  async function zeigeMomente() {
    const box = $("boxQz");
    zeigeNur("boxQz");
    box.classList.remove("pb-hidden");
    const [momentLog, revealLog, messungen] = await Promise.all([
      backend.bstate.get("momentLog").catch(() => null),
      backend.bstate.get("revealLog").catch(() => null),
      backend.bstate.get("measurements").catch(() => null),
    ]);
    const eintraege = [];
    // S89 · Aufgedeckte Prozessreflexionen erscheinen im Zeitstrahl —
    // ABGELEITET aus measurements (revealedAt), kein eigener Log nötig
    // (revealLog ist ein Einzelobjekt der Auftrags-Aufdeckung, kein Verlauf).
    for (const r of ((messungen && messungen.items) || []))
      if (r.status === "revealed" && r.revealedAt)
        eintraege.push({ at: r.revealedAt, art: t("momente.artProzess"), text: t("momente.prozessStandard"), themen: "", impuls: null });
    for (const e2 of ((momentLog && momentLog.entries) || []))
      eintraege.push({ at: e2.at || "", art: t("momente.artQz"), text: e2.summary || "",
        themen: (e2.topics || []).join(" · "), impuls: e2.gentleInvitation || null });
    if (revealLog && revealLog.at)
      eintraege.push({ at: revealLog.at, art: t("momente.artAufdeck"), text: revealLog.summary || t("momente.aufdeckStandard"), themen: "", impuls: null });
    eintraege.sort((a, b) => (a.at < b.at ? -1 : 1));
    box.innerHTML = `<div class="pb-sub">${t("momente.titel")}</div>` +
      `<p class="pb-sub rz-eng">${t("momente.intro")}</p>` +
      (eintraege.length ? eintraege.map(e2 =>
        `<div class="pb-item"><span class="pb-sub">${esc((e2.at || "").slice(0, 10))} · ${esc(e2.art)}${e2.themen ? " · " + esc(e2.themen) : ""}</span><br>${esc(e2.text)}` +
        (e2.impuls ? `<br><span class="pb-sub">${t("momente.impuls")} ${esc(e2.impuls)}</span>` : "") + `</div>`
      ).join("") : `<p class="rz-klein">${t("momente.leer")}</p>`);
  }
  return { zeigeZeitleiste, zeigeRegal, regalKoerper, zeigeAgenda, zeigeMess, zeigeMomente };
}
