// Abdeckungs-Matrix Sessions × Familien (S66, Review-Empfehlung 5).
//
// Die QZ-Null-Abdeckung blieb monatelang unbemerkt, weil niemand die Verteilung
// der Szenarien über die fünf Session-Typen sah. Dieser Generator legt sie als
// Markdown-Artefakt in den Ergebnisordner — `npm run eval:matrix` nach jeder
// Katalog-Änderung (Checkliste im Sprintprotokoll-Template).

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SZENARIEN } from "../evals/szenarien/start-katalog.js";
import { SZENARIEN_EN } from "../evals/szenarien/start-katalog.en.js";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

/** Alle Session-Typen des Runners — auch leere Zeilen erscheinen (genau darum geht es). */
export const SESSIONS = ["solo", "einzel", "gemeinsam", "moment", "qualitytime"];

/**
 * Baut die Matrix als Markdown. Reine Funktion über den Katalog.
 * Zellen: Szenario-IDs (rote Linien mit ⚑); Randspalten: Summen.
 */
export function baueMatrix(szenarien) {
  const familien = [...new Set(szenarien.map(s => s.familie))].sort();
  const zelle = (fam, ses) => szenarien
    .filter(s => s.familie === fam && s.session === ses)
    .map(s => s.id + (s.checks.some(c => c.roteLinie) ? " ⚑" : ""))
    .join("<br>") || "—";
  const summeSession = ses => szenarien.filter(s => s.session === ses).length;

  const zeilen = [];
  zeilen.push("| Familie | " + SESSIONS.join(" | ") + " | Σ |");
  zeilen.push("|---|" + SESSIONS.map(() => "---").join("|") + "|---|");
  for (const fam of familien) {
    const n = szenarien.filter(s => s.familie === fam).length;
    zeilen.push("| **" + fam + "** | " + SESSIONS.map(s => zelle(fam, s)).join(" | ") + " | " + n + " |");
  }
  zeilen.push("| **Σ** | " + SESSIONS.map(s => String(summeSession(s))).join(" | ") + " | " + szenarien.length + " |");

  const rote = szenarien.flatMap(s => s.checks.filter(c => c.roteLinie).map(c => s.id + "/" + c.id)).sort();
  const luecken = SESSIONS.filter(s => summeSession(s) === 0);
  return [
    "# Eval-Abdeckung · Sessions × Familien",
    "",
    "Generiert aus dem Szenarien-Katalog (`npm run eval:matrix`) — nicht von Hand pflegen.",
    "⚑ = Szenario trägt mindestens eine rote Linie (1 Treffer in n ⇒ ROT).",
    "",
    ...zeilen,
    "",
    "**Rote Linien (" + rote.length + "):** " + (rote.join(", ") || "keine"),
    "",
    luecken.length
      ? "⚠ **Unbelegte Session-Typen:** " + luecken.join(", ") + " — bewusst prüfen, ob das so bleiben soll."
      : "Alle fünf Session-Typen sind belegt.",
    "",
  ].join("\n");
}

export async function schreibeMatrix({ outDir = path.join(ROOT, "evals/ergebnisse") } = {}) {
  await mkdir(outDir, { recursive: true });
  const md = [
    baueMatrix(SZENARIEN).replace("# Eval-Abdeckung", "# Eval-Abdeckung (de)"),
    "",
    baueMatrix(SZENARIEN_EN).replace("# Eval-Abdeckung", "# Eval-Abdeckung (en)"),
  ].join("\n");
  const datei = path.join(outDir, "abdeckung.md");
  await writeFile(datei, md);
  return { datei, de: SZENARIEN.length, en: SZENARIEN_EN.length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  schreibeMatrix().then(
    r => console.log("Abdeckungs-Matrix: " + path.relative(ROOT, r.datei) + " (" + r.de + " de · " + r.en + " en)"),
    e => { console.error("Matrix fehlgeschlagen:", e.message); process.exit(1); }
  );
}
