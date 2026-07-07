// i18n-Kanarie (Stufe A): In den nutzersichtbaren UI-Dateien darf kein
// deutsches String-Literal mehr leben — alle UI-Texte kommen aus core/i18n.
//
// Geprüfte Dateien: app.js, main.js, client.js, design.js.
// Bewusst AUSGENOMMEN (Korpus-Träger, Sprachfassung kommt in Stufe C):
//   prompts*.js, sessions.js, kernwetten.js, prozess.js — und dev-panel.js
//   (reines Entwickler-Werkzeug, bleibt deutsch).
//
// Methode: kleiner Scanner (Zustandsautomat) sammelt die Inhalte aller
// '…'-, "…"- und `…`-Literale (Template-Ausdrücke ${…} werden übersprungen,
// Kommentare ignoriert). Zwei Prüfungen:
//   1. Kein Umlaut/ß in einem Literal.
//   2. Keines der Kern-UI-Wörter (auch ohne Umlaut) als Literal-Inhalt.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const DATEIEN = [
  "../../core/ui/app.js",
  "../../platforms/artifact/main.js",
  "../../platforms/cloudflare/pages/client.js",
  "../../core/ui/design.js",
];

function literale(quelle) {
  const out = [];
  let i = 0, zeile = 1, letztes = "";      // letztes signifikantes Zeichen (für Regex-vs-Division)
  const n = quelle.length;
  while (i < n) {
    const c = quelle[i];
    if (c === "\n") { zeile++; i++; continue; }
    if (c === "/" && quelle[i + 1] === "/") { while (i < n && quelle[i] !== "\n") i++; continue; }
    if (c === "/" && quelle[i + 1] === "*") {
      i += 2;
      while (i < n && !(quelle[i] === "*" && quelle[i + 1] === "/")) { if (quelle[i] === "\n") zeile++; i++; }
      i += 2; continue;
    }
    if (c === "/" && (letztes === "" || "(,=:[!&|?{};+-*%~^<>".includes(letztes))) {
      // Regex-Literal: bis zum unmaskierten '/' überspringen ([…]-Klassen beachten)
      i++;
      let klasse = false;
      while (i < n) {
        const d = quelle[i];
        if (d === "\\") { i += 2; continue; }
        if (d === "[") klasse = true;
        else if (d === "]") klasse = false;
        else if (d === "/" && !klasse) break;
        else if (d === "\n") { zeile++; break; }   // kein Regex — Annahme abbrechen
        i++;
      }
      i++;
      while (i < n && /[a-z]/.test(quelle[i])) i++;  // Flags
      letztes = "/"; continue;
    }
    if (c === '"' || c === "'") {
      const q = c, start = zeile; let s = ""; i++;
      while (i < n && quelle[i] !== q) {
        if (quelle[i] === "\\") { s += quelle[i + 1] || ""; i += 2; continue; }
        s += quelle[i]; i++;
      }
      i++; letztes = q; out.push({ zeile: start, text: s }); continue;
    }
    if (c === "`") {
      const start = zeile; let s = ""; i++;
      let tiefe = 0;                       // ${…}-Tiefe: Inhalt dort ist Code, kein Text
      while (i < n) {
        const d = quelle[i];
        if (d === "\n") zeile++;
        if (tiefe === 0 && d === "`") break;
        if (tiefe === 0 && d === "$" && quelle[i + 1] === "{") { tiefe = 1; i += 2; continue; }
        if (tiefe > 0) {
          if (d === "{") tiefe++;
          else if (d === "}") tiefe--;
          else if (d === "`") {            // verschachteltes Template im Ausdruck
            i++;
            let t2 = 0;
            while (i < n) {
              const e = quelle[i];
              if (e === "\n") zeile++;
              if (t2 === 0 && e === "`") break;
              if (t2 === 0 && e === "$" && quelle[i + 1] === "{") { t2 = 1; i += 2; continue; }
              if (t2 > 0) { if (e === "{") t2++; else if (e === "}") t2--; }
              else s += e;                 // Text des inneren Templates zählt mit
              i++;
            }
          }
          i++; continue;
        }
        if (d === "\\") { s += quelle[i + 1] || ""; i += 2; continue; }
        s += d; i++;
      }
      i++; letztes = "`"; out.push({ zeile: start, text: s }); continue;
    }
    if (c !== " " && c !== "\t" && c !== "\r") letztes = c;
    i++;
  }
  return out;
}

const KERNWOERTER = [
  "Freigeben", "Noch nicht", "Senden", "Zeitleiste", "Regal ansehen",
  "Mein Raum", "Gemeinsamer Raum", "Deine Nachricht", "Pause machen",
  "Loslegen", "Neuen Link anfordern", "Selbst ansprechen",
];

describe("i18n-Kanarie: UI-Dateien ohne deutsche Literale", () => {
  for (const rel of DATEIEN) {
    it(rel + " ist extrahiert", () => {
      const pfad = fileURLToPath(new URL(rel, import.meta.url));
      const lits = literale(readFileSync(pfad, "utf-8"));
      const verstoesse = [];
      for (const { zeile, text } of lits) {
        if (/[äöüÄÖÜß]/.test(text)) verstoesse.push(`Zeile ${zeile}: Umlaut in "${text.slice(0, 60)}"`);
        else for (const w of KERNWOERTER)
          if (new RegExp("(^|[^A-Za-z])" + w + "($|[^A-Za-z])").test(text))
            verstoesse.push(`Zeile ${zeile}: Kernwort "${w}" in "${text.slice(0, 60)}"`);
      }
      expect(verstoesse, verstoesse.join("\n")).toEqual([]);
    });
  }
});
