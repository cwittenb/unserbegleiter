#!/usr/bin/env node
// PRV-0 · Vermessung der Systemprompte (Prompt-Verdichtung).
//
// Die PRV-Serie verdichtet die Prompts: weniger Zeichen, weniger Betonung,
// weniger Wiederholung, Format-Spezifikationen nur dort, wo sie gebraucht
// werden. Jeder Schritt muss zeigen, WAS er bewegt hat — nicht nur, DASS sich
// der Text geaendert hat (das sagt der Golden-Snapshot aus MOD-0 schon).
//
// Dieses Skript misst je Session-Art und Sprache den Text, den das Modell
// sieht (baueSystemText aus der Komposition, Festwerte Anna/Bernd wie im
// Golden-Snapshot), und schreibt die Kennzahlen als Sperrklinke nach
// tests/fixtures/golden/prompt-masse-<sprache>.json.
//
//   node scripts/prompt-masse.js             Tabelle auf stdout
//   node scripts/prompt-masse.js --schreibe  Sperrklinke festschreiben
//
// Gelesen wird die Sperrklinke von tests/unit/prv0-prompt-masse.spec.js.
// Sie merkt beides: Wachsen (ein Sprint hat Masse hinzugefuegt) UND stilles
// Schrumpfen (ein Sprint hat verdichtet, ohne es festzuschreiben). Jede
// Bewegung wird mit --schreibe uebernommen und im Sprintprotokoll begruendet.
//
// Was gemessen wird — je Kennzahl ein Satz:
//   zeichen           Laenge des Systemtexts
//   tokenSchaetzung   zeichen / 3,4 (Groessenordnung, keine Tokenizer-Zahl)
//   zeilen            Zeilen gesamt
//   langeZeilen       Zeilen ueber 600 Zeichen (eine Regelzeile, die mehrere
//                     Regeln buendelt — fuer das Modell ein einziger Block)
//   capsWoerter       Woerter aus 3+ Grossbuchstaben als Betonung (NIE, KEIN, GENAU); Protokoll-
//                     Tokens (X-BLOCK, END, [[MARKE]], X-RESULT, X-CONTEXT)
//                     zaehlen nicht — die sind Format, nicht Nachdruck
//   genauWoerter      GENAU / EXACTLY — die haeufigste Einzelbetonung
//   verstossWoerter   VERSTOSS / VIOLATION — Verstoss-Rhetorik
//   sprintRefs        Sprint-Referenzen wie "(S103)" — Changelog im Prompt
//   blockSpezZeichen  Zeichen zwischen X-BLOCK und END X-BLOCK (JSON-Vorlagen)
//   wiederholungen    Treffer je Leitphrase (Regeln, die mehrfach stehen)

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const MASSE_PFAD = (sprache) => path.join(ROOT, "tests/fixtures/golden/prompt-masse-" + sprache + ".json");

export const FEST_KONTEXT = { me: "Anna", partner: "Bernd", nameA: "Anna", nameB: "Bernd" };
export const SESSION_ARTEN = ["solo", "moment", "einzel", "gemeinsam", "qualitytime"];

/** Leitphrasen je Sprache: Regeln, die der Architekt-Befund als mehrfach
 *  gesetzt gezaehlt hat. DE wortgenau, EN unabhaengig von Gross/Klein. */
export const LEITPHRASEN = Object.freeze({
  de: Object.freeze({
    markeLetzteZeile: { muster: /allein in der letzten Zeile/g },
    richterposition:  { muster: /Richterposition/g },
    ichRahmung:       { muster: /Ich-Rahmung/g },
    hypothese:        { muster: /Hypothese/g },
    notFrage:         { muster: /Not-Frage/g },
    erfinden:         { muster: /erfinde/g },
  }),
  en: Object.freeze({
    markeLetzteZeile: { muster: /alone on the last line/gi },
    richterposition:  { muster: /\bjudge/gi },
    ichRahmung:       { muster: /I-fram/g },
    hypothese:        { muster: /hypothes/gi },
    notFrage:         { muster: /distress are you in/gi },
    erfinden:         { muster: /\binvent/gi },
  }),
});

/** Kennzahlen, die die Sperrklinke haelt (tokenSchaetzung ist abgeleitet). */
export const SPERRKLINKE = Object.freeze([
  "zeichen", "zeilen", "langeZeilen", "capsWoerter", "genauWoerter",
  "verstossWoerter", "sprintRefs", "blockSpezZeichen",
]);

const PROTOKOLL_TOKEN = /^(?:END|[A-Z]+(?:-[A-Z]+)*-(?:BLOCK|RESULT|CONTEXT))$/;

const zaehle = (text, re) => (text.match(re) || []).length;

/** Zeichen der Block-Vorlagen: von einer Zeile "X-BLOCK" bis "END X-BLOCK". */
function blockSpezZeichen(text) {
  let summe = 0, offen = null;
  for (const zeile of text.split("\n")) {
    const z = zeile.trim();
    if (!offen && /^[A-Z]+(?:-[A-Z]+)*-BLOCK$/.test(z)) { offen = z; summe += zeile.length + 1; continue; }
    if (offen) {
      summe += zeile.length + 1;
      if (z === "END " + offen) offen = null;
    }
  }
  return summe;
}

/**
 * Misst einen Systemtext. Reine Funktion — kein Korpus, kein Dateisystem.
 * @param {string} text
 * @param {"de"|"en"} sprache
 */
export function messePrompt(text, sprache) {
  const zeilen = text.split("\n");
  const woerter = text.match(/\[\[[A-Z0-9-]+\]\]|[A-ZÄÖÜ][A-ZÄÖÜ-]{2,}/g) || [];
  const caps = woerter.filter(w => !w.startsWith("[[") && !PROTOKOLL_TOKEN.test(w));
  const wiederholungen = {};
  for (const [name, { muster }] of Object.entries(LEITPHRASEN[sprache] || LEITPHRASEN.de)) {
    wiederholungen[name] = zaehle(text, muster);
  }
  return {
    zeichen: text.length,
    tokenSchaetzung: Math.round(text.length / 3.4),
    zeilen: zeilen.length,
    langeZeilen: zeilen.filter(z => z.length > 600).length,
    capsWoerter: caps.length,
    genauWoerter: zaehle(text, /\b(?:GENAU|EXACTLY)\b/g),
    verstossWoerter: zaehle(text, /\b(?:VERSTOSS|VIOLATION)\b/g),
    sprintRefs: zaehle(text, /\(S\d{2,3}(?:[^)]*)\)|\bS\d{2,3}(?:\.\d)?(?=[,;:\s)])/g),
    blockSpezZeichen: blockSpezZeichen(text),
    wiederholungen,
  };
}

/** Misst alle Session-Arten einer Sprache ueber die Komposition (App-Pfad). */
export async function baueMasse(sprache) {
  const prompts = await import("../core/prompts/prompts.js");
  if (sprache === "en" && !prompts.istKorpusDa("en")) {
    prompts.registerKorpus("en", await import("../core/prompts/prompts.en.js"));
  }
  const { baueSystemText } = await import("../core/komposition.js");
  const masse = { sprache, kontext: FEST_KONTEXT, sessions: {} };
  for (const art of SESSION_ARTEN) {
    masse.sessions[art] = messePrompt(baueSystemText(art, FEST_KONTEXT, { sprache }), sprache);
  }
  return masse;
}

export function liesMasse(sprache) {
  return JSON.parse(readFileSync(MASSE_PFAD(sprache), "utf8"));
}

/** Markdown-Tabelle fuer stdout und Sprintprotokolle. */
export function tabelle(masse) {
  const spalten = ["zeichen", "tokenSchaetzung", "zeilen", "langeZeilen", "capsWoerter", "genauWoerter", "verstossWoerter", "sprintRefs", "blockSpezZeichen"];
  const kopf = "| Session | " + spalten.join(" | ") + " | Wiederholungen |";
  const trenn = "|" + "---|".repeat(spalten.length + 2);
  const zeilen = Object.entries(masse.sessions).map(([art, m]) => {
    const w = Object.entries(m.wiederholungen).map(([k, v]) => k + " " + v).join(", ");
    return "| " + art + " | " + spalten.map(s => m[s]).join(" | ") + " | " + w + " |";
  });
  return [kopf, trenn, ...zeilen].join("\n");
}

if (import.meta.url === "file://" + process.argv[1]) {
  const schreibe = process.argv.includes("--schreibe");
  for (const sprache of ["de", "en"]) {
    const m = await baueMasse(sprache);
    console.log("\n## " + sprache + "\n\n" + tabelle(m));
    if (schreibe) {
      mkdirSync(path.dirname(MASSE_PFAD(sprache)), { recursive: true });
      writeFileSync(MASSE_PFAD(sprache), JSON.stringify(m, null, 2) + "\n");
      console.log("\n→ geschrieben: " + path.relative(ROOT, MASSE_PFAD(sprache)));
    }
  }
}
