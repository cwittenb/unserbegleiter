#!/usr/bin/env node
// Grenzstellen-Sonde ST3 · Der antwort→block-Übergang unter erzwungenem Tool-Use.
//
// BEFUND (Sonde v2, 1. Aug 2026): Alle Frage-ohne-Block-Züge 9/9 sauber; der
// kombinierte antwort+Block-Zug (Abschluss, Runde 2) riss in 2/3 Läufen — die
// Tool-Use-Serialisierung blutete in den antwort-String ("…</antwol>
// <parameter name=\"block\">{"), block blieb null. Diese Sonde misst NUR diesen
// Zug, über vier Gegenmittel-Varianten kopfüber:
//
//   A  baseline      — Schema wie ST2 (antwort vor block), Präambel unverändert
//   B  block-zuerst  — block VOR antwort im Schema (kurzes Feld zuerst; die
//                      Grenze liegt dann nicht am Ende des Langtexts)
//   C  grenzregel    — Schema wie A + harte Grenz-Regel in der Präambel
//   D  beides        — B + C
//
// AUFRUF:  node docs/probe-st3-blockgrenze.mjs [--n=5] [--model=claude-sonnet-5] [--varianten=A,B,C,D]
// Key aus der .env im Repo-Root (evals/env-datei.js; process.env gewinnt).
// Kosten: je Variante n × 2 Modellrunden.
//
// LESART: Gewinner ist die Variante mit n/n sauberen Läufen (Block gültig,
// kein Leck). Keine sauber ⇒ Präambel-Ansatz an dieser Stelle verworfen,
// Fallback Voll-Migration der WIE-Passagen (ST2-Protokoll).

import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeAdapter } from "../core/llm/adapter.js";
import { baueTurnSchema } from "../core/contracts/turn-schema.js";
import { strukturPraeambel } from "../core/prompts/struktur-praeambel.js";
import { soloDef } from "../core/ui/sessions.js";
import { zeitSchema } from "../core/contracts/schemas.js";
import { pruefeAbschlussAntwort } from "../core/engine/abschluss-waechter.js";
import { K } from "../core/prompts/prompts.js";
import { liesEnvDatei, mischeMitEnv } from "../evals/env-datei.js";

const WURZEL = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ENV = mischeMitEnv(process.env, liesEnvDatei(path.join(WURZEL, ".env")));
const arg = (name, def) => {
  const a = process.argv.find(x => x.startsWith("--" + name + "="));
  return a ? a.split("=")[1] : def;
};
const N = Number(arg("n", 5));
const MODELL = arg("model", "claude-sonnet-5");
const VARIANTEN = arg("varianten", "A,B,C,D").split(",");
if (!ENV.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY fehlt — in die .env im Repo-Root eintragen (Vorlage: .env.example).");
  process.exit(2);
}

const backendStub = { pstate: { get: async () => null, set: async () => {} } };
const def = soloDef(backendStub);                       // ST2c: Flag aus — Präambel/Schema hier explizit
const basisSchema = baueTurnSchema(def);
const basisSystem = strukturPraeambel(def) + "\n\n" + def.sysPrompt({ me: "Anna", partner: "Bernd", kontext: "" });

/** Schema mit block VOR antwort (Feld- und required-Reihenfolge). */
function schemaBlockZuerst(t) {
  const p = t.schema.properties;
  const props = {};
  if (p.block) props.block = p.block;
  if (p.marker) props.marker = p.marker;
  props.antwort = p.antwort;
  const required = Object.keys(props);
  return { name: t.name, description: t.description, schema: { type: "object", properties: props, required, additionalProperties: false } };
}

const GRENZREGEL =
  "GRENZE DER FELDER (hart): Das Feld antwort endet mit deinem letzten Satz an die Person. " +
  "Danach kommt in antwort NICHTS mehr — keine Werkzeug-Syntax, keine spitzen Klammern, kein JSON, " +
  "keine Block-Inhalte. Der Block gehört AUSSCHLIESSLICH in das Feld block. Prüfe vor der Ausgabe, " +
  "dass antwort mit einem Satz endet und das Feld block den Block trägt (oder null ist).";

const KONFIG = {
  A: { schema: basisSchema, system: basisSystem },
  B: { schema: schemaBlockZuerst(basisSchema), system: basisSystem },
  C: { schema: basisSchema, system: basisSystem + "\n\n" + GRENZREGEL },
  D: { schema: schemaBlockZuerst(basisSchema), system: basisSystem + "\n\n" + GRENZREGEL },
};

const llm = makeAdapter({
  mode: "direct", provider: "anthropic", apiKey: ENV.ANTHROPIC_API_KEY,
  models: { anthropic: MODELL }, thinking: "disabled", stream: false,
});

const CLOSE = (K().steuerTexte && K().steuerTexte.soloAbschluss) || "[CLOSE SESSION]";
const VERLAUF = [
  { role: "user", content: "Mich beschäftigt, dass Bernd und ich kaum noch gemeinsame Abende haben." },
  { role: "assistant", content: "Das klingt nach einem echten Vermissen. Magst du erzählen, wie sich so ein Abend früher angefühlt hat?" },
  { role: "user", content: "Warm. Wir haben gekocht und geredet. Heute sitzt jeder für sich." },
  { role: "assistant", content: "Da ist ein Unterschied zwischen früher und heute, der weh tut — und zugleich zeigt er, was dir wichtig ist: geteilte, ungeteilte Zeit." },
  { role: "user", content: CLOSE },
];
const LECK = /-BLOCK|\[\[|END |<parameter|<\/an|\{\s*"/;

async function zug(k, messages) {
  const r = await llm(k.system, messages, { structured: k.schema });
  const d = r.data || {};
  return { antwort: String(d.antwort || ""), block: d.block || null, quelle: r.strukturQuelle };
}

const ergebnisse = {};
for (const v of VARIANTEN) {
  const k = KONFIG[v];
  if (!k) { console.error("Unbekannte Variante:", v); continue; }
  const stat = { sauber: 0, leck: 0, keinBlock: 0, schemaFehler: 0, quelle: 0, waechter: 0 };
  for (let lauf = 1; lauf <= N; lauf++) {
    const probleme = [];
    try {
      const r1 = await zug(k, VERLAUF);
      let final = r1;
      if (!r1.block || r1.block.typ !== "zeit") {
        // Zweistufiger Abschluss (S99): Türen-Frage steht — behalten und schließen.
        final = await zug(k, [...VERLAUF,
          { role: "assistant", content: r1.antwort },
          { role: "user", content: "Für mich behalten. Magst du hier schließen?" },
        ]);
      }
      if (final.quelle !== "tool") { probleme.push("quelle=" + final.quelle); stat.quelle++; }
      if (LECK.test(final.antwort) || LECK.test(r1.antwort)) { probleme.push("LECK"); stat.leck++; }
      if (!final.block || final.block.typ !== "zeit") { probleme.push("kein zeit-Block"); stat.keinBlock++; }
      else {
        const f = zeitSchema(final.block.daten || {});
        if (f.length) { probleme.push("zeitSchema: " + f[0]); stat.schemaFehler++; }
        else {
          const schatten = final.antwort + "\n\nTIMELINE-BLOCK\n" + JSON.stringify(final.block.daten) + "\nEND TIMELINE-BLOCK";
          if (pruefeAbschlussAntwort(schatten, { messages: VERLAUF, block: "TIMELINE-BLOCK", token: CLOSE, revision: "abschluss-mit-frage" }))
            { probleme.push("Wächter: fragen+schließen"); stat.waechter++; }
        }
      }
      if (!probleme.length) stat.sauber++;
      console.log(`[${v} · Lauf ${lauf}] ` + (probleme.length ? "PROBLEM: " + probleme.join(" | ") : "sauber") +
        (LECK.test(final.antwort) ? "  » " + final.antwort.slice(-140).replace(/\n/g, " ⏎ ") : ""));
    } catch (e) {
      stat.keinBlock++;
      console.log(`[${v} · Lauf ${lauf}] Aufruf-Fehler: ` + e.message.slice(0, 160));
    }
  }
  ergebnisse[v] = stat;
}

console.log("\n==== ERGEBNIS (je Variante, n=" + N + ") ====");
for (const [v, s] of Object.entries(ergebnisse))
  console.log(`${v}: sauber ${s.sauber}/${N} · Leck ${s.leck} · kein Block ${s.keinBlock} · Schema ${s.schemaFehler} · Wächter ${s.waechter} · Quelle ${s.quelle}`);
const sieger = Object.entries(ergebnisse).filter(([, s]) => s.sauber === N).map(([v]) => v);
if (sieger.length) console.log("SIEGER (n/n sauber): " + sieger.join(", ") + " → ST3 setzt diese Variante als Turn-Schema-Vorgabe um und wiederholt Sonde v2 komplett.");
else console.log("KEINE Variante n/n sauber → Präambel-Ansatz an der Blockgrenze verworfen; Fallback Voll-Migration (ST2-Protokoll).");
