#!/usr/bin/env node
/**
 * BV-1 · Blindvergleich Sprachduktus — Erzeugung.
 *
 *   node scripts/blindvergleich.js [--nur A,B,C,D] [--n 2] [--rpm 30] [--seed 7] [--trocken]
 *
 * Für jeden Lauf aus evals/modellvergleich.json (Modelle als Daten, S35d) und
 * jede Situation des Duktus-Sets (evals/blindvergleich/duktus-set.js) n Antworten.
 * KEIN Judge — bewertet wird von Hand im Artefakt.
 *
 * Ausgabe (evals/blindvergleich/laeufe/, nicht versioniert):
 *   <zeit>-reize.json       Situationen, Antworttexte unter Zufallskennungen, Paare.
 *                           Kein Modellname. Das ist die Datei für das Artefakt.
 *   <zeit>-schluessel.json  Kennung → Lauf, Telemetrie, Kosten, Ausfälle.
 *                           Bleibt bei dir, bis die Bewertung fertig ist.
 *
 * Schlüssel: .env im Repo-Wurzelverzeichnis (ANTHROPIC_API_KEY, MISTRAL_API_KEY).
 */
import { readFileSync } from "node:fs";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeAdapter, baueDrossel } from "../core/llm/adapter.js";
import { liesEnvDatei, mischeMitEnv } from "../evals/env-datei.js";
import { DENKMODUS } from "../evals/eval-konfig.js";
import { spieleSample } from "../evals/runner-kern.js";
import { kostenFuer } from "../evals/preise.js";
import { DUKTUS_SET, DUKTUS_SET_VERSION, alsSzenario } from "../evals/blindvergleich/duktus-set.js";
import { zufallsquelle, neueKennung, bildePaare, trenne } from "../evals/blindvergleich/kern.js";
import { coreHash } from "./core-hash.js";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const arg = (name, fallback) => {
  const i = process.argv.indexOf("--" + name);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : fallback;
};
const KEY = { anthropic: "ANTHROPIC_API_KEY", mistral: "MISTRAL_API_KEY" };

/** Adapter-Konfiguration je Lauf — dieselben Stellschrauben wie im Runner (S144/S147). */
export function cfgFuerLauf(lauf, env, drossel) {
  const apiKey = env[KEY[lauf.provider]];
  if (!KEY[lauf.provider]) throw new Error("Lauf " + lauf.kennung + ": unbekannter Provider " + lauf.provider);
  if (!apiKey) throw new Error("Lauf " + lauf.kennung + ": " + KEY[lauf.provider] + " fehlt (.env).");
  if (lauf.provider === "anthropic") {
    const dm = lauf.denkmodus || "aus";
    if (!Object.hasOwn(DENKMODUS, dm)) throw new Error("Lauf " + lauf.kennung + ": Denkmodus " + dm + " unbekannt");
    return { provider: "anthropic", mode: "direct", apiKey, models: { anthropic: lauf.modell }, drossel, cache: true, thinking: DENKMODUS[dm] };
  }
  return { provider: "mistral", mode: "direct", apiKey, models: { mistral: lauf.modell }, drossel,
    ...(lauf.denkaufwand ? { reasoningEffort: lauf.denkaufwand } : {}), ...(lauf.maxTokens ? { maxTokens: lauf.maxTokens } : {}) };
}

async function main() {
  const konfig = JSON.parse(readFileSync(path.join(ROOT, "evals/modellvergleich.json"), "utf8"));
  const nur = arg("nur", null);
  const laeufe = nur ? konfig.laeufe.filter(l => nur.split(",").includes(l.kennung)) : konfig.laeufe;
  if (nur && laeufe.length !== nur.split(",").length) {
    console.error("--nur: unbekannte Kennung. Vorhanden: " + konfig.laeufe.map(l => l.kennung).join(", ")); process.exit(2);
  }
  if (laeufe.length < 2) { console.error("Ein Vergleich braucht mindestens zwei Läufe."); process.exit(2); }
  const n = parseInt(arg("n", "2"), 10);
  const rpm = parseInt(arg("rpm", "30"), 10);
  const seed = arg("seed", null);
  const zufall = zufallsquelle(seed === null ? null : parseInt(seed, 10));

  const anzahl = laeufe.length * DUKTUS_SET.length * n;
  const paareJeSit = laeufe.length * (laeufe.length - 1) / 2;
  console.log(`Blindvergleich · Duktus-Set v${DUKTUS_SET_VERSION} · ${DUKTUS_SET.length} Situationen × ${laeufe.length} Läufe × n=${n} = ${anzahl} Antworten`);
  console.log(`Paare zum Bewerten: ${DUKTUS_SET.length} × ${paareJeSit} = ${DUKTUS_SET.length * paareJeSit}`);
  for (const l of laeufe) console.log(`  ${l.kennung}  ${l.provider}/${l.modell}` + (l.denkmodus ? ` (Denkmodus ${l.denkmodus})` : "") + (l.denkaufwand ? ` (Denkaufwand ${l.denkaufwand})` : ""));
  if (process.argv.includes("--trocken")) return;

  const env = mischeMitEnv(process.env, liesEnvDatei(path.join(ROOT, ".env")));
  const vergeben = new Set();
  const antworten = [], ausfaelle = [], telemetrie = {};
  for (const lauf of laeufe) {
    const t = (telemetrie[lauf.kennung] = { in: 0, out: 0, cacheRead: 0, cacheWrite: 0, calls: 0, ms: 0 });
    const roh = makeAdapter(cfgFuerLauf(lauf, env, baueDrossel({ rpm })));
    const call = async (...a) => {
      const r = await roh(...a); const u = (r && r.usage) || {};
      t.in += u.in || 0; t.out += u.out || 0; t.cacheRead += u.cacheRead || 0; t.cacheWrite += u.cacheWrite || 0; t.calls++;
      return r;
    };
    for (const s of DUKTUS_SET) {
      for (let i = 1; i <= n; i++) {
        const t0 = Date.now();
        let zug = null, fehler = null;
        try {
          const verlauf = await spieleSample(call, alsSzenario(s));
          zug = verlauf[verlauf.length - 1];
        } catch (e) { fehler = String(e && e.message || e); }
        t.ms += Date.now() - t0;
        const text = zug && zug.role === "assistant" ? String(zug.content || "").trim() : "";
        if (fehler || !text || zug.abgeschnitten) {
          ausfaelle.push({ lauf: lauf.kennung, situation: s.id, sample: i, grund: fehler || (zug && zug.abgeschnitten ? "abgeschnitten" : "leer") });
          process.stdout.write("x");
          continue;
        }
        antworten.push({ kennung: neueKennung(zufall, vergeben), situation: s.id, lauf: lauf.kennung, sample: i, text });
        process.stdout.write(".");
      }
    }
    process.stdout.write(` ${lauf.kennung}\n`);
  }

  const zeit = new Date().toISOString();
  const meta = { zeit, duktusSet: DUKTUS_SET_VERSION, coreHash: await coreHash() };
  const paare = bildePaare(antworten, { zufall });
  const { reize, schluessel } = trenne({ situationen: DUKTUS_SET, antworten, paare, meta });
  schluessel.laeufe = Object.fromEntries(laeufe.map(l => [l.kennung, {
    provider: l.provider, modell: l.modell, denkmodus: l.denkmodus || null, denkaufwand: l.denkaufwand || null,
    telemetrie: telemetrie[l.kennung], kosten: kostenFuer(l.modell, telemetrie[l.kennung]),
  }]));
  schluessel.ausfaelle = ausfaelle;
  schluessel.paare = paare;

  const dir = path.join(ROOT, "evals/blindvergleich/laeufe");
  await mkdir(dir, { recursive: true });
  const stamm = path.join(dir, zeit.replace(/[:.]/g, "-"));
  await writeFile(stamm + "-reize.json", JSON.stringify(reize, null, 2));
  await writeFile(stamm + "-schluessel.json", JSON.stringify(schluessel, null, 2));
  console.log(`\n${antworten.length} Antworten, ${ausfaelle.length} Ausfälle, ${paare.length} Paare.`);
  for (const [k, l] of Object.entries(schluessel.laeufe))
    console.log(`  ${k}  ${(l.telemetrie.ms / Math.max(l.telemetrie.calls, 1) / 1000).toFixed(1)} s/Antwort · ${l.kosten == null ? "Preis fehlt" : "$" + l.kosten.toFixed(3)}`);
  console.log("\nReize (für das Artefakt): " + path.relative(ROOT, stamm + "-reize.json"));
  console.log("Schlüssel (bei dir behalten): " + path.relative(ROOT, stamm + "-schluessel.json"));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch(e => { console.error(e); process.exit(1); });
}
