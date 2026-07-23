import { t as uiText } from "../i18n/index.js";
// Design auf Dokument-Ebene: <style> + Kulisse + Theme-Umschalter, einmalig
// beim Booten angewendet (idempotent), damit ALLE Screens dasselbe Theme tragen.

// Mobile-Härtung (M3), im CSS bewusst unkommentiert (i18n-Kanarie scannt das
// Literal): Textfelder nie unter 16px (iOS-Fokus-Zoom), Composer hält per
// scroll-margin Abstand zur Tastatur, Haupt-Aktionen min. 44px Touch-Höhe,
// Safe-Area-Insets an #app und fixiertem Chrome (Theme/Busy).
export const DESIGN_CSS = String.raw`      @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,300;0,8..60,400;0,8..60,600;1,8..60,300&family=Instrument+Sans:wght@400;500;600&display=swap');
      :root{
        /* D1 · Design-Tokens (Handoff Turn 17) — Namensraum rz-. Die alten
           pb-Variablen bleiben bestehen, bis D2–D5 die Screens umziehen. */
        --rz-serif:'Source Serif 4',Georgia,'Times New Roman',serif;
        --rz-sans:'Instrument Sans',system-ui,-apple-system,sans-serif;
        --rz-papier:#faf8f2;--rz-papier-regal:#f0ece0;
        --rz-hairline:#e3dfd0;--rz-hairline-regal:#ddd8c6;--rz-hairline-gruen:rgba(157,176,143,.28);
        --rz-tiefgruen:#1e2a22;--rz-regal-dunkel:#141f18;
        --rz-ink:#23291f;--rz-ink-auf-gruen:#eef0e7;--rz-ink2-auf-gruen:#e6e9d9;
        --rz-sek:#6b7261;--rz-sek2:#8b917d;--rz-sek-auf-gruen:#b9c3ac;--rz-sek2-auf-gruen:#8a9e7c;
        --rz-gedimmt:#a3a894;--rz-marke:#5c6653;
        --rz-akzent:#8fae74;--rz-akzent-text:#14201a;--rz-akzent-hell:#7d9b62;
        --rz-pfeil:#7d9b62;--rz-pfeil-auf-gruen:#a9c88b;
        --rz-label:#7d9b62;--rz-label-auf-gruen:#9db08f;--rz-nutzer:#41562c;
        --bg1:#f7f4ea;--bg2:#edf1e2;--ink:#313c31;--ink-soft:#64705c;--ink-faint:#909a86;
        --accent:#7ba05b;--accent-ink:#41562c;--on-accent:#ffffff;--me-bg:#7ba05b;--me-ink:#ffffff;
        --card:rgba(255,255,255,.60);--card-bd:rgba(90,110,80,.15);
        --ai-bg:rgba(255,255,255,.72);--ai-bd:rgba(90,110,80,.13);
        --field:rgba(255,255,255,.74);--field-bd:rgba(90,110,80,.22);
      }
      html[data-theme=dark]{
        /* D1 · Dark-Tokens: Papier wird Dark-Papier, Tiefgruen wird tiefer. */
        --rz-papier:#242b21;--rz-papier-regal:#20261d;
        --rz-hairline:#39412f;--rz-hairline-regal:#39412f;
        --rz-tiefgruen:#101b14;--rz-regal-dunkel:#0c1510;
        --rz-ink:#ece9da;--rz-sek:#b9c3ac;--rz-sek2:#9aa38c;
        --rz-gedimmt:#7f8672;--rz-marke:#99a189;
        --rz-akzent-hell:#8fae74;--rz-pfeil:#a9c88b;
        --rz-label:#aeca8d;--rz-nutzer:#c4d8ab;
        --bg1:#2a3a34;--bg2:#151f1c;--ink:#edf1e8;--ink-soft:#b3c1aa;--ink-faint:#889481;
        --accent:#aeca8d;--accent-ink:#e2ecd4;--on-accent:#1d2a1a;--me-bg:#42583b;--me-ink:#f4f7ef;
        --card:rgba(255,255,255,.055);--card-bd:rgba(255,255,255,.10);
        --ai-bg:rgba(255,255,255,.06);--ai-bd:rgba(255,255,255,.09);
        --field:rgba(255,255,255,.06);--field-bd:rgba(255,255,255,.16);
      }
      html{height:100%}
      body{margin:0;min-height:100%;background:var(--rz-papier);transition:background .5s}
      #app{max-width:660px;position:relative;z-index:1;font-family:var(--rz-sans);
           color:var(--ink);font-size:16px;line-height:1.65;
           padding:calc(46px + env(safe-area-inset-top,0px)) calc(22px + env(safe-area-inset-right,0px))
                   calc(34vh + env(safe-area-inset-bottom,0px)) calc(22px + env(safe-area-inset-left,0px))}
      .pb-baeume{display:block} html[data-theme=dark] .pb-baeume{display:none}
      .pb-seerosen{display:none} html[data-theme=dark] .pb-seerosen{display:block}
      .pb-hidden{display:none!important}
      .pb-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:30px}
      .pb-brand{display:flex;flex-direction:column;gap:3px}
      .pb-h1{font-family:var(--rz-serif);font-size:30px;font-weight:300;margin:0;letter-spacing:.005em;line-height:1.18}
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
      input,select,textarea{font-size:max(16px,1em)}
      .pb-composer textarea{scroll-margin-block:80px 40vh}
      .pb-btn{min-height:44px;box-sizing:border-box}
      .pb-theme button{min-height:36px}
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
      .pb-theme{position:fixed;top:calc(18px + env(safe-area-inset-top,0px));right:calc(16px + env(safe-area-inset-right,0px));z-index:6;display:flex;gap:3px;background:var(--card);
                border:1px solid var(--card-bd);border-radius:999px;padding:4px;backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px)}
      .pb-theme button{font-family:inherit;font-size:14px;border:0;background:transparent;color:var(--ink-soft);
                border-radius:999px;padding:6px 14px;cursor:pointer;transition:.2s}
      .pb-theme button.an{background:var(--accent);color:var(--on-accent)}
      .pb-busydots{display:inline-flex;gap:4px;align-items:center}
      .pb-busydots span{width:6px;height:6px;border-radius:50%;background:var(--ink-faint);animation:pbBlink 1.2s infinite}
      .pb-busydots span:nth-child(2){animation-delay:.2s}.pb-busydots span:nth-child(3){animation-delay:.4s}
      .pb-busy{position:fixed;top:calc(18px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);z-index:7;display:flex;gap:9px;align-items:center;
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
      .pb-mit-lz{position:relative;overflow:visible}
      .pb-lz-leiste{position:absolute;top:-9px;right:10px;display:flex;gap:6px;pointer-events:none}
      .pb-lz{display:inline-block;min-width:16px;padding:3px 4px 8px;font-size:10px;font-weight:650;line-height:1;
             text-align:center;letter-spacing:.02em;background:var(--accent);color:var(--on-accent);
             border-radius:2px 2px 0 0;clip-path:polygon(0 0,100% 0,100% 100%,50% calc(100% - 5px),0 100%);
             box-shadow:0 1px 2px rgba(0,0,0,.18)}
      .pb-ag-block{border:1px solid var(--card-bd);border-radius:12px;padding:8px 12px 10px;margin-top:10px;background:var(--card)}
      .pb-ag-ziele{border-left:4px solid var(--accent)}
      .pb-ag-kopf{font-size:13px;font-weight:650;color:var(--ink-soft);letter-spacing:.02em}
      .pb-platz{border:1px solid var(--card-bd);border-radius:12px;padding:9px 13px;margin:6px 0;cursor:grab}
      .pb-platz.leer{border-style:dashed;color:var(--ink-faint);cursor:default}
      .pb-platz.gewaehlt{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent) inset}
      #kwPool [draggable]{cursor:grab}

      /* ============ D1 · Grundbaustein A — Zweiteilung / Naht ============
         Zwei Haelften je flex:1; die Naht ist die Grenze dazwischen. Mobil
         horizontal gestapelt, ab 900px vertikale Naht (Spiegelung horizontal).
         Elemente "auf der Naht" ankern an der ZWEITEN Haelfte (top 0,
         translate -50%). */
      .rz-split{display:flex;flex-direction:column;min-height:100dvh}
      .rz-half{flex:1;display:flex;flex-direction:column;position:relative;
               padding:30px 24px;box-sizing:border-box}
      .rz-half.rz-papier{background:var(--rz-papier);color:var(--rz-ink)}
      .rz-half.rz-regal{background:var(--rz-papier-regal);color:var(--rz-ink)}
      .rz-half.rz-tiefgruen{background:var(--rz-tiefgruen);color:var(--rz-ink-auf-gruen)}
      .rz-half.rz-regal-dunkel{background:var(--rz-regal-dunkel);color:var(--rz-ink-auf-gruen)}
      .rz-naht-anker{position:relative}
      .rz-auf-naht{position:absolute;left:50%;top:0;transform:translate(-50%,-50%);z-index:5}
      @media(min-width:900px){
        .rz-split{flex-direction:row}
        .rz-auf-naht{left:0;top:50%;transform:translate(-50%,-50%)}
      }

      /* ============ D1 · Grundbaustein B — Hairline-Zeile ============
         Serif-Zeile mit Pfeil-Suffix, 1px-Linien statt Karten. Als <button>
         nutzbar (Reset inklusive). Varianten: gedimmt (+ Zustandstext statt
         Pfeil), Fortschrittsbalken 2px, runde Initial-Badge 22px. */
      .rz-zeile{display:flex;justify-content:space-between;align-items:baseline;gap:12px;
                width:100%;box-sizing:border-box;min-height:44px;padding:15px 0;margin:0;
                border:0;border-top:1px solid var(--rz-hairline);background:none;text-align:left;
                font-family:var(--rz-serif);font-size:20px;font-weight:400;line-height:1.3;
                color:inherit;cursor:pointer;border-radius:0}
      .rz-zeile:disabled,.rz-zeile.rz-gedimmt{color:var(--rz-gedimmt);cursor:default}
      .rz-zeile .rz-pfeil{flex:none;font-family:var(--rz-sans);font-size:15px;color:var(--rz-pfeil)}
      .rz-tiefgruen .rz-zeile,.rz-regal-dunkel .rz-zeile{border-top-color:var(--rz-hairline-gruen)}
      .rz-tiefgruen .rz-zeile .rz-pfeil,.rz-regal-dunkel .rz-zeile .rz-pfeil{color:var(--rz-pfeil-auf-gruen)}
      .rz-regal .rz-zeile{border-top-color:var(--rz-hairline-regal);font-size:19px}
      .rz-zeile.rz-unten{border-top:0;border-bottom:1px solid var(--rz-hairline-gruen)}
      .rz-zeile .rz-zustand{flex:none;font-family:var(--rz-sans);font-size:12px;color:var(--rz-gedimmt);
                            max-width:38%;text-align:right;line-height:1.4}
      .rz-balken{height:2px;background:var(--rz-hairline);margin-top:8px}
      .rz-balken>i{display:block;height:2px;background:var(--rz-akzent-hell)}
      .rz-initial{width:22px;height:22px;flex:none;border-radius:50%;background:var(--rz-akzent);
                  color:var(--rz-akzent-text);font-family:var(--rz-sans);font-size:11px;font-weight:600;
                  display:inline-flex;align-items:center;justify-content:center;align-self:center}
      .rz-caps{font-family:var(--rz-sans);font-size:11px;font-weight:600;letter-spacing:.2em;
               text-transform:uppercase;color:var(--rz-label)}
      .rz-tiefgruen .rz-caps,.rz-regal-dunkel .rz-caps{color:var(--rz-label-auf-gruen)}

      /* ============ D1 · Grundbaustein C — Wegweiser-Badge / -Panel ============
         Badge sitzt exakt auf der Naht (rz-auf-naht), Punkt = etwas wartet.
         Panel faltet sich aus der Naht (scaleY + opacity, ~300ms,
         cubic-bezier(.2,.8,.2,1)), ueberdeckt als Overlay, Klick irgendwohin
         schliesst. Inhalt: nur Text, 2–3 Optionen, Serif, Raumnamen kursiv. */
      /* Der Knopf liegt UNTER dem Textpanel: klappt das Panel aus der Mitte
         auf, verschwindet der Knopf dahinter (Tap aufs Panel schliesst). */
      .rz-weg-badge{z-index:3;background:var(--rz-akzent);color:var(--rz-akzent-text);border:0;cursor:pointer;
                    font-family:var(--rz-sans);font-size:11px;font-weight:600;letter-spacing:.16em;
                    text-transform:uppercase;padding:9px 18px;display:flex;align-items:center;gap:8px;
                    border-radius:0;min-height:0}
      .rz-weg-badge .rz-punkt{width:6px;height:6px;border-radius:50%;background:var(--rz-akzent-text);
                              display:none}
      .rz-weg-badge.rz-wartet .rz-punkt{display:block}
      .rz-weg-panel{position:absolute;left:0;right:0;top:0;z-index:4;padding:30px 24px;
                    background:var(--rz-papier);color:var(--rz-ink);
                    border-top:1px solid var(--rz-hairline);border-bottom:1px solid var(--rz-hairline);
                    transform:translateY(-50%) scaleY(0);transform-origin:center center;
                    opacity:0;pointer-events:none;
                    transition:transform .3s cubic-bezier(.2,.8,.2,1),opacity .3s cubic-bezier(.2,.8,.2,1)}
      .rz-weg-panel.rz-offen{transform:translateY(-50%) scaleY(1);opacity:1;pointer-events:auto}
      .rz-weg-panel .rz-option{font-family:var(--rz-serif);font-size:17px;font-weight:300;
                               line-height:1.55;margin:0 0 14px}
      .rz-weg-panel .rz-option em{font-style:italic}
      .rz-weg-fuss{font-family:var(--rz-sans);font-size:11px;color:var(--rz-gedimmt);
                   text-align:center;padding-top:8px}
      @media(prefers-reduced-motion:reduce){.rz-weg-panel{transition:none}}

      /* ============ D2 · Screen-Rahmen + Startscreen ============
         Die App-Wurzel wird randlos (rz-app); noch nicht umgezogene Screens
         behalten uebergangsweise die zentrierte Spalte. Der Startscreen ist
         die erste volle Zweiteilung (Design 17a/b). */
      /* D8 · Vollbild: keine Spalte, kein Rand — die Screens fuellen den
         Schirm bis an die Kante. Die Sicherheitsabstaende leben in den
         Zonen selbst (rz-half), nicht in einer Huelle darum.
         Der Marker sitzt am <html>, nicht an #app: je nach Plattform ist die
         App-Wurzel #app (Pages) ODER #pbMain in einer Huelle (Artefakt) —
         beide Huellen muessen randlos werden, sonst bleibt oben ein Streifen. */
      html[data-vollbild],html[data-vollbild] body{margin:0;padding:0;width:100%;height:100%;max-width:none}
      html[data-vollbild] #app,html[data-vollbild] #pbMain{
        margin:0;padding:0;max-width:none;width:100%;min-height:100dvh;box-sizing:border-box}
      .rz-app{max-width:none;padding:0;width:100%;min-height:100dvh}
      .rz-screen{min-height:100dvh}
      .rz-screen .rz-half:first-child{padding-top:calc(30px + env(safe-area-inset-top,0px))}
      .rz-screen .rz-half:last-child{padding-bottom:calc(34px + env(safe-area-inset-bottom,0px))}
      .rz-kopf{display:flex;justify-content:space-between;align-items:center;margin-bottom:26px}
      .rz-marke{font-family:var(--rz-sans);font-size:12px;font-weight:600;letter-spacing:.16em;
                text-transform:uppercase;color:var(--rz-marke)}
      .rz-h1{font-family:var(--rz-serif);font-size:30px;font-weight:300;line-height:1.18;margin:12px 0 0}
      .rz-h2{font-family:var(--rz-serif);font-size:26px;font-weight:300;line-height:1.2;margin:0 0 6px}
      .rz-sub{font-family:var(--rz-sans);font-size:13px;line-height:1.6;color:var(--rz-sek2);margin:8px 0 0}
      .rz-fuss{margin-top:auto}
      .rz-still{font-size:13px;margin-top:10px}
      .rz-lz-leiste{display:inline-flex;gap:6px;margin-left:auto}
      .rz-zeile .rz-lz-leiste+.rz-pfeil{margin-left:0}
      .rz-zeile>span:first-child{flex:1}
      /* Theme-Umschalter als leises Glyphen-Paar im Sinne des Kopfes: nur der
         jeweils INAKTIVE Zustand ist sichtbar (= Wechselziel), Beschriftung
         bleibt fuer Screenreader erhalten. */
      .rz-app~.pb-theme,.pb-theme{background:none;border:0;padding:0;backdrop-filter:none;-webkit-backdrop-filter:none}
      .pb-theme button{font-size:0;padding:6px 10px;color:var(--rz-marke)}
      .pb-theme button::before{font-size:15px;line-height:1;color:var(--rz-marke)}
      #pbHell::before{content:'\2600\FE0E'}
      #pbDunkel::before{content:'\263E\FE0E'}
      .pb-theme button.an{display:none}
      html[data-theme=dark] .pb-theme button{color:var(--rz-marke)}

      /* ============ D3 · Vorraeume als Zwei-Zonen-Layout (Design 17c/d) ============
         Obere Zone: der Raum (Sessions als Zeilen unten an der Zonengrenze).
         Untere Zone: das Regal (Zeilen direkt unter der Grenze, Titel unten
         aussen). Kopf: Zurueck-Pfeil links, Caps-Label zentriert, blinder
         Spiegel-Pfeil rechts. */
      .rz-kopf-mitte{justify-content:space-between}
      .rz-zurueck{border:0;background:none;padding:4px 8px;margin:-4px -8px;cursor:pointer;
                  font-family:var(--rz-sans);font-size:13.5px;color:var(--rz-marke);min-height:0}
      .rz-tiefgruen .rz-zurueck,.rz-regal-dunkel .rz-zurueck{color:var(--rz-sek-auf-gruen)}
      .rz-blind{visibility:hidden;cursor:default}
      .rz-intro{margin:4px 0 0;max-width:46ch}
      .rz-tiefgruen .rz-sub,.rz-regal-dunkel .rz-sub{color:var(--rz-sek2-auf-gruen)}
      .rz-still-aus{display:none!important}
      .rz-zeile.rz-spalte{flex-direction:column;align-items:stretch;gap:0}
      .rz-zeile-haupt{display:flex;justify-content:space-between;align-items:baseline;gap:12px}
      .rz-zeile-haupt>span:first-child{flex:1}
      .rz-zeile .rz-balken{margin-top:8px}
      .rz-regal-reihen{display:flex;flex-direction:column}
      .rz-regal-inhalt{font-size:13px;padding:12px 0;border-bottom:1px solid var(--rz-hairline-regal)}
      .rz-regal-dunkel .rz-regal-inhalt{border-bottom-color:var(--rz-hairline-gruen)}
      .rz-regal-inhalt .pb-item{border-bottom:1px solid var(--rz-hairline-regal);font-size:14px}
      .rz-regal-dunkel .rz-regal-inhalt .pb-item{border-bottom-color:var(--rz-hairline-gruen)}
      .rz-eine-zone{display:flex;flex-direction:column}
      .rz-eine-zone .rz-half{flex:1;padding-top:calc(30px + env(safe-area-inset-top,0px));
                             padding-bottom:calc(34px + env(safe-area-inset-bottom,0px))}
      .rz-eine-zone #boxMess{margin-top:18px;font-size:14px}

      /* ============ D4 · Chat ohne Blasen (Design 17e) ============
         Begleitung: Serif 17/300 links (Label als leise Caps-Marke beim
         Rollenwechsel), Nutzerin: Sans 14.5 rechtsbuendig in Dunkelgruen.
         Composer als Hairline-Zeile mit kursivem Serif-Platzhalter,
         Send-Quadrat 34x34. Desktop: ruhige 640px-Mittelspalte. */
      .rz-app #scrChat{max-width:none;margin:0;background:var(--rz-papier);color:var(--rz-ink);
        min-height:100dvh;padding:calc(30px + env(safe-area-inset-top,0px)) 24px
        calc(24px + env(safe-area-inset-bottom,0px))}
      .rz-chat-innen{max-width:640px;margin:0 auto;display:flex;flex-direction:column;min-height:calc(100dvh - 60px)}
      #scrChat .pb-msgs{gap:22px;flex:1}
      #scrChat .rz-sprecher{font-family:var(--rz-sans);font-size:10px;font-weight:600;
        letter-spacing:.16em;text-transform:uppercase;color:var(--rz-sek2);margin-bottom:-17px}
      #scrChat .pb-msg{background:none;border:0;border-radius:0;padding:0;backdrop-filter:none;-webkit-backdrop-filter:none}
      #scrChat .pb-msg.ai{font-family:var(--rz-serif);font-size:17px;font-weight:300;line-height:1.55;
        align-self:flex-start;max-width:88%;color:var(--rz-ink)}
      #scrChat .pb-msg.me{font-family:var(--rz-sans);font-size:14.5px;line-height:1.6;
        align-self:flex-end;max-width:82%;text-align:right;color:var(--rz-nutzer)}
      #scrChat .pb-composer{border-top:1px solid var(--rz-hairline);padding-top:16px;margin-top:24px;align-items:center}
      #scrChat .pb-composer textarea{border:0;background:none;border-radius:0;padding:6px 0;
        font-family:var(--rz-serif);color:var(--rz-ink)}
      #scrChat .pb-composer textarea::placeholder{font-style:italic;color:var(--rz-gedimmt)}
      #scrChat #btnMic{border:0;background:none;color:var(--rz-akzent-hell);padding:0 6px;min-height:34px}
      #scrChat #btnMic svg{stroke-width:1.6}
      #scrChat #btnSend{width:34px;height:34px;min-height:34px;padding:0;border:0;border-radius:0;
        background:var(--rz-akzent-hell);color:var(--rz-papier);display:inline-flex;align-items:center;justify-content:center}
      #scrChat .rz-panel{border-top:1px solid var(--rz-hairline);border-bottom:1px solid var(--rz-hairline);
        padding:14px 0;margin:10px 0;font-size:14px}
      #scrChat .pb-skala{background:none;border:1px solid var(--rz-hairline);border-radius:0}
      #scrChat #btnChatEnde{font-size:16px;margin-top:6px}
      html[data-theme=dark] #scrChat #btnSend{color:var(--rz-tiefgruen)}

      /* ============ D5 · Teilen-Flow (Design 17f) ============
         Die Freigabe-Vorschau zeigt EXAKT den Text, der im Regal ankommt:
         Tiefgruen-Block mit Von-Zeile, typografische Anfuehrung per CSS
         (keine Textaenderung). Wahl-Labels und Aktionen als Hairline-Zeilen. */
      .rz-teilen-block{background:var(--rz-tiefgruen);color:var(--rz-ink-auf-gruen);
        padding:18px 20px;margin:12px 0}
      .rz-teilen-block .rz-von{color:var(--rz-label-auf-gruen);margin-bottom:8px}
      .rz-teilen-text{font-family:var(--rz-serif);font-size:16.5px;font-weight:300;
        line-height:1.55;margin:0}
      .rz-teilen-text::before{content:'„'}
      .rz-teilen-text::after{content:'“'}
      .rz-wahl{display:block;font-size:14px;margin:0;padding:10px 0;
        border-top:1px solid var(--rz-hairline)}
      .rz-von .rz-initial{width:18px;height:18px;font-size:10px;vertical-align:middle}
      .rz-regal-eintrag .rz-von{margin-bottom:4px}
      .rz-regal-text{font-family:var(--rz-serif);font-size:15.5px;font-weight:300;line-height:1.5}

      /* ============ D8 · Sprachwechsel als Eckknopf + Aufwaerts-Dialog ============
         Kleiner DE/EN-Wechsler unten rechts; der Dialog faehrt von unten
         herein. Der Knopf bleibt UEBER dem Dialog liegen, damit derselbe
         Tap wieder schliesst. Der Vorgang selbst (Paarsprache: vorschlagen,
         bestaetigen, zuruecknehmen) ist unveraendert. */
      #psZeile.rz-sprachecke{position:fixed;z-index:30;margin:0;
        right:calc(18px + env(safe-area-inset-right,0px));
        bottom:calc(18px + env(safe-area-inset-bottom,0px));
        display:flex;align-items:center;gap:8px}
      .rz-sprach-hinweis{font-family:var(--rz-sans);font-size:11px;color:var(--rz-sek2);
        max-width:16ch;text-align:right;line-height:1.35}
      .rz-sprachknopf{border:1px solid var(--rz-hairline);background:var(--rz-papier);
        color:var(--rz-gedimmt);cursor:pointer;border-radius:0;padding:6px 10px;min-height:0;
        font-family:var(--rz-sans);font-size:11px;font-weight:600;letter-spacing:.1em;
        display:inline-flex;align-items:center;gap:5px}
      .rz-sprachknopf .an{color:var(--rz-akzent-hell)}
      .rz-sprachknopf .rz-punkt{width:5px;height:5px;border-radius:50%;background:var(--rz-akzent)}
      #boxPaarsprache.rz-sprachdialog{position:fixed;left:0;right:0;bottom:0;z-index:25;
        display:block;margin:0;border:0;border-top:1px solid var(--rz-hairline);border-radius:0;
        background:var(--rz-papier);color:var(--rz-ink);font-size:13px;
        padding:22px 24px calc(64px + env(safe-area-inset-bottom,0px));
        transform:translateY(100%);opacity:0;pointer-events:none;
        transition:transform .3s cubic-bezier(.2,.8,.2,1),opacity .3s cubic-bezier(.2,.8,.2,1)}
      #boxPaarsprache.rz-sprachdialog:not(.pb-hidden){transform:translateY(0);opacity:1;pointer-events:auto}
      .rz-sprachdialog .pb-btn{margin:6px 8px 0 0}
      @media(prefers-reduced-motion:reduce){#boxPaarsprache.rz-sprachdialog{transition:none}}

      /* ============ D9 · Regal-Vollbild: ruhig oeffnen ============
         Warum es vorher ruckelte: beide Zonen teilen sich den Schirm
         (flex:1). Kam Inhalt dazu, rechnete das Layout schlagartig neu —
         Naht, Badge und Kulisse sprangen, das Dokument wuchs, eine
         Bildlaufleiste erschien und verschwand wieder.
         Jetzt uebernimmt die Regal-Zone den ganzen Schirm: die obere Zone
         faltet sich weg (flex-grow 1 -> 0), die Zonen-Ueberschrift faehrt
         nach oben, und der Inhalt rollt INNERHALB der Zone, statt die Seite
         wachsen zu lassen. Beim Zuklappen laeuft alles rueckwaerts. */
      .rz-screen .rz-half:first-child{overflow:hidden}
      .rz-regal-reihen{display:flex;flex-direction:column;min-height:0}
      .rz-fuss-kopf{display:flex;align-items:baseline;justify-content:space-between;gap:12px}
      .rz-zone-zu{border:0;background:none;padding:2px 0 2px 12px;margin:0;cursor:pointer;
        font-family:var(--rz-sans);font-size:16px;line-height:1;color:var(--rz-pfeil);
        opacity:0;pointer-events:none;transition:opacity .2s ease}
      .rz-regal-dunkel .rz-zone-zu{color:var(--rz-pfeil-auf-gruen)}
      .rz-regal-offen .rz-zone-zu{opacity:1;pointer-events:auto}
      /* Die offene Zeile behaelt ihre Linie, verliert aber ihren Pfeil —
         der Weg nach unten steht jetzt oben an der Zonen-Ueberschrift. */
      .rz-zeile.rz-auf .rz-pfeil{display:none}
      .rz-regal-offen{position:relative;height:100dvh;overflow:hidden}
      /* Der obere Teil bleibt EXAKT stehen: statt ihn vom Flex-Layout neu
         verteilen zu lassen, wird er auf sein gemessenes Mass festgesetzt.
         Die Regal-Zone legt sich als Flaeche darueber — von unterhalb des
         Kopfes ("Raum fuer uns") bis zur Unterkante. */
      .rz-regal-offen>.rz-half:first-child{position:absolute;top:0;left:0;right:0;height:var(--rz-oben-h,50%)}
      .rz-regal-offen>.rz-half:last-child{position:absolute;left:0;right:0;bottom:0;
        top:var(--rz-regal-top,0px);z-index:2}
      .rz-half{transition:transform .36s cubic-bezier(.2,.8,.2,1)}
      .rz-regal-offen .rz-weg-badge,.rz-regal-offen .rz-kulisse-fuss{
        opacity:0;pointer-events:none;transition:opacity .2s ease}
      .rz-regal-offen>.rz-half:last-child .rz-fuss{order:-1;margin-top:0;margin-bottom:14px;
        animation:rzEinblenden .28s .08s both}
      .rz-regal-offen .rz-regal-reihen{flex:1 1 auto}
      /* Akkordeon: der Inhalt waechst aus dem Trennstrich unter seiner Zeile
         hervor — freigelegt per clip-path, ohne den Text zu verzerren. */
      .rz-regal-inhalt:not(.pb-hidden){animation:rzAufklappen .32s cubic-bezier(.2,.8,.2,1) both}
      .rz-regal-offen .rz-regal-inhalt:not(.pb-hidden){
        flex:1 1 auto;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;border-bottom:0}
      @keyframes rzAufklappen{
        from{clip-path:inset(0 0 100% 0);opacity:.4}
        to{clip-path:inset(0 0 0 0);opacity:1}}
      @keyframes rzEinblenden{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
      @media(prefers-reduced-motion:reduce){
        .rz-half{transition:none}
        .rz-regal-inhalt:not(.pb-hidden),.rz-regal-offen>.rz-half:last-child .rz-fuss{animation:none}
      }

      /* ============ D6 · Kulisse — ortsgebunden, leise, wachsend ============
         Start: auf der Naht (hell: Baeume ragen darueber, dunkel: Teich
         darunter). Vorraeume: unten in der Regal-Zone. Chat: keine. Eigener
         Clipping-Halter, nie klickbar, statisch (reduced-motion-fest). */
      .rz-kulisse-naht,.rz-kulisse-fuss{position:absolute;left:0;right:0;height:84px;
        overflow:hidden;pointer-events:none;color:var(--rz-akzent-hell)}
      .rz-kulisse-naht{top:0;transform:translateY(-100%)}
      html[data-theme=dark] .rz-kulisse-naht{transform:none}
      .rz-kulisse-fuss{bottom:0}
      .rz-kulisse-naht svg,.rz-kulisse-fuss svg{position:absolute;bottom:0;left:0;width:100%;height:100%}
      .rz-kulisse-dunkel{display:none}
      html[data-theme=dark] .rz-kulisse-hell{display:none}
      html[data-theme=dark] .rz-kulisse-dunkel{display:block}
    `;

/* D6 · Die alte fixe Hintergrund-Kulisse ist Geschichte — die Kulisse
   lebt jetzt ortsgebunden in den Screens (core/ui/kulisse.js). */

/** Läuft die App als installierte PWA (eigenes Fenster statt Browser-Tab)?
 *  Reine Funktion über dem window-Objekt: display-mode aus dem Manifest
 *  (standalone) oder das ältere iOS-Signal navigator.standalone. */
export function istStandalone(win) {
  if (!win) return false;
  try {
    if (typeof win.matchMedia === "function" && win.matchMedia("(display-mode: standalone)").matches) return true;
  } catch { /* z. B. sehr alte Engines */ }
  return win.navigator ? win.navigator.standalone === true : false;
}

/* D1 · Wegweiser-Panel-Verdrahtung (Grundbaustein C). Öffnen per Tap aufs
 * Badge, Schließen per Tap irgendwohin — das Badge stoppt die Propagation,
 * damit derselbe Tap das Panel nicht sofort wieder schließt. Der Dokument-
 * Listener wird nur EINMAL gesetzt (Marker am document), egal wie viele
 * Badges es gibt; er schließt alle offenen Panels. Ab D2 von den Screens
 * benutzt. */
export function verdrahteWegweiser(doc, badge, panel) {
  if (!badge || !panel) return;
  badge.addEventListener("click", e => {
    e.stopPropagation();
    panel.classList.toggle("rz-offen");
  });
  if (!doc.__rzWegZu) {
    doc.__rzWegZu = true;
    doc.addEventListener("click", () => {
      for (const p of doc.querySelectorAll(".rz-weg-panel.rz-offen")) p.classList.remove("rz-offen");
    });
  }
}

export function applyDesign(doc) {
  if (doc.getElementById("pbDesign")) return;
  // Standalone-Haken (M3): CSS kann per html[data-standalone] reagieren —
  // z. B. künftige Installations-Hinweise ausblenden, wenn schon installiert.
  if (istStandalone(doc.defaultView)) doc.documentElement.setAttribute("data-standalone", "1");
  doc.documentElement.setAttribute("data-vollbild", "1");   // D8: randlos, egal welche Huelle
  const st = doc.createElement("style");
  st.id = "pbDesign";
  st.textContent = DESIGN_CSS;
  doc.head.appendChild(st);
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
