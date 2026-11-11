#!/usr/bin/env node
/**
 * PRV-12b · Vielfaltsmaß über vorhandene Ergebnisse — ohne neuen Lauf, ohne Schlüssel.
 *
 *   node scripts/vielfalt.js <datei.json> [weitere.json …] [--familie INT] [--json]
 *
 * Liest:
 *   · Eval-Ergebnisse (evals/ergebnisse/…json): szenarien[].samples[].transkript
 *   · Blindvergleich-Reize (reize.json): jede Zeichenkette unter antwort/text/a/b
 *     einer Reizliste zählt als eine Antwort (ein Gespräch je Antwort)
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { vielfalt, vielfaltAusTranskripten, vielfaltTabelle } from "../evals/vielfalt.js";
import { SZENARIEN } from "../evals/szenarien/start-katalog.js";
import { SZENARIEN_EN } from "../evals/szenarien/start-katalog.en.js";

/** PRV-12d · Ergebnisse von VOR der Vorlauf-Marke: Die feste Vorgeschichte
 *  steht unmarkiert im Transkript. Sie wird aus dem Katalog erkannt — nur
 *  Züge, die Rolle für Rolle und Wort für Wort dem `verlauf` entsprechen. */
const VERLAUF = new Map([...SZENARIEN, ...SZENARIEN_EN].filter(s => s.verlauf && s.verlauf.length).map(s => [s.id, s.verlauf]));
export function mitVorlaufMarke(transkript, verlauf) {
  const t = transkript || [];
  if (!verlauf || !verlauf.length || t.some(m => m && m.vorlauf)) return t;
  let k = 0; while (k < t.length && t[k] && t[k].hidden) k++;
  const gleich = (a, b) => a && b && a.role === b.role && String(a.content).trim() === String(b.content).trim();
  if (!verlauf.every((v, i) => gleich(t[k + i], v))) return t;
  return t.map((m, i) => (i >= k && i < k + verlauf.length ? { ...m, vorlauf: true } : m));
}

/** Antworttexte aus einer beliebigen Reiz-Struktur fischen (Blindvergleich). */
export function antwortenAusReizen(daten) {
  const aus = [];
  const lauf = x => {
    if (Array.isArray(x)) return x.forEach(lauf);
    if (!x || typeof x !== "object") return;
    for (const [k, v] of Object.entries(x)) {
      if (typeof v === "string" && /^(antwort|text|a|b|links|rechts)$/i.test(k) && v.trim().length > 20) aus.push(v);
      else lauf(v);
    }
  };
  lauf(daten);
  return aus;
}

/** Alle Berichte in einer Datei: ein Eval-Ergebnis ist selbst einer; Vergleichs-
 *  dateien (scripts/eval-vergleich.js) tragen mehrere unter `berichte`. */
export function berichteIn(daten, name = "") {
  if (!daten || typeof daten !== "object") return [];
  if (Array.isArray(daten.szenarien)) return [{ name: (daten.stand && (daten.stand.arm || daten.stand.pipelineModell)) || name || "", bericht: daten }];
  const aus = [];
  for (const [k, v] of Object.entries(daten))
    if (v && typeof v === "object") aus.push(...berichteIn(v, Array.isArray(daten) ? name : (name ? name + "/" : "") + k));
  return aus;
}

export function vielfaltAusBericht(bericht, familie) {
  const sz = familie ? bericht.szenarien.filter(s => s.familie === familie) : bericht.szenarien;
  return vielfaltAusTranskripten(sz.flatMap(s => (s.samples || []).map(x => mitVorlaufMarke(x.transkript || [], VERLAUF.get(s.id)))));
}

/** @returns {{name:string, v:object}[]} */
export function vielfaltAusDatei(daten, familie) {
  const b = berichteIn(daten);
  if (b.length) return b.map(x => ({ name: x.name, v: vielfaltAusBericht(x.bericht, familie) }));
  return [{ name: "Reize", v: vielfalt(antwortenAusReizen(daten).map(t => [t])) }];
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  const fi = args.indexOf("--familie");
  const familie = fi >= 0 ? args[fi + 1] : null;
  const alsJson = args.includes("--json");
  const dateien = args.filter((a, i) => !a.startsWith("--") && !(fi >= 0 && i === fi + 1));
  if (!dateien.length) { console.error("Aufruf: node scripts/vielfalt.js <datei.json> [...] [--familie INT] [--json]"); process.exit(2); }
  for (const d of dateien) {
    for (const { name, v } of vielfaltAusDatei(JSON.parse(readFileSync(d, "utf8")), familie)) {
      const titel = path.basename(d) + (name ? " · " + name : "") + (familie ? " · " + familie : "");
      console.log(alsJson ? JSON.stringify({ datei: d, name, familie, ...v }, null, 2) : vielfaltTabelle(v, titel) + "\n");
    }
  }
}
