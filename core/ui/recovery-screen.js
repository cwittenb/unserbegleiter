// R4b · Wiedereinstieg per E-Mail — Karte, Pflicht-Modal und das gemeinsame
// Bauelement dazwischen.
//
// Erste Screen-Gruppe aus app.js herausgelöst. Sie eignet sich als erste, weil
// ihre Kanten dünn sind: baueVerifikation wird ausschließlich innerhalb dieser
// Gruppe gerufen, zeigeRecovery und zeigeEmailPflicht je genau einmal von
// außen. Es gibt keinen Rückgriff auf Chat, Engine, Panels oder Wegweiser.
//
// Anders als bei R4a ist das kein reines Verschieben: Die Gruppe hing über die
// createApp-Closure an doc, $, backend, state und wurzel. Diese Abhängigkeiten
// sind jetzt EXPLIZIT — die Fabrik nimmt sie entgegen, statt sie aus dem
// Sichtbarkeitsbereich zu greifen. Das ist der eigentliche Gewinn: Die Gruppe
// lässt sich mit einem gestellten Backend prüfen, ohne eine ganze App zu bauen.

import { t, fehlerText } from "../i18n/index.js";

/* ---- S115 · Notausgang bei gestoertem Versand (F3b) ---------------------
 *  Die Adress-Pflicht ist seit S115 der Normalfall: wer ohne bestaetigte
 *  Adresse in die App kommt, steht vor diesem Screen. Das ist richtig, solange
 *  der Weg dahinter funktioniert — und faellt in sich zusammen, wenn der
 *  Mailversand steht. Dann waere die App fuer JEDEN ohne Adresse zu, und der
 *  einzige Ausweg laege beim Betreiber ([vars] EMAIL_PFLICHT="0", ein Deploy).
 *
 *  Der Griff hier ist die Innenseite davon: Nach NOTAUS_AB gescheiterten
 *  Sendeversuchen kommt eine Zeile in die untere Zone, die in die App fuehrt.
 *  Drei Bedingungen halten ihn eng:
 *   · Gezaehlt wird NUR mail_failed (502). Ein Tippfehler in der Adresse
 *     (email_invalid), eine fremdbelegte Adresse (email_taken) und das
 *     Ratenlimit (verify_rate) sind keine Stoerung — sie machen den Ausgang
 *     nicht auf.
 *   · Er oeffnet erst beim ZWEITEN Fehlschlag. Ein einzelner kann ein Zucken
 *     sein; zwei sind eine Lage.
 *   · Er gilt 24 Stunden. Ohne Frist waere er ein stiller Dauer-Ausstieg;
 *     ohne Gedaechtnis muesste man ihn bei jedem Start neu erzwingen — zwei
 *     Fehlversuche bei jedem Oeffnen der App.
 *
 *  Der Speicher ist bewusst localStorage und nicht der pstate: Er soll auch
 *  dann tragen, wenn der Server gerade nicht alles kann, und er gehoert zum
 *  GERAET, nicht zur Person. */
const NOTAUS_SPEICHER = "pb.mailnotaus";
const NOTAUS_FRIST_MS = 24 * 60 * 60 * 1000;
export const NOTAUS_AB = 2;

export function notausAktiv(jetzt = Date.now) {
  try {
    const v = globalThis.localStorage && globalThis.localStorage.getItem(NOTAUS_SPEICHER);
    const at = Number(v);
    return Number.isFinite(at) && at > 0 && jetzt() - at < NOTAUS_FRIST_MS;
  } catch { return false; }        // z. B. Safari privat: dann gibt es keinen Notausgang
}

export function merkeNotaus(jetzt = Date.now) {
  try { globalThis.localStorage && globalThis.localStorage.setItem(NOTAUS_SPEICHER, String(jetzt())); }
  catch { /* z. B. Safari privat */ }
}

/**
 * @param {object} ctx
 * @param {Document} ctx.doc
 * @param {(id:string)=>Element} ctx.$      Element-Zugriff der App
 * @param {object} ctx.backend              Backend-Fassade (recovery optional)
 * @param {object} ctx.state                Sitzungszustand (liest/schreibt state.info)
 * @param {Element} ctx.wurzel              Wurzelknoten (Ausweichziel fürs Modal)
 */
export function macheRecoveryScreen({ doc, $, backend, state, wurzel }) {

  /* ---- Wiedereinstieg per E-Mail — zweistufig mit Bestätigungscode (S45).
   *  Ein Bauelement für beide Orte (Karte im Raum, Pflicht-Modal): Adresse →
   *  Code anfordern → 6-stelligen Code eingeben → bestätigt. DOM per
   *  createElement, damit es keine ID-Kollisionen zwischen Karte und Modal
   *  gibt; Tests greifen über data-rec-Attribute zu. ---- */
  function baueVerifikation(wirt, { onFertig, beiVersandStoerung }) {
    wirt.innerHTML = "";
    // U5 · Aussehen lebt in design.js. Kein style-Attribut, keine rohen Werte.
    const el = (tag, attrs) => {
      const x = doc.createElement(tag);
      for (const [k, v] of Object.entries(attrs || {})) x.setAttribute(k, v);
      return x;
    };
    const zeile = (text, marke) => {
      const b = el("button", { type: "button", class: "rz-zeile rz-knopf-flach", "data-rec": marke });
      const s = doc.createElement("span"); s.textContent = text;
      const p = doc.createElement("span"); p.className = "rz-pfeil"; p.textContent = "\u2192";
      b.appendChild(s); b.appendChild(p);
      return b;
    };

    /* §5.2 · Der Ablauf hatte keinen sichtbaren Fortschritt — der Screen zeigte
       immer nur, was gerade da war. Statt eines Steppers fuehrt das Zonen-Label
       ueber dem Feld: "Deine Adresse" -> "Der Code aus der E-Mail". Zwei
       Schritte, beide sichtbar; der zweite ist stumm, bis er dran ist (§5.4). */
    const s1 = el("div", { class: "rz-rec-schritt" });
    const l1 = el("div", { class: "rz-caps" }); l1.textContent = t("rec.labelAdresse");
    const mail = el("input", { type: "email", placeholder: t("rec.platzhalter"), "data-rec": "mail",
      autocomplete: "email", class: "rz-feld" });
    const senden = zeile(t("rec.codeSenden"), "senden");
    for (const x of [l1, mail, senden]) s1.appendChild(x);

    const s2 = el("div", { class: "rz-rec-schritt", "aria-disabled": "true" });
    const l2 = el("div", { class: "rz-caps" }); l2.textContent = t("rec.labelCode");
    const pin = el("input", { type: "text", inputmode: "numeric", placeholder: t("rec.codeLabel"),
      "data-rec": "pin", autocomplete: "one-time-code", class: "rz-feld rz-feld-code", disabled: "" });
    const ok = zeile(t("rec.bestaetigen"), "ok");
    ok.disabled = true;
    for (const x of [l2, pin, ok]) s2.appendChild(x);

    const note = el("span", { class: "rz-rec-note", "data-rec": "note", role: "status" });
    for (const x of [s1, s2, note]) wirt.appendChild(x);

    /* §5.3 · Bestaetigung und Fehler landeten im selben Element und in
       derselben Farbe — ein Fehler sah aus wie eine Zusage. Getrennt wird
       jetzt ueber die ARIA-Rolle (Vorlesestimme) UND ueber den Ton. */
    const sage = (text, schlimm) => {
      note.textContent = text;
      note.setAttribute("role", schlimm ? "alert" : "status");
    };
    // §5.4 · Schritt 2 verschwand und kam wieder; der Screen sprang. Jetzt
    // bleibt er stehen und wird nur stumm- oder scharfgeschaltet.
    const scharf = an => {
      s2.setAttribute("aria-disabled", an ? "false" : "true");
      pin.disabled = !an;
      ok.disabled = !an;
    };

    let gesendetAn = null;   // Adresse aus Schritt 1 — reist bei der Bestätigung mit (D6.1a)
    const schritt2 = email => {
      gesendetAn = email;
      sage(t("rec.codeUnterwegs", { email }), false);
      scharf(true);
      senden.firstChild.textContent = t("rec.neuAnfordern");
    };
    senden.addEventListener("click", async () => {
      const email = mail.value.trim();
      if (!email) { sage(t("rec.bitte"), true); return; }
      senden.disabled = true;
      try { await backend.recovery.beginVerify(email); schritt2(email); }
      catch (e) {
        sage(fehlerText(e), true);
        /* S115 · Nur die Stoerung des Versands selbst zaehlt (mail_failed).
           Alles andere sagt etwas ueber die EINGABE aus, nicht ueber den
           Kanal — und darf den Notausgang nicht oeffnen. */
        if (e && e.code === "mail_failed" && beiVersandStoerung) beiVersandStoerung();
      }
      finally { senden.disabled = false; }
    });
    ok.addEventListener("click", async () => {
      ok.disabled = true;
      try {
        await backend.recovery.confirm(pin.value.trim(), gesendetAn);
        onFertig();
      } catch (e) {
        sage(fehlerText(e), true);
        // Abgelaufen/zu viele Versuche: zurück auf Schritt 1 — neuer Code nötig.
        if (e && (e.code === "pin_expired" || e.code === "pin_tries" || e.code === "pin_none")) {
          pin.value = ""; scharf(false);
          senden.firstChild.textContent = t("rec.codeSenden");
        } else { ok.disabled = false; }
      }
    });
  }

  function zeigeRecovery() {
    const box = $("boxRecovery"), zeile = $("btnRecovery");
    /* §1.3 · Der Wiedereinstieg war eine Karte, die von selbst im Regal stand.
       Jetzt ist er eine Zeile, die aufklappt — dieselbe Bewegung wie die
       uebrigen Regal-Zeilen, ein Baustein weniger im System. Der Inhalt wird
       vorbereitet, sichtbar wird er erst beim Oeffnen. */
    if (!backend.recovery) {
      box.classList.add("pb-hidden");
      if (zeile) zeile.classList.add("pb-hidden");
      return;
    }
    if (zeile) zeile.classList.remove("pb-hidden");
    const hinterlegt = !!(state.info && state.info.recoveryEmail);
    box.innerHTML =
      `<p class="rz-fein-leise">` +
      (hinterlegt ? t("rec.hinterlegt") : t("rec.neu")) +
      `</p>`;
    if (hinterlegt) {
      const aendern = doc.createElement("button");
      aendern.className = "rz-zeile rz-knopf-flach";
      aendern.setAttribute("type", "button");
      aendern.setAttribute("data-rec", "aendern");
      aendern.innerHTML = "<span></span><span class=\"rz-pfeil\">\u2192</span>";
      aendern.firstChild.textContent = t("rec.aendern");
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

  /* ---- Pflicht-Screen (S45; Turn 41 §1.2; S115: Zwei-Zonen) ---------------
   *  Ohne bestaetigte Adresse geht es nicht weiter — Zugangsverlust waere
   *  kritischer als die kleine Huerde. Bewusst nicht wegklickbar: kein
   *  Schliessen-Knopf, kein Klick-ausserhalb, kein Escape. Es verschwindet
   *  durch erfolgreiche Bestaetigung — oder, wenn der Versand nachweislich
   *  gestoert ist, durch den Notausgang (S115, siehe oben).
   *
   *  §1.2 · Es war eine Karte auf abgedunkeltem Grund. Ein Schleier zeigt eine
   *  Umgebung, die man SIEHT, aber nicht erreichen kann — und fuer manche ist
   *  das der erste Screen der App ueberhaupt. Turn 41 machte daraus ein
   *  Vollbild in Tiefgruen: kein Drumherum, das ein Drumherum verspricht.
   *
   *  S115 · Dieses Vollbild stammte aus der Zeit VOR der Zweiteilung und war
   *  der letzte Ort mit der alten Sprache — ausgerechnet der, den manche als
   *  ersten Screen sehen. Jetzt traegt er dieselbe Zweiteilung wie jeder
   *  andere Screen: oben Papier (wer spricht, worum es geht), unten Tiefgruen
   *  (was zu tun ist). Das Formular steht unten, weil in dieser App die
   *  untere Zone die handelnde ist — dort liegen ueberall die Zeilen, die
   *  weiterfuehren, und .rz-feld/.rz-zeile haben ihre gruenen Fassungen
   *  bereits.
   *
   *  Drei Regeln bleiben unveraendert:
   *  · KEINE Bedien-Ecke. Sie ist ein Ausgang, und es gibt (regulaer) keinen.
   *    Der Screen deckt sie zu (z-index 1000 gegen 7) — hier steht sie
   *    zusaetzlich ausdruecklich still, damit sie auch dann nicht durchkommt,
   *    wenn jemand spaeter an den Ebenen dreht.
   *  · KEIN Wegweiser-Badge auf der Naht. Der Wegweiser nennt einen Ort; hier
   *    ist noch keiner betreten. Die Naht bleibt an dieser einen Stelle
   *    unbesetzt — sichtbar als Kante, ohne Aufbau.
   *  · Fokusfalle statt Escape-Sperre. Gibt es kein Aussen, darf auch der
   *    Fokus nicht hinaus.
   *
   *  Im Kopf stehen zwei BLINDE Pfeile (rz-zurueck rz-blind) wie auf der
   *  Startseite: sie halten die Signatur mittig, ohne einen Rueckweg zu
   *  zeichnen, den es nicht gibt. ---- */
  function zeigeEmailPflicht() {
    const overlay = doc.createElement("div");
    overlay.id = "pbEmailPflicht";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "pflichtTitel");

    const split = doc.createElement("div");
    split.className = "rz-split";

    const oben = doc.createElement("div");
    oben.className = "rz-half rz-papier";
    oben.innerHTML =
      `<div class="rz-kopf rz-kopf-mitte">` +
        `<span class="rz-zurueck rz-blind">\u2190</span>` +
        `<span class="rz-signatur" data-rz-signatur></span>` +
        `<span class="rz-zurueck rz-blind">\u2190</span>` +
      `</div>` +
      `<h1 class="rz-h1" id="pflichtTitel">${t("rec.pflicht.titel")}</h1>` +
      `<p class="rz-sub">${t("rec.pflicht.text")}</p>`;

    const unten = doc.createElement("div");
    unten.className = "rz-half rz-tiefgruen";
    const wirt = doc.createElement("div");
    const fuss = doc.createElement("div");
    fuss.className = "rz-fuss";
    const marke = doc.createElement("span");
    marke.className = "rz-fussmarke";
    marke.setAttribute("data-rz-marke", "");
    marke.textContent = t("allg.marke");
    for (const x of [wirt, fuss, marke]) unten.appendChild(x);

    split.appendChild(oben);
    split.appendChild(unten);
    overlay.appendChild(split);
    (doc.body || wurzel).appendChild(overlay);

    // Die Signatur haengt sonst an setzeSignatur(), das nur den App-Baum
    // kennt — der Screen haengt am body.
    const sig = oben.querySelector("[data-rz-signatur]");
    if (sig && state.info)
      sig.textContent = t("allg.signatur", { ich: state.info.name, partner: state.info.partner });

    doc.documentElement.setAttribute("data-pflicht", "1");   // Bedien-Ecke still

    /* Fokusfalle: die bedienbaren Elemente werden bei JEDEM Tab neu gesammelt,
       nicht einmal eingesammelt. Schritt 2 ist anfangs stummgeschaltet (§5.4)
       und wird es bei abgelaufenem Code wieder — eine feste Liste haette den
       Fokus dann auf ein totes Feld geschickt. Der Notausgang kommt spaeter
       dazu und ist aus demselben Grund von selbst dabei. */
    const bedienbar = () => [...overlay.querySelectorAll("input,button")]
      .filter(e => !e.disabled);
    const falle = e => {
      if (e.key !== "Tab") return;
      const f = bedienbar();
      if (!f.length) return;
      const erste = f[0], letzte = f[f.length - 1];
      const jetzt = doc.activeElement;
      if (e.shiftKey && (jetzt === erste || !overlay.contains(jetzt))) { e.preventDefault(); letzte.focus(); }
      else if (!e.shiftKey && jetzt === letzte) { e.preventDefault(); erste.focus(); }
    };
    doc.addEventListener("keydown", falle, true);

    const schliesse = () => {
      doc.removeEventListener("keydown", falle, true);
      doc.documentElement.removeAttribute("data-pflicht");
      overlay.remove();
      zeigeRecovery();
    };

    /* S115 · Der Notausgang wird nicht vorgehalten und ausgeblendet, sondern
       existiert erst, wenn er gilt — ein ausgegrauter Ausgang waere ein
       Versprechen auf halbem Weg. Er steht im Zonenfuss, dort, wo in dieser
       App das Weitergehen steht. */
    let stoerungen = 0;
    const oeffneNotausgang = () => {
      if (++stoerungen < NOTAUS_AB || fuss.childElementCount) return;
      const hinweis = doc.createElement("p");
      hinweis.className = "rz-fein-leise";
      hinweis.textContent = t("rec.pflicht.stoerung");
      const raus = doc.createElement("button");
      raus.className = "rz-zeile rz-knopf-flach";
      raus.setAttribute("type", "button");
      raus.setAttribute("data-rec", "notausgang");
      const s = doc.createElement("span"); s.textContent = t("rec.pflicht.notausgang");
      const pf = doc.createElement("span"); pf.className = "rz-pfeil"; pf.textContent = "\u2192";
      raus.appendChild(s); raus.appendChild(pf);
      raus.addEventListener("click", () => { merkeNotaus(); schliesse(); });
      fuss.appendChild(hinweis);
      fuss.appendChild(raus);
    };

    baueVerifikation(wirt, {
      onFertig: () => { state.info.recoveryEmail = true; schliesse(); },
      beiVersandStoerung: oeffneNotausgang,
    });
    const erstes = overlay.querySelector("[data-rec=mail]");
    if (erstes && erstes.focus) erstes.focus();
  }
  return { baueVerifikation, zeigeRecovery, zeigeEmailPflicht };
}
