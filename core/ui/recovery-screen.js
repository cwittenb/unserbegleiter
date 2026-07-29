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
  function baueVerifikation(wirt, { onFertig }) {
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
      catch (e) { sage(fehlerText(e), true); }
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

  /* ---- Pflicht-Vollbild (S45, Flag EMAIL_PFLICHT; Turn 41 §1.2) ------------
   *  Ohne bestätigte Adresse geht es nicht weiter — Zugangsverlust waere
   *  kritischer als die kleine Huerde. Bewusst nicht wegklickbar: kein
   *  Schliessen-Knopf, kein Klick-ausserhalb, kein Escape. Es verschwindet
   *  ausschliesslich durch erfolgreiche Bestaetigung.
   *
   *  §1.2 · Es war eine Karte auf abgedunkeltem Grund. Ein Schleier zeigt eine
   *  Umgebung, die man SIEHT, aber nicht erreichen kann — und fuer manche ist
   *  das der erste Screen der App ueberhaupt. Jetzt Vollbild in Tiefgruen:
   *  kein Drumherum, das ein Drumherum verspricht.
   *
   *  Drei Regeln folgen daraus:
   *  · KEINE Bedien-Ecke. Sie ist ein Ausgang, und es gibt keinen. Ein
   *    gezeichneter Ausgang, der nicht funktioniert, ist schlimmer als keiner.
   *    Der Kasten deckt sie zu (z-index 1000 gegen 7) — hier steht sie
   *    zusaetzlich ausdruecklich still, damit sie auch dann nicht durchkommt,
   *    wenn jemand spaeter an den Ebenen dreht.
   *  · KEIN Wegweiser-Badge. Der Wegweiser nennt einen Ort; hier ist noch
   *    keiner betreten. Signatur oben und Wortmarke unten setzen Ton und
   *    Absender — mehr braucht es nicht.
   *  · Fokusfalle statt Escape-Sperre. Im Vollbild gibt es kein Aussen mehr,
   *    also darf der Fokus auch nicht hinaus. ---- */
  function zeigeEmailPflicht() {
    const overlay = doc.createElement("div");
    overlay.id = "pbEmailPflicht";
    overlay.className = "rz-tiefgruen";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "pflichtTitel");

    const spalte = doc.createElement("div");
    spalte.className = "rz-pflicht-spalte";
    spalte.innerHTML =
      `<span class="rz-signatur" data-rz-signatur></span>` +
      `<div class="rz-h2" id="pflichtTitel">${t("rec.pflicht.titel")}</div>` +
      `<p class="rz-sub">${t("rec.pflicht.text")}</p>`;
    const wirt = doc.createElement("div");
    spalte.appendChild(wirt);
    const marke = doc.createElement("span");
    marke.className = "rz-fussmarke";
    marke.setAttribute("data-rz-marke", "");
    marke.textContent = t("allg.marke");
    spalte.appendChild(marke);
    overlay.appendChild(spalte);
    (doc.body || wurzel).appendChild(overlay);

    // Die Signatur haengt sonst an setzeSignatur(), das nur den App-Baum
    // kennt — der Kasten haengt am body.
    const sig = spalte.querySelector("[data-rz-signatur]");
    if (sig && state.info)
      sig.textContent = t("allg.signatur", { ich: state.info.name, partner: state.info.partner });

    doc.documentElement.setAttribute("data-pflicht", "1");   // Bedien-Ecke still

    /* Fokusfalle: die bedienbaren Elemente werden bei JEDEM Tab neu gesammelt,
       nicht einmal eingesammelt. Schritt 2 ist anfangs stummgeschaltet (§5.4)
       und wird es bei abgelaufenem Code wieder — eine feste Liste haette den
       Fokus dann auf ein totes Feld geschickt. */
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

    baueVerifikation(wirt, {
      onFertig: () => {
        state.info.recoveryEmail = true;
        doc.removeEventListener("keydown", falle, true);
        doc.documentElement.removeAttribute("data-pflicht");
        overlay.remove();
        zeigeRecovery();
      },
    });
    const erstes = overlay.querySelector("[data-rec=mail]");
    if (erstes && erstes.focus) erstes.focus();
  }
  return { baueVerifikation, zeigeRecovery, zeigeEmailPflicht };
}
