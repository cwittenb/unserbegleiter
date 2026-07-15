// Judge-Provider-Isolation (S52): --judge-provider/--judge-key lassen den Judge auf
// einem ANDEREN Provider/Key laufen als die Pipeline. Default = Pipeline-Provider
// (dann verhält sich alles wie zuvor — siehe eval-konfig.spec.js).

import { describe, it, expect } from "vitest";
import { leseEvalKonfig, EvalKonfigFehler } from "../../evals/eval-konfig.js";

const R = (...flags) => ["node", "runner.js", ...flags];
const BEIDE = {
  EVAL_ANTHROPIC_PIPELINE_MODEL: "a-pipe", EVAL_ANTHROPIC_JUDGE_MODEL: "a-judge",
  EVAL_MISTRAL_PIPELINE_MODEL: "m-pipe", EVAL_MISTRAL_JUDGE_MODEL: "m-judge",
  ANTHROPIC_API_KEY: "key-a", MISTRAL_API_KEY: "key-m",
};

describe("Eval-Konfig · Judge-Provider/-Key", () => {
  it("Default: judgeProvider = Pipeline-Provider, judgeKey = Pipeline-Key", () => {
    const k = leseEvalKonfig(R("--provider", "mistral"), BEIDE);
    expect(k).toMatchObject({
      provider: "mistral", apiKey: "key-m", pipelineModell: "m-pipe",
      judgeProvider: "mistral", judgeKey: "key-m", judgeModell: "m-judge",
    });
  });

  it("--judge-provider anthropic bei Pipeline mistral: Judge-Modell UND -Key vom Judge-Provider", () => {
    const k = leseEvalKonfig(R("--provider", "mistral", "--judge-provider", "anthropic"), BEIDE);
    expect(k).toMatchObject({
      provider: "mistral", apiKey: "key-m", pipelineModell: "m-pipe",
      judgeProvider: "anthropic", judgeKey: "key-a", judgeModell: "a-judge",
    });
  });

  it("--judge-key überschreibt den Env-Key des Judge-Providers", () => {
    const k = leseEvalKonfig(R("--provider", "mistral", "--judge-provider", "anthropic", "--judge-key", "sk-explizit"), BEIDE);
    expect(k.judgeKey).toBe("sk-explizit");
  });

  it("verschiedene Provider heben den Gleiches-Modell-Guard auf (gleicher String erlaubt)", () => {
    const env = { ...BEIDE, EVAL_MISTRAL_PIPELINE_MODEL: "x", EVAL_ANTHROPIC_JUDGE_MODEL: "x" };
    const k = leseEvalKonfig(R("--provider", "mistral", "--judge-provider", "anthropic"), env);
    expect(k.pipelineModell).toBe("x");
    expect(k.judgeModell).toBe("x");   // kein Wurf trotz gleichem String
  });

  it("unbekannter --judge-provider → EvalKonfigFehler", () => {
    expect(() => leseEvalKonfig(R("--provider", "mistral", "--judge-provider", "nope"), BEIDE))
      .toThrow(EvalKonfigFehler);
  });

  it("cross-Provider ohne Judge-Key → Fehler nennt Key-Variable bzw. --judge-key", () => {
    const env = {
      EVAL_PROVIDER: "mistral", MISTRAL_API_KEY: "key-m",
      EVAL_MISTRAL_PIPELINE_MODEL: "m-pipe", EVAL_ANTHROPIC_JUDGE_MODEL: "a-judge",   // kein ANTHROPIC_API_KEY
    };
    expect(() => leseEvalKonfig(R("--judge-provider", "anthropic"), env)).toThrow(/ANTHROPIC_API_KEY|judge-key/);
  });

  it("fehlendes Judge-Modell beim Judge-Provider → Pflicht-Fehler nennt EVAL_<JUDGE>_JUDGE_MODEL", () => {
    const env = {
      EVAL_PROVIDER: "mistral", MISTRAL_API_KEY: "key-m",
      EVAL_MISTRAL_PIPELINE_MODEL: "m-pipe", ANTHROPIC_API_KEY: "key-a",   // EVAL_ANTHROPIC_JUDGE_MODEL fehlt
    };
    expect(() => leseEvalKonfig(R("--judge-provider", "anthropic"), env)).toThrow(/EVAL_ANTHROPIC_JUDGE_MODEL/);
  });
});
