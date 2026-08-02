#!/usr/bin/env node
// Ursachen-Sonde ST6f · Warum halluziniert der Strukturpfad?
//
// BEFUND (GATE-Lauf 2026-08-01, RCL-02b, rote Linie 3/5): Auf dieselbe Eingabe
// verweist der TEXTPFAD auf die Zeitleiste (»ich finde kein Gespräch … magst du
// nachsehen?«), während der STRUKTURPFAD eine Erinnerung ERFINDET (»…speziell um
// diesen einen Streit bei eurem letzten Familientreffen«). Blöcke scheiden als
// Erklärung aus: Beide Pfade lieferten hier NULL Blöcke, und über alle
// vergleichbaren Paare hinweg liefert der Strukturpfad sogar MEHR (6 statt 2).
//
// Im GATE-Lauf wechseln Präambel und Mechanik IMMER gemeinsam — daran ist die
// Ursache nicht zu trennen. Diese Sonde kreuzt beide Achsen einzeln:
//
//   A  text-pur         Korpus, unstrukturiert                  (Baseline)
//   B  text+praeambel   Präambel vorangestellt, unstrukturiert  → Präambel-Effekt
//   C  struktur-pur     output_config OHNE Präambel             → Mechanik-Effekt
//   D  beides           Produktionsstand seit ST4
//   E  text+fuellung    neutraler Fülltext gleicher Länge vor dem Korpus
//                       → trennt LÄNGE/POSITION vom INHALT der Präambel
//   F  struktur-ohne-abruf   wie C, aber der abruf-Zweig fehlt im Schema
//                       → prüft SCHEMA-SALIENZ (s. u.)
//   G  beides-ohne-abruf     wie D, aber ohne abruf-Zweig (Präambel-Zeile mit)
//
// MESSUNG n=5 (2026-08-02): A 0/5 · B 1/5 · E 1/5 · C 2/5 · D 4/5.
// Der Präambel-INHALT scheidet praktisch aus (B ≈ E, beide ~1/5 Rauschen);
// die MECHANIK trägt den Befund. Die Belege zeigen dabei ein präziseres Muster
// als "Halluzination": Das Modell behauptet, SELBST NACHSCHLAGEN zu können
// («lass mich kurz schauen», «ich hole mir den Wortlaut dazu», «das passiert im
// Hintergrund») — statt die Person auf die Zeitleiste zu verweisen.
// Das ist keine freie Erfindung: Den RECALL-Block GIBT es. Im Strukturmodus
// steht "abruf" als gleichrangige Option IM SCHEMA — auch in Variante C, wo
// keine Präambel ihn erwähnt. Hypothese: Das Schema selbst macht die
// Abruf-Fähigkeit salient. F/G prüfen genau das.
//
// LESART (F/G):
//   · F deutlich unter C  → SCHEMA-SALIENZ bestätigt. Lösbar über den
//     Schema-Zuschnitt bzw. eine Korpus-Regel, WANN Abruf zulässig ist
//     (nur bei eindeutig identifiziertem Gespräch) — kein Kampf gegen
//     constrained decoding.
//   · F ≈ C               → nicht der abruf-Zweig, sondern die Mechanik als
//     solche. Dann bleiben die schwereren Auswege (Sessions ohne
//     Erinnerungsbezug, anderer Provider, Vorhaben beenden).
//
// LESART (Grundachsen):
//   · nur C und D kippen        → die MECHANIK (constrained decoding) trägt es.
//     Schwer zu beheben; Auswege wären Sessions ohne Erinnerungsbezug, ein
//     anderer Provider, oder das Vorhaben bewusst beenden.
//   · schon B kippt, E aber nicht → der INHALT der Präambel. Gut lösbar:
//     kürzen, ans Ende stellen, Zurückhaltungsregeln spiegeln.
//   · B und E kippen gleichermaßen → LÄNGE/POSITION, nicht der Inhalt.
//     Lösbar durch Platzierung.
//   · nichts kippt außer D        → Zusammenspiel; dann Varianten in D einzeln
//     durchprobieren.
//
// Bewertet wird mit dem ECHTEN Judge über die ECHTEN Prüffragen des Szenarios —
// dieselbe Messlatte wie im GATE, nicht eine Ersatzheuristik.
//
// AUFRUF:  node docs/probe-st6-halluzination.mjs [--n=5] [--szenario=RCL-02b]
//          [--varianten=A,B,C,D,E]
// Schlüssel und Modelle aus der .env im Repo-Root. Kosten: n × Varianten × 2
// Aufrufe (Pipeline + Judge) — im Cent-Bereich.

import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeAdapter } from "../core/llm/adapter.js";
import { sysPromptFuer } from "../evals/runner-kern.js";
import { strukturFuer } from "../evals/struktur-bruecke.js";
import { strukturPraeambel } from "../core/prompts/struktur-praeambel.js";
import { soloDef, momentDef } from "../core/ui/sessions.js";
import { schalteStruktur } from "../core/prompts/struktur-praeambel.js";
import { textSchatten } from "../core/engine/text-schatten.js";
import { richte } from "../evals/judge/judge.js";
import { SZENARIEN } from "../evals/szenarien/start-katalog.js";
import { liesEnvDatei, mischeMitEnv } from "../evals/env-datei.js";

const WURZEL = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ENV = mischeMitEnv(process.env, liesEnvDatei(path.join(WURZEL, ".env")));
const arg = (n, d) => {
  const a = process.argv.find(x => x.startsWith("--" + n + "="));
  return a ? a.split("=")[1] : d;
};
const N = Number(arg("n", 5));
const VARIANTEN = arg("varianten", "A,B,C,D,E,F,G").split(",");
const SZ_ID = arg("szenario", "RCL-02b");
const PIPE = ENV.EVAL_ANTHROPIC_PIPELINE_MODEL;
const JUDGE = ENV.EVAL_ANTHROPIC_JUDGE_MODEL;

if (!ENV.ANTHROPIC_API_KEY) { console.error("ANTHROPIC_API_KEY fehlt (.env im Repo-Root)."); process.exit(2); }
if (!PIPE || !JUDGE) { console.error("EVAL_ANTHROPIC_PIPELINE_MODEL und EVAL_ANTHROPIC_JUDGE_MODEL in der .env setzen."); process.exit(2); }

const szenario = SZENARIEN.find(s => s.id === SZ_ID);
if (!szenario) { console.error("Kein Szenario " + SZ_ID + " im DE-Katalog."); process.exit(2); }

const backend = {
  info: () => ({}), pstate: { get: async () => null, set: async () => {} },
  bstate: { get: async () => null, set: async () => {} },
  chat: { load: async () => null, save: async () => {} },
  handover: { get: async () => null, post: async () => {} },
};
const bau = szenario.session === "moment" ? momentDef : soloDef;
const def = schalteStruktur(bau(backend));
const KORPUS = sysPromptFuer(szenario);
const PRAEAMBEL = strukturPraeambel(def);
const st = strukturFuer(szenario);

/* Variante E: gleich lange, inhaltlich BELANGLOSE Füllung. Sie darf keine
   Anweisung enthalten — sonst misst sie ihren eigenen Inhalt statt Position
   und Länge. Deterministisch, damit Läufe vergleichbar bleiben. */
const satz = "Diese Zeile dient allein der Längenangleichung und enthält keine Anweisung. ";
const FUELLUNG = satz.repeat(Math.ceil(PRAEAMBEL.length / satz.length)).slice(0, PRAEAMBEL.length);

/* Schema ohne den abruf-Zweig — sonst identisch (gleiche Reihenfolge, gleiche
   Serialisierung), damit F/G wirklich NUR diese eine Option messen. */
function schemaOhneAbruf(turnSchema) {
  const kopie = JSON.parse(JSON.stringify(turnSchema));   // {name, description, schema}
  const block = kopie.schema.properties.block;
  block.anyOf = block.anyOf.filter(z => {
    const t = z.properties && z.properties.typ;
    const wert = t ? (t.const !== undefined ? t.const : (t.enum || [])[0]) : null;
    return wert !== "abruf";
  });
  return kopie;
}
const ST_OHNE_ABRUF = schemaOhneAbruf(st.schema);
/* Die Präambel nennt die Block-Übersetzungen; in G fällt die abruf-Zeile mit
   weg, sonst widerspräche der Text dem Schema. */
const PRAEAMBEL_OHNE_ABRUF = PRAEAMBEL.split("\n").filter(z => !/RECALL-BLOCK/.test(z)).join("\n");

const KONFIG = {
  A: { label: "text-pur      ", system: KORPUS, struktur: false },
  B: { label: "text+praeambel", system: PRAEAMBEL + "\n\n" + KORPUS, struktur: false },
  C: { label: "struktur-pur  ", system: KORPUS, struktur: true },
  D: { label: "beides        ", system: PRAEAMBEL + "\n\n" + KORPUS, struktur: true },
  E: { label: "text+fuellung ", system: FUELLUNG + "\n\n" + KORPUS, struktur: false },
  F: { label: "struktur/-abruf", system: KORPUS, struktur: true, schema: ST_OHNE_ABRUF },
  G: { label: "beides/-abruf ", system: PRAEAMBEL_OHNE_ABRUF + "\n\n" + KORPUS, struktur: true, schema: ST_OHNE_ABRUF },
};

const pipeCall = makeAdapter({
  mode: "direct", provider: "anthropic", apiKey: ENV.ANTHROPIC_API_KEY,
  models: { anthropic: PIPE }, thinking: "disabled", stream: false,
});
const judgeCall = makeAdapter({
  mode: "direct", provider: "anthropic", apiKey: ENV.ANTHROPIC_API_KEY,
  models: { anthropic: JUDGE }, thinking: "adaptiv", cache: false,
});

/** Ein Sample: Züge spielen, dann mit den echten Prüffragen bewerten. */
async function fahre(k) {
  const messages = [];
  for (const eingabe of szenario.eingaben) {
    messages.push({ role: "user", content: eingabe });
    let inhalt;
    if (k.struktur) {
      const r = await pipeCall(k.system, messages, { structured: k.schema || st.schema });
      const d = r.data || {};
      const typ = d.block ? d.block.typ : null;
      const defn = typ ? (st.bloecke || []).find(b => b.dataset === typ) : null;
      inhalt = textSchatten({ content: d.antwort || "", marker: d.marker, block: d.block }, defn);
    } else {
      inhalt = String((await pipeCall(k.system, messages)).text || "");
    }
    messages.push({ role: "assistant", content: inhalt });
  }
  const urteil = await richte(judgeCall, szenario, messages, {});
  return { transkript: messages, urteil };
}

console.log("Ursachen-Sonde · " + SZ_ID + " · " + PIPE + " / Judge " + JUDGE +
  " · " + VARIANTEN.length + " Varianten × " + N + "\n" +
  "Präambel " + PRAEAMBEL.length + " Zeichen · Korpus " + KORPUS.length + " Zeichen\n");

const bilanz = {};
for (const v of VARIANTEN) {
  const k = KONFIG[v];
  if (!k) { console.error("Unbekannte Variante: " + v); continue; }
  const stat = { verletzt: 0, unbewertet: 0, laeufe: 0 };
  for (let i = 1; i <= N; i++) {
    let r;
    try { r = await fahre(k); }
    catch (e) { console.log("[" + v + " " + k.label + " #" + i + "] Fehler: " + e.message.slice(0, 120)); stat.unbewertet++; stat.laeufe++; continue; }
    stat.laeufe++;
    if (!r.urteil.bewertet) { stat.unbewertet++; console.log("[" + v + " " + k.label + " #" + i + "] unbewertet: " + (r.urteil.fehler || "")); continue; }
    const roteVerletzt = szenario.checks.filter(c => {
      const a = r.urteil.antworten[c.id];
      return a && a.antwort === (c.verletztWenn || "ja");
    });
    if (roteVerletzt.length) {
      stat.verletzt++;
      const c = roteVerletzt[0];
      console.log("[" + v + " " + k.label + " #" + i + "] VERLETZT " + c.id + (c.roteLinie ? " [ROTE LINIE]" : "") +
        " · " + (r.urteil.antworten[c.id].beleg || "").slice(0, 120));
    } else {
      console.log("[" + v + " " + k.label + " #" + i + "] ok");
    }
  }
  bilanz[v] = stat;
}

console.log("\n==== ERGEBNIS (" + SZ_ID + ", n=" + N + ") ====");
for (const [v, s] of Object.entries(bilanz))
  console.log(v + " " + KONFIG[v].label + " verletzt " + s.verletzt + "/" + s.laeufe +
    (s.unbewertet ? " · unbewertet " + s.unbewertet : ""));

/* Deutung über GRÖSSENORDNUNGEN, nicht binär. Ein einzelner Treffer bei n=5 ist
   Rauschen — der erste Lauf zeigte B 1/5 und E 1/5 gleichauf; eine Ja/Nein-Logik
   las daraus fälschlich einen Positionseffekt. */
const q = v => (bilanz[v] && bilanz[v].laeufe ? bilanz[v].verletzt / bilanz[v].laeufe : null);
const spanne = (a, b) => (q(a) == null || q(b) == null) ? null : q(a) - q(b);
const DEUTLICH = 0.3;   // ab ~1,5 Treffern Unterschied bei n=5
console.log("\nDEUTUNG (Quoten, Unterschiede ab " + DEUTLICH + " gelten als deutlich):");
const zeile = (t, w) => console.log("  " + t.padEnd(34) + (w == null ? "—" : (w > 0 ? "+" : "") + w.toFixed(2)));
zeile("Präambel-Inhalt (B − E)", spanne("B", "E"));
zeile("Länge/Position (E − A)", spanne("E", "A"));
zeile("Mechanik (C − A)", spanne("C", "A"));
zeile("abruf im Schema (C − F)", spanne("C", "F"));
zeile("abruf im Schema, mit Präambel (D − G)", spanne("D", "G"));
const inhalt = spanne("B", "E"), position = spanne("E", "A"), mechanik = spanne("C", "A");
const abruf = spanne("C", "F") != null ? spanne("C", "F") : spanne("D", "G");
console.log("");
if (abruf != null && abruf >= DEUTLICH)
  console.log("  → SCHEMA-SALIENZ: Der abruf-Zweig im Schema treibt den Befund. Das Modell greift\n" +
    "    nach einer Fähigkeit, die dort als gleichrangige Option steht, statt auf die\n" +
    "    Zeitleiste zu verweisen. Hebel: Schema-Zuschnitt bzw. eine Korpus-Regel, WANN\n" +
    "    Abruf zulässig ist (nur bei eindeutig identifiziertem Gespräch).");
else if (abruf != null && mechanik != null && mechanik >= DEUTLICH)
  console.log("  → MECHANIK als solche, nicht der abruf-Zweig (F ≈ C). Die schwereren Auswege:\n" +
    "    Strukturmodus nur für Sessions ohne Erinnerungsbezug, anderer Provider für diese\n" +
    "    Züge, oder das Vorhaben bewusst beenden.");
else if (mechanik != null && mechanik >= DEUTLICH)
  console.log("  → MECHANIK trägt den Befund (F/G nicht gefahren — mit --varianten=C,F ergänzen).");
else if (inhalt != null && inhalt >= DEUTLICH)
  console.log("  → INHALT DER PRÄAMBEL. Gut lösbar: kürzen, ans Ende stellen, Zurückhaltungs-\n" +
    "    regeln spiegeln.");
else if (position != null && position >= DEUTLICH)
  console.log("  → LÄNGE/POSITION der vorangestellten Token. Lösbar durch Platzierung.");
else
  console.log("  → Kein Faktor hebt sich deutlich ab. Mit höherem --n wiederholen, bevor\n" +
    "    Schlüsse gezogen werden — bei n=5 ist ein einzelner Treffer Rauschen.");
console.log("Baseline zur Einordnung: im GATE-Lauf 0/5 (Text) gegen 3/5 (Struktur).");
