// Eingangsfrage vor den Artefakten — Gelegenheitsschutz, keine Sicherheit:
// hält zufällige Besucher und Bots fern. Die Antwort steht NICHT im Klartext
// im Quelltext (SHA-256-Vergleich), ist aber bewusst nicht „sicher" gemeint.
// Pro Seitenaufruf wird einmal gefragt (die Artefakt-Sandbox hat keinen
// verlässlichen Browser-Speicher — und für diesen Zweck reicht das).

import { createHash } from "node:crypto";

export const EINGANGS_FRAGE = "Von wem wurdest Du eingeladen?";
export const EINGANGS_ANTWORT_HASH = createHash("sha256")
  .update("cars10")
  .digest("hex");

/** Umhüllt ein fertiges IIFE-Bundle: erst Frage, bei richtiger Antwort Start. */
export function mitEingangsfrage(bundle, {
  frage = EINGANGS_FRAGE,
  antwortHash = EINGANGS_ANTWORT_HASH,
  untertitel = "",
} = {}) {
  return `(function(){
  var root = document.getElementById("app");
  function start(){ root.innerHTML = ""; (function(){ ${bundle} })(); }
  root.innerHTML = '<div style="max-width:380px;margin:12vh auto 0;text-align:center;font-family:ui-sans-serif,system-ui,sans-serif">'
    + '<div style="background:#fff;border:1px solid #e3e8ee;border-radius:12px;padding:26px 22px">'
    + '<p style="font-size:15px;margin:0 0 14px;color:#1b2430">' + ${JSON.stringify(frage)} + '</p>'
    + '<input id="pbGateIn" type="text" autocomplete="off" autocapitalize="none" style="display:block;width:100%;box-sizing:border-box;padding:10px 11px;border:1px solid #cfd8e0;border-radius:9px;font:inherit;text-align:center">'
    + '<button id="pbGateGo" style="width:100%;margin-top:10px;padding:11px;font:inherit;font-weight:600;cursor:pointer;background:#0f766e;color:#fff;border:1px solid #0f766e;border-radius:9px">Weiter</button>'
    + '<div id="pbGateMsg" style="font-size:13px;color:#b4232a;margin-top:10px;min-height:18px"></div>'
    + (${JSON.stringify(untertitel)} ? '<div style="font-size:11px;color:#8a95a3;margin-top:8px">' + ${JSON.stringify(untertitel)} + '</div>' : '')
    + '</div></div>';
  var inp = document.getElementById("pbGateIn");
  var go = document.getElementById("pbGateGo");
  var msg = document.getElementById("pbGateMsg");
  function hex(buf){ var a=new Uint8Array(buf),s=""; for(var i=0;i<a.length;i++){ s+=a[i].toString(16).padStart(2,"0"); } return s; }
  function pruefe(){
    var wert = (inp.value || "").trim().toLowerCase();
    if (!wert) { msg.textContent = "Bitte etwas eingeben."; return; }
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(wert)).then(function(buf){
      if (hex(buf) === ${JSON.stringify(antwortHash)}) { start(); }
      else { msg.textContent = "Das passt leider nicht."; inp.select && inp.select(); }
    });
  }
  go.addEventListener("click", pruefe);
  inp.addEventListener("keydown", function(e){ if (e.key === "Enter") pruefe(); });
  inp.focus && inp.focus();
})();`;
}
