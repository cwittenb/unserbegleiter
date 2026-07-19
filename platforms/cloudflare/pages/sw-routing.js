// Service-Worker-Routing (M2) — die Cache-Entscheidung als REINE Funktion,
// getrennt vom Worker-Lebenszyklus, damit sie deterministisch testbar ist.
//
// Datenschutz-Grundsatz (Grundprämissen): Gesprächsinhalte und alles, was über
// die Worker-API läuft, wird NIEMALS im Browser-Cache persistiert. Der Service
// Worker fasst nur die App-Shell an; API-Verkehr (inkl. httpOnly-Cookie-Auth)
// geht unverändert am Cache vorbei ("nie" → kein respondWith, Browser-Standard).

/** Precache-Liste der App-Shell. admin.html gehört bewusst NICHT dazu
 *  (Betreiber-Werkzeug, token-geschützt, immer frisch vom Netz). */
export const SHELL_PFADE = [
  "/",
  "/app.js",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

/** Entscheidung je Pfad (nur GET, nur same-origin — das prüft sw.js davor):
 *  "nie"          → Service Worker greift nicht ein, niemals cachen (API, Admin, SW selbst)
 *  "netz-zuerst"  → Netz, bei Ausfall Cache (Einstieg "/": Updates gewinnen, offline geht trotzdem)
 *  "cache-zuerst" → Cache, bei Miss Netz + nachlegen (statische Shell, Kern-Hash-versioniert)
 *  "netz"         → kein Eingriff (unbekannte Pfade) */
export function cacheEntscheidung(pfad) {
  if (pfad.startsWith("/api/") || pfad === "/api") return "nie";
  if (pfad === "/admin.html") return "nie";
  if (pfad === "/sw.js") return "nie";
  if (pfad === "/" || pfad === "/index.html") return "netz-zuerst";
  if (SHELL_PFADE.includes(pfad)) return "cache-zuerst";
  return "netz";
}
