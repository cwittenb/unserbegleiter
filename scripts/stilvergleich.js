#!/usr/bin/env node
/**
 * scripts/stilvergleich.js — dieselbe Eingabe, die Antworten nebeneinander.
 *
 * S134 · Was eval-vergleich.js NICHT kann: Es vergleicht Judge-Urteile über
 * REGELN. Wenn drei Modelle alle 0/5 haben, heisst das "keines verstoesst" —
 * nicht "sie begleiten gleich gut". Genau das war die Frage.
 *
 * Fuer Stil gibt es keinen Messwert, der die Frage beantwortet. Also stellt
 * dieses Werkzeug die Antworten nebeneinander und zaehlt ein paar Merkmale
 * darunter. Du liest, es zaehlt.
 *
 * BEWUSST OHNE WERTUNG: Kein Punktestand, keine Empfehlung, keine Reihenfolge
 * "von gut nach schlecht". Ein Werkzeug, das Stil bewertet, vergleicht am Ende
 * die Vorstellung seines Autors mit sich selbst. Die Merkmale unten sind
 * Kennzahlen, keine Qualitaet: "doppelt so lang" ist weder gut noch schlecht,
 * es ist eine Beobachtung, die man beim Lesen leicht uebersieht.
 *
 * Aufruf:
 *   node scripts/stilvergleich.js <a.json> <b.json> [<c.json> …]
 *   node scripts/stilvergleich.js … --sample 3       # nur Durchlauf 3
 *   node scripts/stilvergleich.js … --nur GATE-S1    # nur ein Szenario
 *   node scripts/stilvergleich.js … --zahlen         # nur die Kennzahlen
 *   node scripts/stilvergleich.js … --voll           # Antworten ungekuerzt
 */

import { readFileSync } from "node:fs";

const argv = process.argv.slice(2);
const dateien = argv.filter(a => !a.startsWith("--") && a.endsWith(".json"));
const flag = n => argv.includes("--" + n);
const wert = (n, f) => {
  const i = argv.indexOf("--" + n);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : f;
};

if (dateien.length < 2) {
  console.error("Mindestens zwei Ergebnisdateien angeben:\n" +
    "  node scripts/stilvergleich.js <a.json> <b.json> [<c.json> …] [--sample N] [--nur ID] [--zahlen] [--voll]");
  process.exit(2);
}

const SPALTE = "ABCDEFGH";
const laeufe = dateien.map((pfad, i) => {
  const daten = JSON.parse(readFileSync(pfad, "utf8"));
  return {
    kennung: SPALTE[i], pfad, daten,
    modell: (daten.stand || {}).pipelineModell || "unbekannt",
    ids: new Map((daten.szenarien || []).map(s => [s.id, s])),
  };
});

const nurSzenario = wert("nur", null);
const nurSample = wert("sample", null);
const nurZahlen = flag("zahlen");
const voll = flag("voll");

/* ---- Merkmale ----
   Alle ohne Wertung. Sie zeigen Unterschiede, die beim Lesen untergehen —
   etwa dass ein Modell im Schnitt drei Fragen stellt und ein anderes eine. */

const saetze = t => String(t).split(/[.!?…]+(?:\s|$)/).filter(s => s.trim().length > 1);
const woerter = t => String(t).trim().split(/\s+/).filter(Boolean);

function merkmale(text) {
  const t = String(text || "");
  const w = woerter(t), s = saetze(t);
  return {
    woerter: w.length,
    saetze: s.length,
    satzlaenge: s.length ? Math.round(w.length / s.length) : 0,
    fragen: (t.match(/\?/g) || []).length,
    absaetze: t.split(/\n\s*\n/).filter(x => x.trim()).length,
    /* Ich-Form der Begleitung: "ich höre", "mir scheint" — die Grammatik, die
       den Unterschied zwischen Spiegeln und Urteilen trägt (SYC). */
    ichForm: (t.match(/\b(ich|mir|mich)\b/gi) || []).length,
    /* Direkte Ansprache. */
    duForm: (t.match(/\b(du|dir|dich|dein[a-z]*)\b/gi) || []).length,
    /* Weichmacher — dieselbe Zahl kann Behutsamkeit oder Unschärfe heißen. */
    vielleicht: (t.match(/\b(vielleicht|womöglich|eventuell|möglicherweise|könnte|scheint)\b/gi) || []).length,
  };
}

function mittel(liste, feld) {
  if (!liste.length) return 0;
  const summe = liste.reduce((a, m) => a + m[feld], 0);
  return Math.round((summe / liste.length) * 10) / 10;
}

/** Der letzte Assistant-Zug — die Antwort, um die es geht. */
function antwort(smp) {
  const a = (smp.transkript || []).filter(m => m.role === "assistant");
  return a.length ? String(a[a.length - 1].content || "") : "";
}

/** Die Eingabe davor — der Reiz, auf den alle drei geantwortet haben. */
function eingabe(smp) {
  const t = smp.transkript || [];
  for (let i = t.length - 1; i >= 0; i--) if (t[i].role === "user") return String(t[i].content || "");
  return "";
}

const einzug = (t, tiefe = 6) =>
  String(t).split("\n").map(z => " ".repeat(tiefe) + z).join("\n");
const kurz = (t, n) => (voll || t.length <= n ? t : t.slice(0, n) + " …");

/* ---- Ausgabe ---- */

const alleIds = [];
for (const l of laeufe) for (const id of l.ids.keys()) if (!alleIds.includes(id)) alleIds.push(id);
const ids = nurSzenario ? alleIds.filter(id => id === nurSzenario) : alleIds;

if (!ids.length) {
  console.error("Kein Szenario passt auf --nur " + nurSzenario);
  process.exit(2);
}

console.log("Stilvergleich — kein Urteil, nur nebeneinander.\n");
for (const l of laeufe) console.log("  " + l.kennung + " = " + l.modell);

for (const id of ids) {
  const da = laeufe.filter(l => l.ids.has(id));
  if (da.length < 2) continue;

  console.log("\n\n" + "═".repeat(72));
  console.log("  " + id);
  console.log("═".repeat(72));

  /* Kennzahlen über ALLE Durchläufe — sie sind erst im Mittel aussagekräftig. */
  const stats = new Map(da.map(l => [
    l.kennung,
    (l.ids.get(id).samples || []).map(smp => merkmale(antwort(smp))),
  ]));

  console.log("\n  Kennzahlen (Mittel über alle Durchläufe)\n");
  const felder = [
    ["Wörter", "woerter"], ["Sätze", "saetze"], ["Wörter/Satz", "satzlaenge"],
    ["Fragen", "fragen"], ["Absätze", "absaetze"],
    ["ich/mir/mich", "ichForm"], ["du/dir/dein", "duForm"], ["Weichmacher", "vielleicht"],
  ];
  const kopf = "  " + "".padEnd(14) + da.map(l => (l.kennung + " " + l.modell).slice(0, 22).padEnd(24)).join("");
  console.log(kopf);
  for (const [name, feld] of felder)
    console.log("  " + name.padEnd(14) + da.map(l => String(mittel(stats.get(l.kennung), feld)).padEnd(24)).join(""));

  if (nurZahlen) continue;

  /* Die Texte. Der eigentliche Zweck: dieselbe Eingabe, drei Antworten. */
  const anzahl = Math.min(...da.map(l => (l.ids.get(id).samples || []).length));
  const welche = nurSample ? [Number(nurSample) - 1].filter(i => i >= 0 && i < anzahl)
    : [...Array(anzahl).keys()];

  for (const i of welche) {
    const erst = da[0].ids.get(id).samples[i];
    console.log("\n  " + "─".repeat(68));
    console.log("  Durchlauf " + (i + 1));
    console.log("  Eingabe: " + kurz(eingabe(erst).replace(/\s+/g, " "), 200));
    for (const l of da) {
      const smp = l.ids.get(id).samples[i];
      if (!smp) continue;
      const m = merkmale(antwort(smp));
      const verletzt = (smp.checks || []).filter(c => c.verletzt).map(c => c.id);
      console.log("\n  " + l.kennung + " · " + l.modell +
        "   (" + m.woerter + " Wörter, " + m.fragen + " Frage" + (m.fragen === 1 ? "" : "n") +
        (verletzt.length ? ", verletzt: " + verletzt.join(",") : "") + ")");
      console.log(einzug(kurz(antwort(smp), 1200)));
    }
  }
}

console.log("\n\nHinweis: Die Zahlen sind Beobachtungen, keine Bewertung. Ob eine längere");
console.log("Antwort besser ist, sagt keine Kennzahl — das steht in den Texten darüber.");
