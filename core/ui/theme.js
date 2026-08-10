// T1 · Theme-Schicht — der EINE Ort, an dem Farbe, Schrift, Abstand und Radius
// gesetzt werden. design.js bringt die Komponentenregeln und stellt diese
// Datei voran; jedes Theme (heute: dark) ueberschreibt ausschliesslich hier.
//
// Die Engine ist bewusst kein eigener Mechanismus, sondern CSS-Custom-
// Properties mit Ueberschreibblock — der Dark-Mode belegt seit D1, dass das
// traegt. Was gefehlt hat, war der Ort und die Vollstaendigkeit.
//
// Regel fuer Beitraege: KEIN Farbliteral, KEINE nackte Schriftgroesse und
// kein roher Radius ausserhalb dieser Datei. tests/unit/t1b-theme.spec.js
// wacht darueber, so wie der i18n-Kanarientest ueber die Texte wacht.

export const SCHRIFT_IMPORT =
  "@import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,300;0,8..60,400;0,8..60,600;1,8..60,300&family=Instrument+Sans:wght@400;500;600&display=swap');";

export const THEME_CSS = String.raw`
      :root{
        /* D1/T1e/T1g · EIN Namensraum, EINE Palette. Der alte pb-Bestand ist
           nicht nur umbenannt, sondern nach ROLLE verschmolzen: Feldtinte ist
           Tinte, Knopfflaeche ist Akzentflaeche, die eigene Sprechblase traegt
           denselben Akzent. Wo zwei Token dieselbe Rolle spielten, hat der
           D1-Wert gewonnen — die Aenderungen stehen im Protokoll T1g. */
        --rz-serif:'Source Serif 4',Georgia,'Times New Roman',serif;
        --rz-sans:'Instrument Sans',system-ui,-apple-system,sans-serif;
        --rz-papier:#faf8f2;
        --rz-hairline:#e3dfd0;--rz-hairline-gruen:rgba(157,176,143,.28);
        --rz-tiefgruen:#1e2a22;
        --rz-ink:#23291f;--rz-ink-auf-gruen:#eef0e7;--rz-ink2-auf-gruen:#e6e9d9;
        --rz-sek:#6b7261;--rz-sek2:#8b917d;--rz-sek-auf-gruen:#b9c3ac;--rz-sek2-auf-gruen:#8a9e7c;
        --rz-gedimmt:#a3a894;--rz-marke:#5c6653;--rz-marke-auf-gruen:#6f8062;
        --rz-akzent:#8fae74;--rz-akzent-text:#14201a;--rz-akzent-hell:#7d9b62;
        --rz-pfeil:#7d9b62;--rz-pfeil-auf-gruen:#a9c88b;
        --rz-label:#7d9b62;--rz-label-auf-gruen:#9db08f;--rz-nutzer:#41562c;
        /* Kulisse/Zeichen: Baum auf Papier, Teich auf Tiefgruen, Wasserlinie. */
        --rz-kulisse-baum:#7d9b62;--rz-kulisse-teich:#8fae74;--rz-kulisse-wasser:#ffffff;
        /* Hinweisblatt (Wiedereinstieg): warmes Papier mit eigenem Rand. */
        --rz-hinweis-flaeche:#fbf7e4;--rz-hinweis-rand:#e2d9a8;
        --rz-akzent-ink:#41562c;--rz-auf-akzent:#ffffff;
        /* U8.3 · Inline-Links. Bis hierher war .pb-link nur eine gepunktete
           Unterlinie in Fliesstextfarbe — im Fliesstext praktisch unsichtbar,
           und auf Tiefgruen erst recht. Zwei Rollen, weil die Zeitleiste und
           die Leseansicht in der GRUENEN Zone liegen: derselbe Stil braucht
           dort einen eigenen Ton, sonst faellt er gegen das Papier-Gruen
           zusammen. Beide Werte liegen ueber 4.5:1 auf ihrem Grund. */
        --rz-link:#35591f;--rz-link-auf-gruen:#b7d69a;
        --rz-karte:rgba(255,255,255,.60);--rz-karte-rand:rgba(90,110,80,.15);
        --rz-blase-du:rgba(255,255,255,.72);--rz-blase-du-rand:rgba(90,110,80,.13);
        --rz-feld:rgba(255,255,255,.74);--rz-feld-rand:rgba(90,110,80,.22);
        /* U2/U3 · Eine Stufe vom Boden abgehoben. Zwei Rollen, dieselbe
           Stufe: der aufgeklappte Wegweiser (§3) und das gewaehlte Paar in
           der Freigabe (§4.2). Hell einen Ton dunkler als Papier, dunkel
           einen Ton heller — die Richtung dreht, die Geste bleibt.
           Mehr Abstand geht auf Papier nicht, ohne --rz-sek den Kontrast zu
           nehmen; die Rechnung steht in SPRINT-U2-PROTOKOLL.md §2. */
        --rz-flaeche-hoch:#f7f4ed;
        /* U5 (Handover Turn 41 §5.3) · Fehlermeldungen standen in derselben
           Farbe wie Bestaetigungen — ein Fehler sah aus wie eine Zusage.
           Ein Ton aus der warmen Ecke der Palette, in beiden Themes ueber
           4.5:1 auf Papier UND auf der abgehobenen Flaeche. */
        --rz-warn:#8c3a2b;
        /* ---- T1b · Typo-Skala. Die Streuner (10/12/13.5/14.5/15.5/16/16.5/
           19/20/26 px) sind auf diese sechs Stufen gezogen; die Zuordnung
           steht im Sprintprotokoll. ---- */
        --rz-fs-caps:11px;      --rz-lh-caps:1.3;
        --rz-fs-fein:13px;      --rz-lh-fein:1.5;
        --rz-fs-text:15px;      --rz-lh-text:1.65;
        --rz-fs-zeile:17px;     --rz-lh-zeile:1.4;
        --rz-fs-sektion:24px;   --rz-lh-sektion:1.2;
        --rz-fs-titel:30px;     --rz-lh-titel:1.18;
        /* line-height:0 und :1 bleiben rohe Werte: das sind Layout-Angaben
           (Icon-Zeilen, Knopfhoehen), keine Lesetypografie. Der Waechter
           laesst genau diese beiden durch. */

        /* ---- Abstaende. Alles Vielfache von 4; --rz-rand ist der Screenrand. ---- */
        --rz-r-1:4px;  --rz-r-2:8px;  --rz-r-3:12px;
        --rz-r-4:16px; --rz-r-5:24px; --rz-r-6:32px;
        --rz-rand:24px;
        /* T2b · Freiraum an der Naht: das Badge ragt 16px in die obere
           Zone, die Naht-Kulisse 84px. Der Zonenfuss haelt Abstand. */
        --rz-nahtfrei:32px;
        /* U7 (Nachtrag 3.5) · Die Naht-Kulisse ist 84px hoch — deutlich mehr
           als das Badge, fuer das --rz-nahtfrei gedacht war. Wo die Papier-Zone
           mit Text endet, braucht sie diesen Freiraum, sonst laufen die
           Silhouetten durch die letzten Zeilen. */
        --rz-kulissenfrei:96px;

        /* ---- Radien. Rund ist das Blatt, eckig die Zeile. ---- */
        --rz-rund-knopf:12px;
        --rz-rund-blatt:14px;
        --rz-rund-karte:18px;
        --rz-rund-pille:999px;
        --rz-rund-fein:4px;
        --rz-rund-mini:2px;

        /* ---- Bausteine ---- */
        --rz-tapziel:36px;              /* Mindesthoehe fuer Finger */
        /* T2f (Handover Turn 40 §3.8) · Die Bedien-Ecke darf mit 36px leise
           bleiben; die Hauptaktionen im Chat (Senden, Mikrofon) brauchen die
           volle Trefferflaeche. Optisch bleibt das Sende-Quadrat 34px. */
        --rz-tapziel-finger:44px;
        /* T2h · Lesebreite der Chat-Spalte. Steht hier, weil sie an ZWEI
           Stellen gebraucht wird: als max-width der Spalte und als
           Rechengroesse fuer das Ausbluten der Schreibkante. */
        --rz-chat-spalte:640px;
        --rz-hairline-staerke:1px;
        --rz-kurve:cubic-bezier(.2,.8,.2,1);
        --rz-dauer:.3s;
        --rz-dauer-kurz:.2s;
      }
      html[data-theme=dark]{
        /* D1 · Dark-Tokens: Papier wird Dark-Papier, Tiefgruen wird tiefer. */
        --rz-papier:#242b21;
        --rz-hairline:#39412f;
        --rz-tiefgruen:#101b14;
        --rz-ink:#ece9da;--rz-sek:#b9c3ac;--rz-sek2:#9aa38c;
        --rz-gedimmt:#7f8672;--rz-marke:#99a189;
        --rz-akzent-hell:#8fae74;--rz-pfeil:#a9c88b;
        --rz-label:#aeca8d;--rz-nutzer:#c4d8ab;
        --rz-hinweis-flaeche:#2b2f20;--rz-hinweis-rand:#4a4b2f;
        --rz-akzent:#aeca8d;--rz-akzent-ink:#e2ecd4;--rz-auf-akzent:#1d2a1a;
        --rz-karte:rgba(255,255,255,.055);--rz-karte-rand:rgba(255,255,255,.10);
        --rz-blase-du:rgba(255,255,255,.06);--rz-blase-du-rand:rgba(255,255,255,.09);
        --rz-feld:rgba(255,255,255,.06);--rz-feld-rand:rgba(255,255,255,.16);
        --rz-flaeche-hoch:#2c3428;--rz-warn:#e8ab99;
        --rz-link:#b7d69a;--rz-link-auf-gruen:#b7d69a;
      }
`;

/* S121 · Zugriff auf EINEN Ton der hellen Fassung, fuer Stellen ausserhalb des
   CSS: das PWA-Manifest, die theme-color-Metas und die Vor-Boot-Flaeche der
   Shell (die Sekunde, bevor app.js malt). Bis hierher standen dort eigene
   Literale — sichtbar als tuerkiser Blitz beim Start, wo laengst Papier und
   Tiefgruen gelten. Sie sollen den Wert BENUTZEN, nicht abschreiben.

   Bewusst nur der :root-Block: der Dark-Block belegt dieselben Namen erneut,
   ein naiver letzter Treffer haette die dunkle Fassung geliefert. */
export function ton(name) {
  const anfang = THEME_CSS.indexOf(":root{");
  const ende = THEME_CSS.indexOf("html[data-theme=dark]");
  const block = THEME_CSS.slice(anfang, ende > anfang ? ende : undefined);
  const treffer = block.match(new RegExp(`${name}\\s*:\\s*([^;]+);`));
  if (!treffer) throw new Error(`Ton ${name} steht nicht in theme.js`);
  return treffer[1].trim();
}
