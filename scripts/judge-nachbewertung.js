#!/usr/bin/env node
/**
 * scripts/judge-nachbewertung.js — S144a · Judge-Kalibrierung.
 *
 * Richtet gespeicherte Transkripte aus evals/ergebnisse/ mit einem neuen Judge
 * neu und stellt jedes Urteil gegen das alte. Nur Judge-Aufrufe, keine
 * Pipeline — der Abgleich kostet Cent und misst allein das Instrument.
 *
 * Warum: Ein Judge-Wechsel zusammen mit neuen Kandidaten wäre konfundiert. Sieht
 * ein neues Modell besser aus, wüsste niemand, ob es besser ist oder der Judge
 * milder. Deshalb zuerst hier, auf Transkripten mit bekanntem Urteil.
 *
 * Aufruf:
 *   node scripts/judge-nachbewertung.js                     # alle Berichte des Referenz-Judges
 *   node scripts/judge-nachbewertung.js --trocken           # nur zählen, nichts aufrufen
 *   node scripts/judge-nachbewertung.js --max 20            # die ersten 20 Fälle (Probe)
 *   node scripts/judge-nachbewertung.js --dateien a.json,b.json
 *   node scripts/judge-nachbewertung.js --judge-modell <m> --judge-provider anthropic
 *   node scripts/judge-nachbewertung.js --parallel 4 --rpm 0
 *   node scripts/judge-nachbewertung.js --alle-promptversionen   # auch ältere Judge-Prompts (konfundiert!)
 *   node scripts/judge-nachbewertung.js --szenarien GATE-S1,SYC-05 --versionen-uebergehen
 *   node scripts/judge-nachbewertung.js --referenz-modell <m> --judge-modell <m> --erlaube-gleiches-modell …
 *        S145 · Basislinie unter neuer Prüffragen-Version nachrichten (gleicher Judge)
 *        S144a2 · geschärfte Prüffragen an alten Transkripten verifizieren
 *        (gleiche Eingaben vorausgesetzt; misst Prüffrage + Judge zugleich)
 *
 * Referenz und Kandidat stehen in evals/judge-kalibrierung.json (Flag hat Vorrang).
 * Ergebnis: evals/nachbewertungen/<zeit>.json — bewusst NICHT in
 * evals/ergebnisse/, weil scripts/modellvergleich.js dort die jeweils neueste
 * Datei als Lauf-Ergebnis greift.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeAdapter, baueDrossel } from "../core/llm/adapter.js";
import { liesEnvDatei, mischeMitEnv } from "../evals/env-datei.js";
import { richte, JUDGE_PROMPT_VERSION } from "../evals/judge/judge.js";
import { pruefeJudge } from "../evals/judge/golden.js";
import { kostenFuer } from "../evals/preise.js";
import { SZENARIEN } from "../evals/szenarien/start-katalog.js";
import { SZENARIEN_EN } from "../evals/szenarien/start-katalog.en.js";
import { sammleFaelle, vergleiche, fasseZusammen, einseitigeChecks } from "../evals/nachbewertung.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ERGEBNISSE = path.join(ROOT, "evals/ergebnisse");
const AUSGABE = path.join(ROOT, "evals/nachbewertungen");
const KONFIG = JSON.parse(readFileSync(path.join(ROOT, "evals/judge-kalibrierung.json"), "utf8"));
const KEY_VAR = { anthropic: "ANTHROPIC_API_KEY", mistral: "MISTRAL_API_KEY" };

const argv = process.argv.slice(2);
const flag = n => argv.includes("--" + n);
const wert = (n, fallback) => {
  const i = argv.indexOf("--" + n);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : fallback;
};

/* S145 · --referenz-modell: Nachrichten unter GLEICHEM Judge, aber geänderter
   Prüffrage (Vorher/Nachher am selben Maßstab) braucht eine andere Referenz als
   die Kalibrierung. Dann zusätzlich --erlaube-gleiches-modell. */
const referenz = { ...KONFIG.referenz, modell: wert("referenz-modell", KONFIG.referenz.modell) };
const kandidat = {
  provider: wert("judge-provider", KONFIG.kandidat.provider),
  modell: wert("judge-modell", KONFIG.kandidat.modell),
};
const trocken = flag("trocken");
const parallel = Math.max(1, parseInt(wert("parallel", "4"), 10) || 1);
const rpm = parseInt(wert("rpm", "0"), 10) || 0;
const max = wert("max", null) ? parseInt(wert("max"), 10) : null;

if (!KEY_VAR[kandidat.provider]) {
  console.error('Unbekannter --judge-provider "' + kandidat.provider + '" — erlaubt: ' + Object.keys(KEY_VAR).join(" | "));
  process.exit(2);
}
if (kandidat.modell === referenz.modell) {
  console.error("Kandidat und Referenz sind dasselbe Modell (" + kandidat.modell + ") — das misst Streuung, keinen Wechsel.");
  if (!flag("erlaube-gleiches-modell")) process.exit(2);
}

/* ---- Berichte lesen ---- */
const liste = wert("dateien", null);
const dateien = liste
  ? liste.split(",").map(d => path.resolve(ROOT, d.trim()))
  : readdirSync(ERGEBNISSE).filter(f => f.endsWith(".json")).sort().map(f => path.join(ERGEBNISSE, f));
const berichte = [];
for (const d of dateien) {
  if (!existsSync(d)) { console.error("Datei fehlt: " + d); process.exit(2); }
  try { berichte.push({ datei: path.relative(ROOT, d), bericht: JSON.parse(readFileSync(d, "utf8")) }); }
  catch (e) { console.error("Nicht lesbar: " + d + " (" + e.message + ")"); process.exit(2); }
}

/* Default: nur Urteile mit dem HEUTIGEN Judge-Prompt — sonst misst der Abgleich
   Prompt- und Modellwechsel zugleich. --alle-promptversionen hebt das auf. */
const { faelle: alleFaelle, uebersprungen, promptVersionen } =
  sammleFaelle(berichte, [...SZENARIEN, ...SZENARIEN_EN], {
    referenzModell: referenz.modell,
    promptVersion: flag("alle-promptversionen") ? undefined : JUDGE_PROMPT_VERSION,
    nurSzenarien: wert("szenarien", null) ? wert("szenarien").split(",").map(s => s.trim()).filter(Boolean) : undefined,
    versionenUebergehen: flag("versionen-uebergehen"),
  });
if (flag("versionen-uebergehen"))
  console.log("! --versionen-uebergehen: Szenarien mit neuerer Version werden mit der HEUTIGEN Prüffrage gerichtet — " +
    "Abweichungen zeigen Prüffrage UND Judge zugleich (gewollt zur Verifikation einer Schärfung).");
const faelle = max ? alleFaelle.slice(0, max) : alleFaelle;

const zaehleGruende = () => {
  const g = {};
  for (const u of uebersprungen) g[u.grund] = (g[u.grund] || 0) + 1;
  return Object.entries(g).map(([k, v]) => k + " " + v).join(", ") || "keine";
};

console.log("Judge-Nachbewertung · Referenz " + referenz.modell + " → Kandidat " + kandidat.modell + " (" + kandidat.provider + ")");
console.log(berichte.length + " Berichte · " + faelle.length + " Fälle" + (max ? " (von " + alleFaelle.length + ")" : "") +
  " · übersprungen: " + zaehleGruende());
if (promptVersionen.length && promptVersionen.some(v => v !== JUDGE_PROMPT_VERSION))
  console.log("! Judge-Prompt: Referenz-Urteile mit " + promptVersionen.join(", ") + ", heute " + JUDGE_PROMPT_VERSION +
    " — Abweichungen können vom Prompt kommen, nicht vom Modell.");

if (trocken) {
  const je = {};
  for (const f of faelle) je[f.szenario.id] = (je[f.szenario.id] || 0) + 1;
  for (const [id, n] of Object.entries(je)) console.log("   " + id + ": " + n);
  console.log("Trockenlauf — es wurde nichts aufgerufen. Golden-Selbsttest plus " + faelle.length + " Judge-Aufrufe stünden an.");
  process.exit(0);
}
if (!faelle.length) { console.error("Keine vergleichbaren Fälle."); process.exit(1); }

/* ---- Judge wie im Runner (S77: adaptiv, S56: Cache aus) ---- */
const env = mischeMitEnv(process.env, liesEnvDatei(path.join(ROOT, ".env")));
const apiKey = env[KEY_VAR[kandidat.provider]];
if (!apiKey) { console.error("Kein Schlüssel: bitte " + KEY_VAR[kandidat.provider] + " in der .env setzen."); process.exit(2); }

const drossel = baueDrossel({ rpm });
const cfg = kandidat.provider === "mistral"
  ? { provider: "mistral", mode: "direct", apiKey, models: { mistral: kandidat.modell }, drossel }
  : { provider: "anthropic", mode: "direct", apiKey, models: { anthropic: kandidat.modell }, drossel, cache: false, thinking: "adaptiv" };
const token = { in: 0, out: 0, cacheRead: 0, cacheWrite: 0, calls: 0 };
const roh = makeAdapter(cfg);
const judgeCall = async (...a) => {
  const r = await roh(...a);
  const u = (r && r.usage) || {};
  token.in += u.in || 0; token.out += u.out || 0;
  token.cacheRead += u.cacheRead || 0; token.cacheWrite += u.cacheWrite || 0; token.calls++;
  return r;
};

/* Golden zuerst, wie im Runner (S66) — scheitert der Kandidat an den bekannten
   Fehlurteilsklassen, ist DAS der Befund, und es kostet keinen weiteren Aufruf. */
if (!flag("ohne-judge-selbsttest")) {
  process.stdout.write("Judge-Selbsttest (Golden Transcripts) … ");
  const kal = await pruefeJudge(judgeCall);
  if (!kal.ok) {
    console.log("FEHLGESCHLAGEN.");
    for (const a of kal.abweichungen)
      console.log("   " + a.id + "/" + a.check + ": erwartet " + a.erwartet + ", erhalten " + a.erhalten + (a.lehre ? " — " + a.lehre : ""));
    console.log("Abbruch. Mit --ohne-judge-selbsttest trotzdem nachbewerten.");
    process.exit(1);
  }
  console.log("ok.");
}

/* ---- Nachbewerten, begrenzt parallel ---- */
const zeilen = [];
let naechster = 0, fertig = 0;
const t0 = Date.now();
async function arbeiter() {
  while (naechster < faelle.length) {
    const f = faelle[naechster++];
    const urteil = await richte(judgeCall, f.szenario, f.transkript);
    zeilen.push(...vergleiche(f, urteil));
    fertig++;
    if (fertig % 10 === 0 || fertig === faelle.length)
      process.stdout.write("\r   " + fertig + "/" + faelle.length + " Fälle");
  }
}
await Promise.all(Array.from({ length: Math.min(parallel, faelle.length) }, arbeiter));
process.stdout.write("\n");

/* ---- Auswertung ---- */
zeilen.sort((a, b) => (a.datei + a.nr + a.check).localeCompare(b.datei + b.nr + b.check));
const z = fasseZusammen(zeilen);
const einseitig = einseitigeChecks(z);
const kosten = kostenFuer(kandidat.modell, token);
const pct = x => (x == null ? "—" : (100 * x).toFixed(1) + " %");

console.log("\n═══ Übereinstimmung");
console.log("Urteile " + z.gesamt + " · gleich " + z.gleich + " · abweichend " + z.abweichend +
  " (strenger " + z.strenger + ", milder " + z.milder + ") · unbewertet " + z.unbewertet + " · Quote " + pct(z.quote));
console.log("\nJe Check:");
for (const [k, e] of Object.entries(z.jeCheck))
  console.log("   " + k.padEnd(18) + " " + String(e.gleich).padStart(3) + "/" + String(e.gesamt).padEnd(4) +
    (e.abweichend ? " ↑" + e.strenger + " ↓" + e.milder : ""));

console.log(einseitig.length
  ? "\n! EINSEITIG (Stoppsignal): " + einseitig.map(e => e.check + " " + e.richtung + " " + e.anzahl + "/" + e.von).join(" · ")
  : "\nKeine einseitige Häufung (≥3 Abweichungen in eine Richtung je Check).");

const abw = zeilen.filter(x => x.abweichung);
if (abw.length) {
  console.log("\n═══ Abweichungen — einzeln lesen, nicht nur zählen");
  const kurz = s => (s.length > 220 ? s.slice(0, 217) + "…" : s);
  for (const x of abw) {
    console.log("\n" + x.szenario + "/" + x.check + " #" + x.nr + " · " + (x.pipelineModell || "?") + " · " + x.datei);
    console.log("   alt " + x.alt + ": " + kurz(x.belegAlt));
    console.log("   neu " + x.neu + ": " + kurz(x.belegNeu));
  }
}

console.log("\n" + token.calls + " Aufrufe · " + Math.round((Date.now() - t0) / 1000) + " s" +
  (kosten == null ? " · Kosten unbekannt (Modell fehlt in evals/preise.json)" : " · ca. $" + kosten.toFixed(3)));

await mkdir(AUSGABE, { recursive: true });
const datei = path.join(AUSGABE, new Date().toISOString().replace(/[:.]/g, "-") + ".json");
await writeFile(datei, JSON.stringify({
  formatVersion: 1, zeit: new Date().toISOString(),
  referenz, kandidat, judgePromptVersion: JUDGE_PROMPT_VERSION, referenzPromptVersionen: promptVersionen,
  berichte: berichte.map(b => b.datei), uebersprungen,
  zusammenfassung: z, einseitig, telemetrie: token, kosten, zeilen,
}, null, 2));
console.log("Gespeichert: " + path.relative(ROOT, datei));
