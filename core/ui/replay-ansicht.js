// S95.7e · Das abgeschlossene Gespräch nochmal lesen.
//
// Der Ausschnitt-Eingang (S95.7c) öffnet die Auswahl. Was fehlte, war das
// Naheliegendere: das Gespräch selbst noch einmal ansehen — „da war vor drei
// Wochen etwas".
//
// Bewusst NICHT wiederverwendet wird renderMsgs. Es zieht den ganzen
// Sitzungsapparat mit: Auswahlflaeche, Aufdeck-Tafeln, Stream-Blase,
// Skalen, Composer, Scroll-Nachfuehrung. Nichts davon gehoert hierher, und
// jedes davon haette einen Sonderfall gebraucht. Eine abgeschlossene Session
// ist inert; ihre Ansicht sollte es auch sein.
//
// Was uebernommen wird, ist die Darstellungsregel — dieselbe Maskierung,
// dieselbe Marker-Bereinigung, dieselben Sprecherlabel beim Rollenwechsel.
// Wer den Verlauf spaeter liest, soll ihn wiedererkennen.

import { t } from "../i18n/index.js";
import { mdRender } from "./html.js";
import { cleanDisplay } from "../contracts/block.js";
import { istWireNachricht } from "../contracts/steuertoken.js";
import { ALLE_BLOECKE } from "../contracts/registry.js";

/**
 * Zeichnet einen aufbewahrten Verlauf als Leseansicht.
 *
 * @param {Element} wirt      Zielknoten (wird geleert)
 * @param {object}  verlauf   {messages, eignung, at}
 * @param {Function} el       DOM-Kurzbau der App
 * @returns {number}          Anzahl gezeichneter Nachrichten
 */
export function zeichneReplay(wirt, verlauf, el) {
  if (!wirt) return 0;
  wirt.innerHTML = "";
  const msgs = (verlauf && verlauf.messages) || [];
  let letzteRolle = null, gezeichnet = 0;

  for (const m of msgs) {
    // Panel-Echos bleiben: sie sind Teil dessen, was damals zu sehen war.
    if (m.echo) {
      const e = el("div", "pb-echo");
      e.textContent = m.echo;
      wirt.appendChild(e);
      continue;
    }
    // Wire-Nachrichten und Verstecktes bleiben verborgen — wie im Verlauf.
    if (m.hidden || istWireNachricht(m)) continue;

    // T2g · dieselbe Gruppierung wie im lebenden Verlauf (chat-kern.js).
    let gruppe = null;
    if (m.role === "assistant" && letzteRolle !== "assistant") {
      gruppe = el("div", "rz-sprechgruppe");
      const lbl = el("div", "rz-sprecher");
      lbl.textContent = t("chat.begleitung");
      gruppe.appendChild(lbl);
      wirt.appendChild(gruppe);
    }
    letzteRolle = m.role;

    const d = el("div", "pb-msg " + (m.role === "assistant" ? "ai" : "me"));
    const rein = cleanDisplay(m.content, [], ALLE_BLOECKE);
    if (m.role === "assistant") d.innerHTML = mdRender(rein);
    else d.textContent = rein;
    (gruppe || wirt).appendChild(d);
    gezeichnet++;

    // KEINE Aufdeck-Tafeln: Sie tragen einen Weiter-Knopf und gehoeren in
    // einen Ablauf. Hier gibt es keinen Ablauf mehr.
  }
  return gezeichnet;
}
