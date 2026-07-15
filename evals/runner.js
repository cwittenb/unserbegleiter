// Eval-Runner CLI (Ebene 2) — echte Modell-Läufe, key-gated.
//
// Konfiguration kommt aus Flags ODER Umgebung (Flag hat Vorrang vor Env). Am
// bequemsten: eine .env im Repo-Wurzelverzeichnis (Vorlage: .env.example) — sie
// wird automatisch gelesen und schlägt keine echte Umgebung. Danach reicht
// `npm run eval -- --familie GATE`. Die Variablen (in .env ohne `export`):
//
//   export EVAL_PROVIDER=anthropic                    # anthropic | mistral
//   export EVAL_ANTHROPIC_PIPELINE_MODEL=<modell>     # Paar je Provider …
//   export EVAL_ANTHROPIC_JUDGE_MODEL=<modell>
//   export EVAL_MISTRAL_PIPELINE_MODEL=<modell>       # … EVAL_PROVIDER wählt aus
//   export EVAL_MISTRAL_JUDGE_MODEL=<modell>
//   export ANTHROPIC_API_KEY=sk-…                     # bzw. MISTRAL_API_KEY zum Provider
//   npm run eval -- --familie GATE
//
// Oder alles per Flag (überschreibt Env):
//   npm run eval -- --provider mistral --pipeline-modell <m> --judge-modell <m> \
//                   [--familie GATE] [--szenario AUF-01] [--sprache de|en] [--n 3]
//                   [--rpm 2|unlimited]        geteilte RPM-Drossel (Default 2, Free-Tier-sicher)
//                   [--weiter-bei-fehler]      Fehler-Szenario markieren statt Lauf abzubrechen
//                   [--judge-provider anthropic|mistral]  Judge auf ANDEREM Provider (echte Isolation)
//                   [--judge-key <key>]        Key für den Judge-Provider (sonst dessen Env-Key)
//                   [--erlaube-gleiches-modell]
//
// Modell-Konfiguration ist PFLICHT (S35d): kein Modell-Default im Code — fehlt
// Pipeline- oder Judge-Modell in BEIDEN Quellen, bricht der Lauf lautstark ab.
// Judge ≠ Pipeline ist erzwungen (GATE-B-Learning) — gleiches Modell nur mit
// --erlaube-gleiches-modell.

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeAdapter, baueDrossel } from "../core/llm/adapter.js";
import { leseEvalKonfig, EvalKonfigFehler } from "./eval-konfig.js";
import { liesEnvDatei, mischeMitEnv } from "./env-datei.js";
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
async function main() {
  // Provider + Modelle aus Flags ODER Umgebung (Flag hat Vorrang). Eine .env im
  // Repo-Wurzelverzeichnis füllt Lücken (process.env schlägt sie); fehlt sie, ist
  // das kein Fehler. Kein Modell-Default im Code (S35d): fehlt etwas, wirft
  // leseEvalKonfig — hier zu klarer CLI-Meldung.
  const env = mischeMitEnv(process.env, liesEnvDatei(path.join(ROOT, ".env")));
  let konfig;
  try {
    konfig = leseEvalKonfig(process.argv, env);
  } catch (e) {
    if (e instanceof EvalKonfigFehler) { console.error(e.message); process.exit(2); }
    throw e;
  }
  const { provider, apiKey, pipelineModell, judgeProvider, judgeKey, judgeModell } = konfig;

  let szenarien = [...SZENARIEN, ...SZENARIEN_EN];
  const sprache = arg("language", null);
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

  // RPM-Drossel (S51): fixer Standard 2 (Free-Tier-sicher = 1 Req/30s). --rpm unlimited|0 hebt sie auf.
  const rpmArg = arg("rpm", "2");
  const rpm = /^(unlimited|0|kein|keine|aus)$/i.test(rpmArg) ? 0 : parseInt(rpmArg, 10);
  if (Number.isNaN(rpm) || rpm < 0) {
    console.error('Ungültiger --rpm-Wert: "' + rpmArg + '" (Zahl ≥ 0 oder "unlimited").');
    process.exit(2);
  }
  const weiterBeiFehler = process.argv.includes("--weiter-bei-fehler");

  // Drossel gilt pro Provider-Workspace. Gleicher Provider für Pipeline+Judge → EINE
  // geteilte Instanz (S51). Anderer Judge-Provider (S52) → eigenständiges Limit; die
  // --rpm-Drossel bleibt an der Pipeline, der Judge-Provider läuft ungedrosselt
  // (der Adapter-Retry fängt etwaige 429 ab).
  const crossProvider = judgeProvider !== provider;
  const drosselPipeline = baueDrossel({ rpm });
  const drosselJudge = crossProvider ? baueDrossel({ rpm: 0 }) : drosselPipeline;

  const cfgFuer = (prov, key, modell, dr) => prov === "mistral"
    ? { provider: "mistral", mode: "direct", apiKey: key, models: { mistral: modell }, drossel: dr }
    : { provider: "anthropic", mode: "direct", apiKey: key, models: { anthropic: modell }, drossel: dr };
  const pipelineCall = makeAdapter(cfgFuer(provider, apiKey, pipelineModell, drosselPipeline));
  const judgeCall = makeAdapter(cfgFuer(judgeProvider, judgeKey, judgeModell, drosselJudge));

  const hash = await coreHash();
  console.log("Eval-Lauf · Kern " + hash +
    " · Pipeline " + provider + "/" + pipelineModell +
    " · Judge " + judgeProvider + "/" + judgeModell);
  console.log("Drossel: Pipeline " + (rpm ? rpm + " RPM" : "unlimited") +
    (crossProvider ? " · Judge unlimited (Provider " + judgeProvider + ")" : " (mit Judge geteilt)") +
    (weiterBeiFehler ? " · weiter-bei-fehler" : ""));
  console.log("Szenarien: " + szenarien.map(s => s.id).join(", ") + (n ? " · n=" + n : ""));

  // Live-Fortschritt je Szenario (S52): "[ i/N] ID … status (Dauer)".
  const melde = ev => {
    if (ev.phase === "start")
      process.stdout.write("[" + String(ev.i).padStart(2) + "/" + ev.gesamt + "] " + ev.id.padEnd(9) + " … ");
    else
      process.stdout.write((ev.roteLinie ? "ROT (rote Linie)" : ev.status) +
        (ev.ms != null ? " (" + (ev.ms / 1000).toFixed(1) + "s)" : "") + "\n");
  };

  // Dateipfad + inkrementelle, absturzsichere Persistenz VOR dem Lauf einrichten:
  // nach jedem Szenario wird dieselbe Datei überschrieben — bei Abbruch spiegelt
  // sie den erreichten (Teil-)Stand (vollstaendig:false).
  const zeit = new Date().toISOString();
  const ordner = path.join(ROOT, "evals/ergebnisse");
  await mkdir(ordner, { recursive: true });
  const datei = path.join(ordner, zeit.replace(/[:.]/g, "-") + ".json");   // append-only: neue Datei je Lauf
  const persistiere = async b => { await writeFile(datei, JSON.stringify(b, null, 2)); };

  const bericht = await laufeAlle(szenarien, {
    pipelineCall, judgeCall, n, zeit, persistiere, weiterBeiFehler, melde,
    stand: {
      coreHash: hash, provider, judgeProvider,
      pipelineModell, judgeModell,
      judgePromptVersion: JUDGE_PROMPT_VERSION,
    },
  });

  await writeFile(datei, JSON.stringify(bericht, null, 2));   // Endstand (vollstaendig:true)

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
