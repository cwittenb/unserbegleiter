import { t as uiText } from "../i18n/index.js";
import { THEME_CSS, SCHRIFT_IMPORT } from "./theme.js";
import { zeichen } from "./kulisse.js";
// Design auf Dokument-Ebene: <style> + Kulisse + Theme-Umschalter, einmalig
// beim Booten angewendet (idempotent), damit ALLE Screens dasselbe Theme tragen.

// Mobile-Härtung (M3), im CSS bewusst unkommentiert (i18n-Kanarie scannt das
// Literal): Textfelder nie unter 16px (iOS-Fokus-Zoom), Composer hält per
// scroll-margin Abstand zur Tastatur, Haupt-Aktionen min. 44px Touch-Höhe,
// Safe-Area-Insets an #app und fixiertem Chrome (Theme/Busy).
export const DESIGN_CSS = String.raw`      ${SCHRIFT_IMPORT}
`
  + THEME_CSS
  + String.raw`      html{height:100%}
      body{margin:0;min-height:100%;background:var(--rz-papier);transition:background .5s}
      #app{max-width:660px;position:relative;z-index:1;font-family:var(--rz-sans);
           color:var(--rz-ink);font-size:var(--rz-fs-text);line-height:var(--rz-lh-text);
           padding:calc(46px + env(safe-area-inset-top,0px)) calc(22px + env(safe-area-inset-right,0px))
                   calc(34vh + env(safe-area-inset-bottom,0px)) calc(22px + env(safe-area-inset-left,0px))}
      .pb-baeume{display:block} html[data-theme=dark] .pb-baeume{display:none}
      .pb-seerosen{display:none} html[data-theme=dark] .pb-seerosen{display:block}
      .pb-hidden{display:none!important}

      /* ---- T1c · Kleinteile aus den Templates -------------------------
         Bis hierher standen 70 style="…"-Attribute in den Screen-Modulen —
         fuer ein Theme unerreichbar, weil kein Selektor sie findet. Sie sind
         jetzt Klassen und ziehen ihre Werte aus der Skala. Die Namen sagen
         die Rolle, nicht die Zahl: rz-fein ist "leise Nebenzeile", nicht
         "13px" — sonst waere nur der Ort des Literals verschoben. */
      .rz-voll{width:100%}
      .rz-mitte{text-align:center}
      .rz-mitte-leise{text-align:center;opacity:.6}
      .rz-nowrap{white-space:nowrap}
      .rz-fein{font-size:var(--rz-fs-fein)}
      .rz-klein{font-size:var(--rz-fs-fein)}
      .rz-text{font-size:var(--rz-fs-text)}
      .rz-fein-block{display:block;font-size:var(--rz-fs-fein);margin:var(--rz-r-2) 0}
      .rz-fein-abstand{font-size:var(--rz-fs-fein);margin:var(--rz-r-2) 0}
      .rz-fein-betont{font-size:var(--rz-fs-fein);margin:var(--rz-r-2) 0 0;font-weight:650}
      .rz-fein-leise{font-size:var(--rz-fs-fein);color:var(--rz-sek);margin:var(--rz-r-2) 0}
      .rz-fein-leise-unten{font-size:var(--rz-fs-fein);color:var(--rz-sek);margin:0 0 var(--rz-r-3)}
      .rz-klein-abstand{font-size:var(--rz-fs-fein);margin:var(--rz-r-2) 0}
      .rz-klein-leise{font-size:var(--rz-fs-fein);color:var(--rz-sek)}
      .rz-zwischentitel{font-size:var(--rz-fs-text);font-weight:650;margin-bottom:var(--rz-r-2)}
      .rz-eng{margin:var(--rz-r-1) 0}
      .rz-abstand-2{margin:var(--rz-r-2) 0}
      .rz-oben-1{margin-top:var(--rz-r-1)}
      .rz-oben-2{margin-top:var(--rz-r-2)}
      .rz-oben-3{margin-top:var(--rz-r-3)}
      .rz-unten-1{margin-bottom:var(--rz-r-1)}
      .rz-block-oben-1{display:block;margin-top:var(--rz-r-1)}
      .rz-polster-y{padding:var(--rz-r-1) 0}
      .rz-pille-eng{padding:3px 10px}
      .rz-rechts-pille{padding:2px var(--rz-r-2);float:right}
      .rz-reihe-verteilt{display:flex;justify-content:space-between}
      .rz-reihe-umbruch{display:flex;gap:var(--rz-r-3);flex-wrap:wrap}
      .rz-flex-spalte{flex:1;min-width:150px}
      .rz-blockknopf{display:block;width:100%;text-align:left;margin:var(--rz-r-2) 0}
      .rz-blockknopf-leise{display:block;width:100%;text-align:left;margin:var(--rz-r-3) 0 0;opacity:.85}
      .rz-code{letter-spacing:5px;font-size:var(--rz-fs-text);margin:var(--rz-r-1) 0 var(--rz-r-3)}
      .rz-marke-links{font-weight:700;border-left:3px solid var(--rz-akzent);padding-left:var(--rz-r-2)}
      .rz-hinweis-blatt{border-color:var(--rz-hinweis-rand);background:var(--rz-hinweis-flaeche);
                        font-size:var(--rz-fs-fein)}
      .rz-zahlfeld{width:64px;padding:var(--rz-r-2);border:var(--rz-hairline-staerke) solid var(--rz-feld-rand);
                   border-radius:var(--rz-r-2);background:var(--rz-feld);color:var(--rz-ink);font:inherit}
      .pb-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:30px}
      .pb-brand{display:flex;flex-direction:column;gap:3px}
      .pb-h1{font-family:var(--rz-serif);font-size:var(--rz-fs-titel);font-weight:300;margin:0;letter-spacing:.005em;line-height:var(--rz-lh-titel)}
      .pb-sub{color:var(--rz-sek2);font-size:var(--rz-fs-fein)}
      .pb-brand .pb-sub{letter-spacing:.2em;text-transform:uppercase;font-size:var(--rz-fs-caps)}
      .pb-card{background:var(--rz-karte);border:1px solid var(--rz-karte-rand);border-radius:var(--rz-rund-karte);padding:24px 26px;margin:16px 0;
               backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
      .pb-btn{display:inline-block;border:1px solid var(--rz-akzent);background:transparent;color:var(--rz-akzent-ink);
              border-radius:var(--rz-rund-pille);padding:10px 22px;font-family:inherit;font-size:var(--rz-fs-text);cursor:pointer;margin:6px 8px 0 0;transition:.22s}
      .pb-btn:hover{background:var(--rz-akzent);color:var(--rz-auf-akzent)}
      .pb-btn.primary{background:var(--rz-akzent);color:var(--rz-auf-akzent)}
      .pb-btn[disabled]{opacity:.45;cursor:not-allowed}
      .pb-btn[disabled]:hover{background:transparent;color:var(--rz-akzent-ink)}
      .pb-btn.primary:hover{filter:brightness(1.05)}
      .pb-msgs{display:flex;flex-direction:column;gap:13px;margin:16px 0}
      .pb-msg{max-width:82%;padding:14px 19px;border-radius:var(--rz-rund-karte);font-size:var(--rz-fs-zeile);line-height:var(--rz-lh-text);white-space:pre-wrap}
      .pb-msg.ai{background:var(--rz-blase-du);border:1px solid var(--rz-blase-du-rand);align-self:flex-start;border-bottom-left-radius:6px;
                 backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
      .pb-msg.me{background:var(--rz-akzent);color:var(--rz-auf-akzent);align-self:flex-end;border-bottom-right-radius:6px}
      .pb-composer{display:flex;gap:8px;margin-top:6px}
      .pb-composer textarea{flex:1;border:1px solid var(--rz-feld-rand);background:var(--rz-feld);color:var(--rz-ink);
              border-radius:var(--rz-rund-blatt);padding:12px 14px;font:inherit;font-size:var(--rz-fs-zeile);min-height:46px}
      input,select,textarea{font-size:max(16px,1em)}
      .pb-composer textarea{scroll-margin-block:80px 40vh}
      .pb-btn{min-height:44px;box-sizing:border-box}
      .rz-ecke button{min-height:var(--rz-tapziel)}
      .pb-typing{display:inline-flex;gap:5px;align-items:center;min-height:14px}
      .pb-typing span{width:7px;height:7px;border-radius:50%;background:var(--rz-sek2);animation:pbBlink 1.2s infinite}
      .pb-typing span:nth-child(2){animation-delay:.2s}.pb-typing span:nth-child(3){animation-delay:.4s}
      @keyframes pbBlink{0%,80%,100%{opacity:.25}40%{opacity:1}}
      .pb-skala{display:none;gap:12px;align-items:center;background:var(--rz-karte);border:1px solid var(--rz-karte-rand);
                border-radius:var(--rz-rund-blatt);padding:12px 16px;margin:0 0 10px;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
      .pb-skala.offen{display:flex}
      .pb-skala input[type=range]{flex:1;accent-color:var(--rz-akzent)}
      .pb-skala .wert{font-weight:500;min-width:26px;text-align:center;color:var(--rz-akzent-ink);font-size:var(--rz-fs-zeile)}
      .pb-msg.ai strong{font-weight:500}
      .pb-msg.ai code{background:var(--rz-blase-du-rand);border-radius:var(--rz-rund-fein);padding:0 4px;font-family:ui-monospace,Menlo,monospace;font-size:var(--rz-fs-fein)}
      .pb-err{background:rgba(188,74,74,.12);border:1px solid rgba(188,74,74,.34);border-radius:var(--rz-rund-knopf);padding:11px 15px;font-size:var(--rz-fs-text);margin:12px 0}
      .pb-item{border-bottom:1px solid var(--rz-karte-rand);padding:11px 0;font-size:var(--rz-fs-text)}
      .pb-busydots{display:inline-flex;gap:4px;align-items:center}
      .pb-busydots span{width:6px;height:6px;border-radius:50%;background:var(--rz-sek2);animation:pbBlink 1.2s infinite}
      .pb-busydots span:nth-child(2){animation-delay:.2s}.pb-busydots span:nth-child(3){animation-delay:.4s}
      .pb-busy{position:fixed;top:calc(18px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);z-index:7;display:flex;gap:9px;align-items:center;
               background:var(--rz-karte);border:1px solid var(--rz-karte-rand);border-radius:var(--rz-rund-pille);padding:7px 16px;font-size:var(--rz-fs-fein);
               color:var(--rz-sek);backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px)}
      .pb-zwei{display:grid;grid-template-columns:1fr 1fr;gap:0 14px;align-items:stretch}
      .pb-zwei .pb-card{display:flex;flex-direction:column;gap:6px}
      @media(max-width:540px){.pb-zwei{grid-template-columns:1fr}}
      .pb-gruppe{margin:14px 0 2px}
      .pb-gruppe>.pb-sub{display:block;margin-bottom:2px}
      .pb-weg .pb-item{border-bottom:0;padding:5px 0;font-size:var(--rz-fs-fein);color:var(--rz-sek)}
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
      .pb-lz{display:inline-block;min-width:16px;padding:3px 4px 8px;font-size:var(--rz-fs-caps);font-weight:650;line-height:1;
             text-align:center;letter-spacing:.02em;background:var(--rz-akzent);color:var(--rz-auf-akzent);
             border-radius:var(--rz-rund-mini) var(--rz-rund-mini) 0 0;clip-path:polygon(0 0,100% 0,100% 100%,50% calc(100% - 5px),0 100%);
             box-shadow:0 1px 2px rgba(0,0,0,.18)}
      .pb-ag-block{border:1px solid var(--rz-karte-rand);border-radius:var(--rz-rund-knopf);padding:8px 12px 10px;margin-top:10px;background:var(--rz-karte)}
      .pb-ag-ziele{border-left:4px solid var(--rz-akzent)}
      .pb-ag-kopf{font-size:var(--rz-fs-fein);font-weight:650;color:var(--rz-sek);letter-spacing:.02em}
      .pb-platz{border:1px solid var(--rz-karte-rand);border-radius:var(--rz-rund-knopf);padding:9px 13px;margin:6px 0;cursor:grab}
      .pb-platz.leer{border-style:dashed;color:var(--rz-sek2);cursor:default}
      .pb-platz.gewaehlt{border-color:var(--rz-akzent);box-shadow:0 0 0 1px var(--rz-akzent) inset}
      #kwPool [draggable]{cursor:grab}

      /* ============ D1 · Grundbaustein A — Zweiteilung / Naht ============
         Zwei Haelften je flex:1; die Naht ist die Grenze dazwischen. Mobil
         horizontal gestapelt, ab 900px vertikale Naht (Spiegelung horizontal).
         Elemente "auf der Naht" ankern an der ZWEITEN Haelfte (top 0,
         translate -50%). */
      .rz-split{display:flex;flex-direction:column;min-height:100dvh}
      .rz-half{flex:1;display:flex;flex-direction:column;position:relative;
               padding:30px var(--rz-rand);box-sizing:border-box}
      .rz-half.rz-papier{background:var(--rz-papier);color:var(--rz-ink)}

      .rz-half.rz-tiefgruen{background:var(--rz-tiefgruen);color:var(--rz-ink-auf-gruen)}

      .rz-naht-anker{position:relative}
      .rz-auf-naht{position:absolute;left:50%;top:0;transform:translate(-50%,-50%);z-index:5}
      @media(min-width:900px){
        .rz-split{flex-direction:row;position:relative}
        .rz-split .rz-auf-naht{left:0;top:50%;transform:translate(-50%,-50%)}
        /* ---- T2d (Handover Turn 40 §3.3) · EIN Anker statt zweier Rechnungen ----
           Vorher rechneten drei Dinge, die auf einer Linie liegen sollen, gegen
           ZWEI verschiedene Bezugsrahmen: das Badge gegen die Spaltenhoehe
           (top:50% in .rz-naht-anker), die beiden Linkgruppen gegen die
           Fensterhoehe (50dvh). Gleich sind die nur, solange die Spalte exakt
           100dvh hoch ist — sobald eine ueberlaeuft (lange Regalliste,
           zweizeiliger Zustandstext, niedriges Fenster), driften sie.

           Der Wechsel: die Zweiteilung wird auf dem Desktop hoehenfest, die
           Spalten rollen INNERHALB ihrer Haelfte, und die Naht-Aufbauten
           haengen nicht mehr an der Haelfte, sondern am .rz-split. Damit ist
           50dvh per Definition die Mitte derselben Box, gegen die auch das
           Badge misst.

           Warum das Badge dabei nicht mitrollt: .rz-naht-anker wird static,
           der abs. positionierte Aufbau loest sein Containing Block also am
           .rz-split auf — einem VORFAHREN des Rollbereichs. Solche Kinder
           werden vom Rollbereich weder beschnitten noch verschoben.

           Alles hier ist auf :not(.rz-regal-offen) beschraenkt. Im
           aufgeklappten Regal gelten Q2/Q3 unveraendert: dort ist die Haelfte
           wieder position:absolute und das Badge ankert an ihr (left:0). */
        .rz-split:not(.rz-regal-offen){height:100dvh}
        .rz-split:not(.rz-regal-offen)>.rz-half{min-height:0;overflow:auto}
        .rz-split:not(.rz-regal-offen)>.rz-naht-anker{position:static}
        .rz-split:not(.rz-regal-offen) .rz-auf-naht{left:50%}
        /* Q2 · Aufgeklappt bleibt das Regal in SEINER Haelfte. Die Grundregel
           spannt die offene Zone ueber die volle Breite — am Handy richtig
           (die Naht liegt waagerecht), auf dem Desktop faelscht sie das
           Layout: das Regal legte sich ueber beide Spalten. Die Bewegung
           selbst ist dieselbe wie mobil, nur eben rechts. */
        .rz-regal-offen>.rz-half:last-child{left:50%}
        /* Q3 · Die Zone faehrt hoch, der Wegweiser nicht: auf dem Desktop
           markiert er die Naht, und die bleibt in der Mitte stehen. Mobil
           faehrt er weiterhin mit der Kante (D12-2b) — dort IST die Kante
           die Naht. */
        .rz-regal-offen .rz-split .rz-auf-naht,
        .rz-split.rz-regal-offen .rz-auf-naht{top:50dvh}
        /* Q3a · Die Linkgruppen flankieren den Wegweiser, statt am Spaltenfuss
           zu kleben: links endet knapp ueber der Naht, rechts beginnt knapp
           darunter. Die Ueberschriften bleiben, wo sie sind.
           dvh statt Prozent: Prozent-Margins rechnen in einer Spalte gegen die
           BREITE, nicht gegen die Hoehe.
           Seit T2d ist die Haelfte auf dem Desktop IMMER 100dvh hoch (siehe
           oben), 50dvh trifft also dieselbe Linie wie das Badge — der alte
           Vorbehalt "solange der Inhalt nicht ueberlaeuft" ist erledigt.
           Ein Rest bleibt: margin-top:auto verteilt nur FREIEN Raum. Ist der
           obere Block zusammen mit dem Zonenfuss hoeher als 50dvh (sehr
           niedrige Fenster), gibt es keinen freien Raum mehr, die Gruppe
           landet frueher und die Spalte rollt. Fluss-Inhalt laesst sich ohne
           ein Huellelement nicht an eine Fensterposition heften; das steht
           als T2d-2 im Protokoll.
           Im aufgeklappten Regal gilt das alles nicht: dort ordnet die Zone neu. */
        .rz-split:not(.rz-regal-offen)>.rz-half:first-child .rz-fuss{margin-bottom:50dvh}
        .rz-split:not(.rz-regal-offen)>.rz-half:last-child>.rz-zeile,
        .rz-split:not(.rz-regal-offen)>.rz-half:last-child>.rz-regal-reihen{
          margin-top:calc(50dvh - 30px)}
        .rz-split:not(.rz-regal-offen)>.rz-half:last-child>.rz-zeile~.rz-zeile,
        .rz-split:not(.rz-regal-offen)>.rz-half:last-child>.rz-regal-reihen~*{margin-top:0}
      }

      /* ============ D1 · Grundbaustein B — Hairline-Zeile ============
         Serif-Zeile mit Pfeil-Suffix, 1px-Linien statt Karten. Als <button>
         nutzbar (Reset inklusive). Varianten: gedimmt (+ Zustandstext statt
         Pfeil), Fortschrittsbalken 2px, runde Initial-Badge 22px. */
      .rz-zeile{display:flex;justify-content:space-between;align-items:baseline;gap:12px;
                width:100%;box-sizing:border-box;min-height:44px;padding:15px 0;margin:0;
                border:0;border-top:1px solid var(--rz-hairline);background:none;text-align:left;
                font-family:var(--rz-serif);font-size:var(--rz-fs-zeile);font-weight:400;line-height:var(--rz-lh-caps);
                color:inherit;cursor:pointer;border-radius:0}
      .rz-zeile:disabled,.rz-zeile.rz-gedimmt{color:var(--rz-gedimmt);cursor:default}
      /* S93 · HANDLUNG vs. NAVIGATION. Die Hairline-Zeile bleibt die Sprache
         von Navigation und Auswahl (Vorraum, Regal, Wahl-Labels). Eine Zeile,
         die etwas TUT — eine Sitzung beenden, den Raum wechseln, etwas queren
         lassen oder es lassen — bekommt einen eigenen Rahmen: flach, kantig,
         ohne Radius. So gibt sie sich als Knopf zu erkennen, ohne die
         Kanten-Sprache zu verlassen. */
      .rz-knopf-flach{border:1px solid var(--rz-hairline);padding:13px 16px;margin-top:10px}
      .rz-knopf-flach+.rz-knopf-flach{margin-top:8px}
      .rz-tiefgruen .rz-knopf-flach{border-color:var(--rz-hairline-gruen)}
      .rz-knopf-flach:disabled,.rz-knopf-flach.rz-gedimmt{cursor:not-allowed;opacity:.55}
      .rz-zeile .rz-pfeil{flex:none;font-family:var(--rz-sans);font-size:var(--rz-fs-text);color:var(--rz-pfeil)}
      .rz-tiefgruen .rz-zeile{border-top-color:var(--rz-hairline-gruen)}
      .rz-tiefgruen .rz-zeile .rz-pfeil{color:var(--rz-pfeil-auf-gruen)}
      .rz-zeile.rz-unten{border-top:0;border-bottom:1px solid var(--rz-hairline-gruen)}
      /* T2e (Handover Turn 40 §3.4) · --rz-gedimmt traegt auf Papier nur
         2.3:1 und damit keinen Text. Der Zustandstext ("noch gesperrt") ist
         Information, keine Dekoration — er bekommt --rz-sek (4.7:1).
         --rz-gedimmt bleibt fuer rein dekorative Zustaende: die gesperrte
         Zeile selbst, den Platzhalter, die Wortmarke.
         Achtung, gemessene Falle: --rz-sek ist eine PAPIER-Rolle. Auf
         Tiefgruen faellt sie im hellen Theme auf 2.98:1 und waere damit
         schlechter als das, was sie ersetzt (--rz-gedimmt: 6.09:1). Deshalb
         die Gegenregel fuer die gruene Zone — heute steht die einzige
         .rz-zustand-Zeile auf Papier, morgen vielleicht nicht mehr. */
      .rz-zeile .rz-zustand{flex:none;font-family:var(--rz-sans);font-size:var(--rz-fs-caps);color:var(--rz-sek);
                            max-width:38%;text-align:right;line-height:var(--rz-lh-zeile)}
      .rz-tiefgruen .rz-zeile .rz-zustand{color:var(--rz-sek-auf-gruen)}
      .rz-balken{height:2px;background:var(--rz-hairline);margin-top:8px}
      .rz-balken>i{display:block;height:2px;background:var(--rz-akzent-hell)}
      .rz-initial{width:22px;height:22px;flex:none;border-radius:50%;background:var(--rz-akzent);
                  color:var(--rz-akzent-text);font-family:var(--rz-sans);font-size:var(--rz-fs-caps);font-weight:600;
                  display:inline-flex;align-items:center;justify-content:center;align-self:center}
      .rz-caps{font-family:var(--rz-sans);font-size:var(--rz-fs-caps);font-weight:600;letter-spacing:.2em;
               text-transform:uppercase;color:var(--rz-label)}
      .rz-tiefgruen .rz-caps{color:var(--rz-label-auf-gruen)}

      /* ============ D12-2 · Kopf-Signatur, Fussmarke, Wegweiser-Ikon (Turn 27) ============
         Turn 27 raeumt die Etiketten-Dopplung auf: der Kopf traegt auf JEDEM
         Screen die Paar-Signatur (eigener Name zuerst), der Ortsname wandert
         ins Wegweiser-Badge, und die Wortmarke ist Signet am Fuss. Sperrung
         .34em (nicht .2em wie .rz-caps) haelt beide Zeilen auseinander. */
      /* T2e · dieselbe Begruendung wie bei .rz-zustand: die Paar-Signatur
         nennt, wessen Raum das ist — 11px Caps mit .34em Sperrung brauchen
         dafuer mehr als 2.3:1. Die Tiefgruen-Fassung darunter traegt bereits
         5.15:1 und bleibt, wie sie ist. */
      .rz-signatur{font-family:var(--rz-sans);font-size:var(--rz-fs-caps);font-weight:600;letter-spacing:.34em;
                   text-transform:uppercase;color:var(--rz-sek);text-align:center}
      .rz-tiefgruen .rz-signatur{color:var(--rz-sek2-auf-gruen)}
      .rz-fussmarke{display:block;margin-top:28px;text-align:center;
                    font-family:var(--rz-sans);font-size:var(--rz-fs-caps);font-weight:600;letter-spacing:.34em;
                    text-transform:uppercase;color:var(--rz-gedimmt)}
      .rz-tiefgruen .rz-fussmarke{color:var(--rz-marke-auf-gruen)}
      /* Das Wegweiser-Zeichen (Pfosten mit Schild) steht IMMER neben dem
         Badge-Text — auch dort, wo das Badge einen Ortsnamen traegt. */
      .rz-weg-ikon{flex:none;width:9px;height:11px;display:block;color:currentColor}
      /* ---- D12-2d · Bedien-Ecke und Einstellungs-Blatt ---- */
      .rz-ecke{position:fixed;top:calc(18px + env(safe-area-inset-top,0px));
               right:calc(16px + env(safe-area-inset-right,0px));z-index:7;
               display:flex;gap:4px;align-items:flex-start}
      .rz-einst{position:relative;border:0;background:none;margin:0;padding:6px;cursor:pointer;
                line-height:0;min-width:36px;min-height:var(--rz-tapziel);color:var(--rz-marke)}
      .rz-einst span[class^="rz-einst-"]{display:block;margin:auto;line-height:0}
      .rz-einst svg{display:block;margin:auto}
      /* D12-2f · Das Zeichen ist das WECHSELZIEL, nicht der Ist-Zustand: auf
         Hell steht die Seerose (der dunkle Teich), auf Dunkel der Baum. */
      .rz-einst-baum{display:none}
      html[data-theme=dark] .rz-einst-baum{display:block}
      html[data-theme=dark] .rz-einst-seerose{display:none}
      .rz-einst .rz-punkt{position:absolute;top:3px;right:3px;width:6px;height:6px;
                          border-radius:50%;background:var(--rz-akzent)}
      .rz-einst-blatt{position:absolute;top:42px;right:0;width:min(272px,calc(100vw - 32px));
                      background:var(--rz-papier);color:var(--rz-ink);
                      border:1px solid var(--rz-hairline);border-radius:var(--rz-rund-blatt);padding:14px 16px;
                      box-shadow:var(--rz-blatt-schatten);text-align:left}
      html[data-theme=dark] .rz-einst-blatt{background:var(--rz-tiefgruen);color:var(--rz-ink-auf-gruen);
                                            border-color:var(--rz-hairline-gruen)}
      .rz-einst-blatt .rz-caps{margin:0 0 6px}
      .rz-einst-blatt .rz-caps+.rz-caps,.rz-einst-gruppe+.rz-einst-gruppe{margin-top:16px}
      .rz-einst-wahl{display:flex;width:100%;align-items:center;justify-content:space-between;gap:12px;
                     border:0;background:none;padding:8px 0;margin:0;cursor:pointer;text-align:left;
                     font-family:var(--rz-sans);font-size:var(--rz-fs-text);color:inherit;
                     border-bottom:1px solid var(--rz-hairline)}
      html[data-theme=dark] .rz-einst-wahl{border-bottom-color:var(--rz-hairline-gruen)}
      .rz-einst-wahl:last-child{border-bottom:0}
      .rz-einst-wahl .rz-haken{color:var(--rz-akzent-hell);font-size:var(--rz-fs-fein);opacity:0}
      .rz-einst-wahl.an .rz-haken{opacity:1}
      .rz-einst-fuss{font-size:var(--rz-fs-fein);color:var(--rz-sek2);margin:10px 0 0;line-height:var(--rz-lh-fein)}
      html[data-theme=dark] .rz-einst-fuss{color:var(--rz-sek2-auf-gruen)}
      /* Nur auf dem Startscreen steht das Ortsetikett ueber der Betreten-Zeile;
         in den Vorraeumen traegt das Badge den Ort (Turn 27, §1). */
      .rz-caps-ueber{margin-bottom:11px}
      /* Der Sessionname verlaesst den Kopf und wird zur leisen Zeile ueber der
         ersten Nachricht — der Ort steht im Badge, die Session hier. */
      .rz-sessionname{font-family:var(--rz-serif);font-size:var(--rz-fs-text);font-weight:300;
                      color:var(--rz-sek2);margin:0 0 4px}

      /* ============ D1 · Grundbaustein C — Wegweiser-Badge / -Panel ============
         Badge sitzt exakt auf der Naht (rz-auf-naht), Punkt = etwas wartet.
         Panel faltet sich aus der Naht (scaleY + opacity, ~300ms,
         var(--rz-kurve)), ueberdeckt als Overlay, Klick irgendwohin
         schliesst. Inhalt: nur Text, 2–3 Optionen, Serif, Raumnamen kursiv. */
      /* Der Knopf liegt UNTER dem Textpanel: klappt das Panel aus der Mitte
         auf, verschwindet der Knopf dahinter (Tap aufs Panel schliesst). */
      .rz-weg-badge{z-index:3;background:var(--rz-akzent);color:var(--rz-akzent-text);border:0;cursor:pointer;
                    font-family:var(--rz-sans);font-size:var(--rz-fs-caps);font-weight:600;letter-spacing:.16em;
                    text-transform:uppercase;padding:9px 18px;display:flex;align-items:center;gap:8px;
                    border-radius:0;min-height:0}
      .rz-weg-badge .rz-punkt{width:6px;height:6px;border-radius:50%;background:var(--rz-akzent-text);
                              display:none}
      .rz-weg-badge.rz-wartet .rz-punkt{display:block}
      .rz-weg-panel{position:absolute;left:0;right:0;top:0;z-index:4;padding:30px var(--rz-rand);
                    background:var(--rz-papier);color:var(--rz-ink);
                    border-top:1px solid var(--rz-hairline);border-bottom:1px solid var(--rz-hairline);
                    transform:translateY(-50%) scaleY(0);transform-origin:center center;
                    opacity:0;pointer-events:none;
                    transition:transform .3s var(--rz-kurve),opacity .3s var(--rz-kurve)}
      .rz-weg-panel.rz-offen{transform:translateY(-50%) scaleY(1);opacity:1;pointer-events:auto}
      .rz-weg-panel .rz-option{font-family:var(--rz-serif);font-size:var(--rz-fs-zeile);font-weight:300;
                               line-height:var(--rz-lh-fein);margin:0 0 14px}
      .rz-weg-panel .rz-option em{font-style:italic}
      .rz-weg-fuss{font-family:var(--rz-sans);font-size:var(--rz-fs-caps);color:var(--rz-gedimmt);
                   text-align:center;padding-top:8px}
      /* Quick-Lane · Auf dem Desktop liegt die Naht senkrecht in der Mitte.
         Das Panel haengt in der ZWEITEN Haelfte und klappte deshalb nur ueber
         deren Oberkante auf: halbe Breite, falsche Hoehe. Es soll auch hier ein
         Band sein — voller Breite, durch die Mitte.
         200% / -100% statt 100vw / -50vw: Prozente rechnen gegen die Haelfte
         (genau halbe Breite, da beide flex:1 tragen) und bringen keinen
         Scrollbalken mit, wie vw es taete.
         Der Block steht bewusst HINTER der Grundregel — gleiche Spezifitaet,
         also entscheidet die Reihenfolge. */
      @media(min-width:900px){
        .rz-weg-panel{top:50%;right:auto;width:200%;margin-left:-100%}
        /* T2d · im zugeklappten Zustand ankert das Panel am .rz-split und ist
           damit ohnehin schon volle Breite — die 200%/-100%-Kruecke von oben
           wuerde es auf die doppelte Fensterbreite ziehen. */
        .rz-split:not(.rz-regal-offen) .rz-weg-panel{right:0;width:auto;margin-left:0}
      }
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
      .rz-marke{font-family:var(--rz-sans);font-size:var(--rz-fs-caps);font-weight:600;letter-spacing:.16em;
                text-transform:uppercase;color:var(--rz-marke)}
      .rz-h1{font-family:var(--rz-serif);font-size:var(--rz-fs-titel);font-weight:300;line-height:var(--rz-lh-titel);margin:12px 0 0}
      .rz-h2{font-family:var(--rz-serif);font-size:var(--rz-fs-titel);font-weight:300;line-height:var(--rz-lh-sektion);margin:0 0 6px}
      .rz-sub{font-family:var(--rz-sans);font-size:var(--rz-fs-fein);line-height:var(--rz-lh-text);color:var(--rz-sek2);margin:8px 0 0}
      .rz-fuss{margin-top:auto}
      /* T2b (Handover Turn 40 §3.2/§3.6) · Freiraum an der Naht. Das Badge
         ist 32px hoch und sitzt zur Haelfte ueber der Naht; die Naht-Kulisse
         steht per translateY(-100%) ebenfalls in der oberen Zone. Ohne
         Polster laeuft die letzte Hairline-Zeile darunter. Nur die ERSTE
         Haelfte einer Zweiteilung — der Zonenfuss der zweiten Haelfte steht
         am Screenrand, nicht an der Naht. */
      .rz-split>.rz-half:first-child .rz-fuss{padding-bottom:var(--rz-nahtfrei)}
      .rz-still{font-size:var(--rz-fs-fein);margin-top:10px}
      .rz-lz-leiste{display:inline-flex;gap:6px;margin-left:auto}
      .rz-zeile .rz-lz-leiste+.rz-pfeil{margin-left:0}
      .rz-zeile>span:first-child{flex:1}
      /* Theme-Umschalter als leises Glyphen-Paar im Sinne des Kopfes: nur der
         jeweils INAKTIVE Zustand ist sichtbar (= Wechselziel), Beschriftung
         bleibt fuer Screenreader erhalten. */
      /* D12-2f · Die Pillen-Regeln aus D10 sind entfallen. Sie trugen
         font-size:0 (der sichtbare Text war ein ::before-Zeichen) und
         .an{display:none} — beides schlug auf die Zeilen im Einstellungs-Blatt
         durch, das am selben Element haengt: anklickbar, aber unsichtbar.
         .pb-theme bleibt reine Haltemarke fuer die Push-Glocke, ohne Aussehen. */

      /* ============ D3 · Vorraeume als Zwei-Zonen-Layout (Design 17c/d) ============
         Obere Zone: der Raum (Sessions als Zeilen unten an der Zonengrenze).
         Untere Zone: das Regal (Zeilen direkt unter der Grenze, Titel unten
         aussen). Kopf: Zurueck-Pfeil links, Caps-Label zentriert, blinder
         Spiegel-Pfeil rechts. */
      .rz-kopf-mitte{justify-content:space-between}
      .rz-zurueck{border:0;background:none;padding:4px 8px;margin:-4px -8px;cursor:pointer;
                  font-family:var(--rz-sans);font-size:var(--rz-fs-fein);color:var(--rz-marke);min-height:0}
      .rz-tiefgruen .rz-zurueck{color:var(--rz-sek-auf-gruen)}
      .rz-blind{visibility:hidden;cursor:default}
      .rz-intro{margin:4px 0 0;max-width:46ch}
      .rz-tiefgruen .rz-sub{color:var(--rz-sek2-auf-gruen)}
      .rz-still-aus{display:none!important}
      .rz-zeile.rz-spalte{flex-direction:column;align-items:stretch;gap:0}
      .rz-zeile-haupt{display:flex;justify-content:space-between;align-items:baseline;gap:12px}
      .rz-zeile-haupt>span:first-child{flex:1}
      .rz-zeile .rz-balken{margin-top:8px}
      .rz-regal-reihen{display:flex;flex-direction:column}
      .rz-regal-inhalt{font-size:var(--rz-fs-fein);padding:12px 0;border-bottom:1px solid var(--rz-hairline-gruen)}
      .rz-regal-inhalt .pb-item{border-bottom:1px solid var(--rz-hairline-gruen);font-size:var(--rz-fs-fein)}
      .rz-eine-zone{display:flex;flex-direction:column}
      .rz-eine-zone .rz-half{flex:1;padding-top:calc(30px + env(safe-area-inset-top,0px));
                             padding-bottom:calc(34px + env(safe-area-inset-bottom,0px))}
      .rz-eine-zone #boxMess{margin-top:18px;font-size:var(--rz-fs-fein)}

      /* ============ D4 · Chat ohne Blasen (Design 17e) ============
         Begleitung: Serif 17/300 links (Label als leise Caps-Marke beim
         Rollenwechsel), Nutzerin: Sans 14.5 rechtsbuendig in Dunkelgruen.
         Composer als Hairline-Zeile mit kursivem Serif-Platzhalter,
         Send-Quadrat 34x34. Desktop: ruhige 640px-Mittelspalte. */
      .rz-app #scrChat{max-width:none;margin:0;background:var(--rz-papier);color:var(--rz-ink);
        min-height:100dvh;padding:calc(30px + env(safe-area-inset-top,0px)) var(--rz-rand)
        calc(var(--rz-rand) + env(safe-area-inset-bottom,0px))}
      .rz-chat-innen{max-width:640px;margin:0 auto;display:flex;flex-direction:column;min-height:calc(100dvh - 60px)}
      #scrChat .pb-msgs{gap:22px;flex:1}
      /* T2g (Handover Turn 40 §3.8) · Die Sprecher-Marke hing mit
         margin-bottom:-17px gegen den gap:22px der Nachrichtenliste — zwei
         Zahlen, die sich gegenseitig voraussetzen. Aendert sich der Gap,
         klebt das Label an der Nachricht oder schwebt. Jetzt stehen Label und
         Antwort in einem eigenen Behaelter OHNE Gap; der Abstand ist eine
         Rasterstufe statt einer Differenzrechnung.
         Die max-width wandert an die Gruppe — bliebe sie zusaetzlich an der
         Nachricht, waeren es 88% von 88%. */
      #scrChat .rz-sprecher{font-family:var(--rz-sans);font-size:var(--rz-fs-caps);font-weight:600;
        letter-spacing:.16em;text-transform:uppercase;color:var(--rz-sek2);margin-bottom:var(--rz-r-1)}
      #scrChat .rz-sprechgruppe{display:flex;flex-direction:column;align-self:flex-start;max-width:88%}
      #scrChat .rz-sprechgruppe .pb-msg.ai{max-width:none}
      #scrChat .pb-msg{background:none;border:0;border-radius:0;padding:0;backdrop-filter:none;-webkit-backdrop-filter:none}
      #scrChat .pb-msg.ai{font-family:var(--rz-serif);font-size:var(--rz-fs-zeile);font-weight:300;line-height:var(--rz-lh-fein);
        align-self:flex-start;max-width:88%;color:var(--rz-ink)}
      #scrChat .pb-msg.me{font-family:var(--rz-sans);font-size:var(--rz-fs-text);line-height:var(--rz-lh-text);
        align-self:flex-end;max-width:82%;text-align:right;color:var(--rz-nutzer)}
      #scrChat .pb-composer{border-top:1px solid var(--rz-hairline);padding-top:16px;margin-top:24px;align-items:center}
      #scrChat .pb-composer textarea{border:0;background:none;border-radius:0;padding:6px 0;
        font-family:var(--rz-serif);color:var(--rz-ink)}
      #scrChat .pb-composer textarea::placeholder{font-style:italic;color:var(--rz-gedimmt)}
      /* T2f (Handover Turn 40 §3.8) · Sende-Knopf und Mikrofon ueberschrieben die
         44px aus .pb-btn auf 34px — ausgerechnet die meistbenutzte Aktion der
         App lag damit unter dem Mindest-Tapziel. Trefferflaeche jetzt 44px,
         das sichtbare Akzent-Quadrat bleibt 34px: 5px Polster plus
         background-clip:content-box faerben nur den Inhaltskasten
         (44 - 2*5 = 34). Die 5px sind ein ABGELEITETER Wert, keine
         Rasterstufe — sie ergeben sich aus der Differenz beider Masse. */
      #scrChat #btnMic{border:0;background:none;color:var(--rz-akzent-hell);padding:0 6px;
        min-height:var(--rz-tapziel-finger)}
      #scrChat #btnMic svg{stroke-width:1.6}
      #scrChat #btnSend{width:var(--rz-tapziel-finger);height:var(--rz-tapziel-finger);
        min-height:var(--rz-tapziel-finger);padding:5px;box-sizing:border-box;border:0;border-radius:0;
        background:var(--rz-akzent-hell);background-clip:content-box;
        color:var(--rz-papier);display:inline-flex;align-items:center;justify-content:center}
      /* T2j · Die Echo-Pille (S44) war als kompletter Inline-Style in
         chat-kern.js gesetzt — mit den rohen Werten 12px und 999px an genau
         der Stelle, die der T1b-Waechter nicht las. 12px ist keine Stufe der
         Skala (Nachbarn: 11 und 13), 999px gibt es als --rz-rund-pille.
         Bewusst .rz-echo und nicht .pb-echo: die Klasse .pb-echo tragen auch
         die Leseansicht und der Auswahl-Screen, wo sie heute UNGESTYLT ist —
         eine Regel darauf waere eine stille Aenderung an zwei fremden Orten. */
      #scrChat .rz-echo{align-self:flex-end;font-family:var(--rz-sans);font-size:var(--rz-fs-caps);
        color:var(--rz-sek2);background:var(--rz-karte);border:1px solid var(--rz-karte-rand);
        border-radius:var(--rz-rund-pille);padding:var(--rz-r-1) var(--rz-r-3);max-width:82%}
      #scrChat .rz-panel{border-top:1px solid var(--rz-hairline);border-bottom:1px solid var(--rz-hairline);
        padding:14px 0;margin:10px 0;font-size:var(--rz-fs-fein)}
      #scrChat .pb-skala{background:none;border:1px solid var(--rz-hairline);border-radius:0}
      #scrChat #btnChatEnde{font-size:var(--rz-fs-text);margin-top:6px}
      /* ---- D12-2b (Turn 27, 27e) · der Chat bekommt dieselbe Grammatik wie
         die uebrigen Screens: oben der Verlauf, unten die Schreibkante als
         eigene Zone, dazwischen die Naht mit dem Wegweiser-Badge. Das Badge
         ist hier eine MARKE, kein Knopf — es nennt den Ort, es oeffnet nichts. */
      #scrChat .rz-chat-oben{flex:1;display:flex;flex-direction:column;min-height:0;padding:0}
      #scrChat .rz-chat-unten{flex:none;position:relative;background:var(--rz-tiefgruen);
        margin:var(--rz-r-5) calc(-1 * var(--rz-rand))
               calc(-1 * var(--rz-rand) - env(safe-area-inset-bottom,0px));
        padding:40px var(--rz-rand) calc(22px + env(safe-area-inset-bottom,0px));
        display:flex;flex-direction:column}
      #scrChat .rz-chat-unten .pb-composer{margin-top:0;border-top:0;padding-top:0}
      #scrChat .rz-chat-unten .rz-weg-badge{cursor:default}
      /* ---- D12-2c · der gemeinsame Chat traegt die Toene seines Raums ----
         Die Zonen bekommen dieselben Klassen wie in den Vorraeumen; damit
         greifen alle bestehenden Regeln (.rz-tiefgruen .rz-zurueck, .rz-sub,
         .rz-signatur, .rz-fussmarke, .rz-knopf-flach ...) ohne Doppelpflege.
         Nur die Flaechen und die Ausnahmen des Chats stehen hier. */
      /* D12-2e · Die Aufteilung ist ueberall dieselbe: OBEN hell, UNTEN das
         Regal — hell im eigenen Raum, dunkel im gemeinsamen. Der gemeinsame
         Raum faerbt also nicht den ganzen Schirm ein; oben bleibt Papier,
         damit Qualitaetszeit und Gespraech dort lesbar auf hellem Grund
         stehen. Die Naht darf wandern, die Farben nicht. */
      #scrChat .rz-chat-oben.rz-papier{background:transparent}
      #scrChat .rz-chat-unten{color:var(--rz-ink2-auf-gruen)}
      #scrChat .rz-tiefgruen .pb-composer textarea{color:var(--rz-ink-auf-gruen)}
      #scrChat .rz-tiefgruen .pb-composer textarea::placeholder{color:var(--rz-sek2-auf-gruen)}
      #scrChat .rz-tiefgruen .pb-skala{border-color:var(--rz-hairline-gruen)}
      #scrChat .rz-tiefgruen .rz-panel{border-color:var(--rz-hairline-gruen)}
      #scrChat .rz-tiefgruen .rz-pfeil{color:var(--rz-pfeil-auf-gruen)}
      #scrChat .rz-chat-unten #btnSend{color:var(--rz-tiefgruen)}
      html[data-theme=dark] #scrChat #btnSend{color:var(--rz-tiefgruen)}

      /* ============ D5 · Teilen-Flow (Design 17f) ============
         Die Freigabe-Vorschau zeigt EXAKT den Text, der im Regal ankommt:
         Tiefgruen-Block mit Von-Zeile, typografische Anfuehrung per CSS
         (keine Textaenderung). Wahl-Labels und Aktionen als Hairline-Zeilen. */
      .rz-teilen-block{background:var(--rz-tiefgruen);color:var(--rz-ink-auf-gruen);
        padding:18px 20px;margin:12px 0}
      .rz-teilen-block .rz-von{color:var(--rz-label-auf-gruen);margin-bottom:8px}
      .rz-teilen-text{font-family:var(--rz-serif);font-size:var(--rz-fs-zeile);font-weight:300;
        line-height:var(--rz-lh-fein);margin:0}
      .rz-teilen-text::before{content:'„'}
      .rz-teilen-text::after{content:'“'}
      .rz-wahl{display:block;font-size:var(--rz-fs-fein);margin:0;padding:10px 0;
        border-top:1px solid var(--rz-hairline)}
      .rz-von .rz-initial{width:18px;height:18px;font-size:var(--rz-fs-caps);vertical-align:middle}
      .rz-regal-eintrag .rz-von{margin-bottom:4px}
      .rz-regal-text{font-family:var(--rz-serif);font-size:var(--rz-fs-text);font-weight:300;line-height:var(--rz-lh-fein)}

      /* ============ D8 · Sprachwechsel als Eckknopf + Aufwaerts-Dialog ============
         Kleiner DE/EN-Wechsler unten rechts; der Dialog faehrt von unten
         herein. Der Knopf bleibt UEBER dem Dialog liegen, damit derselbe
         Tap wieder schliesst. Der Vorgang selbst (Paarsprache: vorschlagen,
         bestaetigen, zuruecknehmen) ist unveraendert. */
      #psZeile.rz-sprachecke{position:fixed;z-index:30;margin:0;
        right:calc(18px + env(safe-area-inset-right,0px));
        bottom:calc(18px + env(safe-area-inset-bottom,0px));
        display:flex;align-items:center;gap:8px}
      .rz-sprach-hinweis{font-family:var(--rz-sans);font-size:var(--rz-fs-caps);color:var(--rz-sek2);
        max-width:16ch;text-align:right;line-height:var(--rz-lh-zeile)}
      .rz-sprachknopf{border:1px solid var(--rz-hairline);background:var(--rz-papier);
        color:var(--rz-gedimmt);cursor:pointer;border-radius:0;padding:6px 10px;min-height:0;
        font-family:var(--rz-sans);font-size:var(--rz-fs-caps);font-weight:600;letter-spacing:.1em;
        display:inline-flex;align-items:center;gap:5px}
      .rz-sprachknopf .an{color:var(--rz-akzent-hell)}
      .rz-sprachknopf .rz-punkt{width:5px;height:5px;border-radius:50%;background:var(--rz-akzent)}
      #boxPaarsprache.rz-sprachdialog{position:fixed;left:0;right:0;bottom:0;z-index:25;
        display:block;margin:0;border:0;border-top:1px solid var(--rz-hairline);border-radius:0;
        background:var(--rz-papier);color:var(--rz-ink);font-size:var(--rz-fs-fein);
        padding:22px 24px calc(64px + env(safe-area-inset-bottom,0px));
        transform:translateY(100%);opacity:0;pointer-events:none;
        transition:transform .3s var(--rz-kurve),opacity .3s var(--rz-kurve)}
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
      /* T2c (Handover Turn 40 §3.1) · Hoehenbudget der oberen Zone.
         Gemessen bei 390px Breite braucht der Inhalt der oberen Vorraum-Zone
         397px; bei flex:1 auf beiden Haelften traegt das erst ab ~800px
         Screenhoehe. Auf 667-740px hohen Geraeten laufen die Zeilen sonst in
         die Naht und unter das Badge.
         min-height:0 steht hier NIE allein: allein schrumpft die Zone still
         unter ihren Inhalt, margin-top:auto verliert seinen Spielraum und die
         letzte Zeile wandert erst recht ueber die Naht. Erst zusammen mit
         overflow entsteht ein Rollbereich.
         Die Einschraenkung auf :not(.rz-regal-offen) laesst die Regal-Mechanik
         (D9/D12-2b) unberuehrt: dort bleibt overflow:hidden richtig, weil die
         Zone auf ihr gemessenes Mass festgesetzt wird.
         Der Zonenfuss liegt INNERHALB des Rollbereichs — sein T2b-Polster
         haelt den Badge-Abstand deshalb auch am Rollende. */
      .rz-split:not(.rz-regal-offen)>.rz-half:first-child{
        min-height:0;overflow:auto;overscroll-behavior:contain}
      .rz-regal-reihen{display:flex;flex-direction:column;min-height:0}
      .rz-fuss-kopf{display:flex;align-items:baseline;justify-content:space-between;gap:12px}
      /* ---- D12-2b (Turn 27) · die geklickte Zeile IST die Sektion ----
         D9 hatte den Weg nach oben an die Zonen-Ueberschrift gehaengt und der
         offenen Zeile den Pfeil genommen. Turn 27 dreht das um: aufgeklappt
         verschwinden Zonentitel und Geschwisterzeilen, und die geklickte Zeile
         steht als Ueberschrift oben — mit ihrem Pfeil, jetzt nach oben. */
      .rz-regal-offen .rz-zeile[data-box]:not(.rz-auf){display:none}
      .rz-regal-offen .rz-zeile.rz-auf{border:0;padding:0;font-family:var(--rz-serif);
        font-size:var(--rz-fs-sektion);font-weight:300;line-height:var(--rz-lh-sektion);align-items:baseline}
      .rz-regal-offen .rz-zeile.rz-auf .rz-pfeil{font-size:var(--rz-fs-fein)}
      .rz-regal-offen{position:relative;height:100dvh;overflow:hidden}
      /* Der obere Teil bleibt EXAKT stehen: statt ihn vom Flex-Layout neu
         verteilen zu lassen, wird er auf sein gemessenes Mass festgesetzt.
         Die Regal-Zone legt sich als Flaeche darueber — von unterhalb des
         Kopfes ("Raum fuer uns") bis zur Unterkante. */
      .rz-regal-offen>.rz-half:first-child{position:absolute;top:0;left:0;right:0;height:var(--rz-oben-h,50%)}
      .rz-regal-offen>.rz-half:last-child{position:absolute;left:0;right:0;bottom:0;
        top:var(--rz-regal-top,0px);z-index:2}
      .rz-half{transition:transform .36s var(--rz-kurve)}
      /* D12-2b · Der Wegweiser blendet NICHT mehr ab: er haengt per rz-auf-naht
         an der Oberkante der Regal-Zone und faehrt mit ihr nach oben, bis er
         unter der Kopfzeile sitzt. Nur die Kulisse tritt ab — sie haengt am
         Zonenfuss, der gerade unterwegs ist. */
      .rz-regal-offen .rz-kulisse-fuss{opacity:0;pointer-events:none;transition:opacity .2s ease}
      .rz-regal-offen .rz-weg-badge{z-index:6}
      .rz-regal-offen>.rz-half:last-child .rz-fuss{display:none}
      .rz-regal-offen .rz-regal-inhalt:not(.pb-hidden){animation:rzEinblenden .28s .08s both}
      .rz-regal-offen .rz-regal-reihen{flex:1 1 auto}
      /* Akkordeon: der Inhalt waechst aus dem Trennstrich unter seiner Zeile
         hervor — freigelegt per clip-path, ohne den Text zu verzerren. */
      .rz-regal-inhalt:not(.pb-hidden){animation:rzAufklappen .32s var(--rz-kurve) both}
      .rz-regal-offen .rz-regal-inhalt:not(.pb-hidden){
        flex:1 1 auto;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;border-bottom:0}
      @keyframes rzAufklappen{
        from{clip-path:inset(0 0 100% 0);opacity:.4}
        to{clip-path:inset(0 0 0 0);opacity:1}}
      @keyframes rzEinblenden{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
      /* Die Erklaerzeile am Fuss des offenen Kastens (regal.intro): leise,
         ueber einer Hairline, unter den Eintraegen. */
      .rz-regal-fussnote{border-top:1px solid var(--rz-hairline-gruen);padding-top:14px;margin-top:18px}
      @media(prefers-reduced-motion:reduce){
        .rz-half{transition:none}
        .rz-regal-inhalt:not(.pb-hidden){animation:none}
      }

      /* ============ D6 · Kulisse — ortsgebunden, leise, wachsend ============
         Start: auf der Naht (hell: Baeume ragen darueber, dunkel: Teich
         darunter). Vorraeume: unten in der Regal-Zone. Chat: keine. Eigener
         Clipping-Halter, nie klickbar, statisch (reduced-motion-fest). */
      .rz-kulisse-naht,.rz-kulisse-fuss{position:absolute;left:0;right:0;height:84px;
        overflow:hidden;pointer-events:none;color:var(--rz-akzent-hell)}
      /* D11a · Beide Fassungen sitzen gleich: der Teich steht dort, wo auch
         die Baeume stehen — ueber der Naht, nicht darunter. */
      .rz-kulisse-naht{top:0;transform:translateY(-100%)}
      .rz-kulisse-fuss{bottom:0}
      .rz-kulisse-naht svg,.rz-kulisse-fuss svg{position:absolute;bottom:0;left:0;width:100%;height:100%}
      /* T1a/F2 · Die Fassung folgt dem UNTERGRUND, nicht dem Theme.
         Naht-Kulissen stehen auf Papier — dort sind Theme und Untergrund
         dasselbe, die Theme-Bindung stimmt. Fuss-Kulissen stehen IM Tiefgruen,
         das in beiden Themes dunkel ist: dort gilt immer der Teich. Vorher
         standen im gemeinsamen Vorraum dunkle Baumsilhouetten (Deckkraft
         <= .22) auf fast schwarzem Grund — unsichtbar, seit D6. */
      .rz-kulisse-dunkel{display:none}
      html[data-theme=dark] .rz-kulisse-hell{display:none}
      html[data-theme=dark] .rz-kulisse-dunkel{display:block}
      .rz-kulisse-fuss .rz-kulisse-hell{display:none}
      .rz-kulisse-fuss .rz-kulisse-dunkel{display:block}
    `;

/* D6 · Die alte fixe Hintergrund-Kulisse ist Geschichte — die Kulisse
   lebt jetzt ortsgebunden in den Screens (core/ui/kulisse.js).
   D10 · Der Ansicht-Umschalter steckte in ebenjenem Block und ging dabei
   verloren. Er lebt jetzt eigenstaendig: eine kleine feste Gruppe oben
   rechts, in der CSS nur das WECHSELZIEL zeigt (Sonne bzw. Mond). Sie ist
   ausserdem der Wirt fuer die Push-Glocke (M7a, client.js sucht .pb-theme). */

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

/** Feste Bedien-Ecke oben rechts: Ansicht hell/dunkel (+ Push-Glocke). */
/* D12-2d · Die Bedien-Ecke traegt jetzt EIN Zeichen: Baum bei Hell, Seerose
   bei Dunkel — dieselbe Paarung wie Kulisse und .pb-baeume/.pb-seerosen. Der
   Punkt am Zeichen zeigt einen offenen Sprachantrag des Partners; ohne ihn
   waere ein Antrag hinter dem geschlossenen Blatt unsichtbar.
   Die Klasse .rz-ecke ist zugleich der Wirt fuer die Push-Glocke (M7a). */
export const CHROME_HTML = String.raw`<div class="rz-ecke pb-theme" role="group">
      <button id="pbEinst" class="rz-einst" type="button" aria-haspopup="dialog" aria-expanded="false">
        <span class="rz-einst-baum">${zeichen("baum", { groesse: 20 })}</span>
        <span class="rz-einst-seerose">${zeichen("bluete", { groesse: 20 })}</span>
        <span class="rz-punkt pb-hidden" id="pbEinstPunkt"></span>
      </button>
      <div class="rz-einst-blatt pb-hidden" id="pbEinstBlatt" role="dialog"></div>
    </div>`;

export function applyDesign(doc) {
  // D12-2d · Der Waechter galt frueher fuer die GANZE Funktion. Das war
  // brauchbar, solange nur das Stylesheet daranhing — aber die Bedien-Ecke
  // lebt im Body, und wer den Body neu baut (Hüllenwechsel, Relaunch), stand
  // ohne Ecke da, weil das Stylesheet im Head ueberlebt hatte. Jetzt wacht
  // jeder Teil ueber sich selbst.
  if (!doc.getElementById("pbDesign")) {
    // Standalone-Haken (M3): CSS kann per html[data-standalone] reagieren —
    // z. B. künftige Installations-Hinweise ausblenden, wenn schon installiert.
    if (istStandalone(doc.defaultView)) doc.documentElement.setAttribute("data-standalone", "1");
    doc.documentElement.setAttribute("data-vollbild", "1");   // D8: randlos, egal welche Huelle
    const st = doc.createElement("style");
    st.id = "pbDesign";
    st.textContent = DESIGN_CSS;
    doc.head.appendChild(st);
  }
  // D10 · Bedien-Ecke anlegen, falls die Huelle sie nicht mitbringt.
  if (!doc.getElementById("pbEinst") && doc.body) {
    const halter = doc.createElement("div");
    halter.innerHTML = CHROME_HTML;
    while (halter.firstChild) doc.body.appendChild(halter.firstChild);
  }
  const e = doc.getElementById("pbEinst");
  if (e) e.setAttribute("aria-label", uiText("einst.titel"));
  setzeAnsicht(doc, gemerkteAnsicht());
}

/* ---- D12-2d · Ansicht: Hell, Dunkel oder Automatisch --------------------
   "Automatisch" folgt prefers-color-scheme und HOERT MIT: wer die Systemwahl
   im Betrieb umstellt (Nachtmodus nach Zeitplan), soll nicht neu laden
   muessen. Der Zuhoerer haengt genau einmal am Dokument. */
const ANSICHT_SPEICHER = "pb.ansicht";
let systemZuhoerer = null;

export function gemerkteAnsicht() {
  try {
    const v = globalThis.localStorage && globalThis.localStorage.getItem(ANSICHT_SPEICHER);
    return v === "light" || v === "dark" || v === "auto" ? v : "auto";
  } catch { return "auto"; }
}

export function merkeAnsicht(wahl) {
  try { globalThis.localStorage && globalThis.localStorage.setItem(ANSICHT_SPEICHER, wahl); }
  catch { /* z. B. Safari privat */ }
}

function systemDunkel() {
  try { return !!(globalThis.matchMedia && globalThis.matchMedia("(prefers-color-scheme: dark)").matches); }
  catch { return false; }
}

export function setzeAnsicht(doc, wahl) {
  const w = wahl === "light" || wahl === "dark" ? wahl : "auto";
  const dunkel = w === "auto" ? systemDunkel() : w === "dark";
  doc.documentElement.setAttribute("data-theme", dunkel ? "dark" : "light");
  doc.documentElement.setAttribute("data-ansicht", w);
  if (w === "auto" && !systemZuhoerer && globalThis.matchMedia) {
    try {
      const mq = globalThis.matchMedia("(prefers-color-scheme: dark)");
      systemZuhoerer = () => {
        if (doc.documentElement.getAttribute("data-ansicht") === "auto") setzeAnsicht(doc, "auto");
      };
      mq.addEventListener ? mq.addEventListener("change", systemZuhoerer) : mq.addListener(systemZuhoerer);
    } catch { systemZuhoerer = null; }
  }
  return w;
}
