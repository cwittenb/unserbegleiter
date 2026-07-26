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
    const el = (tag, attrs, stil) => {
      const x = doc.createElement(tag);
      for (const [k, v] of Object.entries(attrs || {})) x.setAttribute(k, v);
      if (stil) x.style.cssText = stil;
      return x;
    };
    const mail = el("input", { type: "email", placeholder: t("rec.platzhalter"), "data-rec": "mail", autocomplete: "email" },
      "display:block;width:100%;box-sizing:border-box;padding:9px;border:1px solid #cfd8e0;border-radius:9px;font:inherit");
    const senden = el("button", { class: "pb-btn primary", "data-rec": "senden" }, "margin-top:8px");
    senden.textContent = t("rec.codeSenden");
    const pin = el("input", { type: "text", inputmode: "numeric", placeholder: t("rec.codeLabel"), "data-rec": "pin", autocomplete: "one-time-code" },
      "display:none;width:100%;box-sizing:border-box;padding:9px;border:1px solid #cfd8e0;border-radius:9px;font:inherit;margin-top:8px;letter-spacing:.2em");
    const ok = el("button", { class: "pb-btn primary", "data-rec": "ok" }, "display:none;margin-top:8px");
    ok.textContent = t("rec.bestaetigen");
    const note = el("span", { class: "pb-sub", "data-rec": "note" }, "display:block;margin-top:8px");
    for (const x of [mail, senden, pin, ok, note]) wirt.appendChild(x);

    let gesendetAn = null;   // Adresse aus Schritt 1 — reist bei der Bestätigung mit (D6.1a)
    const schritt2 = email => {
      gesendetAn = email;
      note.textContent = t("rec.codeUnterwegs", { email });
      pin.style.display = "block";
      ok.style.display = "inline-block";
      senden.textContent = t("rec.neuAnfordern");
    };
    senden.addEventListener("click", async () => {
      const email = mail.value.trim();
      if (!email) { note.textContent = t("rec.bitte"); return; }
      senden.disabled = true;
      try { await backend.recovery.beginVerify(email); schritt2(email); }
      catch (e) { note.textContent = fehlerText(e); }
      finally { senden.disabled = false; }
    });
    ok.addEventListener("click", async () => {
      ok.disabled = true;
      try {
        await backend.recovery.confirm(pin.value.trim(), gesendetAn);
        onFertig();
      } catch (e) {
        note.textContent = fehlerText(e);
        // Abgelaufen/zu viele Versuche: zurück auf Schritt 1 — neuer Code nötig.
        if (e && (e.code === "pin_expired" || e.code === "pin_tries" || e.code === "pin_none")) {
          pin.value = ""; pin.style.display = "none"; ok.style.display = "none";
          senden.textContent = t("rec.codeSenden");
        }
      } finally { ok.disabled = false; }
    });
  }

  function zeigeRecovery() {
    const box = $("boxRecovery");
    if (!backend.recovery) { box.classList.add("pb-hidden"); return; }
    box.classList.remove("pb-hidden");
    const hinterlegt = !!(state.info && state.info.recoveryEmail);
    box.innerHTML =
      `<div class="pb-sub">${t("rec.titel")}</div>` +
      `<p class="rz-fein-leise">` +
      (hinterlegt ? t("rec.hinterlegt") : t("rec.neu")) +
      `</p>`;
    if (hinterlegt) {
      const aendern = doc.createElement("button");
      aendern.className = "pb-btn";
      aendern.setAttribute("data-rec", "aendern");
      aendern.textContent = t("rec.aendern");
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

  /* ---- Pflicht-Modal (S45, Flag EMAIL_PFLICHT): Ohne bestätigte Adresse geht
   *  es nicht weiter — Zugangsverlust wäre kritischer als die kleine Hürde.
   *  Bewusst nicht wegklickbar: kein Schließen-Knopf, kein Klick-außerhalb,
   *  kein Escape. Verschwindet ausschließlich durch erfolgreiche Bestätigung. ---- */
  function zeigeEmailPflicht() {
    const overlay = doc.createElement("div");
    overlay.id = "pbEmailPflicht";
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(20,26,34,.55);display:flex;align-items:flex-start;justify-content:center;z-index:1000;padding:48px 18px;overflow:auto";
    const karte = doc.createElement("div");
    karte.className = "pb-card";
    karte.style.cssText = "max-width:440px;width:100%;background:var(--card,#fff);border-radius:14px;padding:20px";
    karte.innerHTML =
      `<div class="rz-zwischentitel">${t("rec.pflicht.titel")}</div>` +
      `<p class="rz-fein-leise-unten">${t("rec.pflicht.text")}</p>`;
    const wirt = doc.createElement("div");
    karte.appendChild(wirt);
    overlay.appendChild(karte);
    (doc.body || wurzel).appendChild(overlay);
    baueVerifikation(wirt, {
      onFertig: () => {
        state.info.recoveryEmail = true;
        overlay.remove();
        zeigeRecovery();
      },
    });
  }
  return { baueVerifikation, zeigeRecovery, zeigeEmailPflicht };
}
