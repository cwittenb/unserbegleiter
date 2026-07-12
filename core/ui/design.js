import { t as uiText } from "../i18n/index.js";
// Design auf Dokument-Ebene: <style> + Kulisse + Theme-Umschalter, einmalig
// beim Booten angewendet (idempotent), damit ALLE Screens dasselbe Theme tragen.

export const DESIGN_CSS = String.raw`      @import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,500;1,6..72,300&display=swap');
      :root{
        --bg1:#f7f4ea;--bg2:#edf1e2;--ink:#313c31;--ink-soft:#64705c;--ink-faint:#909a86;
        --accent:#7ba05b;--accent-ink:#41562c;--on-accent:#ffffff;--me-bg:#7ba05b;--me-ink:#ffffff;
        --card:rgba(255,255,255,.60);--card-bd:rgba(90,110,80,.15);
        --ai-bg:rgba(255,255,255,.72);--ai-bd:rgba(90,110,80,.13);
        --field:rgba(255,255,255,.74);--field-bd:rgba(90,110,80,.22);
      }
      html[data-theme=dark]{
        --bg1:#2a3a34;--bg2:#151f1c;--ink:#edf1e8;--ink-soft:#b3c1aa;--ink-faint:#889481;
        --accent:#aeca8d;--accent-ink:#e2ecd4;--on-accent:#1d2a1a;--me-bg:#42583b;--me-ink:#f4f7ef;
        --card:rgba(255,255,255,.055);--card-bd:rgba(255,255,255,.10);
        --ai-bg:rgba(255,255,255,.06);--ai-bd:rgba(255,255,255,.09);
        --field:rgba(255,255,255,.06);--field-bd:rgba(255,255,255,.16);
      }
      body{margin:0;background:linear-gradient(172deg,var(--bg1),var(--bg2));background-attachment:fixed;transition:background .5s}
      #app{max-width:660px;position:relative;z-index:1;font-family:"Newsreader",Georgia,'Times New Roman',serif;
           color:var(--ink);font-size:18px;line-height:1.72;padding:46px 22px 34vh}
      .pb-kulisse{position:fixed;inset:auto 0 0 0;height:84vh;z-index:0;pointer-events:none;overflow:hidden}
      .pb-kulisse svg{position:absolute;bottom:0;left:0;width:100%;height:100%}
      .pb-baeume{display:block} html[data-theme=dark] .pb-baeume{display:none}
      .pb-seerosen{display:none} html[data-theme=dark] .pb-seerosen{display:block}
      .pb-hidden{display:none!important}
      .pb-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:30px}
      .pb-brand{display:flex;flex-direction:column;gap:3px}
      .pb-h1{font-size:31px;font-weight:300;margin:0;letter-spacing:.005em;line-height:1.15}
      .pb-sub{color:var(--ink-faint);font-size:13px}
      .pb-brand .pb-sub{letter-spacing:.2em;text-transform:uppercase;font-size:12px}
      .pb-card{background:var(--card);border:1px solid var(--card-bd);border-radius:18px;padding:24px 26px;margin:16px 0;
               backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
      .pb-btn{display:inline-block;border:1px solid var(--accent);background:transparent;color:var(--accent-ink);
              border-radius:999px;padding:10px 22px;font-family:inherit;font-size:16px;cursor:pointer;margin:6px 8px 0 0;transition:.22s}
      .pb-btn:hover{background:var(--accent);color:var(--on-accent)}
      .pb-btn.primary{background:var(--accent);color:var(--on-accent)}
      .pb-btn[disabled]{opacity:.45;cursor:not-allowed}
      .pb-btn[disabled]:hover{background:transparent;color:var(--accent-ink)}
      .pb-btn.primary:hover{filter:brightness(1.05)}
      .pb-msgs{display:flex;flex-direction:column;gap:13px;margin:16px 0}
      .pb-msg{max-width:82%;padding:14px 19px;border-radius:19px;font-size:17px;line-height:1.62;white-space:pre-wrap}
      .pb-msg.ai{background:var(--ai-bg);border:1px solid var(--ai-bd);align-self:flex-start;border-bottom-left-radius:6px;
                 backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
      .pb-msg.me{background:var(--me-bg);color:var(--me-ink);align-self:flex-end;border-bottom-right-radius:6px}
      .pb-composer{display:flex;gap:8px;margin-top:6px}
      .pb-composer textarea{flex:1;border:1px solid var(--field-bd);background:var(--field);color:var(--ink);
              border-radius:14px;padding:12px 14px;font:inherit;font-size:17px;min-height:46px}
      .pb-typing{display:inline-flex;gap:5px;align-items:center;min-height:14px}
      .pb-typing span{width:7px;height:7px;border-radius:50%;background:var(--ink-faint);animation:pbBlink 1.2s infinite}
      .pb-typing span:nth-child(2){animation-delay:.2s}.pb-typing span:nth-child(3){animation-delay:.4s}
      @keyframes pbBlink{0%,80%,100%{opacity:.25}40%{opacity:1}}
      .pb-skala{display:none;gap:12px;align-items:center;background:var(--card);border:1px solid var(--card-bd);
                border-radius:16px;padding:12px 16px;margin:0 0 10px;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
      .pb-skala.offen{display:flex}
      .pb-skala input[type=range]{flex:1;accent-color:var(--accent)}
      .pb-skala .wert{font-weight:500;min-width:26px;text-align:center;color:var(--accent-ink);font-size:19px}
      .pb-msg.ai strong{font-weight:500}
      .pb-msg.ai code{background:var(--ai-bd);border-radius:4px;padding:0 4px;font-family:ui-monospace,Menlo,monospace;font-size:14px}
      .pb-err{background:rgba(188,74,74,.12);border:1px solid rgba(188,74,74,.34);border-radius:12px;padding:11px 15px;font-size:15px;margin:12px 0}
      .pb-item{border-bottom:1px solid var(--card-bd);padding:11px 0;font-size:16px}
      .pb-theme{position:fixed;top:18px;right:16px;z-index:6;display:flex;gap:3px;background:var(--card);
                border:1px solid var(--card-bd);border-radius:999px;padding:4px;backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px)}
      .pb-theme button{font-family:inherit;font-size:14px;border:0;background:transparent;color:var(--ink-soft);
                border-radius:999px;padding:6px 14px;cursor:pointer;transition:.2s}
      .pb-theme button.an{background:var(--accent);color:var(--on-accent)}
      .pb-busydots{display:inline-flex;gap:4px;align-items:center}
      .pb-busydots span{width:6px;height:6px;border-radius:50%;background:var(--ink-faint);animation:pbBlink 1.2s infinite}
      .pb-busydots span:nth-child(2){animation-delay:.2s}.pb-busydots span:nth-child(3){animation-delay:.4s}
      .pb-busy{position:fixed;top:18px;left:50%;transform:translateX(-50%);z-index:7;display:flex;gap:9px;align-items:center;
               background:var(--card);border:1px solid var(--card-bd);border-radius:999px;padding:7px 16px;font-size:13px;
               color:var(--ink-soft);backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px)}
      .pb-zwei{display:grid;grid-template-columns:1fr 1fr;gap:0 14px;align-items:stretch}
      .pb-zwei .pb-card{display:flex;flex-direction:column;gap:6px}
      @media(max-width:540px){.pb-zwei{grid-template-columns:1fr}}
      .pb-gruppe{margin:14px 0 2px}
      .pb-gruppe>.pb-sub{display:block;margin-bottom:2px}
      .pb-weg .pb-item{border-bottom:0;padding:5px 0;font-size:14px;color:var(--ink-soft)}
      .pb-link{cursor:pointer;text-decoration:underline dotted;text-underline-offset:3px}
      .pb-mitte{margin:26px 0}
      .pb-mitte .pb-card{align-items:center;text-align:center;padding:32px 26px}
      .pb-mitte .pb-btn{margin:6px 0 0}
      .pb-reihe{text-align:center;padding:26px}
      .pb-reihe .pb-btn{margin:6px 6px 0}
      .pb-ikon{display:inline-flex;align-items:center;justify-content:center;padding:10px 14px}
      .pb-ikon svg{width:20px;height:20px;display:block}
      .pb-drei{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px}
      .pb-badge{background:var(--accent);color:var(--on-accent);border-radius:999px;font-size:11px;font-weight:650;padding:1px 7px;margin-left:4px;display:inline-block;vertical-align:middle}
      .pb-platz{border:1px solid var(--card-bd);border-radius:12px;padding:9px 13px;margin:6px 0;cursor:grab}
      .pb-platz.leer{border-style:dashed;color:var(--ink-faint);cursor:default}
      .pb-platz.gewaehlt{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent) inset}
      #kwPool [draggable]{cursor:grab}
    `;

export const KULISSE_HTML = String.raw`<div class="pb-kulisse" aria-hidden="true">
      <svg class="pb-baeume" viewBox="0 0 1200 850" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><defs>
      <symbol id="pbTanne" viewBox="0 0 100 200"><rect x="45" y="178" width="10" height="22" fill="currentColor"/><polygon points="50,86 12,180 88,180" fill="currentColor"/><polygon points="50,44 22,124 78,124" fill="currentColor"/><polygon points="50,8 31,74 69,74" fill="currentColor"/></symbol>
      <symbol id="pbLaub" viewBox="0 0 100 200"><rect x="45" y="128" width="10" height="72" fill="currentColor"/><g fill="currentColor"><ellipse cx="50" cy="80" rx="45" ry="58"/><circle cx="34" cy="50" r="21"/><circle cx="66" cy="52" r="21"/><circle cx="50" cy="38" r="23"/></g></symbol></defs>
      <path d="M0 700 Q300 664 600 700 T1200 700 V850 H0Z" fill="#dbe4cc" opacity=".55"/>
      <g color="#d3ddc1" opacity=".6"><use href="#pbLaub" x="270" y="410" width="220" height="440"/><use href="#pbTanne" x="430" y="470" width="190" height="380"/><use href="#pbLaub" x="782" y="452" width="205" height="410"/><use href="#pbTanne" x="70" y="512" width="170" height="340"/></g>
      <g color="#bcca9f" opacity=".86"><use href="#pbTanne" x="50" y="120" width="360" height="730"/><use href="#pbLaub" x="452" y="252" width="300" height="600"/><use href="#pbTanne" x="648" y="352" width="250" height="500"/><use href="#pbLaub" x="902" y="330" width="266" height="520"/></g></svg>
      <svg class="pb-seerosen" viewBox="0 0 1200 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><defs>
      <symbol id="pbPad" viewBox="0 0 100 100"><path d="M50 4 A46 46 0 1 1 49 4 L50 50 Z" fill="currentColor"/></symbol>
      <symbol id="pbRose" viewBox="0 0 100 100"><g fill="currentColor" fill-opacity=".82"><path d="M50 5 C57 30 56 46 50 60 C44 46 43 30 50 5Z"/><path d="M50 5 C57 30 56 46 50 60 C44 46 43 30 50 5Z" transform="rotate(30 50 54)"/><path d="M50 5 C57 30 56 46 50 60 C44 46 43 30 50 5Z" transform="rotate(60 50 54)"/><path d="M50 5 C57 30 56 46 50 60 C44 46 43 30 50 5Z" transform="rotate(90 50 54)"/><path d="M50 5 C57 30 56 46 50 60 C44 46 43 30 50 5Z" transform="rotate(120 50 54)"/><path d="M50 5 C57 30 56 46 50 60 C44 46 43 30 50 5Z" transform="rotate(150 50 54)"/><path d="M50 5 C57 30 56 46 50 60 C44 46 43 30 50 5Z" transform="rotate(180 50 54)"/><path d="M50 5 C57 30 56 46 50 60 C44 46 43 30 50 5Z" transform="rotate(210 50 54)"/><path d="M50 5 C57 30 56 46 50 60 C44 46 43 30 50 5Z" transform="rotate(240 50 54)"/><path d="M50 5 C57 30 56 46 50 60 C44 46 43 30 50 5Z" transform="rotate(270 50 54)"/><path d="M50 5 C57 30 56 46 50 60 C44 46 43 30 50 5Z" transform="rotate(300 50 54)"/><path d="M50 5 C57 30 56 46 50 60 C44 46 43 30 50 5Z" transform="rotate(330 50 54)"/></g><g fill="currentColor"><path d="M50 22 C55 37 55 48 50 58 C45 48 45 37 50 22Z" transform="rotate(15 50 54)"/><path d="M50 22 C55 37 55 48 50 58 C45 48 45 37 50 22Z" transform="rotate(45 50 54)"/><path d="M50 22 C55 37 55 48 50 58 C45 48 45 37 50 22Z" transform="rotate(75 50 54)"/><path d="M50 22 C55 37 55 48 50 58 C45 48 45 37 50 22Z" transform="rotate(105 50 54)"/><path d="M50 22 C55 37 55 48 50 58 C45 48 45 37 50 22Z" transform="rotate(135 50 54)"/><path d="M50 22 C55 37 55 48 50 58 C45 48 45 37 50 22Z" transform="rotate(165 50 54)"/><path d="M50 22 C55 37 55 48 50 58 C45 48 45 37 50 22Z" transform="rotate(195 50 54)"/><path d="M50 22 C55 37 55 48 50 58 C45 48 45 37 50 22Z" transform="rotate(225 50 54)"/><path d="M50 22 C55 37 55 48 50 58 C45 48 45 37 50 22Z" transform="rotate(255 50 54)"/><path d="M50 22 C55 37 55 48 50 58 C45 48 45 37 50 22Z" transform="rotate(285 50 54)"/><path d="M50 22 C55 37 55 48 50 58 C45 48 45 37 50 22Z" transform="rotate(315 50 54)"/><path d="M50 22 C55 37 55 48 50 58 C45 48 45 37 50 22Z" transform="rotate(345 50 54)"/></g><circle cx="50" cy="54" r="7" fill="currentColor"/></symbol></defs>
      <path d="M0 610 Q320 584 640 610 T1200 610 V900 H0Z" fill="#ffffff" opacity=".03"/>
      <path d="M0 770 Q300 748 600 770 T1200 770 V900 H0Z" fill="#ffffff" opacity=".035"/>
      <g color="#ffffff"><use href="#pbPad" x="-120" y="560" width="560" height="560" opacity=".10" transform="rotate(-12 160 840)"/><use href="#pbPad" x="770" y="600" width="540" height="540" opacity=".11" transform="rotate(26 1040 870)"/><use href="#pbPad" x="300" y="690" width="400" height="400" opacity=".13" transform="rotate(-28 500 890)"/></g>
      <g color="#ffffff"><use href="#pbRose" x="120" y="612" width="270" height="270" opacity=".52"/><use href="#pbRose" x="712" y="686" width="228" height="228" opacity=".44"/><use href="#pbRose" x="452" y="548" width="168" height="168" opacity=".34"/></g></svg>
    </div>
    <div class="pb-theme" role="group" aria-label="Ansicht">
      <button id="pbHell" type="button">Hell</button>
      <button id="pbDunkel" type="button">Dunkel</button>
    </div>`;

export function applyDesign(doc) {
  if (doc.getElementById("pbDesign")) return;
  const st = doc.createElement("style");
  st.id = "pbDesign";
  st.textContent = DESIGN_CSS;
  doc.head.appendChild(st);
  const wrap = doc.createElement("div");
  wrap.innerHTML = KULISSE_HTML;
  while (wrap.firstChild) doc.body.appendChild(wrap.firstChild);
  const setze = t => {
    const d = t === "dark";
    doc.documentElement.setAttribute("data-theme", d ? "dark" : "light");
    const h = doc.getElementById("pbHell"), n = doc.getElementById("pbDunkel");
    if (h) h.classList.toggle("an", !d);
    if (n) n.classList.toggle("an", d);
  };
  const h = doc.getElementById("pbHell"), n = doc.getElementById("pbDunkel");
  if (h) h.textContent = uiText("theme.hell");
  if (n) n.textContent = uiText("theme.dunkel");
  if (h) h.addEventListener("click", () => setze("light"));
  if (n) n.addEventListener("click", () => setze("dark"));
  setze("light");
}
