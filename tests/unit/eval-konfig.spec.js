// Eval-Konfig: Provider + Modelle aus Flags ODER Env, Flag hat Vorrang. Modelle
// liegen pro Provider getrennt vor (EVAL_<PROVIDER>_PIPELINE_MODEL /
// EVAL_<PROVIDER>_JUDGE_MODEL) — EVAL_PROVIDER wählt zugleich das Paar (S50).
// Kein Modell-Default im Code (S35d) — fehlt etwas, lauter Fehler statt Fallback.

import { describe, it, expect } from "vitest";
import { leseEvalKonfig, EvalKonfigFehler } from "../../evals/eval-konfig.js";

const OHNE_FLAGS = ["node", "runner.js"];

// Beide Provider-Paare gleichzeitig gesetzt — nur EVAL_PROVIDER unterscheidet.
const BEIDE_PAARE = {
  EVAL_ANTHROPIC_PIPELINE_MODEL: "a-pipe",
  EVAL_ANTHROPIC_JUDGE_MODEL: "a-judge",
  EVAL_MISTRAL_PIPELINE_MODEL: "m-pipe",
  EVAL_MISTRAL_JUDGE_MODEL: "m-judge",
  ANTHROPIC_API_KEY: "key-a",
  MISTRAL_API_KEY: "key-m",
};

describe("Eval-Konfig · Flags/Env-Auflösung", () => {
  it("nur Env: provider + providerspezifisches Modellpaar + Key", () => {
    const k = leseEvalKonfig(OHNE_FLAGS, {
      EVAL_PROVIDER: "mistral",
      EVAL_MISTRAL_PIPELINE_MODEL: "pipe-m", EVAL_MISTRAL_JUDGE_MODEL: "judge-m",
      MISTRAL_API_KEY: "key-m",
    });
    expect(k).toMatchObject({
      provider: "mistral", keyVar: "MISTRAL_API_KEY", apiKey: "key-m",
      pipelineModell: "pipe-m", judgeModell: "judge-m",
    });
  });

  it("Provider-Schalter: allein EVAL_PROVIDER wählt das Modellpaar (beide Paare gesetzt)", () => {
    const a = leseEvalKonfig(OHNE_FLAGS, { EVAL_PROVIDER: "anthropic", ...BEIDE_PAARE });
    expect(a).toMatchObject({
      provider: "anthropic", keyVar: "ANTHROPIC_API_KEY",
      pipelineModell: "a-pipe", judgeModell: "a-judge",
    });
    const m = leseEvalKonfig(OHNE_FLAGS, { EVAL_PROVIDER: "mistral", ...BEIDE_PAARE });
    expect(m).toMatchObject({
      provider: "mistral", keyVar: "MISTRAL_API_KEY",
      pipelineModell: "m-pipe", judgeModell: "m-judge",
    });
  });

  it("Flag hat Vorrang vor Env (Provider und Modelle)", () => {
    const k = leseEvalKonfig(
      ["node", "runner.js", "--provider", "anthropic", "--pipeline-modell", "flag-p", "--judge-modell", "flag-j"],
      { EVAL_PROVIDER: "mistral", ...BEIDE_PAARE });
    expect(k).toMatchObject({
      provider: "anthropic", keyVar: "ANTHROPIC_API_KEY",
      pipelineModell: "flag-p", judgeModell: "flag-j",
    });
  });

  it("Default-Provider ist anthropic, wenn weder Flag noch Env den Provider nennt", () => {
    const k = leseEvalKonfig(OHNE_FLAGS, {
      EVAL_ANTHROPIC_PIPELINE_MODEL: "p", EVAL_ANTHROPIC_JUDGE_MODEL: "j", ANTHROPIC_API_KEY: "key-a",
    });
    expect(k.provider).toBe("anthropic");
    expect(k.keyVar).toBe("ANTHROPIC_API_KEY");
  });

  it("Modelle des ANDEREN Providers zählen nicht: fehlt das Paar zum gewählten Provider → Fehler", () => {
    // anthropic gewählt, aber nur die MISTRAL-Modelle gesetzt
    const env = {
      EVAL_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "key-a",
      EVAL_MISTRAL_PIPELINE_MODEL: "m-pipe", EVAL_MISTRAL_JUDGE_MODEL: "m-judge",
    };
    expect(() => leseEvalKonfig(OHNE_FLAGS, env)).toThrow(EvalKonfigFehler);
    expect(() => leseEvalKonfig(OHNE_FLAGS, env)).toThrow(/EVAL_ANTHROPIC_PIPELINE_MODEL/);
  });

  it("fehlendes Pipeline- ODER Judge-Modell → EvalKonfigFehler (kein Default)", () => {
    const env = { ANTHROPIC_API_KEY: "key-a", EVAL_ANTHROPIC_JUDGE_MODEL: "j" };   // Pipeline fehlt
    expect(() => leseEvalKonfig(OHNE_FLAGS, env)).toThrow(EvalKonfigFehler);
    expect(() => leseEvalKonfig(OHNE_FLAGS, env)).toThrow(/Pflicht \(S35d\)/);
  });

  it("fehlender Key zum gewählten Provider → Fehler nennt die Key-Variable", () => {
    const env = { EVAL_PROVIDER: "mistral", EVAL_MISTRAL_PIPELINE_MODEL: "p", EVAL_MISTRAL_JUDGE_MODEL: "j" };
    expect(() => leseEvalKonfig(OHNE_FLAGS, env)).toThrow(/MISTRAL_API_KEY/);
  });

  it("unbekannter Provider → EvalKonfigFehler", () => {
    const env = { EVAL_PROVIDER: "gibtsnicht", ANTHROPIC_API_KEY: "x" };
    expect(() => leseEvalKonfig(OHNE_FLAGS, env)).toThrow(EvalKonfigFehler);
  });

  it("Judge == Pipeline ohne Flag → Fehler; mit --erlaube-gleiches-modell erlaubt", () => {
    const env = { ANTHROPIC_API_KEY: "key-a", EVAL_ANTHROPIC_PIPELINE_MODEL: "same", EVAL_ANTHROPIC_JUDGE_MODEL: "same" };
    expect(() => leseEvalKonfig(OHNE_FLAGS, env)).toThrow(/identisch|Judge-Trennung/);
    const k = leseEvalKonfig(["node", "runner.js", "--erlaube-gleiches-modell"], env);
    expect(k.pipelineModell).toBe("same");
    expect(k.judgeModell).toBe("same");
  });
});
