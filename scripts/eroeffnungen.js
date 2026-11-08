#!/usr/bin/env node
// PRV-1d · Eröffnungs-Vielfalt aus Eval-Ergebnissen.
//
// Der 1c-Lauf hat gezeigt: Was als Beispiel im Prompt steht, wird Text —
// 15/15 deutsche Antworten begannen mit dem Beispielsatz. Der Judge prüft
// Regeln je Antwort, nicht Monotonie über Antworten hinweg. Dieses Skript
// misst sie: die ersten N Wörter der letzten Begleiter-Antwort je Sample,
// gruppiert nach Lauf und Sprache.
//
//   node scripts/eroeffnungen.js <ergebnis.json> [weitere …] [--woerter 2] [--familien SYC,MOM]
//
// Kennzahl "Spitze": Anteil der häufigsten Eröffnung an allen Antworten der
// Sprache. 15/15 = 100 % ist Schablone; unter ~30 % wirkt es gestreut.

import { readFileSync } from "node:fs";
import path from "node:path";

export function eroeffnungen(bericht, { woerter = 2, familien = ["SYC", "MOM"] } = {}) {
  const jeSprache = {};
  for (const s of bericht.szenarien || []) {
    if (familien.length && !familien.includes(s.familie)) continue;
    const sp = s.sprache || "de";
    for (const smp of s.samples || []) {
      const a = [...(smp.transkript || [])].reverse().find(m => m.role === "assistant");
      if (!a || !a.content) continue;
      const kopf = a.content.trim().split(/\s+/).slice(0, woerter).join(" ").replace(/[,.:;—–!?]+$/, "");
      (jeSprache[sp] ||= {})[kopf] = ((jeSprache[sp] || {})[kopf] || 0) + 1;
    }
  }
  const aus = {};
  for (const [sp, z] of Object.entries(jeSprache)) {
    const n = Object.values(z).reduce((a, b) => a + b, 0);
    const sortiert = Object.entries(z).sort((a, b) => b[1] - a[1]);
    aus[sp] = { n, verschiedene: sortiert.length, spitze: sortiert[0] ? sortiert[0][1] / n : 0, top: sortiert.slice(0, 5) };
  }
  return aus;
}

if (import.meta.url === "file://" + process.argv[1]) {
  const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
  const woerter = parseInt(arg("woerter", "2"), 10);
  const familien = arg("familien", "SYC,MOM").split(",").filter(Boolean);
  const dateien = process.argv.slice(2).filter((x, i, a) => !x.startsWith("--") && !(a[i - 1] || "").startsWith("--"));
  for (const f of dateien) {
    const b = JSON.parse(readFileSync(f, "utf8"));
    const st = b.stand || {};
    console.log("\n## " + path.basename(f) + " · " + (st.pipelineModell || "?") + " · Kern " + (st.coreHash || "?"));
    for (const [sp, r] of Object.entries(eroeffnungen(b, { woerter, familien }))) {
      console.log("  " + sp + ": n=" + r.n + " · verschieden " + r.verschiedene + " · Spitze " + Math.round(r.spitze * 100) + " % · " + r.top.map(([k, v]) => "„" + k + "“ " + v).join(", "));
    }
  }
}
