// API-Basis (M4) — eine reine, DOM-freie Ecke des Clients, damit sie ohne
// Browser testbar bleibt. Im Web ist die Basis leer (same-origin, Verhalten
// unverändert); die native Capacitor-Hülle setzt globalThis.RZZ_API_BASIS vor
// dem App-Skript (injiziert von scripts/build-capacitor.js) und spricht die
// Worker-API damit absolut an.

/** Absolute API-Basis oder "" (same-origin, Web-Default). */
export function apiBasis() {
  return (typeof globalThis !== "undefined" && globalThis.RZZ_API_BASIS) || "";
}

/** Läuft der Client in der nativen Hülle? (Dort sind die Assets lokal —
 *  ein Service Worker wäre überflüssig und wird nicht registriert.) */
export function istNativeShell() {
  return apiBasis() !== "";
}
