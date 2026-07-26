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
