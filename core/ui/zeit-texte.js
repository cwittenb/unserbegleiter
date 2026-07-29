// R4a · Zeitraum- und Rhythmus-Formulierungen.
//
// Herausgeloest aus app.js: reine Textwahl, haengt nur an i18n. "14 Tage"
// heisst hier "2 Wochen" — die App spricht in Wochen, wo Wochen gemeint sind.

import { t } from "../i18n/index.js";

/** Zeitraum einer Messrunde: 7 -> "eine Woche", 14 -> "2 Wochen", 10 -> "10 Tage". */
export function zeitraumText(days) {
  if (days === 7) return t("mess.zrWoche");
  if (days % 7 === 0) return t("mess.zrWochen", { w: days / 7 });
  return t("mess.zrTage", { n: days });
}

/** Dasselbe fuer den wiederkehrenden Rhythmus (eigene Formulierungen). */
export function rhythmusText(days) {
  if (days === 7) return t("messiv.rhWoche");
  if (days % 7 === 0) return t("messiv.rhWochen", { w: days / 7 });
  return t("messiv.rhTage", { n: days });
}

/* U8.1 · Relative Zeitangabe fuer die Zeitleiste ("vor 3 Tagen").
   KALENDERTAGE, nicht 24-h-Bloecke: Wer um 23:00 reflektiert und um 01:00
   nachliest, meint "gestern" — nicht "heute". Die Grenze, die Menschen im
   Kopf haben, ist Mitternacht, nicht die verstrichene Stunde.
   Ungueltiges oder fehlendes at gibt "" zurueck. Die Kopfzeile bleibt dann
   ohne Zusatz lesbar, statt "Invalid Date" zu tragen — eine Chronik ohne
   Datum ist immer noch eine Chronik.
   Monate deckeln bei 11: sonst stuende "vor 12 Monaten" direkt neben
   "vor einem Jahr" und die Leiter haette zwei Namen fuer dieselbe Weite. */
export function relativZeit(at, jetzt = new Date()) {
  if (!at) return "";
  const d = at instanceof Date ? at : new Date(at);
  if (isNaN(d.getTime())) return "";
  const tag = x => Date.UTC(x.getFullYear(), x.getMonth(), x.getDate());
  const n = Math.round((tag(jetzt) - tag(d)) / 86400000);
  if (n <= 0) return t("zeit.heute");
  if (n === 1) return t("zeit.gestern");
  if (n < 7) return t("zeit.vorTagen", { n });
  if (n < 14) return t("zeit.vorWoche");
  if (n < 28) return t("zeit.vorWochen", { w: Math.floor(n / 7) });
  if (n < 60) return t("zeit.vorMonat");
  if (n < 365) return t("zeit.vorMonaten", { m: Math.min(11, Math.floor(n / 30)) });
  if (n < 730) return t("zeit.vorJahr");
  return t("zeit.vorJahren", { j: Math.floor(n / 365) });
}
