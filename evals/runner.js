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
//                   [--batch]                  kompletter Lauf über die Anthropic Batches API (−50%; nur Anthropic)
//                   [--batch-intervall 20] [--batch-max-min 60]   Polling-Intervall / Zeit-Cap
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
import { laufeAlle, wendeZielAn } from "./runner-kern.js";
import { laufeAlleBatch } from "./runner-batch.js";
import { pruefeJudge } from "./judge/golden.js";
import { kostenFuer, cacheQuote } from "./preise.js";
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

  // Lauf-Ziel (S66, Review 2): `dev` (Default) lässt alles wie bisher;
  // `release` hebt n für Rote-Linien-Szenarien auf mindestens 5 und wird im
  // Ergebnis-JSON festgehalten (stand.ziel) — Berichte bleiben einordbar.
  const ziel = arg("ziel", "dev");
  if (ziel !== "dev" && ziel !== "release") {
    console.error('Ungültiges --ziel: "' + ziel + '" (dev | release).');
    process.exit(2);
  }
  szenarien = wendeZielAn(szenarien, ziel);

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

  const cfgFuer = (prov, key, modell, dr, cache) => prov === "mistral"
    ? { provider: "mistral", mode: "direct", apiKey: key, models: { mistral: modell }, drossel: dr }
    : { provider: "anthropic", mode: "direct", apiKey: key, models: { anthropic: modell }, drossel: dr, cache };

  // Token-Erfassung (S55): zählender Wrapper um beide Adapter — je Aufruf die echten
  // usage-Token (in/out/cacheRead/cacheWrite) aufsummieren und das Ergebnis unverändert
  // durchreichen, damit richte/spieleSample unangetastet bleiben. Pipeline und Judge
  // getrennt, weil unterschiedlich bepreist.
  const tPipe = { in: 0, out: 0, cacheRead: 0, cacheWrite: 0, calls: 0 };
  const tJudge = { in: 0, out: 0, cacheRead: 0, cacheWrite: 0, calls: 0 };
  const zaehl = (fn, akk) => async (...a) => {
    const r = await fn(...a);
    const u = (r && r.usage) || {};
    akk.in += u.in || 0; akk.out += u.out || 0;
    akk.cacheRead += u.cacheRead || 0; akk.cacheWrite += u.cacheWrite || 0; akk.calls++;
    return r;
  };
  // Prompt-Caching: Pipeline AN (großer, je Turn identischer System-Prompt → ~80%
  // Cache-Treffer). Judge AUS (S56): bei n>1 hat jedes Sample ein anderes Transkript →
  // kein Wiederlesen; der Cache wäre reiner Write-Overhead (2,5× Write-Kosten, zählt
  // zudem gegen das Rate-Limit). Telemetrie-belegt: Judge cacheRead=0, cacheWrite>0.
  const pipelineCall = zaehl(makeAdapter(cfgFuer(provider, apiKey, pipelineModell, drosselPipeline, true)), tPipe);
  const judgeCall = zaehl(makeAdapter(cfgFuer(judgeProvider, judgeKey, judgeModell, drosselJudge, false)), tJudge);
  const messen = () => ({ pipe: { ...tPipe }, judge: { ...tJudge } });
  const laufKosten = (pipeTok, judgeTok, faktor = 1, langlebig = false) => {
    // langlebig=true: Pipeline-Cache-Writes zum 1h-Tarif (S65, Batch); der Judge cacht nicht.
    const kp = kostenFuer(pipelineModell, pipeTok, { langlebig }), kj = kostenFuer(judgeModell, judgeTok);
    return (kp == null || kj == null) ? null : { pipeline: kp * faktor, judge: kj * faktor, gesamt: (kp + kj) * faktor };
  };

  // Batch-Modus (S57): kompletter Lauf über die Anthropic Message Batches API (−50 %).
  // Opt-in; ohne bleibt alles synchron. Nur Anthropic (Pipeline UND Judge) — D1.
  const batchModus = process.argv.includes("--batch");
  if (batchModus && (provider !== "anthropic" || judgeProvider !== "anthropic")) {
    console.error("--batch unterstützt nur Anthropic (Pipeline UND Judge). Aktuell: Pipeline " +
      provider + ", Judge " + judgeProvider + ".");
    process.exit(2);
  }
  const batchIntervallMs = (parseInt(arg("batch-intervall", "20"), 10) || 20) * 1000;
  const batchMaxMs = (parseInt(arg("batch-max-min", "60"), 10) || 60) * 60000;

  const hash = await coreHash();
  console.log("Eval-Lauf · Kern " + hash +
    " · Pipeline " + provider + "/" + pipelineModell +
    " · Judge " + judgeProvider + "/" + judgeModell +
    (ziel === "release" ? " · Ziel RELEASE (rote Linien n≥5)" : ""));

  // Judge-Selbsttest (S66): Golden Transcripts mit bekanntem Soll-Urteil laufen
  // VOR dem echten Lauf — schlägt der Judge dort fehl (S52-Fehlurteilsklassen),
  // bricht der Lauf ab, bevor Pipeline-Geld verbrannt wird. Opt-out für
  // Diagnosefälle: --ohne-judge-selbsttest.
  if (!process.argv.includes("--ohne-judge-selbsttest")) {
    process.stdout.write("Judge-Selbsttest (Golden Transcripts) … ");
    // Eigener, ungezählter Judge-Adapter: die Lauf-Telemetrie (S55) bleibt sauber;
    // die geteilte Drossel gilt trotzdem (gleicher Workspace).
    const kal = await pruefeJudge(makeAdapter(cfgFuer(judgeProvider, judgeKey, judgeModell, drosselJudge, false)));
    if (!kal.ok) {
      console.error("FEHLGESCHLAGEN.\nDer Judge weicht vom Soll-Urteil ab — Lauf abgebrochen (kein Pipeline-Verbrauch):");
      for (const a of kal.abweichungen)
        console.error("  · " + a.id + "/" + a.check + ": erwartet " + a.erwartet + ", erhalten " + a.erhalten + "\n    Lehre: " + a.lehre);
      process.exit(3);
    }
    console.log("bestanden (3 Fixtures).");
  }
  console.log("Drossel: Pipeline " + (rpm ? rpm + " RPM" : "unlimited") +
    (crossProvider ? " · Judge unlimited (Provider " + judgeProvider + ")" : " (mit Judge geteilt)") +
    " · Judge-Cache aus" +
    (weiterBeiFehler ? " · weiter-bei-fehler" : ""));
  console.log("Szenarien: " + szenarien.map(s => s.id).join(", ") + (n ? " · n=" + n : ""));
  if (batchModus) console.log("Modus: BATCH (Anthropic, -50%) · Poll " + (batchIntervallMs / 1000) + "s · Cap " + (batchMaxMs / 60000) + "min");

  // Live-Fortschritt (S52/S55). Im Batch-Modus (S57) statt je Szenario je Batch-Phase.
  const melde = ev => {
    if (ev.phase === "batch") { process.stdout.write("[Batch] " + ev.label + " — " + ev.gesamt + " Anfragen "); return; }
    if (ev.phase === "batch-fertig") { process.stdout.write(" fertig\n"); return; }
    if (ev.phase === "start")
      process.stdout.write("[" + String(ev.i).padStart(2) + "/" + ev.gesamt + "] " + ev.id.padEnd(9) + " … ");
    else {
      const k = ev.telemetrie ? laufKosten(ev.telemetrie.pipe, ev.telemetrie.judge) : null;
      process.stdout.write((ev.roteLinie ? "ROT (rote Linie)" : ev.status) +
        (ev.ms != null ? " (" + (ev.ms / 1000).toFixed(1) + "s" + (k ? " · $" + k.gesamt.toFixed(3) : "") + ")" : "") + "\n");
    }
  };

  // Dateipfad + inkrementelle, absturzsichere Persistenz VOR dem Lauf einrichten:
  // nach jedem Szenario wird dieselbe Datei überschrieben — bei Abbruch spiegelt
  // sie den erreichten (Teil-)Stand (vollstaendig:false).
  const zeit = new Date().toISOString();
  const ordner = path.join(ROOT, "evals/ergebnisse");
  await mkdir(ordner, { recursive: true });
  const datei = path.join(ordner, zeit.replace(/[:.]/g, "-") + ".json");   // append-only: neue Datei je Lauf
  const persistiere = async b => { await writeFile(datei, JSON.stringify(b, null, 2)); };

  const stand = {
    coreHash: hash, provider, judgeProvider,
    pipelineModell, judgeModell,
    judgePromptVersion: JUDGE_PROMPT_VERSION,
    batch: batchModus,
    ziel,                                       // dev | release (S66) — n-Politik des Laufs
  };
  const bericht = batchModus
    ? await laufeAlleBatch(szenarien, {
        pipelineModell, judgeModell, n, zeit, persistiere, melde, stand,
        batch: {
          apiKey, intervallMs: batchIntervallMs, maxMs: batchMaxMs,
          fortschritt: () => process.stdout.write("."),
        },
      })
    : await laufeAlle(szenarien, {
        pipelineCall, judgeCall, n, zeit, persistiere, weiterBeiFehler, melde, messen, stand,
      });

  bericht.kosten = laufKosten(bericht.telemetrie.pipe, bericht.telemetrie.judge, batchModus ? 0.5 : 1, batchModus);   // Batch: −50 % + 1h-Write-Tarif (S65)
  await writeFile(datei, JSON.stringify(bericht, null, 2));   // Endstand (vollstaendig:true)

  console.log("\n──── Ergebnis (je Familie, kein Gesamt-Score) ────");
  for (const [fam, q] of Object.entries(bericht.quotenJeFamilie)) {
    console.log(fam.padEnd(6) + " grün " + q.gruen + "/" + q.gesamt +
      (q.rot ? "  ⚠ ROTE LINIE: " + q.rot : "") +
      (q.verletzt ? "  verletzt: " + q.verletzt : "") +
      (q.unbewertet ? "  unbewertet: " + q.unbewertet : "") +
      (q.fehler ? "  fehler: " + q.fehler : ""));
  }
  for (const s of bericht.szenarien)
    if (s.status !== "gruen")
      console.log("  → " + s.id + ": " + s.status + (s.belegloserVerstoss ? "  ⚠ ohne Beleg — prüfen" : ""));

  // Telemetrie-Zeile (S55): echte Token, Cache-Trefferquote, Kosten, Wall-Clock.
  const T = bericht.telemetrie;
  const gesamtTok = {
    in: T.pipe.in + T.judge.in, out: T.pipe.out + T.judge.out,
    cacheRead: T.pipe.cacheRead + T.judge.cacheRead, cacheWrite: T.pipe.cacheWrite + T.judge.cacheWrite,
  };
  const fmt = x => x >= 1e6 ? (x / 1e6).toFixed(2) + "M" : x >= 1e3 ? Math.round(x / 1e3) + "k" : String(x);
  const wall = Math.round(T.ms / 1000);
  console.log("Telemetrie: " + (bericht.kosten ? "~$" + bericht.kosten.gesamt.toFixed(2) + (batchModus ? " (Batch −50%)" : "") : "Kosten n/a (Modellpreis unbekannt)") +
    " · " + fmt(gesamtTok.in + gesamtTok.cacheRead + gesamtTok.cacheWrite) + " in / " + fmt(gesamtTok.out) + " out" +
    " · Cache-Treffer " + (cacheQuote(gesamtTok) * 100).toFixed(0) + "%" +
    " · " + (T.pipe.calls + T.judge.calls) + " Calls" +
    " · " + Math.floor(wall / 60) + ":" + String(wall % 60).padStart(2, "0") + " min");
  console.log("Gespeichert: " + path.relative(ROOT, datei));

  process.exit(bericht.szenarien.every(s => s.status === "gruen") ? 0 : 1);
}

main().catch(e => { console.error("Eval-Lauf fehlgeschlagen:", e.message); process.exit(1); });
