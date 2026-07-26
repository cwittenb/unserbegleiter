// R3 · Gemeinsame HTML-Helfer.
//
// `esc` lag dreifach vor: in app.js vollstaendig (inkl. Anfuehrungszeichen),
// in eval-app.js und dev-panel.js verkuerzt (nur & < >). Die verkuerzten
// Fassungen sind in Attributwerten unsicher — ein Wert mit " bricht dort aus
// dem Attribut aus. Die Werkzeuge zeigen zwar nur eigene Daten, aber ein
// Haertungs-Gefaelle zwischen App und Werkzeug ist eine Einladung, beim
// naechsten Kopieren die falsche Fassung zu erwischen.

const ERSATZ = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** HTML-sicheres Escaping fuer Text UND Attributwerte. null/undefined -> "". */
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ERSATZ[c]);

/* ---- R4a · Reine Darstellungshelfer ------------------------------------
 *  Herausgeloest aus app.js: Diese drei haengen an keinem Zustand, an keinem
 *  DOM und an keiner Session — sie waren nur zufaellig dort eingeschlossen und
 *  damit nicht direkt pruefbar. Jetzt sind sie es. */

/**
 * Sparsames Markdown fuer Modellantworten: Ueberschriften und Fettung werden
 * zu <strong>, einfache Sternchen zu <em>, Backticks zu <code>, Listenstriche
 * zu Aufzaehlungspunkten. Escapt ZUERST — der Rohtext kommt vom Modell.
 */
export function mdRender(roh) {
  let x = esc(roh);
  x = x.replace(/^#{1,4}\s+(.+)$/gm, "<strong>$1</strong>");
  x = x.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
  x = x.replace(/(^|[\s(>])\*([^*\n]+)\*(?=[\s.,;:!?)]|$)/gm, "$1<em>$2</em>");
  x = x.replace(/\`([^\`\n]+)\`/g, "<code>$1</code>");
  x = x.replace(/^(\s*)[-*]\s+/gm, "$1\u2022 ");
  return x;
}

/* Flache Icons (S36): einfarbig ueber currentColor, keine Emoji, keine
   Schattierung. Auf primary-Knoepfen erscheinen sie weiss (--on-accent). */
export const IKON = {
  mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><line x1="12" y1="18" x2="12" y2="21"/></svg>',
  stop: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',
  send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 2 11 13"/><path d="M22 2 15 22 11 13 2 9z"/></svg>',
  // D12-2 · Wegweiser: Pfosten mit Schild. Flaechen statt Striche, damit das
  // Zeichen auch bei 9 px scharf bleibt; faerbt sich ueber currentColor.
  wegweiser: '<svg class="rz-weg-ikon" viewBox="0 0 9 11" fill="currentColor" aria-hidden="true"><rect x="0" y="0" width="1.5" height="11"/><rect x="0" y="1" width="9" height="3"/></svg>',
};

/**
 * Kuerzel fuer die zwei Notifikations-Badges: beide Partner schauen ggf.
 * gemeinsam auf den Screen, deshalb je eine Badge. Das Praefix waechst nur so
 * weit, wie noetig, um die Namen unterscheidbar zu machen (Anna/Andreas -> AN/AND).
 */
export function lesezeichenLabels(a, b) {
  a = String(a ?? "").trim(); b = String(b ?? "").trim();
  const up = (s, k) => s.slice(0, k).toLocaleUpperCase();
  let n = 1;
  while (n < Math.max(a.length, b.length) && up(a, n) === up(b, n)) n++;
  return [up(a, n) || up(a, 1), up(b, n) || up(b, 1)];
}
