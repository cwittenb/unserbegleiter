#!/usr/bin/env node
// MOD-4/MOD-6 · Erzeugt aus den Textquellen des Korpus die JS-Module, die der
// Rest des Systems importiert:
//
//   core/korpus/<l>/bausteine/<schicht>/<key>.md   →  core/korpus/<l>/<schicht>.js
//       (schicht ∈ wissen | policies | format | grundsaetze; policies bekommt
//        zusaetzlich `waechter` aus bausteine/waechter/<name>.md + signale.js)
//   core/korpus/<l>/sessions/<art>.md (+ themen-rahmen.md)  →  core/korpus/<l>/sessions.js
//
// WARUM GENERIEREN statt zur Laufzeit lesen: Die Prompts gehen durch esbuild in
// drei Bundles; ein Text-Loader waere ein Eingriff in drei Build-Pfade. Ein
// generiertes JS-Modul ist fuer alle Verbraucher dasselbe wie vorher. Die
// Generate werden COMMITTET; tests/unit/mod-templates.spec.js erzeugt sie
// in-memory neu und vergleicht Byte fuer Byte (Kanarie gegen Handedits).
//
// TEMPLATE-NOTATION (bewusst geschlossen — E2 b, F9/F11 a, F12 a):
//   {{name}}                                 Parameter (Session-Kontext oder Baustein-Argument)
//   {{wissen.anteileSprache}}                Baustein einfuegen (ohne Argumente)
//   {{policies.krisenVorrang subjekt=name}}  Baustein mit benannten Argumenten einfuegen;
//                                            Werte: Parameter, "String" (darf {{param}} tragen), true/false
//   {{grundsaetze.URTEILS_GRAMMATIK}}        ein Grundsatz
//   {{steuer.KAPITEL_TITEL | join " · "}}    Listen-Filter: join "sep" · count · zeilen "sep"
//   {{wissen.DOMAINS | count}}  {{wissen.DOMAENEN}}  {{wissen.DOMAENEN | zeilen " · "}}
// Keine Bedingungen, keine Schleifen, keine freien Funktionen. Alles Unbekannte
// ist ein Fehler beim Generieren, nie ein leerer String.
//
// BAUSTEIN-DATEI: optionale <!-- … -->-Kommentare am Anfang (werden als /* */
// ins Generat uebernommen — Sprint-Historie bleibt lesbar), darunter optional
//   <!-- args: a, b -->                 Argumente in Signatur-Reihenfolge
//   <!-- args: x=true; sonst: key.kurz --> ein boolesches Argument mit Zweitfassung
// danach der Text, verbatim (auch das Dateiende: kein Zeilenumbruch, wenn der
// Text ohne endet — der Golden-Snapshot haelt das fest). Seit PRV-1a duerfen
// Sessions und Bausteine <!-- … --> im Fliesstext tragen: Begruendungen fuer
// Leser, nicht fuers Modell — entferneKommentare() streicht sie beim Bau.
//
//   node scripts/build-korpus.js            schreibt beide Sprachen
//   node scripts/build-korpus.js --pruefe   nur vergleichen (Exit 1 bei Abweichung)

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

export const SESSIONS = [
  { art: "einzel",      fn: "klaerungsPrompt",   args: ["name", "partner"], teile: "klaerungsTeile" },
  { art: "gemeinsam",   fn: "aufloesungsPrompt", teile: "aufloesungsTeile", args: ["nameA", "nameB"] },
  { art: "moment",      fn: "momentPrompt",      args: ["nameA", "nameB"] },
  { art: "solo",        fn: "reflexionsPrompt",  args: ["name", "partner"] },
  { art: "qualitytime", fn: "qzMenuePrompt",     args: [] },
];
export const SCHICHTEN = ["wissen", "policies", "format", "grundsaetze"];
const DATEN = { "wissen.DOMAINS": "DOMAINS", "wissen.DOMAENEN": "DOMAENEN", "steuer.KAPITEL_TITEL": "KAPITEL_TITEL" };
const DATEN_IMPORT = { DOMAINS: "./domaenen.js", DOMAENEN: "./domaenen.js", KAPITEL_TITEL: "./steuer.js" };
const FILTER = {
  join:   (expr, arg) => { if (arg == null) throw new Error("join braucht einen Trenner"); return expr + ".join(" + jsString(arg) + ")"; },
  count:  (expr, arg) => { if (arg != null) throw new Error("count nimmt kein Argument"); return expr + ".length"; },
  zeilen: (expr, arg) => { if (arg == null) throw new Error("zeilen braucht einen Trenner"); return expr + ".split(\"\\n\").join(" + jsString(arg) + ")"; },
};
const WAECHTER = ["krise", "zweiseitigkeit", "aufdeck", "anteile", "entwicklung"];

/* ---- Hilfen ------------------------------------------------------------- */
export function escapeTemplate(text) {
  return text.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}
const jsString = s => JSON.stringify(s);
const KOMMENTAR = /^<!--([\s\S]*?)-->\n?/;

/* PRV-1a · Kommentare im Fliesstext. Bis PRV-0 standen Begruendungen und
   Sprint-Referenzen ("(S103, aus dem Lauf gelernt)", "Zwei Gruende: …") im
   Text, den das Modell sieht — Changelog im Prompt, der Aufmerksamkeit kostet
   und nichts anweist (docs/REVIEW-PRV-prompt-verdichtung.md). Die Begruendung
   bleibt in der Quelle, als <!-- … --> an Ort und Stelle; das Generat traegt
   sie nicht. Ein Kommentar auf eigener Zeile verschwindet samt Zeile; ein
   Kommentar im Satz verschwindet samt dem einen Leerzeichen davor. Die Kopf-
   Kommentare der Bausteine (args, Historie) parst parseBaustein vorher weg —
   sie kommen als Kommentar ins Generat wie bisher. */
export function entferneKommentare(md) {
  return md
    .replace(/^[ \t]*<!--[\s\S]*?-->[ \t]*(?:\r?\n|$)/gm, "")
    .replace(/[ \t]?<!--[\s\S]*?-->/g, "");
}

/** Baustein-Datei → { kommentare, args, defaults, sonst, body }. */
export function parseBaustein(text, name) {
  const kommentare = []; let args = []; const defaults = {}; let sonst = null;
  let rest = text; let m;
  while ((m = KOMMENTAR.exec(rest))) {
    const inhalt = m[1];
    const d = /^\s*args:\s*([^]*?)\s*$/.exec(inhalt);
    if (d) {
      for (const teil of d[1].split(";").map(t => t.trim()).filter(Boolean)) {
        const s = /^sonst:\s*([\w.]+)$/.exec(teil);
        if (s) { sonst = s[1]; continue; }
        for (const a of teil.split(",").map(t => t.trim()).filter(Boolean)) {
          const dv = /^(\w+)=(true|false)$/.exec(a);
          if (dv) { args.push(dv[1]); defaults[dv[1]] = dv[2] === "true"; }
          else if (/^\w+$/.test(a)) args.push(a);
          else throw new Error(name + ": unverstaendliche args-Angabe '" + a + "'");
        }
      }
    } else kommentare.push(inhalt);
    rest = rest.slice(m[0].length);
  }
  if (sonst && (args.length !== 1 || !(args[0] in defaults))) throw new Error(name + ": 'sonst' braucht genau ein boolesches Argument mit Vorgabe");
  return { kommentare, args, defaults, sonst, body: rest };
}

/** Alle Bausteine einer Sprache: registry[schicht][key]. */
export function ladeBausteine(sprache) {
  const basis = path.join(ROOT, "core/korpus", sprache, "bausteine");
  const reg = {};
  for (const schicht of [...SCHICHTEN, "waechter"]) {
    reg[schicht] = {};
    const dir = path.join(basis, schicht);
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).filter(f => f.endsWith(".md") && !f.endsWith(".kurz.md")).sort()) {
      const key = f.replace(/\.md$/, "");
      const b = parseBaustein(readFileSync(path.join(dir, f), "utf8"), schicht + "/" + f);
      if (b.sonst) {
        const p = path.join(dir, b.sonst + ".md");
        if (!existsSync(p)) throw new Error(schicht + "/" + f + ": Zweitfassung " + b.sonst + ".md fehlt");
        b.sonstBody = readFileSync(p, "utf8");
      }
      reg[schicht][key] = b;
    }
  }
  return reg;
}

/* ---- Der Parser der Notation ------------------------------------------ */
/** Zerlegt den Inhalt eines {{…}}: { pfad, args:[{name, wert}], filter:{name, arg} } */
export function parsePlatzhalter(inhalt, wo) {
  let s = inhalt.trim(); let i = 0;
  const fehler = msg => new Error(wo + ": {{" + inhalt + "}} — " + msg);
  const ident = () => { const m = /^[A-Za-z_][\w]*/.exec(s.slice(i)); if (!m) throw fehler("Name erwartet"); i += m[0].length; return m[0]; };
  const ws = () => { while (i < s.length && /\s/.test(s[i])) i++; };
  const string = () => {
    if (s[i] !== '"') throw fehler("String erwartet");
    i++; let out = "";
    while (i < s.length && s[i] !== '"') {
      if (s[i] === "\\") { const n = s[i + 1]; if (n !== '"' && n !== "\\") throw fehler("nur \\\" und \\\\ sind erlaubt"); out += n; i += 2; continue; }
      out += s[i++];
    }
    if (s[i] !== '"') throw fehler("String nicht geschlossen");
    i++; return out;
  };
  let pfad = ident();
  while (s[i] === ".") { i++; pfad += "." + ident(); }
  const args = []; let filter = null;
  ws();
  while (i < s.length && s[i] !== "|") {
    const name = ident();
    if (s[i] !== "=") throw fehler("'=' nach " + name + " erwartet");
    i++;
    let wert;
    if (s[i] === '"') wert = { typ: "string", wert: string() };
    else { const v = ident(); wert = v === "true" || v === "false" ? { typ: "bool", wert: v === "true" } : { typ: "param", wert: v }; }
    args.push({ name, wert }); ws();
  }
  if (s[i] === "|") {
    i++; ws(); const name = ident(); ws();
    let arg = null; if (i < s.length) { arg = string(); ws(); }
    if (!(name in FILTER)) throw fehler("unbekannter Filter " + name);
    filter = { name, arg };
  }
  if (i !== s.length) throw fehler("unerwarteter Rest '" + s.slice(i) + "'");
  return { pfad, args, filter };
}

/**
 * Kompiliert einen Text mit Platzhaltern in den Inhalt eines JS-Template-Literals.
 * ctx: { params:string[], reg, wo, ref(schicht,key) → JS-Ausdruck, daten(name) → JS-Ausdruck, verwendet:Set }
 */
/** Findet das Ende eines {{…}} ab Position i (nach dem oeffnenden {{): beruecksichtigt
 *  "Strings" und darin verschachtelte {{param}}. Gibt den Index des schliessenden }} zurueck. */
function endeVon(md, i, wo) {
  let inStr = false;
  for (; i < md.length; i++) {
    const c = md[i];
    if (inStr) {
      if (c === "\\") { i++; continue; }
      if (c === '"') inStr = false;
      else if (c === "{" && md[i + 1] === "{") { const e = md.indexOf("}}", i + 2); if (e < 0) break; i = e + 1; }
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "}" && md[i + 1] === "}") return i;
  }
  throw new Error(wo + ": offene {{ ohne Schluss");
}

export function kompiliere(md, ctx) {
  md = entferneKommentare(md);
  let out = ""; let i = 0;
  while (i < md.length) {
    const start = md.indexOf("{{", i);
    if (start < 0) { out += escapeTemplate(md.slice(i)); break; }
    out += escapeTemplate(md.slice(i, start));
    const ende = endeVon(md, start + 2, ctx.wo);
    out += "${" + ausdruck(parsePlatzhalter(md.slice(start + 2, ende), ctx.wo), ctx) + "}";
    i = ende + 2;
  }
  return out;
}

function ausdruck(p, ctx) {
  const fehler = msg => new Error(ctx.wo + ": {{" + p.pfad + "}} — " + msg);
  const teile = p.pfad.split(".");
  // Parameter
  if (teile.length === 1) {
    if (p.args.length || p.filter) throw fehler("ein Parameter nimmt weder Argumente noch Filter");
    if (!ctx.params.includes(teile[0])) throw fehler("unbekannter Parameter (erlaubt: " + (ctx.params.join(", ") || "keine") + ")");
    return teile[0];
  }
  if (teile.length !== 2) throw fehler("unbekannter Platzhalter");
  const [schicht, key] = teile;
  // Daten (Listen) mit optionalem Filter
  if (p.pfad in DATEN) {
    if (p.args.length) throw fehler("Daten nehmen keine Argumente");
    const expr = ctx.daten(DATEN[p.pfad]);
    return p.filter ? FILTER[p.filter.name](expr, p.filter.arg) : expr;
  }
  if (p.filter) throw fehler("Filter gibt es nur auf Listen (" + Object.keys(DATEN).join(", ") + ")");
  if (!SCHICHTEN.includes(schicht)) throw fehler("unbekannte Schicht");
  const b = ctx.reg[schicht] && ctx.reg[schicht][key];
  if (!b) throw fehler("unbekannter Baustein");
  const ref = ctx.ref(schicht, key);
  if (!b.args.length) {
    if (p.args.length) throw fehler("Baustein nimmt keine Argumente");
    return ref;
  }
  // benannte Argumente → Signatur-Reihenfolge; Vorgaben duerfen fehlen
  const gegeben = new Map(p.args.map(a => [a.name, a.wert]));
  for (const a of p.args) if (!b.args.includes(a.name)) throw fehler("unbekanntes Argument '" + a.name + "' (erwartet: " + b.args.join(", ") + ")");
  const werte = [];
  for (const name of b.args) {
    if (!gegeben.has(name)) { if (name in b.defaults) { werte.push(null); continue; } throw fehler("Argument '" + name + "' fehlt"); }
    const w = gegeben.get(name);
    if (w.typ === "bool") werte.push(String(w.wert));
    else if (w.typ === "param") { if (!ctx.params.includes(w.wert)) throw fehler("unbekannter Parameter '" + w.wert + "'"); werte.push(w.wert); }
    else werte.push("`" + kompiliere(w.wert, { ...ctx, wo: ctx.wo + " (Argument " + name + ")" }) + "`");
  }
  while (werte.length && werte[werte.length - 1] === null) werte.pop();   // Vorgaben am Ende weglassen
  if (werte.includes(null)) throw fehler("ein Argument mit Vorgabe kann nur am Ende fehlen");
  return ref + "(" + werte.join(", ") + ")";
}

/* ---- Generate ------------------------------------------------------------ */
const kommentarBlock = k => k.map(c => "/*" + c.replace(/\*\//g, "* /") + (c.includes("\n") ? "" : " ") + "*/").join("\n") + (k.length ? "\n" : "");

/** Reihenfolge innerhalb einer Schicht: wer einen anderen Baustein derselben Schicht zitiert, kommt danach. */
function topologisch(keys, eintrag, schicht) {
  const refs = k => [...eintrag[k].body.matchAll(/\{\{\s*([\w]+)\.([\w]+)/g)].filter(m => m[1] === schicht).map(m => m[2]);
  const fertig = []; const gesehen = new Set();
  const besuche = (k, pfad) => {
    if (gesehen.has(k)) return;
    if (pfad.includes(k)) throw new Error(schicht + ": Zyklus " + [...pfad, k].join(" → "));
    for (const r of refs(k)) if (eintrag[r]) besuche(r, [...pfad, k]);
    gesehen.add(k); fertig.push(k);
  };
  for (const k of keys) besuche(k, []);
  return fertig;
}

const KOEPFE = {
  de: {
    grundsaetze: "GRUNDSAETZE — die Saetze, die mehr als eine Schicht zitiert (Blatt ohne Importe)",
    wissen: "WISSEN — therapeutisches Wissen, Haltung, Methoden, Lebensbereiche",
    policies: "POLICIES — Regeln fuer erlaubtes und unerlaubtes Verhalten + Waechter-Inhalt",
    format: "FORMAT — technische Vorgaben an das Modell",
    sessions: "SESSIONS — die Dramaturgie je Session-Art",
  },
  en: {
    grundsaetze: "GRUNDSAETZE — sentences quoted by more than one layer (leaf)",
    wissen: "WISSEN — therapeutic knowledge, stance, methods, areas of life",
    policies: "POLICIES — rules of permitted/forbidden behaviour + watcher content",
    format: "FORMAT — technical instructions to the model",
    sessions: "SESSIONS — per-session dramaturgy",
  },
};
function kopf(sprache, schicht, quelle) {
  return "// Korpus " + sprache.toUpperCase() + " · " + KOEPFE[sprache][schicht] + "\n" +
    "// GENERIERT aus " + quelle + " durch scripts/build-korpus.js (MOD-6).\n" +
    "// NICHT VON HAND AENDERN — Aenderungen gehoeren in die .md-Quellen; danach\n" +
    "// `node scripts/build-korpus.js`. Kanarie: tests/unit/mod-templates.spec.js.\n\n";
}

/** Eine Schicht-Datei (wissen/policies/format/grundsaetze). */
export function baueSchichtQuelle(sprache, schicht, reg = ladeBausteine(sprache)) {
  const eintrag = reg[schicht];
  const keys = topologisch(Object.keys(eintrag).sort(), eintrag, schicht);
  const importe = new Set(); const verwendet = new Set();
  const ref = (s, k) => {
    if (s === schicht) return "_" + k;
    if (s === "grundsaetze") { importe.add('import * as G from "./grundsaetze.js";'); return "G." + k; }
    importe.add("import { " + s + ' } from "./' + s + '.js";'); return s + "." + k;
  };
  const daten = name => { importe.add("import { " + name + ' } from "' + DATEN_IMPORT[name] + '";'); return name; };
  let koerper = "";
  for (const k of keys) {
    const b = eintrag[k];
    const ctx = { params: b.args, reg, wo: sprache + "/" + schicht + "/" + k + ".md", ref, daten };
    koerper += kommentarBlock(b.kommentare);
    if (schicht === "grundsaetze") koerper += "export const " + k + " = `" + kompiliere(b.body, ctx) + "`;\n\n";
    else if (!b.args.length) koerper += "const _" + k + " = `" + kompiliere(b.body, ctx) + "`;\n\n";
    else if (b.sonst) {
      const a = b.args[0];
      koerper += "const _" + k + " = (" + a + " = " + b.defaults[a] + ") => " + a + "\n  ? `" + kompiliere(b.body, ctx) + "`\n  : `" + kompiliere(b.sonstBody, ctx) + "`;\n\n";
    } else koerper += "const _" + k + " = (" + b.args.join(", ") + ") => `" + kompiliere(b.body, ctx) + "`;\n\n";
  }
  let q = kopf(sprache, schicht, "bausteine/" + schicht + "/*.md");
  if (schicht === "wissen") importe.add('export { DOMAINS, DOMAENEN } from "./domaenen.js";');
  if (schicht === "policies") importe.add('import { SIGNALE } from "./signale.js";');
  if (importe.size) q += [...importe].sort().join("\n") + "\n\n";
  q += koerper;
  if (schicht !== "grundsaetze") {
    q += "export const " + schicht + " = {\n" + Object.keys(eintrag).sort().map(k => "  " + k + ": _" + k + ",").join("\n") + "\n};\n";
  }
  if (schicht === "policies") {
    const w = reg.waechter;
    for (const n of WAECHTER) if (!w[n]) throw new Error(sprache + ": bausteine/waechter/" + n + ".md fehlt");
    const t = n => "`" + kompiliere(w[n].body, { params: [], reg, wo: sprache + "/waechter/" + n + ".md", ref, daten }) + "`";
    q += "\n/* Waechter-Inhalt (MOD-2a): Signal (signale.js) + Zusatztext (bausteine/waechter/<name>.md).\n" +
         "   core/policies erzwingt sie zur Laufzeit; der Katalog nennt sie per Schluessel. */\n" +
         "export const waechter = {\n" +
         "  krise: { signal: SIGNALE.krise, text: " + t("krise") + " },\n" +
         "  krisenhilfe: SIGNALE.krisenhilfe,\n  einzelraum: SIGNALE.einzelraum,\n" +
         "  zweiseitigkeit: { eigeneSache: SIGNALE.eigeneSache, verfuegung: SIGNALE.verfuegung, text: " + t("zweiseitigkeit") + " },\n" +
         "  aufdeck: { text: " + t("aufdeck") + " },\n" +
         /* PRV-4 · Theorie-Linsen als Karte: Signal in den Nachrichten der Person, Spur in der eigenen letzten Antwort. */
         "  anteile: { signal: SIGNALE.anteile, spur: SIGNALE.anteileSpur, text: " + t("anteile") + " },\n" +
         "  entwicklung: { signal: SIGNALE.entwicklung, spur: SIGNALE.entwicklungSpur, text: " + t("entwicklung") + " },\n};\n";
    /* Die Karten-Texte binden Wissen-Bausteine ein; ihre Importe entstehen erst
       hier, nach dem Kopf — also nachtragen. */
    const spaet = [...importe].filter(z => !q.includes(z)).sort();
    if (spaet.length) q = q.replace('import { SIGNALE } from "./signale.js";', ['import { SIGNALE } from "./signale.js";', ...spaet].sort().join("\n"));
  }
  return q;
}

/** sessions.js */
export function baueSessionsQuelle(sprache, reg = ladeBausteine(sprache)) {
  const dir = path.join(ROOT, "core/korpus", sprache, "sessions");
  const lies = datei => readFileSync(path.join(dir, datei), "utf8");
  const importe = new Set();
  const ref = (s, k) => {
    if (s === "grundsaetze") { importe.add('import * as G from "./grundsaetze.js";'); return "G." + k; }
    importe.add("import { " + s + ' } from "./' + s + '.js";'); return s + "." + k;
  };
  const daten = name => { importe.add("import { " + name + ' } from "' + DATEN_IMPORT[name] + '";'); return name; };
  let koerper = "";
  for (const s of SESSIONS) {
    if (s.teile) {
      /* PRV-5 · Phasen-Komposition: die Session liegt als geordnete Teile in
         sessions/<art>/NN-<name>.md. Der Gesamttext ist ihre Verkettung (wie
         zuvor die eine Datei); zusaetzlich gibt es die Teile einzeln, aus
         denen die Komposition je Phase Kern + Modul baut. */
      const tdir = path.join(dir, s.art);
      const dateien = readdirSync(tdir).filter(f => /^\d\d-[a-z0-9-]+\.md$/.test(f)).sort();
      const teile = dateien.map(f => ({ name: f.replace(/^\d\d-|\.md$/g, ""),
        k: kompiliere(readFileSync(path.join(tdir, f), "utf8"), { params: s.args, reg, wo: sprache + "/sessions/" + s.art + "/" + f, ref, daten }) }));
      const ganz = kompiliere(dateien.map(f => readFileSync(path.join(tdir, f), "utf8")).join(""), { params: s.args, reg, wo: sprache + "/sessions/" + s.art + "/*", ref, daten });
      if (teile.map(t => t.k).join("") !== ganz) throw new Error(sprache + "/sessions/" + s.art + ": Teile ergeben verkettet nicht den Gesamttext.");
      koerper += "\nexport function " + s.fn + "(" + s.args.join(", ") + "){\nreturn `" + ganz + "`;\n}\n";
      koerper += "\n/* PRV-5 · Teile von " + s.fn + " (sessions/" + s.art + "/*.md), Reihenfolge = Gesamttext. */\n" +
                 "export function " + s.teile + "(" + s.args.join(", ") + "){\nreturn {\n" +
                 teile.map(t => "  " + JSON.stringify(t.name) + ": `" + t.k + "`,").join("\n") + "\n};\n}\n";
      continue;
    }
    const md = lies(s.art + ".md");
    const k = kompiliere(md, { params: s.args, reg, wo: sprache + "/sessions/" + s.art + ".md", ref, daten });
    koerper += "\nexport function " + s.fn + "(" + s.args.join(", ") + "){\nreturn `" + k + "`;\n}\n";
  }
  const tr = entferneKommentare(lies("themen-rahmen.md"));
  if (/\{\{/.test(tr)) throw new Error("themen-rahmen.md traegt Platzhalter — dort sind keine vorgesehen.");
  koerper += "\n/* Themen-Rahmen (sessions/themen-rahmen.md): wird von den Session-Definitionen\n   an die Betriebs-Prompts angehaengt. */\n" +
             "export const THEMEN_RAHMEN = `" + escapeTemplate(tr) + "`;\n";
  return kopf(sprache, "sessions", "sessions/<art>.md") + [...importe].sort().join("\n") + "\n" + koerper;
}

export const ZIELE = ["grundsaetze", "wissen", "policies", "format", "sessions"];
export function zielPfad(sprache, ziel) { return path.join(ROOT, "core/korpus", sprache, ziel + ".js"); }
export function baueQuelle(sprache, ziel, reg) {
  return ziel === "sessions" ? baueSessionsQuelle(sprache, reg) : baueSchichtQuelle(sprache, ziel, reg);
}

if (import.meta.url === "file://" + process.argv[1]) {
  const pruefe = process.argv.includes("--pruefe");
  let abweichung = 0;
  for (const sprache of ["de", "en"]) {
    const reg = ladeBausteine(sprache);
    for (const ziel of ZIELE) {
      const soll = baueQuelle(sprache, ziel, reg);
      const pfad = zielPfad(sprache, ziel);
      const ist = existsSync(pfad) ? readFileSync(pfad, "utf8") : null;
      if (pruefe) {
        if (ist !== soll) { console.error("ABWEICHUNG: " + path.relative(ROOT, pfad) + " ist nicht das Generat seiner Quellen."); abweichung++; }
        else console.log("ok " + path.relative(ROOT, pfad));
      } else {
        writeFileSync(pfad, soll);
        console.log((ist === soll ? "unveraendert " : "geschrieben ") + path.relative(ROOT, pfad));
      }
    }
  }
  if (abweichung) process.exit(1);
}
