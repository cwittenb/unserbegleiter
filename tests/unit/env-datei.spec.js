// Eval .env (S49): der Runner liest eine .env, falls vorhanden. Reihenfolge
// CLI-Flag > echte Umgebung > .env > Vorgabe — process.env schlägt die Datei,
// die Datei füllt nur Lücken. Fehlende Datei ist kein Fehler.

import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseEnv, liesEnvDatei, mischeMitEnv } from "../../evals/env-datei.js";

describe("Eval .env · parseEnv (S49)", () => {
  it("KEY=WERT; ignoriert Kommentare/Leerzeilen; erlaubt export und Quotes; trimmt", () => {
    const text = [
      "# Kommentar",
      "",
      "EVAL_PROVIDER=mistral",
      "export EVAL_PIPELINE_MODEL =  pipe-m  ",
      'ANTHROPIC_API_KEY="sk-mit-quotes"',
      "MISTRAL_API_KEY='sk-single'",
      "OHNE_GLEICHZEICHEN",
      "=leererschluessel",
    ].join("\n");
    expect(parseEnv(text)).toEqual({
      EVAL_PROVIDER: "mistral",
      EVAL_PIPELINE_MODEL: "pipe-m",
      ANTHROPIC_API_KEY: "sk-mit-quotes",
      MISTRAL_API_KEY: "sk-single",
    });
  });

  it("leerer Text → leeres Objekt", () => {
    expect(parseEnv("")).toEqual({});
  });
});

describe("Eval .env · mischeMitEnv (S49)", () => {
  it("echte Umgebung gewinnt über .env; .env füllt nur Lücken", () => {
    const gemischt = mischeMitEnv(
      { EVAL_PROVIDER: "anthropic" },                                  // process.env
      { EVAL_PROVIDER: "mistral", EVAL_JUDGE_MODEL: "j" },             // .env
    );
    expect(gemischt.EVAL_PROVIDER).toBe("anthropic");   // process.env schlägt Datei
    expect(gemischt.EVAL_JUDGE_MODEL).toBe("j");         // Datei füllt Lücke
  });
});

describe("Eval .env · liesEnvDatei (S49)", () => {
  it("fehlende Datei → leeres Objekt, kein Fehler", () => {
    expect(liesEnvDatei(path.join(os.tmpdir(), "gibt-es-nicht-" + Date.now(), ".env"))).toEqual({});
  });

  it("liest eine echte .env-Datei vom Pfad", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "env-datei-test-"));
    const p = path.join(dir, ".env");
    writeFileSync(p, "EVAL_JUDGE_MODEL=judge-x\n# Zeile\nEVAL_PROVIDER=mistral\n");
    expect(liesEnvDatei(p)).toEqual({ EVAL_JUDGE_MODEL: "judge-x", EVAL_PROVIDER: "mistral" });
  });
});
