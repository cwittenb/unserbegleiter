// S35d · Grep-Wächter (nach dem Muster des Key-Wächters): Provider-/Modell-
// wissen darf im Quellcode NUR in der Artefakt-Plattform leben. Überall sonst
// ist es Konfigurationspflicht (Worker: env, Runner: CLI-Flags) — fehlende
// Konfiguration führt zur Fehlermeldung, nie zu einem stillen Fallback.
// Kommentare werden vor der Prüfung entfernt (Erklärtexte dürfen Modellnamen
// erwähnen); Strings NICHT — genau dort leben Fallbacks.

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));

// Geprüfte Quellcode-Wurzeln; die Artefakt-Plattform ist die sanktionierte Ausnahme.
const WURZELN = ["core", "platforms", "evals", "scripts"];
const AUSNAHME = path.join("platforms", "artifact") + path.sep;

function jsDateien(dir, aus = []) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (name === "node_modules" || name.startsWith(".")) continue;
    if (statSync(p).isDirectory()) jsDateien(p, aus);
    else if (name.endsWith(".js")) aus.push(p);
  }
  return aus;
}

function ohneKommentare(quelle) {
  return quelle
    .replace(/\/\*[\s\S]*?\*\//g, "")     // Blockkommentare
    .replace(/^\s*\/\/.*$/gm, "");        // reine Kommentarzeilen (URLs in Code bleiben unberührt)
}

const MODELL_MUSTER = /\b(?:claude|gpt)-[0-9a-z][0-9a-z.-]*|mistral-(?:large|medium|small|tiny)[0-9a-z.-]*/i;
const PROVIDER_FALLBACK = /\|\|\s*["'](?:anthropic|mistral|openai)["']/;

describe("LLM-Konfigurations-Wächter (S35d)", () => {
  const dateien = WURZELN
    .flatMap(w => jsDateien(path.join(ROOT, w)))
    .filter(p => !path.relative(ROOT, p).startsWith(AUSNAHME));

  it("erfasst eine plausible Menge Quelldateien (Selbsttest des Wächters)", () => {
    expect(dateien.length).toBeGreaterThan(10);
  });

  it("kein Modellname außerhalb der Artefakt-Plattform (Kommentare ausgenommen)", () => {
    const treffer = [];
    for (const p of dateien) {
      const rein = ohneKommentare(readFileSync(p, "utf8"));
      const m = rein.match(MODELL_MUSTER);
      if (m) treffer.push(path.relative(ROOT, p) + " → " + m[0]);
    }
    expect(treffer, "Modellwissen gehört in Konfiguration, nicht in Code:\n" + treffer.join("\n")).toEqual([]);
  });

  it("kein Provider-Fallback (|| \"anthropic\" o. ä.) außerhalb der Artefakt-Plattform", () => {
    const treffer = [];
    for (const p of dateien) {
      const rein = ohneKommentare(readFileSync(p, "utf8"));
      if (PROVIDER_FALLBACK.test(rein)) treffer.push(path.relative(ROOT, p));
    }
    expect(treffer, "Provider-Fallbacks sind verboten (S35d):\n" + treffer.join("\n")).toEqual([]);
  });

  it("die Artefakt-Ausnahme existiert und ist explizit (llm-config.js)", () => {
    const quelle = readFileSync(path.join(ROOT, "platforms/artifact/llm-config.js"), "utf8");
    expect(quelle).toContain("ARTEFAKT_LLM");
    expect(quelle).toMatch(MODELL_MUSTER);
  });
});
