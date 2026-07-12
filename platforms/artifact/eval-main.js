// Bootstrap des Eval-Artefakts: echter keyless-Adapter über die
// Artefakt-Umgebung — dieselbe Mechanik wie das v0.29-Harness.

import { SZENARIEN } from "../../evals/szenarien/start-katalog.js";
import { SZENARIEN_EN } from "../../evals/szenarien/start-katalog.en.js";
import { makeAdapter } from "../../core/llm/adapter.js";
import { ARTEFAKT_LLM } from "./llm-config.js";
import { createEvalApp } from "./eval-app.js";

const machAdapter = modell =>
  makeAdapter({ ...ARTEFAKT_LLM, models: { anthropic: modell || ARTEFAKT_LLM.models.anthropic } });

createEvalApp({
  doc: document,
  root: document.getElementById("app"),
  szenarien: [...SZENARIEN, ...SZENARIEN_EN],
  machAdapter,
});
