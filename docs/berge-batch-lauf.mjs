#!/usr/bin/env node
// Bergung eines abgebrochenen Batch-Laufs.
//
// ANLASS (1. Aug 2026): Der GATE-Lauf lief in den 60-min-Cap, während der
// Judge-Batch noch verarbeitet wurde. `fuehreBatchAus` wirft beim Timeout,
// BEVOR es Ergebnisse abholt, und `persistiere` läuft erst nach der
// Judge-Phase — der Node-Prozess starb also mit allen Transkripten im Speicher.
// Bezahlt war zu dem Zeitpunkt bereits alles: 5 Pipeline-Wellen und der Judge.
//
// Bei Anthropic liegen die Batches weiter (Ergebnisse 29 Tage abrufbar). Diese
// Bergung holt sie und baut den Lauf nach. Möglich ist das, weil nichts
// Zufälliges verloren ging: Die Nutzer-Eingaben stehen deterministisch im
// Szenario-Katalog, und die custom_ids kodieren Szenario, Variante, Sample und
// Turn:
//     p_<szId>_<tx|st>_<nr>_t<turn>     Pipeline-Zug
//     r_<szId>_<tx|st>_<nr>_t<turn>     Wächter-Revision (überschreibt p_)
//     j_<szId>_<tx|st>_<nr>             Judge-Urteil
//
// AUFRUF:
//   node docs/berge-batch-lauf.mjs --seit=3h            # alle Batches der letzten 3 Stunden
//   node docs/berge-batch-lauf.mjs --ids=msgbatch_a,msgbatch_b
//   … [--language=de] [--struktur=beides] [--ziel=dev] [--datei=…]
//
// Schlüssel aus der .env im Repo-Root. Der Abruf selbst kostet nichts.

import path from "node:path";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { LLM_PROVIDERS } from "../core/llm/adapter.js";
import { szenarioAusSamples, sampleAusUrteil, bauBericht, szenarioSprache } from "../evals/runner-kern.js";
import { strukturFuer } from "../evals/struktur-bruecke.js";
import { textSchatten } from "../core/engine/text-schatten.js";
import { pruefeJudgeDaten, JUDGE_SCHEMA } from "../evals/judge/judge.js";
import { SZENARIEN } from "../evals/szenarien/start-katalog.js";
import { SZENARIEN_EN } from "../evals/szenarien/start-katalog.en.js";
import { liesEnvDatei, mischeMitEnv } from "../evals/env-datei.js";

const WURZEL = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ENV = mischeMitEnv(process.env, liesEnvDatei(path.join(WURZEL, ".env")));
const arg = (n, d) => {
  const a = process.argv.find(x => x.startsWith("--" + n + "="));
  return a ? a.split("=")[1] : d;
};
if (!ENV.ANTHROPIC_API_KEY) { console.error("ANTHROPIC_API_KEY fehlt (.env im Repo-Root)."); process.exit(2); }

const KOPF = {
  "x-api-key": ENV.ANTHROPIC_API_KEY,
  "anthropic-version": "2023-06-01",
  "content-type": "application/json",
};
const BASIS = "https://api.anthropic.com/v1/messages/batches";
const KATALOG = [...SZENARIEN, ...SZENARIEN_EN];

/** Batches der letzten Stunden bzw. die genannten IDs. */
async function holeBatchIds() {
  const ids = arg("ids", null);
  if (ids) return ids.split(",").map(s => s.trim()).filter(Boolean);
  const stunden = parseFloat(String(arg("seit", "3h")).replace("h", "")) || 3;
  const grenze = Date.now() - stunden * 3600 * 1000;
  const r = await fetch(BASIS + "?limit=100", { headers: KOPF });
  if (!r.ok) throw new Error("Batch-Liste: HTTP " + r.status + " " + (await r.text()).slice(0, 200));
  const daten = await r.json();
  return (daten.data || [])
    .filter(b => new Date(b.created_at).getTime() >= grenze)
    .map(b => ({ id: b.id, status: b.processing_status, erstellt: b.created_at }))
    .reverse()   // älteste zuerst: Turn-Reihenfolge bleibt erhalten
    .map(b => { console.log("  · " + b.id + "  " + b.status + "  " + b.erstellt); return b.id; });
}

/** Alle Ergebnisse aller Batches in EINE Map (custom_ids sind eindeutig). */
async function holeErgebnisse(ids) {
  const map = new Map();
  let offen = 0;
  for (const id of ids) {
    const s = await (await fetch(BASIS + "/" + id, { headers: KOPF })).json();
    if (s.processing_status !== "ended") { offen++; console.log("  ⏳ " + id + " läuft noch (" + s.processing_status + ") — später erneut bergen"); continue; }
    if (!s.results_url) { console.log("  ⚠ " + id + " ohne results_url"); continue; }
    const jsonl = await (await fetch(s.results_url, { headers: KOPF })).text();
    let n = 0;
    for (const zeile of jsonl.split("\n")) {
      const t = zeile.trim(); if (!t) continue;
      let o; try { o = JSON.parse(t); } catch { continue; }
      const r = o.result || {};
      map.set(o.custom_id, r.type === "succeeded" && r.message
        ? { message: r.message }
        : { fehler: (r.type || "unbekannt") + (r.error ? ": " + (r.error.message || "") : "") });
      n++;
    }
    console.log("  ✓ " + id + ": " + n + " Ergebnisse");
  }
  if (offen) console.log("\n⏳ " + offen + " Batch(es) noch in Arbeit — die Bergung bleibt unvollständig.");
  return map;
}

/** "QZ-01_st_3" → {szId, variante, nr} */
function zerlegeKonvId(k) {
  const m = /^(.+)_(tx|st)_(\d+)$/.exec(k);
  if (!m) return null;
  return { szId: m[1], variante: m[2] === "st" ? "struktur" : "text", nr: Number(m[3]) };
}

const ids = await holeBatchIds();
if (!ids.length) { console.error("Keine Batches gefunden."); process.exit(1); }
console.log("\nErgebnisse werden geholt …");
const erg = await holeErgebnisse(ids);
console.log("\nGesamt " + erg.size + " Antworten. Rekonstruiere Konversationen …");

// 1) Konversationen aus den custom_ids sammeln
const konvs = new Map();
for (const cid of erg.keys()) {
  const m = /^([prj])_(.+?)(?:_t(\d+))?$/.exec(cid);
  if (!m) continue;
  const [, art, konvId, turn] = m;
  const z = zerlegeKonvId(konvId);
  if (!z) continue;
  const sz = KATALOG.find(s => s.id === z.szId);
  if (!sz) { console.log("  ⚠ unbekanntes Szenario in " + cid); continue; }
  if (!konvs.has(konvId)) konvs.set(konvId, { konvId, sz, ...z, zuege: new Map(), urteilRoh: null });
  const k = konvs.get(konvId);
  if (art === "j") k.urteilRoh = erg.get(cid);
  else {
    const t = Number(turn);
    // r_ (Wächter-Revision) hat Vorrang vor p_ desselben Turns.
    const vorhanden = k.zuege.get(t);
    if (!vorhanden || art === "r") k.zuege.set(t, { art, ...erg.get(cid) });
  }
}

// 2) Transkripte bauen — Nutzer-Eingaben kommen deterministisch aus dem Katalog
let anomal = 0;
for (const k of konvs.values()) {
  const struktur = k.variante === "struktur" ? strukturFuer(k.sz) : null;
  const transkript = [];
  for (let t = 0; t < k.sz.eingaben.length; t++) {
    const antwort = k.zuege.get(t);
    if (!antwort) break;                       // Konversation endete hier (leer/abgeschnitten)
    transkript.push({ role: "user", content: k.sz.eingaben[t] });
    if (antwort.fehler) { k.leer = antwort.fehler; anomal++; break; }
    try {
      if (struktur) {
        const r = LLM_PROVIDERS.anthropic.parseStructured(antwort.message, struktur.schema.name);
        const d = r.data || {};
        const typ = d.block ? d.block.typ : null;
        const defn = typ ? (struktur.bloecke || []).find(b => b.dataset === typ) : null;
        const zug = { role: "assistant", content: textSchatten({ content: d.antwort || "", marker: d.marker, block: d.block }, defn) };
        if (r.strukturQuelle) zug.strukturQuelle = r.strukturQuelle;
        if (typ) zug.blockTyp = typ;
        // Die ART des Wächter-Treffers steht nur im verlorenen Prozess-Zustand;
        // die Bergung weiß nur DASS revidiert wurde.
        if (antwort.art === "r") zug.waechterTreffer = "revidiert";
        transkript.push(zug);
      } else {
        const p = LLM_PROVIDERS.anthropic.parse(antwort.message);
        const zug = { role: "assistant", content: p.text };
        if (p.abgeschnitten) zug.abgeschnitten = true;
        if (antwort.art === "r") zug.waechterTreffer = "revidiert";
        transkript.push(zug);
      }
    } catch (e) { k.leer = e.message; anomal++; break; }
  }
  k.transkript = transkript;
}

// 3) Urteile deuten und Samples bauen
const proSz = new Map();
let ohneUrteil = 0;
for (const k of [...konvs.values()].sort((a, b) => a.nr - b.nr)) {
  let urteil;
  if (!k.urteilRoh || k.urteilRoh.fehler) {
    urteil = { bewertet: false, fehler: k.leer || (k.urteilRoh ? k.urteilRoh.fehler : "kein Judge-Ergebnis (Batch unvollständig)") };
    ohneUrteil++;
  } else {
    try {
      const { data } = LLM_PROVIDERS.anthropic.parseStructured(k.urteilRoh.message, JUDGE_SCHEMA.name);
      const p = pruefeJudgeDaten(data, k.sz);
      urteil = p.ok ? { bewertet: true, antworten: p.antworten } : { bewertet: false, fehler: p.fehler };
    } catch (e) { urteil = { bewertet: false, fehler: e.message }; ohneUrteil++; }
  }
  const schluessel = k.szId + "|" + k.variante;
  if (!proSz.has(schluessel)) proSz.set(schluessel, { sz: k.sz, variante: k.variante, samples: [] });
  proSz.get(schluessel).samples.push(sampleAusUrteil(k.sz, k.transkript, urteil, k.nr));
}

// 4) Bericht
const ergebnisse = [];
for (const e of proSz.values()) {
  e.samples.sort((a, b) => a.nr - b.nr);
  ergebnisse.push(szenarioAusSamples(e.sz, e.samples, e.samples.length, e.variante));
}
ergebnisse.sort((a, b) => (a.id + a.variante).localeCompare(b.id + b.variante));

const stand = {
  coreHash: "geborgen", provider: "anthropic", judgeProvider: "anthropic",
  pipelineModell: ENV.EVAL_ANTHROPIC_PIPELINE_MODEL || "?",
  judgeModell: ENV.EVAL_ANTHROPIC_JUDGE_MODEL || "?",
  batch: true, ziel: arg("ziel", "dev"), struktur: arg("struktur", "beides"),
  geborgenAus: ids,
};
const bericht = bauBericht(ergebnisse, stand, new Date().toISOString(), ohneUrteil === 0);

const ordner = path.join(WURZEL, "evals", "ergebnisse");
mkdirSync(ordner, { recursive: true });
const datei = arg("datei", path.join(ordner, new Date().toISOString().replace(/[:.]/g, "-") + "-geborgen.json"));
writeFileSync(datei, JSON.stringify(bericht, null, 2));

console.log("\n==== BERGUNG ====");
console.log("Konversationen: " + konvs.size + " · Szenario-Läufe: " + ergebnisse.length +
  (anomal ? " · anomale Transkripte: " + anomal : "") +
  (ohneUrteil ? " · ohne Urteil: " + ohneUrteil : ""));
console.log("Geschrieben: " + datei);
if (bericht.gate) {
  const g = bericht.gate;
  console.log("\n──── GATE · Text ↔ Struktur (" + g.paare + " Paare) ────");
  console.log("Ampel: " + { gruen: "GRÜN", gelb: "GELB", rot: "ROT" }[g.ampel] +
    "  ·  Delta verletzte Samples: " + (g.deltaVerletzt > 0 ? "+" : "") + g.deltaVerletzt +
    "  ·  abweichend: " + (g.abweichende.length || "keine"));
  if (g.roteLinienNeu.length) console.log("  ⚠ ROTE LINIE NEU: " + g.roteLinienNeu.join(", "));
  for (const z of g.zeilen.filter(z => z.abweichung))
    console.log("  ≠ " + z.id + "  Text " + z.text.verletzt + "/" + z.text.n +
      "  →  Struktur " + z.struktur.verletzt + "/" + z.struktur.n + (z.roteLinieNeu ? "  ⚠ ROTE LINIE" : ""));
  const t = g.telemetrie;
  console.log("Struktur-Telemetrie: Quellen " + JSON.stringify(t.quellen) +
    " · Züge mit Block " + t.zuegeMitBlock + "/" + t.zuegeGesamt +
    (t.gerettet ? "  ⚠ " + t.gerettet + " Text-Rettung(en)" : ""));
}
if (ohneUrteil)
  console.log("\nHinweis: " + ohneUrteil + " Konversation(en) ohne Urteil — unbewertet zählt NIE als bestanden (GATE-B).");
