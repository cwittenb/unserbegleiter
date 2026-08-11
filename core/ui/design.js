import { t as uiText } from "../i18n/index.js";
import { THEME_CSS, SCHRIFT_IMPORT } from "./theme.js";
import { zeichen } from "./kulisse.js";
// Design auf Dokument-Ebene: <style> + Kulisse + Theme-Umschalter, einmalig
// beim Booten angewendet (idempotent), damit ALLE Screens dasselbe Theme tragen.

// Mobile-Haertung (M3), im CSS bewusst unkommentiert (i18n-Kanarie scannt das
// Literal): Textfelder nie unter 16px (iOS-Fokus-Zoom), Composer haelt per
// scroll-margin Abstand zur Tastatur, Haupt-Aktionen min. 44px Touch-Hoehe,
// Safe-Area-Insets an #app und fixiertem Chrome (Theme/Busy).
export const DESIGN_CSS = String.raw`      ${SCHRIFT_IMPORT}
`
  + THEME_CSS
  + String.raw`      html{height:100%}
      /* S121.6 · Platz fuer die Bildlaufleiste dauerhaft reservieren. Seit
         S121.1 rollt das Dokument, und mit dem Akkordeon aendert sich die
         Seitenlaenge bei jedem Oeffnen: Die Leiste kaeme und ginge, und der
         ganze Inhalt spraenge um ihre Breite hin und her. Auf Systemen mit
         ueberlagerten Leisten (macOS, iOS) aendert sich nichts. */
      /* ============ S122 · box-sizing global ============
         Bis hierher gab es keine allgemeine Regel; sie stand punktuell an
         einzelnen Flaechen. Wo sie fehlte, wurde ein Kasten stillschweigend
         groesser als gedacht: Hoehe UND Polster ergaben zusammen mehr als das
         Mass, das in der Regel steht. Genau so entstand der 54px-Ueberhang des
         Chats (S119.3) — 100dvh Inhaltshoehe plus 30px Kopf- und 24px
         Fusspolster, und das Dokument lief ueber.
         Die Kanarie aus S119.3 faengt diesen Fehlertyp bereits ab (Hoehe plus
         Polster ohne border-box faellt auf). Sie bleibt: Sie schuetzt die
         Absicht, diese Regel schuetzt die Umsetzung.
         Die punktuellen Setzungen bleiben stehen. Sie sind jetzt redundant,
         aber sie DOKUMENTIEREN an Ort und Stelle, dass dort mit Hoehe und
         Polster zugleich gerechnet wird — und sie zu entfernen waere ein
         zweiter Eingriff mit eigenem Risiko in demselben Schritt. */
      *,*::before,*::after{box-sizing:border-box}
      html{scrollbar-gutter:stable}
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
      /* S114.13 · Ohne Radius ist das kein Pillen-Polster mehr, sondern das
         enge Mass eines Zeilen-Knopfes. Der Name bleibt (er steht an ~8
         Aufrufstellen), die Gestalt folgt .pb-btn. */
      .rz-pille-eng{padding:6px 10px;min-height:0}
      .rz-rechts-pille{padding:2px var(--rz-r-2);min-height:0;float:right}
      .rz-reihe-verteilt{display:flex;justify-content:space-between}
      .rz-reihe-umbruch{display:flex;gap:var(--rz-r-3);flex-wrap:wrap}
      .rz-flex-spalte{flex:1;min-width:150px}
      /* S114.14 · Die Wahl-Karten ("Womit moechtet ihr ankommen?") sind
         AUSWAHL, nicht Handlung — nach S93 also die Sprache der Haarlinie.
         Sie erben von .pb-btn (kein Radius mehr) und tauschen den Rahmen
         gegen eine Trennlinie; die letzte Karte schliesst den Block ab. */
      .rz-blockknopf,.rz-blockknopf-leise{display:block;width:100%;text-align:left;
        border:0;border-top:1px solid var(--rz-hairline);padding:15px 0;margin:0}
      .rz-blockknopf-leise{opacity:.85;border-bottom:1px solid var(--rz-hairline)}
      .rz-blockknopf:hover,.rz-blockknopf-leise:hover{background:none;color:var(--rz-akzent-ink)}
      .rz-tiefgruen .rz-blockknopf,.rz-tiefgruen .rz-blockknopf-leise{border-color:var(--rz-hairline-gruen)}
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
      /* S114.13 · Die Karte behaelt ihre Flaeche (sie hebt die Aufdeck-Tafel
         und das Hinweisblatt vom Grund ab), verliert aber Radius und Weichzeichner
         — beides stammt aus der Zeit vor der Themeengine und liest sich neben
         den Haarlinien wie ein Fremdkoerper. */
      .pb-card{background:var(--rz-flaeche-hoch);border:1px solid var(--rz-hairline);border-radius:0;padding:20px 22px;margin:16px 0}
      /* ---- S114.13 · Die Pille ist fort ----
         .pb-btn war der letzte Ort mit der Optik VOR der Themeengine: Pille
         mit vollem Radius, Akzentrahmen, bei .primary eine gefuellte Flaeche.
         Sie sass in der Agenda, im Regal, in den Kapitel-Panels, an den
         Auswahl-Karten der Sessions und im Kernwetten-Werkzeug — also
         ausgerechnet dort, wo die Oberflaeche sonst in Haarlinien spricht.
         Die Regel wird an EINER Stelle umgeschrieben statt an ~40
         Aufrufstellen: dieselbe Klasse, neue Gestalt (S93-Grammatik).
         RAHMEN = HANDLUNG: flach, kantig, ohne Radius — wie .rz-knopf-flach.
         .primary betont ueber die KANTE (Akzent), nicht ueber die Flaeche;
         eine gefuellte Flaeche waere in einer Oberflaeche aus Linien der
         lauteste Ton ueberhaupt. */
      .pb-btn{display:inline-block;border:1px solid var(--rz-hairline);background:transparent;color:inherit;
              border-radius:0;padding:12px 16px;font-family:inherit;font-size:var(--rz-fs-text);cursor:pointer;
              margin:var(--rz-r-2) var(--rz-r-2) 0 0;transition:background .22s,border-color .22s}
      .pb-btn:hover{background:var(--rz-flaeche-hoch)}
      .pb-btn.primary{border-color:var(--rz-akzent);color:var(--rz-akzent-ink)}
      .pb-btn.primary:hover{background:var(--rz-flaeche-hoch)}
      .pb-btn[disabled]{opacity:.45;cursor:not-allowed}
      .pb-btn[disabled]:hover{background:transparent}
      /* In der gruenen Zone traegt die Haarlinie ihren eigenen Ton (T2e). */
      .rz-tiefgruen .pb-btn{border-color:var(--rz-hairline-gruen)}
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
      /* S114.13 · Karten-Rand → Haarlinie, und das Tapziel der Zeile (44px)
         gilt auch hier: Eintraege tragen Knoepfe. */
      .pb-item{border-bottom:1px solid var(--rz-hairline);padding:var(--rz-r-4) 0;font-size:var(--rz-fs-text)}
      .rz-tiefgruen .pb-item{border-bottom-color:var(--rz-hairline-gruen)}
      .pb-busydots{display:inline-flex;gap:4px;align-items:center}
      .pb-busydots span{width:6px;height:6px;border-radius:50%;background:var(--rz-sek2);animation:pbBlink 1.2s infinite}
      .pb-busydots span:nth-child(2){animation-delay:.2s}.pb-busydots span:nth-child(3){animation-delay:.4s}
      .pb-busy{position:fixed;top:calc(18px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);z-index:7;display:flex;gap:9px;align-items:center;
               background:var(--rz-karte);border:1px solid var(--rz-karte-rand);border-radius:var(--rz-rund-pille);padding:7px 16px;font-size:var(--rz-fs-fein);
               color:var(--rz-sek);backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px)}
      .pb-zwei{display:grid;grid-template-columns:1fr 1fr;gap:0 14px;align-items:stretch}
      /* T3a · Die Aufdeck-Tafel (S62) haengt als Karte im Nachrichtenfluss und
         soll dort die volle Spaltenbreite nehmen, statt der 88%-Begrenzung der
         Nachrichten zu folgen. Das stand bis T2 als Inline-Style in panels.js —
         zwei Layout-Werte, die niemand im Stylesheet gesucht haette. */
      .pb-tafel{align-self:stretch;max-width:none}
      .pb-zwei .pb-card{display:flex;flex-direction:column;gap:6px}
      @media(max-width:540px){.pb-zwei{grid-template-columns:1fr}}
      .pb-gruppe{margin:14px 0 2px}
      .pb-gruppe>.pb-sub{display:block;margin-bottom:2px}
      .pb-weg .pb-item{border-bottom:0;padding:5px 0;font-size:var(--rz-fs-fein);color:var(--rz-sek)}
      /* U8.3 (K3a) · EIN Inline-Link-Stil, nicht zwei. Die gepunktete Linie in
         Fliesstextfarbe war keine Tuer, sondern eine Andeutung — im Regal
         ("Das ganze Gespraech lesen") las sie sich wie kursiver Text. Jetzt
         durchgezogen, in Akzentfarbe, eine Spur fester im Gewicht. Die Regel
         gilt an allen sechs Stellen; ein zweiter Link-Stil daneben haette nur
         die Frage aufgeworfen, welcher wann gilt. */
      .pb-link{cursor:pointer;color:var(--rz-link);font-weight:500;
               text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:3px}
      .pb-link:hover{text-decoration-thickness:2px}
      .rz-tiefgruen .pb-link{color:var(--rz-link-auf-gruen)}
      /* Der leise Zwilling (Loeschen, Nebenwege) bleibt leise: dieselbe Linie,
         aber Sekundaerfarbe — sonst haetten Haupt- und Nebenweg dasselbe
         Gewicht und die Zeile bekaeme zwei gleich laute Angebote. */
      .pb-link.rz-klein-leise{color:var(--rz-sek);font-weight:400}
      .rz-tiefgruen .pb-link.rz-klein-leise{color:var(--rz-sek-auf-gruen);font-weight:400}
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
      /* S114.13 · Die Agenda war eine Kartensammlung in einem Regal aus
         Haarlinien — Kasten im Kasten, mit Radius, Flaeche und einer 4px-Kante
         an der Ziel-Gruppe. Jetzt gliedern Ueberschriften, nicht Rahmen: der
         Gruppenkopf spricht die Caps-Sprache des Regals, die Eintraege sind
         Zeilen. Die Ziel-Gruppe braucht keine Sonderkante mehr — sie steht
         ohnehin zuerst und traegt ihren Namen. */
      .pb-ag-block{border:0;border-radius:0;padding:0;margin-top:var(--rz-r-5);background:none}
      .pb-ag-kopf{font-family:var(--rz-sans);font-size:var(--rz-fs-caps);font-weight:600;letter-spacing:.2em;
                  text-transform:uppercase;color:var(--rz-label)}
      .rz-tiefgruen .pb-ag-kopf{color:var(--rz-label-auf-gruen)}
      /* Der Rangfolge-Platz bleibt greifbar (cursor:grab), verliert aber die
         Kartenform: eine Zeile mit Haarlinie, gewaehlt an der Kante markiert. */
      .pb-platz{border:0;border-bottom:1px solid var(--rz-hairline);border-radius:0;
                padding:var(--rz-r-3) 0;margin:0;cursor:grab}
      .pb-platz.leer{border-bottom-style:dashed;color:var(--rz-sek2);cursor:default}
      .pb-platz.gewaehlt{box-shadow:inset 2px 0 0 var(--rz-akzent);padding-left:var(--rz-r-3)}
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
      .rz-auf-naht{position:absolute;left:50%;top:0;transform:translate(-50%,-50%);z-index:9}
      @media(min-width:900px){
        .rz-split{flex-direction:row;position:relative}
        /* S121.1 (Turn 48 §2.2) · Die Naht haengt am Rahmen, nicht am Inhalt.
           Traegt die zweite Haelfte ihren Grund selbst, endet sie als
           abgerissener Farbblock, sobald die andere Spalte weiterlaeuft —
           sichtbar, seit die Hoehen gefallen sind. Als Verlauf auf dem Rahmen
           laeuft die Farbe immer bis zur letzten Zeile der LAENGEREN Spalte,
           ohne dass irgendwo eine Hoehe gerechnet werden muss.
           Die Haelften behalten ihren eigenen Grund: Er deckt den Verlauf
           deckungsgleich ab, solange sie reichen, und traegt mobil (gestapelt)
           die Faerbung allein — dort gibt es keinen senkrechten Verlauf. */
        .rz-split{background:linear-gradient(90deg,
          var(--rz-papier) 0 50%,var(--rz-tiefgruen) 50% 100%)}
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
        /* S121.1 (Turn 48 §2.1) · EINE Bildlaufleiste, nie zwei.
           Bis hierher bekam jede Haelfte ihre eigene Hoehe und, sobald der
           Inhalt laenger war als das Fenster, ihren eigenen Rollbereich. Das
           ergab zwei Balken nebeneinander, die unterschiedlich weit liefen:
           Die Haelften verschoben sich gegeneinander, die Naht war keine
           Naht mehr, und das Rad rollte je nach Zeigerposition mal die eine,
           mal die andere Spalte — auf Trackpads unbedienbar.
           Jetzt gilt: kein overflow auf den Haelften, auf keiner, auch nicht
           auto. Beide sind Zellen EINES Rahmens; gerollt wird das Dokument.
           Die Grundregel traegt weiterhin min-height:100dvh — auch fuer kurze
           Seiten, damit die Naht bis zum unteren Fensterrand geht. dvh, nicht
           vh: sonst springt es auf iOS beim Ein- und Ausblenden der
           Browserleiste. */
        /* ---- S121.2 (Turn 48 §2.3/2.4) · die kurze Haelfte klebt ----
           Seit die Hoehen gefallen sind (S121.1), endet die kurze Haelfte nach
           ihrem Inhalt, waehrend die lange weiterlaeuft: Man rollt an einer
           leeren Flaeche entlang, und was dort stand — Titel, Weg, Wegweiser —
           ist nach einem Bildschirm fort.
           position:sticky haelt sie im Blick, solange die andere laeuft.
           align-self:flex-start ist dabei nicht Kosmetik: Ohne sie streckt der
           Flex-Rahmen die Haelfte auf die volle Hoehe des Rahmens, und ein
           Element, das seinen Rahmen ausfuellt, hat keinen Weg zum Kleben.
           WELCHE Haelfte klebt, steht nicht im Stylesheet: Es haengt am Inhalt
           und wird gemessen (core/ui/kleben.js). Eine zu hohe klebende Spalte
           waere gefaehrlich — sie friert oben fest und ihr unteres Ende wird
           nie erreichbar. Der Rueckfall ist deshalb immer "klebt nicht". */
        .rz-split:not(.rz-regal-offen)>.rz-half.rz-klebt{
          position:sticky;top:0;height:100dvh;align-self:flex-start}
        /* §2.4 · Das Badge ist absolute IN seiner Haelfte, nicht fixed.
           Bis T2d hing es am .rz-split (die Haelfte wurde static) und mass
           top:50% — richtig, solange der Split hoehenfest 100dvh war. Seit
           S121.1 ist der Split so hoch wie sein Inhalt: 50% waere die halbe
           DOKUMENThoehe, das Badge saesse auf einer langen Seite viel zu tief.
           Jetzt ankert es wieder an seiner Haelfte (rz-naht-anker ist
           position:relative) und misst top:50dvh vom Spaltenanfang. Eine Regel
           fuer beide Faelle: Klebt die Haelfte, ist sie genau eine
           Fensterhoehe hoch — 50dvh ist ihre Mitte, das Badge steht auf halber
           Fensterhoehe an der Naht, wie mit fixed. Klebt sie nicht, sitzt es
           50dvh unter dem Spaltenanfang, also beim ersten Blick an derselben
           Stelle, und rollt danach mit.
           Nicht fixed: Das legte es ueber Fuss, Dialoge und Tastatur wie eine
           Chat-Blase und braeuchte eine eigene z-index-Verabredung. */
        /* S121.6 · Der Wegweiser bleibt stehen, egal wie weit gerollt wird:
           fixed statt absolute, gemessen am Fenster. Turn 48 §2.4 verlangt
           ausdruecklich absolute, mit zwei Gruenden. Der erste (das Badge soll
           zur Naht gehoeren und mit ihr enden) faellt hier weg — die Naht
           reicht ueber die ganze Dokumenthoehe. Der zweite bleibt und wird
           bezahlt: fixed braucht eine ausdrueckliche Einsortierung, sonst
           legte es sich ueber Fuss, Dialoge und Tastatur.
           z-index 9 liegt ueber der klebenden oberen Zone (8) — sonst
           verschwaende seine obere Haelfte hinter dem Papier, sobald das Regal
           mobil unter die Ueberschrift gefahren ist. Der Pflicht-Screen (1000)
           bleibt darueber; er ist ein Notausgang und darf alles verdecken. */
        .rz-split .rz-auf-naht{position:fixed;left:50%;top:50dvh;
          transform:translate(-50%,-50%);z-index:9}
        /* S121.3 (Turn 48 §2.5) · Die rollende Spalte braucht Luft an der Naht.
           Das Badge steht seit S121.2 auf JEDER Rollhoehe an der Naht. Ohne
           diesen Freiraum laeuft es ueber die rechtsbuendigen Werte der
           Haarlinien-Zeilen (die Zustaende in den Regalzeilen, die Pfeile) und
           schneidet sie ab. Vorher ging das gut, weil es nur auf einer
           Bildschirmhoehe stand und die Flanke (Q3a) den Text dort weghielt.
           Nur die Papier-Spalte: An ihrer Kante liegt das Badge. Die zweite
           Haelfte bleibt vorerst unangetastet — ob sie denselben Freiraum
           braucht, ist eine Gestaltungsfrage und keine Reparatur.
           Nur ab 900px: Gestapelt liegt die Naht waagerecht, dort haelt der
           Zonenfuss den Abstand ueber --rz-nahtfrei. */
        .rz-split:not(.rz-regal-offen)>.rz-half:first-child{
          padding-right:var(--rz-nahtfrei-x)}
        .rz-split:not(.rz-regal-offen)>.rz-half:last-child{
          padding-left:var(--rz-nahtfrei-x)}
        /* Q2 · Aufgeklappt bleibt das Regal in SEINER Haelfte. Die Regel stand
           bis S114d.3 HIER und blieb wirkungslos: Sie hat dieselbe
           Spezifitaet wie die Grundregel weiter unten in der Datei, und eine
           @media-Klammer erhoeht die Spezifitaet nicht — bei Gleichstand
           entscheidet die Reihenfolge, und die Grundregel steht spaeter.
           Sie ist jetzt dorthin gewandert, wo sie gewinnt: direkt hinter die
           Grundregel (Suche: "S114d.3"). */
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
        /* S114.11 · Der Abstand zur Naht war einseitig: die erste Haelfte
           haelt ihn ueber .rz-fuss{padding-bottom:var(--rz-nahtfrei)}, die
           zweite hatte nur die 30px Zonenpolster gegengerechnet. Rechts stand
           die erste Zeile deshalb sichtbar dichter am Badge als links die
           letzte. Jetzt lesen beide Seiten denselben Token — nur eben nach
           unten statt nach oben. */
        /* S114.11b · Das Ortsetikett (.rz-caps-unter) gehoert NICHT in diese
           Rechnung. Es stand hier in beiden Regeln — erst bekam es die
           Flankenhoehe, dann nahm die Nullstellung sie ihm wieder ab, und mit
           ihr die 11px seines eigenen Abstands: 0-3-2 sticht 0-1-0. Auf dem
           Handy fiel es nicht auf (die Regeln gelten erst ab 900px), auf dem
           Desktop klebte das Etikett an der Haarlinie.
           Die Flanke misst, was ZUERST in der Haelfte steht — das ist die
           Betreten-Zeile, nie das Etikett darunter. Es braucht deshalb weder
           die eine Regel noch die andere. */
        /* S114d · Die Rechnung war noch immer um das Zonenpolster daneben.
           Nachgemessen, links (Haelfte 100dvh, padding 30px, .rz-fuss mit
           margin-top:auto und margin-bottom:50dvh):
             letzte Zeile endet bei  50dvh - 30px - nahtfrei
             Abstand zur Naht     =  30px + nahtfrei
           Rechts steht die erste Gruppe bei 30px (padding) + margin-top. Fuer
           denselben Abstand muss sie bei 50dvh + 30px + nahtfrei beginnen,
           also margin-top = 50dvh + nahtfrei. Die "- 30px" stammen aus Q3a,
           wo die Gruppe EXAKT an der Naht beginnen sollte (Abstand 0) — mit
           dem Nahtfrei-Token daneben rechnet man das Polster damit weg, statt
           es mitzuzaehlen. Jetzt ist die Flanke wirklich gespiegelt. */
        .rz-split:not(.rz-regal-offen)>.rz-half:last-child>.rz-zeile,
        .rz-split:not(.rz-regal-offen)>.rz-half:last-child>.rz-regal-reihen{
          margin-top:calc(50dvh + var(--rz-nahtfrei))}
        /* S114d · :not(.rz-fuss) — die Nullstellung galt fuer JEDES Geschwister
           nach den Regalreihen und traf damit auch den Zonenfuss. Der lebt aber
           von margin-top:auto: nur so faellt die Spaltenueberschrift an den
           unteren Rand, spiegelbildlich zur Ueberschrift oben in der ersten
           Haelfte. Mit margin-top:0 klebte sie stattdessen direkt unter der
           letzten Regalzeile. */
        .rz-split:not(.rz-regal-offen)>.rz-half:last-child>.rz-zeile~.rz-zeile,
        .rz-split:not(.rz-regal-offen)>.rz-half:last-child>.rz-regal-reihen~*:not(.rz-fuss){margin-top:0}

        /* ---- S119.4 · Die Einstellungen sind der eine Screen, dessen BEIDE
           Spalten lang sind ----
           Die gespiegelte Flanke oben (T2d/Q3a/S114d) ist fuer KURZE Spalten
           gebaut: Links haelt der Zonenfuss 50dvh Abstand nach unten, rechts
           beginnt der Inhalt 50dvh weiter unten — so ruecken beide Seiten an
           die Naht heran und lassen den Rest frei. In den Vorraeumen stimmt
           das (Titel plus zwei, drei Zeilen).

           Hier nicht: Oben stehen Ansicht, Sprache und Verlaeufe, unten drei
           Gruppen samt Rechtlichem. Mit der Flankenrechnung ueberlief beides,
           die Kinder schrumpften (Flex-Items schrumpfen per Vorgabe) und der
           Text legte sich uebereinander — die Zonenueberschrift auf die erste
           Rechts-Zeile, die Fussmarke auf die letzte.

           Entscheidung: In DIESEM Screen richtet sich die helle Spalte unten
           aus und die gruene oben. Die Naht bleibt, was sie hier ohnehin ist —
           eine Grenze nach Reichweite, keine Symmetrieachse.

           Nur hier: Die Regeln haengen an der Screen-Kennung, die uebrigen
           zweispaltigen Screens bleiben unberuehrt. Eine Kennung sticht jede
           Klassenregel, die Reihenfolge im Stylesheet entscheidet also nicht
           mit — anders als beim S114d.3-Fund, wo Gleichstand herrschte. */
        #scrEinstellungen.rz-split:not(.rz-regal-offen)>.rz-half:first-child .rz-fuss{margin-bottom:0}
        #scrEinstellungen.rz-split:not(.rz-regal-offen)>.rz-half:last-child>.rz-zeile,
        #scrEinstellungen.rz-split:not(.rz-regal-offen)>.rz-half:last-child>.rz-regal-reihen{margin-top:0}
      }

      /* S119.4 · Und die zweite Haelfte des Befunds, unabhaengig von der
         Breite: Ein Flex-Item schrumpft per Vorgabe unter seine Inhaltshoehe
         (flex-shrink:1). Steht die Spalte auf einem festen Mass, weicht der
         Text deshalb nicht nach unten aus, sondern laeuft aus seiner Box
         heraus und legt sich auf den Nachbarn. Genau das war auf dem Desktop
         zu sehen.
         flex:none stellt das ab: Die Bloecke behalten ihre Hoehe, und was
         nicht hineinpasst, wird gerollt statt uebereinandergelegt. Bewusst auf
         diesen Screen begrenzt — ein globales flex:none waere eine Aussage
         ueber jede Flaeche der App und gehoert dann auch dort geprueft. */
      #scrEinstellungen>.rz-half>*{flex:none}

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
      /* U10.1 · Hier stand frueher display:block. Die Regel hat mit 0-2-1 die
         Versteck-Regel .rz-einst-baum (0-1-0) ausgestochen — auf HELL waren
         damit beide Zeichen sichtbar. Auf Dunkel fiel es nicht auf, weil die
         Dark-Regeln dieselbe Spezifitaet haben und spaeter stehen.
         Jetzt entscheidet ueber Sichtbarkeit nur noch, wer davon spricht. */
      .rz-einst span[class^="rz-einst-"]{margin:auto;line-height:0}
      .rz-einst svg{display:block;margin:auto}
      /* D12-2f · Das Zeichen ist das WECHSELZIEL, nicht der Ist-Zustand: auf
         Hell steht die Seerose (der dunkle Teich), auf Dunkel der Baum.
         U10.1 · Beide Zustaende auf derselben Ebene (.rz-einst .rz-einst-*),
         damit keine Layout-Regel sie mehr aussticht. Der Fallback ohne
         data-theme ist EIN Zeichen (die Seerose) — nicht zwei, nicht keins. */
      .rz-einst .rz-einst-seerose{display:block}
      .rz-einst .rz-einst-baum{display:none}
      html[data-theme=dark] .rz-einst .rz-einst-seerose{display:none}
      html[data-theme=dark] .rz-einst .rz-einst-baum{display:block}
      .rz-einst .rz-punkt{position:absolute;top:3px;right:3px;width:6px;height:6px;
                          border-radius:50%;background:var(--rz-akzent)}
      /* ---- U7 (Turn 41 · Nachtrag) · Einstellungen als Ort ----
         Das aufklappende Blatt ist entfallen: es war der letzte schwebende
         Behaelter der App und der letzte Ort mit Radius UND Schatten. Der
         Screen ist jetzt die Flaeche.

         §2 · Die Wahl ist eine Haarlinien-Zeile mit Haken rechts, kein
         Systemradio und keine Pille. Ein Knopf ist in diesem System keine
         Form, sondern eine Zeile mit Richtung.

         3.2 · Das Caps-Label ist ein GRUPPEN-Label, keine Zeile: kein
         min-height, nicht antippbar. Die Haarlinie der ersten Zeile bildet
         seine Unterkante.
         3.1 · Jede Gruppe schliesst unten mit einer Haarlinie ab — sonst
         beginnt der Hinweistext darunter optisch wie eine weitere Option. */
      .rz-einst-gruppe+.rz-einst-gruppe{margin-top:26px}
      .rz-einst-gruppe .rz-caps{display:block;margin:0 0 4px;min-height:0;
                                color:var(--rz-akzent-hell)}
      .rz-tiefgruen .rz-einst-gruppe .rz-caps{color:var(--rz-label-auf-gruen)}
      .rz-einst-gruppe .rz-zeile:last-of-type{border-bottom:1px solid var(--rz-karte-rand)}
      .rz-tiefgruen .rz-einst-gruppe .rz-zeile:last-of-type{border-bottom-color:var(--rz-hairline-gruen)}
      .rz-einst-wahl .rz-haken{flex:none;font-family:var(--rz-sans);font-size:var(--rz-fs-text);
                               color:var(--rz-akzent-hell);opacity:0}
      .rz-tiefgruen .rz-einst-wahl .rz-haken{color:var(--rz-pfeil-auf-gruen)}
      .rz-einst-wahl.an .rz-haken{opacity:1}
      /* 3.3 · Der Hinweis gehoert zur Zeile darueber, nicht zwischen zwei
         Knoepfe. 8px Abstand nach oben, dann erst Luft zur naechsten Gruppe. */
      .rz-einst-fuss{font-size:var(--rz-fs-fein);color:var(--rz-sek);
                     margin:var(--rz-r-2) 0 0;line-height:var(--rz-lh-fein)}
      .rz-tiefgruen .rz-einst-fuss{color:var(--rz-sek2-auf-gruen)}

      /* ============ L3 (Turn 46) · Wiedereinstieg vor dem Zugang ============
         Der Screen laeuft vor createApp(), aber applyDesign() ist da — er
         benutzt deshalb dieselben Bausteine wie der Rest. Neu sind nur die
         Teile, fuer die es noch keine Klasse gab; alles andere (.rz-split,
         .rz-half, .rz-auf-naht, .rz-kulisse-naht, .rz-h1, .rz-caps) ist
         Bestand. KEINE Werte, die nicht aus theme.js kommen. */
      .rz-vor-papier{padding-bottom:var(--rz-kulissenfrei)}
      .rz-vor-kopf{display:flex;justify-content:space-between;align-items:center;gap:var(--rz-r-3)}
      /* Die Marke traegt hier die Marken-Spur .34em wie am Fuss jedes
         App-Screens — nicht die Badge-Spur .16em. */
      .rz-marke-vor{font-family:var(--rz-sans);font-size:var(--rz-fs-caps);font-weight:600;
                    letter-spacing:.34em;line-height:var(--rz-lh-caps);
                    text-transform:uppercase;color:var(--rz-marke)}
      /* Der Inhalt sitzt an der UNTEREN Kante der Papier-Zone (mobil), damit
         die Kulisse an der Naht Platz hat; auf dem Desktop mittig. */
      .rz-vor-mitte{margin-top:auto;position:relative}
      .rz-vor-intro{font-size:var(--rz-fs-text);line-height:var(--rz-lh-text);
                    color:var(--rz-sek);margin:14px 0 0;max-width:34ch}
      .rz-vor-hinweis{font-size:var(--rz-fs-fein);line-height:var(--rz-lh-text);
                      color:var(--rz-sek);margin:8px 0 0;max-width:46ch}
      .rz-vor-tief .rz-vor-mitte{display:flex;flex-direction:column}
      /* Der Entwurf notiert 24px/1.3; die Skala kennt zu --rz-fs-sektion das
         Zeilenmass --rz-lh-sektion (1.2). Der rohe Wert bleibt draussen — der
         T1b-Waechter existiert genau fuer diese Sorte Streuner. */
      .rz-vor-bedingung{font-family:var(--rz-serif);font-size:var(--rz-fs-sektion);
                        font-weight:300;line-height:var(--rz-lh-sektion);margin:0}
      .rz-vor-landingtext{font-size:var(--rz-fs-fein);line-height:var(--rz-lh-text);
                          color:var(--rz-sek-auf-gruen);margin:10px 0 0;max-width:46ch}
      /* §5a-Ausnahme wie auf der Landing: das Badge nennt eine BEDINGUNG,
         keinen Ort — also ohne Wegweiser-Zeichen und ohne Knopfverhalten.
         Der Verbundselektor ist noetig, weil .rz-weg-badge cursor:pointer
         setzt und SPAETER in dieser Datei steht: bei gleicher Spezifitaet
         gewinnt die spaetere Regel. Es ist ein <span>, kein Knopf — der
         Zeiger hatte eine Handlung versprochen, die es nicht gibt. */
      .rz-weg-badge.rz-badge-bedingung{cursor:default;justify-content:center;
                                       pointer-events:none;user-select:none}

      /* Vor dem Zugang fuehrt die Bedien-Ecke ins Leere: es gibt keinen
         Einstellungs-Screen, in den sie fuehren koennte. Ein Zeichen, das
         nichts tut, ist schlimmer als keins. */
      html[data-vorzugang] .rz-ecke{display:none}

      /* Breitenfassungen: genau EINE ist sichtbar. display:none nimmt die
         verdeckte auch aus dem Bedienbaum — anders als visibility. */
      .rz-nur-breit{display:none}

      /* Sprachwahl: Caps-Paar mit den SPRACHNAMEN (paarspr.name.*), wie die
         Einstellungen sie benennen. 44px hoch — im Altstand fehlte das
         Tapziel voellig (13px Text, kein Trefferbereich). */
      .rz-sprachpaar{display:flex;align-items:center;gap:10px;
                     min-height:var(--rz-tapziel-finger);
                     font-family:var(--rz-sans);font-size:var(--rz-fs-caps);font-weight:600;
                     letter-spacing:.2em;line-height:var(--rz-lh-caps);text-transform:uppercase}
      .rz-sprachpaar button{background:none;border:0;padding:0;cursor:pointer;
                            font:inherit;letter-spacing:inherit;text-transform:inherit;
                            color:var(--rz-sek)}
      .rz-sprachpaar button[aria-pressed=true]{color:var(--rz-akzent-ink)}
      .rz-sprachpaar .rz-trenner{color:var(--rz-hairline)}
      .rz-tiefgruen .rz-sprachpaar button{color:var(--rz-sek-auf-gruen)}
      .rz-tiefgruen .rz-sprachpaar button[aria-pressed=true]{color:var(--rz-ink-auf-gruen)}
      .rz-tiefgruen .rz-sprachpaar .rz-trenner{color:var(--rz-hairline-gruen)}
      /* In der dunklen Spalte steht sie ganz oben rechts, ueber allem. */
      #rzVorZugang .rz-vor-tief .rz-sprachpaar{align-self:flex-end;position:relative;z-index:4}

      /* Die Anforderung ist eine ZEILE, kein Formular — dieselbe Signatur wie
         .rz-zeile und wie das Signup der Landing. Damit fallen Karte,
         Feldrahmen, Pille und Weichzeichner weg. */
      .rz-eintrag{display:flex;align-items:baseline;justify-content:space-between;
                  gap:var(--rz-r-3);width:100%;box-sizing:border-box;
                  min-height:var(--rz-tapziel-finger);padding:15px 0;margin-top:22px;
                  border-top:var(--rz-hairline-staerke) solid var(--rz-hairline);
                  border-bottom:var(--rz-hairline-staerke) solid var(--rz-hairline);
                  background:none}
      .rz-eintrag input{flex:1;min-width:0;border:0;background:none;padding:0;outline:none;
                        font-family:var(--rz-serif);font-size:var(--rz-fs-zeile);
                        font-style:italic;line-height:var(--rz-lh-zeile);color:var(--rz-ink)}
      .rz-eintrag input::placeholder{color:var(--rz-sek);opacity:1}
      .rz-eintrag>button{flex:none;border:0;background:none;padding:0;cursor:pointer;
                         font-family:var(--rz-sans);font-size:var(--rz-fs-text);
                         color:var(--rz-akzent-ink)}
      /* Mobil traegt der Pfeil den Handgriff allein; ab 900px steht der
         Wortlaut ausgeschrieben — dieselbe Ausnahme wie beim Landing-Signup. */
      .rz-eintrag .rz-wort{display:none}
      /* Quittung: die Zeile schreibt in sich weiter. Die Adresse ist jetzt
         Inhalt, kein Platzhalter — also nicht mehr kursiv. */
      .rz-eintrag .rz-adresse{flex:1;min-width:0;font-family:var(--rz-serif);
                              font-size:var(--rz-fs-zeile);line-height:var(--rz-lh-zeile);
                              overflow-wrap:anywhere}
      .rz-eintrag .rz-quittung{flex:none;font-family:var(--rz-sans);font-size:var(--rz-fs-caps);
                               font-weight:600;letter-spacing:.2em;line-height:var(--rz-lh-caps);
                               text-transform:uppercase;color:var(--rz-akzent-ink)}

      /* Weg auf eine andere Domain. "↗" statt "→": es fuehrt aus der App
         heraus, und das wird benannt statt versteckt. */
      .rz-extern{display:flex;justify-content:space-between;align-items:baseline;
                 gap:var(--rz-r-3);box-sizing:border-box;
                 min-height:var(--rz-tapziel-finger);padding:15px 0;margin-top:16px;
                 border-top:var(--rz-hairline-staerke) solid var(--rz-hairline);
                 border-bottom:var(--rz-hairline-staerke) solid var(--rz-hairline);
                 font-family:var(--rz-serif);font-size:var(--rz-fs-zeile);
                 line-height:var(--rz-lh-zeile);color:var(--rz-ink);text-decoration:none}
      .rz-extern .rz-pfeil{font-family:var(--rz-sans);font-size:var(--rz-fs-text);
                           color:var(--rz-pfeil)}
      .rz-tiefgruen .rz-extern{border-top-color:var(--rz-hairline-gruen);
                               border-bottom-color:var(--rz-hairline-gruen);
                               color:var(--rz-ink-auf-gruen)}
      .rz-tiefgruen .rz-extern .rz-pfeil{color:var(--rz-pfeil-auf-gruen)}

      .rz-rechtsfuss{display:flex;gap:var(--rz-r-5);margin-top:var(--rz-r-5);
                     position:relative;font-size:var(--rz-fs-fein)}
      .rz-rechtsfuss a{color:var(--rz-sek);text-decoration:none;
                       min-height:var(--rz-tapziel);display:inline-flex;align-items:center}
      .rz-tiefgruen .rz-rechtsfuss a{color:var(--rz-sek2-auf-gruen)}

      @media(min-width:900px){
        /* Desktop erbt die Regel des Landing-Heros: Naht senkrecht mittig,
           Badge auf der Naht, rechte Haelfte rechtsbuendig, und die Kulisse
           liegt als BODEN der Tiefgruen-Haelfte — nie auf der senkrechten
           Naht (Baumsilhouetten sind eine Grundlinie). Auf dunklem Grund
           .85, sonst tragen ihre Eigen-Deckkraefte nicht. */
        .rz-nur-breit{display:flex}
        .rz-nur-schmal{display:none}
        /* Die Papier-Haelfte braucht den Kulissen-Boden nicht — er liegt
           drueben. Die Tiefgruen-Haelfte schon: dort steht sonst Text in den
           unteren 96px. */
        #rzVorZugang .rz-vor-papier{padding-bottom:40px}
        #rzVorZugang .rz-vor-tief{align-items:flex-end;text-align:right;
                                  padding-bottom:var(--rz-kulissenfrei)}
        #rzVorZugang .rz-vor-tief .rz-vor-mitte{align-items:flex-end}
        #rzVorZugang .rz-vor-landingtext{margin-left:auto}
        /* Gespiegelt: links sitzt der Inhalt OBEN unter der Wortmarke, rechts
           UNTEN ueber dem Rechtsfuss. Die Diagonale ist die Aussage — zwei
           Seiten derselben Lage, nicht zwei Spalten mit demselben Aufbau. */
        #rzVorZugang .rz-vor-papier .rz-vor-mitte{margin-top:34px;margin-bottom:auto}
        #rzVorZugang .rz-vor-tief .rz-vor-mitte{margin-top:auto;margin-bottom:0}
        /* Die Handgriffe laufen ueber die ganze Spaltenbreite — samt
           Haarlinie. Eine halbbreite Linie mitten in der Spalte laese sich
           als Rahmen eines Kastens, und Kaesten gibt es hier nicht. */
        #rzVorZugang .rz-eintrag,
        #rzVorZugang .rz-extern{width:100%;max-width:none;min-width:0}
        #rzVorZugang .rz-vor-intro,
        #rzVorZugang .rz-vor-hinweis,
        #rzVorZugang .rz-vor-landingtext{max-width:46ch}
        .rz-kulisse-vor{top:auto;bottom:0;transform:none;
                        height:var(--rz-kulissenfrei);opacity:.85}
        .rz-eintrag{gap:var(--rz-r-4)}
        .rz-eintrag .rz-wort{display:inline}
      }
      /* 3.5 · Das Baum-Band ist 84px hoch und liegt ueber der Naht. Endet die
         Papier-Zone direkt mit Text, laufen die Silhouetten durch die letzten
         Zeilen. --rz-nahtfrei (32px, T2b) reicht dafuer nicht — das war das
         Mass fuer das Badge, nicht fuer die Kulisse. */
      .rz-einst-oben{padding-bottom:var(--rz-kulissenfrei)}
      .rz-einst-oben .rz-h2-oben{margin-top:var(--rz-r-6)}
      /* Nur auf dem Startscreen steht das Ortsetikett ueber der Betreten-Zeile;
         in den Vorraeumen traegt das Badge den Ort (Turn 27, §1). */
      .rz-caps-ueber{margin-bottom:11px}
      /* S114.11a · Das Gegenstueck in der zweiten Haelfte: Dort traegt die
         Zeile ihre Hairline UNTEN (.rz-zeile.rz-unten), das Etikett steht
         also darunter statt darueber. Gleicher Abstand, gespiegelte Seite. */
      .rz-caps-unter{margin-top:11px}
      /* Der Sessionname verlaesst den Kopf und wird zur leisen Zeile ueber der
         ersten Nachricht — der Ort steht im Badge, die Session hier. */
      .rz-sessionname{font-family:var(--rz-serif);font-size:var(--rz-fs-text);font-weight:300;
                      color:var(--rz-sek2);margin:0 0 4px}

      /* ============ D1 · Grundbaustein C — Wegweiser-Badge / -Panel ============
         Badge sitzt exakt auf der Naht (rz-auf-naht), Punkt = etwas wartet.
         Panel faltet sich aus der Naht (clip-path + opacity, ~300ms; bis
         S114g war es scaleY — siehe dort, warum nicht mehr,
         var(--rz-kurve)), ueberdeckt als Overlay, Klick irgendwohin
         schliesst. Inhalt: nur Text, 2–3 Optionen, Serif, Raumnamen kursiv. */
      /* Der Knopf liegt UNTER dem Textpanel: klappt das Panel aus der Mitte
         auf, verschwindet der Knopf dahinter (Tap aufs Panel schliesst). */
      .rz-weg-badge{z-index:3;background:var(--rz-akzent);color:var(--rz-akzent-text);border:0;cursor:pointer;
                    font-family:var(--rz-sans);font-size:var(--rz-fs-caps);font-weight:600;letter-spacing:.16em;
                    text-transform:uppercase;padding:9px 18px;display:flex;align-items:center;gap:8px;
                    border-radius:0;min-height:0}
      /* U10.2 (F1a) · Der Warte-Punkt am Badge ist ersatzlos entfallen. Er
         stand 8px hinter versal gesperrtem Text und las sich als "WEGWEISER."
         — ein Tippfehler, keine Meldung. Mit ihm sind .rz-wartet und die
         Berechnung dahinter (kandidaten.some(kd => kd.stufe < 4), app.js)
         entfernt: eine Klasse, die nichts mehr zeichnet, ist schlimmer als
         keine. Soll das Signal je zurueck, ist es eine neue Entscheidung
         ueber Ort und Form, nicht ein Wiederanschalten.
         In der Bedien-Ecke lebt .rz-einst .rz-punkt weiter — dort sitzt er
         als Aufsetzer AM Zeichen und liest sich nicht als Satzzeichen. */
      /* U2 (Handover Turn 41 §3) · Die Flaeche traegt bisher exakt den
         Papierton der Zone darueber — als Flaeche ist sie damit unsichtbar,
         getrennt nur durch die zwei Haarlinien. Jetzt hebt sie sich einen Ton
         ab und liest sich als eigene Zone, wie §3 es verlangt. */
      /* S114g · Die Auf-Bewegung laeuft ueber clip-path, nicht mehr ueber
         scaleY. Der Grund ist gemessen, nicht hergeleitet: Nimmt man transform
         aus der transition-property heraus (transition-property:opacity), ist
         der Fehler weg — das Band steht sofort ueber beiden Spalten. Es lag
         also weder an der Breite noch am Stapel noch am Containing Block,
         sondern an der ANIMATION von transform: Fuer ihre Dauer hebt der
         Browser das Band auf eine eigene Ebene, und diese Ebene wird an dem
         Rollbereich beschnitten, in dem das Band im Baum liegt (damals die
         zweite Haelfte; deren Rollbereich ist mit S121.1 entfallen). Am Ende faellt die Ebene weg — daher "erst
         halb, dann ganz", und daher auch die Reparatur durch eine Auswahl im
         Inspektor: Sie erzwingt ein Neuzeichnen.
         transform bleibt stehen, aber nur noch STATISCH: translateY(-50%)
         haelt das Band mittig auf der Naht und wird nie animiert, also
         entsteht keine Ebene. Bewegt wird der sichtbare Ausschnitt:
         inset(50% 0 50% 0) ist die Naht als Linie, inset(0) das volle Band.
         Optisch dasselbe Aufklappen aus der Naht heraus — und sauberer, weil
         scaleY den Text mitgestaucht hat und clip-path ihn nur freigibt. */
      /* S125 · Das Panel liegt UEBER dem Badge. Solange das Badge absolut in
         seiner Haelfte sass, ergab sich das von selbst; seit es fest am Fenster
         steht (S121.6, z-index:9), schob es sich auf dem Desktop darueber.
         Mobil war es richtig — jetzt in beiden Lagen aus demselben Grund. */
      .rz-weg-panel{position:absolute;left:0;right:0;top:0;z-index:10;padding:30px var(--rz-rand);
                    background:var(--rz-flaeche-hoch);color:var(--rz-ink);
                    border-top:1px solid var(--rz-hairline);border-bottom:1px solid var(--rz-hairline);
                    transform:translateY(-50%);
                    clip-path:inset(50% 0 50% 0);
                    opacity:0;pointer-events:none;
                    transition:clip-path .3s var(--rz-kurve),opacity .3s var(--rz-kurve)}
      .rz-weg-panel.rz-offen{clip-path:inset(0 0 0 0);opacity:1;pointer-events:auto}
      .rz-weg-panel .rz-option{font-family:var(--rz-serif);font-size:var(--rz-fs-zeile);font-weight:300;
                               line-height:var(--rz-lh-fein);margin:0 0 var(--rz-r-5)}
      .rz-weg-panel .rz-option em{font-style:italic}
      /* T2e-Nachzug (Handover Turn 40 §3.4) · "tippen zum Schliessen" ist die
         einzige Angabe, wie man das Panel wieder loswird — eine ANWEISUNG,
         keine Zier. Auf --rz-gedimmt lag sie bei 2.30:1 und trug damit nicht;
         jetzt --rz-sek (4.70:1), wie schon .rz-zustand und .rz-signatur.
         Sie bleibt trotzdem die leiseste Zeile im Panel: --rz-fs-caps gegen
         --rz-fs-fein des Hinweises darueber und --rz-fs-zeile der Optionen. */
      .rz-weg-fuss{font-family:var(--rz-sans);font-size:var(--rz-fs-caps);color:var(--rz-sek);
                   text-align:center;padding-top:8px}
      /* T2k (K7) · Einmalige Erklaerung des Zeichens, nur im Panel der
         Startseite. Leiser als eine Option, lauter als die Fusszeile: sie
         traegt Bedeutung, waehrend "tippen zum Schliessen" nur eine Geste
         nennt. --rz-sek statt --rz-gedimmt, siehe T2e. */
      .rz-weg-hinweis{font-family:var(--rz-sans);font-size:var(--rz-fs-fein);
                      color:var(--rz-sek);text-align:center;padding-top:var(--rz-r-3)}
      /* Quick-Lane · Auf dem Desktop liegt die Naht senkrecht in der Mitte.
         Das Panel haengt in der ZWEITEN Haelfte und klappte deshalb nur ueber
         deren Oberkante auf: halbe Breite, falsche Hoehe. Es soll auch hier ein
         Band sein — voller Breite, durch die Mitte.
         200% / -100% statt 100vw / -50vw: Prozente rechnen gegen die Haelfte
         (genau halbe Breite, da beide flex:1 tragen) und bringen keinen
         Scrollbalken mit, wie vw es taete.
         Der Block steht bewusst HINTER der Grundregel — gleiche Spezifitaet,
         also entscheidet die Reihenfolge. */
      /* S114.9 · Beide Regeln standen ohne .rz-split davor und trafen damit
         auch den Wegweiser IM Gespraech. Dort gibt es keine senkrechte Naht:
         das Panel rutschte auf halbe Hoehe der Schreibkante — also nach unten
         aus dem Bild — und wurde doppelt so breit. Was als "oeffnet nach unten
         und zeigt nichts" ankam, war diese eine fehlende Bindung.
         Der Chat behaelt damit die Grundregel: an der Kante seiner Zone,
         volle Breite dieser Zone. */
      @media(min-width:900px){
        /* S114e · Das Panel haengt im DOM in der ZWEITEN Haelfte — die auf dem
           Desktop bis S121.1 ein Rollbereich war (overflow:auto; seither rollt
           das Dokument). Sein Containing Block
           liegt seit T2d beim .rz-split (die Haelfte wird position:static),
           weshalb es im Ruhezustand ueber beide Spalten reicht.
           Waehrend der Auf-Bewegung galt das nicht: Ein Element mit laufender
           transform-Transition wird auf eine eigene Compositing-Ebene gehoben,
           und eine solche Ebene erbt das Klipprechteck des Rollbereichs, in
           dem sie im Baum liegt — auch wenn ihr Containing Block darueber
           liegt. Also war das Band fuer die Dauer der Bewegung auf die rechte
           Spalte beschnitten und sprang am Ende auf volle Breite.
           Das ist unabhaengig vom Zustand und tritt bei JEDEM Oeffnen auf
           (bestaetigt: sofort, konsistent).

           position:fixed loest das an der Wurzel statt am Symptom: Der
           Viewport ist der Bezug, kein Rollbereich liegt mehr dazwischen, und
           es gibt kein Klipprechteck zu erben. Die Naht liegt bei 50dvh —
           dieselbe Zahl, mit der auch das Badge im aufgeklappten Regal misst
           (.rz-split.rz-regal-offen .rz-auf-naht{top:50dvh}).
           S121.1 · Die Zweiteilung ist seither NICHT mehr hoehenfest; 50dvh
           bleibt trotzdem richtig, weil beides am Fenster misst. Mit dem
           klebenden Aufbau (S121.2) wandert der Bezug auf die klebende
           Haelfte — dann ist 50dvh deren Mitte.
           S114j · Das gilt jetzt in BEIDEN Zustaenden. Frueher war die Regel auf
           :not(.rz-regal-offen) beschraenkt, weil das Panel im aufgeklappten
           Regal ohnehin gesperrt war (S114.8) — auf dem Desktop ist es das
           nicht mehr. Und es passt: Das Badge steht auch bei offenem Regal auf
           50dvh (Q3, es markiert die Naht und faehrt nicht mit), das Panel
           trifft also dieselbe Linie. Die 200%/-100%-Rechnung fuer den
           offenen Zustand ist damit fort — sie setzte voraus, dass die Spalte
           der Bezugsrahmen ist. */
        .rz-split .rz-weg-panel{
          position:fixed;left:0;right:0;top:50dvh;width:auto;margin-left:0}
        /* S114j · Gegenstueck zur mobilen Sperre weiter unten in der Datei.
           Sie steht dort als Grundregel; hier wird sie fuer die Zweiteilung
           zurueckgenommen. Die Reihenfolge spielt keine Rolle, die
           Spezifitaet entscheidet (0-3-0 gegen 0-2-0). */
        .rz-split.rz-regal-offen .rz-weg-badge{pointer-events:auto}
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
      /* S125 · Zonentitel oben (nur wo er so gebaut ist, s. app.js): kein
         margin-top:auto, kein Naht-Polster — beides gehoert zum Fuss. */
      .rz-fuss.rz-fuss-oben{margin-top:0;padding-top:0;padding-bottom:var(--rz-r-5)}
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
      /* U10.4 (F3a) · Der Chat hatte bis hier KEINEN eigenen Rollbereich. Die
         ganze Kette stand auf min-height:100dvh — der Kasten wuchs mit jeder
         Nachricht, niemand eroeffnete einen Ueberlauf, also rollte das
         DOKUMENT. Die Schreibkante haengt am unteren Ende dieses wachsenden
         Kastens und fuhr mit hinaus.
         Jetzt dasselbe Muster wie D9 beim Regal: Hoehe festnageln, Ueberlauf
         nach innen verlegen. Fest steht alles ab dem Badge — Wegweiser,
         Composer, Links. Die Kulisse braucht keinen eigenen Schritt: sie ist
         absolut gegen .rz-naht-anker gesetzt, und der Anker IST die
         Schreibkante. Steht die Kante, steht die Kulisse.
         Variante (a): Es rollt die GANZE obere Zone, Kopfzeile inbegriffen.
         Ein festgesetzter Kopf haette dem Gespraech zusaetzlich Hoehe
         genommen — auf kleinen Schirmen wird der Ausschnitt sonst zu eng.
         min-height:0 ist nicht Kosmetik: Flex-Kinder haben per Vorgabe
         min-height:auto und weigern sich zu schrumpfen; ohne die Null waechst
         die Zone am overflow vorbei. */
      /* S119.3 · box-sizing:border-box. Ohne sie rechnet die Regel im
         Standard content-box: die 100dvh sind die INHALTShoehe, das Polster
         kommt oben und unten obendrauf. Der Kasten war damit gemessene 54px
         (30px Kopfpolster + 24px --rz-rand) hoeher als das Fenster — das
         Dokument lief ueber, und neben der gewollten Leiste in
         .rz-chat-oben stand eine zweite am Body. Wer im dunklen Bereich
         wischte, rollte deshalb das Dokument statt gar nichts.
         Ein globales box-sizing gibt es in diesem Stylesheet nicht; es ist
         punktuell gesetzt — bei den Zonen, der App-Wurzel und einigen
         Bedienelementen. Das nachzuziehen ist ein eigener Schritt mit
         Sichtpruefung aller Screens; hier steht nur die Zeile fuer den Chat.
         (Kein Selektorname in diesem Kommentar: Waechter dieses Bestands
         greifen per Regex ueber den CSS-Text, Kommentare eingeschlossen.)
         Nicht gewaehlt: das Polster nach .rz-chat-innen verlegen. Das haette
         die Ausblut-Rechnung der Schreibkante (S114c) verschoben, die gegen
         --rz-rand rechnet. */
      /* S121.4 (Turn 48, uebertragen auf den Chat) · Der Chat gibt seinen
         eigenen Rollbereich auf; gerollt wird die Seite. Die Schreibkante
         klebt stattdessen am unteren Fensterrand (siehe .rz-chat-unten).
         Damit rollt eine Geste UEBERALL — auch ueber der dunklen Flaeche, die
         vorher nur den 54px-Ueberhang des Dokuments bewegte.
         min-height statt height: Der Screen ist so hoch wie sein Inhalt,
         mindestens aber fensterhoch, damit die Schreibkante auch bei kurzem
         Verlauf unten steht.
         overflow-y:hidden ist ERSATZLOS entfallen: Es machte den Screen zum
         Rollbereich (wenn auch zu einem ohne Balken) und waere damit der
         Bezugsrahmen des klebenden Randes geworden — der Rand haette an einem
         Kasten geklebt, der selbst nie rollt, also gar nicht.
         overflow-x:clip bleibt (eine Ebene tiefer, T2j): clip eroeffnet
         keinen Rollbereich, hidden haette es getan. */
      .rz-app #scrChat{max-width:none;margin:0;background:var(--rz-papier);color:var(--rz-ink);
        min-height:100dvh;display:flex;flex-direction:column;box-sizing:border-box;
        padding:calc(30px + env(safe-area-inset-top,0px)) var(--rz-rand)
        calc(var(--rz-rand) + env(safe-area-inset-bottom,0px))}
      /* S121.4 · height:100% haette jetzt ins Leere gegriffen: Der Screen hat
         keine feste Hoehe mehr, eine Prozenthoehe gegen einen unbestimmten
         Rahmen wird zu auto. Die Spalte streckt sich stattdessen als
         Flex-Kind — sie fuellt den Screen, wenn der Verlauf kurz ist, und
         waechst mit ihm, wenn er lang wird. */
      .rz-chat-innen{max-width:var(--rz-chat-spalte);margin:0 auto;display:flex;flex-direction:column;
        flex:1 1 auto;width:100%;min-height:0}
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
         T2j-Nachzug · Die Regel hiess zuerst "#scrChat .rz-echo", weil die
         Klasse .pb-echo auch die Leseansicht und der Auswahl-Screen tragen und
         eine Regel DARAUF zwei fremde Orte still veraendert haette. Genau das
         war aber der eigentliche Befund: in der Leseansicht stand eine nackte
         div, wo im Gespraech eine Pille sitzt — dieselbe Angabe, zweierlei
         Gestalt. Die Leseansicht traegt jetzt .rz-echo mit, der Auswahl-Screen
         nicht (der hat seit T3b sein eigenes .rz-ausw-kopf). Deshalb steht die
         Regel ohne Screen-Bindung. */
      .rz-echo{align-self:flex-end;font-family:var(--rz-sans);font-size:var(--rz-fs-caps);
        color:var(--rz-sek2);background:var(--rz-karte);border:1px solid var(--rz-karte-rand);
        border-radius:var(--rz-rund-pille);padding:var(--rz-r-1) var(--rz-r-3);max-width:82%}
      #scrChat .rz-panel{border-top:1px solid var(--rz-hairline);border-bottom:1px solid var(--rz-hairline);
        padding:14px 0;margin:10px 0;font-size:var(--rz-fs-fein)}
      #scrChat .pb-skala{background:none;border:1px solid var(--rz-hairline);border-radius:0}
      #scrChat #btnChatEnde{font-size:var(--rz-fs-text);margin-top:6px}
      /* ---- D12-2b (Turn 27, 27e) · der Chat bekommt dieselbe Grammatik wie
         die uebrigen Screens: oben der Verlauf, unten die Schreibkante als
         eigene Zone, dazwischen die Naht mit dem Wegweiser-Badge.
         T2i · Das Badge war hier eine blosse Marke (cursor:default) und
         oeffnete nichts. Seit T2 ist es ein Knopf wie in den Vorraeumen: es
         nennt weiterhin den Ort (K5) und klappt zusaetzlich den Wegweiser
         aus der Naht. Die Sonderregel ist deshalb entfallen — .rz-weg-badge
         bringt cursor:pointer schon mit. */
      /* U10.4 · DIESE Zone rollt — und nur sie. */
      /* S114.12 · overflow-y:auto allein macht die andere Achse implizit zu
         "auto" (visible ist mit auto nicht kombinierbar). Jeder waagerechte
         Ueberlauf im Verlauf — ein breites Panel, eine lange Kennung, die
         Aufdeck-Tafel — legte deshalb eine Bildlaufleiste an den UNTEREN Rand
         genau dieser Zone: direkt ueber der Naht. Die Abfangregel dagegen
         (.rz-app #scrChat{overflow-x:clip}) sitzt eine Ebene hoeher und wurde
         nie erreicht. Sie steht jetzt auch dort, wo gerollt wird.
         clip statt hidden: hidden eroeffnete einen zweiten Rollbereich. */
      /* S121.4 · U10.4 IST HIERMIT UMGEKEHRT. Die Zone war der eigene
         Rollbereich des Chats ("DIESE Zone rollt — und nur sie"). Genau das
         war der Befund: Am Geraet liess sich darin nur die Bildlaufleiste
         ziehen, nicht wischen. Jetzt rollt die Seite; die Zone laeuft einfach
         mit. overflow-x:clip bleibt gegen breite Panels (T2j). */
      #scrChat .rz-chat-oben{flex:1 1 auto;display:flex;flex-direction:column;padding:0;
        overflow-x:clip}
      /* Die Schreibkante bringt ihr flex:none schon mit (= 0 0 auto): Sie
         kann nicht schrumpfen, ein langer Composer gibt der rollenden Zone
         nicht nach. Eine zweite Regel dafuer waere Doppelpflege gewesen. */
      /* S114c · Die Ausblut-Rechnung gilt jetzt in JEDER Breite, nicht erst
         ab 900px. Vorher standen hier zwei Rezepte nebeneinander:
           schmal  -> margin:calc(-1 * var(--rz-rand))   (bis zur Screenkante)
           ab 900  -> margin:calc(50% - 50vw)            (bis zur Fensterkante)
         Dazwischen klaffte eine Luecke. Sobald das Fenster breiter ist als die
         Lesespalte plus Raender (640 + 2x24 ≈ 690px), ist .rz-chat-innen
         schmaler als das Fenster und zentriert — die Screenkante liegt dann
         nicht mehr an der Fensterkante. Von ~690px bis 899px reichte das erste
         Rezept deshalb nicht mehr hinaus und das zweite noch nicht: die
         Schreibkante stand als freies Rechteck auf Papier. Genau der Befund,
         den T2h fuer breite Schirme geloest hat — nur eine Stufe frueher.
         Die eine Rechnung deckt beide Faelle: Prozente rechnen gegen die
         Spalte, bei schmalem Fenster ergibt calc(50% - 50vw) exakt
         -var(--rz-rand), also das alte Verhalten. Das Polster braucht die
         Klammer nach unten (max), sonst wird es negativ, sobald das Fenster
         schmaler als die Lesespalte ist. */
      /* S121.4 · Die Schreibkante klebt am unteren Fensterrand — dieselbe
         Bauform wie die klebende Haelfte (Turn 48 §2.3), nur waagerecht. Sie
         bleibt damit erreichbar, waehrend der Verlauf unter ihr durchlaeuft,
         und der dunkle Bereich rollt trotzdem die Seite: Eine Geste ueber
         einem klebenden Element bewegt den Rollbereich, an dem es klebt.
         z-index, weil der Verlauf unter ihr hindurchzieht. */
      #scrChat .rz-chat-unten{flex:none;position:sticky;bottom:0;z-index:2;background:var(--rz-tiefgruen);
        margin:var(--rz-r-5) calc(50% - 50vw)
               calc(-1 * var(--rz-rand) - env(safe-area-inset-bottom,0px));
        padding:40px max(var(--rz-rand), calc(50vw - var(--rz-chat-spalte) / 2))
                calc(22px + env(safe-area-inset-bottom,0px));
        display:flex;flex-direction:column}
      #scrChat .rz-chat-unten .pb-composer{margin-top:0;border-top:0;padding-top:0}
      /* T2h (Handover Turn 40 §3.8, Entscheidung K3) · Auf breiten Schirmen
         blutete die Schreibkante nur um das Screenpolster aus: ein Tiefgruen-
         Rechteck von 688px stand frei auf Papier — weder Zone (die geht bis
         zur Kante) noch Karte (die haette einen Radius). Jetzt ist sie eine
         Zone: der Block reicht von Kante zu Kante, sein INHALT bleibt auf der
         Lesespalte ausgerichtet, damit Composer und Verlauf buendig stehen.
         calc(50% - 50vw) statt 100vw: Prozente rechnen gegen die Spalte
         (halbe Spaltenbreite), die Differenz ist genau der Weg nach aussen.
         Ein nacktes 100vw brauechte zusaetzlich eine Mittenkorrektur.
         Der Rest, den vw nicht wissen kann, ist die Bildlaufleiste: 50vw
         zaehlt sie mit, der sichtbare Bereich ist schmaler. Die Ueberlappung
         von wenigen Pixeln je Seite faengt overflow-x:clip am Screen ab —
         clip statt hidden, weil hidden einen Rollbereich eroeffnen und die
         senkrechte Bewegung an sich reissen wuerde. */
      /* U11.3 · Die Abfangregel galt nur ab 900px — dort, wo auch das
         Ausblut-Rezept greift. Ein waagerechter Ueberlauf kann aber auch
         darunter entstehen (lange ungetrennte Woerter, ein breites Element im
         Verlauf), und dann rollte der ganze Chat seitwaerts.
         clip statt hidden, weil hidden einen Rollbereich eroeffnen und die
         senkrechte Bewegung an sich reissen wuerde (s. u.). */
      .rz-app #scrChat{overflow-x:clip}
      /* Und die Ursache gleich mit: Ein Wort, das breiter ist als die Spalte,
         schiebt die Zeile hinaus. Umbrechen statt ueberlaufen — Links und
         Kennungen sind die ueblichen Verdaechtigen. */
      #scrChat .pb-msg{overflow-wrap:anywhere}
      /* S114c · Die frueher hier stehende @media(min-width:900px)-Regel ist in
         die Grundregel aufgegangen — eine Rechnung fuer alle Breiten. */
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
      /* ---- T3b · Ausschnitt-Auswahl und Vorschau (R4b) ----
         Dreizehn Inline-Stilbloecke aus auswahl-screen.js. Rein mechanisch
         herausgeloest: Abstaende, Deckkraft und min-height stehen unveraendert
         da, weil es fuer sie keine Skala gibt. Auf die Skala gezogen wurden
         nur die vier Schriftgroessen und der Radius:
           12px -> --rz-fs-fein (13px)     · vier Stellen, Mikrotext
           13px -> --rz-fs-fein (13px)     · unveraendert
           14px -> --rz-fs-text (15px)     · der Antworttext eines Paars
           16px -> --rz-fs-zeile (17px)    · das Entfernen-Zeichen
           14px Radius -> --rz-rund-blatt  · unveraendert
         Die Gestaltungsfrage aus dem Sprintplan (bleiben die Paar-Bloecke
         Karten mit Rand und Radius, oder werden sie Hairline-Zeilen wie
         ueberall sonst?) ist damit NICHT beantwortet — sie steht offen. */
      .rz-ausw-kopf{align-self:center;font-size:var(--rz-fs-fein);color:var(--rz-sek2);
                    padding:6px 0;text-align:center}
      /* U3 (Handover Turn 41 §4.1–4.3) · Der Paar-Block war der einzige
         Rahmen im System. Ueberall sonst trennt eine Haarlinie und der
         Rhythmus traegt — hier stand ein Kasten mit Radius um jeden Block.
         Jetzt: border-top statt border, Radius 0, und DIE FLAECHE WAEHLT.

         §4.2 · Der Rahmen musste auch aus einem zweiten Grund weg. Gewaehlt
         hiess border-color:var(--rz-tiefgruen) — im dunklen Theme ist
         Tiefgruen DUNKLER als Papier, der gewaehlte Rand waere also
         verschwunden. Ohne Rand traegt die Fuellung allein, und die dreht
         die Richtung von selbst: hell einen Ton dunkler, dunkel einen Ton
         heller. Beides ist --rz-flaeche-hoch.

         Das Ausbluten bis zur Zonenkante (Entscheidung K11) ist dieselbe
         Geste wie bei der Schreibkante: eine Flaeche, die den Rand erreicht,
         heisst "das hier ist jetzt gemeint".

         §4.3 · Gesperrt braucht ein zweites Signal. Deckkraft allein ist auf
         Papier fast nicht zu sehen; die gestrichelte Oberkante erkennt man
         auch ohne Farbe. */
      .rz-paar{border:0;border-top:1px solid var(--rz-hairline);border-radius:0;
               background:none;padding:15px 0;margin:0;cursor:pointer}
      .rz-paar.rz-an{background:var(--rz-flaeche-hoch);
                     margin:0 calc(var(--rz-rand) * -1);padding:15px var(--rz-rand)}
      .rz-paar.rz-zu{cursor:default;border-top-style:dashed;opacity:.5}
      /* §4.5 · Rueckmeldung ab 150ms: die Oberkante wird kraeftiger und
         nimmt den Akzent an. Kein Wachsen, kein Schatten — nur die Linie,
         die ohnehin da ist. So sieht man, dass etwas laeuft, bevor die
         Spanne bei 500ms zuschlaegt. */
      .rz-paar.rz-halten{border-top-width:2px;border-top-color:var(--rz-akzent-ink)}
      .rz-tiefgruen .rz-paar.rz-halten{border-top-color:var(--rz-akzent)}
      .rz-paar-frage{font-size:var(--rz-fs-fein);color:var(--rz-sek2);margin-bottom:6px}
      .rz-paar-antwort{font-size:var(--rz-fs-text)}
      .rz-paar-grund{font-size:var(--rz-fs-fein);color:var(--rz-sek2);margin-top:6px;font-style:italic}
      /* U3c (Handover Turn 41 §1.1) · Die Leiste klebte per position:sticky
         auf Papier — ohne Haarlinie nach oben, also ohne Kante. Jetzt IST sie
         die untere Zone: oben Papier fuer das, was man aussucht, unten
         Tiefgruen fuer das, was das Geraet verlaesst. Die Naht ist die Kante,
         eine eigene Linie braucht es nicht mehr.
         Waehrend die Auswahl offen ist, tritt sie an die Stelle des Composers.
         Das haengt an einer Klasse am Screen, nicht an pb-hidden je Element:
         aktualisiereComposer() laeuft aus anderen Anlaessen weiter und wuerde
         den Composer sonst jederzeit zurueckholen. */
      .rz-ausw-leiste{padding:var(--rz-r-2) 0 0}
      .rz-ausw-fein{font-size:var(--rz-fs-fein);color:var(--rz-sek2-auf-gruen);
                    text-align:center;padding-bottom:6px}
      #scrChat.rz-auswahl .pb-composer,
      #scrChat.rz-auswahl .pb-skala,
      #scrChat.rz-auswahl #btnChatEnde,
      #scrChat.rz-auswahl #btnRaumVerlassen{display:none}
      /* ---- U1 (Handover Turn 41 §2) · Die Feldkante ----
         Ein Baustein fuer alle Eingaben ausserhalb des Chats: Adresse, Code,
         Rahmensatz. Kein Rahmen, kein Radius, keine Flaeche — nur eine
         Haarlinie unten. Dieselbe Geste wie die Schreibkante im Chat: eine
         Linie unter dem Text heisst ueberall "hier schreibst du".

         Fokus verstaerkt die Linie auf 2px, das Polster darunter gibt einen
         Punkt ab — so bleibt die Gesamthoehe gleich und nichts springt.

         ACHTUNG, gemessen: §2 nennt --rz-akzent fuer die Fokuslinie. Auf
         Papier traegt der im hellen Theme nur 2.33:1 und reisst damit die
         3:1-Schwelle fuer nicht-textliche Bedienhinweise (WCAG 1.4.11) —
         ausgerechnet beim Fokus, und ausgerechnet nachdem der Systemring
         ausdruecklich abgeschaltet wird. Auf Papier zieht die Linie deshalb
         --rz-akzent-ink (7.63:1), auf Tiefgruen --rz-akzent (6.01:1). Der
         Kontrast-Waechter rechnet beide Paare mit. */
      .rz-feld{display:block;width:100%;box-sizing:border-box;
        border:0;border-bottom:1px solid var(--rz-hairline);border-radius:0;background:none;
        padding:13px 0 12px;min-height:46px;
        font-family:var(--rz-serif);font-size:var(--rz-fs-zeile);line-height:var(--rz-lh-caps);
        color:var(--rz-ink)}
      .rz-feld::placeholder{font-style:italic;color:var(--rz-gedimmt)}
      .rz-feld:focus{outline:none;border-bottom-width:2px;padding-bottom:11px;
        border-bottom-color:var(--rz-akzent-ink)}
      .rz-tiefgruen .rz-feld{border-bottom-color:var(--rz-hairline-gruen);color:var(--rz-ink-auf-gruen)}
      .rz-tiefgruen .rz-feld::placeholder{color:var(--rz-sek2-auf-gruen)}
      .rz-tiefgruen .rz-feld:focus{border-bottom-color:var(--rz-akzent)}
      /* Code-Eingabe: gesperrt gesetzt, damit sechs Ziffern zaehlbar bleiben. */
      .rz-feld-code{letter-spacing:.2em}

      /* ---- U6 (Turn 41 §1.2) / S115 · Pflicht-Screen ----
         Turn 41: kein Schleier, keine Karte, kein Radius — ein Schleier zeigt
         eine Umgebung, die man sieht und nicht erreichen kann.
         S115: Die Flaeche ist keine EINE Flaeche mehr. Der Screen traegt
         dieselbe Zweiteilung wie jeder andere (Papier oben, Tiefgruen unten,
         ab 900px nebeneinander) — er erbt sie vollstaendig von .rz-split und
         .rz-half und braucht dafuer keine einzige eigene Farb- oder
         Masszeile. Was hier steht, ist nur das, was ihn zum Screen UEBER der
         App macht.
         Kein max-width fuer eine Lesespalte mehr: die Halbierung ist die
         Lesebreite, auf dem Desktop wie auf dem Telefon.
         Die Bedien-Ecke wird nicht nur verdeckt, sondern stillgelegt: sie ist
         ein Ausgang, und es gibt (regulaer) keinen. */
      #pbEmailPflicht{position:fixed;inset:0;z-index:1000;overflow:auto}
      html[data-pflicht] .rz-ecke{display:none}

      /* ---- U5 (Handover Turn 41 §2, §5.2–5.4) · Wiedereinstieg ----
         Die Felder tragen die Feldkante aus U1, die Knoepfe sind
         Hairline-Zeilen wie ueberall. Rohe Farben und Radien sind ersatzlos
         entfallen — im System gibt es hier keine.
         §5.4 · pin und ok verschwanden per display:none und kamen bei
         abgelaufenem Code wieder: der Screen sprang in der Hoehe, im Vollbild
         waere das eine grosse Bewegung. Jetzt bleiben sie stehen und werden
         stummgeschaltet — der Ablauf bleibt sichtbar. */
      .rz-rec-schritt{margin-top:var(--rz-r-5)}
      .rz-rec-schritt[aria-disabled=true]{opacity:.45}
      .rz-rec-schritt[aria-disabled=true] .rz-feld,
      .rz-rec-schritt[aria-disabled=true] .rz-zeile{pointer-events:none}
      /* §5.3 · Bestaetigung und Fehler standen im selben Element und in
         derselben Farbe. Getrennt wird jetzt ueber die Rolle, nicht ueber
         den Ton allein — der Ton kommt dazu. */
      .rz-rec-note{display:block;margin-top:var(--rz-r-2);
                   font-family:var(--rz-sans);font-size:var(--rz-fs-fein);color:var(--rz-sek)}
      .rz-rec-note[role=alert]{color:var(--rz-warn)}
      .rz-tiefgruen .rz-rec-note{color:var(--rz-sek2-auf-gruen)}

      /* §4.11 · Der Rahmensatz der Vorschau war ein textarea ohne Feldregel
         und erbte den Browser-Rahmen. Erster Nutzer der Feldkante. */
      .rz-ausw-rahmen{margin-top:10px;min-height:56px}
      /* ---- U4 (Handover Turn 41 §4.8–4.10) · Die Vorschau ----
         §4.8 · Der Ausschnitt — das, was tatsaechlich beim Leser ankommt,
         samt der Auslassung "…" — steht auf Papier. Der dunkle Kasten
         (.rz-teilen-block) faellt hier weg: er war ein Tiefgruen-Block
         mitten auf Papier, also eine Zone ohne Naht. Die Handlungen —
         Rahmensatz, die zwei Wege und der abschliessende Knopf — stehen
         unten in der Tiefgruen-Zone, wie die Leiste der Auswahl seit U3c.
         Die Klasse .rz-teilen-block bleibt bestehen — panels.js zeigt damit
         die Selbstmitteilung, und dort ist der Block richtig. */
      .rz-vorschau .rz-von{color:var(--rz-label);margin-bottom:var(--rz-r-2)}
      .rz-luecke{text-align:center;padding:4px 0;opacity:.7}

      /* §4.9 · Das "x" war 15px ohne Trefferflaeche, bei opacity:.6, direkt
         neben dem Text — und es ist die einzige Handlung dieses Screens, die
         etwas wegnimmt. Jetzt 44px, rechts, mit Abstand zum Text. */
      .rz-vorschau-zeile{display:flex;align-items:flex-start;gap:var(--rz-r-3);padding:6px 0}
      .rz-vorschau-zeile > div:first-child{flex:1;min-width:0}
      .rz-vorschau-frage{font-size:var(--rz-fs-fein);opacity:.75;margin-bottom:4px}
      .rz-vorschau-weg{flex:none;background:none;border:0;color:var(--rz-sek);
                       width:var(--rz-tapziel-finger);height:var(--rz-tapziel-finger);
                       min-height:var(--rz-tapziel-finger);
                       font-size:var(--rz-fs-zeile);line-height:1;padding:0;cursor:pointer}
      /* ---- U0 · Zwei Inline-Stile, die keine waren ----
         chat-kern.js · der Knopf neben der Fehlermeldung. 8px ist --rz-r-2. */
      #btnErneutSenden{margin-left:var(--rz-r-2)}

      /* platforms/cloudflare/pages/client.js · der Hinweis, dass eine neue
         Fassung bereitliegt. Er lag ausserhalb von core/ui und damit
         ausserhalb jeder Pruefung — mit rohen Farben, 14px Schrift und
         999px Radius. Schatten und Weichzeichner sind ersatzlos entfallen:
         beide kommen in der Turn-40-Sprache nicht vor. Die Pille grenzt sich
         jetzt ueber Haarlinie und Kartenflaeche ab, sie schwebt flacher. */
      #swUpdate{position:fixed;left:50%;bottom:calc(var(--rz-r-4) + env(safe-area-inset-bottom,0px));
        transform:translateX(-50%);z-index:99;background:var(--rz-karte);
        border:1px solid var(--rz-hairline);color:var(--rz-ink);
        border-radius:var(--rz-rund-pille);padding:var(--rz-r-2) var(--rz-r-4);
        font-family:var(--rz-sans);font-size:var(--rz-fs-fein);
        display:flex;gap:var(--rz-r-3);align-items:center}
      #swUpdate button{font-family:var(--rz-sans);font-size:var(--rz-fs-fein);cursor:pointer;
        border:0;border-radius:var(--rz-rund-pille);padding:var(--rz-r-1) var(--rz-r-3);
        background:var(--rz-akzent);color:var(--rz-auf-akzent)}

      .rz-teilen-block{background:var(--rz-tiefgruen);color:var(--rz-ink-auf-gruen);
        padding:18px 20px;margin:12px 0}
      .rz-teilen-block .rz-von{color:var(--rz-label-auf-gruen);margin-bottom:8px}
      .rz-teilen-text{font-family:var(--rz-serif);font-size:var(--rz-fs-zeile);font-weight:300;
        line-height:var(--rz-lh-fein);margin:0}
      .rz-teilen-text::before{content:'„'}
      .rz-teilen-text::after{content:'“'}
      /* §4.10 · Die Wege waren nackte Systemkaestchen — das einzige Stueck UI
         im Set mit Fremdgestalt. Jetzt eine Haarlinien-Zeile wie ueberall,
         44px hoch, mit dem Kaestchen links.
         Das Kaestchen bleibt ein echtes <input type=checkbox>: eine
         nachgebaute Marke muesste den Haken selbst zeichnen, und ein
         handgezeichneter Haken, der vom System abweicht, ist der
         schlechtere Tausch. accent-color faerbt ihn ein. */
      .rz-wahl{display:flex;align-items:center;gap:var(--rz-r-3);
        font-size:var(--rz-fs-fein);margin:0;padding:0;
        min-height:var(--rz-tapziel-finger);cursor:pointer;
        border-top:1px solid var(--rz-hairline)}
      .rz-wahl input[type=checkbox]{flex:none;width:18px;height:18px;margin:0;
        accent-color:var(--rz-tiefgruen)}
      .rz-tiefgruen .rz-wahl{border-top-color:var(--rz-hairline-gruen)}
      .rz-tiefgruen .rz-wahl input[type=checkbox]{accent-color:var(--rz-akzent)}
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
      /* T2e-Nachzug · Vom Kontrast-Waechter gefunden, nicht vom Handover: der
         Sprachknopf trug seine Beschriftung auf --rz-gedimmt (2.30:1). Das ist
         ein Bedienelement mit Text, keine Zier — jetzt --rz-sek (4.70:1).
         Der aktive Zustand musste mit: auf --rz-akzent-hell lag er bei 2.94:1
         und waere nach der Korrektur SCHWAECHER gewesen als der inaktive —
         der Zustand haette sich verkehrt herum gelesen. --rz-akzent-ink ist
         der Akzent in seiner Schriftrolle (7.63:1) und traegt hier richtig. */
      .rz-sprachknopf{border:1px solid var(--rz-hairline);background:var(--rz-papier);
        color:var(--rz-sek);cursor:pointer;border-radius:0;padding:6px 10px;min-height:0;
        font-family:var(--rz-sans);font-size:var(--rz-fs-caps);font-weight:600;letter-spacing:.1em;
        display:inline-flex;align-items:center;gap:5px}
      .rz-sprachknopf .an{color:var(--rz-akzent-ink)}
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
      /* T2c (Handover Turn 40 §3.1) ist mit S121.1 ENTFALLEN.
         Die Regel machte die obere Zone zum eigenen Rollbereich, damit ihr
         Inhalt auf niedrigen Geraeten nicht in die Naht lief
         (min-height:0 + overflow:auto + overscroll-behavior:contain).
         Sie war die Ursache des gemeldeten Befunds: In diesem Rollbereich
         liess sich am Geraet nur die Bildlaufleiste ziehen, nicht wischen —
         waehrend die zweite Zone, die ueber das Dokument rollt, normal
         reagierte. Turn 48 §2.1 loest das an der Wurzel: Es gibt keine
         Innen-Rollbereiche mehr, die Seite selbst rollt, und die obere Zone
         darf so lang werden, wie ihr Inhalt ist.
         Der Zonenfuss haelt seinen Badge-Abstand weiterhin ueber das
         T2b-Polster; er liegt jetzt nur nicht mehr in einem Rollbereich. */
      .rz-regal-reihen{display:flex;flex-direction:column;min-height:0}
      .rz-fuss-kopf{display:flex;align-items:baseline;justify-content:space-between;gap:12px}
      /* ---- D12-2b (Turn 27) · die geklickte Zeile IST die Sektion ----
         D9 hatte den Weg nach oben an die Zonen-Ueberschrift gehaengt und der
         offenen Zeile den Pfeil genommen. Turn 27 dreht das um: aufgeklappt
         verschwinden Zonentitel und Geschwisterzeilen, und die geklickte Zeile
         steht als Ueberschrift oben — mit ihrem Pfeil, jetzt nach oben. */
      /* ============ S121.6 · Das Regal ist ein Akkordeon ============
         Bis hierher war das offene Regal eine VOLLBILD-Flaeche: Screen auf
         100dvh genagelt, beide Haelften absolut positioniert, ihre Masse zur
         Laufzeit gemessen (zwei Masse fuer Zonenhoehe und Kopfzeile), und der
         Inhalt mit eigenem Rollbereich — denn absolute Elemente lassen den
         Rahmen nicht wachsen. (Die Namen der beiden Masse stehen hier
         bewusst nicht: Waechter greifen ueber den CSS-Text, Kommentare
         eingeschlossen.) Das war ein eigenes kleines Layout-System (Q2, Q3/Q3a,
         U11.2, D12-2b, S114d.3, S114h/i).
         Nichts davon wird noch gebraucht. Die Zone waechst mit ihrem Inhalt,
         das Dokument rollt (Turn 48 §2.1), und das Oeffnen ist ein Akkordeon:
         Die uebrigen Zeilen bleiben STEHEN, statt zu verschwinden.
         Animiert wird grid-template-rows von 0fr auf 1fr — der einzige Weg,
         eine unbekannte Inhaltshoehe weich zu oeffnen, ohne sie vorher zu
         messen. scaleY scheidet aus (verzerrt Text, clippt an Rollbereichen,
         S114g), max-height braeuchte eine geratene Obergrenze. */
      .rz-regal-inhalt{display:grid;grid-template-rows:0fr;min-height:0;
        transition:grid-template-rows .34s var(--rz-kurve)}
      .rz-regal-inhalt:not(.pb-hidden){grid-template-rows:1fr}
      .rz-regal-inhalt>*{overflow:hidden;min-height:0}
      /* Der Kasten selbst traegt keinen Rand mehr: Im geschlossenen Zustand
         ist er null hoch, ein Rand waere eine Linie ohne Inhalt. */
      .rz-regal-inhalt{padding:0;border-bottom:0}
      .rz-regal-offen .rz-zeile.rz-auf{border-bottom-color:var(--rz-hairline-gruen)}

      /* S121.6 · Mobil: Beim Oeffnen tritt die obere Zone zurueck und KLEBT als
         Ganzes — sie besteht dann nur noch aus Kopfzeile und Ueberschrift.
         Die ganze Haelfte kleben zu lassen statt einzelner Zeilen spart jede
         Versatzrechnung: Ein Stapel klebender Geschwister braeuchte die Hoehe
         des jeweils darueberliegenden als Offset, und genau solche
         Differenzrechnungen laufen beim naechsten Rastermass auseinander.
         Das Polster bleibt stehen: Wird es beim Oeffnen entfernt, springt die
         Ueberschrift um genau dieses Mass nach oben. */
      @media(max-width:899px){
        .rz-regal-offen>.rz-half:first-child{position:sticky;top:0;z-index:8;flex:none;
          padding-bottom:0;cursor:pointer}
        .rz-regal-offen>.rz-half:first-child>:not(.rz-kopf):not(.rz-caps){display:none}
      }
      /* Desktop: die Papier-Spalte klebt, solange ein Fach offen ist — sonst
         liefe sie als leere Flaeche weg, waehrend rechts die Liste durchzieht.
         Unabhaengig von der Messung aus S121.2: Bei offenem Fach ist die
         zweite Haelfte per Definition die laengere. */
      @media(min-width:900px){
        .rz-regal-offen>.rz-half:first-child{position:sticky;top:0;height:100dvh;
          align-self:flex-start}
        /* S125 · Und ihre Zeilen bleiben, wo sie waren. Zugeklappt haelt die
           Flanke (Q3a) den Zonenfuss an der Naht: .rz-fuss{margin-bottom:50dvh}
           — die Regel gilt aber nur :not(.rz-regal-offen). Faellt sie beim
           Oeffnen weg, sackt der Fuss (margin-top:auto) an den unteren Rand,
           und die halbe Seite springt, die gar nicht gemeint war.
           S114h hatte genau das schon einmal geloest; S121.6 hat die Zeile mit
           der Vollbild-Mechanik verworfen, obwohl sie mit ihr nichts zu tun
           hatte. Hier steht sie wieder — diesmal aus eigenem Grund. */
        .rz-regal-offen>.rz-half:first-child .rz-fuss{margin-bottom:50dvh}
      }
      .rz-half{transition:transform .36s var(--rz-kurve)}
      /* D12-2b · Der Wegweiser blendet NICHT mehr ab: er haengt per rz-auf-naht
         an der Oberkante der Regal-Zone und faehrt mit ihr nach oben, bis er
         unter der Kopfzeile sitzt. Nur die Kulisse tritt ab — sie haengt am
         Zonenfuss, der gerade unterwegs ist. */
      .rz-regal-offen .rz-kulisse-fuss{opacity:0;pointer-events:none;transition:opacity .2s ease}
      /* S114.8 · Bei aufgeklapptem Regal ordnet die Zone neu; ein Panel, das
         sich jetzt aus der Naht faltet, legt sich quer ueber das Layout. Das
         Badge bleibt sichtbar (es markiert weiter die Naht), nimmt aber keine
         Klicks mehr an. pointer-events allein reicht nicht — die Tastatur
         kaeme weiter durch; deshalb setzt regalModus() zusaetzlich disabled. */
      /* S114.8/S114j · Bei aufgeklapptem Regal ist das Badge MOBIL still: dort
         faehrt es mit der Kante der Zone nach oben (D12-2b), und ein Panel,
         das sich aus einer wandernden Kante faltet, legt sich quer.
         Auf dem Desktop faehrt es nicht mit — es markiert die Naht und bleibt
         auf 50dvh stehen (Q3). Dort gibt es nichts zu sperren, und die Sperre
         war sogar schaedlich: Der Klick fiel durch das Badge hindurch, traf
         rechts die Regal-Zone (nichts) und links die andere Haelfte, was das
         Regal schloss. Der Wegweiser oeffnet dort jetzt wie immer. */
      /* S125 · Das Badge lag im offenen Regal auf z-index:6 — die klebende obere
         Zone liegt seit S121.6 auf 8, also verschwand es dahinter. Die 6 stammt
         aus der Zeit, als die Zone eine absolut positionierte Flaeche war und
         das Badge nur ueber IHR liegen musste. Jetzt gilt dieselbe Zahl wie
         sonst: ueber der Zone, unter dem Panel. */
      .rz-regal-offen .rz-weg-badge{z-index:9;pointer-events:none}
      .rz-regal-offen>.rz-half:last-child .rz-fuss{display:none}
      .rz-regal-offen .rz-regal-inhalt:not(.pb-hidden){animation:rzEinblenden .28s .08s both}
      .rz-regal-offen .rz-regal-reihen{flex:1 1 auto}
      /* Akkordeon: der Inhalt waechst aus dem Trennstrich unter seiner Zeile
         hervor — freigelegt per clip-path, ohne den Text zu verzerren. */
      .rz-regal-inhalt:not(.pb-hidden){animation:rzAufklappen .32s var(--rz-kurve) both}
      .rz-regal-offen .rz-regal-inhalt:not(.pb-hidden){
        flex:1 1 auto;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;border-bottom:0}
      /* U11.2 · Die Bildlaufleiste des aufgeklappten Regals gehoert an den
         SCHIRMRAND, nicht an die Kastenkante.
         Dass der Inhalt IN der Zone rollt, bleibt richtig (die Seite soll
         nicht wachsen, s. o.) — falsch war nur, wo die Leiste dabei sitzt:
         .rz-half traegt seitlich --rz-rand Polster, also stand sie um dieses
         Mass eingerueckt mitten im Papier.
         Der Rollbereich reicht jetzt bis an die Zonenkante; das Polster
         wandert nach innen und bleibt damit sichtbar erhalten. */
      .rz-regal-offen .rz-regal-inhalt:not(.pb-hidden){
        margin-left:calc(-1 * var(--rz-rand));margin-right:calc(-1 * var(--rz-rand));
        padding-left:var(--rz-rand);padding-right:var(--rz-rand);
        scrollbar-gutter:stable}
      @keyframes rzAufklappen{
        from{clip-path:inset(0 0 100% 0);opacity:.4}
        to{clip-path:inset(0 0 0 0);opacity:1}}
      @keyframes rzEinblenden{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
      /* Die Erklaerzeile am Fuss des offenen Kastens (regal.intro): leise,
         ueber einer Hairline, unter den Eintraegen. */
      .rz-regal-fussnote{border-top:1px solid var(--rz-hairline-gruen);padding-top:14px;margin-top:18px}

      /* ============ U8 · Chronik-Eintrag und Leseansicht ============ */
      /* U8.2 · Kopfzeile des Eintrags. Schlagwort und Weite auf EINER Zeile,
         die Weite als Subtitle — sie ordnet ein, sie ist nicht die Sache. */
      .rz-zl-kopf{display:flex;flex-wrap:wrap;align-items:baseline;gap:0;margin-bottom:var(--rz-r-1)}
      .rz-zl-text{margin-bottom:var(--rz-r-2)}

      /* U8.4 · Die Leseansicht ist eine Ansicht wie das Regal, kein Anhang.
         Fullbleed: Der Eintragskasten hat links/rechts kein eigenes Polster,
         die Zone traegt den Rand — sonst stuende der Verlauf zweifach
         eingerueckt in einer ohnehin schmalen Spalte.
         Sprechgruppen werden durch Haarlinien getrennt statt durch Blasen:
         Ein abgeschlossenes Gespraech ist Protokoll, kein laufender Chat, und
         Sprechblasen laden zum Antworten ein, wo es nichts zu antworten gibt. */
      #boxLesen{padding-left:0;padding-right:0}
      #lesenInhalt{display:flex;flex-direction:column;gap:0}
      #lesenInhalt .pb-msg{background:none;border:0;border-radius:0;max-width:none;
        padding:var(--rz-r-3) 0;margin:0;border-top:1px solid var(--rz-hairline-gruen)}
      #lesenInhalt>*:first-child,#lesenInhalt .rz-sprechgruppe:first-child .pb-msg:first-of-type{border-top:0}
      #lesenInhalt .rz-sprechgruppe{display:flex;flex-direction:column}
      #lesenInhalt .rz-sprechgruppe .pb-msg~.pb-msg{border-top:0;padding-top:0}
      #lesenInhalt .rz-sprecher{margin-top:var(--rz-r-3);padding-top:var(--rz-r-3);
        border-top:1px solid var(--rz-hairline-gruen)}
      #lesenInhalt .rz-sprechgruppe:first-child .rz-sprecher{border-top:0;margin-top:0;padding-top:0}
      #lesenInhalt .rz-sprechgruppe .pb-msg{border-top:0}
      #lesenInhalt .rz-echo{margin:var(--rz-r-2) 0}

      /* U8.5 · Der Fuss: eine Zeile ueber einer Haarlinie, Wege als Links.
         Umbruchfaehig, damit auf schmalen Geraeten nichts abgeschnitten wird;
         der leise Weg (Loeschen) rutscht dann nach unten, nicht aus dem Bild. */
      .rz-lesen-fuss{display:flex;flex-wrap:wrap;gap:var(--rz-r-4);align-items:baseline;
        border-top:1px solid var(--rz-hairline-gruen);padding-top:var(--rz-r-3);margin-top:var(--rz-r-4)}
      .rz-lesen-fuss .pb-link{min-height:var(--rz-tapziel);display:inline-flex;align-items:center}
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

/** Laeuft die App als installierte PWA (eigenes Fenster statt Browser-Tab)?
 *  Reine Funktion ueber dem window-Objekt: display-mode aus dem Manifest
 *  (standalone) oder das aeltere iOS-Signal navigator.standalone. */
export function istStandalone(win) {
  if (!win) return false;
  try {
    if (typeof win.matchMedia === "function" && win.matchMedia("(display-mode: standalone)").matches) return true;
  } catch { /* z. B. sehr alte Engines */ }
  return win.navigator ? win.navigator.standalone === true : false;
}

/* D1 · Wegweiser-Panel-Verdrahtung (Grundbaustein C). Oeffnen per Tap aufs
 * Badge, Schliessen per Tap irgendwohin — das Badge stoppt die Propagation,
 * damit derselbe Tap das Panel nicht sofort wieder schliesst. Der Dokument-
 * Listener wird nur EINMAL gesetzt (Marker am document), egal wie viele
 * Badges es gibt; er schliesst alle offenen Panels. Ab D2 von den Screens
 * benutzt. */
/* S114j · Die Zweiteilung beginnt bei 900px — dieselbe Zahl wie in den
   @media-Bloecken oben. Sie steht hier, damit CSS und JS sie an einer Stelle
   lesen; wer sie aendert, aendert beide. Fehlt matchMedia (aeltere WebViews,
   Testumgebungen), gilt der schmale Fall: lieber sperren als eine Kante
   bedienbar lassen, die gerade wandert. */
export function istZweispaltig(doc) {
  const win = doc && doc.defaultView;
  if (!win || typeof win.matchMedia !== "function") return false;
  try { return win.matchMedia("(min-width:900px)").matches; }
  catch { return false; }
}

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

/** Feste Bedien-Ecke oben rechts: der Weg zu den Einstellungen. */
/* D12-2d · Die Bedien-Ecke traegt EIN Zeichen: Baum bei Hell, Seerose bei
   Dunkel — dieselbe Paarung wie Kulisse und .pb-baeume/.pb-seerosen.
   U7 (Turn 41 · Nachtrag 1.1) · Das aufklappende Blatt ist entfallen; die
   Einstellungen sind ein eigener Screen. Der Knopf fuehrt jetzt dorthin,
   statt ein Panel zu oeffnen — deshalb aria-haspopup weg.
   Der Punkt am Zeichen zeigt weiterhin einen offenen Sprachantrag des
   Partners. Er wird dadurch eher wichtiger: der Ort liegt jetzt weiter weg,
   und ohne den Punkt gaebe es keinen Hinweis, dass dort etwas wartet.
   (Der frueher hier vermerkte Wirt fuer eine Push-Glocke war ein Irrtum im
   Kommentar — eine Glocke hat es nie gegeben.) */
export const CHROME_HTML = String.raw`<div class="rz-ecke pb-theme" role="group">
      <button id="pbEinst" class="rz-einst" type="button">
        <span class="rz-einst-baum">${zeichen("baum", { groesse: 20 })}</span>
        <span class="rz-einst-seerose">${zeichen("bluete", { groesse: 20 })}</span>
        <span class="rz-punkt pb-hidden" id="pbEinstPunkt"></span>
      </button>
    </div>`;

export function applyDesign(doc) {
  // D12-2d · Der Waechter galt frueher fuer die GANZE Funktion. Das war
  // brauchbar, solange nur das Stylesheet daranhing — aber die Bedien-Ecke
  // lebt im Body, und wer den Body neu baut (Huellenwechsel, Relaunch), stand
  // ohne Ecke da, weil das Stylesheet im Head ueberlebt hatte. Jetzt wacht
  // jeder Teil ueber sich selbst.
  if (!doc.getElementById("pbDesign")) {
    // Standalone-Haken (M3): CSS kann per html[data-standalone] reagieren —
    // z. B. kuenftige Installations-Hinweise ausblenden, wenn schon installiert.
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
