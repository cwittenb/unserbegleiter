#!/usr/bin/env node
/**
 * BV-1 · Blindvergleich — Auswertung.
 *
 *   node scripts/blindvergleich-auswertung.js <urteile.json> <reize.json> <schluessel.json>
 *
 * urteile.json: Export aus dem Bewertungs-Artefakt ({urteile:[{paar, wahl, merkmale}]}).
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { werteAus, lesart } from "../evals/blindvergleich/kern.js";

const lies = p => JSON.parse(readFileSync(p, "utf8"));
const pct = x => x == null ? "–" : Math.round(x * 100) + " %";

export function bericht(urteile, reize, schluessel) {
  const a = werteAus(urteile, reize, schluessel);
  const name = k => k + " " + ((schluessel.laeufe && schluessel.laeufe[k] && schluessel.laeufe[k].modell) || "");
  const z = [];
  z.push(`Blindvergleich · ${a.gezaehlt} Urteile` + (a.unbekannt ? ` (${a.unbekannt} nicht zuordenbar)` : ""));
  z.push("\nGesamt (Gewinnquote, Unentschieden = ½; Stärke nach Bradley-Terry, Mittel 1):");
  const reihe = Object.keys(a.jeLauf).sort((x, y) => (a.staerke[y] || 0) - (a.staerke[x] || 0));
  for (const k of reihe) {
    const j = a.jeLauf[k];
    z.push(`  ${name(k).padEnd(28)} ${pct(j.quote).padStart(5)}  (${j.siege}–${j.gleich}–${j.niederlagen})  Stärke ${(a.staerke[k] || 0).toFixed(2)}`);
  }
  z.push("\nDirekte Paare:");
  for (const [paar, m] of Object.entries(a.paarweise)) {
    const [x, y] = paar.split("|");
    const q = m.n ? (m[x] + 0.5 * m.gleich) / m.n : null;
    z.push(`  ${name(x)} gegen ${name(y)}: ${pct(q)} für ${x}  (${m[x]}–${m.gleich}–${m[y]})  → ${x}: ${lesart(q)}`);
  }
  z.push("\nMerkmale:");
  for (const [k, mm] of Object.entries(a.merkmale))
    z.push(`  ${name(k).padEnd(28)} ` + Object.entries(mm).sort((p, q) => q[1] - p[1]).map(([t, c]) => `${t} ${c}`).join(" · "));
  return { text: z.join("\n"), auswertung: a };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const [u, r, s] = process.argv.slice(2);
  if (!u || !r || !s) { console.error("Aufruf: node scripts/blindvergleich-auswertung.js <urteile.json> <reize.json> <schluessel.json>"); process.exit(2); }
  const urteile = lies(u);
  const { text, auswertung } = bericht(urteile.urteile || urteile, lies(r), lies(s));
  console.log(text);
  const ziel = u.replace(/\.json$/, "") + "-auswertung.json";
  writeFileSync(ziel, JSON.stringify(auswertung, null, 2));
  console.log("\n→ " + ziel);
}
