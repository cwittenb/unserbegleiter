#!/usr/bin/env node
// MOD-4 · Erzeugt core/korpus/<sprache>/sessions.js aus den Templates
// core/korpus/<sprache>/sessions/<art>.md und den Slots (sessions/slots.js).
//
// WARUM GENERIEREN statt zur Laufzeit lesen: Die Prompts gehen durch esbuild in
// ein Bundle (Artefakt, Pages, Capacitor); ein Text-Loader waere ein Eingriff
// in drei Build-Pfade. Ein generiertes JS-Modul ist fuer alle Verbraucher
// dasselbe wie vorher — Importe, Funktionsnamen, Signaturen, Bundle-Groesse.
// Das Generat wird COMMITTET; tests/unit/mod-templates.spec.js erzeugt es
// in-memory neu und vergleicht Byte fuer Byte (Kanarie gegen Handedits).
//
// TEMPLATE-SPRACHE (bewusst klein, Entscheidung E2 b / F9 b):
//   {{name}} {{partner}} {{nameA}} {{nameB}}   Kontext (Argumente der Funktion)
//   {{wissen.<key>}} {{policies.<key>}} {{format.<key>}}   ein Baustein (String)
//   {{wissen.DOMAENEN}}                        die Domaenen-Liste
//   {{slots.<name>}}                           Ergebnis aus sessions/slots.js
// Nichts weiter: keine Bedingungen, keine Schleifen, keine Aufrufe im Text.
// Unbekannte Platzhalter sind ein Fehler, nie ein leerer String.
//
//   node scripts/build-korpus.js            schreibt beide Sprachen
//   node scripts/build-korpus.js --pruefe   nur vergleichen (Exit 1 bei Abweichung)

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

/** Session-Art → exportierte Funktion und ihre Argumente (Fassade seit S33). */
export const SESSIONS = [
  { art: "einzel",      fn: "klaerungsPrompt",   args: ["name", "partner"] },
  { art: "gemeinsam",   fn: "aufloesungsPrompt", args: ["nameA", "nameB"] },
  { art: "moment",      fn: "momentPrompt",      args: ["nameA", "nameB"] },
  { art: "solo",        fn: "reflexionsPrompt",  args: ["name", "partner"] },
  { art: "qualitytime", fn: "qzMenuePrompt",     args: [] },
];
const KONTEXT = new Set(["name", "partner", "nameA", "nameB"]);
const SCHICHTEN = new Set(["wissen", "policies", "format"]);
const PLATZHALTER = /\{\{([^}]*)\}\}/g;   // locker fangen, streng pruefen — nichts bleibt stumm stehen

/** Text → Inhalt eines JS-Template-Literals (Backslash, Backtick, ${ escapen). */
export function escapeTemplate(text) {
  return text.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}

/** Ein Template (.md) → der Inhalt des Template-Literals mit ${…}-Einsetzungen. */
export function kompiliere(md, { art, args }) {
  let out = ""; let last = 0; let m;
  PLATZHALTER.lastIndex = 0;   // globaler Regex: Zustand aus einem fruehen Wurf nicht mitschleppen
  while ((m = PLATZHALTER.exec(md))) {
    out += escapeTemplate(md.slice(last, m.index));
    const p = m[1].trim();
    if (!/^[A-Za-z_][\w.]*$/.test(p)) throw new Error(art + ".md: unbekannter Platzhalter {{" + m[1] + "}}");
    const [kopf, ...rest] = p.split(".");
    let expr;
    if (rest.length === 0) {
      if (!KONTEXT.has(kopf)) throw new Error(art + ".md: unbekannter Platzhalter {{" + p + "}}");
      if (!args.includes(kopf)) throw new Error(art + ".md: {{" + p + "}} ist kein Argument von " + art + " (" + args.join(", ") + ")");
      expr = kopf;
    } else if (kopf === "slots" && rest.length === 1) {
      expr = "slots." + rest[0];
    } else if (SCHICHTEN.has(kopf) && rest.length === 1) {
      expr = kopf + "." + rest[0];
    } else {
      throw new Error(art + ".md: unbekannter Platzhalter {{" + p + "}}");
    }
    out += "${" + expr + "}";
    last = m.index + m[0].length;
  }
  out += escapeTemplate(md.slice(last));
  if (/\{\{/.test(md.replace(PLATZHALTER, ""))) throw new Error(art + ".md: offene {{ ohne Schluss");
  return out;
}

/** Baut den Quelltext von sessions.js fuer eine Sprache. */
export function baueSessionsQuelle(sprache) {
  const dir = path.join(ROOT, "core/korpus", sprache, "sessions");
  const lies = (datei) => readFileSync(path.join(dir, datei), "utf8");
  const kopf = sprache === "de"
    ? "// Korpus DE · SESSIONS — GENERIERT aus sessions/<art>.md + sessions/slots.js\n" +
      "// durch scripts/build-korpus.js (MOD-4). NICHT VON HAND AENDERN: Aenderungen\n" +
      "// gehoeren in die .md-Templates (Text) oder in slots.js (Verknuepfungen);\n" +
      "// danach `node scripts/build-korpus.js`. Eine Kanarie vergleicht das Generat\n" +
      "// mit den Quellen (tests/unit/mod-templates.spec.js).\n"
    : "// Corpus EN · SESSIONS — GENERATED from sessions/<art>.md + sessions/slots.js\n" +
      "// by scripts/build-korpus.js (MOD-4). DO NOT EDIT BY HAND.\n";
  let q = kopf + "\n" +
    'import { wissen, DOMAENEN } from "./wissen.js";\n' +
    'import { policies } from "./policies.js";\n' +
    'import { format } from "./format.js";\n' +
    'import { SLOTS } from "./sessions/slots.js";\n\n' +
    "// Die Domaenen-Liste ist als {{wissen.DOMAENEN}} erreichbar.\n" +
    "const W = { ...wissen, DOMAENEN };\n";
  for (const s of SESSIONS) {
    const md = lies(s.art + ".md");
    const koerper = kompiliere(md, s).replace(/\$\{wissen\./g, "${W.");
    const ctx = s.args.length ? "{ " + s.args.join(", ") + " }" : "{}";
    q += "\nexport function " + s.fn + "(" + s.args.join(", ") + "){\n" +
         "const slots = SLOTS." + s.art + "(" + ctx + ");\n" +
         "return `" + koerper + "`;\n}\n";
  }
  // Themen-Rahmen: reiner Text, kein Platzhalter (wird von sessions.js der App angehaengt)
  const tr = lies("themen-rahmen.md");
  if (/\{\{/.test(tr)) throw new Error("themen-rahmen.md traegt Platzhalter — dort sind keine vorgesehen.");
  q += "\n/* Themen-Rahmen (sessions/themen-rahmen.md): wird von den Session-Definitionen\n   an die Betriebs-Prompts angehaengt. */\n" +
       "export const THEMEN_RAHMEN = `" + escapeTemplate(tr) + "`;\n";
  return q;
}

export function zielPfad(sprache) { return path.join(ROOT, "core/korpus", sprache, "sessions.js"); }

if (import.meta.url === "file://" + process.argv[1]) {
  const pruefe = process.argv.includes("--pruefe");
  let abweichung = 0;
  for (const sprache of ["de", "en"]) {
    const soll = baueSessionsQuelle(sprache);
    const ziel = zielPfad(sprache);
    const ist = existsSync(ziel) ? readFileSync(ziel, "utf8") : null;
    if (pruefe) {
      if (ist !== soll) { console.error("ABWEICHUNG: " + path.relative(ROOT, ziel) + " ist nicht das Generat seiner Quellen."); abweichung++; }
      else console.log("ok " + path.relative(ROOT, ziel));
    } else {
      writeFileSync(ziel, soll);
      console.log((ist === soll ? "unveraendert " : "geschrieben ") + path.relative(ROOT, ziel));
    }
  }
  if (abweichung) process.exit(1);
}
