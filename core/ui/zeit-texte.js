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
