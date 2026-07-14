// Eval-Runner · .env-Unterstützung (S49) — ohne Fremdabhängigkeit, ohne
// Shell-Änderung. Der Runner liest eine .env im Repo-Wurzelverzeichnis, FALLS
// vorhanden; fehlt sie, ist das kein Fehler. Reihenfolge insgesamt:
//   CLI-Flag  >  echte Umgebung (process.env)  >  .env  >  Vorgabe
// Die Datei füllt also nur Lücken; eine inline gesetzte Variable schlägt sie.
//
// Reine Funktionen (parsen/lesen/mischen), damit isoliert testbar.

import { readFileSync } from "node:fs";

// Parst .env-Text: KEY=WERT je Zeile. Ignoriert Leerzeilen und #-Kommentare,
// erlaubt führendes "export ", trimmt Schlüssel/Wert und entfernt umschließende
// Anführungszeichen. Keine Variablen-Interpolation (Keys brauchen das nicht).
export function parseEnv(text) {
  const out = {};
  for (const rohZeile of text.split(/\r?\n/)) {
    const zeile = rohZeile.trim();
    if (!zeile || zeile.startsWith("#")) continue;
    const ohneExport = zeile.startsWith("export ") ? zeile.slice(7).trim() : zeile;
    const gleich = ohneExport.indexOf("=");
    if (gleich <= 0) continue;                      // kein "=" oder leerer Schlüssel
    const key = ohneExport.slice(0, gleich).trim();
    let wert = ohneExport.slice(gleich + 1).trim();
    if ((wert.startsWith('"') && wert.endsWith('"')) || (wert.startsWith("'") && wert.endsWith("'")))
      wert = wert.slice(1, -1);
    if (key) out[key] = wert;
  }
  return out;
}

// Liest die Datei am Pfad; fehlt sie, leeres Objekt (kein Fehler).
export function liesEnvDatei(pfad) {
  let text;
  try { text = readFileSync(pfad, "utf8"); }
  catch (e) { if (e.code === "ENOENT") return {}; throw e; }
  return parseEnv(text);
}

// Mischt Datei-Werte UNTER die echte Umgebung: process.env gewinnt, .env füllt
// nur Lücken.
export function mischeMitEnv(env, dateiWerte) {
  return { ...dateiWerte, ...env };
}
