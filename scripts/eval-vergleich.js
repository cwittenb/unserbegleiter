#!/usr/bin/env node
/**
 * scripts/eval-vergleich.js — zwei Läufe nebeneinander, mit den Belegen.
 *
 * S132 · Anlass: Die Modellfrage. `mistral-large-latest` läuft in Produktion,
 * `mistral-medium-latest` hält die Eröffnungsweiche besser und setzt keine
 * erfundenen Marken. Ob es dafür sprachlich schwächer begleitet, sagt keine
 * Zahl — das steht in den Antworten.
 *
 * Deshalb stellt dieses Werkzeug NICHT nur Quoten gegenüber. Es zeigt bei
 * jedem Unterschied den BELEG des Judge und, auf Wunsch, die Antwort selbst.
 * Eine Tabelle sagt "3/3 gegen 2/3"; erst der Text sagt, ob das eine
 * Verschlechterung war oder eine andere Art, dieselbe Sache zu tun.
 *
 * ZWEI ODER MEHR LÄUFE. Die Frage hat sich beim Schreiben erweitert: Nicht nur
 * "medium oder large", sondern "Mistral oder Anthropic" — Sonnet als dritte
 * Spalte. Deshalb ist nichts hier auf zwei Seiten gebaut; die Spalten heissen
 * A, B, C … in der Reihenfolge der Dateien.
 *
 * Aufruf:
 *   node scripts/eval-vergleich.js <a.json> <b.json> [<c.json> …] [--texte] [--alle]
 *
 *   --texte   zeigt zusätzlich die Antworten (gekürzt) — sonst nur die Belege
 *   --alle    auch Szenarien ohne Unterschied auflisten
 *
 * Die Läufe müssen dieselben Szenarien enthalten; Fehlendes wird benannt
 * statt stillschweigend übersprungen.
 */

import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const dateien = args.filter(a => !a.startsWith("--"));
const zeigeTexte = args.includes("--texte");
const zeigeAlle = args.includes("--alle");

if (dateien.length < 2) {
  console.error("Mindestens zwei Ergebnisdateien angeben:\n" +
    "  node scripts/eval-vergleich.js <a.json> <b.json> [<c.json> …] [--texte] [--alle]");
  process.exit(2);
}

const SPALTE = "ABCDEFGH";
const laeufe = dateien.map((pfad, i) => {
  const daten = JSON.parse(readFileSync(pfad, "utf8"));
  return { kennung: SPALTE[i], pfad, daten, ids: new Map((daten.szenarien || []).map(s => [s.id, s])) };
});

/** Kurzname eines Laufs: das Pipeline-Modell ist die interessante Größe. */
const name = d => (d.stand && d.stand.pipelineModell) || "unbekannt";
const kurz = (t, n = 200) => {
  const s = String(t || "").replace(/\s+/g, " ").trim();
  return s.length > n ? s.slice(0, n) + " …" : s;
};

/** Verletzungen je Check, als "3/8". */
function quoten(szenario) {
  const z = {};
  for (const smp of szenario.samples || [])
    for (const c of smp.checks || []) {
      z[c.id] = z[c.id] || { v: 0, n: 0 };
      z[c.id].n++;
      if (c.verletzt) z[c.id].v++;
    }
  return z;
}

/** Erster Beleg zu einem Check — der Judge nennt die Stelle, die ihn überzeugt hat. */
function belege(szenario, checkId, max = 2) {
  const aus = [];
  for (const smp of szenario.samples || []) {
    const c = (smp.checks || []).find(x => x.id === checkId && x.verletzt);
    if (!c) continue;
    aus.push({ nr: smp.nr, beleg: c.beleg, antwort: letzteAntwort(smp) });
    if (aus.length >= max) break;
  }
  return aus;
}

function letzteAntwort(smp) {
  const t = (smp.transkript || []).filter(m => m.role === "assistant");
  return t.length ? t[t.length - 1].content : "";
}

/** Marken-Spuren eines Szenarios, gezählt (S129/S131). */
function marken(szenario) {
  let fremd = 0, unzeit = 0;
  for (const smp of szenario.samples || []) {
    const m = smp.marken || {};
    fremd += (m.fremd || []).length;
    unzeit += (m.unzeit || []).length;
  }
  return { fremd, unzeit };
}

/* Szenarien in der Reihenfolge des ersten Laufs; was nur einzelne Laeufe
   haben, wird benannt statt stillschweigend uebersprungen. */
const alleIds = [];
for (const l of laeufe) for (const id of l.ids.keys()) if (!alleIds.includes(id)) alleIds.push(id);
const luecken = alleIds
  .map(id => ({ id, fehlt: laeufe.filter(l => !l.ids.has(id)).map(l => l.kennung) }))
  .filter(x => x.fehlt.length);

console.log("Vergleich");
for (const l of laeufe) console.log("  " + l.kennung + " = " + name(l.daten) + "   (" + l.pfad + ")");
for (const x of luecken) console.log("  ! " + x.id + " fehlt in: " + x.fehlt.join(", "));
console.log("");

let unterschiede = 0;

for (const id of alleIds) {
  const da = laeufe.filter(l => l.ids.has(id));
  if (da.length < 2) continue;                       // nichts zu vergleichen
  const q = new Map(da.map(l => [l.kennung, quoten(l.ids.get(id))]));
  const checks = [...new Set(da.flatMap(l => Object.keys(q.get(l.kennung))))].sort();

  const abweichend = checks.filter(c => {
    const raten = da.map(l => {
      const x = q.get(l.kennung)[c];
      return x ? x.v / x.n : null;
    });
    return new Set(raten.map(String)).size > 1;
  });

  const mk = new Map(da.map(l => [l.kennung, marken(l.ids.get(id))]));
  const markenAbweichend = new Set([...mk.values()].map(m => m.fremd + "/" + m.unzeit)).size > 1;

  if (!abweichend.length && !markenAbweichend && !zeigeAlle) continue;
  unterschiede++;

  console.log("── " + id + "   (" + da.map(l => l.kennung + ": " + l.ids.get(id).samples.length).join(", ") + " Durchläufe)");
  for (const c of checks) {
    const zellen = da.map(l => {
      const x = q.get(l.kennung)[c];
      return l.kennung + " " + (x ? x.v + "/" + x.n : "—");
    });
    console.log("   " + c.padEnd(4) + " " + zellen.join("   ").padEnd(34) + (abweichend.includes(c) ? " ←" : ""));
  }
  if ([...mk.values()].some(m => m.fremd || m.unzeit))
    console.log("   Marken   " + da.map(l => {
      const m = mk.get(l.kennung);
      return l.kennung + " fremd " + m.fremd + "/unzeit " + m.unzeit;
    }).join("   "));

  /* Der eigentliche Zweck: nicht die Zahl, sondern die Stelle. Gezeigt wird
     der Beleg des Laufs, der den Check am HAEUFIGSTEN verletzt — dort steht,
     woran es lag. Bei mehr als zwei Spalten ist das die einzige Auswahl, die
     ohne Willkuer auskommt. */
  for (const c of abweichend) {
    const schlimmster = da.reduce((a, b) => {
      const qa = q.get(a.kennung)[c], qb = q.get(b.kennung)[c];
      return (qb ? qb.v / qb.n : -1) > (qa ? qa.v / qa.n : -1) ? b : a;
    });
    const b = belege(schlimmster.ids.get(id), c);
    if (!b.length) continue;
    console.log("   " + c + " · " + schlimmster.kennung + " (" + name(schlimmster.daten) + ") verletzt am häufigsten:");
    for (const e of b) {
      console.log("      #" + e.nr + " Beleg: " + kurz(e.beleg, 160));
      if (zeigeTexte) console.log("           Antwort: " + kurz(e.antwort, 320));
    }
  }
  console.log("");
}

if (!unterschiede) console.log("Keine Unterschiede in den Quoten.");

/* Zum Schluss die Rahmendaten — sie gehoeren dazu, weil ein Lauf mit anderem
   Judge oder anderem Kern-Stand nicht dasselbe misst. */
console.log("Rahmen");
for (const l of laeufe) {
  const st = l.daten.stand || {};
  console.log("  " + l.kennung + ": Kern " + st.coreHash + " · Judge " + st.judgeModell +
    " (" + st.judgePromptVersion + ") · " + Math.round((l.daten.telemetrie || {}).ms / 1000) + "s · " +
    (l.daten.kosten ? l.daten.kosten.gesamt.toFixed(2) : "?"));
}
if (new Set(laeufe.map(l => (l.daten.stand || {}).coreHash)).size > 1)
  console.log("  ! Verschiedene Kern-Stände — die Läufe messen nicht denselben Prompt.");
if (new Set(laeufe.map(l => (l.daten.stand || {}).judgeModell)).size > 1)
  console.log("  ! Verschiedene Judges — Unterschiede können vom Bewerter kommen, nicht vom Modell. " +
    "Für Sprachqualität ist das entscheidend: dort urteilt der Judge, statt eine Regel abzugleichen.");
