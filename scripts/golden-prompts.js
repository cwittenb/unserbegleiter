#!/usr/bin/env node
// MOD-0 · Golden-Snapshot der Systemprompte.
//
// Die MOD-Serie zerlegt den Korpus in Schichten (Wissen · Policies · Format ·
// Sessions) und zieht die Komposition an einen Ort. Kein Schritt darf dabei
// den Text aendern, den das Modell sieht. Dieser Snapshot haelt den Text fest:
// je Session-Art, je Sprache, je Pfad (Text / Struktur) ein SHA-256 — und
// zusaetzlich den Pfad des Eval-Runners (sysPromptFuer), damit MOD-1 beweisen
// kann, dass Produktion und Eval nach dem Umbau dasselbe bauen.
//
// Gelesen wird er von tests/unit/mod-golden-prompts.spec.js. Bewusst
// aktualisiert wird er NUR hier:
//
//   node scripts/golden-prompts.js --schreibe
//
// Ein Hash-Wechsel ohne diesen Aufruf ist ein Test-Rot — und soll es sein.
// Die Festwerte (Anna/Bernd) sind die des Eval-Runners.

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const GOLDEN_PFAD = (sprache) => path.join(ROOT, "tests/fixtures/golden/prompts-" + sprache + ".json");

export const FEST_KONTEXT = { me: "Anna", partner: "Bernd", nameA: "Anna", nameB: "Bernd" };
export const SESSION_ARTEN = ["solo", "moment", "einzel", "gemeinsam"];

const sha = (s) => createHash("sha256").update(String(s), "utf8").digest("hex");

/**
 * Baut die Hash-Tabelle einer Sprache. Importe laufen dynamisch, damit das
 * Script wie der Test den EN-Korpus registrieren kann, bevor K() ihn braucht.
 */
export async function baueGolden(sprache) {
  const prompts = await import("../core/prompts/prompts.js");
  if (sprache === "en") {
    const en = await import("../core/prompts/prompts.en.js");
    prompts.registerKorpus("en", en);
  }
  const { soloDef, momentDef } = await import("../core/ui/sessions.js");
  const { einzelDef, gemeinsamDef } = await import("../core/ui/kernwetten.js");
  const { schalteStruktur } = await import("../core/prompts/struktur-praeambel.js");
  const { sysPromptFuer } = await import("../evals/runner-kern.js");

  prompts.setKorpusSprache(sprache);
  const backend = {};   // Defs lesen das Backend erst in Handlern, nie beim Bau des Systemtexts
  const bauer = { solo: soloDef, moment: momentDef, einzel: einzelDef, gemeinsam: gemeinsamDef };

  const golden = { sprache, kontext: FEST_KONTEXT, sessions: {} };
  for (const art of SESSION_ARTEN) {
    const def = bauer[art](backend);
    const text = def.sysPrompt(FEST_KONTEXT);
    const struktur = schalteStruktur(bauer[art](backend)).sysPrompt(FEST_KONTEXT);
    const runner = sysPromptFuer({ id: "golden-" + art, session: art, sprache, kontext: FEST_KONTEXT });
    golden.sessions[art] = {
      text: sha(text), textLaenge: text.length,
      struktur: sha(struktur),
      runner: sha(runner), runnerGleichText: runner === text,
    };
  }
  const P = prompts.getPrompts(sprache);
  const qz = P.qzMenuePrompt();
  golden.sessions.qualitytime = {
    text: sha(qz), textLaenge: qz.length,
    runner: sha(sysPromptFuer({ id: "golden-qz", session: "qualitytime", sprache, kontext: {} })),
  };
  return golden;
}

export function liesGolden(sprache) {
  return JSON.parse(readFileSync(GOLDEN_PFAD(sprache), "utf8"));
}

if (import.meta.url === "file://" + process.argv[1]) {
  const schreibe = process.argv.includes("--schreibe");
  for (const sprache of ["de", "en"]) {
    const g = await baueGolden(sprache);
    const text = JSON.stringify(g, null, 2) + "\n";
    if (schreibe) {
      mkdirSync(path.dirname(GOLDEN_PFAD(sprache)), { recursive: true });
      writeFileSync(GOLDEN_PFAD(sprache), text);
      console.log("geschrieben:", path.relative(ROOT, GOLDEN_PFAD(sprache)));
    } else {
      process.stdout.write(text);
    }
  }
}
