// L3 · Fristen rund um den Zugang — EINE Quelle fuer Worker und Oberflaeche.
//
// Die Gueltigkeit des Wiedereinstiegs-Links stand bis hierher nur in
// platforms/cloudflare/worker/auth.js. Der Screen, der sie dem Menschen
// NENNT ("Der Link gilt 15 Minuten"), lebt aber im Client — und haette die
// Zahl als Literal im Text getragen. Genau so entstehen stille Divergenzen:
// wer die Frist im Worker verkuerzt, aendert den Text nicht mit, und die
// Oberflaeche behauptet danach etwas Falsches.
//
// Deshalb liegt der Wert hier, wo beide Seiten ihn importieren koennen, und
// die Oberflaeche reicht die Minuten als i18n-ARGUMENT herein statt sie
// auszuschreiben. tests/unit/l3-2-* wacht darueber.

/** Wiedereinstiegs-Link: kurzlebig, on demand. */
export const RECOVER_MS = 15 * 60 * 1000;

/** Dieselbe Frist in ganzen Minuten — die Form, in der ein Mensch sie liest. */
export const RECOVER_MINUTEN = Math.round(RECOVER_MS / 60000);
