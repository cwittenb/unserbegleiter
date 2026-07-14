// Eval-Konfiguration aus Flags UND Umgebung — Flag hat Vorrang vor Env, Env vor
// Vorgabe. So kannst du provider + beide Modelle EINMAL in die Umgebung legen
// und danach nur noch die Lauf-Selektoren (--familie/--szenario/…) angeben.
//
//   Env:  EVAL_PROVIDER (anthropic | mistral) — wählt zugleich das Modellpaar
//         EVAL_ANTHROPIC_PIPELINE_MODEL · EVAL_ANTHROPIC_JUDGE_MODEL
//         EVAL_MISTRAL_PIPELINE_MODEL   · EVAL_MISTRAL_JUDGE_MODEL
//         ANTHROPIC_API_KEY bzw. MISTRAL_API_KEY (Key zum gewählten Provider)
//
// Modelle haben KEINEN Code-Default (S35d): fehlt Pipeline- oder Judge-Modell in
// beiden Quellen, wirft leseEvalKonfig — der Runner macht daraus eine klare
// CLI-Meldung. Reine Funktion über (argv, env), damit isoliert testbar.

export class EvalKonfigFehler extends Error {}

// Provider → Name der Key-Variable. Die Schlüssel dieses Objekts sind zugleich
// die erlaubten Provider — eine einzige Quelle der Wahrheit.
const PROVIDER_KEY = { anthropic: "ANTHROPIC_API_KEY", mistral: "MISTRAL_API_KEY" };

export function leseEvalKonfig(argv, env) {
  const arg = (name, fallback) => {
    const i = argv.indexOf("--" + name);
    return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : fallback;
  };
  const flag = name => argv.includes("--" + name);

  const providerVorgabe = env.EVAL_PROVIDER ? env.EVAL_PROVIDER : "anthropic";
  const provider = arg("provider", providerVorgabe);
  const keyVar = PROVIDER_KEY[provider];
  if (!keyVar)
    throw new EvalKonfigFehler('Unbekannter Provider "' + provider + '" — erlaubt: ' +
      Object.keys(PROVIDER_KEY).join(" | ") + " (Flag --provider oder EVAL_PROVIDER).");

  const apiKey = env[keyVar];
  if (!apiKey)
    throw new EvalKonfigFehler("Kein Schlüssel gefunden: bitte " + keyVar + " setzen.\n" +
      "Beispiel:  " + keyVar + "=sk-… npm run eval -- --familie GATE");

  // Modelle liegen pro Provider getrennt vor (EVAL_<PROVIDER>_PIPELINE_MODEL /
  // EVAL_<PROVIDER>_JUDGE_MODEL) — so wählt EVAL_PROVIDER zugleich das Modellpaar;
  // beide Paare dürfen gleichzeitig in Umgebung/.env stehen.
  const pOben = provider.toUpperCase();
  const pipelineModell = arg("pipeline-modell", env["EVAL_" + pOben + "_PIPELINE_MODEL"]);
  const judgeModell = arg("judge-modell", env["EVAL_" + pOben + "_JUDGE_MODEL"]);
  if (!pipelineModell || !judgeModell)
    throw new EvalKonfigFehler(
      'Modell-Konfiguration ist Pflicht (S35d) für Provider "' + provider + '": Pipeline- UND Judge-Modell angeben —\n' +
      "  per Flag:  --pipeline-modell <m> --judge-modell <m>\n" +
      "  oder Env:  EVAL_" + pOben + "_PIPELINE_MODEL=<m>  EVAL_" + pOben + "_JUDGE_MODEL=<m>\n" +
      "(Flag hat Vorrang vor Env; kein Modell-Default im Code.)");

  if (pipelineModell === judgeModell && !flag("erlaube-gleiches-modell"))
    throw new EvalKonfigFehler(
      "Judge-Modell und Pipeline-Modell sind identisch (" + pipelineModell + ").\n" +
      "Das verletzt die Judge-Trennung (Self-Preference-Bias). Wenn du das wirklich\n" +
      "willst: --erlaube-gleiches-modell setzen.");

  return { provider, keyVar, apiKey, pipelineModell, judgeModell };
}
