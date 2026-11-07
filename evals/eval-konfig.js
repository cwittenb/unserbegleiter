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

  // Judge darf auf einem ANDEREN Provider/Key laufen (echte Judge-Isolation, S52).
  // --judge-provider wählt den Judge-Provider (Default = Pipeline-Provider); das
  // Judge-Modell kommt dann aus dessen Paar (EVAL_<JUDGE>_JUDGE_MODEL) bzw.
  // --judge-modell, der Key aus --judge-key bzw. der Key-Variable des Judge-Providers.
  const judgeProvider = arg("judge-provider", provider);
  const jKeyVar = PROVIDER_KEY[judgeProvider];
  if (!jKeyVar)
    throw new EvalKonfigFehler('Unbekannter --judge-provider "' + judgeProvider + '" — erlaubt: ' +
      Object.keys(PROVIDER_KEY).join(" | ") + ".");
  const jOben = judgeProvider.toUpperCase();
  const judgeModell = arg("judge-modell", env["EVAL_" + jOben + "_JUDGE_MODEL"]);
  const judgeKey = arg("judge-key", env[jKeyVar]);

  if (!pipelineModell || !judgeModell)
    throw new EvalKonfigFehler(
      'Modell-Konfiguration ist Pflicht (S35d) für Provider "' + provider + '"' +
      (judgeProvider !== provider ? ' (Judge-Provider "' + judgeProvider + '")' : '') +
      ": Pipeline- UND Judge-Modell angeben —\n" +
      "  per Flag:  --pipeline-modell <m> --judge-modell <m>\n" +
      "  oder Env:  EVAL_" + pOben + "_PIPELINE_MODEL=<m>  EVAL_" + jOben + "_JUDGE_MODEL=<m>\n" +
      "(Flag hat Vorrang vor Env; kein Modell-Default im Code.)");

  if (judgeProvider !== provider && !judgeKey)
    throw new EvalKonfigFehler("Kein Judge-Schlüssel gefunden: bitte " + jKeyVar +
      " setzen oder --judge-key <key> angeben (Judge-Provider: " + judgeProvider + ").");

  // Self-Preference-Guard nur bei GLEICHEM Provider sinnvoll — verschiedene Provider
  // können nicht dasselbe Modell sein.
  if (judgeProvider === provider && pipelineModell === judgeModell && !flag("erlaube-gleiches-modell"))
    throw new EvalKonfigFehler(
      "Judge-Modell und Pipeline-Modell sind identisch (" + pipelineModell + ").\n" +
      "Das verletzt die Judge-Trennung (Self-Preference-Bias). Wenn du das wirklich\n" +
      "willst: --erlaube-gleiches-modell setzen.");

  /* S144 · Denkmodus der PIPELINE. "aus" ist die Vorgabe seit S77 und bleibt
     es — alle bisherigen Ergebnisse sind so entstanden. Neuere Anthropic-Modelle
     lehnen thinking:"disabled" ab; für sie gibt es "zwischen-tools" (ohne Tools
     gleichwertig) oder "adaptiv". Der Judge denkt immer adaptiv (S77). */
  const denkmodus = arg("denkmodus", "aus");
  const DENKMODUS = { "aus": "disabled", "adaptiv": "adaptiv", "zwischen-tools": "zwischen-tools" };
  if (!Object.hasOwn(DENKMODUS, denkmodus))
    throw new EvalKonfigFehler('Ungültiger --denkmodus "' + denkmodus + '" — erlaubt: ' +
      Object.keys(DENKMODUS).join(" | ") + " (wirkt nur bei Anthropic).");
  const pipelineThinking = DENKMODUS[denkmodus];

  /* S147 · Denkaufwand der PIPELINE für die Mistral-Plattform (reasoning_effort).
     Ohne Flag wird nichts gesendet. Welche Werte ein Modell annimmt, entscheidet
     der Anbieter (GLM 5.3: low|high|max; Medium 3.5: none|high) — hier nur die
     Obermenge, damit ein Tippfehler nicht still als Vorgabe läuft. */
  const denkaufwand = arg("denkaufwand", null);
  const DENKAUFWAND = ["none", "low", "medium", "high", "max"];
  if (denkaufwand !== null && !DENKAUFWAND.includes(denkaufwand))
    throw new EvalKonfigFehler('Ungültiger --denkaufwand "' + denkaufwand + '" — erlaubt: ' + DENKAUFWAND.join(" | ") + ".");
  if (denkaufwand !== null && provider !== "mistral")
    throw new EvalKonfigFehler("--denkaufwand wirkt nur bei --provider mistral (Anthropic: --denkmodus).");

  // S147 · Token-Deckel der Pipeline (Vorgabe 4096 aus LLM_DEFAULTS). Reasoning-
  // Modelle verbrauchen ihn vor dem ersten Text (Large 4, S144c).
  const mt = arg("max-tokens", null);
  const maxTokens = mt === null ? null : Number(mt);
  if (mt !== null && !(Number.isInteger(maxTokens) && maxTokens >= 256 && maxTokens <= 131072))
    throw new EvalKonfigFehler('Ungültiges --max-tokens "' + mt + '" — ganze Zahl zwischen 256 und 131072.');

  return { provider, keyVar, apiKey, pipelineModell, judgeProvider, jKeyVar, judgeKey, judgeModell, denkmodus, pipelineThinking, denkaufwand, maxTokens };
}
