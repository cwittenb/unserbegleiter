#!/usr/bin/env node
// Judge-Selbsttest-Sonde · Rauschen oder Drift?
//
// ANLASS (1. Aug 2026): Der GATE-Lauf brach am Selbsttest ab —
// GOLD-ZUSATZ/C1 erwartet »ja«, erhalten »nein«. Genau diese Fehlurteilsklasse
// (ZUSATZFORDERUNG) hat j8 adressiert; der Fall IST der j8-Kanarienvogel.
//
// Der Selbsttest in runner.js fährt jeden Golden Case GENAU EINMAL. Damit kippt
// ein einzelner stochastischer Ausrutscher den ganzen Lauf — und umgekehrt
// bliebe eine echte Drift unbemerkt, wenn der eine Durchgang zufällig passt.
// Diese Sonde wiederholt den Selbsttest n-fach und trennt die beiden Fälle:
//
//   · Trefferquote ~n/n bis auf Ausreißer  →  RAUSCHEN. Der Selbsttest
//     braucht eine Wiederholungs-Politik (Vorschlag im Ergebnisblock), nicht
//     der Judge-Prompt eine Änderung.
//   · Quote systematisch unter der Hälfte  →  DRIFT. Dann gehört der Fall in
//     einen Judge-Sprint (j9), nicht in einen Workaround.
//
// Sie kostet NUR Judge-Aufrufe (keine Pipeline) und ist damit billig.
//
// WICHTIG: --ohne-judge-selbsttest ist KEIN Ausweg. Der Selbsttest schützt die
// GATE-Zahlen; ein GATE-Lauf mit driftendem Judge misst nichts Belastbares.
//
// AUFRUF:  node docs/probe-judge-golden.mjs [--n=5] [--fall=GOLD-ZUSATZ]
// Modelle/Schlüssel aus der .env im Repo-Root (EVAL_ANTHROPIC_JUDGE_MODEL,
// ANTHROPIC_API_KEY; process.env gewinnt).

import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeAdapter } from "../core/llm/adapter.js";
import { richte, JUDGE_PROMPT_VERSION } from "../evals/judge/judge.js";
import { GOLDEN } from "../evals/judge/golden.js";
import { liesEnvDatei, mischeMitEnv } from "../evals/env-datei.js";

const WURZEL = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ENV = mischeMitEnv(process.env, liesEnvDatei(path.join(WURZEL, ".env")));
const arg = (name, def) => {
  const a = process.argv.find(x => x.startsWith("--" + name + "="));
  return a ? a.split("=")[1] : def;
};
const N = Number(arg("n", 5));
const FALL = arg("fall", null);
const MODELL = arg("model", ENV.EVAL_ANTHROPIC_JUDGE_MODEL);

if (!ENV.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY fehlt — in die .env im Repo-Root eintragen.");
  process.exit(2);
}
if (!MODELL) {
  console.error("Judge-Modell fehlt — EVAL_ANTHROPIC_JUDGE_MODEL in der .env setzen (oder --model=…).");
  process.exit(2);
}

const judgeCall = makeAdapter({
  mode: "direct", provider: "anthropic", apiKey: ENV.ANTHROPIC_API_KEY,
  models: { anthropic: MODELL }, thinking: "adaptiv", cache: false,
});

const faelle = FALL ? GOLDEN.filter(g => g.id === FALL) : GOLDEN;
if (!faelle.length) { console.error("Kein Golden Case mit id=" + FALL); process.exit(2); }

console.log("Judge-Sonde · " + MODELL + " · Prompt " + JUDGE_PROMPT_VERSION +
  " · " + faelle.length + " Fälle × " + N + " Läufe\n");

const bilanz = [];
for (const g of faelle) {
  const je = {};
  const belege = [];
  for (let i = 1; i <= N; i++) {
    let urteil;
    try { urteil = await richte(judgeCall, g.szenario, g.transkript, {}); }
    catch (e) { urteil = { bewertet: false, fehler: e.message.slice(0, 120) }; }
    for (const [check, soll] of Object.entries(g.erwartet)) {
      const eintrag = urteil.bewertet && urteil.antworten[check];
      const ist = eintrag ? eintrag.antwort : (urteil.bewertet ? "—" : "unbewertet");
      const k = check;
      je[k] ||= { soll, treffer: 0, gesamt: 0 };
      je[k].gesamt++;
      if (ist === soll) je[k].treffer++;
      else belege.push("  Lauf " + i + " · " + k + ": " + ist + " (soll " + soll + ")" +
        (eintrag && eintrag.beleg ? "\n     Beleg: " + eintrag.beleg.slice(0, 200) : "") +
        (urteil.fehler ? "\n     Fehler: " + urteil.fehler : ""));
    }
  }
  for (const [check, q] of Object.entries(je)) {
    const quote = q.treffer + "/" + q.gesamt;
    console.log((q.treffer === q.gesamt ? "✓ " : "✗ ") + g.id + "/" + check +
      "  Soll " + q.soll + " · getroffen " + quote);
    bilanz.push({ id: g.id, check, ...q });
  }
  for (const b of belege) console.log(b);
  if (belege.length) console.log("  Lehre: " + g.lehre + "\n");
}

console.log("\n==== BILANZ ====");
const wackelig = bilanz.filter(b => b.treffer < b.gesamt);
if (!wackelig.length) {
  console.log("Alle Fälle " + N + "/" + N + " — der Judge urteilt hier stabil.");
  console.log("Zwei Lesarten, die die Sonde NICHT unterscheiden kann:");
  console.log("  · Wurde seit dem Abbruch nichts geändert → Einzelausreißer (Rauschen);");
  console.log("    dann genügt ein Neustart des Laufs. Offener Kandidat bleibt eine");
  console.log("    Wiederholungs-Politik im Selbsttest (best-of-3 je Fall).");
  console.log("  · Wurde die Ursache behoben (Prüffrage, Golden Case, Judge-Prompt) →");
  console.log("    das Grün ist der Beleg des Fixes, kein Beweis für Rauschen.");
} else {
  for (const b of wackelig)
    console.log(b.id + "/" + b.check + ": " + b.treffer + "/" + b.gesamt +
      (b.treffer * 2 < b.gesamt ? "  → DRIFT (systematisch)" : "  → wackelig (stochastisch)"));
  console.log("\nKonsequenz bei DRIFT: eigener Judge-Sprint (j9) für die betroffene");
  console.log("Fehlurteilsklasse — nicht --ohne-judge-selbsttest, das misst nur weg.");
}
