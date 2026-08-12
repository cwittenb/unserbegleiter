#!/usr/bin/env node
/**
 * scripts/modellvergleich.js — drei Läufe, ein Vergleich, ein Befehl.
 *
 * S133 · Die Frage: Kostet ein Wechsel von mistral-large-latest auf
 * -medium-latest sprachliche Qualität? `large` läuft in Produktion, hält aber
 * die Eröffnungsweiche nicht und erfindet Steuermarken; `medium` hält beides.
 * Ob es dafür schwächer begleitet, sagt keine Quote — das steht in den
 * Antworten. Sonnet läuft als dritte Spalte mit: Zwei Punkte ohne Maßstab
 * ergeben keinen Vergleich.
 *
 * Der Ablauf von Hand wäre drei mal zehn Aufrufe plus das Zusammensuchen der
 * Dateinamen (die Zeitstempel sind). Genau deshalb dieses Skript.
 *
 * ZWEI FALLSTRICKE, die es fest verdrahtet:
 *   · DERSELBE JUDGE für alle drei Läufe. Die Regel "Judge ≠ Pipeline" führt
 *     sonst dazu, dass jeder Lauf von einem anderen bewertet wird — bei roten
 *     Linien verzeihlich, bei Sprachqualität nicht: Dort urteilt der Judge,
 *     statt eine Regel abzugleichen.
 *   · DERSELBE KERN-STAND. Alle drei laufen unmittelbar hintereinander gegen
 *     denselben Prompt; das Vergleichswerkzeug warnt zusätzlich, falls doch
 *     etwas dazwischenkommt.
 *
 * Aufruf:
 *   node scripts/modellvergleich.js                    # zehn Szenarien, n=5
 *   node scripts/modellvergleich.js --kurz             # nur GATE, SYC, ANT
 *   node scripts/modellvergleich.js --n 3              # weniger Durchläufe
 *   node scripts/modellvergleich.js --nur A,C          # einzelne Spalten
 *   node scripts/modellvergleich.js --trocken          # nur zeigen, was liefe
 *
 * Voraussetzung: MISTRAL_API_KEY und ANTHROPIC_API_KEY in der .env im
 * Repo-Wurzelverzeichnis.
 */

import { spawn } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ERGEBNISSE = path.join(ROOT, "evals/ergebnisse");

/* Die urteilsdichten Szenarien — dort greift nicht eine Regel, dort wird eine
   Haltung beurteilt. Nur solche taugen für die Frage nach Sprachqualität. */
const SZENARIEN = [
  "GATE-S1",    // Fassung erhält das Anliegen, dichtet nichts hinzu
  "SYC-05",     // Spiegel-Grammatik: kein Urteil aus der Richterposition
  "ANT-01",     // Anteile-Sprache: keine Diagnose über den Partner
  "KOR-01",     // Versehens-Pfad: nicht einfach weiterarbeiten
  "DOS-S1",     // Dosierung bei niedriger Sicherheit
  "KOREG-01",   // Ko-Regulation endet mit Richtungs-Angebot
  "MERK-01",    // Merkposten fließt ein, Mechanik bleibt unsichtbar
  "SPR-05",     // Sprecher-Zuschreibung: nachfragen statt raten
  "SPA-01",     // Eine-Spannung-Regel
  "AUF-01",     // Auftrag erst nach ausdrücklicher Bestätigung
];
/* Die drei, mit denen sich anfangen lässt, wenn die Zeit knapp ist: Sie
   tragen am meisten von dem, was "sprachliche Qualität" hier heißt. */
const KURZ = ["GATE-S1", "SYC-05", "ANT-01"];

/* Modelle als DATEN, nicht im Code: Der Wächter aus S35d verbietet Modellnamen
   in .js-Dateien — er hat das beim Schreiben dieses Skripts sofort gefangen.
   Die Regel ist richtig: Wer ein Modell wechseln will, soll keine Quelldatei
   anfassen müssen. */
const KONFIG = JSON.parse(readFileSync(path.join(ROOT, "evals/modellvergleich.json"), "utf8"));
const JUDGE = KONFIG.judge;
const LAEUFE = KONFIG.laeufe;

/* ---- Argumente ---- */
const argv = process.argv.slice(2);
const flag = n => argv.includes("--" + n);
const wert = (n, fallback) => {
  const i = argv.indexOf("--" + n);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : fallback;
};

const szenarien = flag("kurz") ? KURZ : SZENARIEN;
const n = wert("n", "5");
const rpm = wert("rpm", "30");
const trocken = flag("trocken");
const nur = wert("nur", null);
const laeufe = nur
  ? LAEUFE.filter(l => nur.toUpperCase().split(/[,\s]+/).includes(l.kennung))
  : LAEUFE;

if (!laeufe.length) {
  console.error("--nur passt auf keinen Lauf. Erlaubt: A, B, C (kommagetrennt).");
  process.exit(2);
}

/** Ein Runner-Aufruf. Der Judge ist überall derselbe — siehe Kopf. */
function befehl(lauf, szenario) {
  const a = ["evals/runner.js", "--szenario", szenario, "--n", n,
    "--provider", lauf.provider, "--pipeline-modell", lauf.modell,
    "--judge-modell", JUDGE.modell];
  // --judge-provider nur, wenn er von der Pipeline abweicht; sonst ist er Default.
  if (lauf.provider !== JUDGE.provider) a.push("--judge-provider", JUDGE.provider);
  if (lauf.batch) a.push("--batch");
  if (lauf.drossel) a.push("--rpm", rpm);
  return a;
}

function neusteDatei() {
  const alle = readdirSync(ERGEBNISSE).filter(f => f.endsWith(".json")).sort();
  return alle.length ? path.join(ERGEBNISSE, alle[alle.length - 1]) : null;
}

function starte(args) {
  return new Promise((fertig, scheitert) => {
    const p = spawn("node", args, { cwd: ROOT, stdio: "inherit" });
    p.on("close", code => (code === 0 ? fertig() : scheitert(new Error("Exit " + code))));
    p.on("error", scheitert);
  });
}

/* ---- Ablauf ---- */

console.log("Modellvergleich · " + szenarien.length + " Szenarien × " + laeufe.length +
  " Läufe, n=" + n);
console.log("Judge für alle: " + JUDGE.modell + " (" + JUDGE.provider + ")");
console.log("");

if (trocken) {
  for (const l of laeufe) {
    console.log(l.kennung + " · " + l.was);
    for (const s of szenarien) console.log("   node " + befehl(l, s).join(" "));
    console.log("");
  }
  console.log("Trockenlauf — es wurde nichts ausgeführt.");
  process.exit(0);
}

const dateien = [];
let fehlgeschlagen = 0;

for (const l of laeufe) {
  console.log("═══ " + l.kennung + " · " + l.was);
  for (const s of szenarien) {
    process.stdout.write("\n── " + l.kennung + " / " + s + "\n");
    try {
      await starte(befehl(l, s));
      const d = neusteDatei();
      if (d) dateien.push({ kennung: l.kennung, szenario: s, datei: d });
    } catch (e) {
      /* Ein gescheitertes Szenario beendet den Vergleich NICHT: Die übrigen
         sind trotzdem etwas wert, und ein Abbruch nach acht von zehn Läufen
         wäre die teuerste Art, nichts zu erfahren. */
      fehlgeschlagen++;
      console.error("   ! " + l.kennung + "/" + s + " gescheitert: " + e.message + " — weiter.");
    }
  }
  console.log("");
}

console.log("═══ Ergebnis");
if (fehlgeschlagen) console.log(fehlgeschlagen + " Lauf/Läufe gescheitert (siehe oben).");
if (dateien.length < 2) {
  console.log("Zu wenige Ergebnisse für einen Vergleich.");
  process.exit(1);
}

/* Je Szenario ein Vergleich: Die Runner-Dateien enthalten ein Szenario, und
   das Vergleichswerkzeug stellt Spalten gegenüber, nicht Sammlungen. */
const jeSzenario = new Map();
for (const d of dateien) {
  if (!jeSzenario.has(d.szenario)) jeSzenario.set(d.szenario, []);
  jeSzenario.get(d.szenario).push(d);
}

for (const [s, liste] of jeSzenario) {
  if (liste.length < 2) continue;
  console.log("\n\n########  " + s + "  ########\n");
  await starte(["scripts/eval-vergleich.js", ...liste.map(x => x.datei), "--texte"]);
}

console.log("\n\nDie Dateien liegen in evals/ergebnisse/. Einzelne Vergleiche später:");
console.log("  node scripts/eval-vergleich.js <a.json> <b.json> <c.json> --texte");
