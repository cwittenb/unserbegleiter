// Token-Zähler der Artefakt-Umgebung (S61) — laufender Stand pro Paar im
// Entwickler-Panel, gespeist aus den ECHTEN usage-Werten des Adapters.
//
// Nur die Artefakt-Hülle: der Kern bleibt unberührt; die Akkumulation selbst
// (addiereUsage) lebt in core/llm/usage.js und ist dieselbe wie im Worker
// (tokenstat.js) — ein Stand, eine Struktur, zwei Formen.
//
// Best-Effort wie im Worker: Zählen ist Beobachtung — ein Fehler beim
// Speichern oder Melden blockiert nie die LLM-Antwort.

import { addiereUsage } from "../../core/llm/usage.js";

export const TOKEN_PREFIX = "PBDEV:tokens:";
export const tokenKey = code => TOKEN_PREFIX + code;

/**
 * Adapter mit Zählung umhüllen: signaturgleich (system, messages, onDelta).
 * Nach jedem Aufruf wird der Stand des Paars akkumuliert (geteilte Welt,
 * überlebt Reloads) und optional gemeldet (Live-Anzeige im Panel).
 * @param {function} llm            der Adapter aus makeAdapter(...)
 * @param {{store:object, code:string, melde?:function}} opts
 */
export function mitTokenZaehler(llm, { store, code, melde }) {
  return async (system, messages, onDelta) => {
    const antwort = await llm(system, messages, onDelta);
    try {
      const stand = addiereUsage(await store.get(tokenKey(code), true), antwort && antwort.usage);
      await store.set(tokenKey(code), stand, true);
      if (melde) melde(code, stand);
    } catch { /* Zählung ist Beobachtung — nie die Antwort blockieren */ }
    return antwort;
  };
}

/** Alle gespeicherten Stände: { code: Stand }. */
export async function ladeTokenStaende(store) {
  const staende = {};
  for (const k of await store.list(TOKEN_PREFIX, true))
    staende[k.slice(TOKEN_PREFIX.length)] = await store.get(k, true);
  return staende;
}

/** Alle Stände löschen (Reset-Knopf des Panels). */
export async function wipeTokenStaende(store) {
  for (const k of await store.list(TOKEN_PREFIX, true)) await store.del(k, true);
}

/** Kompakte Anzeige: 0…999 roh, dann 12,3k / 1,23M (de-DE). null/NaN → "–". */
export function formatTokens(n) {
  if (n == null || !Number.isFinite(n)) return "–";
  if (n < 1000) return String(n);
  if (n < 1e6) return (n / 1e3).toLocaleString("de-DE", { maximumFractionDigits: 1 }) + "k";
  return (n / 1e6).toLocaleString("de-DE", { maximumFractionDigits: 2 }) + "M";
}
