// CR-4.3 · Zeitangaben fuer den Kontext, den das Modell liest.
// (Eigenes Modul, weil sessions.js und prozess.js es beide brauchen und
//  einander schon importieren.)

import { K } from "../prompts/prompts.js";
import { fuelle } from "../i18n/index.js";

/* ---- CR-4.3 · Zeitbezug im Kontext -------------------------------------------
 * Bis CR-4 stand im Kontext `at.slice(0, 10)`: das UTC-Datum, ohne Heute. Zwei
 * Folgen (Code-Review C19): Eine Sitzung um 00:30 Uhr erschien mit dem Vortag,
 * und "letzte Woche" oder "vor drei Tagen" konnte die Begleitung nur raten.
 * Jetzt: LOKALES Datum plus relative Angabe in Kalendertagen, in der Sprache
 * des Korpus (der Kontext ist Text fuers Modell, nicht Oberflaeche).
 * `jetzt` ist ein Parameter — Eval und Tests rechnen mit festem Heute. */
const zwei = n => String(n).padStart(2, "0");
export function lokalesDatum(at) {
  const d = at instanceof Date ? at : new Date(at);
  if (!at || isNaN(d.getTime())) return String(at || "").slice(0, 10);
  return d.getFullYear() + "-" + zwei(d.getMonth() + 1) + "-" + zwei(d.getDate());
}
export function relativImKontext(at, jetzt = new Date()) {
  const d = at instanceof Date ? at : new Date(at);
  if (!at || isNaN(d.getTime())) return "";
  const KT = key => K().korpusTexte[key];
  const tag = x => Date.UTC(x.getFullYear(), x.getMonth(), x.getDate());
  const n = Math.round((tag(jetzt) - tag(d)) / 86400000);
  if (n <= 0) return KT("zeit.heute");
  if (n === 1) return KT("zeit.gestern");
  if (n < 7) return fuelle(KT("zeit.vorTagen"), { n });
  if (n < 14) return KT("zeit.vorWoche");
  if (n < 28) return fuelle(KT("zeit.vorWochen"), { n: Math.floor(n / 7) });
  if (n < 60) return KT("zeit.vorMonat");
  if (n < 365) return fuelle(KT("zeit.vorMonaten"), { n: Math.min(11, Math.floor(n / 30)) });
  return KT("zeit.vorJahr");
}
/** "2026-07-27, vor 7 Tagen" — Datum und Abstand zum Heute. */
export function zeitImKontext(at, jetzt = new Date()) {
  const rel = relativImKontext(at, jetzt);
  return lokalesDatum(at) + (rel ? ", " + rel : "");
}
