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
  // S121/F1a · Wurzelpfade statt /icons/. Die beiden kleinen Tab-Zeichen
  // (favicon-16/32) stehen bewusst NICHT hier: ein Tab-Icon braucht niemand
  // offline, und jeder Eintrag kostet jeden Installierenden einen Abruf.
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
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
  // R5: Der nachgeladene Korpus gehört bewusst NICHT in SHELL_PFADE — sonst
  // würde ihn jedes deutschsprachige Paar beim Installieren mitziehen, also
  // genau das, was das Nachladen vermeidet. Wer ihn einmal geholt hat, soll
  // ihn aber offline behalten.
  if (/^\/korpus\.[a-z]{2}\.js$/.test(pfad)) return "cache-zuerst";
  if (SHELL_PFADE.includes(pfad)) return "cache-zuerst";
  return "netz";
}
