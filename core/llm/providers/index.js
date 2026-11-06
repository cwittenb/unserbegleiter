// Provider-Register (MOD-5). Ein neuer Provider ist eine neue Datei in diesem
// Ordner plus eine Zeile hier; der Adapter kennt nur die Tabelle. Jeder
// Eintrag erfuellt den Provider-Vertrag — tests/unit/mod-provider-vertrag.spec.js
// prueft ihn fuer JEDEN Eintrag der Tabelle, nicht fuer eine Auswahl:
//   url(cfg) · headers(cfg) · body(cfg, system, messages) · streamBody(…) ·
//   structuredBody(…, structured) · parse(data) · streamParse(resp, onDelta) ·
//   parseStructured(data, name) · streamStructuredParse(resp, onDelta)

import { anthropic } from "./anthropic.js";
import { mistral } from "./mistral.js";
import { openai } from "./openai.js";

export const LLM_PROVIDERS = { anthropic, mistral, openai };

/** Die Methoden, die jeder Provider tragen muss (Vertrag). */
export const PROVIDER_VERTRAG = ["url", "headers", "body", "streamBody", "structuredBody", "parse", "streamParse", "parseStructured", "streamStructuredParse"];
