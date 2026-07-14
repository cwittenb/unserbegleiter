// Eval-Konfig (S48): Provider + Modelle aus Flags ODER Env, Flag hat Vorrang.
// Kein Modell-Default im Code (S35d) — fehlt etwas, lauter Fehler statt Fallback.

import { describe, it, expect } from "vitest";
import { leseEvalKonfig, EvalKonfigFehler } from "../../evals/eval-konfig.js";

const OHNE_FLAGS = ["node", "runner.js"];

describe("Eval-Konfig · Flags/Env-Auflösung (S48)", () => {
  it("nur Env: provider + beide Modelle + Key werden gelesen", () => {
    const k = leseEvalKonfig(OHNE_FLAGS, {
      EVAL_PROVIDER: "mistral", EVAL_PIPELINE_MODEL: "pipe-m", EVAL_JUDGE_MODEL: "judge-m",
      MISTRAL_API_KEY: "key-m",
    });
    expect(k).toMatchObject({
      provider: "mistral", keyVar: "MISTRAL_API_KEY", apiKey: "key-m",
      pipelineModell: "pipe-m", judgeModell: "judge-m",
    });
  });

  it("Flag hat Vorrang vor Env (Provider und Modelle)", () => {
    const k = leseEvalKonfig(
      ["node", "runner.js", "--provider", "anthropic", "--pipeline-modell", "flag-p", "--judge-modell", "flag-j"],
      {
        EVAL_PROVIDER: "mistral", EVAL_PIPELINE_MODEL: "env-p", EVAL_JUDGE_MODEL: "env-j",
        ANTHROPIC_API_KEY: "key-a", MISTRAL_API_KEY: "key-m",
      });
    expect(k).toMatchObject({
      provider: "anthropic", keyVar: "ANTHROPIC_API_KEY",
      pipelineModell: "flag-p", judgeModell: "flag-j",
    });
  });

  it("Default-Provider ist anthropic, wenn weder Flag noch Env den Provider nennt", () => {
    const k = leseEvalKonfig(OHNE_FLAGS, {
      EVAL_PIPELINE_MODEL: "p", EVAL_JUDGE_MODEL: "j", ANTHROPIC_API_KEY: "key-a",
    });
    expect(k.provider).toBe("anthropic");
    expect(k.keyVar).toBe("ANTHROPIC_API_KEY");
  });

  it("fehlendes Pipeline- ODER Judge-Modell → EvalKonfigFehler (kein Default)", () => {
    const env = { ANTHROPIC_API_KEY: "key-a", EVAL_JUDGE_MODEL: "j" };   // Pipeline fehlt
    expect(() => leseEvalKonfig(OHNE_FLAGS, env)).toThrow(EvalKonfigFehler);
    expect(() => leseEvalKonfig(OHNE_FLAGS, env)).toThrow(/Pflicht \(S35d\)/);
  });

  it("fehlender Key zum gewählten Provider → Fehler nennt die Key-Variable", () => {
    const env = { EVAL_PROVIDER: "mistral", EVAL_PIPELINE_MODEL: "p", EVAL_JUDGE_MODEL: "j" };
    expect(() => leseEvalKonfig(OHNE_FLAGS, env)).toThrow(/MISTRAL_API_KEY/);
  });

  it("unbekannter Provider → EvalKonfigFehler", () => {
    const env = { EVAL_PROVIDER: "gibtsnicht", EVAL_PIPELINE_MODEL: "p", EVAL_JUDGE_MODEL: "j", ANTHROPIC_API_KEY: "x" };
    expect(() => leseEvalKonfig(OHNE_FLAGS, env)).toThrow(EvalKonfigFehler);
  });

  it("Judge == Pipeline ohne Flag → Fehler; mit --erlaube-gleiches-modell erlaubt", () => {
    const env = { ANTHROPIC_API_KEY: "key-a", EVAL_PIPELINE_MODEL: "same", EVAL_JUDGE_MODEL: "same" };
    expect(() => leseEvalKonfig(OHNE_FLAGS, env)).toThrow(/identisch|Judge-Trennung/);
    const k = leseEvalKonfig(["node", "runner.js", "--erlaube-gleiches-modell"], env);
    expect(k.pipelineModell).toBe("same");
    expect(k.judgeModell).toBe("same");
  });
});
