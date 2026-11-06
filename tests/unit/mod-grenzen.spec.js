// MOD-0 · Grenz-Kanarien der vier Schichten.
//
// Die MOD-Serie trennt KI-Anbindung (core/llm), Dialog-Mechanik (core/engine,
// core/contracts), Inhalt (core/prompts → core/korpus) und Komposition
// (core/ui → core/komposition). Bevor etwas bewegt wird, haelt dieser Test
// fest, wo die Grenzen HEUTE verlaufen — und zwar so, dass die Serie sie nur
// enger ziehen kann, nie weiter (Shrink-only, Muster T1b).
//
// Drei Pruefungen:
//   1. Importrichtung. Mechanik kennt keinen Inhalt: engine/llm/contracts
//      importieren nichts aus prompts/ui. Das ist heute schon so und soll es
//      bleiben — ein einzelner Import in die falsche Richtung wuerde die
//      Austauschbarkeit der Schicht beenden.
//   2. Modell-gerichtete Texte und deutsche Signal-Muster in core/engine.
//      Die Waechter tragen Prompt-Saetze ("[APP-HINWEIS …]") und Regexe mit
//      deutschen Woertern. Das ist Inhalt im Mechanik-Code — eine EN-Session
//      bekommt deutsche Zusaetze (Review K1). Die Ist-Liste steht hier
//      namentlich; MOD-2a leert sie. Ein NEUER Eintrag ist rot.
//   3. Steuertoken-Paritaet. abschluss-waechter.js nennt die Token
//      "sprachinvariant" per Kommentar. Hier per Test.

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** Alle .js-Dateien unter einem Verzeichnis (rekursiv), relativ zu ROOT. */
function jsDateien(dir) {
  const voll = path.join(ROOT, dir);
  return readdirSync(voll).flatMap(name => {
    const p = path.join(voll, name);
    if (statSync(p).isDirectory()) return jsDateien(path.join(dir, name));
    return name.endsWith(".js") ? [path.join(dir, name)] : [];
  });
}

/** Importziele einer Datei (statisch + dynamisch), aufgeloest relativ zu ROOT. */
function importZiele(datei) {
  const quelle = readFileSync(path.join(ROOT, datei), "utf8");
  const ziele = [];
  const re = /(?:^|\n)\s*(?:import|export)[^;]*?\bfrom\s*["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;
  let m;
  while ((m = re.exec(quelle))) {
    const z = m[1] || m[2];
    if (!z.startsWith(".")) continue;
    ziele.push(path.normalize(path.join(path.dirname(datei), z)));
  }
  return ziele;
}

const VERBOTEN = {
  // Schicht → Verzeichnisse, aus denen sie NICHT importieren darf.
  "core/engine":    ["core/prompts", "core/ui", "core/llm", "core/korpus", "platforms", "evals"],
  "core/contracts": ["core/prompts", "core/ui", "core/llm", "core/engine", "core/korpus", "platforms", "evals"],
  "core/llm":       ["core/prompts", "core/ui", "core/engine", "core/contracts", "core/korpus", "platforms", "evals"],
  "core/prompts":   ["core/ui", "core/engine", "core/llm", "platforms", "evals"],
};

describe("MOD-0 · Importrichtung: Mechanik kennt keinen Inhalt", () => {
  for (const [schicht, tabu] of Object.entries(VERBOTEN)) {
    it(schicht + " importiert nichts aus " + tabu.join(", "), () => {
      const verstoesse = [];
      for (const datei of jsDateien(schicht)) {
        for (const ziel of importZiele(datei)) {
          const treffer = tabu.find(t => ziel === t || ziel.startsWith(t + path.sep));
          if (treffer) verstoesse.push(datei + " → " + ziel);
        }
      }
      expect(verstoesse).toEqual([]);
    });
  }
});

/* ---- 2 · Inhalt im Mechanik-Code -------------------------------------- */

const MODELL_TEXT = /^\[(APP-HINWEIS|SYSTEM-REVISION|APP NOTE|SYSTEM REVISION)/;
const DEUTSCH_IM_MUSTER = /[äöüßÄÖÜ]|eigene|raum|telefonseelsorge|krisendienst|suizid|selbstmord|umbringen|leben|sterben|ritz|verletz|sache|mein|dein|unser|entscheid/i;

/** Ist-Liste beim Anlegen (S143) — MOD-2a hat sie geleert. Was dort stand:
 *    abschluss-waechter.js      ABSCHLUSS_REVISION, MARKEN_REVISION, META_PLATZ_REVISION (jetzt Kennungen)
 *    aufdeck-waechter.js        AUFDECK_SCHAERFUNG                     → waechter.aufdeck.text
 *    krisen-waechter.js         KRISEN_SCHAERFUNG, KRISEN_SIGNALE,
 *                               KRISENHILFE, EINZELRAUM                → waechter.krise / .krisenhilfe / .einzelraum
 *    zweiseitigkeit-waechter.js ZWEISEITIGKEIT_SCHAERFUNG, EIGENE_SACHE, VERFUEGUNG → waechter.zweiseitigkeit
 *  Shrink-only bleibt die Regel: Ein neuer Eintrag ist rot. */
const IST_INHALT_IN_ENGINE = {};

async function inhaltInEngine() {
  const befund = {};
  for (const datei of readdirSync(path.join(ROOT, "core/engine")).filter(f => f.endsWith(".js")).sort()) {
    const m = await import("../../core/engine/" + datei);
    const texte = [], muster = [];
    for (const [k, v] of Object.entries(m)) {
      if (typeof v === "string" && MODELL_TEXT.test(v)) texte.push(k);
      if (v instanceof RegExp && DEUTSCH_IM_MUSTER.test(v.source)) muster.push(k);
    }
    if (texte.length || muster.length) befund[datei] = { texte: texte.sort(), muster: muster.sort() };
  }
  return befund;
}

describe("MOD-0 · Inhalt in core/engine (Ist-Liste, shrink-only)", () => {
  it("kein Export kommt NEU hinzu, der modell-gerichteten Text oder deutsche Signal-Muster traegt", async () => {
    const ist = await inhaltInEngine();
    for (const [datei, { texte, muster }] of Object.entries(ist)) {
      const soll = IST_INHALT_IN_ENGINE[datei] || { texte: [], muster: [] };
      const neueTexte = texte.filter(k => !soll.texte.includes(k));
      const neueMuster = muster.filter(k => !soll.muster.includes(k));
      expect({ datei, neueTexte, neueMuster }).toEqual({ datei, neueTexte: [], neueMuster: [] });
    }
  });
  it("die Ist-Liste ist leer (MOD-2a) — und core/engine traegt keinen Inhalt mehr", async () => {
    expect(await inhaltInEngine()).toEqual({});
  });
  it("die Ist-Liste beschreibt den Stand (Shrink-only-Buchfuehrung)", async () => {
    const ist = await inhaltInEngine();
    for (const [datei, soll] of Object.entries(IST_INHALT_IN_ENGINE)) {
      const hat = ist[datei] || { texte: [], muster: [] };
      // Jeder gelistete Eintrag existiert noch ODER ist bewusst entfernt (dann
      // gehoert er aus der Liste). Ein Eintrag, der weder im Code noch in der
      // Liste steht, waere oben schon aufgefallen.
      const verschwunden = [...soll.texte.filter(k => !hat.texte.includes(k)), ...soll.muster.filter(k => !hat.muster.includes(k))];
      expect({ datei, verschwunden }).toEqual({ datei, verschwunden: [] });
    }
  });
  it("core/llm traegt genau einen modell-gerichteten Text (STRUKTUR_KORREKTUR) — MOD-5 zieht ihn aus", async () => {
    const m = await import("../../core/llm/adapter.js");
    const texte = Object.entries(m).filter(([, v]) => typeof v === "string" && MODELL_TEXT.test(v)).map(([k]) => k);
    expect(texte).toEqual(["STRUKTUR_KORREKTUR"]);
  });
});

/* ---- 3 · Steuertoken sind sprachinvariant ----------------------------- */

describe("MOD-0 · Steuertoken DE ≡ EN (die Waechter matchen sie wortgleich)", () => {
  const INVARIANT = ["soloAbschluss", "soloOhneTeilen", "momentAbschluss", "momentOhneTeilen"];
  it("die vier Abschluss-Token sind in beiden Korpora identisch", async () => {
    const de = await import("../../core/prompts/prompts.de.js");
    const en = await import("../../core/prompts/prompts.en.js");
    for (const k of INVARIANT) {
      expect(typeof de.steuerTexte[k]).toBe("string");
      expect(en.steuerTexte[k]).toBe(de.steuerTexte[k]);
    }
  });
  it("abschluss-waechter.ABSCHLUSS_TOKEN ist der Korpus-Token, nicht eine zweite Wahrheit", async () => {
    const de = await import("../../core/prompts/prompts.de.js");
    const ab = await import("../../core/engine/abschluss-waechter.js");
    expect(ab.ABSCHLUSS_TOKEN).toBe(de.steuerTexte.soloAbschluss);
  });
});
