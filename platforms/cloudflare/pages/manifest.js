// PWA-Manifest (M1) — generierende Quelle, damit Name/Farben aus EINER Stelle
// kommen. Strings leben in den i18n-Wörterbüchern (pwa.*); der Paritäts-Wächter
// (i18n-woerterbuecher.spec) erzwingt de/en-Gleichstand. Das Web-App-Manifest
// selbst ist einsprachig — Referenzsprache Deutsch (lang: "de"), analog zur
// i18n-Fallback-Regel. Farben spiegeln die CSS-Variablen der Shell
// (--accent / --bg in build-pages.js); Änderungen bitte an beiden Stellen.
//
// Feldnamen folgen dem W3C-Standard (englisch) — kein Kandidat für die
// Wire-Anglisierung (S31), hier gibt es nichts umzubenennen.

import { de } from "../../../core/i18n/de.js";

export const THEME_COLOR = "#0f766e";      // --accent
export const BACKGROUND_COLOR = "#f5f7f9"; // --bg

/** Manifest-Objekt erzeugen. Reine Funktion, Node- wie Testkontext. */
export function erzeugeManifest() {
  return {
    id: "/",
    lang: "de",
    name: de["pwa.name"],
    short_name: de["pwa.kurzname"],
    description: de["pwa.beschreibung"],
    start_url: "/",
    scope: "/",
    display: "standalone",
    theme_color: THEME_COLOR,
    background_color: BACKGROUND_COLOR,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
    ],
  };
}

/** Serialisierte Form für den Build (stabile Reihenfolge, lesbar eingerückt). */
export function manifestJson() {
  return JSON.stringify(erzeugeManifest(), null, 2) + "\n";
}
