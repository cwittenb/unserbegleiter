// R4b · Ausschnitt-Auswahl und Vorschau.
//
// Die dichteste bisher herausgelöste Gruppe — und die erste mit EIGENEM
// Zustand: `ausw` hält die laufende Auswahl (gewählte Paare, Anker, Phase,
// Rahmensatz). Er lebt jetzt hier statt in der createApp-Closure.
//
// Der einzige Punkt, an dem app.js diesen Zustand von außen brauchte, war
// renderMsgs:
//
//     if (ausw) { (ausw.phase === "vorschau" ? renderVorschau : renderAuswahl)(box); … }
//
// Also: Zustand prüfen UND nach Phase verzweigen — app.js musste die Phasen
// kennen, obwohl sie es nichts angehen. Beides fasst jetzt `zeichneAuswahl(box)`
// zusammen: Es zeichnet, wenn eine Auswahl offen ist, und meldet das zurück.
// app.js fragt danach nur noch „hast du gezeichnet?" und weiß nichts mehr über
// Phasen — die Schnittstelle ist schmaler als der Zustand, den sie verbirgt.

import { t, fuelle } from "../i18n/index.js";
import { K } from "../prompts/prompts.js";
import { esc } from "./html.js";
import { paarWaehlbar, paarGrund, waehleUm, fuelleSpanne, ueberRichtwert, baueAusschnitt,
         paareAusVerlauf, hatStilleLuecken } from "../engine/ausschnitt.js";
import { WEGE_FUER } from "../engine/regal.js";
import { quereGate } from "./sessions.js";

/**
 * @param {object} ctx
 * @param {(id:string)=>Element} ctx.$
 * @param {Function} ctx.el                DOM-Kurzbau der App
 * @param {object} ctx.state
 * @param {object} ctx.backend
 * @param {(msg:string)=>void} ctx.err
 * @param {Function} ctx.renderMsgs        Voll-Rerender des Verlaufs
 * @param {Function} ctx.warteAntwort      Wartepfad für Modell-Antworten
 */
export function macheAuswahlScreen({ $, el, state, backend, err, renderMsgs, warteAntwort }) {
  let ausw = null;   // {paare, eignung, gewaehlt:Set, anker, phase, rahmen, …}

  /** Ruhiger Zugang nach dem Eignungsbericht — nie aufgedrängt. */
  function ausschnittAngebot(eignung, engine) {
    const p = $("ausschnittPanel");
    if (!p) return;
    const paare = paareAusVerlauf(engine.chat.messages);
    const wahl = paare.filter(x => paarWaehlbar(eignung, x.id));
    if (!wahl.length) return;            // keine Tür statt einer verschlossenen
    p.classList.remove("pb-hidden");
    p.innerHTML = `<button class="rz-zeile rz-knopf-flach" id="btnAuswStart"><span>${esc(t("ausschnitt.zugang"))}</span><span class="rz-pfeil">→</span></button>`;
    p.querySelector("#btnAuswStart").addEventListener("click", () => {
      p.classList.add("pb-hidden");
      starteAuswahl(paare, eignung, engine);
    });
  }

  function starteAuswahl(paare, eignung, engine) {
    ausw = {
      paare, eignung, engine,
      gewaehlt: new Set(),             // Startzustand LEER — Vorauswahl wäre ein Nudge
      anker: null, phase: "auswahl",
      rahmen: "", hinweis: false,      // Richtwert-Hinweis fällt genau EINMAL
      gruende: new Set(),              // Grund je Paar ebenfalls einmal
      luecken: hatStilleLuecken(paare, eignung),
    };
    renderMsgs(true);
  }

  function beendeAuswahl() { ausw = null; renderMsgs(true); }

  /** Auswahlfläche: Paar-Blöcke statt Blasen. */
  function renderAuswahl(box) {
    box.innerHTML = "";
    const kopf = el("div", "pb-echo");
    kopf.textContent = ausw.luecken ? t("ausschnitt.luecken") : t("ausschnitt.anleitung");
    kopf.setAttribute("style", "align-self:center;font-size:12px;color:var(--rz-leiser);padding:6px 0;text-align:center");
    box.appendChild(kopf);

    for (const paar of ausw.paare) {
      const wahlbar = paarWaehlbar(ausw.eignung, paar.id);
      const an = ausw.gewaehlt.has(paar.id);
      const b = el("div", "rz-paar");
      b.setAttribute("data-paar", paar.id);
      b.setAttribute("role", "button");
      b.setAttribute("tabindex", "0");
      b.setAttribute("aria-pressed", an ? "true" : "false");
      if (!wahlbar) b.setAttribute("aria-disabled", "true");
      // Kein Häkchen, kein Badge an bestandenen Paaren: Wer seine Auswahl
      // abgenommen bekommt, sitzt in einer Klassenarbeit.
      b.setAttribute("style",
        "border:1px solid " + (an ? "var(--rz-tiefgruen)" : "var(--rz-karte-rand)") +
        ";background:" + (an ? "var(--rz-karte)" : "transparent") +
        ";border-radius:14px;padding:10px 12px;margin:6px 0;" +
        (wahlbar ? "cursor:pointer" : "opacity:.45"));
      const f = el("div"); f.textContent = kuerze(paar.frage.text);
      f.setAttribute("style", "font-size:13px;color:var(--rz-leiser);margin-bottom:6px");
      const a = el("div"); a.textContent = kuerze(paar.antwort.text);
      a.setAttribute("style", "font-size:14px");
      b.appendChild(f); b.appendChild(a);
      if (!wahlbar && ausw.gruende.has(paar.id)) {
        const g = el("div"); g.textContent = paarGrund(ausw.eignung, paar.id) || "";
        g.setAttribute("style", "font-size:12px;color:var(--rz-leiser);margin-top:6px;font-style:italic");
        b.appendChild(g);
      }
      verdrahtePaar(b, paar, wahlbar);
      box.appendChild(b);
    }

    const n = ausw.gewaehlt.size;
    const leiste = el("div");
    leiste.setAttribute("style", "position:sticky;bottom:0;background:var(--rz-papier);padding:8px 0 2px");
    const zaehler = el("div");
    zaehler.id = "auswZaehler";
    // Zähler schlicht: keine Lesezeit-Schätzung — das wäre eine Aussage über
    // den Empfänger, und für den spricht die Begleitung nicht.
    zaehler.textContent = fuelle(t("ausschnitt.zaehler"), { n });
    zaehler.setAttribute("style", "font-size:12px;color:var(--rz-leiser);text-align:center;padding-bottom:6px");
    leiste.appendChild(zaehler);
    if (ausw.hinweis) {
      const h = el("div"); h.id = "auswHinweis"; h.textContent = t("ausschnitt.richtwert");
      h.setAttribute("style", "font-size:12px;color:var(--rz-leiser);text-align:center;padding-bottom:6px");
      leiste.appendChild(h);
    }
    const weiter = el("button", "rz-zeile rz-knopf-flach" + (n ? "" : " rz-gedimmt"));
    weiter.id = "btnAuswWeiter"; weiter.disabled = !n;
    weiter.innerHTML = `<span>${esc(t("ausschnitt.weiter"))}</span><span class="rz-pfeil">→</span>`;
    weiter.addEventListener("click", () => { ausw.phase = "vorschau"; renderMsgs(true); });
    const ab = el("button", "rz-zeile rz-knopf-flach");
    ab.id = "btnAuswAbbruch";
    ab.innerHTML = `<span>${esc(t("ausschnitt.behalten"))}</span><span class="rz-pfeil">→</span>`;
    // Lautlos: keine Sicherheitsabfrage, keine Bilanz.
    ab.addEventListener("click", () => beendeAuswahl());
    leiste.appendChild(weiter); leiste.appendChild(ab);
    box.appendChild(leiste);
  }

  const KURZ = 220;
  const kuerze = txt => (txt.length > KURZ ? txt.slice(0, KURZ).trimEnd() + " …" : txt);

  /** Tippen = umschalten. Gedrückthalten = „bis hierhin". */
  function verdrahtePaar(b, paar, wahlbar) {
    let timer = null, lang = false;
    const tippen = () => {
      if (!wahlbar) {
        if (!ausw.gruende.has(paar.id)) { ausw.gruende.add(paar.id); renderMsgs(); }
        return;                                   // Grund genau EINMAL
      }
      ausw.gewaehlt = waehleUm(ausw.gewaehlt, ausw.eignung, paar.id);
      ausw.anker = ausw.gewaehlt.has(paar.id) ? paar.id : null;
      pruefeRichtwert(); renderMsgs();
    };
    const spanne = () => {
      lang = true;
      ausw.gewaehlt = fuelleSpanne(ausw.paare, ausw.gewaehlt, ausw.eignung, ausw.anker, paar.id);
      ausw.anker = paar.id;
      pruefeRichtwert(); renderMsgs();
    };
    b.addEventListener("pointerdown", () => { lang = false; timer = setTimeout(spanne, 500); });
    for (const ev of ["pointerup", "pointerleave", "pointercancel"])
      b.addEventListener(ev, () => { if (timer) { clearTimeout(timer); timer = null; } });
    b.addEventListener("click", () => { if (!lang) tippen(); lang = false; });
    // Zugänglichkeit: Gedrückthalten ist unsichtbar und mit Tastatur nicht
    // erreichbar — Umschalt+Enter ist die Entsprechung für „bis hierhin".
    b.addEventListener("keydown", e => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      if (e.shiftKey && wahlbar) spanne(); else tippen();
    });
  }

  function pruefeRichtwert() {
    if (!ausw.hinweis && ueberRichtwert(ausw.gewaehlt.size)) ausw.hinweis = true;
  }

  /* Vorschau — PFLICHT, nicht Komfort: Es gibt kein Nachbearbeiten (D1) und
     nach der Karenz ist es endgültig (D5). Vor allem existieren die „…" NUR
     hier: Im Verlauf ist ein nicht gewähltes Paar bloß nicht gewählt; dass
     daraus beim Leser eine sichtbare Lücke wird, ist auf der Auswahlfläche
     unsichtbar. Die Markierungspflicht soll aber beim ABSENDER wirken. */
  function renderVorschau(box) {
    box.innerHTML = "";
    const stuecke = baueAusschnitt(ausw.paare, [...ausw.gewaehlt]);
    const karte = el("div", "rz-teilen-block");
    const von = el("div", "rz-caps rz-von");
    von.textContent = fuelle(t("ausschnitt.denkarbeit"), { name: state.info.name });
    karte.appendChild(von);
    for (const st of stuecke) {
      if (st.gapBefore) {
        const l = el("div"); l.className = "rz-luecke"; l.textContent = "…";
        l.setAttribute("style", "text-align:center;padding:4px 0;opacity:.7");
        karte.appendChild(l);
      }
      const zeile = el("div");
      zeile.setAttribute("data-vorschau", st.id);
      zeile.setAttribute("style", "padding:6px 0");
      const f = el("div"); f.textContent = st.question;
      f.setAttribute("style", "font-size:13px;opacity:.75;margin-bottom:4px");
      const a = el("p", "rz-teilen-text"); a.textContent = st.answer;
      zeile.appendChild(f); zeile.appendChild(a);
      const weg = el("button");
      weg.setAttribute("data-weg-paar", st.id);
      weg.textContent = "×";
      weg.setAttribute("aria-label", t("ausschnitt.entfernen"));
      weg.setAttribute("style", "background:none;border:0;color:inherit;opacity:.6;font-size:16px;padding:0 4px");
      weg.addEventListener("click", () => {
        ausw.gewaehlt.delete(st.id);
        if (!ausw.gewaehlt.size) { ausw.phase = "auswahl"; }
        renderMsgs();
      });
      zeile.appendChild(weg);
      karte.appendChild(zeile);
    }
    box.appendChild(karte);

    const rahmen = el("textarea");
    rahmen.id = "auswRahmen";
    rahmen.setAttribute("maxlength", "280");
    rahmen.setAttribute("placeholder", t("ausschnitt.rahmenPlatzhalter"));
    rahmen.value = ausw.rahmen;
    rahmen.setAttribute("style", "width:100%;margin-top:10px;min-height:56px");
    rahmen.addEventListener("input", () => { ausw.rahmen = rahmen.value; });
    box.appendChild(rahmen);

    const wegName = { shelf: t("gate.weg.regal", { partner: state.info.partner }), moment: t("gate.weg.moment", { partner: state.info.partner }) };
    const wahl = el("div");
    wahl.innerHTML = WEGE_FUER("excerpt").map(w =>
      `<label class="rz-wahl"><input type="checkbox" data-weg="${w}"> ${esc(wegName[w])}</label>`).join("");
    box.appendChild(wahl);

    const frei = el("button", "rz-zeile rz-knopf-flach rz-gedimmt");
    frei.id = "btnAuswFreigeben"; frei.disabled = true;
    frei.innerHTML = `<span>${esc(t("allg.freigeben"))}</span><span class="rz-pfeil">→</span>`;
    const stand = () => {
      const gewaehlt = !!wahl.querySelector("input[data-weg]:checked");
      frei.disabled = !gewaehlt;
      frei.classList.toggle("rz-gedimmt", !gewaehlt);
    };
    for (const b of wahl.querySelectorAll("input[data-weg]")) b.addEventListener("change", stand);
    frei.addEventListener("click", async () => {
      const wege = [...wahl.querySelectorAll("input[data-weg]:checked")].map(x => x.getAttribute("data-weg"));
      if (!wege.length) return;
      const engine = ausw.engine;
      try {
        await quereGate(backend, {
          kind: "excerpt",
          pairs: baueAusschnitt(ausw.paare, [...ausw.gewaehlt]),
          frame: ausw.rahmen.trim() || null,
          selbstmitteilung: null, wish: null,
        }, wege);
      } catch (e) { err(e.message); return; }
      beendeAuswahl();
      if (!engine) return;
      await warteAntwort(() => engine.submitToolResult(fuelle(K().steuerTexte.freigabeGequert, { paths: wege.join(", ") })));
    });
    box.appendChild(frei);

    const zurueck = el("button", "rz-zeile rz-knopf-flach");
    zurueck.id = "btnAuswZurueck";
    zurueck.innerHTML = `<span>${esc(t("ausschnitt.zurueck"))}</span><span class="rz-pfeil">→</span>`;
    zurueck.addEventListener("click", () => { ausw.phase = "auswahl"; renderMsgs(true); });
    box.appendChild(zurueck);
  }
  /** Zeichnet die offene Auswahl in `box` — und meldet, ob es etwas zu zeichnen gab.
   *  Damit muss app.js weder `ausw` noch dessen Phasen kennen. */
  function zeichneAuswahl(box) {
    if (!ausw) return false;
    (ausw.phase === "vorschau" ? renderVorschau : renderAuswahl)(box);
    return true;
  }

  return { ausschnittAngebot, starteAuswahl, beendeAuswahl, zeichneAuswahl, pruefeRichtwert };
}
