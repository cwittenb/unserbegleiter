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

  /** Ruhiger Zugang nach dem Eignungsbericht — nie aufgedrängt.
   *  @param {object[]} [quelle] S106.5 · Nachrichten, aus denen die Paare
   *         stammen. Ohne Angabe: das laufende Gespräch. */
  function ausschnittAngebot(eignung, engine, quelle, quelleDatum) {
    const p = $("ausschnittPanel");
    if (!p) return false;
    /* S106.5 · Der Auswahl-Screen war immer schon quellenunabhaengig —
       starteAuswahl BEKOMMT die Liste. Nur hier war sie festverdrahtet, und
       genau daran scheiterte das Teilen aus einem frueheren Gespraech: Die
       Tuer oeffnete mit den Paaren des LAUFENDEN Gespraechs, das an der Stelle
       zwei Saetze lang ist. Eine Art von Auswahl, an einer Stelle, zwei
       moegliche Quellen. */
    const paare = paareAusVerlauf(quelle || engine.chat.messages);
    const wahl = paare.filter(x => paarWaehlbar(eignung, x.id));
    if (!wahl.length) return false;      // keine Tür statt einer verschlossenen
    p.classList.remove("pb-hidden");
    // U11.5 · Der Text traegt einen {partner}-Platzhalter — t() holt nur den
    // Rohtext, gefuellt wird mit fuelle(). Seit S96 stand hier woertlich
    // "Stellen aussuchen, die {partner} lesen darf".
    p.innerHTML = `<button class="rz-zeile rz-knopf-flach" id="btnAuswStart"><span>${esc(fuelle(t("ausschnitt.zugang"), { partner: state.info.partner }))}</span><span class="rz-pfeil">→</span></button>`;
    p.querySelector("#btnAuswStart").addEventListener("click", () => {
      p.classList.add("pb-hidden");
      starteAuswahl(paare, eignung, engine, quelleDatum);
    });
    return true;   // S95.7: die Verlaufs-Zeile haengt an derselben Bedingung
  }

  function starteAuswahl(paare, eignung, engine, quelleDatum) {
    ausw = {
      paare, eignung, engine, quelleDatum: quelleDatum || null,
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
    // §4.4 · Die Bedienanleitung stand hier und war bei fuenfzehn Paaren nach
    // dem ersten Wisch weg. Sie lebt jetzt im Wegweiser (weg.auswahlHalten),
    // der nicht mitscrollt. Hier bleibt nur, was ueber DIESE Auswahl etwas
    // sagt: dass Stellen fehlen. Ohne Luecken steht gar nichts.
    if (ausw.luecken) {
      const kopf = el("div", "pb-echo rz-ausw-kopf");
      kopf.textContent = t("ausschnitt.luecken");
      box.appendChild(kopf);
    }

    for (const paar of ausw.paare) {
      const wahlbar = paarWaehlbar(ausw.eignung, paar.id);
      const an = ausw.gewaehlt.has(paar.id);
      const b = el("div", "rz-paar" + (an ? " rz-an" : "") + (wahlbar ? "" : " rz-zu"));
      b.setAttribute("data-paar", paar.id);
      b.setAttribute("role", "button");
      b.setAttribute("tabindex", "0");
      b.setAttribute("aria-pressed", an ? "true" : "false");
      if (!wahlbar) b.setAttribute("aria-disabled", "true");
      // Kein Häkchen, kein Badge an bestandenen Paaren: Wer seine Auswahl
      // abgenommen bekommt, sitzt in einer Klassenarbeit.
      const f = el("div", "rz-paar-frage"); f.textContent = kuerze(paar.frage.text);
      const a = el("div", "rz-paar-antwort"); a.textContent = kuerze(paar.antwort.text);
      // §4.7 · Ohne Namen liest ein Screenreader den ganzen Block als Label
      // vor — zwei Absaetze Fliesstext, und aria-pressed sagt dabei nicht,
      // WAS gewaehlt ist. Der Name nennt die Frage, die Antwort wird
      // Beschreibung: erst wozu, dann was.
      a.id = "auswAntwort-" + paar.id;
      b.setAttribute("aria-label", fuelle(t("ausschnitt.ariaPaar"), { frage: paar.frage.text }));
      b.setAttribute("aria-describedby", a.id);
      b.appendChild(f); b.appendChild(a);
      if (!wahlbar && ausw.gruende.has(paar.id)) {
        const g = el("div", "rz-paar-grund"); g.textContent = paarGrund(ausw.eignung, paar.id) || "";
        b.appendChild(g);
      }
      verdrahtePaar(b, paar, wahlbar);
      box.appendChild(b);
    }

    // §1.1 · Die Leiste steht in der unteren Zone, nicht am Ende der Liste.
    const n = ausw.gewaehlt.size;
    const leiste = $("auswLeiste");
    if (!leiste) return;              // S87: leere Huelle, folgenlos
    leiste.innerHTML = "";
    const zaehler = el("div", "rz-ausw-fein");
    zaehler.id = "auswZaehler";
    // Zähler schlicht: keine Lesezeit-Schätzung — das wäre eine Aussage über
    // den Empfänger, und für den spricht die Begleitung nicht.
    zaehler.textContent = fuelle(t("ausschnitt.zaehler"), { n });
    leiste.appendChild(zaehler);
    if (ausw.hinweis) {
      const h = el("div", "rz-ausw-fein");
      h.id = "auswHinweis"; h.textContent = t("ausschnitt.richtwert");
      leiste.appendChild(h);
    }
    const weiter = el("button", "rz-zeile rz-knopf-flach" + (n ? "" : " rz-gedimmt"));
    weiter.id = "btnAuswWeiter"; weiter.disabled = !n;
    weiter.innerHTML = `<span>${esc(t("ausschnitt.weiter"))}</span><span class="rz-pfeil">→</span>`;
    weiter.addEventListener("click", () => { ausw.phase = "vorschau"; renderMsgs(true); });
    const ab = el("button", "rz-zeile rz-knopf-flach");
    ab.id = "btnAuswAbbruch";
    // §4.6 · Zwei Knoepfe gleicher Gestalt, verschiedene Richtung: "Ansehen,
    // wie es ankommt" fuehrt weiter (→), "Noch fuer mich behalten" verlaesst
    // die Flaeche und verwirft die Auswahl (←).
    ab.innerHTML = `<span>${esc(t("ausschnitt.behalten"))}</span><span class="rz-pfeil">←</span>`;
    // Lautlos: keine Sicherheitsabfrage, keine Bilanz.
    ab.addEventListener("click", () => beendeAuswahl());
    leiste.appendChild(weiter); leiste.appendChild(ab);
  }

  const KURZ = 220;
  const kuerze = txt => (txt.length > KURZ ? txt.slice(0, KURZ).trimEnd() + " …" : txt);

  /** Tippen = umschalten. Gedrückthalten = „bis hierhin". */
  function verdrahtePaar(b, paar, wahlbar) {
    // §4.5 · Gedrueckthalten war 500ms ohne jede Rueckmeldung: wer zu kurz
    // haelt, schaltet stattdessen um und haelt es fuer einen Fehler. Ab 150ms
    // zeigt die Oberkante an, dass etwas laeuft — leise, aber vorhanden.
    let timer = null, ahnung = null, lang = false;
    const losgelassen = () => {
      if (timer) { clearTimeout(timer); timer = null; }
      if (ahnung) { clearTimeout(ahnung); ahnung = null; }
      b.classList.remove("rz-halten");
    };
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
      losgelassen();
      ausw.gewaehlt = fuelleSpanne(ausw.paare, ausw.gewaehlt, ausw.eignung, ausw.anker, paar.id);
      ausw.anker = paar.id;
      pruefeRichtwert(); renderMsgs();
    };
    b.addEventListener("pointerdown", () => {
      lang = false;
      if (wahlbar) ahnung = setTimeout(() => b.classList.add("rz-halten"), 150);
      timer = setTimeout(spanne, 500);
    });
    for (const ev of ["pointerup", "pointerleave", "pointercancel"])
      b.addEventListener(ev, losgelassen);
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
    // §4.8 · Der Ausschnitt steht auf Papier. Der dunkle Kasten war eine
    // Zone ohne Naht mitten im Blatt; die Klasse bleibt fuer panels.js.
    const karte = el("div", "rz-vorschau");
    const von = el("div", "rz-caps rz-von");
    von.textContent = fuelle(t("ausschnitt.denkarbeit"), { name: state.info.name });
    karte.appendChild(von);
    for (const st of stuecke) {
      if (st.gapBefore) {
        const l = el("div", "rz-luecke"); l.textContent = "…";
        karte.appendChild(l);
      }
      const zeile = el("div", "rz-vorschau-zeile");
      zeile.setAttribute("data-vorschau", st.id);
      const f = el("div", "rz-vorschau-frage"); f.textContent = st.question;
      const a = el("p", "rz-teilen-text"); a.textContent = st.answer;
      zeile.appendChild(f); zeile.appendChild(a);
      const weg = el("button", "rz-vorschau-weg");
      weg.setAttribute("data-weg-paar", st.id);
      weg.textContent = "×";
      weg.setAttribute("aria-label", t("ausschnitt.entfernen"));
      weg.addEventListener("click", () => {
        ausw.gewaehlt.delete(st.id);
        if (!ausw.gewaehlt.size) { ausw.phase = "auswahl"; }
        renderMsgs();
      });
      zeile.appendChild(weg);
      karte.appendChild(zeile);
    }
    box.appendChild(karte);

    // §4.8 · Rahmensatz, Wege und Freigeben gehoeren zu dem, was das Geraet
    // verlaesst — also in die Tiefgruen-Zone, wie die Leiste der Auswahl.
    const unten = $("auswLeiste");
    if (!unten) return;              // S87: leere Huelle, folgenlos
    unten.innerHTML = "";

    const rahmen = el("textarea", "rz-feld rz-ausw-rahmen");   // U1: Feldkante
    rahmen.id = "auswRahmen";
    rahmen.setAttribute("maxlength", "280");
    rahmen.setAttribute("placeholder", t("ausschnitt.rahmenPlatzhalter"));
    rahmen.value = ausw.rahmen;
    rahmen.addEventListener("input", () => { ausw.rahmen = rahmen.value; });
    unten.appendChild(rahmen);

    const wegName = { shelf: t("gate.weg.regal", { partner: state.info.partner }), moment: t("gate.weg.moment", { partner: state.info.partner }) };
    const wahl = el("div");
    wahl.innerHTML = WEGE_FUER("excerpt").map(w =>
      `<label class="rz-wahl"><input type="checkbox" data-weg="${w}"><span>${esc(wegName[w])}</span></label>`).join("");
    unten.appendChild(wahl);

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
          /* S106.6 · Stammt der Ausschnitt aus einem FRUEHEREN Gespraech,
             traegt er dessen Datum. Ohne Herkunft liest der Partner Saetze von
             vor zwei Wochen, als waeren sie von heute — und Zeit aendert, wie
             ein Satz ankommt. Bei einem Ausschnitt aus dem laufenden Gespraech
             bleibt das Feld leer: Dort ist "heute" die Selbstverstaendlichkeit,
             die keine Angabe braucht. */
          sourceDate: (ausw.quelleDatum || null),
          selbstmitteilung: null, wish: null,
        }, wege);
      } catch (e) { err(e.message); return; }
      beendeAuswahl();
      if (!engine) return;
      await warteAntwort(() => engine.submitToolResult(fuelle(K().steuerTexte.freigabeGequert, { paths: wege.join(", ") })));
    });
    unten.appendChild(frei);

    const zurueck = el("button", "rz-zeile rz-knopf-flach");
    zurueck.id = "btnAuswZurueck";
    zurueck.innerHTML = `<span>${esc(t("ausschnitt.zurueck"))}</span><span class="rz-pfeil">→</span>`;
    zurueck.addEventListener("click", () => { ausw.phase = "auswahl"; renderMsgs(true); });
    unten.appendChild(zurueck);
  }
  /** Zeichnet die offene Auswahl in `box` — und meldet, ob es etwas zu zeichnen gab.
   *  Damit muss app.js weder `ausw` noch dessen Phasen kennen. */
  function zeichneAuswahl(box) {
    // §1.1 · Die Schreibkante gehoert waehrend der Auswahl der Leiste. Das
    // Umschalten steht hier, weil hier ohnehin ueber "offen oder nicht"
    // entschieden wird — und weil so kein zweiter Ort davon wissen muss.
    // U4 · Die untere Zone gehoert dem Modul in BEIDEN Phasen: in der Auswahl
    // traegt sie Zaehler und Wege hinaus, in der Vorschau Rahmensatz, Wege und
    // Freigeben. Nur der Wegweiser-Text unterscheidet die Phasen (auswahlOffen).
    const schirm = $("scrChat"), leiste = $("auswLeiste");
    const offen = !!ausw;
    if (schirm) schirm.classList.toggle("rz-auswahl", offen);
    if (leiste) {
      leiste.classList.toggle("pb-hidden", !offen);
      if (!offen) leiste.innerHTML = "";
    }
    if (!ausw) return false;
    (ausw.phase === "vorschau" ? renderVorschau : renderAuswahl)(box);
    return true;
  }

  /** §4.4 · Der Wegweiser traegt die Bedienanleitung der Auswahl. Er muss
   *  dafuer nur wissen, OB gerade ausgewaehlt wird — nicht, in welcher Phase. */
  const auswahlOffen = () => !!ausw && ausw.phase !== "vorschau";

  return { ausschnittAngebot, starteAuswahl, beendeAuswahl, zeichneAuswahl,
           pruefeRichtwert, auswahlOffen };
}
