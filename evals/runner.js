// Eval-Runner CLI (Ebene 2) — echte Modell-Läufe, key-gated.
//
//   npm run eval -- [--familie GATE] [--szenario AUF-01] [--sprache de|en] [--n 3]
//                   [--provider anthropic|mistral]
//                   [--pipeline-modell claude-sonnet-4-6]
//                   [--judge-modell claude-opus-4-8]
//                   [--erlaube-gleiches-modell]
//
// Key aus der Umgebung: ANTHROPIC_API_KEY (bzw. MISTRAL_API_KEY).
// Judge ≠ Pipeline ist erzwungen (GATE-B-Learning) — gleiches Modell nur
// mit ausdrücklichem Flag.

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeAdapter } from "../core/llm/adapter.js";
import { laufeAlle } from "./runner-kern.js";
import { SZENARIEN } from "./szenarien/start-katalog.js";
import { SZENARIEN_EN } from "./szenarien/start-katalog.en.js";
import { JUDGE_PROMPT_VERSION } from "./judge/judge.js";
import { coreHash } from "../scripts/core-hash.js";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function arg(name, fallback) {
  const i = process.argv.indexOf("--" + name);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--")
    ? process.argv[i + 1] : fallback;
}
const flag = name => process.argv.includes("--" + name);

async function main() {
  const provider = arg("provider", "anthropic");
  const keyVar = provider === "mistral" ? "MISTRAL_API_KEY" : "ANTHROPIC_API_KEY";
  const apiKey = process.env[keyVar];
  if (!apiKey) {
    console.error("Kein Schlüssel gefunden: bitte " + keyVar + " setzen.");
    console.error("Beispiel:  " + keyVar + "=sk-… npm run eval -- --familie GATE");
    process.exit(2);
  }

  const pipelineModell = arg("pipeline-modell", provider === "mistral" ? "mistral-large-latest" : "claude-sonnet-4-6");
  const judgeModell = arg("judge-modell", provider === "mistral" ? "mistral-large-latest" : "claude-opus-4-8");
  if (pipelineModell === judgeModell && !flag("erlaube-gleiches-modell")) {
    console.error("Judge-Modell und Pipeline-Modell sind identisch (" + pipelineModell + ").");
    console.error("Das verletzt die Judge-Trennung (Self-Preference-Bias). Wenn du das wirklich");
    console.error("willst: --erlaube-gleiches-modell setzen.");
    process.exit(2);
  }

  let szenarien = [...SZENARIEN, ...SZENARIEN_EN];
  const sprache = arg("sprache", null);
  if (sprache) szenarien = szenarien.filter(s => (s.sprache === "en" ? "en" : "de") === sprache);
  const familie = arg("familie");
  const einzeln = arg("szenario");
  if (familie) szenarien = szenarien.filter(s => s.familie === familie);
  if (einzeln) szenarien = szenarien.filter(s => s.id === einzeln);
  if (!szenarien.length) {
    console.error("Kein Szenario passt auf den Filter.");
    process.exit(2);
  }
  const n = arg("n") ? parseInt(arg("n"), 10) : undefined;

  const modellCfg = m => provider === "mistral"
    ? { provider: "mistral", mode: "direct", apiKey, models: { mistral: m } }
    : { provider: "anthropic", mode: "direct", apiKey, models: { anthropic: m } };
  const pipelineCall = makeAdapter(modellCfg(pipelineModell));
  const judgeCall = makeAdapter(modellCfg(judgeModell));

  const hash = await coreHash();
  console.log("Eval-Lauf · Kern " + hash + " · Pipeline " + pipelineModell + " · Judge " + judgeModell);
  console.log("Szenarien: " + szenarien.map(s => s.id).join(", ") + (n ? " · n=" + n : ""));

  const bericht = await laufeAlle(szenarien, {
    pipelineCall, judgeCall, n,
    stand: {
      coreHash: hash, provider,
      pipelineModell, judgeModell,
      judgePromptVersion: JUDGE_PROMPT_VERSION,
    },
  });

  const ordner = path.join(ROOT, "evals/ergebnisse");
  await mkdir(ordner, { recursive: true });
  const datei = path.join(ordner, bericht.zeit.replace(/[:.]/g, "-") + ".json");
  await writeFile(datei, JSON.stringify(bericht, null, 2));   // append-only: neue Datei je Lauf

  console.log("\n──── Ergebnis (je Familie, kein Gesamt-Score) ────");
  for (const [fam, q] of Object.entries(bericht.quotenJeFamilie)) {
    console.log(fam.padEnd(6) + " grün " + q.gruen + "/" + q.gesamt +
      (q.rot ? "  ⚠ ROTE LINIE: " + q.rot : "") +
      (q.verletzt ? "  verletzt: " + q.verletzt : "") +
      (q.unbewertet ? "  unbewertet: " + q.unbewertet : ""));
  }
  for (const s of bericht.szenarien)
    if (s.status !== "gruen") console.log("  → " + s.id + ": " + s.status);
  console.log("Gespeichert: " + path.relative(ROOT, datei));

  process.exit(bericht.szenarien.every(s => s.status === "gruen") ? 0 : 1);
}

main().catch(e => { console.error("Eval-Lauf fehlgeschlagen:", e.message); process.exit(1); });
