#!/usr/bin/env node
// Klein-Sonde ST2 · REVISION v2 (Befund vom 1. Aug 2026, n=9-Lauf):
//
//   Der v1-Lauf zeigte NULL Lecks, NULL Rettungen (alles "tool") und S3 —
//   die S97-kritische Gabelung-vor-Block-Choreografie — 3/3 korrekt. Der
//   „harte" S1-Verstoß war ein KRITERIUMS-Fehler der Sonde: Sie verlangte den
//   zeit-Block in Runde 1 auf "[CLOSE SESSION]" — das Modell antwortete aber
//   mit der Türen-Frage OHNE Block, also exakt dem zweistufigen S99-Abschluss,
//   den der Abschluss-Wächter erzwingt (fragen ⇒ nicht übergeben; erst nach
//   der Antwort der Block). v2 misst deshalb:
//     · S1 ZWEISTUFIG — Runde 1 darf Block ODER Frage-ohne-Block sein;
//       nach „für mich behalten, schließ ab" MUSS Runde 2 den zeit-Block
//       tragen (hart).
//     · DIFFERENZLAUF (--diff) — dieselben Szenarien gegen den TEXT-Pfad
//       (Korpus-Prompt ohne Präambel, unstrukturiert, Legacy-Parser): erst
//       die Baseline sagt, ob Türen-ohne-Wunsch Struktur-Drift oder
//       Bestandsverhalten ist. Doppelte Kosten, nur bei Bedarf.
//     · .env-KONVENTION — Schlüssel kommen aus der .env im Repo-Root
//       (evals/env-datei.js, Reihenfolge process.env > .env), nie als
//       Aufruf-Pflicht.
//
// AUFRUF:  node docs/probe-st2-strukturturn.mjs [--n=3] [--model=claude-sonnet-5] [--en] [--diff | --text]
//
// ABBRUCHKRITERIUM (hart — Struktur-Modus solo/moment zurücknehmen, Befund an ST3):
//   · irgendein Struktur-Lauf mit strukturQuelle ≠ "tool"
//   · irgendein LECK in antwort: "-BLOCK", "[[", "END ", JSON-Geröll
//   · S1: kein gültiger zeit-Block bis einschließlich Runde 2 in ≥ 1 Lauf
//   · S3: Block in Runde 1 trotz Teilenwunsch in ≥ 2 von n Läufen
// WEICH (berichten): S2 ohne note-Block; Türen-Angebot ohne Wunsch (nur im
//   Diff bewertbar: weicht Struktur von der Text-Baseline ab, ist DAS der Befund).

import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeAdapter } from "../core/llm/adapter.js";
import { baueTurnSchema } from "../core/contracts/turn-schema.js";
import { soloDef } from "../core/ui/sessions.js";
import { zeitSchema, noteSchema } from "../core/contracts/schemas.js";
import { findeBlock, parseBlock } from "../core/contracts/block.js";
import { ALLE_BLOECKE } from "../core/contracts/registry.js";
import { pruefeAbschlussAntwort } from "../core/engine/abschluss-waechter.js";
import { K, registerKorpus, setKorpusSprache } from "../core/prompts/prompts.js";
import { liesEnvDatei, mischeMitEnv } from "../evals/env-datei.js";

const WURZEL = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ENV = mischeMitEnv(process.env, liesEnvDatei(path.join(WURZEL, ".env")));

const arg = (name, def) => {
  const a = process.argv.find(x => x.startsWith("--" + name + "="));
  return a ? a.split("=")[1] : def;
};
const N = Number(arg("n", 3));
const MODELL = arg("model", "claude-sonnet-5");
const MODI = process.argv.includes("--diff") ? ["struktur", "text"]
  : process.argv.includes("--text") ? ["text"] : ["struktur"];
if (process.argv.includes("--en")) {
  registerKorpus("en", await import("../core/prompts/prompts.en.js"));
  setKorpusSprache("en");
}
if (!ENV.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY fehlt — in die .env im Repo-Root eintragen (Vorlage: .env.example).");
  process.exit(2);
}

const backendStub = { pstate: { get: async () => null, set: async () => {} } };
const def = soloDef(backendStub);                                 // Struktur-Pfad: Präambel + Schema
const schema = baueTurnSchema(def);
const systemStruktur = def.sysPrompt({ me: "Anna", partner: "Bernd", kontext: "" });
const systemText = K().reflexionsPrompt("Anna", "Bernd") + K().THEMEN_RAHMEN;   // Baseline: Korpus pur (Stand vor ST2)

const llm = makeAdapter({
  mode: "direct", provider: "anthropic", apiKey: ENV.ANTHROPIC_API_KEY,
  models: { anthropic: MODELL }, thinking: "disabled", stream: false,
});

const CLOSE = (K().steuerTexte && K().steuerTexte.soloAbschluss) || "[CLOSE SESSION]";
const SOLO_BLOECKE = ALLE_BLOECKE.filter(b => ["abruf", "zeit", "gateart", "note", "ausschnitt"].includes(b.dataset));

/** Ein Zug im gewählten Modus → einheitliche Sicht {antwort, blockTyp, daten, quelle}. */
async function zug(modus, messages) {
  if (modus === "struktur") {
    const r = await llm(systemStruktur, messages, { structured: schema });
    const d = r.data || {};
    return {
      antwort: String(d.antwort || ""),
      blockTyp: d.block ? d.block.typ : null,
      daten: d.block ? d.block.daten : null,
      quelle: r.strukturQuelle,
      alsVerlauf: String(d.antwort || ""),   // was im Verlauf als assistant stünde
    };
  }
  const r = await llm(systemText, messages);
  const text = String(r.text || "");
  const f = findeBlock(text, SOLO_BLOECKE);
  let blockTyp = null, daten = null;
  if (f) { blockTyp = f.block.dataset; const p = parseBlock(f.block, f.match); daten = p.ok ? p.data : null; }
  return { antwort: text.replace(f ? f.match[0] : "", ""), blockTyp, daten, quelle: "text-pfad", alsVerlauf: text };
}

const VERLAUF_S1 = [
  { role: "user", content: "Mich beschäftigt, dass Bernd und ich kaum noch gemeinsame Abende haben." },
  { role: "assistant", content: "Das klingt nach einem echten Vermissen. Magst du erzählen, wie sich so ein Abend früher angefühlt hat?" },
  { role: "user", content: "Warm. Wir haben gekocht und geredet. Heute sitzt jeder für sich." },
  { role: "assistant", content: "Da ist ein Unterschied zwischen früher und heute, der weh tut — und zugleich zeigt er, was dir wichtig ist: geteilte, ungeteilte Zeit." },
  { role: "user", content: CLOSE },
];

function baueBericht(modus, id, lauf) {
  const b = { modus, id, lauf, harte: [], weiche: [], marker: {} };
  b.hart = (t, tag) => { b.harte.push(t); if (tag) b.marker[tag] = true; };
  b.weich = t => b.weiche.push(t);
  return b;
}
const leck = a => /-BLOCK|\[\[|END |\{\s*"/.test(a);

async function laufS1(modus, bericht) {
  const r1 = await zug(modus, VERLAUF_S1);
  pruefeAllgemein(modus, r1, bericht);
  bericht.runde1 = r1.blockTyp ? "block:" + r1.blockTyp : "frage-ohne-block";
  let final = r1;
  if (r1.blockTyp !== "zeit") {
    if (r1.blockTyp) bericht.hart("Runde 1 trägt fremden Block: " + r1.blockTyp);
    // Zweistufig (S99): die Türen-Frage steht — die Person behält und schließt.
    const r2 = await zug(modus, [...VERLAUF_S1,
      { role: "assistant", content: r1.alsVerlauf },
      { role: "user", content: "Für mich behalten. Magst du hier schließen?" },
    ]);
    pruefeAllgemein(modus, r2, bericht);
    final = r2;
    bericht.runde2 = r2.blockTyp ? "block:" + r2.blockTyp : "KEIN BLOCK";
  }
  if (final.blockTyp !== "zeit") return bericht.hart("kein zeit-Block bis Runde 2");
  const fehler = zeitSchema(final.daten || {});
  if (fehler.length) return bericht.hart("zeitSchema: " + fehler[0]);
  const schatten = final.antwort + "\n\nTIMELINE-BLOCK\n" + JSON.stringify(final.daten) + "\nEND TIMELINE-BLOCK";
  const rev = pruefeAbschlussAntwort(schatten, {
    messages: VERLAUF_S1, block: "TIMELINE-BLOCK", token: CLOSE, revision: "abschluss-mit-frage",
  });
  if (rev) bericht.hart("Abschluss-Wächter: fragen+schließen in einer Nachricht");
}

async function laufS2(modus, bericht) {
  const r = await zug(modus, [
    { role: "user", content: "Es geht um die Abende. Aber ehrlich — manchmal frage ich mich, ob ich überhaupt genug bin. Egal, lass uns bei den Abenden bleiben." },
  ]);
  pruefeAllgemein(modus, r, bericht);
  if (/\bnote\b|merkposten|notier|ich merke mir|halte .* fest/i.test(r.antwort))
    bericht.hart("NOTE angekündigt/benannt in antwort");
  if (r.blockTyp !== "note") bericht.weich("kein note-Block (WANN-weich)");
  else { const f = noteSchema(r.daten || {}); if (f.length) bericht.hart("noteSchema: " + f[0]); }
  bericht.runde1 = r.blockTyp ? "block:" + r.blockTyp : "ohne Block";
}

async function laufS3(modus, bericht) {
  const r = await zug(modus, [
    { role: "user", content: "Mich beschäftigt die Sache mit den Abenden. Ich wünschte, Bernd könnte das hier irgendwann lesen." },
    { role: "assistant", content: "Das nehme ich mit — am Ende schauen wir, in welcher Form es zu Bernd finden kann. Was wäre für dich anders, wenn er es wüsste?" },
    { role: "user", content: "Er würde verstehen, dass es mir nicht um Vorwürfe geht, sondern ums Vermissen." },
    { role: "user", content: CLOSE },
  ]);
  pruefeAllgemein(modus, r, bericht);
  if (r.blockTyp) bericht.hart("Block in Runde 1 trotz Teilenwunsch — Gabelung übersprungen (S97/S99)", "gabelung");
  if (!/behalten|Tür|Weg|Ausschnitt|Selbstmitteilung|sagen/i.test(r.antwort))
    bericht.weich("Gabelung sprachlich nicht erkennbar");
  bericht.runde1 = r.blockTyp ? "block:" + r.blockTyp : "gabelung-ohne-block";
}

function pruefeAllgemein(modus, r, bericht) {
  if (modus === "struktur") {
    if (r.quelle !== "tool") bericht.hart("strukturQuelle=" + r.quelle);
    if (leck(r.antwort)) bericht.hart("LECK in antwort: " + r.antwort.slice(0, 120));
  }
  if (!r.antwort.trim()) bericht.hart("antwort leer");
}

const SZENARIEN = [["S1-abschluss", laufS1], ["S2-note-unsichtbar", laufS2], ["S3-gabelung-vor-block", laufS3]];
const alle = [];
for (const modus of MODI) {
  for (const [id, fahre] of SZENARIEN) {
    for (let lauf = 1; lauf <= N; lauf++) {
      const bericht = baueBericht(modus, id, lauf);
      try { await fahre(modus, bericht); }
      catch (e) { bericht.hart("Aufruf-Fehler: " + e.message.slice(0, 200)); }
      alle.push(bericht);
      console.log(`[${modus} · ${id} · Lauf ${lauf}] R1=${bericht.runde1 || "?"}` +
        (bericht.runde2 ? ` R2=${bericht.runde2}` : "") + " · " +
        (bericht.harte.length ? "HART: " + bericht.harte.join(" | ") : "ok") +
        (bericht.weiche.length ? " · weich: " + bericht.weiche.join(" | ") : ""));
    }
  }
}

console.log("\n==== ERGEBNIS ====");
for (const modus of MODI) {
  const m = alle.filter(b => b.modus === modus);
  const harte = m.filter(b => b.harte.length).length;
  console.log(`${modus}: ${m.length} Läufe · harte Verstöße: ${harte}` +
    ` · S1-R1 zweistufig: ${m.filter(b => b.id.startsWith("S1") && b.runde1 === "frage-ohne-block").length}` +
    ` · S3-Gabelung übersprungen: ${m.filter(b => b.marker.gabelung).length}`);
}
if (MODI.length === 2) {
  console.log("DIFF-Lesart: Verhält sich der Text-Pfad in R1/Türen GLEICH, ist das WANN-Bestand — kein Struktur-Befund.");
}
const struktur = alle.filter(b => b.modus === "struktur");
const gabelung = struktur.filter(b => b.marker.gabelung).length;
const abbruch = struktur.some(b => b.harte.length && !b.marker.gabelung) || gabelung >= 2;
if (MODI.includes("struktur")) {
  if (abbruch) {
    console.log("ABBRUCHKRITERIUM ERFÜLLT → Struktur-Modus solo/moment zurücknehmen; Befund in ST3 klären (Fallback: Voll-Migration).");
    process.exit(1);
  }
  console.log("Sonde BESTANDEN → ST2-Ausrollung gedeckt; volles GATE folgt in ST3.");
}
