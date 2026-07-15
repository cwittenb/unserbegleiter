// Preistabelle für die Kostenschätzung im Eval-Bericht (S55).
// Die Preise sind DATEN (evals/preise.json — dort pflegen, inkl. "stand"), NICHT
// Code: laut S35d leben Modellnamen nicht im Quellcode. Kosten kommen aus den
// ECHTEN usage-Token der API (auch tatsächliche Cache-Token) — Messung, nicht
// Schätzung. Unbekanntes Modell → kostenFuer() gibt null (Token bleiben ausweisbar).

import { readFileSync } from "node:fs";

const daten = JSON.parse(readFileSync(new URL("./preise.json", import.meta.url), "utf8"));
export const PREISE = daten.modelle || {};
export const PREIS_STAND = daten.stand || "";

/** Kosten (USD) für ein Modell und ein Token-Bündel {in,out,cacheRead,cacheWrite}. */
export function kostenFuer(modell, token) {
  const p = PREISE[modell];
  if (!p) return null;
  const t = token || {};
  return ((t.in || 0) * p.in
    + (t.out || 0) * p.out
    + (t.cacheRead || 0) * p.cacheRead
    + (t.cacheWrite || 0) * p.cacheWrite) / 1e6;
}

/** Cache-Trefferquote: cacheRead / (in + cacheRead + cacheWrite). */
export function cacheQuote(token) {
  const t = token || {};
  const nenner = (t.in || 0) + (t.cacheRead || 0) + (t.cacheWrite || 0);
  return nenner > 0 ? (t.cacheRead || 0) / nenner : 0;
}
