// Token-Stand (S61) — Akkumulation ECHTER usage-Werte des Adapters
// ({in, out, cacheRead, cacheWrite}, Messung statt Schätzung, wie S55).
// EINE Quelle für beide Formen: der Cloudflare-Worker (tokenstat.js) und die
// Artefakt-Umgebung (token-zaehler.js) addieren mit derselben Funktion —
// die Stand-Struktur bleibt so überall identisch und getrennt beweisbar.
//
// Fehlende usage-Felder (z. B. abgebrochene Streams, Provider ohne Cache-
// Angaben) zählen als 0 — ein Stand entsteht trotzdem, denn der Aufruf war real.

/** Leerer Stand — Ausgangspunkt jeder Akkumulation. */
export function leererStand() {
  return { calls: 0, in: 0, out: 0, cacheRead: 0, cacheWrite: 0, aktualisiert: null };
}

const zahl = x => (Number.isFinite(x) ? x : 0);

/**
 * Einen usage-Datensatz auf einen Stand addieren (immutabel).
 * @param {object|null} stand   bisheriger Stand (oder null/undefined)
 * @param {object|null} usage   Adapter-usage {in,out,cacheRead,cacheWrite}
 * @param {number} [jetzt]      Zeitstempel (ms) für `aktualisiert`
 * @returns {object}            neuer Stand
 */
export function addiereUsage(stand, usage, jetzt) {
  const s = stand || leererStand();
  const u = usage || {};
  return {
    calls: zahl(s.calls) + 1,
    in: zahl(s.in) + zahl(u.in),
    out: zahl(s.out) + zahl(u.out),
    cacheRead: zahl(s.cacheRead) + zahl(u.cacheRead),
    cacheWrite: zahl(s.cacheWrite) + zahl(u.cacheWrite),
    aktualisiert: jetzt === undefined ? Date.now() : jetzt,
  };
}
