// S120 · Die Gestalt der Mails.
//
// Bis hierher ging alles als nackter Text raus. Das war nicht falsch — Text
// kommt überall an —, aber es war auch das Einzige, was die Menschen von
// raumzuzweit außerhalb der App je zu sehen bekamen: ein Bestätigungscode
// ohne Absender, ohne Wortmarke, ohne Zusammenhang. Wer den Zugangslink
// bekommt, hat die App noch nie gesehen.
//
// Zwei Entscheidungen tragen dieses Modul:
//
// 1 · DIE GESTALT ENTSTEHT AUS DEM TEXT, nicht neben ihm.
//     Der naheliegende Weg wären HTML-Vorlagen je Mailart gewesen — vier
//     Stück, dazu der freie Betreiber-Rundbrief. Damit gäbe es jeden Satz
//     zweimal: einmal als i18n-Schlüssel, einmal im Markup. Zwei Fassungen
//     desselben Satzes driften; das ist keine Vermutung, sondern die Erfahrung
//     aus jedem Projekt, das es so gemacht hat. Stattdessen liest `baueHtml`
//     den fertigen Text und erkennt seine drei Gestalten:
//       · eine Zeile aus 4–8 Ziffern      → der Bestätigungscode
//       · eine Zeile, die nur ein Link is → die Zugangs-Zeile
//       · alles andere                    → ein Absatz
//     Die i18n-Schlüssel bleiben die einzige Quelle. Neue Mailarten und der
//     freie Rundbrief bekommen die Gestalt geschenkt, ohne dass jemand daran
//     denken muss.
//
// 2 · KEIN EIGENES FARBLITERAL. Die Werte werden aus THEME_CSS gelesen, nicht
//     abgeschrieben. Eine abgeschriebene Palette ist eine zweite Palette, und
//     die T1b-Kanarie hat für den Client längst festgestellt, wohin das führt.
//     Diese Datei steht deshalb selbst mit auf der Prüfliste des Wächters.
//
// Was bewusst FEHLT: Bilder (werden von Haus aus blockiert und wären ohne
// Alternative eine leere Fläche), Webfonts (laden in kaum einem Mailprogramm),
// Radien und Schatten (gibt es in dieser Designsprache ohnehin nicht). Übrig
// bleibt, was die App auch ausmacht: Papier, eine Haarlinie, Serifentitel,
// gesperrte Wortmarke. Das ist der Grund, warum diese Gestaltung in Outlook
// überlebt — sie besteht aus nichts, was kaputtgehen kann.

import { THEME_CSS } from "../../../core/ui/theme.js";
import { de as woerterbuchDe } from "../../../core/i18n/de.js";

/* Nur der :root-Block. Danach folgen im Theme die Dunkel-Überschreibungen —
   eine Mail ist immer hell, denn welches Programm sie in welchem Modus
   anzeigt, weiß hier niemand. */
const WURZEL = THEME_CSS.slice(THEME_CSS.indexOf(":root{"), THEME_CSS.indexOf("}", THEME_CSS.indexOf(":root{")));

function tok(name) {
  const m = WURZEL.match(new RegExp("--rz-" + name + "\\s*:\\s*([^;]+)"));
  if (!m) throw new Error("Theme-Token fehlt: --rz-" + name);   // fail-closed: lieber laut als grau
  return m[1].trim();
}

export const MAIL_TOKEN = {
  papier: tok("papier"),
  tiefgruen: tok("tiefgruen"),
  ink: tok("ink"),
  sek: tok("sek"),
  hairline: tok("hairline"),
  marke: tok("marke"),
  serif: tok("serif"),
  sans: tok("sans"),
};

const schuetze = s => String(s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const IST_CODE = /^\d{4,8}$/;
const IST_LINK = /^https?:\/\/\S+$/;

/**
 * Baut die HTML-Fassung einer Mail aus ihrem Klartext.
 * Marke und Fußzeile kommen als fertige Zeichenketten herein — die Sprache
 * des Paars kennt nur der Aufrufer (R7, mailText). Fehlen sie, fällt es auf
 * Deutsch zurück, wie t() im Client.
 * @param {{betreff: string, text: string, marke?: string, fuss?: string}} arg
 */
export function baueHtml({ betreff, text, marke, fuss }) {
  const wortmarke = schuetze(marke || woerterbuchDe["allg.marke"]);
  const fusszeile = schuetze(fuss || woerterbuchDe["mail.fuss"]);
  const t = MAIL_TOKEN;

  const bloecke = String(text).replace(/\r\n/g, "\n").split(/\n{2,}/)
    .map(b => b.trim()).filter(Boolean);

  const rumpf = bloecke.map(b => {
    if (IST_CODE.test(b))
      return '<p style="margin:26px 0;font-family:' + t.serif + ';font-size:30px;font-weight:300;'
        + "letter-spacing:.22em;color:" + t.ink + ';text-align:center">' + schuetze(b) + "</p>";
    if (IST_LINK.test(b))
      return '<p style="margin:22px 0;padding:14px 16px;border:1px solid ' + t.hairline + ";"
        + "font-family:" + t.sans + ';font-size:15px;word-break:break-all">'
        + '<a href="' + schuetze(b) + '" style="color:' + t.tiefgruen + ';text-decoration:none">'
        + schuetze(b) + "</a></p>";
    // Einfache Zeilenumbrüche innerhalb eines Absatzes bleiben Umbrüche —
    // im Rundbrief des Betreibers ist Zeilenführung Absicht.
    return '<p style="margin:14px 0;font-family:' + t.sans + ";font-size:15px;line-height:1.62;color:"
      + t.ink + '">' + schuetze(b).replace(/\n/g, "<br>") + "</p>";
  }).join("");

  /* Tabellen statt moderner Auszeichnung: nicht aus Nostalgie, sondern weil
     Outlook den Inhalt sonst über die ganze Fensterbreite zieht. */
  return "<!doctype html><html><head><meta charset=\"utf-8\">"
    + '<meta name="viewport" content="width=device-width">'
    + "<title>" + schuetze(betreff) + "</title></head>"
    + '<body style="margin:0;padding:0;background:' + t.papier + '">'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"'
    + ' style="background:' + t.papier + '"><tr><td align="center" style="padding:34px 18px 44px">'
    + '<table role="presentation" width="520" cellpadding="0" cellspacing="0" border="0"'
    + ' style="width:100%;max-width:520px;text-align:left">'
    + '<tr><td style="padding-bottom:22px;border-bottom:1px solid ' + t.hairline + '">'
    + '<span style="font-family:' + t.sans + ";font-size:11px;letter-spacing:.19em;text-transform:uppercase;color:"
    + t.marke + '">' + wortmarke + "</span></td></tr>"
    + '<tr><td style="padding-top:24px">'
    + '<h1 style="margin:0 0 6px;font-family:' + t.serif + ";font-size:24px;font-weight:300;line-height:1.28;color:"
    + t.ink + '">' + schuetze(betreff) + "</h1>"
    + rumpf + "</td></tr>"
    + '<tr><td style="padding-top:30px;border-top:1px solid ' + t.hairline + ";font-family:" + t.sans
    + ";font-size:11px;line-height:1.6;color:" + t.sek + '">'
    + fusszeile + "</td></tr>"
    + "</table></td></tr></table></body></html>";
}
